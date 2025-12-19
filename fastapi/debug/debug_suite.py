"""
🛠️ CENTRALIZED DEBUG SUITE (CinemaWebApp)

This script unifies all testing and debugging tools:
1. [V] Automatic Validation: Tests the quality of embeddings (clusters, categories).
2. [M] Manual Test: Interactive search for movies and similar ones.
3. [E] Explain Recommendations: Simulates the recommendation engine for a user.
4. [I] Cache Info: Shows statistics and data structure.

Usage:
    python debug/debug_suite.py
"""
import os
import sys
import pickle
import numpy as np
import pandas as pd
from typing import List, Tuple
from sklearn.metrics.pairwise import cosine_similarity
from collections import Counter
from dotenv import load_dotenv
from supabase import create_client, Client
import json

# ==============================================================================
# CONFIG & PATHS
# ==============================================================================
load_dotenv()

CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache")  # Fixed path relative to debug/
MOVIES_CACHE_PATH = os.path.join(CACHE_DIR, "movies.pkl")
EMBEDDINGS_CACHE_PATH = os.path.join(CACHE_DIR, "embeddings.npy")
PROGRESS_PATH = os.path.join(CACHE_DIR, "progress.txt")

# Supabase (Optional)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except:
        pass


# ==============================================================================
# CORE FUNCTIONS
# ==============================================================================
def load_data(verbose=True):
    """Loads data from cache"""
    if verbose:
        print("📥 Loading cache...")
    
    if not os.path.exists(MOVIES_CACHE_PATH):
        print("❌ Movie cache not found! Run: python regenerate_embeddings.py")
        return None, None
    
    if not os.path.exists(EMBEDDINGS_CACHE_PATH):
        print("❌ Embeddings cache not found!")
        return None, None
        
    df = pickle.load(open(MOVIES_CACHE_PATH, 'rb'))
    embeddings = np.load(EMBEDDINGS_CACHE_PATH)
    
    if verbose:
        print(f"✅ {len(df)} movies loaded")
        print(f"✅ Embeddings shape: {embeddings.shape}")
        
    return df, embeddings

def find_movie_by_title(df, title: str):
    """Finds movie by title (partial match)"""
    matches = df[df['series_title'].str.contains(title, case=False, na=False)]
    if len(matches) == 0:
        return None
    return matches.iloc[0]

def find_movie_by_id(df, movie_id):
    """Finds movie by exact ID"""
    # Ensure ID type consistency
    matches = df[df['id'] == int(movie_id)]
    if len(matches) == 0:
        return None
    return matches.iloc[0]

def calc_similarity(emb1, emb2):
    return np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))

def get_user_ratings(user_id: str):
    """Fetches user ratings from Supabase"""
    if not supabase:
        print("❌ Supabase not configured (check .env)")
        return {}
        
    print(f"📊 Fetching user ratings for: {user_id}")
    try:
        response = supabase.table('user_movies')\
            .select('movie_id, rating')\
            .eq('user_id', user_id)\
            .execute()
        
        if not response.data:
            print("⚠️  No ratings found!")
            return {}
        
        ratings = {int(m['movie_id']): float(m['rating']) for m in response.data}
        print(f"✅ {len(ratings)} ratings found")
        return ratings
    except Exception as e:
        print(f"❌ Error fetching ratings: {e}")
        return {}

def find_top_k_similar_for_user(df, embeddings, movie_id, user_ratings, k=3):
    """Finds K similar movies excluding watched ones"""
    # Map ID -> Index
    id_map = {int(row['id']): idx for idx, row in df.iterrows()}
    
    if movie_id not in id_map: return []
    
    idx = id_map[movie_id]
    query_emb = embeddings[idx]
    
    seen_ids = set(user_ratings.keys())
    
    sims = []
    limit = len(embeddings)
    
    for i in range(len(df)):
        if i == idx or i >= limit: continue
        
        candidate_id = int(df.iloc[i]['id'])
        if candidate_id in seen_ids: continue
        
        score = calc_similarity(query_emb, embeddings[i])
        sims.append((df.iloc[i], score))
        
    sims.sort(key=lambda x: x[1], reverse=True)
    return sims[:k]


