import os
import json
import numpy as np
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente PRIMEIRO
load_dotenv()

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

print("✅ Supabase connected. Using pgvector for similarity search.")

# Helper function to calculate user vector from ratings
def calculate_user_vector(user_id: str):
    """
    Calcula vetor médio ponderado baseado nos ratings do usuário.
    Retorna None se o usuário não tiver avaliações suficientes.
    """
    try:
        # Buscar ratings do usuário
        response = supabase.table('user_movies')\
            .select('movie_id, rating')\
            .eq('user_id', user_id)\
            .execute()
        
        if not response.data or len(response.data) < 5:
            print(f"⚠️  Usuário {user_id} tem apenas {len(response.data) if response.data else 0} avaliações (mínimo: 5)")
            return None
        
        # Buscar embeddings dos filmes avaliados
        movie_ids = [m['movie_id'] for m in response.data]
        movies_response = supabase.table('movies')\
            .select('id, embedding')\
            .in_('id', movie_ids)\
            .execute()
        
        if not movies_response.data:
            print(f"⚠️  Nenhum embedding encontrado para os filmes do usuário {user_id}")
            return None
        
        # Calcular média ponderada por rating
        user_vector = np.zeros(1024)
        total_weight = 0
        
        for movie_data in response.data:
            movie = next((m for m in movies_response.data if m['id'] == movie_data['movie_id']), None)
            if movie and movie.get('embedding'):
                weight = movie_data['rating']
                embedding = json.loads(movie['embedding']) if isinstance(movie['embedding'], str) else movie['embedding']
                user_vector += np.array(embedding) * weight
                total_weight += weight
        
        if total_weight > 0:
            user_vector = user_vector / total_weight
            return user_vector.tolist()
        
        return None
        
    except Exception as e:
        print(f"❌ Erro ao calcular vetor do usuário: {e}")
        return None

