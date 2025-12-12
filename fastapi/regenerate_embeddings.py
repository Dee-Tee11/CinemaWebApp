"""
Versão OTIMIZADA com batch processing e rate limiting inteligente.

Melhorias:
- Rate limiter para TMDB (40 calls/10s)
- Progress saving (resume capability)
- Validação de API key antes de começar
- Estatísticas em tempo real

Uso:
    export TMDB_API_KEY="your_key_here"
    python regenerate_embeddings_v3.py
"""
import os
import sys
import pickle
import time
import numpy as np
import requests
from collections import deque
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

# Paths
CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
MOVIES_CACHE_PATH = os.path.join(CACHE_DIR, "movies.pkl")
EMBEDDINGS_CACHE_PATH = os.path.join(CACHE_DIR, "embeddings.npy")
TMDB_CACHE_PATH = os.path.join(CACHE_DIR, "tmdb_metadata.pkl")
PROGRESS_PATH = os.path.join(CACHE_DIR, "progress.txt")

# API
TMDB_API_KEY = os.getenv('TMDB_API_KEY')
TMDB_BASE_URL = "https://api.themoviedb.org/3"


class TMDBRateLimiter:
    """Rate limiter inteligente para TMDB API (40 calls / 10 segundos)"""
    def __init__(self, max_calls=38, period=10):  # 38 para margem de segurança
        self.calls = deque()
        self.max_calls = max_calls
        self.period = period
        self.total_waits = 0
        self.total_wait_time = 0
    
    def wait_if_needed(self):
        now = time.time()
        
        # Remove chamadas antigas (fora da janela)
        while self.calls and self.calls[0] < now - self.period:
            self.calls.popleft()
        
        # Se chegou ao limite, espera
        if len(self.calls) >= self.max_calls:
            sleep_time = self.period - (now - self.calls[0]) + 0.1  # +0.1s margem
            if sleep_time > 0:
                self.total_waits += 1
                self.total_wait_time += sleep_time
                print(f"      ⏳ Rate limit - aguardando {sleep_time:.1f}s (wait #{self.total_waits})...")
                time.sleep(sleep_time)
        
        self.calls.append(time.time())
    
    def get_stats(self):
        return {
            'total_waits': self.total_waits,
            'total_wait_time': self.total_wait_time,
            'calls_in_window': len(self.calls)
        }


def validate_tmdb_api():
    """Valida que a API key está configurada e funciona"""
    if not TMDB_API_KEY:
        print("❌ TMDB_API_KEY não configurada!")
        print("\n   Configure assim:")
        print("   export TMDB_API_KEY='sua_chave_aqui'")
        print("\n   Ou cria um ficheiro .env:")
        print("   TMDB_API_KEY=sua_chave_aqui")
        return False
    
    # Test API call
    print("🔑 Validando TMDB API key...")
    try:
        url = f"{TMDB_BASE_URL}/movie/550"  # Fight Club
        params = {'api_key': TMDB_API_KEY}
        response = requests.get(url, params=params, timeout=5)
        
        if response.status_code == 401:
            print("❌ API Key inválida!")
            return False
        elif response.status_code == 200:
            print("✅ API Key válida!")
            data = response.json()
            print(f"   Teste: {data.get('title')} ({data.get('release_date', '')[:4]})")
            return True
        else:
            print(f"⚠️  Resposta inesperada: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao validar API: {e}")
        return False