# ==============================================================================
# MODE 1: VALIDATION SUITE (from test_embeddings.py)
# ==============================================================================
# ==============================================================================
# MODE 1: VALIDATION SUITE (from test_embeddings.py)
# ==============================================================================
TEST_CASES = {
    '🎬 ANIMATION': {
        'Pixar/Disney': {
            'movies': ['Toy Story', 'Finding Nemo', 'The Incredibles'],
            'expect_keywords': ['pixar', 'disney', 'toy story', 'animation'],
            'expect_studios': ['Pixar', 'Walt Disney']
        },
        'DreamWorks': {
            'movies': ['Shrek', 'Kung Fu Panda', 'How to Train Your Dragon'],
            'expect_keywords': ['dreamworks', 'shrek', 'kung fu panda'],
            'expect_studios': ['DreamWorks']
        },
        'Anime': {
            'movies': ['Spirited Away', 'My Neighbor Totoro'],
            'expect_keywords': ['ghibli', 'miyazaki', 'anime', 'japan'],
            'expect_studios': ['Studio Ghibli']
        },
    },
    '🔫 CRIME': {
        'Gangster': {
            'movies': ['The Godfather', 'Goodfellas'],
            'expect_keywords': ['mafia', 'crime', 'gangster', 'mob'],
            'expect_studios': ['Paramount']
        },
    },
    '🦸 SUPERHERO': {
        'DC': {
            'movies': ['The Dark Knight', 'Batman Begins'],
            'expect_keywords': ['batman', 'dc', 'gotham'],
            'expect_studios': ['Warner Bros']
        },
    },
    '🌏 ASIAN': {
        'Korean': {
            'movies': ['Train to Busan', 'Oldboy'],
            'expect_keywords': ['korean', 'korea'],
            'expect_studios': []
        },
    },
    '🎬 DIRECTOR STYLE': {
        'David Fincher (Thriller/Psychological)': {
            'movies': ['Fight Club', 'Se7en'],
            'expect_keywords': ['thriller', 'psychological', 'twist', 'dark'],
            'expect_studios': [],
            'expect_directors': ['David Fincher']
        },
        'Christopher Nolan (Complex/Sci-Fi)': {
            'movies': ['Inception', 'Interstellar'],
            'expect_keywords': ['time', 'space', 'science fiction', 'mind'],
            'expect_studios': [],
            'expect_directors': ['Christopher Nolan']
        }
    },
    '⚠️ REGRESSION TEST': {
        'George Miller (Diverse Range)': {
            'movies': ['Happy Feet'],
            'expect_keywords': ['animation', 'penguin', 'family', 'musical'],
            'expect_studios': [],
            'expect_directors': [] # We don't expect Mad Max here!
        }
    },
    '💃 BOLLYWOOD': {
        'Popular': {
            'movies': ['3 Idiots', 'Dangal', 'RRR'],
            'expect_keywords': ['bollywood', 'india', 'musical', 'hindi'],
            'expect_studios': []
        }
    },
    '⚔️ WUXIA': {
        'Classics': {
            'movies': ['Crouching Tiger, Hidden Dragon', 'Hero'],
            'expect_keywords': ['wuxia', 'martial arts', 'china', 'sword'],
            'expect_studios': []
        }
    },
    '❄️ NORDIC NOIR': {
        'Thriller': {
            'movies': ['The Hunt', 'The Girl with the Dragon Tattoo'],
            'expect_keywords': ['nordic', 'scandinavia', 'crime', 'sweden', 'denmark'],
            'expect_studios': []
        }
    },
    '🍷 FRENCH': {
        'Classics': {
            'movies': ['Amélie', 'The Intouchables'],
            'expect_keywords': ['french', 'france', 'paris'],
            'expect_studios': []
        }
    },
    '🌮 LATIN': {
        'Acclaimed': {
            'movies': ['City of God', 'Roma', "Pan's Labyrinth"],
            'expect_keywords': ['brazil', 'mexico', 'latin', 'spanish'],
            'expect_studios': []
        }
    },
    '👻 CULT HORROR': {
        'Classics': {
            'movies': ['The Evil Dead', 'Hereditary'],
            'expect_keywords': ['horror', 'cult', 'gore', 'supernatural'],
            'expect_studios': []
        }
    },
    '🌍 MAINSTREAM / BROAD': {
        '😂 Comedy / Feel Good': {
            'movies': ['Superbad', 'The Hangover'],
            'expect_keywords': ['comedy', 'funny', 'laugh', 'friends', 'party'],
            'expect_studios': []
        },
        '😭 Emotional / Drama': {
            'movies': ["Hachi: A Dog's Tale", 'The Green Mile'],
            'expect_keywords': ['drama', 'sad', 'emotional', 'cry', 'touching'],
            'expect_studios': []
        },
        '🤠 80s Adventure': {
            'movies': ['Back to the Future', 'Raiders of the Lost Ark'],
            'expect_keywords': ['adventure', 'action', '80s', 'classic', 'sci-fi'],
            'expect_studios': ['Universal', 'Lucasfilm']
        }
    }
}

def smart_score_results(query_title: str, results: List[Tuple], expect_keywords: List[str], expect_studios: List[str], expect_directors: List[str] = None) -> float:
    if not results: return 0.0
    score = 0.0
    max_score = len(results)
    query_lower = query_title.lower()
    
    for title, sim, metadata in results:
        title_lower = title.lower()
        emb_input = metadata.get('embedding_input', '').lower()
        
        # 1. Same franchise (1.0)
        if any(word in title_lower for word in query_lower.split() if len(word) > 3):
            score += 1.0; continue
            
        # 2. Mesmo Director (0.9) - NOVO!
        if expect_directors:
            # Try to find director in embedding_input ("Directed by X")
            found_director = False
            for director in expect_directors:
                director_lower = director.lower()
                if f"directed by {director_lower}" in emb_input or f"film by {director_lower}" in emb_input:
                    score += 0.9
                    found_director = True
                    break
            if found_director: continue

        # 3. Same studio (0.8)
        if expect_studios and metadata.get('studios'):
            for studio in metadata['studios']:
                if any(exp.lower() in studio.lower() for exp in expect_studios):
                    score += 0.8; break
        # 4. Keywords (0.6)
        if any(kw in emb_input or kw in title_lower for kw in expect_keywords):
            score += 0.6
        # 5. High similarity (0.4)
        if sim > 0.7: score += 0.4
            
    return (score / max_score) * 100

def run_validation_suite(df, embeddings):
    print("\n" + "="*80)
    print("🧪 EMBEDDING VALIDATION TEST (IMPROVED SCORING)")
    print("="*80)
    
    # 1. Qualidade Geral
    print("\n" + "="*80)
    print("📊 GENERAL QUALITY ANALYSIS")
    print("="*80)
    
    zero_embs = sum(1 for e in embeddings if np.all(e == 0))
    print(f"\n1️⃣  Valid Embeddings: {len(embeddings) - zero_embs} (Zeros: {zero_embs})")
    
    # Check Metadata quality
    print(f"\n2️⃣  embedding_input quality:")
    if 'embedding_input' in df.columns:
        with_tmdb = 0
        with_keywords = 0
        with_studios = 0
        for idx, row in df.iterrows():
            emb_input = str(row.get('embedding_input', ''))
            if 'Language:' in emb_input or 'Countries:' in emb_input: with_tmdb += 1
            if 'Themes:' in emb_input or 'Keywords:' in emb_input: with_keywords += 1
            if 'Studios:' in emb_input: with_studios += 1
        print(f"   🎬 With TMDB metadata: {with_tmdb}/{len(df)} ({with_tmdb/len(df)*100:.1f}%)")
        print(f"   🏷️  With keywords/themes: {with_keywords}/{len(df)} ({with_keywords/len(df)*100:.1f}%)")
        print(f"   🏢 With studios: {with_studios}/{len(df)} ({with_studios/len(df)*100:.1f}%)")

    # 3. Distribuição
    print(f"\n3️⃣  Similarity distribution:")
    sample_size = min(1000, len(embeddings))
    random_indices = np.random.choice(len(embeddings), sample_size, replace=False)
    sims = []
    for i in range(len(random_indices)-1):
        s = cosine_similarity([embeddings[random_indices[i]]], [embeddings[random_indices[i+1]]])[0][0]
        sims.append(s)
    print(f"   📈 Mean: {np.mean(sims):.3f} | Median: {np.median(sims):.3f}")
    print(f"   📉 Min: {np.min(sims):.3f} | Max: {np.max(sims):.3f}")

    # 2. Testes por Categoria
    all_scores = []
    
    for cat, subcats in TEST_CASES.items():
        print("\n" + "="*80)
        print(f"{cat}")
        print("="*80)
        
        for sub, config in subcats.items():
            print(f"\n🎯 {sub}:")
            sub_scores = []
            
            for movie_title in config['movies']:
                match = find_movie_by_title(df, movie_title)
                if match is None: 
                    print(f"   ⚠️  '{movie_title}' not found")
                    continue
                
                print(f"\n   📌 {movie_title}:")
                
                # Get similar
                idx = match.name
                if idx >= len(embeddings): continue
                
                query_emb = embeddings[idx]
                
                # Fast top-k logic here
                all_sims = cosine_similarity([query_emb], embeddings)[0]
                top_idx = np.argsort(all_sims)[::-1][1:6] # Top 5 (skip self)
                
                results = []
                for rank, res_idx in enumerate(top_idx, 1):
                    row = df.iloc[res_idx]
                    metadata = extract_metadata(row)
                    score = all_sims[res_idx]
                    
                    studios_str = ', '.join(metadata['studios'][:2]) if metadata['studios'] else 'N/A'
                    print(f"      {rank}. {row['series_title']} ({score:.3f})")
                    print(f"         Studios: {studios_str}")
                    if metadata.get('genres'):
                        # Using raw 'genres' from metadata might be cleaner
                        print(f"         Genres: {', '.join(metadata['genres'][:3])}")
                    
                    results.append((row['series_title'], score, metadata))
                
                
                accuracy = smart_score_results(
                    movie_title, 
                    results, 
                    config['expect_keywords'], 
                    config['expect_studios'],
                    config.get('expect_directors')
                )
                sub_scores.append(accuracy)
                print(f"      ✓ Score: {accuracy:.1f}%")
            
            if sub_scores:
                avg = sum(sub_scores)/len(sub_scores)
                all_scores.append(avg)
                print(f"\n   📊 {sub} Average Score: {avg:.1f}%")

    if all_scores:
        overall = sum(all_scores)/len(all_scores)
        print("\n" + "="*80)
        print(f"🎯 OVERALL SCORE: {overall:.1f}%")
        if overall >= 80: print("   ✅ Embeddings are EXCELLENT!")
        elif overall >= 60: print("   ⚠️  Embeddings are GOOD.")
        else: print("   ❌ Embeddings need adjustments.")


