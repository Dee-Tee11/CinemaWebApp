import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '@clerk/clerk-react';
import type { Item } from './useMovies';

const INITIAL_LOAD = 30;
const ITEMS_PER_PAGE = 10;

export const useRecommendedMovies = () => {
  const supabase = useSupabase();
  const { userId } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [needsRecommendations, setNeedsRecommendations] = useState(false);

  const triggerRecommendationGeneration = async () => {
    if (!userId) return;
    console.log('Triggering recommendation generation for user:', userId);
    try {
      await fetch(`http://127.0.0.1:8000/generate-recommendations/${userId}`, {
        method: 'POST',
      });
      // After triggering, you might want to refetch or wait for a webhook/notification
      // For now, we can just set a message and the user can refresh later.
      setNeedsRecommendations(false); // Reset the state
    } catch (error) {
      console.error('Error triggering recommendation generation:', error);
    }
  };

  const fetchRecommendedMovies = useCallback(async (page: number, reset: boolean = false) => {
    if (isLoading || (!hasMore && !reset) || !userId) return;

    setIsLoading(true);
    if (reset) {
        setItems([]);
        setCurrentPage(0);
        setHasMore(true);
    }

    // 1. Fetch a page of recommendations
    const { data: recommendationData, error: recommendationError } = await supabase
      .from('user_recommendations')
      .select('movie_id')
      .eq('user_id', userId)
      .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

    if (recommendationError) {
      console.error('Error fetching recommendations:', recommendationError);
      setIsLoading(false);
      return;
    }

    // If we get recommendations for the current page
    if (recommendationData && recommendationData.length > 0) {
      const movieIds = recommendationData.map(r => r.movie_id);
      const { data: movieData, error: movieError } = await supabase
        .from('movies')
        .select('id, series_title, poster_url, runtime, genre, imdb_rating, overview')
        .in('id', movieIds);

      if (movieError) {
        console.error('Error fetching recommended movies:', movieError);
        setIsLoading(false);
        return;
      }

      const formattedItems = movieData.map((movie, index) => ({
        id: movie.id.toString(),
        img: movie.poster_url,
        url: '#',
        height: [600, 700, 800, 850, 900, 950, 1000][index % 7],
        title: movie.series_title,
        time: movie.runtime,
        category: movie.genre,
        year: movie.runtime ? new Date(movie.runtime).getFullYear().toString() : '2024',
        rating: movie.imdb_rating,
        synopsis: movie.overview || 'Synopsis not available',
      }));

      setItems(prev => (reset ? formattedItems : [...prev, ...formattedItems]));
      setHasMore(movieData.length === ITEMS_PER_PAGE);
      setIsLoading(false);
    }
    // If we get NO recommendations for the current page
    else {
        // If it was the first page (page === 0), it means there are no recommendations at all.
        // Now we check if we need to generate them.
        if (page === 0) {
            const { data: userMovies, error: userMoviesError } = await supabase
                .from('user_movies')
                .select('movie_id', { count: 'exact' })
                .eq('user_id', userId);

            if (userMoviesError) {
                console.error('Error fetching user movies count:', userMoviesError);
            } else if (userMovies.length >= 5) {
                await triggerRecommendationGeneration();
                setNeedsRecommendations(false);
            } else {
                setNeedsRecommendations(true);
            }
            setItems([]); // Make sure items is empty
        }
        // If it wasn't the first page, it just means we've reached the end of the list.
        setHasMore(false);
        setIsLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    fetchRecommendedMovies(0, true);
  }, [userId, fetchRecommendedMovies]);

  const loadMore = () => {
    if (hasMore && !isLoading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchRecommendedMovies(nextPage, false);
    }
  };

  return { items, isLoading, hasMore, loadMore, needsRecommendations };
};