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
from recommendation_system import SistemaRecomendacaoSimilaridade

app = FastAPI()

# CORS Middleware
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

supabase: Client = create_client(supabase_url, supabase_key)

# Carregar dados dos filmes do Supabase com paginação
print("📥 Buscando filmes do Supabase...")
all_movies = []
page_size = 1000
offset = 0
page_num = 1

while True:
    response = supabase.table("movies").select("*").range(offset, offset + page_size - 1).execute()
    
    if not response.data:
        break
    
    all_movies.extend(response.data)
    print(f"   📄 Página {page_num}: {len(response.data)} filmes carregados")
    
    if len(response.data) < page_size:
        break
    
    offset += page_size
    page_num += 1

df_movies = pd.DataFrame(all_movies)
print(f"✅ {len(df_movies)} filmes carregados do Supabase\n")

# Recommendation System Initialization
import numpy as np
import json
print("⚙️  Extraindo embeddings da supabase...")

try:
    embeddings_list = []
    for emb in df_movies['embedding']:
        if isinstance(emb, str):
            emb = json.loads(emb)
        embeddings_list.append(emb)
    
    print(f"✅ Convertidos {len(embeddings_list)} embeddings de string para lista")
except Exception as e:
    print(f"⚠️  Falha ao converter embeddings: {e}")
    embeddings_list = df_movies['embedding'].tolist()

movie_embeddings = np.array(embeddings_list, dtype=np.float32)
print(f"✅ Embeddings extraídos. Shape: {movie_embeddings.shape}")

rec_system = SistemaRecomendacaoSimilaridade(movie_embeddings, df_movies)

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
        recommendations = rec_system.gerar_recomendacoes(n=50)  # ✅ 50 em vez de 25
    except Exception as e:
        print(f"❌ Erro ao gerar recomendações: {e}")
        return

    if not recommendations:
        print("⚠️  Nenhuma recomendação foi gerada")
        return

    # 4. Preparar dados para inserir no Supabase
    recs_to_insert = []
    for i, rec in enumerate(recommendations[:25]):  # Salva top 25 no DB
        recs_to_insert.append({
            'user_id': user_id,
            'movie_id': rec['movie_id'],
            'predicted_score': rec['score'],
            'position': i + 1,
        })

    # 5. Deletar recomendações antigas do usuário
    try:
        supabase.table('user_recommendations')\
            .delete()\
            .eq('user_id', user_id)\
            .execute()
        print(f"🗑️  Recomendações antigas deletadas para usuário {user_id}")
    except Exception as e:
        print(f"⚠️  Erro ao deletar recomendações antigas: {e}")

    # 6. Inserir novas recomendações
    try:
        supabase.table('user_recommendations')\
            .insert(recs_to_insert)\
            .execute()
        print(f"✅ {len(recs_to_insert)} recomendações salvas com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao inserir recomendações: {e}")
        return

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

# --- NEW RAG ENDPOINTS ---

from pydantic import BaseModel
from rag_service import RagService

rag_service = RagService()

class ChatRequest(BaseModel):
    user_id: str
    message: str

class AiRecsRequest(BaseModel):
    user_id: str

def search_movie_by_id(movie_id):
    """Helper local para buscar filme no DF pelo ID"""
    try:
        # Debug: Print incoming ID type if needed (uncomment for verbose logs)
        # print(f"DEBUG: Searching for ID {movie_id} (Type: {type(movie_id)})")
        
        # Ensure target is int
        target_id = int(movie_id)
        
        match = df_movies[df_movies['id'] == target_id]
        if len(match) > 0:
            return match.iloc[0]
            
        print(f"⚠️ Movie ID {target_id} not found in dataframe!")
        return None
    except Exception as e:
        print(f"⚠️ Error searching movie ID {movie_id}: {e}")
        return None

