# 🎬 Movie Night AI

**Intelligent Movie Discovery Powered by RAG & Vector Search**

Movie Night AI is a next-generation movie recommendation platform that goes beyond simple filtering. It understands your unique taste profile using **Vector Embeddings** and **Large Language Models (LLMs)** to provide hyper-personalized, explainable movie suggestions.

![Project Status](https://img.shields.io/badge/Status-Active_Development-brightgreen)
![Tech Stack](https://img.shields.io/badge/Stack-React_19_|_FastAPI_|_Supabase-blueviolet)

## ✨ Key Features

- **🧠 RAG-Powered Recommendations**: Uses Retrieval-Augmented Generation to combine your watch history with vast movie knowledge, offering suggestions with "human-like" reasoning.
- **📐 Vector Similarity Search**: Calculates a unique "Taste Vector" for every user based on their ratings, finding hidden gems semantically related to what they love using **Supabase pgvector**.
- **💬 AI Movie Assistant**: Chat implementation backed by **Llama 3.1 (via Groq)** that uses **Smart Context Injection** (your top-rated movies) to answer requests with deep knowledge of your specific taste profile.
- **🎨 Premium UX/UI**: A stunning, immersive interface built with **Glassmorphism** principles and smooth **GSAP** animations.
- **⚡ Modern Stack**: Frontend built with **React 19**, **TypeScript**, and **Vite**; Backend powered by **FastAPI** and **Python**.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom Design System
- **Animations**: GSAP (GreenSock), Framer Motion
- **Icons**: Lucide React

### Backend & AI
- **API Framework**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Vector Search**: pgvector
- **LLM / Inference**: Llama 3.1-8b-instant (via Groq API)
- **RAG Logic**: Custom implementation (`rag_service.py`)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.12+)
- A [Supabase](https://supabase.com/) project
- A [Groq](https://groq.com/) API Key

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/CinemaWebApp.git
cd CinemaWebApp
```

### 2️⃣ Backend Setup (FastAPI)
```bash
cd fastapi

# Create virtual environment
python -m venv venv
# Activate (Windows)
venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload
```
*The backend will run at `http://localhost:8000`*

### 3️⃣ Frontend Setup (React)
Open a new terminal:
```bash
cd webapp

# Install dependencies
npm install

# Run development server
npm run dev
```
*The frontend will run at `http://localhost:5173`*

## ⚙️ Configuration

Create a `.env` file in the `fastapi` directory:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
GROQ_API_KEY=your_groq_api_key
FRONTEND_URL=http://localhost:5173
```

Create a `.env` file in the `webapp` directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8000
```

## 🧠 How It Works

1.  **Embeddings**: Every movie in the database has a vector embedding representing its plot, genre, and tone.
2.  **User Vector**: As you rate movies, the system calculates a weighted average vector of your preferences.
3.  **Retrieval**: When you ask for recommendations, we query Supabase using semantic similarity (Cosine Distance) to find the closest movie matches to your user vector.
4.  **Reranking (RAG)**: The top candidates are sent to the LLM along with your detailed history. The AI analyzes *why* those movies match and re-ranks them, filtering out irrelevant results and adding personalized explanations.

## 🧠 How It Works (Simplified)

### 📐 The Recommendation Engine
The system uses a smart **Multi-Vector "Consensus" Strategy** to find your next favorite movie:

1.  **Step 1: Finding Candidates (Item-Based Voting)**
    *   Instead of averaging all your tastes into one blurry "profile", the system looks at **each movie you liked individually**.
    *   If you liked *The Matrix*, it finds similar Sci-Fi movies. If you *also* liked *The Notebook*, it finds similar Romances.
    *   **The Voting System**: Movies that are similar to *multiple* things you've watched get a higher score. This preserves your diverse tastes (e.g., liking both Horror and Comedy) without mixing them up.

2.  **Step 2: AI Curator (The Expert Review)**
    *   The top candidates (the ones with the most "votes" from your history) are sent to **Llama 3.1**.
    *   The AI reviews the list acting as a personalized critic, filtering out generic suggestions and explaining *why* a movie fits your specific taste patterns.

### ⚡ Why It’s Better
*   **Respects Niche Tastes**: Unlike simple averages that wash out distinct preferences, this approach keeps your Action movies separate from your Dramas, ensuring you get great recommendations for *both* moods.
*   **Precision**: By boosting movies that appear effectively across multiple of your favorites, we find strong "consensus" matches that strictly semantic search might miss.
    
### 🧠 AI Architecture: RAG vs. Smart Context

The system employs two distinct AI strategies optimized for different goals:

1.  **For Recommendations (Retrieve & Rerank RAG)**: 
    *   **Goal**: Discovery.
    *   **Mechanism**: We first retrieve ~50 semantically similar candidates using Vector Search. Then, the LLM acts as a "Reranker", analyzing your full history to strictly order these candidates, explaining *why* they fit your taste. This is a classic RAG pattern specialized for ranking.

2.  **For Chat (Smart Context Injection)**:
    *   **Goal**: Identity & Conversation.
    *   **Mechanism**: Instead of searching for random facts, we inject your **"Cinematic QA Identity"** (your Top 50 highest-rated movies) directly into the LLM's working memory. This ensures the AI understands your *core taste* deeply and ignores noise, allowing for highly personalized conversations like "Based on my love for dark thrillers like Se7en, what should I watch?".
