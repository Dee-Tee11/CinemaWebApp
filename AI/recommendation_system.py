import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import Dict, List, Union

class SistemaRecomendacaoKNN:
    def __init__(self, embeddings: np.ndarray, dataset_source: Union[str, pd.DataFrame]):
        """
        Inicializa o sistema de recomendação
        
        Args:
            embeddings: Array NumPy com os embeddings dos filmes
            dataset_source: Caminho para CSV OU DataFrame com dados dos filmes
        """
        print("Carregando sistema de recomendação...")
        self.embeddings = embeddings
        
        # Aceitar tanto CSV quanto DataFrame
        if isinstance(dataset_source, pd.DataFrame):
            self.bd = dataset_source
            print("   Dados carregados do DataFrame")
        else:
            self.bd = pd.read_csv(dataset_source)
            print(f"   Dados carregados de: {dataset_source}")
        
        # Verificar coluna 'id'
        if 'id' not in self.bd.columns:
            possible_id_cols = ['movie_id', 'movieId', 'Movie_Id', 'ID']
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
        
        # Configurações KNN
        self.k_vizinhos = 10
        self.min_avaliacoes_knn = 5
        
        print(f"✅ Sistema carregado!")
        print(f"   Total de filmes: {len(self.bd)}")
        print(f"   Dimensões embedding: {self.embeddings.shape[1]}")
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
        
        print(f"📊 Dados do usuário carregados:")
        print(f"   Avaliações: {len(self.avaliacoes)}")
        print(f"   Filmes vistos: {len(self.filmes_vistos_ids)}")
    
    def _calcular_score_knn(self, idx_filme: int) -> float:
        """Calcula score usando KNN com ponderação por distância"""
        if len(self.avaliacoes) < self.min_avaliacoes_knn:
            return None
        
        emb_filme = self.embeddings[idx_filme]
        distancias_avaliados = []
        
        for idx_avaliado, nota in self.avaliacoes.items():
            emb_avaliado = self.embeddings[idx_avaliado]
            sim = cosine_similarity([emb_filme], [emb_avaliado])[0][0]
            distancia = 1 - sim
            
            distancias_avaliados.append({
                'idx': idx_avaliado,
                'distancia': distancia,
                'nota': nota
            })
        
        distancias_avaliados.sort(key=lambda x: x['distancia'])
        k = min(self.k_vizinhos, len(distancias_avaliados))
        vizinhos = distancias_avaliados[:k]
        
        peso_total = 0
        score_ponderado = 0
        
        for v in vizinhos:
            peso = 1.0 / (1.0 + v['distancia'])
            score_ponderado += peso * v['nota']
            peso_total += peso
        
        if peso_total > 0:
            return score_ponderado / peso_total
        
        return None
    
    def _calcular_score_similaridade(self, idx_filme: int) -> float:
        """Fallback: calcula score por similaridade com perfil médio"""
        indices_avaliados = list(self.avaliacoes.keys())
        embeddings_avaliados = self.embeddings[indices_avaliados]
        
        perfil_usuario = np.mean(embeddings_avaliados, axis=0)
        emb_filme = self.embeddings[idx_filme]
        similaridade = cosine_similarity([perfil_usuario], [emb_filme])[0][0]
        
        score = max(0, min(20, similaridade * 20))
        return score
    
    def gerar_recomendacoes(self, n: int = 25) -> List[Dict]:
        """Gera top N recomendações para o usuário"""
        if len(self.avaliacoes) == 0:
            print("⚠️  Nenhuma avaliação fornecida.")
            return []
        
        usar_knn = len(self.avaliacoes) >= self.min_avaliacoes_knn
        
        print(f"\n🧮 Gerando recomendações...")
        print(f"   Método: {'KNN' if usar_knn else 'Similaridade'}")
        print(f"   Avaliações base: {len(self.avaliacoes)}")
        
        recomendacoes = []
        
        for idx in range(len(self.bd)):
            movie_id = int(self.bd.iloc[idx]['id'])
            
            if movie_id in self.filmes_vistos_ids:
                continue
            
            filme = self.bd.iloc[idx]
            
            if usar_knn:
                score = self._calcular_score_knn(idx)
                if score is None:
                    score = self._calcular_score_similaridade(idx)
            else:
                score = self._calcular_score_similaridade(idx)
            
            recomendacoes.append({
                'movie_id': movie_id,
                'score': float(score),
                'titulo': filme.get('series_title', 'Unknown'),
                'genero': filme.get('genre', 'Unknown'),
                'imdb_rating': float(filme.get('imdb_rating', 0.0))
            })
        
        recomendacoes.sort(key=lambda x: x['score'], reverse=True)
        
        print(f"✅ {len(recomendacoes)} recomendações geradas")
        if recomendacoes:
            print(f"   Top score: {recomendacoes[0]['score']:.2f}")
        print(f"   Retornando top {n}\n")
        
        return recomendacoes[:n]