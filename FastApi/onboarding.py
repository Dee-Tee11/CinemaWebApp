from fastapi import APIRouter
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import random

# Carregar variáveis de ambiente (já carregado no main.py, mas mantido por segurança)
load_dotenv(os.path.join("..", "AI", ".env"))  # Mesmo caminho relativo

# Configurar Supabase
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

router = APIRouter()

@router.get("/onboarding/start")
async def start_onboarding():
    # Buscar todos os filmes da tabela 'movies'
    response = supabase.table('movies').select('id, series_title, genre, poster_url, imdb_rating, overview').execute()
    movies = response.data
    
    # Escolher 5 filmes aleatórios
    selected_movies = random.sample(movies, min(5, len(movies))) if movies else []
    
    return {"movies": selected_movies}