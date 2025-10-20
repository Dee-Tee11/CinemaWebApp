from fastapi import FastAPI
from onboarding import router as onboarding_router  # Ajustado para a mesma pasta
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Carregar o .env da pasta AI
load_dotenv(os.path.join("..", "AI", ".env"))  # Caminho relativo para a pasta AI

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Permite o frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclui o roteador do onboarding com prefixo /api
app.include_router(onboarding_router, prefix="/api")

@app.get("/")
def home():
    return {"mensagem": "FastAPI global está a funcionar!"}