# ==============================================================================
# MODE 2: MANUAL TEST (from manual_test.py)
# ==============================================================================
def extract_metadata(row):
    """Helper to extract metadata from embedding_input"""
    emb_input = str(row.get('embedding_input', ''))
    meta = {'embedding_input': emb_input, 'studios': [], 'language': '', 'genres': []}
    
    try:
        # Normalize newlines to spaces for easier searching or keep them?
        # Let's simple split by lines
        lines = emb_input.split('\n')
        
        for line in lines:
            if 'Studios:' in line:
                # Format: "Studios: A, B | Language: ..."
                part = line.split('Studios:')[1].split('|')[0]
                meta['studios'] = [s.strip() for s in part.split(',')]
            
            if 'Language:' in line:
                part = line.split('Language:')[1].split('|')[0]
                meta['language'] = part.strip()
                
            if 'Genres:' in line:
                part = line.split('Genres:')[1].split('|')[0]
                meta['genres'] = [g.strip() for g in part.split(',')]
            
            # Director parsing
            if 'Directed by' in line:
                # "Directed by David Fincher. A film by..."
                part = line.split('Directed by')[1].split('.')[0]
                meta['directors'] = [d.strip() for d in part.split(',')]
                
    except: pass
    return meta

def run_manual_test(df, embeddings):
    print("\n🕵️ INTERACTIVE MANUAL TEST")
    print("   (Type 'exit' to return to menu)")
    
    while True:
        query = input("\n🎬 Movie to search for: ").strip()
        if query.lower() in ['sair', 'exit', '0', 'quit']: break
        if not query: continue
        
        matches = df[df['series_title'].str.contains(query, case=False, na=False)]
        if len(matches) == 0:
            print("❌ Not found.")
            continue
            
        # Select precision
        if len(matches) > 1:
            print(f"\nFound {len(matches)} movies. Using the first:")
            matches = matches.head(5) # Limit to 5
            for i in range(len(matches)):
                print(f"{i+1}. {matches.iloc[i]['series_title']} ({matches.iloc[i].get('released_year', 'N/A')})")
            
            # Simple selection (default 1)
            # Future: allow selection
        
        movie = matches.iloc[0]
        idx = movie.name
        
        if idx >= len(embeddings):
            print("⚠️ No embedding generated yet.")
            continue
            
        print(f"\n🎯 Searching for similar movies to: {movie['series_title']}...")
        meta = extract_metadata(movie)
        print(f"   [DEBUG] Input Preview:\n   {meta['embedding_input'][:400]}...") # Show Raw
        
        query_emb = embeddings[idx]
        limit = len(embeddings)
        
        # Calc similar
        match_candidates = []
        
        # Helper for efficient comparison
        query_directors = meta.get('directors', [])
        
        for i, row in df.iterrows():
            if i == idx or i >= limit: continue
            sim = cosine_similarity([query_emb], [embeddings[i]])[0][0]
            match_candidates.append((i, row, sim))
            
        # --- HYBRID RERANKING ---
        # 1. Take Top 100 raw (to avoid checking all 16k metadata)
        match_candidates.sort(key=lambda x: x[2], reverse=True)
        top_candidates = match_candidates[:100]
        
        final_results = []
        for i, row, sim in top_candidates:
            boost = 0.0
            row_meta = extract_metadata(row)
            
            # Director Boost (+0.15)
            if query_directors:
                cand_directors = row_meta.get('directors', [])
                if any(d in cand_directors for d in query_directors):
                    boost += 0.15
                    
            final_score = sim + boost
            final_results.append((row, final_score, sim, boost > 0)) # Store bool for display
            
        # Top 5 Final
        final_results.sort(key=lambda x: x[1], reverse=True)
        
        print("\n🔝 TOP 5 SIMILAR (Hybrid Reranked):")
        for rank, (m, score, raw_sim, boosted) in enumerate(final_results[:5], 1):
            m_meta = extract_metadata(m)
            studios = ', '.join(m_meta['studios'][:2]) if m_meta['studios'] else 'N/A'
            
            boost_icon = "🚀" if boosted else ""
            print(f"   {rank}. {m['series_title']} ({score:.3f}) {boost_icon}")
            if boosted:
                 print(f"      (Raw: {raw_sim:.3f} + Director Boost)")
            print(f"      Studios: {studios}")
            # print(f"      Genres: ...") # Removed to avoid duplication if printed elsewhere

