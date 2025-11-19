import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '@clerk/clerk-react';
import type { Item } from './useMovies';
import type { MovieStatus } from '../components/MovieCard/MovieCard';

const ITEMS_PER_PAGE = 20;

interface UseMyMoviesReturn {
  items: Item[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  counts: {
    saved: number;
    watching: number;
    seen: number;
  };
}

export const useMyMovies = (
  statusFilter?: MovieStatus,
  searchQuery?: string
): UseMyMoviesReturn => {
  const supabase = useSupabase();
  const { userId } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [counts, setCounts] = useState({ saved: 0, watching: 0, seen: 0 });

  const loadMovies = useCallback(async (page: number) => {
    if (!userId || !supabase) return { movies: [], counts: counts };

    try {
      const { data, error } = await supabase.functions.invoke('get-user-movies', {
        queryString: {
          page: page.toString(),
          ...(statusFilter && { statusFilter }),
          ...(searchQuery && { searchQuery }),
        },
      });

      if (error) {
        return { movies: [], counts: counts };
      }

      return data;

    } catch (error) {
      return { movies: [], counts: counts };
    }
  }, [userId, supabase, statusFilter, searchQuery]);


  const initialize = useCallback(async () => {
    setIsLoading(true);
    const { movies, counts: newCounts } = await loadMovies(0);
    setItems(movies);
    setCounts(newCounts);
    setCurrentPage(0);
    setHasMore(movies.length === ITEMS_PER_PAGE);
    setIsLoading(false);
  }, [loadMovies]);

  const loadMore = async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    const nextPage = currentPage + 1;
    const { movies: newMovies } = await loadMovies(nextPage);

    if (newMovies.length > 0) {
      setItems((prev) => [...prev, ...newMovies]);
      setCurrentPage(nextPage);
      setHasMore(newMovies.length === ITEMS_PER_PAGE);
    } else {
      setHasMore(false);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (userId) {
      initialize();
    }
  }, [userId, initialize]);

  return {
    items,
    isLoading,
    hasMore,
    loadMore,
    refresh: initialize,
    counts,
  };
};
