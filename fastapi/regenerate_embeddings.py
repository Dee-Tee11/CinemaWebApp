"""
Script para regenerar embeddings com novo formato enriquecido.
Usa os dados existentes do Supabase e regenera os embeddings com estrutura:
{genres}. {keywords}. {language_name}. | {title}. {overview} | {genres}. {keywords}.

Uso:
    python regenerate_embeddings.py
"""
import os
import json
import time
import pickle
import numpy as np
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer

# Carregar variáveis de ambiente
load_dotenv()

# Configuração Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_KEY não configuradas!")

supabase: Client = create_client(supabase_url, supabase_key)

# Mapeamento de códigos de idioma para nomes
LANGUAGE_NAMES = {
    'en': 'English',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'hi': 'Hindi',
    'ar': 'Arabic',
    'th': 'Thai',
    'id': 'Indonesian',
    'tr': 'Turkish',
    'pl': 'Polish',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish',
    'cs': 'Czech',
    'hu': 'Hungarian',
    'ro': 'Romanian',
    'el': 'Greek',
    'he': 'Hebrew',
    'vi': 'Vietnamese',
    'ms': 'Malay',
    'tl': 'Filipino',
    'uk': 'Ukrainian',
    'bn': 'Bengali',
    'ta': 'Tamil',
    'te': 'Telugu',
    'mr': 'Marathi',
    'cn': 'Chinese',
}

def get_language_name(lang_code: str) -> str:
    """Converte código de idioma para nome completo"""
    if not lang_code:
        return 'Unknown'
    return LANGUAGE_NAMES.get(lang_code.lower(), lang_code.capitalize())


def extract_fields_from_embedding_input(embedding_input: str) -> dict:
    """
    Extrai campos do embedding_input existente.
    Formato esperado: "{title}. {overview} Genres: {genres}. Keywords: {keywords}. Language: {lang}. Director: {dir}"
    """
    result = {
        'title': '',
        'overview': '',
        'genres': '',
        'keywords': '',
        'language': '',
        'director': ''
    }
    
    try:
        text = embedding_input
        
        # Extrair título (até o primeiro ponto seguido de espaço maiúsculo, indicando início do overview)
        first_period = text.find('. ')
        if first_period > 0:
            result['title'] = text[:first_period]
            text = text[first_period + 2:]
        
        # Encontrar marcadores
        genres_idx = text.find('Genres:')
        keywords_idx = text.find('Keywords:')
        lang_idx = text.find('Language:')
        director_idx = text.find('Director:')
        
        # Extrair overview (tudo antes de Genres:)
        if genres_idx > 0:
            result['overview'] = text[:genres_idx].strip()
        
        # Extrair genres
        if genres_idx >= 0 and keywords_idx > genres_idx:
            result['genres'] = text[genres_idx + 7:keywords_idx].strip().rstrip('.')
        
        # Extrair keywords
        if keywords_idx >= 0 and lang_idx > keywords_idx:
            result['keywords'] = text[keywords_idx + 9:lang_idx].strip().rstrip('.')
        
        # Extrair language
        if lang_idx >= 0:
            if director_idx > lang_idx:
                result['language'] = text[lang_idx + 9:director_idx].strip().rstrip('.')
            else:
                result['language'] = text[lang_idx + 9:].strip().rstrip('.')
        
        # Extrair director
        if director_idx >= 0:
            result['director'] = text[director_idx + 9:].strip()
        
    except Exception as e:
        print(f"⚠️  Erro ao extrair campos: {e}")
    
    return result


def build_enriched_embedding_text(fields: dict) -> str:
    """
    Constrói o novo formato de texto para embedding:
    {genres}. {keywords}. {language_name}. | {title}. {overview} | {genres}. {keywords}.
    """
    lang_name = get_language_name(fields['language'])
    
    # Prefixo com informação categórica
    prefix = f"{fields['genres']}. {fields['keywords']}. {lang_name}."
    
    # Sufixo (sem language para não repetir demais)
    suffix = f"{fields['genres']}. {fields['keywords']}."
    
    # Texto final
    enriched = f"{prefix} | {fields['title']}. {fields['overview']} | {suffix}"
    
    return enriched


