import { useState, useEffect } from "react";
import { useSupabase } from "./useSupabase";
import { useAuth } from "@clerk/clerk-react";
import type { Item } from "./useMovies";

const ITEMS_PER_PAGE = 10;

export const useRecommendedMovies = () => {
  const supabase = useSupabase();
  const { userId, getToken } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [needsRecommendations, setNeedsRecommendations] = useState(false);

  const triggerRecommendationGeneration = async () => {
    if (!userId) {
      console.error("No userId available");
      return;
    }
    
    console.log("=== TRIGGERING RECOMMENDATION GENERATION ===");
    console.log("User ID:", userId);
    
    try {
      // Get authentication token
      const token = await getToken({ template: "supabase" });
      console.log("Token exists:", !!token);
      console.log("Token preview:", token?.substring(0, 50) + "...");
      
      if (!token) {
        console.error("Authentication token not found");
        return;
      }

      // Get Supabase URL and anon key from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      console.log("Supabase URL:", supabaseUrl);
      console.log("Anon Key exists:", !!supabaseAnonKey);

      const url = `${supabaseUrl}/functions/v1/get-recommendations`;
      console.log("Calling edge function at:", url);

      // Call edge function
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
        },
      });

      console.log("Response status:", response.status);
      console.log("Response statusText:", response.statusText);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log("Response text:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log("Parsed response data:", data);
      } catch (e) {
        console.error("Failed to parse response as JSON:", e);
        throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok) {
        console.error("Edge function returned error:", data);
        throw new Error(data?.error || `Server error: ${response.status}`);
      }

      console.log("✅ Recommendation generation triggered successfully:", data);
      console.log("===========================================");
    } catch (error) {
      console.error("❌ Error triggering recommendation generation:", error);
      console.log("===========================================");
      throw error;
    }
  };

  const loadRecommendations = async (page: number) => {
    if (!userId) return [];

    const { data: recommendationData, error: recommendationError } =
      await supabase
        .from("user_recommendations")
        .select("movie_id")
        .eq("user_id", userId)
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

    if (recommendationError) {
      console.error("Error fetching recommendations:", recommendationError);
      return [];
    }

    if (!recommendationData || recommendationData.length === 0) {
      return [];
    }

    const movieIds = recommendationData.map((r) => r.movie_id);
    const { data: movieData, error: movieError } = await supabase
      .from("movies")
      .select(
        "id, series_title, poster_url, runtime, genre, imdb_rating, overview"
      )
      .in("id", movieIds);

    if (movieError) {
      console.error("Error fetching recommended movies:", movieError);
      return [];
    }

    return movieData.map((movie, index) => ({
      id: movie.id.toString(),
      img: movie.poster_url,
      url: "#",
      height: [600, 700, 800, 850, 900, 950, 1000][index % 7],
      title: movie.series_title,
      time: movie.runtime,
      category: movie.genre,
      year: movie.runtime
        ? new Date(movie.runtime).getFullYear().toString()
        : "2024",
      rating: movie.imdb_rating,
      synopsis: movie.overview || "Synopsis not available",
    }));
  };

  const checkAndGenerateRecommendations = async () => {
    if (!userId) return;

    // Check if user has at least 5 rated movies
    const { data: userMovies, error: userMoviesError } = await supabase
      .from("user_movies")
      .select("movie_id", { count: "exact" })
      .eq("user_id", userId);

    if (userMoviesError) {
      console.error("Error fetching user movies count:", userMoviesError);
      return;
    }

    if (userMovies && userMovies.length >= 5) {
      // User has enough rated movies, trigger generation
      await triggerRecommendationGeneration();
      setNeedsRecommendations(false);
    } else {
      // User needs to rate more movies
      setNeedsRecommendations(true);
    }
  };

  const initializeRecommendations = async () => {
    if (!userId) return;

    setIsLoading(true);

    // Step 1: Check if recommendations exist
    const movies = await loadRecommendations(0);

    if (movies.length > 0) {
      // We have recommendations, show them
      setItems(movies);
      setHasMore(movies.length === ITEMS_PER_PAGE);
      setNeedsRecommendations(false);
    } else {
      // No recommendations exist, check if we should generate them
      await checkAndGenerateRecommendations();
      setItems([]);
      setHasMore(false);
    }

    setIsLoading(false);
  };

  const loadMore = async () => {
    if (!hasMore || isLoading || !userId) return;

    setIsLoading(true);
    const nextPage = currentPage + 1;

    const newMovies = await loadRecommendations(nextPage);

    if (newMovies.length > 0) {
      setItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const filteredNewMovies = newMovies.filter(
          (item) => !existingIds.has(item.id)
        );
        return [...prev, ...filteredNewMovies];
      });
      setCurrentPage(nextPage);
      setHasMore(newMovies.length === ITEMS_PER_PAGE);
    } else {
      setHasMore(false);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    initializeRecommendations();
  }, [userId]);

  return {
    items,
    isLoading,
    hasMore,
    loadMore,
    needsRecommendations,
  };
};