def generate_and_save_recommendations(user_id: str):
    """
    Gera e salva recomendações para um usuário usando pgvector do Supabase
    """
    print(f"🚀 Gerando recomendações para usuário {user_id}...")
    
    # 1. Calcular vetor do usuário
    user_vector = calculate_user_vector(user_id)
    if user_vector is None:
        print(f"⚠️  Usuário {user_id} não tem avaliações suficientes (mínimo: 5)")
        return
    
    # 2. Buscar filmes já vistos para excluir
    try:
        seen_response = supabase.table('user_movies')\
            .select('movie_id')\
            .eq('user_id', user_id)\
            .execute()
        seen_ids = [m['movie_id'] for m in seen_response.data] if seen_response.data else []
    except Exception as e:
        print(f"⚠️  Erro ao buscar filmes vistos: {e}")
        seen_ids = []
    
    # 3. Usar função SQL de similarity search via pgvector
    try:
        result = supabase.rpc('match_movies', {
            'query_embedding': user_vector,
            'match_threshold': 0.5,
            'match_count': 50,
            'excluded_ids': seen_ids
        }).execute()
        
        if not result.data:
            print("⚠️  Nenhuma recomendação gerada pelo pgvector")
            return
        
        print(f"📊 pgvector retornou {len(result.data)} candidatos")
        
    except Exception as e:
        print(f"❌ Erro ao chamar match_movies: {e}")
        return
    
    # 4. Preparar dados para inserir no Supabase
    recs_to_insert = []
    for i, rec in enumerate(result.data[:25]):  # Salva top 25 no DB
        recs_to_insert.append({
            'user_id': user_id,
            'movie_id': rec['id'],
            'predicted_score': rec['similarity'],
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

@app.get("/health")
def health_check():
    """
    Health check endpoint for monitoring
    """
    return {
        "status": "ok",
        "message": "FastAPI is running with pgvector"
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


@app.post("/api/chat")
def chat_with_history(request: ChatRequest):
    """
    Chatbot endpoint: Receives user_id + message.
    Fetches user history from Supabase, calls RAG Service, returns text.
    """
    try:
        print(f"💬 Chat Request received for User ID: {request.user_id}")
        
        # 1. Fetch User History
        user_movies = supabase.table('user_movies').select('*').eq('user_id', request.user_id).execute()
        ratings = []
        
        if user_movies.data:
            print(f"   Found {len(user_movies.data)} raw ratings in Supabase.")
            
            # Buscar detalhes dos filmes
            movie_ids = [item['movie_id'] for item in user_movies.data]
            movies = supabase.table('movies')\
                .select('id, series_title, genre, released_year')\
                .in_('id', movie_ids)\
                .execute()
            
            # Criar mapa de filmes
            movie_map = {m['id']: m for m in movies.data} if movies.data else {}
            
            for item in user_movies.data:
                movie = movie_map.get(item['movie_id'])
                if movie:
                    ratings.append({
                        'title': movie['series_title'],
                        'rating': item['rating'],
                        'genre': movie.get('genre', ''),
                        'year': movie.get('released_year', '')
                    })
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
        import traceback
        traceback.print_exc()
        return {"response": "Desculpa, estou com dificuldades técnicas. Tenta novamente mais tarde. 🤖💥"}


@app.post("/api/recommendations/ai")
def get_ai_recommendations(request: AiRecsRequest):
    """
    Direct RAG Recommendations Endpoint usando pgvector
    """
    try:
        print(f"🤖 AI Recommendations request for user {request.user_id}")
        
        # 1. Calcular vetor do usuário
        user_vector = calculate_user_vector(request.user_id)
        if user_vector is None:
            print("⚠️  Usuário sem avaliações suficientes")
            return {"recommendations": []}
        
        # 2. Buscar filmes vistos para excluir
        seen_response = supabase.table('user_movies')\
            .select('movie_id')\
            .eq('user_id', request.user_id)\
            .execute()
        seen_ids = [m['movie_id'] for m in seen_response.data] if seen_response.data else []
        
        # 3. Buscar candidates via pgvector
        result = supabase.rpc('match_movies', {
            'query_embedding': user_vector,
            'match_threshold': 0.5,
            'match_count': 50,
            'excluded_ids': seen_ids
        }).execute()
        
        if not result.data:
            print("⚠️  Nenhum candidato retornado pelo pgvector")
            return {"recommendations": []}
        
        print(f"📊 {len(result.data)} candidatos encontrados")
        
        # 4. Buscar detalhes completos dos filmes
        movie_ids = [r['id'] for r in result.data]
        movies_response = supabase.table('movies')\
            .select('id, series_title, released_year, genre, overview, origin_country')\
            .in_('id', movie_ids)\
            .execute()
        
        if not movies_response.data:
            return {"recommendations": []}
        
        # 5. Combinar scores de similaridade com detalhes dos filmes
        score_map = {r['id']: r['similarity'] for r in result.data}
        candidates = []
        
        for movie in movies_response.data:
            candidates.append({
                'title': movie['series_title'],
                'year': movie.get('released_year', 'N/A'),
                'genre': movie.get('genre', ''),
                'overview': movie.get('overview', 'N/A'),
                'score': score_map.get(movie['id'], 0),
                'origin_country': movie.get('origin_country', '')
            })
        
        # 6. Buscar histórico do usuário para contexto do RAG
        ratings = []
        user_data = supabase.table('user_movies').select('*').eq('user_id', request.user_id).execute()
        
        if user_data.data:
            for item in user_data.data[:50]:  # Limitar a 50 para economizar tokens
                movie_match = supabase.table('movies')\
                    .select('series_title, genre, released_year')\
                    .eq('id', item['movie_id'])\
                    .single()\
                    .execute()
                    
                if movie_match.data:
                    ratings.append({
                        'title': movie_match.data['series_title'],
                        'rating': item['rating'],
                        'genre': movie_match.data.get('genre', ''),
                        'year': movie_match.data.get('released_year', '')
                    })
        
        # 7. RAG Rerank
        print("🧠 Aplicando RAG reranking...")
        final_recs = rag_service.rerank(ratings, candidates)
        
        return {"recommendations": final_recs}
        
    except Exception as e:
        print(f"❌ AI Recs Error: {e}")
        import traceback
        traceback.print_exc()
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