import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import Dict, List, Union

class SistemaRecomendacaoSimilaridade:
    def __init__(self, embeddings: np.ndarray, dataset_source: Union[str, pd.DataFrame]):
        """
        Pure similarity-based recommendation system.
        For each rated movie, finds the K most similar ones.
        """
        print("Loading similarity recommendation system...")
        self.embeddings = embeddings
        
        if isinstance(dataset_source, pd.DataFrame):
            self.bd = dataset_source
        else:
            self.bd = pd.read_csv(dataset_source)
        
        # Check 'id' column
        if 'id' not in self.bd.columns:
            possible_id_cols = ['movie_id', 'movieId', 'Movie_Id', 'ID', 'tmdb_id']
            id_col_found = None
            
            for col in possible_id_cols:
                if col in self.bd.columns:
                    id_col_found = col
                    break
            
            if id_col_found:
                self.bd['id'] = self.bd[id_col_found]
            else:
                self.bd['id'] = range(len(self.bd))
        
        self.bd['id'] = self.bd['id'].astype(int)
        
        # Create movie_id -> array index mapping
        self.movie_id_to_idx = {
            int(movie_id): idx 
            for idx, movie_id in enumerate(self.bd['id'])
        }
        
        # User state
        self.avaliacoes = {}
        self.filmes_vistos_ids = set()
        
        # Configuration
        self.k_por_filme = 3  # Top 3 similar per rated movie
        
        print(f"✅ System loaded!")
        print(f"   Total movies: {len(self.bd)}")
        print(f"   Embedding dimensions: {self.embeddings.shape[1]}\n")
    
    def set_user_data(self, avaliacoes_por_movie_id: Dict[int, float], 
                     filmes_vistos_ids: List[int]):
        """Sets the user data"""
        self.avaliacoes = {}
        for movie_id, rating in avaliacoes_por_movie_id.items():
            movie_id = int(movie_id)
            if movie_id in self.movie_id_to_idx:
                idx = self.movie_id_to_idx[movie_id]
                self.avaliacoes[idx] = float(rating)
        
        self.filmes_vistos_ids = set(int(mid) for mid in filmes_vistos_ids)
        self._perfil_usuario_cache = None  # Invalidate cache
        
        print(f"📊 User data loaded:")
        print(f"   Ratings: {len(self.avaliacoes)}")
        print(f"   Watched movies: {len(self.filmes_vistos_ids)}")
    
    def _calcular_similaridades(self, idx_filme_avaliado: int) -> List[tuple]:
        """
        For a rated movie, calculates similarity with all non-watched ones.
        Returns list of (idx_movie, similarity, title).
        """
        emb_avaliado = self.embeddings[idx_filme_avaliado]
        
        similaridades = []
        for idx in range(len(self.bd)):
            movie_id = int(self.bd.iloc[idx]['id'])
            
            # Skip watched movies
            if movie_id in self.filmes_vistos_ids:
                continue
            
            emb_candidato = self.embeddings[idx]
            sim = cosine_similarity([emb_avaliado], [emb_candidato])[0][0]
            
            titulo = self.bd.iloc[idx].get('series_title', 'Unknown')
            genero = self.bd.iloc[idx].get('genre', 'Unknown')
            imdb = float(self.bd.iloc[idx].get('imdb_rating', 0.0))
            
            similaridades.append({
                'idx': idx,
                'movie_id': movie_id,
                'similaridade': float(sim),
                'titulo': titulo,
                'genero': genero,
                'imdb_rating': imdb
            })
        
        # Sort by similarity (highest first)
        similaridades.sort(key=lambda x: x['similaridade'], reverse=True)
        
        return similaridades
    
    def gerar_recomendacoes(self, n: int = 50) -> List[Dict]:  # ✅ Default 50 now
        """
        Generates recommendations by finding the top K similar for each rated movie.
        """
        if len(self.avaliacoes) == 0:
            print("⚠️  No ratings provided. Using cold start.")
            return self._get_popular_movies(n)
        
        print(f"\n🧮 Generating recommendations...")
        print(f"   Method: Top-{self.k_por_filme} similar per rated movie")
        print(f"   Base movies: {len(self.avaliacoes)}")
        
        # Dictionary to accumulate scores by movie
        # movie_id -> {max_similarity, similarity_list, info}
        candidatos = {}
        
        for idx_avaliado in self.avaliacoes.keys():
            titulo_avaliado = self.bd.iloc[idx_avaliado].get('series_title', 'Unknown')
            print(f"   Searching similar to: {titulo_avaliado}")
            
            similaridades = self._calcular_similaridades(idx_avaliado)
            
            # Get Top K
            top_k = similaridades[:self.k_por_filme]
            
            for rec in top_k:
                movie_id = rec['movie_id']
                idx = rec['idx']
                
                if movie_id not in candidatos:
                    candidatos[movie_id] = {
                        'idx': idx,
                        'movie_id': movie_id,
                        'titulo': rec['titulo'],
                        'genero': rec['genero'],
                        'imdb_rating': rec['imdb_rating'],
                        'similaridades': [],
                        'max_sim': 0.0
                    }
                
                candidatos[movie_id]['similaridades'].append(rec['similaridade'])
                candidatos[movie_id]['max_sim'] = max(
                    candidatos[movie_id]['max_sim'], 
                    rec['similaridade']
                )
        
        # Converter para lista e calcular score final
        recomendacoes = []
        for movie_id, info in candidatos.items():
            # Score = média das similaridades (se apareceu múltiplas vezes, é muito relevante)
            avg_sim = np.mean(info['similaridades'])
            max_sim = info['max_sim']
            count = len(info['similaridades'])
            
            # Final score: combines average, max and count
            # Movies that appear multiple times (similar to several rated movies) are preferred
            score = (avg_sim * 0.5 + max_sim * 0.3) * (1 + count * 0.1)
            
            # ✅ ADD COMPLETE METADATA FOR RAG
            idx = info['idx']
            row = self.bd.iloc[idx]
            
            recomendacoes.append({
                'movie_id': movie_id,
                'score': float(score),
                'avg_similarity': float(avg_sim),
                'max_similarity': float(max_sim),
                'appears_for': count,
                
                # Original fields
                'titulo': info['titulo'],
                'genero': info['genero'],
                'imdb_rating': info['imdb_rating'],
                
                # ✅ NEW FIELDS FOR RAG
                'title': info['titulo'],  # Alias
                'genre': info['genero'],  # Alias
                'year': row.get('released_year', 'N/A'),
                'origin_country': row.get('origin_country', 'N/A'),
                'original_language': row.get('original_language', 'N/A'),
                'overview': row.get('overview', 'N/A'),
            })
        
        # Sort by score
        recomendacoes.sort(key=lambda x: x['score'], reverse=True)
        
        print(f"✅ {len(recomendacoes)} recommendations generated")
        if recomendacoes:
            print(f"   Top score: {recomendacoes[0]['score']:.4f}")
            print(f"   Top title: {recomendacoes[0]['titulo']}")
        print(f"   Returning top {n}\n")
        
        return recomendacoes[:n]
    
    def _get_popular_movies(self, n: int) -> List[Dict]:
        """Cold start: returns popular movies"""
        print("   Using fallback: most popular movies (IMDb rating)")
        
        popular = self.bd.nlargest(n, 'imdb_rating')
        
        recs = []
        for _, row in popular.iterrows():
            recs.append({
                'movie_id': int(row['id']),
                'score': float(row.get('imdb_rating', 0)),
                'titulo': row.get('series_title', 'Unknown'),
                'genero': row.get('genre', 'Unknown'),
                'imdb_rating': float(row.get('imdb_rating', 0)),
                
                # For RAG
                'title': row.get('series_title', 'Unknown'),
                'genre': row.get('genre', 'Unknown'),
                'year': row.get('released_year', 'N/A'),
                'origin_country': row.get('origin_country', 'N/A'),
                'original_language': row.get('original_language', 'N/A'),
                'overview': row.get('overview', 'N/A'),
            })
        
        return recs