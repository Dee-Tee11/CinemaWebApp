"""
🗄️ Script para exportar filmes e embeddings do Supabase para cache local

EXECUTAR ESTE SCRIPT UMA VEZ quando o Supabase recuperar o Disk IO Budget.
Depois disso, o main.py vai usar os ficheiros locais em vez de fazer queries.

Uso:
    python export_cache.py
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

# Supabase Initialization
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError(
        "❌ Variáveis de ambiente não configuradas!\n"
        "Adicione ao arquivo FastApi/.env:\n"
        "SUPABASE_URL=...\n"
        "SUPABASE_SERVICE_KEY=..."
    )

supabase: Client = create_client(supabase_url, supabase_key)

# Diretório para o cache
CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Caminhos dos ficheiros de cache
MOVIES_CACHE_PATH = os.path.join(CACHE_DIR, "movies.pkl")
EMBEDDINGS_CACHE_PATH = os.path.join(CACHE_DIR, "embeddings.npy")


def export_movies_to_cache():
    """
    Exporta todos os filmes do Supabase para ficheiros locais.
    Isto evita queries pesadas em cada inicialização do servidor.
    """
    print("=" * 60)
    print("🗄️  EXPORTAR FILMES DO SUPABASE PARA CACHE LOCAL")
    print("=" * 60)
    print()
    
    print("📥 Buscando filmes do Supabase (com paginação)...")
    print("   ⚠️  Isto vai consumir Disk IO Budget, só executar quando necessário!")
    print()
    
    all_movies = []
    page_size = 1000
    offset = 0
    page_num = 1
    
    while True:
        try:
            response = supabase.table("movies").select("*").range(offset, offset + page_size - 1).execute()
            
            if not response.data:
                break
            
            all_movies.extend(response.data)
            print(f"   📄 Página {page_num}: {len(response.data)} filmes carregados")
            
            # Se retornou menos que page_size, chegamos ao fim
            if len(response.data) < page_size:
                break
            
            offset += page_size
            page_num += 1
            
        except Exception as e:
            print(f"❌ Erro ao buscar página {page_num}: {e}")
            print("   O servidor pode ainda estar a recuperar. Tenta novamente mais tarde.")
            return False
    
    if not all_movies:
        print("❌ Nenhum filme encontrado!")
        return False
    
    print(f"\n✅ Total: {len(all_movies)} filmes carregados do Supabase")
    
    # Converter para DataFrame
    df_movies = pd.DataFrame(all_movies)
    
    # Extrair embeddings
    print("\n⚙️  Processando embeddings...")
    embeddings_list = []
    for emb in df_movies['embedding']:
        if isinstance(emb, str):
            emb = json.loads(emb)
        embeddings_list.append(emb)
    
    embeddings = np.array(embeddings_list, dtype=np.float32)
    print(f"   Shape: {embeddings.shape}")
    
    # Remover coluna embedding do DataFrame (já está no .npy)
    df_movies_no_emb = df_movies.drop(columns=['embedding'])
    
    # Salvar para ficheiros locais
    print(f"\n💾 Salvando cache em: {CACHE_DIR}")
    
    # Salvar DataFrame (sem embeddings) como pickle
    with open(MOVIES_CACHE_PATH, 'wb') as f:
        pickle.dump(df_movies_no_emb, f)
    print(f"   ✅ {MOVIES_CACHE_PATH}")
    
    # Salvar embeddings como numpy array
    np.save(EMBEDDINGS_CACHE_PATH, embeddings)
    print(f"   ✅ {EMBEDDINGS_CACHE_PATH}")
    
    # Mostrar tamanhos
    movies_size = os.path.getsize(MOVIES_CACHE_PATH) / (1024 * 1024)
    emb_size = os.path.getsize(EMBEDDINGS_CACHE_PATH) / (1024 * 1024)
    
    print(f"\n📊 Tamanho dos ficheiros:")
    print(f"   movies.pkl:     {movies_size:.2f} MB")
    print(f"   embeddings.npy: {emb_size:.2f} MB")
    print(f"   Total:          {movies_size + emb_size:.2f} MB")
    
    print("\n" + "=" * 60)
    print("✅ CACHE EXPORTADO COM SUCESSO!")
    print("=" * 60)
    print("\n🎉 Agora o main.py vai carregar do cache local.")
    print("   Não precisas de fazer queries pesadas ao Supabase!")
    print("\n💡 Para atualizar o cache (ex: novos filmes), executa este script novamente.")
    
    return True


if __name__ == "__main__":
    export_movies_to_cache()
