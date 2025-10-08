import numpy as np
from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Carregar embeddings do ficheiro .npy
embeddings = np.load('movie_embeddings.npy')

print(f"Embeddings carregados: {embeddings.shape}")
print(f"Número de filmes: {embeddings.shape[0]}")
print(f"Dimensão dos embeddings: {embeddings.shape[1]}")

# Conectar ao Supabase
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')

print(f"Conectando ao Supabase: {url}")

supabase: Client = create_client(url, key)

# Buscar todos os filmes ordenados por ID
print("A buscar filmes da base de dados...")
try:
    response = supabase.table('movies').select('id').order('id').execute()
    movies = response.data
    print(f"✅ Filmes na base de dados: {len(movies)}")
except Exception as e:
    print(f"❌ Erro ao buscar filmes: {e}")
    exit(1)

if embeddings.shape[0] != len(movies):
    print(f"⚠️ AVISO: Número de embeddings ({embeddings.shape[0]}) diferente do número de filmes ({len(movies)})")
    print("Vou processar apenas os que coincidirem...")

# Atualizar embeddings (um de cada vez para evitar timeouts)
print("\nA atualizar embeddings na base de dados...")
success_count = 0
error_count = 0

total = min(len(movies), len(embeddings))

for i in range(total):
    movie_id = movies[i]['id']
    embedding_list = embeddings[i].tolist()
    
    try:
        supabase.table('movies').update({
            'embedding': embedding_list
        }).eq('id', movie_id).execute()
        success_count += 1
        
        # Progress bar
        if (i + 1) % 50 == 0 or i == total - 1:
            print(f"Progresso: {i + 1}/{total} ({(i+1)/total*100:.1f}%)")
            
    except Exception as e:
        print(f"❌ Erro no filme {movie_id}: {str(e)}")
        error_count += 1

print(f"\n✅ Concluído!")
print(f"Sucessos: {success_count}")
print(f"Erros: {error_count}")

# Verificar quantos foram atualizados
try:
    response = supabase.table('movies').select('id', count='exact').not_.is_('embedding', 'null').execute()
    print(f"Filmes com embeddings: {response.count}")
except:
    print("Não foi possível verificar o total final")