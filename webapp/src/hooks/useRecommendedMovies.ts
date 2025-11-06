import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "./useSupabase";
import { useAuth } from "@clerk/clerk-react";
import type { Item } from "./useMovies";

const ITEMS_PER_PAGE = 10;
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

  // Conta quantos filmes o usuário avaliou
  const getUserRatedCount = useCallback(async (): Promise<number> => {
    if (!userId || !supabase) return 0;

    const { count, error } = await supabase
      .from("user_movies")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Erro ao contar filmes avaliados:", error);
      return 0;
    }

    return count || 0;
  }, [supabase, userId]);

  const loadRecommendations = useCallback(
    async (page: number): Promise<RecommendedMoviesResponse> => {
      if (!userId || !supabase) {
        return { items: [], hasMore: false, needsMoreRatings: false };
      }

      const ratedCount = await getUserRatedCount();
      console.log(`Usuário avaliou ${ratedCount} filmes`);

      // Se menos de 5 → gera recomendações (mesmo que não tenha nenhuma)
      if (ratedCount < MINIMUM_RATED_MOVIES) {
        console.log("Menos de 5 filmes → chamando generate-recommendations");

        const { error: genError } = await supabase.functions.invoke("generate-recommendations");
        if (genError) {
          console.error("Falha ao gerar recomendações:", genError);
          return { items: [], hasMore: false, needsMoreRatings: true };
        }

        // Após gerar, tenta carregar
        const { data, error } = await supabase.functions.invoke("get-recommendations", {
          queryString: { page: "0" },
        });

        if (error) {
          console.error("Erro ao carregar após gerar:", error);
          return { items: [], hasMore: false, needsMoreRatings: true };
        }

        return {
          items: data.recommendations || [],
          hasMore: data.hasMore ?? false,
          needsMoreRatings: false,
        };
      }

      // Se 5 ou mais → carrega normalmente
      console.log("5 ou mais filmes → chamando get-recommendations");

      const { data, error } = await supabase.functions.invoke("get-recommendations", {
        queryString: { page: page.toString() },
      });

      if (error) {
        console.error("Erro ao carregar recomendações:", error);
        return { items: [], hasMore: false, needsMoreRatings: false };
      }

      if (data.needsMoreRatings) {
        return {
          items: [],
          hasMore: false,
          needsMoreRatings: true,
        };
      }

      return {
        items: data.recommendations || [],
        hasMore: data.hasMore ?? false,
        needsMoreRatings: false,
      };
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
    setIsLoading(false);
  }, [loadRecommendations]);

  const loadMore = async () => {
    if (!hasMore || isLoading || needsMoreRatings) return;

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
    needsMoreRatings,
    refresh,
  };
};