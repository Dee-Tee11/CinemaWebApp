import os
import time
import requests
import pandas as pd
import numpy as np
from typing import List, Dict, Any
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer

# Carregar variáveis de ambiente
load_dotenv()

# Configurações
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not TMDB_API_KEY:
    raise ValueError("❌ TMDB_API_KEY não encontrada no .env")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Credenciais do Supabase não encontradas no .env")

# Inicializar clientes
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
print("📥 Carregando modelo de embeddings (768 dimensões)...")
model = SentenceTransformer('all-mpnet-base-v2')  # 768 dimensões (melhor qualidade)
print("✅ Modelo carregado!")

BASE_URL = "https://api.themoviedb.org/3"

def fetch_movies_from_tmdb(pages: int = 5, start_page: int = 1, sort_by: str = "popularity.desc") -> List[Dict]:
    """
    Busca filmes do TMDB usando o endpoint discover
    """
    movies = []
    print(f"🔄 Buscando {pages} páginas de filmes do TMDB (Sort: {sort_by})...")
    
    for page in range(start_page, start_page + pages):
        try:
            url = f"{BASE_URL}/discover/movie"
            params = {
                "api_key": TMDB_API_KEY,
                "language": "en-US",
                "sort_by": sort_by,
                "include_adult": "false",
                "include_video": "false",
                "page": page,
                "vote_count.gte": 100  # Filtrar filmes com poucos votos para garantir qualidade
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            results = data.get("results", [])
            movies.extend(results)
            
            print(f"   Página {page}/{start_page + pages - 1}: {len(results)} filmes encontrados")
            time.sleep(0.1)  # Respeitar rate limit (40 req/10s)
            
        except Exception as e:
            print(f"❌ Erro na página {page}: {e}")
            continue
            
    return movies

def get_genres_map() -> Dict[int, str]:
    """Busca mapa de IDs de gêneros para nomes"""
    try:
        url = f"{BASE_URL}/genre/movie/list"
        params = {"api_key": TMDB_API_KEY, "language": "en-US"}
        response = requests.get(url, params=params)
        data = response.json()
        return {g["id"]: g["name"] for g in data.get("genres", [])}
    except Exception as e:
        print(f"⚠️ Erro ao buscar gêneros: {e}")
        return {}

def process_and_upload_movies(raw_movies: List[Dict], genres_map: Dict[int, str]):
    """Processa filmes, gera embeddings e envia para o Supabase"""
    processed_movies = []
    
    print(f"⚙️  Processando {len(raw_movies)} filmes...")
    
    # Remover duplicatas baseadas no ID
    unique_movies = list({m['id']: m for m in raw_movies}.values())
    print(f"   Após remover duplicatas: {len(unique_movies)} filmes únicos")
    
    for idx, movie in enumerate(unique_movies):
        try:
            # Mostrar progresso a cada 100 filmes
            if idx % 100 == 0:
                print(f"   Processando filme {idx}/{len(unique_movies)}: {movie.get('title', 'Unknown')}")
            
            # Pular se não tiver overview ou título
            if not movie.get('overview') or not movie.get('title'):
                continue
                
            # Mapear gêneros
            genre_names = [genres_map.get(gid, "Unknown") for gid in movie.get('genre_ids', [])]
            genre_str = ", ".join(genre_names)
            
            # Criar texto para embedding
            text_for_embedding = f"{movie['title']}. {movie['overview']}. Genres: {genre_str}"
            
            # Gerar embedding
            embedding = model.encode(text_for_embedding).tolist()
            
            movie_data = {
                "id": movie['id'],
                "series_title": movie['title'],
                "genre": genre_str,
                "overview": movie['overview'],
                "imdb_rating": movie.get('vote_average'),
                "poster_url": f"https://image.tmdb.org/t/p/w500{movie['poster_path']}" if movie.get('poster_path') else None,
                "embedding": embedding,
                "no_of_votes": movie.get('vote_count', 0)
            }
            
            processed_movies.append(movie_data)
            
        except Exception as e:
            print(f"⚠️ Erro ao processar filme {movie.get('title', 'Unknown')}: {e}")
            import traceback
            traceback.print_exc()
            continue

    if not processed_movies:
        print("⚠️ Nenhum filme processado com sucesso.")
        return

    # Upload para Supabase em batches
    batch_size = 100
    total_uploaded = 0
    
    print(f"🚀 Enviando {len(processed_movies)} filmes para o Supabase...")
    
    for i in range(0, len(processed_movies), batch_size):
        batch = processed_movies[i:i+batch_size]
        try:
            # Usar upsert para evitar erros de duplicata
            supabase.table('movies').upsert(batch).execute()
            total_uploaded += len(batch)
            print(f"   Progresso: {total_uploaded}/{len(processed_movies)} filmes salvos")
        except Exception as e:
            print(f"❌ Erro ao salvar batch {i}: {e}")
            # Tentar imprimir o erro detalhado se possível
            if hasattr(e, 'details'):
                print(f"   Detalhes: {e.details}")

def main():
    print("🎬 Iniciando script de população do TMDB para 100K FILMES...")
    print("⚠️  ESTE PROCESSO VAI DEMORAR 4-6 HORAS. Deixa a correr!\n")
    
    print("\n📥 Buscando dados do TMDB...")
    genres_map = get_genres_map()
    print(f"✅ {len(genres_map)} gêneros mapeados")
    
    # Estratégia: Buscar filmes populares, top rated e por ano para diversidade
    # Para teste inicial, vamos buscar menos páginas. Para 100k, aumentar os ranges.
    
    all_movies = []
    
    # 🎯 ESTRATÉGIA PARA MÁXIMO DE FILMES
    # TMDB limita a 500 páginas por query
    # Total: 500 páginas x 3 categorias x 20 filmes/página = ~30k filmes únicos
    
    print("📦 Fase 1/3: Filmes Populares (500 páginas - máximo TMDB)...")
    all_movies.extend(fetch_movies_from_tmdb(pages=500, sort_by="popularity.desc"))
    
    print("\n📦 Fase 2/3: Filmes Top Rated (500 páginas)...")
    all_movies.extend(fetch_movies_from_tmdb(pages=500, start_page=1, sort_by="vote_average.desc"))
    
    print("\n📦 Fase 3/3: Filmes por Votos (500 páginas)...")
    all_movies.extend(fetch_movies_from_tmdb(pages=500, start_page=1, sort_by="vote_count.desc"))
    
    print(f"📦 Total de filmes brutos coletados: {len(all_movies)}")
    
    process_and_upload_movies(all_movies, genres_map)
    
    print("\n✅ Concluído! Verifique o Supabase.")

if __name__ == "__main__":
    main()