def main():
    print("=" * 70)
    print("🔄 REGENERAR EMBEDDINGS COM FORMATO ENRIQUECIDO")
    print("=" * 70)
    print()
    
    # Perguntar confirmação
    print("⚠️  Este processo vai:")
    print("   1. Carregar todos os filmes do cache local")
    print("   2. Regenerar embeddings com novo formato")
    print("   3. Atualizar no Supabase")
    print("   4. Atualizar cache local")
    print()
    print("   ⏱️  Tempo estimado: 2-4 horas para 16k filmes")
    print()
    
    confirm = input("Continuar? (s/n): ").strip().lower()
    if confirm != 's':
        print("❌ Cancelado.")
        return
    
    # Carregar cache local
    print("\n📥 Carregando dados do cache local...")
    CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
    MOVIES_CACHE_PATH = os.path.join(CACHE_DIR, "movies.pkl")
    
    if not os.path.exists(MOVIES_CACHE_PATH):
        print("❌ Cache não encontrado! Execute primeiro: python export_cache.py")
        return
    
    df = pickle.load(open(MOVIES_CACHE_PATH, 'rb'))
    print(f"✅ {len(df)} filmes carregados")
    
    # Carregar modelo
    print("\n📥 Carregando modelo de embeddings...")
    model = SentenceTransformer('all-mpnet-base-v2')
    print("✅ Modelo carregado!")
    
    # Processar filmes
    print(f"\n⚙️  Processando {len(df)} filmes...")
    print()
    
    batch_size = 50  # Processar em batches para updates
    total_processed = 0
    total_errors = 0
    
    new_embeddings = []
    new_embedding_inputs = []
    
    for idx, row in df.iterrows():
        try:
            movie_id = int(row['id'])
            embedding_input = row.get('embedding_input', '')
            
            if not embedding_input:
                print(f"⚠️  [{movie_id}] Sem embedding_input, pulando...")
                total_errors += 1
                new_embeddings.append(None)
                new_embedding_inputs.append(None)
                continue
            
            # Extrair campos do embedding_input existente
            fields = extract_fields_from_embedding_input(embedding_input)
            
            # Construir texto enriquecido
            enriched_text = build_enriched_embedding_text(fields)
            
            # Gerar novo embedding
            new_embedding = model.encode(enriched_text).tolist()
            
            new_embeddings.append(new_embedding)
            new_embedding_inputs.append(enriched_text)
            
            total_processed += 1
            
            # Mostrar progresso
            if total_processed % 100 == 0:
                print(f"   ✓ {total_processed}/{len(df)} filmes processados...")
            
            # Exemplo ocasional
            if total_processed == 1 or total_processed == 100:
                print(f"\n   📝 Exemplo [{movie_id}]:")
                print(f"      ANTES: {embedding_input[:100]}...")
                print(f"      DEPOIS: {enriched_text[:100]}...")
                print()
            
        except Exception as e:
            print(f"❌ Erro no filme {row.get('id', 'unknown')}: {e}")
            total_errors += 1
            new_embeddings.append(None)
            new_embedding_inputs.append(None)
    
    print(f"\n✅ Processamento local concluído!")
    print(f"   Sucesso: {total_processed}")
    print(f"   Erros: {total_errors}")
    
    # Atualizar Supabase
    print(f"\n🚀 Atualizando Supabase...")
    
    updates_success = 0
    
    for idx, row in df.iterrows():
        if new_embeddings[idx] is None:
            continue
        
        try:
            movie_id = int(row['id'])
            
            supabase.table('movies').update({
                'embedding': new_embeddings[idx],
                'embedding_input': new_embedding_inputs[idx]
            }).eq('id', movie_id).execute()
            
            updates_success += 1
            
            if updates_success % 100 == 0:
                print(f"   ✓ {updates_success} filmes atualizados no Supabase...")
            
            # Rate limiting
            time.sleep(0.02)  # ~50 requests/segundo
            
        except Exception as e:
            print(f"❌ Erro ao atualizar filme {movie_id}: {e}")
    
    print(f"\n✅ {updates_success} filmes atualizados no Supabase!")
    
    # Atualizar cache local
    print(f"\n💾 Atualizando cache local...")
    
    # Atualizar embeddings no array
    embeddings_array = np.array([e if e is not None else [0]*768 for e in new_embeddings], dtype=np.float32)
    
    EMBEDDINGS_CACHE_PATH = os.path.join(CACHE_DIR, "embeddings.npy")
    np.save(EMBEDDINGS_CACHE_PATH, embeddings_array)
    print(f"   ✅ {EMBEDDINGS_CACHE_PATH}")
    
    # Atualizar embedding_input no DataFrame
    df['embedding_input'] = new_embedding_inputs
    pickle.dump(df, open(MOVIES_CACHE_PATH, 'wb'))
    print(f"   ✅ {MOVIES_CACHE_PATH}")
    
    print("\n" + "=" * 70)
    print("🎉 REGENERAÇÃO CONCLUÍDA!")
    print("=" * 70)
    print("\n💡 Agora teste com: python find_similar.py")


if __name__ == "__main__":
    main()
