"""
Script para visualizar os 3 filmes mais similares a cada filme avaliado pelo utilizador.
Útil para entender como as recomendações são geradas.
"""
import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client
from sklearn.metrics.pairwise import cosine_similarity

# Carregar variáveis de ambiente
load_dotenv()

# Caminhos do cache local (relativo à pasta debug)
CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "cache")
MOVIES_CACHE_PATH = os.path.join(CACHE_DIR, "movies.pkl")
EMBEDDINGS_CACHE_PATH = os.path.join(CACHE_DIR, "embeddings.npy")

# Configuração Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_KEY não configuradas!")

supabase: Client = create_client(supabase_url, supabase_key)

def load_movies_from_cache():
    """Carrega filmes e embeddings do cache local (rápido!)"""
    print("📥 Carregando filmes do CACHE LOCAL...")
    
    if not os.path.exists(MOVIES_CACHE_PATH) or not os.path.exists(EMBEDDINGS_CACHE_PATH):
        print("❌ Cache local não encontrado!")
        print("   Execute primeiro: python export_cache.py")
        return None, None
    
    # Carregar DataFrame
    with open(MOVIES_CACHE_PATH, 'rb') as f:
        df = pickle.load(f)
    
    # Carregar embeddings
    embeddings = np.load(EMBEDDINGS_CACHE_PATH)
    
    print(f"✅ {len(df)} filmes carregados do cache\n")
    return df, embeddings

def load_movies_from_supabase():
    """Carrega todos os filmes com embeddings do Supabase (lento!)"""
    print("📥 Carregando filmes do SUPABASE (16k+ registos)...")
    print("   ⚠️  Isto pode demorar e consumir Disk IO Budget!")
    
    all_movies = []
    page_size = 1000
    offset = 0
    page_num = 1
    
    while True:
        response = supabase.table("movies").select("*").range(offset, offset + page_size - 1).execute()
        
        if not response.data:
            break
        
        all_movies.extend(response.data)
        print(f"   📄 Página {page_num}: {len(response.data)} filmes")
        
        if len(response.data) < page_size:
            break
        
        offset += page_size
        page_num += 1
    
    df = pd.DataFrame(all_movies)
    print(f"✅ {len(df)} filmes carregados do Supabase\n")
    
    # Converter embeddings
    embeddings_list = []
    for emb in df['embedding']:
        if isinstance(emb, str):
            emb = json.loads(emb)
        embeddings_list.append(emb)
    
    embeddings = np.array(embeddings_list, dtype=np.float32)
    
    return df, embeddings

def load_movies_with_embeddings(use_local: bool = True):
    """Carrega filmes - do cache local ou do Supabase"""
    if use_local:
        return load_movies_from_cache()
    else:
        return load_movies_from_supabase()

def get_user_ratings(user_id: str):
    """Busca as avaliações do utilizador"""
    print(f"📊 Buscando avaliações do utilizador: {user_id}")
    
    response = supabase.table('user_movies')\
        .select('movie_id, rating')\
        .eq('user_id', user_id)\
        .execute()
    
    if not response.data:
        print("⚠️  Nenhuma avaliação encontrada!")
        return {}
    
    ratings = {int(m['movie_id']): float(m['rating']) for m in response.data}
    print(f"✅ {len(ratings)} avaliações encontradas\n")
    
    return ratings

def find_top_k_similar(
    df: pd.DataFrame, 
    embeddings: np.ndarray, 
    movie_id: int, 
    ratings: dict,
    k: int = 3
):
    """
    Encontra os K filmes mais similares a um filme específico.
    Exclui filmes já avaliados pelo utilizador.
    """
    # Criar mapeamento movie_id -> índice
    movie_id_to_idx = {int(row['id']): idx for idx, row in df.iterrows()}
    
    if movie_id not in movie_id_to_idx:
        return []
    
    idx = movie_id_to_idx[movie_id]
    emb_source = embeddings[idx]
    
    # IDs de filmes já vistos
    filmes_vistos = set(ratings.keys())
    
    # Calcular similaridades
    similaridades = []
    for i in range(len(df)):
        candidate_id = int(df.iloc[i]['id'])
        
        # Pular filmes já vistos
        if candidate_id in filmes_vistos:
            continue
        
        emb_candidate = embeddings[i]
        sim = cosine_similarity([emb_source], [emb_candidate])[0][0]
        
        similaridades.append({
            'movie_id': candidate_id,
            'titulo': df.iloc[i].get('series_title', 'Unknown'),
            'genero': df.iloc[i].get('genre', 'Unknown'),
            'language': df.iloc[i].get('original_language', 'Unknown'),
            'imdb_rating': float(df.iloc[i].get('imdb_rating', 0.0)),
            'similaridade': float(sim)
        })
    
    # Ordenar por similaridade (maior primeiro)
    similaridades.sort(key=lambda x: x['similaridade'], reverse=True)
    
    return similaridades[:k]

