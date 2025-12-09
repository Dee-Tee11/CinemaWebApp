import pickle
import os

# Carregar cache
cache_path = os.path.join("..", "cache", "movies.pkl")
with open(cache_path, 'rb') as f:
    df = pickle.load(f)

print("=" * 60)
print("📋 ESTRUTURA DA CACHE")
print("=" * 60)
print(f"\nTotal de filmes: {len(df)}")
print(f"Total de colunas: {len(df.columns)}")

print("\n📝 Colunas disponíveis:")
for col in df.columns:
    print(f"  - {col}")

print("\n🎬 Exemplo de dados (primeiros 3 filmes):")
print(df[['id', 'series_title']].head(3).to_string())

print("\n" + "=" * 60)
