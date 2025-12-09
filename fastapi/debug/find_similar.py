"""
Script para encontrar os top 5 filmes mais similares a um filme específico.
Usa cache local para carregar os dados rapidamente.

Uso:
    python find_similar.py
    (vai pedir o ID ou nome do filme)
"""
import os
import pickle
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# Caminhos do cache (relativo à pasta debug)
CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "cache")

# Carregar cache
print("📥 Carregando dados do cache...")
df = pickle.load(open(os.path.join(CACHE_DIR, 'movies.pkl'), 'rb'))
embeddings = np.load(os.path.join(CACHE_DIR, 'embeddings.npy'))
print(f"✅ {len(df)} filmes carregados\n")

# Criar mapeamento
movie_id_to_idx = {int(row['id']): idx for idx, row in df.iterrows()}

def find_movie(query):
    """Encontra um filme por ID ou nome"""
    # Tentar como ID primeiro
    try:
        movie_id = int(query)
        if movie_id in movie_id_to_idx:
            idx = movie_id_to_idx[movie_id]
            return idx, df.iloc[idx]
    except ValueError:
        pass
    
    # Procurar por nome
    matches = df[df['series_title'].str.contains(query, case=False, na=False)]
    if len(matches) == 0:
        return None, None
    
    if len(matches) > 1:
        print(f"\n🔍 Encontrados {len(matches)} filmes:")
        for i, (_, row) in enumerate(matches.head(10).iterrows()):
            print(f"   {i+1}. [{row['id']}] {row['series_title']}")
        choice = input("\nEscolha o número (1-10): ").strip()
        try:
            idx = matches.index[int(choice) - 1]
            return idx, df.iloc[idx]
        except:
            return None, None
    
    idx = matches.index[0]
    return idx, df.iloc[idx]

def get_top_similar(idx, top_k=5):
    """Retorna os top K filmes mais similares"""
    emb = embeddings[idx]
    
    # Calcular similaridade com todos
    all_sims = cosine_similarity([emb], embeddings)[0]
    
    # Ordenar (excluindo o próprio filme)
    sorted_indices = np.argsort(all_sims)[::-1]
    
    results = []
    for i in sorted_indices:
        if i == idx:  # Pular o próprio filme
            continue
        if len(results) >= top_k:
            break
        
        movie = df.iloc[i]
        results.append({
            'id': int(movie['id']),
            'titulo': movie['series_title'],
            'genero': movie.get('genre', 'Unknown'),
            'similaridade': float(all_sims[i])
        })
    
    return results

def main():
    print("=" * 70)
    print("🎬 ENCONTRAR FILMES SIMILARES")
    print("=" * 70)
    
    while True:
        print()
        query = input("📝 Digite o ID ou nome do filme (ou 'sair'): ").strip()
        
        if query.lower() == 'sair':
            print("\n👋 Até logo!")
            break
        
        if not query:
            continue
        
        idx, movie = find_movie(query)
        
        if movie is None:
            print("❌ Filme não encontrado!")
            continue
        
        print()
        print("─" * 70)
        print(f"🎬 {movie['series_title']}")
        print(f"   ID: {movie['id']}")
        print(f"   Géneros: {movie.get('genre', 'Unknown')}")
        print("─" * 70)
        print()
        print("🔝 Top 5 filmes mais similares:")
        print()
        
        similares = get_top_similar(idx, top_k=5)
        
        for i, sim in enumerate(similares, 1):
            pct = sim['similaridade'] * 100
            bar = "█" * int(pct / 5)
            print(f"  {i}. [{sim['id']}] {sim['titulo']}")
            print(f"     Similaridade: {pct:.1f}% {bar}")
            print(f"     Géneros: {sim['genero']}")
            print()

if __name__ == "__main__":
    main()
