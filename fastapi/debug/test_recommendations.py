"""
Script para testar geração de recomendações para um utilizador específico.
Usa cache local para carregar filmes rapidamente.
"""
import os
import json
import pickle
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

# Carregar variáveis de ambiente
load_dotenv()

# Adicionar caminho para importar o sistema de recomendação
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from recommendation_system import SistemaRecomendacaoSimilaridade

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


def generate_recommendations_local(user_id: str, df: pd.DataFrame, embeddings: np.ndarray, save_to_supabase: bool = True):
    """
    Gera recomendações usando dados locais e opcionalmente salva no Supabase.
    """
    # 1. Buscar filmes avaliados pelo usuário no Supabase
    print(f"� Buscando avaliações do utilizador: {user_id}")
    try:
        response = supabase.table('user_movies')\
            .select('movie_id, rating')\
            .eq('user_id', user_id)\
            .execute()
    except Exception as e:
        print(f"❌ Erro ao buscar avaliações do usuário: {e}")
        return
    
    if not response.data:
        print(f"⚠️  Nenhum filme avaliado encontrado para o usuário {user_id}")
        return

    user_movies = response.data
    print(f"✅ Encontradas {len(user_movies)} avaliações\n")
    
    # 2. Preparar dados para o sistema de recomendação
    avaliacoes_por_movie_id = {}
    filmes_vistos_ids = []
    
    for movie in user_movies:
        movie_id = int(movie['movie_id'])
        rating = float(movie['rating'])
        avaliacoes_por_movie_id[movie_id] = rating
        filmes_vistos_ids.append(movie_id)
    
    # Verificar número mínimo de avaliações
    if len(avaliacoes_por_movie_id) < 5:
        print(f"⚠️  Usuário tem apenas {len(avaliacoes_por_movie_id)} avaliações.")
        print(f"   Mínimo necessário: 5 avaliações")
        return

    # 3. Inicializar sistema de recomendação com dados locais
    print("⚙️  Inicializando sistema de recomendação...")
    rec_system = SistemaRecomendacaoSimilaridade(embeddings, df)
    
    # 4. Configurar dados do usuário e gerar recomendações
    try:
        rec_system.set_user_data(avaliacoes_por_movie_id, filmes_vistos_ids)
        recommendations = rec_system.gerar_recomendacoes()
    except Exception as e:
        print(f"❌ Erro ao gerar recomendações: {e}")
        return

    if not recommendations:
        print("⚠️  Nenhuma recomendação foi gerada")
        return

    print(f"✅ {len(recommendations)} recomendações geradas!\n")
    
    # Mostrar top 10 recomendações
    print("🎬 Top 10 Recomendações:")
    print("-" * 60)
    for i, rec in enumerate(recommendations[:10], 1):
        print(f"{i:2d}. {rec.get('titulo', 'Unknown')}")
        print(f"    Score: {rec['score']:.4f} | ID: {rec['movie_id']}")
    
    if not save_to_supabase:
        print("\nℹ️  Modo teste: recomendações NÃO salvas no Supabase")
        return

    # 5. Preparar dados para inserir no Supabase
    recs_to_insert = []
    for i, rec in enumerate(recommendations):
        recs_to_insert.append({
            'user_id': user_id,
            'movie_id': rec['movie_id'],
            'predicted_score': rec['score'],
            'position': i + 1,
        })

    # 6. Deletar recomendações antigas do usuário
    print("\n💾 Salvando no Supabase...")
    try:
        supabase.table('user_recommendations')\
            .delete()\
            .eq('user_id', user_id)\
            .execute()
        print(f"   🗑️  Recomendações antigas deletadas")
    except Exception as e:
        print(f"   ⚠️  Erro ao deletar recomendações antigas: {e}")

    # 7. Inserir novas recomendações
    try:
        supabase.table('user_recommendations')\
            .insert(recs_to_insert)\
            .execute()
        print(f"   ✅ {len(recs_to_insert)} recomendações salvas!")
    except Exception as e:
        print(f"   ❌ Erro ao inserir recomendações: {e}")
        return


if __name__ == "__main__":
    print("=" * 60)
    print("🧪 TESTE DE GERAÇÃO DE RECOMENDAÇÕES")
    print("=" * 60)
    print()
    
    # Perguntar se quer usar cache local
    print("📍 Onde carregar os dados dos filmes?")
    print("   [L] Cache LOCAL (rápido, recomendado)")
    print("   [S] SUPABASE (lento, 16k+ queries)")
    escolha = input("   Escolha (L/S): ").strip().upper()
    use_local = escolha != 'S'
    print()
    
    # Perguntar o user_id
    user_id = input("� Digite o user_id para gerar recomendações: ").strip()
    if not user_id:
        print("❌ User ID não pode ser vazio!")
        exit(1)
    print()
    
    # Perguntar se quer salvar no Supabase
    print("💾 Salvar recomendações no Supabase?")
    print("   [S] SIM - salvar no banco")
    print("   [N] NÃO - apenas testar localmente")
    save_choice = input("   Escolha (S/N): ").strip().upper()
    save_to_supabase = save_choice == 'S'
    print()
    
    # Carregar dados
    if use_local:
        df, embeddings = load_movies_from_cache()
    else:
        df, embeddings = load_movies_from_supabase()
    
    if df is None or embeddings is None:
        print("❌ Falha ao carregar dados.")
        exit(1)
    
    # Gerar recomendações
    generate_recommendations_local(user_id, df, embeddings, save_to_supabase)
    
    print("\n" + "=" * 60)
    print("✅ Processo concluído!")
    print("=" * 60)
