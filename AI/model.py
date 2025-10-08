import pandas as pd
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-mpnet-base-v2')

bd = pd.read_csv('imdb_top_1000.csv')

# Removemos duplicados
bd = bd.drop_duplicates(subset=['Series_Title'], keep='first')
bd = bd.drop_duplicates(subset=['Overview'], keep='first')

# Remover colunas
bd.drop(['Certificate', 'Poster_Link', 'Released_Year', 'Gross'], axis='columns', inplace=True)

# Versão correta - remove linhas onde Overview tem menos de 50 caracteres
bd = bd[bd['Overview'].str.len() >= 50]

# Resetar índices (importante após filtrar linhas!)
bd = bd.reset_index(drop=True)

# Criar texto para embedding
def criar_texto_embedding(row):
    partes = []
    
    # Overview é o mais importante
    if pd.notna(row['Overview']):
        partes.append(row['Overview'])
    
    # Adicionar contexto
    if pd.notna(row['Series_Title']):
        partes.append(f"Title: {row['Series_Title']}")
    
    if pd.notna(row['Genre']):
        partes.append(f"Genres: {row['Genre']}")
    
    if pd.notna(row['Director']):
        partes.append(f"Director: {row['Director']}")
    
    # Atores (opcional, mas adiciona contexto)
    stars = []
    for i in range(1, 5):
        star = row.get(f'Star{i}')
        if pd.notna(star):
            stars.append(star)
    if stars:
        partes.append(f"Starring: {', '.join(stars)}")
    
    return '. '.join(partes)

# Aplicar função
bd['embedding_input'] = bd.apply(criar_texto_embedding, axis=1)

# Ver exemplo
print("📋 Exemplo de texto para embedding:")
print(bd['embedding_input'].iloc[0][:300] + "...\n")

# Verificar estatísticas
print(f"✅ Total de filmes após limpeza: {len(bd)}")
print(f"✅ Comprimento médio do texto: {bd['embedding_input'].str.len().mean():.0f} caracteres")
print(f"✅ Valores nulos no texto: {bd['embedding_input'].isnull().sum()}\n")

# Gerar embeddings
print("⚙️  Gerando embeddings (pode demorar 2-3 minutos)...")
embeddings = model.encode(
    bd['embedding_input'].tolist(),
    show_progress_bar=True,
    batch_size=16,  # Ajusta conforme tua RAM
    convert_to_numpy=True,
    normalize_embeddings=True  # Normaliza vetores (melhora cosine similarity)
)

# Verificar resultado
print(f"\n✅ Embeddings gerados com sucesso!")
print(f"   Shape: {embeddings.shape}")
print(f"   Tipo: {type(embeddings)}")
print(f"   Tamanho: {embeddings.nbytes / 1024 / 1024:.2f} MB")

# Guardar embeddings e dataset
np.save('movie_embeddings.npy', embeddings)
bd.to_csv('movies_clean.csv', index=False)

print(f"\n💾 Ficheiros guardados:")
print(f"   - movie_embeddings.npy")
print(f"   - movies_clean.csv")

# Teste rápido de similaridade
from sklearn.metrics.pairwise import cosine_similarity

print(f"\n🧪 Teste de similaridade:")
filme1 = bd.iloc[0]['Series_Title']
filme2 = bd.iloc[1]['Series_Title']
sim = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
print(f"   {filme1} vs {filme2}")
print(f"   Similaridade: {sim:.3f}")

print("\n🎉 Processo concluído! Pronto para sistema de recomendação!")