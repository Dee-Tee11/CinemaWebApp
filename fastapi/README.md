# 🎬 Sistema de Recomendação de Filmes + RAG Chatbot (v3.0)

Sistema de recomendação híbrido que combina **Similaridade Semântica** com **Retrieval-Augmented Generation (RAG)** para fornecer sugestões altamente personalizadas e um assistente conversacional inteligente.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Estratégia RAG (Direct History)](#estratégia-rag-direct-history)
- [Arquitetura](#arquitetura)
- [API Endpoints](#api-endpoints)
- [Instalação e Uso](#instalação-e-uso)

---

## 🎯 Visão Geral

O sistema evoluiu para uma abordagem **Direct RAG**, onde modelos de linguagem (LLMs) analisam diretamente o histórico de visualização do usuário para "entender" o gosto cinematográfico, em vez de depender apenas de cálculos matemáticos.

### Características Principais

✅ **RAG Chatbot**: Converse com seus dados! Pergunte "Por que eu gosto de filmes tristes?" e o AI responde com base no seu histórico.  
✅ **Direct RAG**: Recomendações curadas por LLM que entendem nuances (ex: "Anime sombrio" vs "Anime escolar").  
✅ **Semântico + LLM**: Combina a rapidez da busca vetorial com a inteligência do Llama 3.  
✅ **Explicações Reais**: O sistema explica *por que* recomendou cada filme.  

---

## 🧠 Estratégia RAG (Direct History)

Em vez de criar "Personas" artificiais, o sistema usa uma abordagem **Direct History**:

1.  **Recuperação (Retrieval)**:
    *   O sistema busca os 50 filmes mais avaliados pelo usuário.
    *   Busca 50 candidatos similares via Embeddings Vetoriais.

2.  **Geração (Generation)**:
    *   O LLM recebe o histórico bruto + candidatos.
    *   **Prompt**: "O usuário gostou destes X filmes. Re-ordene estes candidatos para encontrar as melhores conexões temáticas."
    *   O LLM identifica padrões sutis (ex: "Gosta de finais ambíguos", "Fã de terror psicológico") que a matemática pura ignora.

### Por que Direct RAG?
Testes mostraram que alimentar o LLM com os dados brutos ("User viu Filme A, B, C") gera resultados **muito superiores** a resumir o usuário em uma persona genérica.

---

## 🔧 Como Funciona (Fluxo Híbrido)

### 1. Vector Search (Camada Base)
Calcula a similaridade de cosseno entre o vetor médio do usuário e todos os filmes do banco. Filtra os top 50 candidatos matematicamente mais próximos.

### 2. LLM Reranking (Camada RAG)
O LLM (via Groq API) recebe a lista de 50 candidatos e reordena o Top 10, aplicando critérios subjetivos e explicando a conexão.

### 3. Chatbot (Camada Interativa)
O usuário pode interagir via chat. O AI tem acesso de leitura ao histórico completo e pode responder perguntas complexas, sugerir filmes fora da caixa ou debater gostos.

---

## 🌐 API Endpoints

### `POST /api/chat`
Endpoint do Chatbot Assistente.

**Body**:
```json
{
  "user_id": "user_123",
  "message": "Recomenda-me um filme parecido com o meu Top 1."
}
```

**Resposta**:
```json
{
  "response": "Baseado no teu amor por 'The Prestige', sugiro que vejas 'The Illusionist'. Ambos exploram..."
}
```

### `POST /api/recommendations/ai`
Gera recomendações via Direct RAG (retorna JSON direto, sem salvar no banco por enquanto).

**Body**:
```json
{
  "user_id": "user_123"
}
```

### `POST /generate-recommendations/{user_id}`
(Legado/Híbrido) Gera e salva recomendações no banco usando o algoritmo semântico padrão + inserção no Supabase.

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                      FastAPI Server                      │
│                        (main.py)                         │
└────────────┬────────────────────────────┬────────────────┘
             │                            │
             ▼                            ▼
    ┌────────────────┐          ┌────────────────────┐
    │    Supabase    │          │    RAG Service     │
    │ (PostgreSQL)   │          │  (rag_service.py)  │
    │                │          │    [Groq API]      │
    └────────────────┘          └────────────────────┘
```

---

## 🚀 Instalação e Uso

### Pré-requisitos
```bash
pip install fastapi uvicorn pandas numpy scikit-learn supabase python-dotenv requests
```

### Variáveis de Ambiente (.env)
```env
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
GROQ_API_KEY=gsk_...  # Necessário para funcionalidades RAG
```

### Iniciar Servidor
```bash
cd fastapi
uvicorn main:app --reload
```

---

## 📝 Histórico de Versões

- **v3.0 (Atual)**: Introdução do **RAG Chatbot** e **Direct RAG**. Remoção do sistema de Personas.
- **v2.0**: Sistema de similaridade vetorial aprimorado.
- **v1.0**: Protótipo inicial KNN.

---

**Desenvolvido com ❤️ para CinemaWebApp**