@app.post("/api/chat")
def chat_with_history(request: ChatRequest):
    """
    Chatbot endpoint: Receives user_id + message.
    Fetches user history from Supabase, calls RAG Service, returns text.
    """
    try:
        print(f"💬 Chat Request received for User ID: {request.user_id}")
        
        # 1. Fetch User History
        response = supabase.table('user_movies').select('*').eq('user_id', request.user_id).execute()
        ratings = []
        if response.data:
            print(f"   Found {len(response.data)} raw ratings in Supabase.")
            for item in response.data:
                match = search_movie_by_id(item['movie_id'])
                if match is not None:
                    ratings.append({
                        'title': match['series_title'],
                        'rating': item['rating'],
                        'genre': match.get('genre', ''),
                        'year': match.get('released_year', '')
                    })
                else:
                    # Optional: Print if movie not found so we know
                    # print(f"   Movie ID {item['movie_id']} not found in local DF.")
                    pass
        else:
            print("   ⚠️ No ratings found in Supabase for this user.")
        
        print(f"   ✅ Processed {len(ratings)} valid movie ratings for context.")

        if not ratings:
            return {"response": "Olá! Ainda não vi nenhum filme no teu histórico. Avalia alguns filmes primeiro para eu poder ajudar! 🎬"}
            
        # 2. Call RAG Chat
        ai_reply = rag_service.chat_with_history(ratings, request.message)
        return {"response": ai_reply}
        
    except Exception as e:
        print(f"Chat Error: {e}")
        return {"response": "Desculpa, estou com dificuldades técnicas. Tenta novamente mais tarde. 🤖💥"}

@app.post("/api/recommendations/ai")
def get_ai_recommendations(request: AiRecsRequest):
    """
    Direct RAG Recommendations Endpoint
    """
    try:
        # 1. Fetch History
        response = supabase.table('user_movies').select('*').eq('user_id', request.user_id).execute()
        ratings = []
        if response.data:
            for item in response.data:
                match = search_movie_by_id(item['movie_id'])
                if match is not None:
                    ratings.append({
                        'title': match['series_title'],
                        'rating': item['rating'],
                        'genre': match.get('genre', ''),
                        'year': match.get('released_year', '')
                    })
        
        if not ratings:
            return {"recommendations": []}

        # 2. Generate Candidates (Vector Search)
        # Using the same logic as generate_and_save_recommendations but ad-hoc
        user_vector = np.zeros(movie_embeddings.shape[1])
        count = 0
        for r in ratings:
            match = df_movies[df_movies['series_title'] == r['title']]
            if len(match) > 0:
                idx = match.index[0]
                user_vector += movie_embeddings[idx]
                count += 1
        
        if count > 0:
            user_vector /= count
            
        sims = cosine_similarity([user_vector], movie_embeddings)[0]
        top_indices = np.argsort(sims)[::-1][:50]
        
        candidates = []
        seen_titles = set(r['title'] for r in ratings)
        
        for idx in top_indices:
            movie = df_movies.iloc[idx]
            if movie['series_title'] in seen_titles: continue
            
            candidates.append({
                'title': movie['series_title'],
                'year': movie.get('released_year', 'N/A'),
                'genre': movie.get('genre', ''),
                'overview': movie.get('overview', 'N/A'),
                'score': float(sims[idx]),
                'origin_country': movie.get('origin_country', '')
            })
            
        # 3. RAG Rerank
        final_recs = rag_service.rerank(ratings, candidates)
        
        return {"recommendations": final_recs}
        
    except Exception as e:
        print(f"AI Recs Error: {e}")
        return {"recommendations": []}

if __name__ == "__main__":
    print("\n" + "="*50)
    resposta = input("🧪 Deseja testar a geração de recomendações localmente? (s/n): ").strip().lower()
    
    if resposta == 's':
        user_id = input("📝 Digite o user_id para testar: ").strip()
        if user_id:
            print(f"\n🚀 Gerando recomendações para o usuário: {user_id}")
            generate_and_save_recommendations(user_id)
            print("\n✅ Teste concluído!")
        else:
            print("❌ User ID não pode ser vazio.")
    else:
        print("ℹ️  Para iniciar o servidor, execute: uvicorn main:app --reload")