# ==============================================================================
# MODE 3: EXPLAIN RECS (Simulated)
# ==============================================================================
# ==============================================================================
# MODE 3: EXPLAIN RECS (Simulated + User)
# ==============================================================================
def run_explain_recs(df, embeddings):
    print("\n🧠 EXPLAIN RECOMMENDATIONS")
    print("   1. Simulate (choose 1 movie and see similar)")
    print("   2. Real User (analyze Supabase ratings)")
    
    mode = input("\nChoice (1/2): ").strip()
    
    if mode == '2':
        # REAL USER MODE
        user_id = input("\n📝 Enter user_id: ").strip()
        if not user_id: return
        
        ratings = get_user_ratings(user_id)
        if not ratings: return
        
        print("\n⏳ Generating explained recommendations...")
        all_recs = {}
        
        # Analisar Top Ratings
        sorted_ratings = sorted(ratings.items(), key=lambda x: x[1], reverse=True)
        
        print(f"\n📋 Analyzing based on your favorite movies:\n")
        
        for movie_id, rating in sorted_ratings[:5]: # Top 5 recent/best
            # Find movie info
            matches = df[df['id'] == movie_id]
            if len(matches) == 0: continue
            movie = matches.iloc[0]
            
            print(f"   🎬 Because you liked: {movie['series_title']} ({rating}⭐)")
            
            similares = find_top_k_similar_for_user(df, embeddings, movie_id, ratings, k=3)
            for rec_movie, score in similares:
                print(f"      -> Suggests: {rec_movie['series_title']} ({score*100:.1f}%)")
                
                # Aggregate
                rid = int(rec_movie['id'])
                if rid not in all_recs:
                    all_recs[rid] = {'movie': rec_movie, 'scores': [], 'sources': []}
                all_recs[rid]['scores'].append(score)
                all_recs[rid]['sources'].append(movie['series_title'])
        
        # Show Final Top
        final_list = []
        for rid, data in all_recs.items():
            avg_sim = sum(data['scores'])/len(data['scores'])
            count = len(data['scores'])
            final_score = avg_sim * (1 + count * 0.1) # Boost freq
            final_list.append((data['movie'], final_score, data['sources']))
            
        final_list.sort(key=lambda x: x[1], reverse=True)
        
        print("\n" + "="*60)
        print("🏆 TOP 10 FINAL RECOMMENDATIONS")
        print("="*60)
        for i, (m, score, srcs) in enumerate(final_list[:10], 1):
            src_text = ", ".join(srcs[:2])
            print(f"{i}. {m['series_title']} (Score: {score:.3f})")
            print(f"   Based on: {src_text}")
            
    else:
        # SIMULATION MODE
        print("\n   Simulates recommendations based on a specific movie ID.")
        
        query = input("\n🎬 ID or Name of the movie the user 'liked': ").strip()
        if not query: return
        
        movie = find_movie_by_title(df, query)
        # Also try ID
        if movie is None and query.isdigit():
            matches = df[df['id'] == int(query)]
            if len(matches) > 0: movie = matches.iloc[0]
                
        if movie is None:
            print("❌ Movie not found.")
            return
            
        print(f"\n✅ Based on: {movie['series_title']}")
        
        idx = movie.name
        if idx >= len(embeddings):
            print("⚠️ No embedding.")
            return 
            
        # Find similar
        query_emb = embeddings[idx]
        
        sims = []
        limit = len(embeddings)
        for i in range(len(df)):
            if i == idx or i >= limit: continue
            sim = calc_similarity(query_emb, embeddings[i])
            sims.append((df.iloc[i], sim))
        
        sims.sort(key=lambda x: x[1], reverse=True)
        
        print("\n📋 The algorithm would recommend:")
        for i, (m, score) in enumerate(sims[:5], 1):
            print(f"   {i}. {m['series_title']} (Sim: {score*100:.1f}%)")
            print(f"      Justification: Visual style and similar themes.")


# ==============================================================================
# MAIN MENU
# ==============================================================================
# --- RAG SERVICE IMPORT ---
try:
    import sys
    import os
    # Add parent directory to path to find rag_service from inside debug folder
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from rag_service import RagService
    rag_service = RagService()
except Exception as e:
    print(f"⚠️ RAG Service unavailable: {e}")
    rag_service = RagService()
except Exception as e:
    print(f"⚠️ RAG Service unavailable: {e}")
    rag_service = None

import time

def run_rag_validation_suite(df, embeddings):
    print("\n" + "="*80)
    print("🤖 AUTOMATIC RAG TEST (PERSONA + LLM)")
    print("="*80)
    
    if not rag_service or not rag_service.llm:
        print("❌ RAG Service not configured.")
        return

    all_scores = []

    for cat, subcats in TEST_CASES.items():
        print("\n" + "="*80)
        print(f"{cat}")
        print("="*80)
        
        for sub, config in subcats.items():
            print(f"⏳ Waiting 15s to respect Rate Limits...")
            time.sleep(15)
            
            print(f"\n🎯 {sub} (Simulando User):")
            
            # 1. Simular Ratings
            ratings = []
            for m in config['movies']:
                match = find_movie_by_title(df, m)
                if match is not None:
                    # Enrich rating with metadata for better persona
                    ratings.append({
                        'title': match['series_title'],
                        'rating': 20.0,
                        'genre': match.get('genre', ''),
                        'year': match.get('released_year', ''),
                        'origin_country': match.get('origin_country', ''),
                        'original_language': match.get('original_language', '')
                    })
            
            if not ratings:
                print("   ⚠️  No movies found for this test.")
                continue
                
            # 2. Build Persona
            print("   👤 Building Persona...")
            persona = rag_service.build_persona(ratings)
            print(f"      \"{persona[:100]}...\"")
            
            # 3. Vector Search (Candidate Gen)
            print("   🔍 Generating 50 Candidates...")
            candidates_pool = {}
            for rated in ratings:
                match = df[df['series_title'] == rated['title']]
                if len(match) > 0:
                    idx = match.index[0]
                    query_emb = embeddings[idx]
                    sims = cosine_similarity([query_emb], embeddings)[0]
                    # Top 20 similar per movie
                    top_idx = np.argsort(sims)[::-1][1:21]
                    for cand_idx in top_idx:
                        score = sims[cand_idx]
                        if cand_idx not in candidates_pool:
                            candidates_pool[cand_idx] = score
                        else:
                            candidates_pool[cand_idx] = max(candidates_pool[cand_idx], score)
            
            # Convert to list
            candidates_list = []
            watched_titles = {r['title'] for r in ratings}
            sorted_pool = sorted(candidates_pool.items(), key=lambda x: x[1], reverse=True)
            
            for idx, score in sorted_pool:
                if len(candidates_list) >= 50: break
                row = df.iloc[idx]
                title = row['series_title']
                if title in watched_titles: continue
                
                candidates_list.append({
                    'title': title,
                    'year': row.get('released_year', 'N/A'),
                    'genre': row.get('genre', ''),
                    'overview': row.get('overview', 'N/A'),
                    'score': float(score),
                    'origin_country': row.get('origin_country', ''),
                    # Meta for scoring
                    'studios': extract_metadata(row)['studios'],
                    'embedding_input': str(row.get('embedding_input', ''))
                })
                
            # 4. RAG Rerank
            print("   🧠 LLM Reranking logic...")
            final_recs = rag_service.rerank_recommendations(persona, candidates_list, user_query=f"I want movies like {cat} - {sub}")
            
            # 5. Score Results
            results_tuple = []
            print(f"\n   📋 Top 5 RAG Recommendations:")
            for i, rec in enumerate(final_recs[:5], 1):
                print(f"      {i}. {rec['title']}")
                print(f"         Reason: {rec.get('rag_explanation', 'N/A')}")
                
                # Adapt format for scorer: (title, sim, metadata)
                # metadata dict needs 'embedding_input' and 'studios'
                meta = {
                    'embedding_input': rec.get('embedding_input', ''),
                    'studios': rec.get('studios', [])
                }
                results_tuple.append((rec['title'], 0.9, meta)) # Mock high sim for RAG
                
            accuracy = smart_score_results(
                config['movies'][0], # Use first movie as "query" anchor
                results_tuple,
                config['expect_keywords'],
                config['expect_studios'],
                config.get('expect_directors')
            )
            all_scores.append(accuracy)
            print(f"      ✓ RAG Relevance Score: {accuracy:.1f}%")

    if all_scores:
        overall = sum(all_scores)/len(all_scores)
        print("\n" + "="*80)
        print(f"🎯 OVERALL RAG SCORE: {overall:.1f}%")

