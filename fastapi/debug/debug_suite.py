"""
🛠️ DEBUG SUITE CENTRALIZADO (CinemaWebApp)

Este script unifica todas as ferramentas de teste e debug:
1. [V] Validação Automática: Testa a qualidade dos embeddings (clusters, categorias).
2. [M] Teste Manual: Procura filmes e vê similares interactiva.
3. [E] Explicar Recomendações: Simula o motor de recomendações para um user.
4. [I] Info do Cache: Mostra estatísticas e estrutura dos dados.

Uso:
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
    """Carrega dados do cache"""
    if verbose:
        print("📥 Carregando cache...")
    
    if not os.path.exists(MOVIES_CACHE_PATH):
        print("❌ Cache de filmes não encontrado! Execute: python regenerate_embeddings.py")
        return None, None
    
    if not os.path.exists(EMBEDDINGS_CACHE_PATH):
        print("❌ Cache de embeddings não encontrado!")
        return None, None
        
    df = pickle.load(open(MOVIES_CACHE_PATH, 'rb'))
    embeddings = np.load(EMBEDDINGS_CACHE_PATH)
    
    if verbose:
        print(f"✅ {len(df)} filmes carregados")
        print(f"✅ Embeddings shape: {embeddings.shape}")
        
    return df, embeddings

def find_movie_by_title(df, title: str):
    """Encontra filme por título (partial match)"""
    matches = df[df['series_title'].str.contains(title, case=False, na=False)]
    if len(matches) == 0:
        return None
    return matches.iloc[0]

def calc_similarity(emb1, emb2):
    return np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))

def get_user_ratings(user_id: str):
    """Busca as avaliações do utilizador no Supabase"""
    if not supabase:
        print("❌ Supabase não configurado (verifique .env)")
        return {}
        
    print(f"📊 Buscando avaliações do utilizador: {user_id}")
    try:
        response = supabase.table('user_movies')\
            .select('movie_id, rating')\
            .eq('user_id', user_id)\
            .execute()
        
        if not response.data:
            print("⚠️  Nenhuma avaliação encontrada!")
            return {}
        
        ratings = {int(m['movie_id']): float(m['rating']) for m in response.data}
        print(f"✅ {len(ratings)} avaliações encontradas")
        return ratings
    except Exception as e:
        print(f"❌ Erro ao buscar ratings: {e}")
        return {}

def find_top_k_similar_for_user(df, embeddings, movie_id, user_ratings, k=3):
    """Encontra K filmes similares excluindo os já vistos"""
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
            'expect_directors': [] # Não esperamos Mad Max aqui!
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
            'expect_keywords': ['horror', 'cult', 'gore', 'supernatural'],
            'expect_studios': []
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
        
        # 1. Mesma franquia (1.0)
        if any(word in title_lower for word in query_lower.split() if len(word) > 3):
            score += 1.0; continue
            
        # 2. Mesmo Director (0.9) - NOVO!
        if expect_directors:
            # Tentar encontrar director no embedding_input ("Directed by X")
            found_director = False
            for director in expect_directors:
                director_lower = director.lower()
                if f"directed by {director_lower}" in emb_input or f"film by {director_lower}" in emb_input:
                    score += 0.9
                    found_director = True
                    break
            if found_director: continue

        # 3. Mesmo studio (0.8)
        if expect_studios and metadata.get('studios'):
            for studio in metadata['studios']:
                if any(exp.lower() in studio.lower() for exp in expect_studios):
                    score += 0.8; break
        # 4. Keywords (0.6)
        if any(kw in emb_input or kw in title_lower for kw in expect_keywords):
            score += 0.6
        # 5. Similaridade alta (0.4)
        if sim > 0.7: score += 0.4
            
    return (score / max_score) * 100

def run_validation_suite(df, embeddings):
    print("\n" + "="*80)
    print("🧪 TESTE DE VALIDAÇÃO DE EMBEDDINGS (SCORING MELHORADO)")
    print("="*80)
    
    # 1. Qualidade Geral
    print("\n" + "="*80)
    print("📊 ANÁLISE GERAL DE QUALIDADE")
    print("="*80)
    
    zero_embs = sum(1 for e in embeddings if np.all(e == 0))
    print(f"\n1️⃣  Embeddings Válidos: {len(embeddings) - zero_embs} (Zeros: {zero_embs})")
    
    # Check Metadata quality
    print(f"\n2️⃣  Qualidade do embedding_input:")
    if 'embedding_input' in df.columns:
        with_tmdb = 0
        with_keywords = 0
        with_studios = 0
        for idx, row in df.iterrows():
            emb_input = str(row.get('embedding_input', ''))
            if 'Language:' in emb_input or 'Countries:' in emb_input: with_tmdb += 1
            if 'Themes:' in emb_input or 'Keywords:' in emb_input: with_keywords += 1
            if 'Studios:' in emb_input: with_studios += 1
        print(f"   🎬 Com metadata TMDB: {with_tmdb}/{len(df)} ({with_tmdb/len(df)*100:.1f}%)")
        print(f"   🏷️  Com keywords/themes: {with_keywords}/{len(df)} ({with_keywords/len(df)*100:.1f}%)")
        print(f"   🏢 Com studios: {with_studios}/{len(df)} ({with_studios/len(df)*100:.1f}%)")

    # 3. Distribuição
    print(f"\n3️⃣  Distribuição de similaridades:")
    sample_size = min(1000, len(embeddings))
    random_indices = np.random.choice(len(embeddings), sample_size, replace=False)
    sims = []
    for i in range(len(random_indices)-1):
        s = cosine_similarity([embeddings[random_indices[i]]], [embeddings[random_indices[i+1]]])[0][0]
        sims.append(s)
    print(f"   📈 Média: {np.mean(sims):.3f} | Mediana: {np.median(sims):.3f}")
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
                    print(f"   ⚠️  '{movie_title}' não encontrado")
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
                print(f"\n   📊 {sub} Score Médio: {avg:.1f}%")

    if all_scores:
        overall = sum(all_scores)/len(all_scores)
        print("\n" + "="*80)
        print(f"🎯 SCORE GERAL: {overall:.1f}%")
        if overall >= 80: print("   ✅ Embeddings estão EXCELENTES!")
        elif overall >= 60: print("   ⚠️  Embeddings estão BONS.")
        else: print("   ❌ Embeddings precisam de ajustes.")


# ==============================================================================
# MODE 2: MANUAL TEST (from manual_test.py)
# ==============================================================================
def extract_metadata(row):
    """Helper para extrair metadata do embedding_input"""
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
    print("\n🕵️ TESTE MANUAL INTERATIVO")
    print("   (Digite 'sair' para voltar ao menu)")
    
    while True:
        query = input("\n🎬 Filme para buscar similares: ").strip()
        if query.lower() in ['sair', 'exit', '0']: break
        if not query: continue
        
        matches = df[df['series_title'].str.contains(query, case=False, na=False)]
        if len(matches) == 0:
            print("❌ Não encontrado.")
            continue
            
        # Select precision
        if len(matches) > 1:
            print(f"\nEncontrados {len(matches)} filmes. Usando o primeiro:")
            matches = matches.head(5) # Limit to 5
            for i in range(len(matches)):
                print(f"{i+1}. {matches.iloc[i]['series_title']} ({matches.iloc[i].get('released_year', 'N/A')})")
            
            # Simple selection (default 1)
            # Future: allow selection
        
        movie = matches.iloc[0]
        idx = movie.name
        
        if idx >= len(embeddings):
            print("⚠️ Sem embedding gerado ainda.")
            continue
            
        print(f"\n🎯 Buscando similares para: {movie['series_title']}...")
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
        
        print("\n🔝 TOP 5 SIMILARES (Hybrid Reranked):")
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
    print("\n🧠 EXPLICAR RECOMENDAÇÕES")
    print("   1. Simular (escolher 1 filme e ver similares)")
    print("   2. Utilizador Real (analisar ratings do Supabase)")
    
    mode = input("\nEscolha (1/2): ").strip()
    
    if mode == '2':
        # REAL USER MODE
        user_id = input("\n📝 Digite o user_id: ").strip()
        if not user_id: return
        
        ratings = get_user_ratings(user_id)
        if not ratings: return
        
        print("\n⏳ Gerando recomendações explicadas...")
        all_recs = {}
        
        # Analisar Top Ratings
        sorted_ratings = sorted(ratings.items(), key=lambda x: x[1], reverse=True)
        
        print(f"\n📋 Analisando baseados nos seus filmes favoritos:\n")
        
        for movie_id, rating in sorted_ratings[:5]: # Top 5 recent/best
            # Find movie info
            matches = df[df['id'] == movie_id]
            if len(matches) == 0: continue
            movie = matches.iloc[0]
            
            print(f"   🎬 Porque gostaste de: {movie['series_title']} ({rating}⭐)")
            
            similares = find_top_k_similar_for_user(df, embeddings, movie_id, ratings, k=3)
            for rec_movie, score in similares:
                print(f"      -> Sugere: {rec_movie['series_title']} ({score*100:.1f}%)")
                
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
        print("🏆 TOP 10 RECOMENDAÇÕES FINAIS")
        print("="*60)
        for i, (m, score, srcs) in enumerate(final_list[:10], 1):
            src_text = ", ".join(srcs[:2])
            print(f"{i}. {m['series_title']} (Score: {score:.3f})")
            print(f"   Baseado em: {src_text}")
            
    else:
        # SIMULATION MODE
        print("\n   Simula as recomendações baseadas num ID de filme específico.")
        
        query = input("\n🎬 ID ou Nome do filme que o user 'gostou': ").strip()
        if not query: return
        
        movie = find_movie_by_title(df, query)
        # Also try ID
        if movie is None and query.isdigit():
            matches = df[df['id'] == int(query)]
            if len(matches) > 0: movie = matches.iloc[0]
                
        if movie is None:
            print("❌ Filme não encontrado.")
            return
            
        print(f"\n✅ Baseado em: {movie['series_title']}")
        
        idx = movie.name
        if idx >= len(embeddings):
            print("⚠️ Sem embedding.")
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
        
        print("\n📋 O algoritmo recomendaria:")
        for i, (m, score) in enumerate(sims[:5], 1):
            print(f"   {i}. {m['series_title']} (Sim: {score*100:.1f}%)")
            print(f"      Justificativa: Estilo visual e temas similares.")


# ==============================================================================
# MAIN MENU
# ==============================================================================
def main():
    while True:
        print("\n" + "="*60)
        print("🛠️  DEBUG SUITE (CinemaWebApp)")
        print("="*60)
        print("   1. [Validar] Suite Automática (Testes de Qualidade)")
        print("   2. [Manual]  Busca Interativa & Similaridade")
        print("   3. [Explain] Explicar Recomendações")
        print("   4. [Info]    Info do Cache")
        print("   0. Sair")
        
        choice = input("\nEscolha: ").strip()
        
        if choice == '0':
            print("👋 Bye!")
            break
            
        # Load data if needed
        if choice in ['1', '2', '3', '4']:
            df, embeddings = load_data(verbose=(choice=='4'))
            if df is None: continue
            
        if choice == '1':
            run_validation_suite(df, embeddings)
        elif choice == '2':
            run_manual_test(df, embeddings)
        elif choice == '3':
            run_explain_recs(df, embeddings)
        elif choice == '4':
            # Detailed Info (Merged from inspect_cache.py)
            print("\n" + "="*60)
            print("📋 ESTRUTURA DA CACHE")
            print("="*60)
            print(f"\nTotal de filmes: {len(df)}")
            print(f"Total de colunas: {len(df.columns)}")
            print(f"Shape Embeddings: {embeddings.shape}")
            
            print("\n📝 Colunas disponíveis:")
            cols = df.columns.tolist()
            # Print in rows of 3
            for i in range(0, len(cols), 3):
                print(f"  {', '.join(cols[i:i+3])}")
                
            print("\n🎬 Exemplo (Primeiro filme):")
            m = df.iloc[0]
            print(f"   ID: {m['id']}")
            print(f"   Título: {m['series_title']}")
            if 'embedding_input' in m:
                print(f"   Input Len: {len(m['embedding_input'])} chars")
                print(f"   Input Preview: {m['embedding_input'][:100]}...")
            
        else:
            print("❌ Opção inválida.")


if __name__ == "__main__":
    main()
