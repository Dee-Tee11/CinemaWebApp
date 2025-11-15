import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "./useSupabase";
import { useAuth } from "@clerk/clerk-react";
import type { Item } from "./useMovies";

const MINIMUM_RATED_MOVIES = 5;
const ITEMS_PER_PAGE = 10;

interface RecommendedMoviesResponse {
  items: Item[];
  hasMore: boolean;
  needsMoreRatings: boolean;
}

export const useRecommendedMovies = () => {
  const supabase = useSupabase();
  const { userId } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [needsMoreRatings, setNeedsMoreRatings] = useState(false);
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // Conta quantos filmes o usuário avaliou
  const getUserRatedCount = useCallback(async (): Promise<number> => {
    if (!userId || !supabase) return 0;

    const { count, error } = await supabase
      .from("user_movies")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("❌ Erro ao contar filmes avaliados:", error);
      return 0;
    }

    console.log(`📊 Usuário avaliou ${count || 0} filmes`);
    return count || 0;
  }, [supabase, userId]);

  const loadRecommendations = useCallback(
    async (page: number): Promise<RecommendedMoviesResponse> => {
      if (!userId || !supabase) {
        console.log("⚠️ Sem userId ou supabase");
        return { items: [], hasMore: false, needsMoreRatings: false };
      }

      console.log(`🎬 Loading Recommendations - Page ${page}`);

      try {
        const ratedCount = await getUserRatedCount();

        // Se menos de 5 → gera recomendações primeiro
        if (ratedCount < MINIMUM_RATED_MOVIES) {
          console.log(
            "⚠️ Menos de 5 filmes → chamando generate-recommendations"
          );

          // ATIVAR LOADING DO KNN
          setIsGeneratingRecommendations(true);

          const { error: genError } = await supabase.functions.invoke(
            "generate-recommendations",
            {
              body: { userId: userId },
            }
          );

          // DESATIVAR LOADING DO KNN
          setIsGeneratingRecommendations(false);

          if (genError) {
            console.error("❌ Falha ao gerar recomendações:", genError);
            return { items: [], hasMore: false, needsMoreRatings: true };
          }

          console.log("✅ Recomendações geradas com sucesso");
        }

        // Agora carrega as recomendações (método correto usando body)
        console.log(
          `📡 Calling get-recommendations with userId: ${userId}, page: ${page}`
        );

        const { data, error } = await supabase.functions.invoke(
          "get-recommendations",
          {
            body: {
              userId: userId,
              page: page,
            },
          }
        );

        if (error) {
          console.error("❌ Erro ao carregar recomendações:", error);
          return { items: [], hasMore: false, needsMoreRatings: false };
        }

        console.log("✅ Edge Function returned:", data);

        // Verifica se precisa de mais avaliações
        if (data.needsMoreRatings) {
          console.log("⚠️ Necessário avaliar mais filmes");
          return {
            items: [],
            hasMore: false,
            needsMoreRatings: true,
          };
        }

        const recommendations = data.recommendations || [];
        console.log(`✅ ${recommendations.length} recomendações carregadas`);

        return {
          items: recommendations,
          hasMore: data.hasMore ?? false,
          needsMoreRatings: false,
        };
      } catch (error) {
        console.error("❌ Erro inesperado:", error);
        setIsGeneratingRecommendations(false);
        return { items: [], hasMore: false, needsMoreRatings: false };
      }
    },
    [supabase, userId, getUserRatedCount]
  );

  const initialize = useCallback(async () => {
    console.log("🔄 Inicializando recomendações...");
    setIsLoading(true);
    
    const result = await loadRecommendations(0);
    
    setItems(result.items);
    setHasMore(result.hasMore);
    setNeedsMoreRatings(result.needsMoreRatings);
    setCurrentPage(0);
    
    // Se não tiver items e não precisar de mais avaliações, inicia polling
    if (result.items.length === 0 && !result.needsMoreRatings) {
      console.log("🔄 Iniciando polling para verificar recomendações...");
      setIsPolling(true);
    } else {
      setIsLoading(false);
    }
    
    console.log(
      `✅ Inicialização completa. ${result.items.length} items carregados.`
    );
  }, [loadRecommendations]);

  // Polling para verificar se as recomendações estão prontas
  useEffect(() => {
    if (!isPolling || !userId || !supabase) return;

    let consecutiveErrors = 0;
    const MAX_ERRORS = 3;

    const pollInterval = setInterval(async () => {
      console.log("🔍 Verificando se recomendações estão prontas...");
      
      try {
        const { data, error } = await supabase.functions.invoke(
          "get-recommendations",
          {
            body: {
              userId: userId,
              page: 0,
            },
          }
        );

        if (!error && data && data.recommendations && data.recommendations.length > 0) {
          console.log("✅ Recomendações encontradas! Parando polling.");
          setItems(data.recommendations);
          setHasMore(data.hasMore ?? false);
          setIsPolling(false);
          setIsLoading(false);
          consecutiveErrors = 0;
        } else if (error) {
          consecutiveErrors++;
          console.warn(`⚠️ Erro no polling (${consecutiveErrors}/${MAX_ERRORS}):`, error);
          
          if (consecutiveErrors >= MAX_ERRORS) {
            console.error("❌ Muitos erros consecutivos. Parando polling.");
            setIsPolling(false);
            setIsLoading(false);
          }
        }
      } catch (err) {
        consecutiveErrors++;
        console.error(`❌ Erro no polling (${consecutiveErrors}/${MAX_ERRORS}):`, err);
        
        if (consecutiveErrors >= MAX_ERRORS) {
          console.error("❌ Muitos erros consecutivos. Parando polling.");
          setIsPolling(false);
          setIsLoading(false);
        }
      }
    }, 3000); // Verifica a cada 3 segundos

    // Timeout de 45 segundos
    const timeoutId = setTimeout(() => {
      console.log("⏱️ Timeout do polling atingido");
      setIsPolling(false);
      setIsLoading(false);
    }, 45000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeoutId);
    };
  }, [isPolling, userId, supabase]);

  const loadMore = async () => {
    if (!hasMore || isLoading || needsMoreRatings) {
      console.log("⏹️ LoadMore bloqueado:", {
        hasMore,
        isLoading,
        needsMoreRatings,
      });
      return;
    }

    console.log("📄 Carregando mais recomendações...");
    setIsLoading(true);
    const nextPage = currentPage + 1;
    const result = await loadRecommendations(nextPage);

    if (result.items.length > 0) {
      setItems((prev) => [...prev, ...result.items]);
      setCurrentPage(nextPage);
      setHasMore(result.hasMore);
      setNeedsMoreRatings(result.needsMoreRatings);
      console.log(`✅ ${result.items.length} novos items adicionados`);
    } else {
      setHasMore(false);
      console.log("⏹️ Sem mais recomendações");
    }
    setIsLoading(false);
  };

  const refresh = async () => {
    console.log("🔄 Refresh solicitado");
    setCurrentPage(0);
    setItems([]);
    await initialize();
  };

  useEffect(() => {
    if (userId) {
      console.log("👤 UserId detectado:", userId);
      initialize();
    } else {
      console.log("⚠️ Sem userId");
      setItems([]);
      setHasMore(false);
      setNeedsMoreRatings(false);
      setIsLoading(false);
    }
  }, [userId, initialize]);

  return {
    items,
    isLoading,
    hasMore,
    loadMore,
    needsRecommendations: needsMoreRatings,
    refresh,
    isGeneratingRecommendations,
  };
};