def run_rag_test(df, embeddings):
    print("\n🧠 RAG INTELLIGENCE TEST")
    if not rag_service or not rag_service.llm:
        print("❌ RAG Service not configured (Missing GROQ_API_KEY).")
        return
        
    print("   (Simulating Onboarding...)")
    print("\n🔹 STEP 1: WHO ARE YOU? (To create Persona)")
    print("   [1] Simulated User (Nolan Fan)")
    print("   [2] Real User (Supabase ID)")
    choice_mode = input("   Choice (1/2): ").strip()
    
    ratings = []
    
    if choice_mode == '2':
        user_id = input("   📝 Digite o user_id: ").strip()
        raw_ratings = get_user_ratings(user_id)
        
        if not raw_ratings:
            print("❌ Sem ratings ou erro. Abortando.")
            return

        # Map ID -> Title
        # Try to find the correct ID column
        id_col = 'id'
        possible_cols = ['id', 'movie_id', 'movieId', 'tmdb_id']
        for c in possible_cols:
            if c in df.columns:
                id_col = c
                break
                
        # Create map
        id_to_title = dict(zip(df[id_col], df['series_title']))
        
        for mid, r in raw_ratings.items():
            # Try direct, int, str lookup
            title = None
            if mid in id_to_title: title = id_to_title[mid]
            elif int(mid) in id_to_title: title = id_to_title[int(mid)]
            
            if title:
                ratings.append({'title': title, 'rating': r})
        
        print(f"✅ Convertidos {len(ratings)} filmes para texto.")
        
    else:
        # 1. Simulate Profile (Scale 0-20)
        ratings = [
            {'title': 'The Dark Knight', 'rating': 20.0},
            {'title': 'Inception', 'rating': 20.0},
            {'title': 'Se7en', 'rating': 20.0},
            {'title': 'Mamma Mia!', 'rating': 5.0},
            {'title': 'Fast & Furious', 'rating': 8.0}
        ]
    print("\n📝 Simulated User History:")
    for r in ratings:
        print(f"   - {r['title']}: {r['rating']}⭐")
        
    print("\n🤖 [Stage 1] Building Persona with LLM...")
    persona = rag_service.build_persona(ratings)
    print(f"   👤 Generated Persona: \"{persona}\"")
    
    # --- LOOP: ACTIVE RAG ---
    while True:
        print("\n" + "-"*40)
        query = input("🗣️  Query (ou Enter para 'For You' | 'sair'): ").strip()
        if query.lower() in ['sair', 'exit', '0']: break
        
        # 2. Vector Search (Phase 2)
        print("🔍 [Fase 2] Fetched Top 50 Candidates (Vector Search)...")
        candidates_pool = {}
        
        # A) Personal History Candidates (Always active)
        liked_movies = [r for r in ratings if r['rating'] >= 15.0]
        if liked_movies:
            # print(f"   Using history anchors: {[m['title'] for m in liked_movies[:3]]}...")
            for liked in liked_movies:
                match = df[df['series_title'] == liked['title']]
                if len(match) > 0:
                    idx = match.index[0]
                    source_emb = embeddings[idx]
                    
                    # Calc similarities to all
                    sims = cosine_similarity([source_emb], embeddings)[0]
                    
                    # --- HYBRID BOOSTING FOR CANDIDATES ---
                    # 1. Get Top 100 Raw neighbors first (Optimization)
                    raw_top_indices = np.argsort(sims)[::-1][1:101]
                    
                    # 2. Apply Boosts (Director/Metadata)
                    source_meta = extract_metadata(df.iloc[idx])
                    source_directors = source_meta.get('directors', [])
                    
                    boosted_candidates = []
                    for cand_idx in raw_top_indices:
                        cand_row = df.iloc[cand_idx]
                        cand_meta = extract_metadata(cand_row)
                        
                        boost = 0.0
                        # Director Boost (+0.15) if shared director
                        if source_directors:
                            cand_directors = cand_meta.get('directors', [])
                            # DEBUG PROBE
                            if 'Prestige' in cand_row['series_title']:
                                print(f"   🐛 PROBE: Checking Prestige. Source Dirs: {source_directors} | Cand Dirs: {cand_directors}")
                                
                            if any(d in cand_directors for d in source_directors):
                                boost += 0.15
                                if 'Prestige' in cand_row['series_title']:
                                     print(f"   🚀 BOOSTED Prestige by +0.15! New Score: {sims[cand_idx] + boost}")
                                
                        final_score = sims[cand_idx] + boost
                        boosted_candidates.append((cand_idx, final_score))
                    
                    # 3. Sort by Boosted Score
                    boosted_candidates.sort(key=lambda x: x[1], reverse=True)
                    
                    # 4. Take Top 15 (Boosted)
                    for cand_idx, score in boosted_candidates[:15]:
                        if cand_idx not in candidates_pool:
                            candidates_pool[cand_idx] = score
                        else:
                            candidates_pool[cand_idx] = max(candidates_pool[cand_idx], score)

        # B) Query Anchors (Active Flow)
        # Check if user mentioned any movie title in the query
        if query:
            print(f"   🕵️ Analisando query por títulos de filmes...")
            # Simple fuzzy match: check if any movie title is in the query string
            # Optimization: Only check known popular titles or exact matches to avoid noise
            # For debug suite, we iterate DF
            found_anchors = []
            lower_query = query.lower()
            
            # Heuristic: Check words in query against titles
            # This is slow, but OK for local debug
            for idx, row in df.iterrows():
                t = row['series_title']
                if len(t) > 3 and t.lower() in lower_query:
                    found_anchors.append((idx, t))
            
            if found_anchors:
                print(f"   🎯 Anchors encontrados: {[t for _, t in found_anchors]}")
                for idx, t in found_anchors:
                    # Boost this semantic area
                    sims = cosine_similarity([embeddings[idx]], embeddings)[0]
                    top_indices = np.argsort(sims)[::-1][1:20] # Top 20 similar to anchor
                    for cand_idx in top_indices:
                        if cand_idx not in candidates_pool:
                            candidates_pool[cand_idx] = sims[cand_idx] # Add raw sim
                        else:
                            candidates_pool[cand_idx] += 0.5 # Boost existing
            else:
                if len(query) > 3:
                     print("   (Nenhum filme específico detetado na query, usando apenas Persona)")
        
        # Sort e Select Top 50
        candidates_sorted = sorted(candidates_pool.items(), key=lambda x: x[1], reverse=True)
        
        # Filter watched
        watched_titles = set(r['title'] for r in ratings)
        indices = []
        for idx, score in candidates_sorted:
            movie_title = df.iloc[idx]['series_title']
            if movie_title not in watched_titles:
                indices.append(idx)
            if len(indices) >= 50: break

        candidates = []
        for i in indices:
            if i >= len(df): continue
            m = df.iloc[i] 
            candidates.append({
                'title': m.get('series_title', 'Unknown'),
                'year': m.get('released_year', m.get('Released_Year', 'N/A')),
                'genre': m.get('genre', ''),
                'overview': m.get('overview', 'No overview'),
                'score': float(candidates_pool.get(i, 0.0))
            })
            
        if not candidates:
            print("❌ Nenhum candidato encontrado. (Tenta adicionar mais ratings ou mencionar filmes conhecidos)")
            continue
            
        print(f"   generated {len(candidates)} unique candidates.")
        
        # DEBUG: Check for The Prestige
        for i, c in enumerate(candidates):
            if 'Prestige' in c['title']:
                print(f"   👀 DEBUG: '{c['title']}' está na posição #{i+1} dos candidatos (Score: {c['score']:.4f})")
                break
        else:
             print("   👀 DEBUG: 'The Prestige' NÃO entrou no Top 50 candidatos.")
            
        print("🤔 [Stage 3] LLM Reranking & Filtering...")
        final_recs = rag_service.rerank_recommendations(persona, candidates, query)
        
        print("\n✨ FINAL RECOMMENDATIONS (RAG):")
        for i, rec in enumerate(final_recs, 1):
            print(f"   {i}. {rec['title']} ({rec.get('year')})")
            print(f"      💡 AI: {rec.get('rag_explanation', 'No reasoning')}")

