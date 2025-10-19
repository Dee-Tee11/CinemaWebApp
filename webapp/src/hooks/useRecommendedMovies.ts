
import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '@clerk/clerk-react';
import type { Item } from './useMovies';

const INITIAL_LOAD = 30;
const ITEMS_PER_PAGE = 5;

export const useRecommendedMovies = () => {
  const supabase = useSupabase();
  const { userId } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRecommendedMovies = async (page: number, reset: boolean = false) => {
    if (isLoading || (!hasMore && !reset) || !userId) return;

    setIsLoading(true);
    const itemsToFetch = page === 0 ? INITIAL_LOAD : ITEMS_PER_PAGE;
    const from = page === 0 ? 0 : INITIAL_LOAD + (page - 1) * ITEMS_PER_PAGE;
    const to = from + itemsToFetch - 1;

    // 1. Fetch recommended movie IDs for the current user
    const { data: recommendationData, error: recommendationError } = await supabase
      .from('user_recommendations')
      .select('movie_id')
      .eq('user_id', userId)
      .range(from, to);

    if (recommendationError) {
      console.error('Error fetching recommendations:', recommendationError);
      setIsLoading(false);
      return;
    }

    if (!recommendationData || recommendationData.length === 0) {
      setHasMore(false);
      setIsLoading(false);
      if (reset) setItems([]);
      return;
    }

    const movieIds = recommendationData.map(r => r.movie_id);

    // 2. Fetch movie details for the recommended movie IDs
    const { data: movieData, error: movieError } = await supabase
      .from('movies')
      .select('id, series_title, poster_url, runtime, genre, imdb_rating, overview')
      .in('id', movieIds);

    if (movieError) {
      console.error('Error fetching recommended movies:', movieError);
      setIsLoading(false);
      return;
    }

    const formattedItems = movieData.map((movie, index) => {
      const heightVariations = [600, 700, 800, 850, 900, 950, 1000];
      const randomHeight = heightVariations[index % heightVariations.length];

      return {
        id: movie.id.toString(),
        img: movie.poster_url,
        url: '#',
        height: randomHeight,
        title: movie.series_title,
        time: movie.runtime,
        category: movie.genre,
        year: movie.runtime ? new Date(movie.runtime).getFullYear().toString() : '2024',
        rating: movie.imdb_rating,
        synopsis: movie.overview || 'Synopsis not available',
      };
    });

    setItems(prev => (reset ? formattedItems : [...prev, ...formattedItems]));
    setHasMore(movieData.length === itemsToFetch);
    setIsLoading(false);
  };

  useEffect(() => {
    setItems([]);
    setCurrentPage(0);
    setHasMore(true);
    fetchRecommendedMovies(0, true);
  }, [userId]);

  const loadMore = () => {
    if (hasMore && !isLoading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchRecommendedMovies(nextPage);
    }
  };

  return { items, isLoading, hasMore, loadMore };
};
