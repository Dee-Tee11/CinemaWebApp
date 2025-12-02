import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import Dict, List, Union

class SistemaRecomendacaoKNN:
    def __init__(self, embeddings: np.ndarray, dataset_source: Union[str, pd.DataFrame], 
                 k_vizinhos: int = 10, min_avaliacoes_knn: int = 5):
        """
        Inicializa o sistema de recomendação OTIMIZADO
        
        Args:
            embeddings: Array NumPy com os embeddings dos filmes
            dataset_source: Caminho para CSV OU DataFrame com dados dos filmes
            k_vizinhos: Número de vizinhos para KNN (default: 10)
            min_avaliacoes_knn: Mínimo de avaliações para usar KNN (default: 5)
        """
        print("Carregando sistema de recomendação...")
        self.embeddings = embeddings
        self.k_vizinhos = k_vizinhos
        self.min_avaliacoes_knn = min_avaliacoes_knn
        
        # Aceitar tanto CSV quanto DataFrame
        if isinstance(dataset_source, pd.DataFrame):
            self.bd = dataset_source
            print("   Dados carregados do DataFrame")
        else:
            self.bd = pd.read_csv(dataset_source)
            print(f"   Dados carregados de: {dataset_source}")
        
        # Verificar coluna 'id'
        if 'id' not in self.bd.columns:
            possible_id_cols = ['movie_id', 'movieId', 'Movie_Id', 'ID', 'tmdb_id']
            id_col_found = None
            
            for col in possible_id_cols:
                if col in self.bd.columns:
                    id_col_found = col
                    break
            
            if id_col_found:
                print(f"⚠️  Usando '{id_col_found}' como coluna de ID")
                self.bd['id'] = self.bd[id_col_found]
            else:
                print("⚠️  Criando IDs sequenciais (0, 1, 2, ...)")
                self.bd['id'] = range(len(self.bd))
        
        # Garantir que IDs são inteiros
        self.bd['id'] = self.bd['id'].astype(int)
        
        # Criar mapeamento movie_id -> índice do array
        self.movie_id_to_idx = {
            int(movie_id): idx 
            for idx, movie_id in enumerate(self.bd['id'])
        }
        
        # Estado do usuário
        self.avaliacoes = {}
        self.filmes_vistos_ids = set()
        self._perfil_usuario_cache = None
        
        print(f"✅ Sistema carregado!")
        print(f"   Total de filmes: {len(self.bd)}")
        print(f"   Dimensões embedding: {self.embeddings.shape[1]}")
        print(f"   K vizinhos: {self.k_vizinhos}")
        print(f"   Colunas: {list(self.bd.columns[:5])}...\n")
    
    def set_user_data(self, avaliacoes_por_movie_id: Dict[int, float], 
                     filmes_vistos_ids: List[int]):
        """
        Define os dados do usuário para gerar recomendações
        
        Args:
            avaliacoes_por_movie_id: {movie_id: rating}
            filmes_vistos_ids: [movie_id, ...]
        """
        self.avaliacoes = {}
        for movie_id, rating in avaliacoes_por_movie_id.items():
            movie_id = int(movie_id)
            if movie_id in self.movie_id_to_idx:
                idx = self.movie_id_to_idx[movie_id]
                self.avaliacoes[idx] = float(rating)
        
        self.filmes_vistos_ids = set(int(mid) for mid in filmes_vistos_ids)
        self._perfil_usuario_cache = None  # Invalidar cache
        
        print(f"📊 Dados do usuário carregados:")
        print(f"   Avaliações: {len(self.avaliacoes)}")
        print(f"   Filmes vistos: {len(self.filmes_vistos_ids)}")
    
    def _get_perfil_usuario(self) -> np.ndarray:
        """Cache do perfil médio do usuário"""
        if self._perfil_usuario_cache is None:
            indices = list(self.avaliacoes.keys())
            self._perfil_usuario_cache = np.mean(self.embeddings[indices], axis=0)
        return self._perfil_usuario_cache
    
    def _calcular_todos_scores_knn(self) -> np.ndarray:
        """
        ✨ OTIMIZADO: Calcula scores KNN para TODOS os filmes usando vetorização
        Ganho: ~100x mais rápido que loop filme por filme
        """
        n_filmes = len(self.bd)
        indices_avaliados = np.array(list(self.avaliacoes.keys()))
        embeddings_avaliados = self.embeddings[indices_avaliados]
        notas_avaliadas = np.array([self.avaliacoes[idx] for idx in indices_avaliados])
        
        # Calcular matriz de similaridades (N × K) - UMA operação ao invés de N loops
        sims = cosine_similarity(self.embeddings, embeddings_avaliados)
        distancias = 1 - sims
        
        # Para cada filme, encontrar K vizinhos e calcular score ponderado
        scores = np.zeros(n_filmes)
        k = min(self.k_vizinhos, len(indices_avaliados))
        
        for i in range(n_filmes):
            # Encontrar K vizinhos mais próximos
            indices_vizinhos = np.argsort(distancias[i])[:k]
            
            dists_viz = distancias[i, indices_vizinhos]
            notas_viz = notas_avaliadas[indices_vizinhos]
            
            # Ponderação: quanto mais próximo E melhor avaliado, maior o peso
            pesos_distancia = 1.0 / (1.0 + dists_viz)
            pesos_nota = notas_viz / 20.0  # Normalizar notas para [0, 1]
            pesos_total = pesos_distancia * pesos_nota
            
            if np.sum(pesos_total) > 0:
                scores[i] = np.sum(pesos_total * notas_viz) / np.sum(pesos_total)
            else:
                scores[i] = 0
        
        return scores
    
    def _calcular_todos_scores_similaridade(self) -> np.ndarray:
        """
        ✨ OTIMIZADO: Calcula scores por similaridade para TODOS os filmes
        Ganho: De N operações para 1 operação matricial
        """
        perfil_usuario = self._get_perfil_usuario().reshape(1, -1)
        
        # UMA operação para calcular similaridade com todos os filmes
        similaridades = cosine_similarity(perfil_usuario, self.embeddings)[0]
        scores = np.clip(similaridades * 20, 0, 20)
        
        return scores
    
    def _get_popular_movies(self, n: int) -> List[Dict]:
        """
        🆕 Cold start: retornar filmes mais populares por IMDB rating
        Usado quando o usuário não tem avaliações suficientes
        """
        print("   💡 Cold start: Usando filmes populares")
        top_movies = self.bd.nlargest(n, 'imdb_rating')
        
        recomendacoes = []
        for _, row in top_movies.iterrows():
            recomendacoes.append({
                'movie_id': int(row['id']),
                'score': float(row['imdb_rating']),
                'titulo': row.get('series_title', 'Unknown'),
                'genero': row.get('genre', 'Unknown'),
                'imdb_rating': float(row.get('imdb_rating', 0.0))
            })
        
        return recomendacoes
    
    def gerar_recomendacoes(self, n: int = 25) -> List[Dict]:
        """
        ✨ OTIMIZADO: Gera top N recomendações usando vetorização completa
        """
        if len(self.avaliacoes) == 0:
            print("⚠️  Nenhuma avaliação fornecida. Usando cold start.")
            return self._get_popular_movies(n)
        
        usar_knn = len(self.avaliacoes) >= self.min_avaliacoes_knn
        
        print(f"\n🧮 Gerando recomendações...")
        print(f"   Método: {'KNN (Ponderado por Nota)' if usar_knn else 'Similaridade com Perfil'}")
        print(f"   Avaliações base: {len(self.avaliacoes)}")
        
        # ✨ VETORIZAÇÃO: calcular scores de TODOS os filmes de uma vez
        if usar_knn:
            scores = self._calcular_todos_scores_knn()
        else:
            scores = self._calcular_todos_scores_similaridade()
        
        # Filtragem eficiente com máscaras NumPy
        ids_array = self.bd['id'].values
        mask_nao_vistos = ~np.isin(ids_array, list(self.filmes_vistos_ids))
        
        # Aplicar máscara
        indices_candidatos = np.where(mask_nao_vistos)[0]
        scores_candidatos = scores[indices_candidatos]
        
        # Top N usando argsort (mais rápido que sort completo)
        top_n_indices_rel = np.argsort(scores_candidatos)[-n:][::-1]
        top_n_indices = indices_candidatos[top_n_indices_rel]
        
        # Construir lista de recomendações
        recomendacoes = []
        for idx in top_n_indices:
            filme = self.bd.iloc[idx]
            recomendacoes.append({
                'movie_id': int(filme['id']),
                'score': float(scores[idx]),
                'titulo': filme.get('series_title', 'Unknown'),
                'genero': filme.get('genre', 'Unknown'),
                'imdb_rating': float(filme.get('imdb_rating', 0.0))
            })
        
        print(f"✅ {len(recomendacoes)} recomendações geradas")
        if recomendacoes:
            print(f"   Top score: {recomendacoes[0]['score']:.2f}")
        print(f"   Retornando top {n}\n")
        
        return recomendacoes