def run_rag_test(df, embeddings):
    print("\n🧠 RAG INTELLIGENCE TEST")
    if not rag_service or not rag_service.llm:
        print("❌ RAG Service not configured (Missing GROQ_API_KEY).")
        return
        
    print("   (Simulating Onboarding...)")
    print("\n🔹 STEP 1: WHO ARE YOU? (To create Persona)")
    print("   [1] Simulated User (Nolan Fan)")
    print("   [2] Real User (Supabase ID)")
    choice_mode = input("   Choice (1/2): ").strip()
    
    ratings = []
    
    if choice_mode == '2':
        user_id = input("   📝 Enter user_id: ").strip()
        raw_ratings = get_user_ratings(user_id)
        
        if not raw_ratings:
            print("❌ No ratings or error. Aborting.")
            return

        # Map ID -> Title
        id_col = 'id'
        possible_cols = ['id', 'movie_id', 'movieId', 'tmdb_id']
        for c in possible_cols:
            if c in df.columns:
                id_col = c
                break
                
        # Create map
        id_to_title = dict(zip(df[id_col], df['series_title']))
        
        for mid, r in raw_ratings.items():
            title = None
            if mid in id_to_title: title = id_to_title[mid]
            elif int(mid) in id_to_title: title = id_to_title[int(mid)]
            
            if title:
                ratings.append({'title': title, 'rating': r})
        
        print(f"✅ Converted {len(ratings)} movies to text.")
        
    else:
        # 1. Simulate Profile (Scale 0-20)
        ratings = [
            {'title': 'The Dark Knight', 'rating': 20.0},
            {'title': 'Inception', 'rating': 20.0},
            {'title': 'Se7en', 'rating': 20.0},
            {'title': 'Mamma Mia!', 'rating': 5.0},
            {'title': 'Fast & Furious', 'rating': 8.0}
        ]
    print("\n📝 Simulated User History:")
    for r in ratings:
        print(f"   - {r['title']}: {r['rating']}⭐")
        
    print("\n🤖 [Stage 1] Building Persona with LLM...")
    persona = rag_service.build_persona(ratings)
    print(f"   👤 Generated Persona: \"{persona}\"")
    
    # --- LOOP: ACTIVE RAG ---
    while True:
        print("\n" + "-"*40)
        query = input("🗣️  Query (or Enter for 'For You' | 'exit'): ").strip()
        if query.lower() in ['sair', 'exit', '0', 'quit']: break
        
        # 2. Vector Search (Phase 2)
        print("🔍 [Stage 2] Fetched Top 50 Candidates (Vector Search)...")
        candidates_pool = {}
        
        # A) Personal History Candidates (Always active)
        liked_movies = [r for r in ratings if r['rating'] >= 15.0]
        if liked_movies:
            for liked in liked_movies:
                match = df[df['series_title'] == liked['title']]
                if len(match) > 0:
                    idx = match.index[0]
                    source_emb = embeddings[idx]
                    sims = cosine_similarity([source_emb], embeddings)[0]
                    raw_top_indices = np.argsort(sims)[::-1][1:101]
                    
                    source_meta = extract_metadata(df.iloc[idx])
                    source_directors = source_meta.get('directors', [])
                    
                    boosted_candidates = []
                    for cand_idx in raw_top_indices:
                        cand_row = df.iloc[cand_idx]
                        cand_meta = extract_metadata(cand_row)
                        boost = 0.0
                        if source_directors:
                            cand_directors = cand_meta.get('directors', [])
                            if any(d in cand_directors for d in source_directors):
                                boost += 0.15
                        final_score = sims[cand_idx] + boost
                        boosted_candidates.append((cand_idx, final_score))
                    
                    boosted_candidates.sort(key=lambda x: x[1], reverse=True)
                    for cand_idx, score in boosted_candidates[:15]:
                        if cand_idx not in candidates_pool:
                            candidates_pool[cand_idx] = score
                        else:
                            candidates_pool[cand_idx] = max(candidates_pool[cand_idx], score)

        # B) Query Anchors (Active Flow)
        if query:
            print(f"   🕵️ Analyzing query for movie titles...")
            found_anchors = []
            lower_query = query.lower()
            for idx, row in df.iterrows():
                t = row['series_title']
                if len(t) > 3 and t.lower() in lower_query:
                    found_anchors.append((idx, t))
            
            if found_anchors:
                print(f"   🎯 Anchors found: {[t for _, t in found_anchors]}")
                for idx, t in found_anchors:
                    sims = cosine_similarity([embeddings[idx]], embeddings)[0]
                    top_indices = np.argsort(sims)[::-1][1:20]
                    for cand_idx in top_indices:
                        if cand_idx not in candidates_pool:
                            candidates_pool[cand_idx] = sims[cand_idx]
                        else:
                            candidates_pool[cand_idx] += 0.5
            else:
                if len(query) > 3:
                     print("   (No specific movie detected in query, using Persona only)")
        
        # Sort e Select Top 50
        candidates_sorted = sorted(candidates_pool.items(), key=lambda x: x[1], reverse=True)
        watched_titles = set(r['title'] for r in ratings)
        indices = []
        for idx, score in candidates_sorted:
            movie_title = df.iloc[idx]['series_title']
            if movie_title not in watched_titles:
                indices.append(idx)
            if len(indices) >= 50: break

        candidates = []
        for i in indices:
            if i >= len(df): continue
            m = df.iloc[i] 
            candidates.append({
                'title': m.get('series_title', 'Unknown'),
                'year': m.get('released_year', m.get('Released_Year', 'N/A')),
                'genre': m.get('genre', ''),
                'overview': m.get('overview', 'No overview'),
                'score': float(candidates_pool.get(i, 0.0))
            })
            
        if not candidates:
            print("❌ No candidates found. (Try adding more ratings or mentioning known movies)")
            continue
            
        print(f"   generated {len(candidates)} unique candidates.")
            
        print("🤔 [Stage 3] LLM Reranking & Filtering...")
        final_recs = rag_service.rerank_recommendations(persona, candidates, query)
        
        print("\n✨ FINAL RECOMMENDATIONS (RAG):")
        for i, rec in enumerate(final_recs, 1):
            print(f"   {i}. {rec['title']} ({rec.get('year')})")
            print(f"      💡 AI: {rec.get('rag_explanation', 'No reasoning')}")
            
    # input("\n(Pressiona Enter para voltar ao menu...)") # Loop handles this

