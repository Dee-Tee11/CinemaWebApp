import os
from dotenv import load_dotenv
from supabase import create_client
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

print("🔍 TESTE DE EMBEDDINGS\n")

# 1. Verificar se embeddings existem
print("1️⃣ Buscando alguns filmes...")
response = supabase.table('movies').select('id, series_title, embedding').limit(10).execute()

for movie in response.data:
    emb = movie.get('embedding')
    title = movie.get('series_title', 'Unknown')
    
    if emb is None:
        print(f"❌ {title}: SEM EMBEDDING!")
    elif len(emb) == 0:
        print(f"❌ {title}: EMBEDDING VAZIO!")
    else:
        # Verificar o tipo
        print(f"\n🔍 {title}:")
        print(f"   Tipo: {type(emb)}")
        print(f"   Tamanho: {len(emb)}")
        
        # Se for string, tentar converter
        if isinstance(emb, str):
            print(f"   ⚠️ EMBEDDING É STRING! (deveria ser lista)")
            print(f"   Primeiros 100 chars: {emb[:100]}")
            try:
                import json
                emb = json.loads(emb)
                print(f"   ✅ Convertido para lista com {len(emb)} elementos")
            except:
                print(f"   ❌ Falha ao converter string para lista")
                continue
        
        if isinstance(emb, list):
            emb_array = np.array(emb, dtype=float)
            print(f"   ✅ Array: {len(emb)} dims, média={emb_array.mean():.4f}, std={emb_array.std():.4f}")

# 2. Testar similaridade entre filmes conhecidos
print("\n2️⃣ Testando similaridade entre filmes...")

# Buscar filmes específicos
dark_knight = supabase.table('movies').select('embedding').ilike('series_title', '%Dark Knight%').limit(1).execute()
inception = supabase.table('movies').select('embedding').ilike('series_title', '%Inception%').limit(1).execute()
paw_patrol = supabase.table('movies').select('embedding').ilike('series_title', '%PAW Patrol%').limit(1).execute()

if dark_knight.data and inception.data and paw_patrol.data:
    emb_dk = np.array(dark_knight.data[0]['embedding']).reshape(1, -1)
    emb_inc = np.array(inception.data[0]['embedding']).reshape(1, -1)
    emb_paw = np.array(paw_patrol.data[0]['embedding']).reshape(1, -1)
    
    sim_dk_inc = cosine_similarity(emb_dk, emb_inc)[0][0]
    sim_dk_paw = cosine_similarity(emb_dk, emb_paw)[0][0]
    
    print(f"Similaridade Dark Knight ↔ Inception: {sim_dk_inc:.4f}")
    print(f"Similaridade Dark Knight ↔ PAW Patrol: {sim_dk_paw:.4f}")
    
    if sim_dk_paw > sim_dk_inc:
        print("🚨 PROBLEMA: PAW Patrol é mais similar ao Dark Knight que Inception!")
    else:
        print("✅ OK: Inception é mais similar ao Dark Knight")
else:
    print("⚠️ Não encontrei todos os filmes")

print("\n✅ Teste concluído!")
