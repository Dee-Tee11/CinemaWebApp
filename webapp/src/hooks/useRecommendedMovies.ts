import { useState, useEffect } from "react";
import { useSupabase } from "./useSupabase";
import { useAuth } from "@clerk/clerk-react";
import type { Item } from "./useMovies";

const ITEMS_PER_PAGE = 20;
const INITIAL_LOAD = 20;

export const useRecommendedMovies = () => {
  const supabase = useSupabase();
  const { userId, getToken } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [needsRecommendations, setNeedsRecommendations] = useState(false);

  // Get Supabase URL from environment
  const getSupabaseUrl = () => {
    return import.meta.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
  };

  const triggerRecommendationGeneration = async () => {
    if (!userId) return;

    console.log("🚀 Triggering recommendation generation for user:", userId);

    try {
      const supabaseUrl = getSupabaseUrl();
      const token = await getToken({ template: "supabase" });

      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-recommendations`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate recommendations");
      }

      const result = await response.json();
      console.log("✅ Recommendation generation successful:", result);

      return result;
    } catch (error) {
      console.error("❌ Error triggering recommendation generation:", error);
      throw error;
    }
  };

  const loadRecommendations = async (page: number) => {
    if (!userId) return [];

    try {
      const supabaseUrl = getSupabaseUrl();
      const token = await getToken({ template: "supabase" });

      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-recommendations?page=${page}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error fetching recommendations:", errorData);
        return [];
      }

      const result = await response.json();
      return result.movies || [];
    } catch (error) {
      console.error("❌ Error loading recommendations:", error);
      return [];
    }
  };

  const checkAndGenerateRecommendations = async () => {
    if (!userId) return;

    // Step 1: Verify user exists and has completed onboarding
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("onboarding_status")
      .eq("id", userId)
      .single();

    if (userError) {
      console.error("❌ Error fetching user data:", userError);
      return;
    }

    // Only generate if onboarding is completed
    if (
      userData?.onboarding_status !== "completed" &&
      userData?.onboarding_status !== "skipped"
    ) {
      console.log("⚠️ User has not completed onboarding");
      return;
    }

    // Step 2: Check if user has at least 5 rated movies
    const { data: userMovies, error: userMoviesError } = await supabase
      .from("user_movies")
      .select("movie_id", { count: "exact" })
      .eq("user_id", userId)
      .not("rating", "is", null);

    if (userMoviesError) {
      console.error("❌ Error fetching user movies count:", userMoviesError);
      return;
    }

    if (userMovies && userMovies.length >= 5) {
      // User has enough rated movies, trigger generation
      console.log(`✅ User has ${userMovies.length} rated movies, generating recommendations...`);
      try {
        await triggerRecommendationGeneration();
        setNeedsRecommendations(false);

        // Wait a bit for recommendations to be generated, then reload
        setTimeout(async () => {
          const movies = await loadRecommendations(0);
          if (movies.length > 0) {
            setItems(movies);
            setHasMore(movies.length === ITEMS_PER_PAGE);
            setIsLoading(false);
          }
        }, 2000);
      } catch (error) {
        console.error("❌ Failed to generate recommendations:", error);
        setIsLoading(false);
      }
    } else {
      // User needs to rate more movies
      setNeedsRecommendations(true);
      setIsLoading(false);
      console.log(
        `⚠️ User has only ${userMovies?.length || 0} rated movies, needs 5`
      );
    }
  };

  const initializeRecommendations = async () => {
    if (!userId) return;

    setIsLoading(true);

    // Step 1: Verify user exists and check onboarding status
    const { data: userData, error: userError } = await supabase
      .from("User")
      .select("onboarding_status")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      console.error("❌ Error fetching user data:", userError);
      setIsLoading(false);
      return;
    }

    // Step 2: Only proceed if onboarding is completed
    if (
      userData.onboarding_status !== "completed" &&
      userData.onboarding_status !== "skipped"
    ) {
      console.log("⚠️ User has not completed onboarding, skipping recommendations");
      setIsLoading(false);
      return;
    }

    // Step 3: Try to load existing recommendations
    const movies = await loadRecommendations(0);

    if (movies.length > 0) {
      // We have recommendations, show them
      console.log(`✅ Loaded ${movies.length} recommendations`);
      setItems(movies);
      setHasMore(movies.length === ITEMS_PER_PAGE);
      setNeedsRecommendations(false);
      setIsLoading(false);
    } else {
      // No recommendations exist, check if we should generate them
      console.log("⚠️ No recommendations found, checking if we should generate...");
      await checkAndGenerateRecommendations();
    }
  };

  const loadMore = async () => {
    if (!hasMore || isLoading || !userId) return;

    setIsLoading(true);
    const nextPage = currentPage + 1;

    console.log(`📄 Loading more recommendations (page ${nextPage})...`);

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
      console.log(`✅ Loaded ${newMovies.length} more movies`);
    } else {
      setHasMore(false);
      console.log("⚠️ No more recommendations available");
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