def main():
    while True:
        print("\n" + "="*60)
        print("🛠️  DEBUG SUITE (CinemaWebApp)")
        print("="*60)
        print("   1. [Validate] Automatic Suite (Quality Tests)")
        print("   2. [Manual]   Interactive Search & Similarity")
        print("   3. [Explain]  Explain Recommendations")
        print("   5. [Info]     Cache Info")
        print("   7. [Direct RAG] Experience: Direct RAG (No Persona)")
        print("   8. [Manual RAG] Interactive Manual Test (1 Movie)")
        print("   9. [Chatbot]    Cinema Assistant")
        print("   0. Exit")
        
        choice = input("\nChoice: ").strip()
        
        if choice == '0':
            print("👋 Bye!")
            break
            
        # Load data if needed
        if choice in ['1', '2', '3', '5', '7', '8', '9']:
            df, embeddings = load_data(verbose=(choice=='5'))
            if df is None: continue
            
        if choice == '1':
            run_validation_suite(df, embeddings)
        elif choice == '2':
            run_manual_test(df, embeddings)
        elif choice == '3':
            run_explain_recs(df, embeddings)
        elif choice == '8':
             print("\n🕵️ INTERACTIVE MANUAL TEST (DIRECT RAG)")
             print("   (Type 'exit' to return to menu)")
             
             while True:
                 movie_input = input("\n🎬 Movie to search for improvements: ").strip()
                 if movie_input.lower() in ['sair', 'exit', 'quit']: break
                 
                 match = find_movie_by_title(df, movie_input)
                 if match is None:
                     print("❌ Movie not found.")
                     continue
                     
                 # Setup Single-Movie History
                 ratings = [{
                    'title': match['series_title'],
                    'rating': 20.0, # Max rating to simulate favorite
                    'genre': match.get('genre', ''),
                    'year': match.get('released_year', '')
                 }]
                 
                 # Vector Search (Just that movie's vector)
                 idx = df[df['series_title'] == match['series_title']].index[0]
                 user_vector = embeddings[idx]
                 
                 print(f"🎯 Searching for similar movies to: {match['series_title']}...")
                 
                 # Get Candidates
                 sims = cosine_similarity([user_vector], embeddings)[0]
                 top_indices = np.argsort(sims)[::-1][1:51] # Skip itself
                 
                 candidates = []
                 for i in top_indices:
                     m = df.iloc[i]
                     candidates.append({
                        'title': m['series_title'],
                        'year': m.get('released_year', 'N/A'),
                        'genre': m.get('genre', ''),
                        'overview': m.get('overview', 'N/A'),
                        'score': float(sims[i]),
                        'origin_country': m.get('origin_country', '')
                     })
                 
                 # RAG Rerank
                 print("   🧠 Asking AI to judge connections...")
                 final_recs = rag_service.rerank(ratings, candidates, "")
                 
                 print("\n✨ RECOMMENDATIONS (RAG):")
                 for i, rec in enumerate(final_recs, 1):
                     print(f"   {i}. {rec['title']} ({rec.get('year')})")
                     print(f"      📝 {rec.get('rag_explanation', 'N/A')}")

        elif choice == '9':
             # Chatbot Mode
             print("\n🤖 CINEMA ASSISTANT (CHATBOT)")
             
             raw_input = input("   [S]imulated (Nolan Fan) or [U]ser Real (Supabase ID)? (s/u or paste ID): ").strip()
             mode = 's'
             user_id = None
             if raw_input.lower() == 'u':
                 mode = 'u'
                 user_id = input("   User ID (UUID): ").strip()
             elif raw_input.lower().startswith('user_') or len(raw_input) > 5:
                 mode = 'u'
                 user_id = raw_input
                 
             ratings = []
             if mode == 'u':
                 print(f"   📡 Fetching ratings for {user_id}...")
                 try:
                    data = supabase.table('user_movies').select('*').eq('user_id', user_id).execute()
                    if data.data:
                        for item in data.data:
                            match = find_movie_by_id(df, item['movie_id'])
                            if match is not None:
                                ratings.append({
                                    'title': match['series_title'],
                                    'rating': item['rating'],
                                    'genre': match.get('genre', ''),
                                    'year': match.get('released_year', '')
                                })
                        print(f"   ✅ {len(ratings)} movies loaded.")
                    else:
                        print("   ⚠️ No data found.")
                 except Exception as e:
                    print(f"   ❌ Error: {e}")
             else:
                 print("   🎭 Loading simulated profile (Nolan Fan)...")
                 nolan_movies = ['The Dark Knight', 'Inception', 'Interstellar', 'The Prestige', 'Memento']
                 for title in nolan_movies:
                     match = find_movie_by_title(df, title)
                     if match: ratings.append({'title': title, 'rating': 20.0})
            
             if not ratings:
                 print("   ⚠️ No history for the chat.")
                 continue
                 
             print("\n💬 CHAT STARTED (Type 'exit' to end)")
             print("   (AI has access to your movie history)")
             while True:
                 user_msg = input("\n👤 You: ").strip()
                 if user_msg.lower() in ['sair', 'exit', 'quit']: break
                 
                 print("   🤖 AI thinking...")
                 response = rag_service.chat_with_history(ratings, user_msg)
                 print(f"\n🤖 AI: {response}")

        elif choice == '7':
             # Direct RAG Test
             print("\n🧪 EXPERIENCE: DIRECT RAG (NO PERSONA)")
             
             raw_input = input("   [S]imulated (Nolan Fan) or [U]ser Real (Supabase ID)? (s/u or paste ID): ").strip()
             
             mode = 's'
             user_id = None
             
             if raw_input.lower() == 'u':
                 mode = 'u'
                 user_id = input("   User ID (UUID): ").strip()
             elif raw_input.lower().startswith('user_') or len(raw_input) > 5:
                 mode = 'u'
                 user_id = raw_input
             
             ratings = []
             
             if mode == 'u':
                 print(f"   📡 Fetching ratings for {user_id}...")
                 try:
                    data = supabase.table('user_movies').select('*').eq('user_id', user_id).execute()
                    if data.data:
                        for item in data.data:
                            match = find_movie_by_id(df, item['movie_id'])
                            if match is not None:
                                ratings.append({
                                    'title': match['series_title'],
                                    'rating': item['rating'],
                                    'genre': match.get('genre', ''),
                                    'year': match.get('released_year', '')
                                })
                        print(f"   ✅ {len(ratings)} movies found for this user.")
                    else:
                        print("   ⚠️ No ratings found.")
                        continue
                 except Exception as e:
                    print(f"   ❌ Error fetching user: {e}")
                    continue
             else:
                 print("   Sending raw history to LLM...")
                 # Hardcoded Nolan Fan for quick test
                 print("   Simulating Nolan Fan...")
                 nolan_movies = ['The Dark Knight', 'Inception', 'Interstellar', 'The Prestige', 'Memento', 'The Shawshank Redemption','The Green Mile','Fight Club','The Matrix','The Dark Knight Rises','The Dark Knight Returns','The Dark Knight','Avatar','Life of Pi']
                 for title in nolan_movies:
                     match = find_movie_by_title(df, title)
                     if match is not None:
                         ratings.append({
                            'title': match['series_title'],
                            'rating': 20.0,
                            'genre': match.get('genre', ''),
                            'year': match.get('released_year', '')
                         })

             if not ratings:
                 print("   ⚠️ No ratings to process.")
                 continue

             # Generate Candidates
             # (No query, just history based)
             query = "" 
             found_anchors = []
             print(f"   Query: (Empty - Relying on History)")
             
             # Calculate User Vector (Average of Rated Movies)
             print("   🧮 Calculating User Vector...")
             user_vector = np.zeros(embeddings.shape[1])
             count = 0
             for r in ratings:
                 match = find_movie_by_title(df, r['title'])
                 if match is not None:
                     idx = df[df['series_title'] == r['title']].index[0]
                     user_vector += embeddings[idx]
                     count += 1
             
             if count > 0:
                 user_vector /= count
             
             # Search Candidates (Vector Search)
             print("   🔍 Generating 50 Candidates (Vector Search)...")
             sims = cosine_similarity([user_vector], embeddings)[0]
             # Get Top 50 unique
             top_indices = np.argsort(sims)[::-1]
             
             candidates = []
             seen_titles = set(r['title'] for r in ratings)
             
             for idx in top_indices:
                 if len(candidates) >= 50: break
                 movie = df.iloc[idx]
                 title = movie['series_title']
                 
                 if title in seen_titles: continue
                 
                 candidates.append({
                    'title': movie['series_title'],
                    'year': movie.get('released_year', 'N/A'),
                    'genre': movie.get('genre', ''),
                    'overview': movie.get('overview', 'N/A'),
                    'score': float(sims[idx]),
                    'origin_country': movie.get('origin_country', '')
                 })
             
             print("   🧠 Asking LLM to pick defaults based on history...")
             final_recs = rag_service.rerank(ratings, candidates, query)
             
             print("\n✨ DIRECT RECOMMENDATIONS:")
             for i, rec in enumerate(final_recs, 1):
                 print(f"   {i}. {rec['title']} ({rec.get('year')})")
                 print(f"      📝 AI Decision: {rec.get('rag_explanation', 'N/A')}")

        elif choice == '5':
            # Detailed Info (Merged from inspect_cache.py)
            print("\n" + "="*60)
            print("📋 CACHE STRUCTURE")
            print("="*60)
            print(f"\nTotal movies: {len(df)}")
            print(f"Total columns: {len(df.columns)}")
            print(f"Embeddings Shape: {embeddings.shape}")
            
            print("\n📝 Available columns:")
            cols = df.columns.tolist()
            # Print in rows of 3
            for i in range(0, len(cols), 3):
                print(f"  {', '.join(cols[i:i+3])}")
                
            print("\n🎬 Example (First movie):")
            m = df.iloc[0]
            print(f"   ID: {m['id']}")
            print(f"   Title: {m['series_title']}")
            if 'embedding_input' in m:
                print(f"   Input Len: {len(m['embedding_input'])} chars")
                print(f"   Input Preview: {m['embedding_input'][:100]}...")
            
        elif choice == '6':
             run_rag_validation_suite(df, embeddings)

        else:
            print("❌ Invalid option.")


if __name__ == "__main__":
    main()

