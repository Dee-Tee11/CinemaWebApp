import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "./useSupabase";
import { useAuth } from "@clerk/clerk-react";
import type { Item } from "./useMovies";
import type { MovieStatus } from "../components/MovieCard/MovieCard";

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

  // Fetch counts
  const fetchCounts = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("user_movies")
        .select("status")
        .eq("user_id", userId);

      if (error) {
        console.error("❌ Error fetching counts:", error);
        return;
      }

      const newCounts = {
        saved: data?.filter((m) => m.status === "saved").length || 0,
        watching: data?.filter((m) => m.status === "watching").length || 0,
        seen: data?.filter((m) => m.status === "seen").length || 0,
      };

      setCounts(newCounts);
      console.log("📊 My Movies Counts:", newCounts);
    } catch (err) {
      console.error("❌ Error:", err);
    }
  };

  // Load movies
  const loadMyMovies = async (page: number): Promise<Item[]> => {
    if (!userId) return [];

    try {
      console.log(`🎬 Loading My Movies - Page ${page}, Filter: ${statusFilter || 'all'}`);

      // 1️⃣ Buscar user_movies
      let userMoviesQuery = supabase
        .from("user_movies")
        .select("user_id, movie_id, status, rating, created_at")
        .eq("user_id", userId);

      if (statusFilter) {
        console.log('🎯 Filtering by status:', statusFilter);
        userMoviesQuery = userMoviesQuery.eq("status", statusFilter);
      }

      userMoviesQuery = userMoviesQuery
        .order("created_at", { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      const { data: userMoviesData, error: userMoviesError } = await userMoviesQuery;

      if (userMoviesError) {
        console.error("❌ Error fetching user_movies:", userMoviesError);
        return [];
      }

      if (!userMoviesData || userMoviesData.length === 0) {
        console.log("⚠️ No user_movies found");
        return [];
      }

      console.log(`✅ Found ${userMoviesData.length} user_movies`);

      // 2️⃣ Extrair IDs únicos
      const movieIds = [...new Set(userMoviesData.map((um: any) => um.movie_id))];
      console.log(`🎥 Fetching ${movieIds.length} unique movies`);

      // 3️⃣ Buscar informações dos filmes (SEM released_year)
      const { data: moviesData, error: moviesError } = await supabase
        .from('movies')
        .select('id, series_title, poster_url, runtime, genre, imdb_rating, overview')
        .in('id', movieIds);

      if (moviesError) {
        console.error("❌ Error fetching movies:", moviesError);
        return [];
      }

      if (!moviesData || moviesData.length === 0) {
        console.log("⚠️ No movies found");
        return [];
      }

      console.log(`✅ Movies data fetched: ${moviesData.length}`);

      // 4️⃣ Aplicar search se existir
      let filteredMovies = moviesData;
      
      if (searchQuery && searchQuery.trim()) {
        console.log('🔍 Applying search filter:', searchQuery);
        const searchLower = searchQuery.toLowerCase().trim();
        filteredMovies = moviesData.filter((movie: any) => 
          movie.series_title?.toLowerCase().includes(searchLower)
        );
        console.log(`🔍 After search: ${filteredMovies.length} movies`);
      }

      // 5️⃣ Formatar filmes
      const formattedMovies = filteredMovies.map((movie: any, index: number) => ({
        id: movie.id.toString(),
        img: movie.poster_url || '',
        url: '#',
        height: [600, 700, 800, 850, 900, 950, 1000][index % 7],
        title: movie.series_title || 'Untitled',
        time: movie.runtime || '',
        category: movie.genre || 'Uncategorized',
        year: 'N/A', // Temporário até teres a coluna certa
        rating: movie.imdb_rating || 0,
        synopsis: movie.overview || 'Synopsis not available',
      }));

      console.log('✅ Formatted movies:', formattedMovies.length);
      return formattedMovies;

    } catch (error) {
      console.error("❌ Unexpected error:", error);
      return [];
    }
  };

  // Initialize
  const initializeMyMovies = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    console.log('🚀 Initializing My Movies...');
    setIsLoading(true);
    
    await fetchCounts();
    const movies = await loadMyMovies(0);
    
    setItems(movies);
    setCurrentPage(0);
    setHasMore(movies.length === ITEMS_PER_PAGE);
    setIsLoading(false);
    
    console.log(`✅ Init complete. ${movies.length} movies loaded`);
  }, [userId, statusFilter, searchQuery]);

  // Load more
  const loadMore = async () => {
    if (!hasMore || isLoading || !userId) return;

    setIsLoading(true);
    const nextPage = currentPage + 1;

    const newMovies = await loadMyMovies(nextPage);

    if (newMovies.length > 0) {
      setItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const filtered = newMovies.filter((item) => !existingIds.has(item.id));
        return [...prev, ...filtered];
      });
      setCurrentPage(nextPage);
      setHasMore(newMovies.length === ITEMS_PER_PAGE);
    } else {
      setHasMore(false);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    initializeMyMovies();
  }, [initializeMyMovies]);

  return {
    items,
    isLoading,
    hasMore,
    loadMore,
    refresh: initializeMyMovies,
    counts,
  };
};