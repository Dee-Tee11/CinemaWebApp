"""
Script para comparar embedding inputs de filmes específicos
"""
import os
import pickle

# Caminhos do cache (relativo à pasta debug)
CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "cache")

df = pickle.load(open(os.path.join(CACHE_DIR, 'movies.pkl'), 'rb'))

# Encontrar filmes
mha = df[df['series_title'].str.contains('Heroes Rising', case=False, na=False)]
db = df[df['series_title'].str.contains('Fusion Reborn', case=False, na=False)]

print("=" * 80)
print("MY HERO ACADEMIA: HEROES RISING")
print("=" * 80)
if len(mha) > 0:
    print(mha.iloc[0]['embedding_input'])
else:
    print("Not found")

print()
print("=" * 80)
print("DRAGON BALL Z: FUSION REBORN")
print("=" * 80)
if len(db) > 0:
    print(db.iloc[0]['embedding_input'])
else:
    print("Not found")