def fetch_tmdb_rich_metadata(title: str, year: int, rate_limiter: TMDBRateLimiter) -> dict:
    """Fetch TMDB metadata com rate limiting"""
    try:
        # Rate limiting
        rate_limiter.wait_if_needed()
        
        # Search
        search_url = f"{TMDB_BASE_URL}/search/movie"
        params = {'api_key': TMDB_API_KEY, 'query': title}
        if year:
            params['year'] = year
        
        response = requests.get(search_url, params=params, timeout=5)
        if response.status_code != 200:
            return {}
        
        results = response.json().get('results', [])
        if not results:
            return {}
        
        movie_id = results[0]['id']
        
        # Details (outra chamada, precisa de rate limit)
        rate_limiter.wait_if_needed()
        
        details_url = f"{TMDB_BASE_URL}/movie/{movie_id}"
        params = {
            'api_key': TMDB_API_KEY,
            'append_to_response': 'keywords,credits'
        }
        
        response = requests.get(details_url, params=params, timeout=5)
        if response.status_code != 200:
            return {}
        
        data = response.json()
        
        # Extract metadata
        metadata = {
            'tmdb_id': movie_id,
            'original_title': data.get('original_title', ''),
            'original_language': data.get('original_language', ''),
            'genres': [g['name'] for g in data.get('genres', [])],
            'keywords': [kw['name'] for kw in data.get('keywords', {}).get('keywords', [])],
            'tagline': data.get('tagline', ''),
            'overview': data.get('overview', ''),
            'production_companies': [pc['name'] for pc in data.get('production_companies', [])],
            'production_countries': [pc['name'] for pc in data.get('production_countries', [])],
            'directors': [],
            'writers': [],
            'actors': [],
        }
        
        # Extract crew
        credits = data.get('credits', {})
        crew = credits.get('crew', [])
        cast = credits.get('cast', [])
        
        metadata['directors'] = [p['name'] for p in crew if p.get('job') == 'Director'][:3]
        metadata['writers'] = [p['name'] for p in crew if p.get('department') == 'Writing'][:3]
        metadata['actors'] = [p['name'] for p in cast[:5]]
        
        return metadata
        
    except Exception as e:
        return {}


def build_semantic_embedding_text(row, tmdb_data: dict = None) -> str:
    """Constrói texto rico para embeddings"""
    title = row.get('series_title', 'Unknown')
    year = row.get('released_year', '')
    
    # Cultural Context
    cultural_markers = []
    if tmdb_data and tmdb_data.get('original_language'):
        cultural_markers.append(f"Language: {tmdb_data['original_language']}")
    if tmdb_data and tmdb_data.get('production_countries'):
        countries = ', '.join(tmdb_data['production_countries'][:2])
        cultural_markers.append(f"Countries: {countries}")
    if tmdb_data and tmdb_data.get('production_companies'):
        companies = ', '.join(tmdb_data['production_companies'][:3])
        cultural_markers.append(f"Studios: {companies}")
    
    cultural_context = ' | '.join(cultural_markers) if cultural_markers else ''
    
    # Genres & Keywords
    genre_markers = []
    if tmdb_data and tmdb_data.get('genres'):
        genres = ', '.join(tmdb_data['genres'])
        genre_markers.append(f"Genres: {genres}")
    elif row.get('genre'):
        genre_markers.append(f"Genres: {row['genre']}")
    
    if tmdb_data and tmdb_data.get('keywords'):
        keywords = ', '.join(tmdb_data['keywords'][:10])
        genre_markers.append(f"Themes: {keywords}")
    
    genre_context = ' | '.join(genre_markers)
    
    # Creative Team
    creative_markers = []
    directors = tmdb_data.get('directors', []) if tmdb_data else []
    if not directors and row.get('director'):
        directors = [row['director']]
    
    if directors:
        creative_markers.append(f"Directed by {', '.join(directors)}")
    if tmdb_data and tmdb_data.get('writers'):
        creative_markers.append(f"Written by {', '.join(tmdb_data['writers'][:2])}")
    if tmdb_data and tmdb_data.get('actors'):
        creative_markers.append(f"Starring {', '.join(tmdb_data['actors'][:3])}")
    
    creative_context = ' | '.join(creative_markers)
    
    # Content
    content_parts = []
    if tmdb_data and tmdb_data.get('tagline'):
        content_parts.append(tmdb_data['tagline'])
    if tmdb_data and tmdb_data.get('overview'):
        content_parts.append(tmdb_data['overview'])
    
    content_description = ' '.join(content_parts)
    
    # Assembly
    parts = []
    if cultural_context:
        parts.append(cultural_context)
    if genre_context:
        parts.append(genre_context)
    if creative_context:
        parts.append(creative_context)
    parts.append(f"{title} ({year}). {content_description}")
    if tmdb_data and tmdb_data.get('genres'):
        parts.append(f"Style: {', '.join(tmdb_data['genres'])}")
    
    return '\n'.join(parts)


