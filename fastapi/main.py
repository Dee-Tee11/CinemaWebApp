import os
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv
import pandas as pd

# Carregar variáveis de ambiente PRIMEIRO
load_dotenv()

# Adicionar caminho para importar o sistema de recomendação
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from recommendation_system import SistemaRecomendacaoKNN

app = FastAPI()

# CORS Middleware
# Ler origens do environment variable, separado por vírgulas
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = [url.strip() for url in frontend_url.split(",")]

print(f"✅ Configurando CORS para as origens: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase Initialization
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError(
        "❌ Variáveis de ambiente não configuradas!\n"
        "Adicione ao arquivo FastApi/.env:\n"
        "SUPABASE_URL=...\n"
        "SUPABASE_SERVICE_KEY=..."
    )

print(f"✅ Conectando ao Supabase: {supabase_url[:40]}...")
supabase: Client = create_client(supabase_url, supabase_key)

# Carregar dados dos filmes do Supabase
print("📥 Buscando filmes do Supabase...")
try:
    response = supabase.table("movies").select("*").execute()
    df_movies = pd.DataFrame(response.data)
    print(f"✅ {len(df_movies)} filmes carregados do Supabase\n")
except Exception as e:
    print(f"⚠️  Erro ao carregar filmes do Supabase: {e}")
    print("   Tentando carregar do CSV local...\n")
    # Fallback para CSV local se Supabase falhar
    dataset_path = os.path.join(os.path.dirname(__file__), '..', 'AI', 'movies_clean_with_posters.csv')
    df_movies = pd.read_csv(dataset_path)
    print(f"✅ {len(df_movies)} filmes carregados do CSV\n")

# Recommendation System Initialization
import numpy as np
import json
print("⚙️  Extraindo embeddings do DataFrame...")

try:
    # Os embeddings podem vir como strings do Supabase
    embeddings_list = []
    for emb in df_movies['embedding']:
        if isinstance(emb, str):
            # Converter string para lista
            emb = json.loads(emb)
        embeddings_list.append(emb)
    
    print(f"✅ Convertidos {len(embeddings_list)} embeddings de string para lista")
except Exception as e:
    print(f"⚠️  Falha ao converter embeddings: {e}")
    embeddings_list = df_movies['embedding'].tolist()

movie_embeddings = np.array(embeddings_list, dtype=np.float32)
print(f"✅ Embeddings extraídos. Shape: {movie_embeddings.shape}")

rec_system = SistemaRecomendacaoKNN(movie_embeddings, df_movies)

#usa só gerar_recomendacoes falta integrar o resto dos métodos
def generate_and_save_recommendations(user_id: str):
    """
    Gera e salva recomendações para um usuário específico
    """
    # 1. Buscar filmes avaliados pelo usuário no Supabase
    try:
        response = supabase.table('user_movies')\
            .select('movie_id, rating')\
            .eq('user_id', user_id)\
            .execute()
    except Exception as e:
        print(f"❌ Erro ao buscar avaliações do usuário: {e}")
        return
    
    if not response.data:
        print(f"⚠️  Nenhum filme avaliado encontrado para o usuário {user_id}")
        return

    user_movies = response.data
    print(f"📊 Encontradas {len(user_movies)} avaliações do usuário")
    
    # 2. Preparar dados para o sistema de recomendação
    avaliacoes_por_movie_id = {}
    filmes_vistos_ids = []
    
    for movie in user_movies:
        movie_id = int(movie['movie_id'])
        rating = float(movie['rating'])
        avaliacoes_por_movie_id[movie_id] = rating
        filmes_vistos_ids.append(movie_id)
    
    # Verificar número mínimo de avaliações
    if len(avaliacoes_por_movie_id) < 5:
        print(f"⚠️  Usuário tem apenas {len(avaliacoes_por_movie_id)} avaliações.")
        print(f"   Mínimo necessário: 5 avaliações")
        return

    # 3. Configurar dados do usuário e gerar recomendações
    try:
        rec_system.set_user_data(avaliacoes_por_movie_id, filmes_vistos_ids)
        recommendations = rec_system.gerar_recomendacoes()
    except Exception as e:
        print(f"❌ Erro ao gerar recomendações: {e}")
        return

    if not recommendations:
        print("⚠️  Nenhuma recomendação foi gerada")
        return

    # 4. Preparar dados para inserir no Supabase
    recs_to_insert = []
    for i, rec in enumerate(recommendations):
        recs_to_insert.append({
            'user_id': user_id,
            'movie_id': rec['movie_id'],
            'predicted_score': rec['score'],
            'position': i + 1,
        })

    # 5. Usar upsert para inserir ou atualizar recomendações
    try:
        # Usar upsert que insere ou atualiza automaticamente
        supabase.table('user_recommendations')\
            .upsert(recs_to_insert, on_conflict='user_id,movie_id')\
            .execute()
        
        print(f"✅ {len(recs_to_insert)} recomendações salvas no Supabase!")
        print(f"   Top 3 recomendações:")
        for i, rec in enumerate(recommendations[:3], 1):
            print(f"   {i}. {rec['titulo']} (score: {rec['score']:.2f})")
        
    except Exception as e:
        print(f"❌ Erro ao salvar recomendações no Supabase: {e}")
    
    print(f"{'='*60}\n")


@app.post("/generate-recommendations/{user_id}")
def trigger_recommendation_generation(user_id: str, background_tasks: BackgroundTasks):
    """
    Endpoint para gerar recomendações em background
    """
    background_tasks.add_task(generate_and_save_recommendations, user_id)
    return {
        "message": f"Geração de recomendações iniciada para o usuário {user_id}",
        "status": "processing"
    }
