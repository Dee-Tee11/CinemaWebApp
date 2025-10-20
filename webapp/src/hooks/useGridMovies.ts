import { useState, useEffect } from "react";
import { useSupabase } from "./useSupabase";

export interface GridMovieItem {
  id: string;
  poster_path: string;
  backdrop_path?: string;
  title: string;
}

const GRID_ITEMS_COUNT = 28; // 4 rows × 7 columns

/**
 * Hook specifically for fetching movies to display in the GridMotion background
 * Fetches a fixed number of random movies with posters for visual display
 */
export const useGridMovies = () => {
  const supabase = useSupabase();
  const [items, setItems] = useState<GridMovieItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGridMovies = async () => {
      setIsLoading(true);

      try {
        // Fetch random movies with posters
        const { data, error } = await supabase
          .from("movies")
          .select("id, series_title, poster_url")
          .not("poster_url", "is", null) // Only movies with posters
          .limit(GRID_ITEMS_COUNT * 2); // Fetch extra to ensure we have enough

        if (error) {
          console.error("Error fetching grid movies:", error);
          setIsLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          console.warn("No movies found with posters");
          setIsLoading(false);
          return;
        }

        // Shuffle and limit to exact count needed
        const shuffled = data
          .sort(() => Math.random() - 0.5)
          .slice(0, GRID_ITEMS_COUNT);

        const formattedItems: GridMovieItem[] = shuffled.map((movie) => ({
          id: movie.id.toString(),
          poster_path: movie.poster_url,
          title: movie.series_title,
        }));

        setItems(formattedItems);
      } catch (err) {
        console.error("Unexpected error fetching grid movies:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGridMovies();
  }, []); // Run once on mount

  return { items, isLoading };
};
