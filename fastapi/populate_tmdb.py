import os
import time
import requests
import pandas as pd
import numpy as np
from typing import List, Dict, Any
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer

# Load environment variables
load_dotenv()

# Configuration
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not TMDB_API_KEY:
    raise ValueError("❌ TMDB_API_KEY not found in .env")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Supabase credentials not found in .env")

# Initialize clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
print("📥 Loading embeddings model (768 dimensions)...")
model = SentenceTransformer('all-mpnet-base-v2')  # 768 dimensions (best quality)
print("✅ Model loaded!")

BASE_URL = "https://api.themoviedb.org/3"

def fetch_movies_from_tmdb(pages: int = 5, start_page: int = 1, sort_by: str = "popularity.desc") -> List[Dict]:
    """
    Fetch movies from TMDB using the discover endpoint
    """
    movies = []
    print(f"🔄 Fetching {pages} pages of movies from TMDB (Sort: {sort_by})...")
    
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
            
            print(f"   Page {page}/{start_page + pages - 1}: {len(results)} movies found")
            time.sleep(0.1)  # Respect rate limit (40 req/10s)
            
        except Exception as e:
            print(f"❌ Error on page {page}: {e}")
            continue
            
    return movies

def get_genres_map() -> Dict[int, str]:
    """Fetches genre ID to name map"""
    try:
        url = f"{BASE_URL}/genre/movie/list"
        params = {"api_key": TMDB_API_KEY, "language": "en-US"}
        response = requests.get(url, params=params)
        data = response.json()
        return {g["id"]: g["name"] for g in data.get("genres", [])}
    except Exception as e:
        print(f"⚠️ Error fetching genres: {e}")
        return {}

def get_movie_details(movie_id: int) -> Dict[str, Any]:
    """Fetches full movie details (keywords, runtime, director, cast)"""
    try:
        url = f"{BASE_URL}/movie/{movie_id}"
        params = {
            "api_key": TMDB_API_KEY,
            "append_to_response": "keywords,credits"
        }
        response = requests.get(url, params=params)
        data = response.json()
        
        # Extract keywords
        keywords = [k['name'] for k in data.get('keywords', {}).get('keywords', [])]
        
        # Extract runtime
        runtime = data.get('runtime', 0)
        
        # Extract director
        director = None
        for crew in data.get('credits', {}).get('crew', []):
            if crew.get('job') == 'Director':
                director = crew.get('name')
                break
        
        # Extract top 4 cast members
        cast = data.get('credits', {}).get('cast', [])
        stars = [actor.get('name') for actor in cast[:4]]
        
        return {
            'keywords': keywords,
            'runtime': runtime,
            'director': director,
        }
    except Exception as e:
        # Silently fail to keep process running
        return {
            'keywords': [],
            'runtime': None,
            'director': None,
        }