def main():
    print("=" * 80)
    print("🎬 EXPLICAÇÃO DE RECOMENDAÇÕES - Top 3 Similares por Filme Avaliado")
    print("=" * 80)
    print()
    
    # Perguntar se quer usar cache local
    print("📍 Onde carregar os dados dos filmes?")
    print("   [L] Cache LOCAL (rápido, recomendado)")
    print("   [S] SUPABASE (lento, 16k+ queries)")
    escolha = input("   Escolha (L/S): ").strip().upper()
    use_local = escolha != 'S'
    print()
    
    # Perguntar o user_id
    user_id = input("📝 Digite o user_id para analisar: ").strip()
    if not user_id:
        print("❌ User ID não pode ser vazio!")
        return
    print()
    
    # Carregar dados
    df, embeddings = load_movies_with_embeddings(use_local)
    
    if df is None or embeddings is None:
        print("❌ Falha ao carregar dados.")
        return
    
    ratings = get_user_ratings(user_id)
    
    if not ratings:
        print("❌ Não é possível continuar sem avaliações.")
        return
    
    # Criar mapeamento movie_id -> info do filme
    movie_id_to_idx = {int(row['id']): idx for idx, row in df.iterrows()}
    
    # Para cada filme avaliado, mostrar os 3 mais similares
    print("=" * 80)
    print("📋 FILMES AVALIADOS E SEUS SIMILARES")
    print("=" * 80)
    
    all_recommendations = {}  # Para agregar no final
    
    for movie_id, rating in sorted(ratings.items(), key=lambda x: x[1], reverse=True):
        # Info do filme avaliado
        if movie_id not in movie_id_to_idx:
            print(f"\n⚠️  Filme ID {movie_id} não encontrado na base de dados")
            continue
        
        idx = movie_id_to_idx[movie_id]
        titulo = df.iloc[idx].get('series_title', 'Unknown')
        genero = df.iloc[idx].get('genre', 'Unknown')
        language = df.iloc[idx].get('original_language', 'Unknown')
        
        print(f"\n{'─' * 80}")
        print(f"🎬 {titulo}")
        print(f"   📊 Rating: {'⭐' * int(rating)} ({rating}/5)")
        print(f"   🎭 Género: {genero}")
        print(f"   🌍 Idioma: {language}")
        print(f"   🔑 ID: {movie_id}")
        print()
        print(f"   🔍 Top 3 filmes mais similares:")
        print()
        
        # Encontrar top 3 similares
        top_similares = find_top_k_similar(df, embeddings, movie_id, ratings, k=3)
        
        for i, sim in enumerate(top_similares, 1):
            sim_pct = sim['similaridade'] * 100
            bar = "█" * int(sim_pct / 5)  # Barra visual de similaridade
            
            print(f"   {i}. 🎥 {sim['titulo']}")
            print(f"      Similaridade: {sim_pct:.1f}% {bar}")
            print(f"      Género: {sim['genero']} | Idioma: {sim['language']}")
            print(f"      IMDB: {sim['imdb_rating']:.1f} | ID: {sim['movie_id']}")
            print()
            
            # Agregar recomendação
            rec_id = sim['movie_id']
            if rec_id not in all_recommendations:
                all_recommendations[rec_id] = {
                    'titulo': sim['titulo'],
                    'genero': sim['genero'],
                    'language': sim['language'],
                    'imdb_rating': sim['imdb_rating'],
                    'similaridades': [],
                    'fontes': []
                }
            all_recommendations[rec_id]['similaridades'].append(sim['similaridade'])
            all_recommendations[rec_id]['fontes'].append(titulo)
    
    # Resumo final
    print("\n" + "=" * 80)
    print("📊 RESUMO - TODOS OS CANDIDATOS A RECOMENDAÇÃO")
    print("=" * 80)
    print()
    
    # Calcular score final para cada recomendação
    final_recs = []
    for movie_id, info in all_recommendations.items():
        avg_sim = np.mean(info['similaridades'])
        max_sim = max(info['similaridades'])
        count = len(info['similaridades'])
        
        # Fórmula do sistema: (avg_sim * 0.5 + max_sim * 0.3) * (1 + count * 0.1)
        score = (avg_sim * 0.5 + max_sim * 0.3) * (1 + count * 0.1)
        
        final_recs.append({
            'movie_id': movie_id,
            'titulo': info['titulo'],
            'genero': info['genero'],
            'language': info['language'],
            'imdb_rating': info['imdb_rating'],
            'score': score,
            'avg_sim': avg_sim,
            'max_sim': max_sim,
            'count': count,
            'fontes': info['fontes']
        })
    
    # Ordenar por score
    final_recs.sort(key=lambda x: x['score'], reverse=True)
    
    print(f"Total de candidatos únicos: {len(final_recs)}\n")
    print("Top 25 Recomendações Finais:")
    print("-" * 80)
    
    for i, rec in enumerate(final_recs[:25], 1):
        print(f"\n{i:2d}. 🎬 {rec['titulo']}")
        print(f"    Score: {rec['score']:.4f}")
        print(f"    Similaridade média: {rec['avg_sim']*100:.1f}% | Máxima: {rec['max_sim']*100:.1f}%")
        print(f"    Aparece em: {rec['count']} filme(s) avaliado(s)")
        print(f"    Género: {rec['genero']} | Idioma: {rec['language']} | IMDB: {rec['imdb_rating']:.1f}")
        print(f"    Fontes: {', '.join(rec['fontes'][:3])}{'...' if len(rec['fontes']) > 3 else ''}")
    
    print("\n" + "=" * 80)
    print("✅ Análise concluída!")
    print("=" * 80)

if __name__ == "__main__":
    main()