def save_progress(index: int):
    """Salva progresso para resume capability"""
    with open(PROGRESS_PATH, 'w') as f:
        f.write(str(index))


def load_progress() -> int:
    """Carrega progresso anterior"""
    if os.path.exists(PROGRESS_PATH):
        try:
            return int(open(PROGRESS_PATH).read().strip())
        except:
            return 0
    return 0


def main():
    print("="*80)
    print("🚀 REGENERAÇÃO DE EMBEDDINGS - VERSÃO OTIMIZADA (V3)")
    print("="*80)
    print()
    
    # Validate API
    if not validate_tmdb_api():
        return
    
    print()
    
    # Load data
    print("📥 Carregando dados...")
    if not os.path.exists(MOVIES_CACHE_PATH):
        print("❌ Cache não encontrado! Execute: python export_cache.py")
        return
    
    df = pickle.load(open(MOVIES_CACHE_PATH, 'rb'))
    print(f"✅ {len(df)} filmes")
    
    # Load TMDB cache
    tmdb_cache = {}
    if os.path.exists(TMDB_CACHE_PATH):
        tmdb_cache = pickle.load(open(TMDB_CACHE_PATH, 'rb'))
        print(f"📦 {len(tmdb_cache)} metadados TMDB em cache")
    
    # Check progress
    start_idx = load_progress()
    if start_idx > 0:
        print(f"📍 Retomando do filme #{start_idx}")
        response = input("   Continuar de onde parou? (y/n): ")
        if response.lower() != 'y':
            start_idx = 0
            save_progress(0)
    
    print()
    
    # Load model
    print("📥 Carregando modelo...")
    model = SentenceTransformer('BAAI/bge-large-en-v1.5')
    print("✅ BAAI/bge-large-en-v1.5")
    print()
    
    # Initialize
    rate_limiter = TMDBRateLimiter()
    new_embeddings = []
    new_embedding_inputs = []
    
    # Se está a resumir, carrega embeddings anteriores
    if start_idx > 0 and os.path.exists(EMBEDDINGS_CACHE_PATH):
        try:
            prev_embeddings = np.load(EMBEDDINGS_CACHE_PATH)
            new_embeddings = prev_embeddings[:start_idx].tolist()
            
            prev_df = pickle.load(open(MOVIES_CACHE_PATH, 'rb'))
            if 'embedding_input' in prev_df.columns:
                new_embedding_inputs = prev_df['embedding_input'].iloc[:start_idx].tolist()
            print(f"   ✅ Carregados {len(new_embeddings)} embeddings anteriores")
        except Exception as e:
            print(f"   ⚠️  Erro ao carregar checkpoint anterior: {e}")
            print(f"   ⚠️  Recomeçando do zero...")
            new_embeddings = []
            new_embedding_inputs = []
            start_idx = 0
            save_progress(0)
    
    # Stats
    tmdb_fetched = 0
    tmdb_hits = 0
    start_time = time.time()
    
    print(f"⚙️  Processando {len(df) - start_idx} filmes...")
    print(f"   (Estimativa: ~{(len(df) - start_idx) * 0.5 / 60:.1f} minutos com rate limiting)")
    print()
    
    # Process
    for i, (idx, row) in enumerate(df.iloc[start_idx:].iterrows(), start=start_idx):
        try:
            title = row.get('series_title', '')
            year = row.get('released_year', None)
            if year:
                try:
                    year = int(year)
                except (ValueError, TypeError):
                    year = None
            
            # TMDB metadata
            tmdb_data = None
            cache_key = f"{title}_{year}"
            
            if cache_key in tmdb_cache:
                tmdb_data = tmdb_cache[cache_key]
                tmdb_hits += 1
            elif title:
                tmdb_data = fetch_tmdb_rich_metadata(title, year, rate_limiter)
                if tmdb_data and tmdb_data.get('tmdb_id'):
                    tmdb_cache[cache_key] = tmdb_data
                    tmdb_fetched += 1
            
            # Build text
            enriched_text = build_semantic_embedding_text(row, tmdb_data)
            
            # Generate embedding
            embedding = model.encode(enriched_text).tolist()
            
            # Validação Zero Input
            if all(v == 0 for v in embedding):
                print(f"      ⚠️  Warning: Embedding zero para '{title}'")
            
            new_embeddings.append(embedding)
            new_embedding_inputs.append(enriched_text)
            
            # Progress (a cada 25 filmes)
            if (i + 1) % 25 == 0:
                elapsed = time.time() - start_time
                rate = (i + 1 - start_idx) / elapsed if elapsed > 0 else 0
                eta_seconds = (len(df) - i - 1) / rate if rate > 0 else 0
                eta_mins = eta_seconds / 60
                
                rl_stats = rate_limiter.get_stats()
                
                print(f"   ✓ {i + 1}/{len(df)} | "
                      f"TMDB: {tmdb_fetched} new, {tmdb_hits} cached | "
                      f"Rate: {rate:.1f} films/s | "
                      f"ETA: {eta_mins:.1f}min")
                
                # Save progress
                save_progress(i + 1)
                
                # Save intermediate results (a cada 100)
                if (i + 1) % 100 == 0:
                    print(f"      💾 Salvando checkpoint...")
                    embeddings_array = np.array(new_embeddings, dtype=np.float32)
                    np.save(EMBEDDINGS_CACHE_PATH, embeddings_array)
                    # Handle size mismatch if checkpoints happen
                    # Fill remainder with empty
                    remaining = len(df) - len(new_embedding_inputs)
                    df['embedding_input'] = new_embedding_inputs + [''] * remaining
                    pickle.dump(df, open(MOVIES_CACHE_PATH, 'wb'))
                    pickle.dump(tmdb_cache, open(TMDB_CACHE_PATH, 'wb'))
            
        except Exception as e:
            print(f"❌ Erro: {e}")
            new_embeddings.append([0.0] * 768)
            new_embedding_inputs.append('')
    
    # Final save
    print(f"\n💾 Salvando resultados finais...")
    embeddings_array = np.array(new_embeddings, dtype=np.float32)
    np.save(EMBEDDINGS_CACHE_PATH, embeddings_array)
    
    df['embedding_input'] = new_embedding_inputs
    pickle.dump(df, open(MOVIES_CACHE_PATH, 'wb'))
    pickle.dump(tmdb_cache, open(TMDB_CACHE_PATH, 'wb'))
    
    # Remove progress file
    if os.path.exists(PROGRESS_PATH):
        os.remove(PROGRESS_PATH)
    
    # Stats
    total_time = time.time() - start_time
    rl_stats = rate_limiter.get_stats()
    
    print(f"\n✅ CONCLUÍDO!")
    print(f"\n📊 Estatísticas:")
    print(f"   Total processado: {len(new_embeddings)}")
    print(f"   TMDB novos: {tmdb_fetched}")
    print(f"   TMDB cache hits: {tmdb_hits}")
    print(f"   Taxa TMDB: {(tmdb_fetched+tmdb_hits)/len(df)*100:.1f}%")
    print(f"   Tempo total: {total_time/60:.1f} minutos")
    print(f"   Rate limiter: {rl_stats['total_waits']} waits, {rl_stats['total_wait_time']/60:.1f}min waiting")
    print(f"\n🧪 Teste agora: python debug/test_embeddings.py")


if __name__ == "__main__":
    main()
