import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from typing import Dict, List, Union

class SistemaRecomendacaoSimilaridade:
    def __init__(self, embeddings: np.ndarray, dataset_source: Union[str, pd.DataFrame]):
        """
        Sistema de recomendação baseado em similaridade pura
        Para cada filme avaliado, encontra os K mais similares
        """
        print("Carregando sistema de recomendação por similaridade...")
        self.embeddings = embeddings
        self.k_vizinhos = k_vizinhos
        self.min_avaliacoes_knn = min_avaliacoes_knn
        
        if isinstance(dataset_source, pd.DataFrame):
            self.bd = dataset_source
        else:
            self.bd = pd.read_csv(dataset_source)
        
        # Verificar coluna 'id'
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
        
        # Criar mapeamento movie_id -> índice do array
        self.movie_id_to_idx = {
            int(movie_id): idx 
            for idx, movie_id in enumerate(self.bd['id'])
        }
        
        # Estado do usuário
        self.avaliacoes = {}
        self.filmes_vistos_ids = set()
        
        # Configurações
        self.k_por_filme = 3  # Top 3 similares por filme avaliado
        
        print(f"✅ Sistema carregado!")
        print(f"   Total de filmes: {len(self.bd)}")
        print(f"   Dimensões embedding: {self.embeddings.shape[1]}\n")
    
    def set_user_data(self, avaliacoes_por_movie_id: Dict[int, float], 
                     filmes_vistos_ids: List[int]):
        """Define os dados do usuário"""
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
    
    def _calcular_similaridades(self, idx_filme_avaliado: int) -> List[tuple]:
        """
        Para um filme avaliado, calcula similaridade com todos os não-vistos
        Retorna lista de (idx_filme, similaridade, titulo)
        """
        emb_avaliado = self.embeddings[idx_filme_avaliado]
        
        similaridades = []
        for idx in range(len(self.bd)):
            movie_id = int(self.bd.iloc[idx]['id'])
            
            # Pular filmes já vistos
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
        
        # Ordenar por similaridade (maior primeiro)
        similaridades.sort(key=lambda x: x['similaridade'], reverse=True)
        
        return similaridades
    
    def gerar_recomendacoes(self, n: int = 25) -> List[Dict]:
        """
        Gera recomendações encontrando os top K similares para cada filme avaliado
        """
        if len(self.avaliacoes) == 0:
            print("⚠️  Nenhuma avaliação fornecida. Usando cold start.")
            return self._get_popular_movies(n)
        
        print(f"\n🧮 Gerando recomendações...")
        print(f"   Método: Top-{self.k_por_filme} similares por filme avaliado")
        print(f"   Filmes base: {len(self.avaliacoes)}")
        
        # Dicionário para acumular scores por filme
        # filme_id -> {similaridade_maxima, lista_de_similaridades, info}
        candidatos = {}
        
        for idx_avaliado in self.avaliacoes.keys():
            titulo_avaliado = self.bd.iloc[idx_avaliado].get('series_title', 'Unknown')
            print(f"   Buscando similares a: {titulo_avaliado}")
            
            similaridades = self._calcular_similaridades(idx_avaliado)
            
            # Pegar top K
            top_k = similaridades[:self.k_por_filme]
            
            for rec in top_k:
                movie_id = rec['movie_id']
                
                if movie_id not in candidatos:
                    candidatos[movie_id] = {
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
            
            # Score final: combina média, máxima e contagem
            # Filmes que aparecem múltiplas vezes (similares a vários filmes avaliados) são preferidos
            score = (avg_sim * 0.5 + max_sim * 0.3) * (1 + count * 0.1)
            
            recomendacoes.append({
                'movie_id': movie_id,
                'score': float(score),
                'avg_similarity': float(avg_sim),
                'max_similarity': float(max_sim),
                'appears_for': count,  # Quantos filmes avaliados têm este como similar
                'titulo': info['titulo'],
                'genero': info['genero'],
                'imdb_rating': info['imdb_rating']
            })
        
        # Ordenar por score
        recomendacoes.sort(key=lambda x: x['score'], reverse=True)
        
        print(f"✅ {len(recomendacoes)} recomendações geradas")
        if recomendacoes:
            print(f"   Top score: {recomendacoes[0]['score']:.4f}")
            print(f"   Top título: {recomendacoes[0]['titulo']}")
        print(f"   Retornando top {n}\n")
        
        return recomendacoes[:n]
