import { useState, useEffect, useCallback } from 'react';
import { useSupabase } from './useSupabase';

export interface Item {
  id: string;
  img: string;
  url: string;
  height: number;
  title?: string;
  time?: string;
  category?: string;
  year?: string;
  rating?: number;
  synopsis?: string;
}

const INITIAL_LOAD = 30;
const ITEMS_PER_PAGE = 5;

/**
 * The useMovies hook is designed to be a reusable piece of logic for fetching movies.
 * It receives the activeView, selectedCategory, and searchQuery as parameters, which allows it to be used in different contexts with different views.
 * The activeView state is managed in the component that uses this hook (e.g., Home.tsx) because it is part of the UI logic of that component.
 * This is a good example of separation of concerns, where the component is responsible for rendering the UI and managing the UI state, while the hook is responsible for fetching and providing the data.
 */

/**
 * @param activeView The current active view.
 * @param selectedCategory The current selected category.
 * @param searchQuery The current search query.
 * @returns An object containing the items, isLoading, hasMore, and loadMore function.
 */
export const useMovies = (activeView: string, selectedCategory?: string, searchQuery?: string) => {
  const supabase = useSupabase();
  const [items, setItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMovies = async (page: number, reset: boolean = false) => {
    if (isLoading || (!hasMore && !reset)) return;

    setIsLoading(true);
    const itemsToFetch = page === 0 ? INITIAL_LOAD : ITEMS_PER_PAGE;
    const from = page === 0 ? 0 : INITIAL_LOAD + (page - 1) * ITEMS_PER_PAGE;
    const to = from + itemsToFetch - 1;

    let query = supabase
      .from('movies')
      .select('id, series_title, poster_url, runtime, genre, imdb_rating, overview');

    if (searchQuery && searchQuery.trim()) {
      const searchTerm = searchQuery.trim();
      query = query.or(`series_title.ilike.%${searchTerm}%`);
    }

    if (activeView === 'explore' && selectedCategory && !searchQuery) {
      query = query.ilike('genre', `%${selectedCategory}%`);
    }

    const { data, error } = await query.range(from, to);

    if (error) {
      console.error('Error fetching movies:', error);
      setIsLoading(false);
      return;
    }

    const formattedItems = data.map((movie, index) => {
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

    setItems(prev => {
      const existingIds = new Set(prev.map(item => item.id));
      const newItems = formattedItems.filter(item => !existingIds.has(item.id));
      return reset ? newItems : [...prev, ...newItems];
    });
    setHasMore(data.length === itemsToFetch);
    setIsLoading(false);
  };

  useEffect(() => {
    setItems([]);
    setCurrentPage(0);
    setHasMore(true);
    fetchMovies(0, true);
  }, [activeView, selectedCategory, searchQuery]);

  const loadMore = () => {
    if (hasMore && !isLoading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchMovies(nextPage);
    }
  };

  return { items, isLoading, hasMore, loadMore };
};