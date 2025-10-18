from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def home():
    return {"mensagem": "FastAPI global está a funcionar!"}