def process_and_upload_movies(raw_movies: List[Dict], genres_map: Dict[int, str]):
    """Processes movies, generates embeddings with RICH METADATA and uploads to Supabase"""
    processed_movies = []
    
    print(f"⚙️  Processing {len(raw_movies)} movies...")
    
    # Remove duplicates based on ID
    unique_movies = list({m['id']: m for m in raw_movies}.values())
    print(f"   After removing duplicates: {len(unique_movies)} unique movies")
    
    for idx, movie in enumerate(unique_movies):
        try:
            # Show progress every 10 movies
            if idx % 10 == 0:
                print(f"   Processing movie {idx}/{len(unique_movies)}: {movie.get('title', 'Unknown')}")
            
            # Skip if no overview or title
            if not movie.get('overview') or not movie.get('title'):
                continue
                
            # Map genres
            genre_names = [genres_map.get(gid, "Unknown") for gid in movie.get('genre_ids', [])]
            genre_str = ", ".join(genre_names)
            
            # 1. Fetch full details (keywords, runtime, director, cast)
            details = get_movie_details(movie['id'])
            keywords_str = ", ".join(details['keywords'][:10])  # Top 10 keywords
            
            # 2. Get Language
            lang = movie.get('original_language', 'unknown')
            
            # 3. Create RICH text for embedding (including Director to capture filmmaking style)
            director_text = f"Director: {details['director']}" if details['director'] else ""
            text_for_embedding = (
                f"{movie['title']}. "
                f"{movie['overview']} "
                f"Genres: {genre_str}. "
                f"Keywords: {keywords_str}. "
                f"Language: {lang}. "
                f"{director_text}"
            ).strip()  # Remove trailing space if no director
            
            # Occasional debug
            if idx % 50 == 0:
                print(f"   📝 Embedding: '{text_for_embedding[:100]}...'")
            
            # Generate embedding
            embedding = model.encode(text_for_embedding).tolist()
            
            movie_data = {
                "id": movie['id'],
                "series_title": movie['title'],
                "runtime": str(details['runtime']) if details['runtime'] else None,
                "genre": genre_str,
                "imdb_rating": movie.get('vote_average'),
                "director": details['director'],
                "no_of_votes": movie.get('vote_count', 0),
                "poster_url": f"https://image.tmdb.org/t/p/w500{movie['poster_path']}" if movie.get('poster_path') else None,
                "embedding": embedding,
                "embedding_input": text_for_embedding 
            }
            
            processed_movies.append(movie_data)
            
            # Manual rate limit to not exceed API with extra keyword requests
            time.sleep(0.05) 
            
        except Exception as e:
            print(f"⚠️ Error processing movie {movie.get('title', 'Unknown')}: {e}")
            import traceback
            traceback.print_exc()
            continue

    if not processed_movies:
        print("⚠️ Nenhum filme processado com sucesso.")
        return

    # Upload para Supabase em batches
    batch_size = 100
    total_uploaded = 0
    
    print(f"🚀 Uploading {len(processed_movies)} movies to Supabase...")
    
    for i in range(0, len(processed_movies), batch_size):
        batch = processed_movies[i:i+batch_size]
        try:
            # Usar upsert para evitar erros de duplicata
            supabase.table('movies').upsert(batch).execute()
            total_uploaded += len(batch)
            print(f"   Progress: {total_uploaded}/{len(processed_movies)} movies saved")
        except Exception as e:
            print(f"❌ Error saving batch {i}: {e}")
            # Try to print detailed error if possible
            if hasattr(e, 'details'):
                print(f"   Details: {e.details}")

def main():
    print("🎬 Starting TMDB population script for 100K MOVIES...")
    print("⚠️  THIS PROCESS WILL TAKE 4-6 HOURS. Leave it running!\n")
    
    print("\n📥 Fetching data from TMDB...")
    genres_map = get_genres_map()
    print(f"✅ {len(genres_map)} genres mapped")
    
    # Strategy: Fetch popular, top rated and by year movies for diversity
    # For initial test, we'll fetch fewer pages. For 100k, increase the ranges.
    
    all_movies = []
    
    # 🎯 STRATEGY FOR MAXIMUM MOVIES
    # TMDB limits to 500 pages per query
    # Total: 500 pages x 3 categories x 20 movies/page = ~30k unique movies
    
    print("📦 Stage 1/3: Popular Movies (500 pages - TMDB max)...")
    all_movies.extend(fetch_movies_from_tmdb(pages=500, sort_by="popularity.desc"))
    
    print("\n📦 Stage 2/3: Top Rated Movies (500 pages)...")
    all_movies.extend(fetch_movies_from_tmdb(pages=500, start_page=1, sort_by="vote_average.desc"))
    
    print("\n📦 Stage 3/3: Movies by Vote Count (500 pages)...")
    all_movies.extend(fetch_movies_from_tmdb(pages=500, start_page=1, sort_by="vote_count.desc"))
    
    print(f"📦 Total raw movies collected: {len(all_movies)}")
    
    process_and_upload_movies(all_movies, genres_map)
    
    print("\n✅ Completed! Check Supabase.")

if __name__ == "__main__":
    main()
