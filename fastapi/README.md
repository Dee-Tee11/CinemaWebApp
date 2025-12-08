# 🎬 Sistema de Recomendação de Filmes

Sistema de recomendação baseado em similaridade de embeddings semânticos, que gera sugestões personalizadas de filmes baseadas no histórico de avaliações do usuário.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Como Funciona](#como-funciona)
- [Arquitetura](#arquitetura)
- [Algoritmo Detalhado](#algoritmo-detalhado)
- [Configurações](#configurações)
- [API Endpoints](#api-endpoints)
- [Instalação e Uso](#instalação-e-uso)

---

## 🎯 Visão Geral

O sistema utiliza **content-based filtering** combinado com **embeddings semânticos** para recomendar filmes. Cada filme é representado por um vetor numérico (embedding) que captura suas características semânticas: género, diretor, idioma original, keywords e outros metadados.

### Características Principais

✅ **Personalizado**: Recomendações baseadas diretamente nas avaliações do usuário  
✅ **Semântico**: Captura nuances como tom, temas e estilo cinematográfico  
✅ **Diversificado**: Agrega múltiplos filmes avaliados para cobrir diferentes gostos  
✅ **Escalável**: Funciona eficientemente com milhares de filmes  

---

## 🔧 Como Funciona

### Entrada de Dados

Para gerar recomendações, o sistema precisa de:

1. **Avaliações do usuário**: Pares `(movie_id, rating)` dos filmes já avaliados
2. **Filmes vistos**: Lista de IDs de todos os filmes assistidos (para evitar repetições)
3. **Embeddings**: Vetores pré-calculados representando cada filme

### Processo em 4 Etapas

```
1. Para cada filme avaliado pelo usuário
   └─→ Calcular similaridade com TODOS os filmes não-vistos
   └─→ Selecionar TOP K mais similares (K=3 por padrão)

2. Agregar candidatos
   └─→ Filmes podem aparecer como similares a múltiplos filmes avaliados
   └─→ Rastrear: média, máxima e contagem de similaridades

3. Calcular score final
   └─→ Fórmula ponderada: (avg × 0.5 + max × 0.3) × (1 + count × 0.1)

4. Retornar TOP N recomendações
   └─→ Ordenadas por score (N=25 por padrão)
```

---

## 🏗️ Arquitetura

### Componentes

```
┌─────────────────────────────────────────────────────────┐
│                      FastAPI Server                      │
│                        (main.py)                         │
└────────────┬────────────────────────────┬────────────────┘
             │                            │
             ▼                            ▼
    ┌────────────────┐          ┌────────────────────┐
    │    Supabase    │          │ SistemaRecomendacao│
    │                │          │   Similaridade     │
    │  - movies      │          │ (recommendation_   │
    │  - user_movies │          │    system.py)      │
    │  - user_recs   │          └────────────────────┘
    └────────────────┘
```

### Fluxo de Dados

1. **Inicialização** (ao iniciar o servidor):
   - Carregar filmes do Supabase → DataFrame
   - Extrair embeddings (arrays JSON → numpy arrays)
   - Instanciar `SistemaRecomendacaoSimilaridade`

2. **Geração de Recomendações** (via API):
   - Endpoint recebe `user_id`
   - Busca avaliações do usuário no Supabase
   - Gera recomendações (background task)
   - Salva resultados em `user_recommendations`

---

## 🧮 Algoritmo Detalhado

### 1. Cálculo de Similaridade

Usa **cosine similarity** entre embeddings:

```python
similarity = cosine_similarity(embedding_filme_A, embedding_filme_B)
```

**Interpretação**:
- `1.0` → Filmes muito similares/idênticos
- `0.5` → Similaridade moderada
- `0.0` → Sem relação
- `-1.0` → Opostos (raro)

### 2. Seleção de Candidatos

Para cada filme avaliado pelo usuário:

```python
# Exemplo: Usuário avaliou "Inception"
similaridades = calcular_similaridades(inception)
top_k = similaridades[:3]  # Top 3: Interstellar, Tenet, Shutter Island
```

### 3. Agregação de Scores

Filmes candidatos acumulam informação:

```python
candidatos[movie_id] = {
    'similaridades': [0.85, 0.78, 0.82],  # Se apareceu 3 vezes
    'max_sim': 0.85,
    'avg_sim': 0.817,
    'count': 3
}
```

### 4. Fórmula de Pontuação Final

```python
score = (avg_sim × 0.5 + max_sim × 0.3) × (1 + count × 0.1)
```

**Componentes**:

| Componente | Peso | Propósito |
|------------|------|-----------|
| `avg_sim × 0.5` | 50% | Premia consistência de similaridade |
| `max_sim × 0.3` | 30% | Captura picos de alta similaridade |
| `(1 + count × 0.1)` | Boost | Premia filmes similares a **múltiplos** filmes avaliados |

**Exemplo de Cálculo**:

```
Filme: "The Prestige"
Aparece como similar a 3 filmes avaliados:
  - Com "The Dark Knight": 0.85
  - Com "Inception": 0.78
  - Com "Interstellar": 0.82

avg_sim = (0.85 + 0.78 + 0.82) / 3 = 0.817
max_sim = 0.85
count = 3

score = (0.817 × 0.5 + 0.85 × 0.3) × (1 + 3 × 0.1)
      = (0.4085 + 0.255) × 1.3
      = 0.6635 × 1.3
      = 0.863
```

### 5. Por que este Approach?

**Vantagens do boost por contagem**:
- Filmes que são similares a **vários** dos filmes avaliados têm maior probabilidade de agradar
- Captura diferentes facetas do perfil do usuário
- Evita recomendações muito nichadas baseadas em um único filme

**Exemplo Prático**:

Se o usuário avaliou positivamente filmes de Christopher Nolan:
- The Dark Knight
- Inception  
- Interstellar

Filmes como **Dunkirk** e **Tenet** aparecerão como similares aos 3, recebendo um boost significativo no score final! 🎯

---

## ⚙️ Configurações

### Parâmetros Principais

| Parâmetro | Valor Padrão | Descrição |
|-----------|--------------|-----------|
| `k_por_filme` | 3 | Número de filmes similares considerados por filme avaliado |
| `n_recomendacoes` | 25 | Número de recomendações finais retornadas |
| `min_avaliacoes` | 5 | Mínimo de avaliações para gerar recomendações |

### Ajustando Parâmetros

**Aumentar `k_por_filme` (ex: 5)**:
- ✅ Mais candidatos, maior diversidade
- ❌ Pode incluir filmes menos relevantes

**Diminuir `k_por_filme` (ex: 2)**:
- ✅ Maior precisão, recomendações mais focadas
- ❌ Menos diversidade, pode perder boas sugestões

---

## 🌐 API Endpoints

### `POST /generate-recommendations/{user_id}`

Gera recomendações para um usuário específico.

**Parâmetros**:
- `user_id` (path): ID do usuário

**Resposta**:
```json
{
  "message": "Geração de recomendações iniciada para o usuário user_xxx",
  "status": "processing"
}
```

**Comportamento**:
1. Busca avaliações do usuário em `user_movies`
2. Verifica se tem pelo menos 5 avaliações
3. Gera recomendações em background
4. Deleta recomendações antigas em `user_recommendations`
5. Insere novas recomendações

**Exemplo de Uso**:

```bash
# PowerShell
Invoke-WebRequest -Uri "http://localhost:8000/generate-recommendations/user_123" -Method POST

# cURL (bash)
curl -X POST http://localhost:8000/generate-recommendations/user_123
```

---

## 🚀 Instalação e Uso

### Pré-requisitos

```bash
pip install fastapi uvicorn pandas numpy scikit-learn supabase python-dotenv
```

### Configuração

1. **Criar arquivo `.env`** em `fastapi/`:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-chave-service-role
FRONTEND_URL=http://localhost:5173
```

2. **Estrutura do Supabase**:

Tabelas necessárias:

```sql
-- Filmes com embeddings
CREATE TABLE movies (
    id INT PRIMARY KEY,
    series_title TEXT,
    genre TEXT,
    imdb_rating FLOAT,
    embedding JSONB  -- Array de floats
);

-- Avaliações dos usuários
CREATE TABLE user_movies (
    user_id TEXT,
    movie_id INT REFERENCES movies(id),
    rating FLOAT,
    PRIMARY KEY (user_id, movie_id)
);

-- Recomendações geradas
CREATE TABLE user_recommendations (
    user_id TEXT,
    movie_id INT REFERENCES movies(id),
    predicted_score FLOAT,
    position INT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Iniciar o Servidor

```bash
cd fastapi
uvicorn main:app --reload
```

Servidor rodará em: `http://localhost:8000`

---

## 📊 Escalabilidade

### Performance Atual

- **Filmes no sistema**: ~1000-10000
- **Tempo de geração**: 1-3 segundos para 10-20 avaliações
- **Complexidade**: O(N × M) onde N = filmes avaliados, M = total de filmes

### Otimizações Futuras

Para escalar além de 10k filmes:

1. **Indexação por ANN** (Approximate Nearest Neighbors):
   - Usar FAISS, Annoy ou HNSW
   - Reduz complexidade para O(log M)

2. **Cache de similaridades**:
   - Pré-calcular matriz de similaridade
   - Trade-off: memória vs. tempo

3. **Filtragem pré-processamento**:
   - Filtrar por género/idioma antes de calcular similaridades
   - Reduz espaço de busca

---

## 🎓 Conceitos Técnicos

### Content-Based Filtering

Recomenda items similares aos que o usuário já gostou. Diferente de **collaborative filtering** (baseado em usuários similares), este método:

✅ Não precisa de dados de outros usuários  
✅ Funciona bem com poucos dados (cold start)  
❌ Pode criar "filter bubble" (só recomenda o que já conhece)  

### Embeddings Semânticos

Vetores numéricos que capturam o **significado** dos filmes. Criados considerando:

- Título e sinopse
- Géneros e keywords
- Diretor e idioma original
- Classificação etária e ano

Filmes semanticamente similares têm embeddings próximos no espaço vetorial.

### Cosine Similarity

Mede o ângulo entre dois vetores, ignorando magnitude:

```
sim(A, B) = (A · B) / (||A|| × ||B||)
```

Ideal para embeddings porque foca na **direção** (significado) em vez de escala.

---

## 📝 Notas de Desenvolvimento

### Histórico de Mudanças

- **v1.0**: Sistema baseado em KNN puro
- **v2.0**: Mudança para top-K por filme avaliado (atual)
  - Maior controle sobre diversidade vs. precisão
  - Melhor explicabilidade das recomendações

### Possíveis Melhorias

1. **Hybrid System**: Combinar com collaborative filtering
2. **Re-ranking**: Aplicar diversificação após score inicial
3. **Temporal Decay**: Dar mais peso a avaliações recentes
4. **Profile Boosting**: Detectar preferências dominantes (já implementado em tentativas anteriores)

---

## 📞 Suporte

Para questões ou sugestões sobre o sistema de recomendação, consulte:
- [Código fonte](./recommendation_system.py)
- [Servidor FastAPI](./main.py)

---

**Desenvolvido com ❤️ para CinemaWebApp**
