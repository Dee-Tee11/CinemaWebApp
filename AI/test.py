import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from collections import Counter

class SistemaRecomendacaoKNN:
    def __init__(self, embeddings_path, dataset_path):
        """Inicializa sistema carregando embeddings e dataset"""
        print("🎬 Carregando sistema de recomendação...")
        self.embeddings = np.load(embeddings_path)
        self.bd = pd.read_csv(dataset_path)
        
        # Estado do usuário - NOVO: dicionário com notas
        self.avaliacoes = {}  # {idx_filme: nota}
        self.filmes_vistos = []  # todos os filmes que já apareceram
        
        # Configurações KNN
        self.k_vizinhos = 10
        self.min_avaliacoes_knn = 5  # Mínimo para usar KNN
        
        print(f"✅ Sistema carregado!")
        print(f"   Total de filmes: {len(self.bd)}")
        print(f"   Dimensões embedding: {self.embeddings.shape[1]}\n")
    
    def mostrar_filmes_disponiveis(self, inicio=0, quantidade=50):
        """Mostra lista de filmes disponíveis"""
        print(f"\n{'='*80}")
        print(f"🎬 FILMES DISPONÍVEIS (mostrando {inicio+1} a {min(inicio+quantidade, len(self.bd))})")
        print(f"{'='*80}\n")
        
        fim = min(inicio + quantidade, len(self.bd))
        
        for i in range(inicio, fim):
            filme = self.bd.iloc[i]
            print(f"[{i}] {filme['Series_Title']}")
            print(f"    🎭 {filme['Genre']}")
            print(f"    ⭐ IMDB: {filme['IMDB_Rating']}/10")
            print(f"    🎬 {filme['Director']}")
            print()
        
        return fim
    
    def escolha_inicial(self):
        """Usuário escolhe 5 filmes que adorou"""
        print(f"\n{'='*80}")
        print("👤 ESCOLHA INICIAL - Diz-me 5 filmes que ADORAS!")
        print(f"{'='*80}\n")
        
        # Mostrar primeiros filmes
        posicao = 0
        self.mostrar_filmes_disponiveis(posicao, 50)
        
        print("\n💡 Dica: Podes ver mais filmes digitando 'mais'")
        print("💡 Para escolher, digita os números separados por vírgula")
        print("💡 Exemplo: 0,5,10,15,20\n")
        
        while True:
            escolha = input("📝 Tua escolha (5 números): ").strip()
            
            if escolha.lower() == 'mais':
                posicao += 50
                self.mostrar_filmes_disponiveis(posicao, 50)
                continue
            
            try:
                indices = [int(x.strip()) for x in escolha.split(',')]
                
                if len(indices) != 5:
                    print(f"❌ Preciso de 5 filmes! Tu deste {len(indices)}")
                    continue
                
                if any(i < 0 or i >= len(self.bd) for i in indices):
                    print(f"❌ Número inválido! Usa entre 0 e {len(self.bd)-1}")
                    continue
                
                # Guardar escolhas com nota 9/10 (adorou)
                print("\n✅ Filmes escolhidos (assumindo nota 9/10):")
                for idx in indices:
                    self.avaliacoes[idx] = 9.0
                    self.filmes_vistos.append(idx)
                    print(f"   ⭐ {self.bd.iloc[idx]['Series_Title']} → 9/10")
                
                break
                
            except ValueError:
                print("❌ Formato inválido! Usa números separados por vírgula")
    
    def _gerar_filmes_relacionados(self, n=25):
        """Gera filmes relacionados com DIVERSIDADE"""
        # Calcular perfil médio dos filmes que gostou
        indices_avaliados = list(self.avaliacoes.keys())
        embeddings_avaliados = self.embeddings[indices_avaliados]
        perfil_usuario = np.mean(embeddings_avaliados, axis=0)
        
        # Calcular similaridade com todos os filmes
        similaridades = cosine_similarity([perfil_usuario], self.embeddings)[0]
        
        # Criar lista de candidatos (não vistos)
        candidatos = []
        for idx in range(len(self.bd)):
            if idx not in self.filmes_vistos:
                candidatos.append({
                    'id': idx,
                    'similaridade': similaridades[idx]
                })
        
        # Ordenar por similaridade
        candidatos.sort(key=lambda x: x['similaridade'], reverse=True)
        
        # ESTRATÉGIA DE DIVERSIDADE:
        # 40% muito similares (top 10)
        # 40% similares médios (posições 10-100)  
        # 20% exploratórios (posições 100-500)
        
        n_muito_sim = int(n * 0.4)  # 10 filmes
        n_medio_sim = int(n * 0.4)  # 10 filmes
        n_exploratorio = n - n_muito_sim - n_medio_sim  # 5 filmes
        
        selecionados = []
        
        # Muito similares
        selecionados.extend(candidatos[:n_muito_sim])
        
        # Médio similares
        if len(candidatos) > 10:
            inicio_medio = 10
            fim_medio = min(100, len(candidatos))
            meio = candidatos[inicio_medio:fim_medio]
            np.random.shuffle(meio)
            selecionados.extend(meio[:n_medio_sim])
        
        # Exploratórios
        if len(candidatos) > 100:
            inicio_exp = 100
            fim_exp = min(500, len(candidatos))
            exploratorios = candidatos[inicio_exp:fim_exp]
            np.random.shuffle(exploratorios)
            selecionados.extend(exploratorios[:n_exploratorio])
        
        # Embaralhar para não ficar óbvio
        np.random.shuffle(selecionados)
        
        return [s['id'] for s in selecionados[:n]]
    
    def mostrar_filmes_para_avaliar(self, indices_filmes):
        """Mostra filmes e pede avaliação"""
        print(f"\n{'='*80}")
        print(f"📊 AVALIA ESTES {len(indices_filmes)} FILMES")
        print(f"{'='*80}\n")
        
        print("Para cada filme:")
        print("  ⭐ Digita nota de 1-10 se viste")
        print("  ⏭️  Digita 's' para skip (não vi)\n")
        
        for i, idx in enumerate(indices_filmes, 1):
            filme = self.bd.iloc[idx]
            
            print(f"\n[{i}/{len(indices_filmes)}] {filme['Series_Title']}")
            print(f"    🎭 {filme['Genre']}")
            print(f"    ⭐ IMDB: {filme['IMDB_Rating']}/10")
            print(f"    🎬 {filme['Director']}")
            
            while True:
                resposta = input(f"    Tua nota (1-10 ou 's'): ").strip().lower()
                
                if resposta == 's':
                    self.filmes_vistos.append(idx)
                    print(f"    ⏭️  Skipado!")
                    break
                
                try:
                    nota = float(resposta)
                    if 1 <= nota <= 10:
                        self.avaliacoes[idx] = nota
                        self.filmes_vistos.append(idx)
                        emoji = self._get_emoji_nota(nota)
                        print(f"    ✅ Nota registada: {nota}/10 {emoji}")
                        break
                    else:
                        print("    ❌ Nota deve ser entre 1 e 10!")
                except ValueError:
                    print("    ❌ Inválido! Usa número (1-10) ou 's'")
    
    def _get_emoji_nota(self, nota):
        """Retorna emoji baseado na nota"""
        if nota >= 9:
            return "🔥"
        elif nota >= 7:
            return "😊"
        elif nota >= 5:
            return "😐"
        else:
            return "😞"
    
    def _calcular_score_knn(self, idx_filme):
        """Calcula score usando KNN com ponderação por distância"""
        if len(self.avaliacoes) < self.min_avaliacoes_knn:
            return None
        
        # Embedding do filme alvo
        emb_filme = self.embeddings[idx_filme]
        
        # Calcular distâncias para todos os filmes avaliados
        distancias_avaliados = []
        
        for idx_avaliado, nota in self.avaliacoes.items():
            emb_avaliado = self.embeddings[idx_avaliado]
            
            # Cosine similarity
            sim = cosine_similarity([emb_filme], [emb_avaliado])[0][0]
            distancia = 1 - sim  # Converter para distância
            
            distancias_avaliados.append({
                'idx': idx_avaliado,
                'distancia': distancia,
                'nota': nota
            })
        
        # Ordenar por distância
        distancias_avaliados.sort(key=lambda x: x['distancia'])
        
        # Pegar K vizinhos mais próximos
        k = min(self.k_vizinhos, len(distancias_avaliados))
        vizinhos = distancias_avaliados[:k]
        
        # Calcular score ponderado
        peso_total = 0
        score_ponderado = 0
        
        for v in vizinhos:
            # Peso inversamente proporcional à distância
            peso = 1.0 / (1.0 + v['distancia'])
            score_ponderado += peso * v['nota']
            peso_total += peso
        
        if peso_total > 0:
            score_final = score_ponderado / peso_total
            return score_final
        
        return None
    
    def _calcular_score_similaridade(self, idx_filme):
        """Fallback: score por similaridade simples"""
        indices_avaliados = list(self.avaliacoes.keys())
        notas = list(self.avaliacoes.values())
        
        embeddings_avaliados = self.embeddings[indices_avaliados]
        perfil_usuario = np.mean(embeddings_avaliados, axis=0)
        
        emb_filme = self.embeddings[idx_filme]
        similaridade = cosine_similarity([perfil_usuario], [emb_filme])[0][0]
        
        # Converter para escala 1-10
        # Similaridade varia de -1 a 1, mas geralmente fica entre 0 e 1
        score = 1 + (similaridade * 9)  # escala para 1-10
        score = max(1, min(10, score))
        
        return score
    
    def gerar_recomendacoes(self, n=20):
        """Gera recomendações finais"""
        print(f"\n{'='*80}")
        print("🧮 CALCULANDO RECOMENDAÇÕES FINAIS...")
        print(f"{'='*80}")
        
        # Decidir método
        usar_knn = len(self.avaliacoes) >= self.min_avaliacoes_knn
        
        if usar_knn:
            print(f"🟢 MODO: KNN (K={self.k_vizinhos} vizinhos)")
            print(f"   Baseado em {len(self.avaliacoes)} avaliações\n")
        else:
            print(f"🔵 MODO: Similaridade (poucas avaliações)")
            print(f"   Avaliações: {len(self.avaliacoes)}/{self.min_avaliacoes_knn}\n")
        
        # Calcular scores para todos não vistos
        recomendacoes = []
        
        for idx in range(len(self.bd)):
            if idx not in self.filmes_vistos:
                filme = self.bd.iloc[idx]
                
                # Calcular score
                if usar_knn:
                    score = self._calcular_score_knn(idx)
                    if score is None:
                        score = self._calcular_score_similaridade(idx)
                else:
                    score = self._calcular_score_similaridade(idx)
                
                recomendacoes.append({
                    'id': idx,
                    'titulo': filme['Series_Title'],
                    'genero': filme['Genre'],
                    'rating': filme['IMDB_Rating'],
                    'director': filme['Director'],
                    'score': score
                })
        
        # Ordenar por score
        recomendacoes.sort(key=lambda x: x['score'], reverse=True)
        
        return recomendacoes[:n]
    
    def mostrar_recomendacoes(self, recomendacoes):
        """Mostra recomendações formatadas"""
        print(f"\n{'='*80}")
        print(f"🎯 TOP {len(recomendacoes)} RECOMENDAÇÕES PARA TI")
        print(f"{'='*80}\n")
        
        for i, filme in enumerate(recomendacoes, 1):
            score = filme['score']
            emoji = self._get_emoji_nota(score)
            
            print(f"[{i}] {filme['titulo']}")
            print(f"    📊 Score previsto: {score:.1f}/10 {emoji}")
            print(f"    ⭐ IMDB: {filme['rating']}/10")
            print(f"    🎭 {filme['genero']}")
            print(f"    🎬 {filme['director']}")
            print()
    
    def mostrar_estatisticas(self):
        """Mostra estatísticas do perfil"""
        if len(self.avaliacoes) == 0:
            return
        
        notas = list(self.avaliacoes.values())
        nota_media = np.mean(notas)
        
        # Contar por faixa
        excelentes = sum(1 for n in notas if n >= 8)
        bons = sum(1 for n in notas if 6 <= n < 8)
        medios = sum(1 for n in notas if 4 <= n < 6)
        ruins = sum(1 for n in notas if n < 4)
        
        print(f"\n{'='*80}")
        print("📊 ESTATÍSTICAS DO TEU PERFIL")
        print(f"{'='*80}")
        print(f"Total de filmes avaliados: {len(self.avaliacoes)}")
        print(f"Nota média: {nota_media:.1f}/10")
        print(f"\nDistribuição:")
        print(f"  🔥 Excelentes (8-10): {excelentes}")
        print(f"  😊 Bons (6-8): {bons}")
        print(f"  😐 Médios (4-6): {medios}")
        print(f"  😞 Ruins (1-4): {ruins}")
        
        # Top géneros
        print(f"\n🎬 Géneros favoritos:")
        generos_avaliados = []
        for idx, nota in self.avaliacoes.items():
            if nota >= 7:  # Só os que gostou
                genero = self.bd.iloc[idx]['Genre']
                if pd.notna(genero):
                    generos_avaliados.extend([g.strip() for g in genero.split(',')])
        
        if generos_avaliados:
            top_generos = Counter(generos_avaliados).most_common(3)
            for genero, count in top_generos:
                print(f"   - {genero} ({count}x)")
        
        print(f"{'='*80}\n")
    
    def executar(self):
        """Executa fluxo completo do sistema"""
        print(f"\n{'#'*80}")
        print("🎬 BEM-VINDO AO SISTEMA DE RECOMENDAÇÃO DE FILMES!")
        print(f"{'#'*80}\n")
        
        # FASE 1: Escolha inicial (5 filmes)
        self.escolha_inicial()
        
        # FASE 2: Gerar e avaliar 25 filmes relacionados
        print(f"\n{'#'*80}")
        print("🎯 FASE 2: AVALIAÇÃO DE FILMES RELACIONADOS")
        print(f"{'#'*80}\n")
        
        print("Vou mostrar-te 25 filmes relacionados com os que escolheste.")
        print("Avalia os que já viste para melhorar as recomendações!\n")
        input("Pressiona ENTER para continuar...")
        
        filmes_relacionados = self._gerar_filmes_relacionados(n=25)
        self.mostrar_filmes_para_avaliar(filmes_relacionados)
        
        # FASE 3: Recomendações finais
        print(f"\n{'#'*80}")
        print("🎁 FASE 3: RECOMENDAÇÕES FINAIS")
        print(f"{'#'*80}\n")
        
        recomendacoes_finais = self.gerar_recomendacoes(n=20)
        self.mostrar_recomendacoes(recomendacoes_finais)
        
        # Estatísticas finais
        self.mostrar_estatisticas()
        
        print("\n👋 Obrigado por usar o sistema!")
        print("💡 Quanto mais filmes avaliares, melhores serão as recomendações!\n")


# ============================================
# EXECUTAR SISTEMA
# ============================================

if __name__ == "__main__":
    # Inicializar sistema
    sistema = SistemaRecomendacaoKNN(
        embeddings_path='movie_embeddings.npy',
        dataset_path='movies_clean.csv'
    )
    
    # Executar
    sistema.executar()