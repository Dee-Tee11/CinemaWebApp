import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { useSupabase } from "./useSupabase";
import type { MovieStatus, UserMovie } from "../components/MovieCard/MovieCard";

export const useUserMovies = () => {
  const { user } = useUser();
  const supabase = useSupabase();
  const [userMovies, setUserMovies] = useState<Record<string, UserMovie>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const loadUserMovies = async () => {
      setIsLoading(true);

      try {
        // Verifica se o user existe
        const { data: userData, error: userError } = await supabase
          .from("User")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (userError) {
          console.error("Error checking user:", userError);
        }

        // Se o user não existe, cria-o
        if (!userData) {
          const { error: insertError } = await supabase.from("User").insert({
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName,
            tagUser: user.username,
          });

          if (insertError) {
            console.error("Error creating user:", insertError);
          }
        }

        // Carrega os filmes do utilizador - TUDO MINÚSCULO
        const { data, error } = await supabase
          .from("user_movies")
          .select("movie_id, status, rating, review")
          .eq("user_id", user.id); // ← user_id minúsculo

        if (error) {
          console.error("Error loading user movies:", error);
          setIsLoading(false);
          return;
        }

        // Se não há dados, retorna array vazio - não é erro
        const moviesMap: Record<string, UserMovie> = {};
        data?.forEach((movie) => {
          moviesMap[movie.movie_id.toString()] = {
            status: movie.status as MovieStatus,
            rating: movie.rating,
            review: movie.review,
          };
        });

        setUserMovies(moviesMap);
      } catch (error) {
        console.error("Error loading user movies:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserMovies();
  }, [user?.id, supabase]);

  const updateMovieStatus = useCallback(
    async (movieId: string, status: MovieStatus, rating?: number) => {
      if (!user?.id) {
        console.error("User not logged in");
        return;
      }

      // Optimistic update
      setUserMovies((prev) => {
        if (status === null) {
          const newState = { ...prev };
          delete newState[movieId];
          return newState;
        }

        return {
          ...prev,
          [movieId]: {
            status,
            rating:
              status === "seen"
                ? rating ?? prev[movieId]?.rating ?? null
                : null,
            review: prev[movieId]?.review ?? null,
          },
        };
      });

      try {
        if (status === null) {
          const { error } = await supabase
            .from("user_movies")
            .delete()
            .eq("user_id", user.id) // ← user_id minúsculo
            .eq("movie_id", parseInt(movieId));

          if (error) throw error;
          return;
        }

        // Usa upsert - TUDO MINÚSCULO
        const { error } = await supabase.from("user_movies").upsert(
          {
            user_id: user.id, // ← minúsculo
            movie_id: parseInt(movieId),
            status: status, // ← minúsculo
            rating: status === "seen" ? rating : null, // ← minúsculo
          },
          {
            onConflict: "user_id,movie_id", // ← minúsculo
          }
        );

        if (error) throw error;
      } catch (error) {
        console.error("Error updating movie status:", error);
        // Reverte o estado em caso de erro
        setUserMovies((prev) => ({ ...prev }));
      }
    },
    [user?.id, supabase]
  );

  return {
    userMovies,
    updateMovieStatus,
    isLoading,
  };
};
