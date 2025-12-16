import { useState, useEffect } from "react";
import { useSupabase } from "./useSupabase";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

interface Movie {
  id: number;
  series_title: string;
  genre: string;
  poster_url: string;
  imdb_rating: number;
  runtime?: string;
  overview?: string;
}

interface Rating {
  movieId: number;
  rating: number;
}

type Phase = "welcome" | "initial-selection" | "rate-related" | "complete";

export const useOnboarding = () => {
  const supabase = useSupabase();
  const { userId } = useAuth();
  const navigate = useNavigate();

  // Phase management
  const [currentPhase, setCurrentPhase] = useState<Phase>("welcome");

  // Movie data
  const [availableMovies, setAvailableMovies] = useState<Movie[]>([]);
  const [relatedMovies, setRelatedMovies] = useState<Movie[]>([]);
  const [selectedMovies, setSelectedMovies] = useState<Set<number>>(new Set());

  // Rating state
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRatingSelector, setShowRatingSelector] = useState(false);
  const [tempRating, setTempRating] = useState(10);

  // Search state for rating phase
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search state for selection phase
  const [selectionSearchQuery, setSelectionSearchQuery] = useState("");
  const [selectionSearchResults, setSelectionSearchResults] = useState<Movie[]>([]);
  const [isSelectionSearching, setIsSelectionSearching] = useState(false);
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch initial movies for selection (Phase 1)
  useEffect(() => {
    const fetchInitialMovies = async () => {
      setLoading(true);
      try {
        // Buscar 50 filmes populares ordenados por rating
        const { data, error } = await supabase
          .from("movies")
          .select(
            "id, series_title, genre, poster_url, imdb_rating, runtime"
          )
          .not("poster_url", "is", null)
          .gte("imdb_rating", 7.0)
          .order("imdb_rating", { ascending: false })
          .limit(50);

        if (error) throw error;

        if (data) {
          setAvailableMovies(data);
        }
      } catch (err) {
        console.error("Error fetching initial movies:", err);
        setError("Failed to load movies. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialMovies();
  }, []);

  // Search movies
  const searchMovies = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("movies")
        .select(
          "id, series_title, genre, poster_url, imdb_rating, runtime"
        )
        .not("poster_url", "is", null)
        .ilike("series_title", `%${query}%`)
        .limit(10);

      if (error) throw error;

      // Filtrar filmes que já estão na lista de related movies
      const existingIds = new Set(relatedMovies.map(m => m.id));
      const filtered = data?.filter(m => !existingIds.has(m.id)) || [];

      setSearchResults(filtered);
    } catch (err) {
      console.error("Error searching movies:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Search movies for selection phase (searches ALL movies)
  const searchMoviesForSelection = async (query: string) => {
    if (!query.trim()) {
      setSelectionSearchResults([]);
      return;
    }

    setIsSelectionSearching(true);
    try {
      const { data, error } = await supabase
        .from("movies")
        .select(
          "id, series_title, genre, poster_url, imdb_rating, runtime"
        )
        .not("poster_url", "is", null)
        .or(`series_title.ilike.%${query}%,genre.ilike.%${query}%`)
        .order("imdb_rating", { ascending: false })
        .limit(50);

      if (error) throw error;
      setSelectionSearchResults(data || []);
    } catch (err) {
      console.error("Error searching movies for selection:", err);
    } finally {
      setIsSelectionSearching(false);
    }
  };

  // Add searched movie to rating list (replaces current movie)
  const addSearchedMovie = (movie: Movie) => {
    // Substituir o filme atual pelo filme pesquisado
    console.log("Adding searched movie:", movie.series_title, movie.id);
    setRelatedMovies(prev => {
      const newMovies = [...prev];
      newMovies[currentIndex] = movie;
      console.log("Updated relatedMovies at index", currentIndex, newMovies);
      return newMovies;
    });

    // Remover rating do filme anterior (se existir)
    const previousMovieId = relatedMovies[currentIndex]?.id;
    if (previousMovieId) {
      console.log("Removing previous rating for movie:", previousMovieId);
      setRatings(prev => prev.filter(r => r.movieId !== previousMovieId));
    }

    // Limpar pesquisa
    setSearchQuery("");
    setSearchResults([]);

    // Fechar o seletor de rating se estiver aberto
    setShowRatingSelector(false);
  };
  // Handle movie selection (min 5)
  const handleMovieSelect = (movieId: number) => {
    setSelectedMovies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(movieId)) {
        newSet.delete(movieId);
      } else {
        newSet.add(movieId);
      }
      return newSet;
    });
  };

  // Generate related movies based on selected ones (Phase 2)
  const handlePhase1Complete = async () => {
    if (selectedMovies.size < 5) {
      setError("Please select at least 5 movies");
      return;
    }

    setLoading(true);
    try {
      // Buscar os géneros dos filmes selecionados
      const selectedMoviesList = availableMovies.filter((m) =>
        selectedMovies.has(m.id)
      );

      // Contar a ocorrência de cada género
      const genreCounts = new Map<string, number>();
      selectedMoviesList.forEach((movie) => {
        movie.genre.split(",").forEach((g) => {
          const genre = g.trim();
          genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
        });
      });

      // Ordenar os géneros por contagem e pegar os 3 mais proeminentes
      const sortedGenres = Array.from(genreCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map((entry) => entry[0]);

      const top3Genres = sortedGenres.slice(0, 3);

      // Buscar filmes relacionados baseados nos géneros
      const genreArray = top3Genres;
      const { data, error } = await supabase
        .from("movies")
        .select(
          "id, series_title, genre, poster_url, imdb_rating, runtime"
        )
        .not("poster_url", "is", null)
        .gte("imdb_rating", 6.5)
        .not("id", "in", `(${Array.from(selectedMovies).join(",")})`)
        .or(genreArray.map((g) => `genre.ilike.%${g}%`).join(","))
        .order("imdb_rating", { ascending: false })
        .limit(25);

      if (error) throw error;

      if (data && data.length > 0) {
        const topMovies = data.slice(0, 25);
        setRelatedMovies(topMovies);
        setCurrentPhase("rate-related");
      } else {
        throw new Error("No related movies found");
      }
    } catch (err) {
      console.error("Error generating related movies:", err);
      setError("Failed to load related movies. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Skip onboarding and save status to DB
  const handleSkipOnboarding = async () => {
    if (!userId || !supabase) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("User")
        .update({ onboarding_status: "skipped" })
        .eq("id", userId);

      if (error) throw error;

      navigate("/", { replace: true });
    } catch (err) {
      console.error("Error skipping onboarding:", err);
      setError("Failed to update your status. Please try again.");
      setLoading(false);
    }
  };

  // Rating handlers
  const handleRateClick = () => {
    const currentMovie = relatedMovies[currentIndex];
    const existingRating = ratings.find((r) => r.movieId === currentMovie.id);
    setTempRating(existingRating?.rating || 10);
    setShowRatingSelector(true);
  };

  const handleConfirmRating = () => {
    const currentMovie = relatedMovies[currentIndex];
    setRatings((prev) => {
      const filtered = prev.filter((r) => r.movieId !== currentMovie.id);
      return [...filtered, { movieId: currentMovie.id, rating: tempRating }];
    });
    setShowRatingSelector(false);
  };

  // Navigation
  const handleNext = async () => {
    const isLastMovie = currentIndex === relatedMovies.length - 1;

    if (isLastMovie) {
      await handleComplete();
    } else {
      setCurrentIndex((prev) => prev + 1);
      setShowRatingSelector(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setShowRatingSelector(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  // Complete onboarding - save all data, mark as complete, and trigger recommendations
  const handleComplete = async () => {
    if (!userId) {
      setError("User not authenticated");
      return;
    }

    setLoading(true);
    setCurrentPhase("complete");

    try {
      // 1. Guardar os 5 filmes selecionados como "seen" com rating 15
      const selectedMoviesData = Array.from(selectedMovies).map((movieId) => ({
        user_id: userId,
        movie_id: movieId,
        status: "seen",
        rating: 15,
        created_at: new Date().toISOString(),
      }));

      const { error: selectedError } = await supabase
        .from("user_movies")
        .upsert(selectedMoviesData, {
          onConflict: "user_id,movie_id",
        });

      if (selectedError) throw selectedError;

      // 2. Guardar os ratings dos filmes relacionados
      if (ratings.length > 0) {
        const ratingsData = ratings.map((r) => ({
          user_id: userId,
          movie_id: r.movieId,
          status: "seen",
          rating: r.rating,
          created_at: new Date().toISOString(),
        }));

        const { error: ratingsError } = await supabase
          .from("user_movies")
          .upsert(ratingsData, {
            onConflict: "user_id,movie_id",
          });

        if (ratingsError) throw ratingsError;
      }

      // 3. Chamar a API para gerar recomendações
      try {
        await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/generate-recommendations/${userId}`,
          {
            method: "POST",
          }
        );
      } catch (apiError) {
        console.warn("⚠️ Could not trigger recommendations API:", apiError);
        // Não bloquear o fluxo se a API falhar
      }

      // 4. Marcar onboarding como completo
      const { error: updateError } = await supabase
        .from("User")
        .update({ onboarding_status: "completed" })
        .eq("id", userId);

      if (updateError) {
        console.error("❌ Error marking onboarding as complete:", updateError);
        throw updateError;
      }


      // Aguardar 2 segundos antes de redirecionar
      setTimeout(() => {
        navigate("/foryou", { replace: true });
      }, 2000);
    } catch (err) {
      console.error("Error completing onboarding:", err);
      setError("Failed to save your preferences. Please try again.");
      setLoading(false);
    }
  };

  return {
    currentPhase,
    setCurrentPhase,
    availableMovies,
    relatedMovies,
    currentIndex,
    selectedMovies,
    ratings,
    showRatingSelector,
    tempRating,
    setTempRating,
    loading,
    isModalOpen,
    setIsModalOpen,
    error,
    setError,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    selectionSearchQuery,
    setSelectionSearchQuery,
    selectionSearchResults,
    isSelectionSearching,
    handleMovieSelect,
    handlePhase1Complete,
    handleSkipOnboarding,
    handleRateClick,
    handleConfirmRating,
    handleNext,
    handlePrevious,
    handleOpenModal,
    handleComplete,
    searchMovies,
    searchMoviesForSelection,
    addSearchedMovie,
  };
};
