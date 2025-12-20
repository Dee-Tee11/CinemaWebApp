import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "./useSupabase";
import { useAuth } from "@clerk/clerk-react";
import type { Item } from "./useMovies";

const MINIMUM_RATED_MOVIES = 5;

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

      return 0;
    }


    return count || 0;
  }, [supabase, userId]);

  const loadRecommendations = useCallback(
    async (page: number): Promise<RecommendedMoviesResponse> => {
      if (!userId || !supabase) {

        return { items: [], hasMore: false, needsMoreRatings: false };
      }



      try {
        const ratedCount = await getUserRatedCount();
        console.log(`[Recommendations] User has rated ${ratedCount} movies`);

        // Se menos de 5 → gera recomendações primeiro
        if (ratedCount < MINIMUM_RATED_MOVIES) {
          console.log(`[Recommendations] Need more ratings (${ratedCount}/${MINIMUM_RATED_MOVIES})`);

          // ATIVAR LOADING DO KNN
          setIsGeneratingRecommendations(true);

          console.log(`[Recommendations] Calling generate-recommendations for user ${userId}`);
          const { error: genError } = await supabase.functions.invoke(
            "generate-recommendations",
            {
              body: { userId: userId },
            }
          );

          // DESATIVAR LOADING DO KNN
          setIsGeneratingRecommendations(false);

          if (genError) {
            console.error(`[Recommendations] Error generating:`, genError);
            return { items: [], hasMore: false, needsMoreRatings: true };
          }

          console.log(`[Recommendations] Generation successful`);
        }

        // Agora carrega as recomendações (método correto usando body)
        console.log(`[Recommendations] Fetching recommendations page ${page}`);

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
          console.error(`[Recommendations] Error fetching:`, error);
          return { items: [], hasMore: false, needsMoreRatings: false };
        }

        console.log(`[Recommendations] Fetched data:`, data);

        // Verifica se precisa de mais avaliações
        if (data.needsMoreRatings) {

          return {
            items: [],
            hasMore: false,
            needsMoreRatings: true,
          };
        }

        const recommendations = data.recommendations || [];


        return {
          items: recommendations,
          hasMore: data.hasMore ?? false,
          needsMoreRatings: false,
        };
      } catch (error) {

        setIsGeneratingRecommendations(false);
        return { items: [], hasMore: false, needsMoreRatings: false };
      }
    },
    [supabase, userId, getUserRatedCount]
  );

  const initialize = useCallback(async () => {

    setIsLoading(true);

    const result = await loadRecommendations(0);

    setItems(result.items);
    setHasMore(result.hasMore);
    setNeedsMoreRatings(result.needsMoreRatings);
    setCurrentPage(0);

    // Se não tiver items e não precisar de mais avaliações, inicia polling
    if (result.items.length === 0 && !result.needsMoreRatings) {

      setIsPolling(true);
    } else {
      setIsLoading(false);
    }


  }, [loadRecommendations]);

  // Polling para verificar se as recomendações estão prontas
  useEffect(() => {
    if (!isPolling || !userId || !supabase) return;

    console.log(`[Recommendations] Starting polling for user ${userId}`);
    let consecutiveErrors = 0;
    const MAX_ERRORS = 3;

    const pollInterval = setInterval(async () => {
      console.log(`[Recommendations] Polling attempt...`);

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
          console.log(`[Recommendations] Polling found ${data.recommendations.length} recommendations`);
          setItems(data.recommendations);
          setHasMore(data.hasMore ?? false);
          setIsPolling(false);
          setIsLoading(false);
          consecutiveErrors = 0;
        } else if (error) {
          consecutiveErrors++;
          console.error(`[Recommendations] Polling error (${consecutiveErrors}/${MAX_ERRORS}):`, error);

          if (consecutiveErrors >= MAX_ERRORS) {
            console.error(`[Recommendations] Max polling errors reached, stopping`);
            setIsPolling(false);
            setIsLoading(false);
          }
        }
      } catch (err) {
        consecutiveErrors++;
        console.error(`[Recommendations] Polling exception (${consecutiveErrors}/${MAX_ERRORS}):`, err);

        if (consecutiveErrors >= MAX_ERRORS) {
          console.error(`[Recommendations] Max polling errors reached, stopping`);
          setIsPolling(false);
          setIsLoading(false);
        }
      }
    }, 3000);

    console.log(`[Recommendations] Polling will timeout in 45s`);
    const timeoutId = setTimeout(() => {
      console.warn(`[Recommendations] Polling timeout reached`);
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

      return;
    }


    setIsLoading(true);
    const nextPage = currentPage + 1;
    const result = await loadRecommendations(nextPage);

    if (result.items.length > 0) {
      setItems((prev) => [...prev, ...result.items]);
      setCurrentPage(nextPage);
      setHasMore(result.hasMore);
      setNeedsMoreRatings(result.needsMoreRatings);

    } else {
      setHasMore(false);

    }
    setIsLoading(false);
  };

  const refresh = async () => {

    setCurrentPage(0);
    setItems([]);
    await initialize();
  };

  useEffect(() => {
    if (userId) {

      initialize();
    } else {

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
    isPolling,
  };
};
