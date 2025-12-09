import pickle
import pandas as pd

# Carregar cache
with open('../cache/movies.pkl', 'rb') as f:
    df = pickle.load(f)

print("Colunas:", df.columns.tolist())
print("\nPrimeiro filme:")
primeiro = df.iloc[0]
print(f"ID: {primeiro['id']}")
print(f"Título: {primeiro.get('series_title', 'NAO TEM')}")
print(f"Título alternativo: {primeiro.get('title', 'NAO TEM')}")

# Ver todos os campos do primeiro filme
print("\nTodos os campos:")
for col in df.columns:
    print(f"  {col}: {primeiro[col]}")
