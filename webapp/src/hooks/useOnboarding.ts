import { useState, useEffect } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

interface Movie {
  id: number;
  series_title: string;
  genre: string;
  poster_url: string;
  imdb_rating: number;
  overview: string;
  runtime?: string;
}

interface Rating {
  movieId: number;
  rating: number;
}

type Phase = 'welcome' | 'initial-selection' | 'rate-related' | 'complete';

export const useOnboarding = () => {
  const supabase = useSupabase();
  const { userId } = useAuth();
  const navigate = useNavigate();

  // Phase management
  const [currentPhase, setCurrentPhase] = useState<Phase>('welcome');

  // Movie data
  const [availableMovies, setAvailableMovies] = useState<Movie[]>([]);
  const [relatedMovies, setRelatedMovies] = useState<Movie[]>([]);
  const [selectedMovies, setSelectedMovies] = useState<Set<number>>(new Set());

  // Rating state
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRatingSelector, setShowRatingSelector] = useState(false);
  const [tempRating, setTempRating] = useState(10);

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
          .from('movies')
          .select('id, series_title, genre, poster_url, imdb_rating, overview, runtime')
          .not('poster_url', 'is', null)
          .gte('imdb_rating', 7.0)
          .order('imdb_rating', { ascending: false })
          .limit(50);

        if (error) throw error;

        if (data) {
          console.log(`✅ Loaded ${data.length} movies ordered by rating`);
          setAvailableMovies(data);
        }
      } catch (err) {
        console.error('Error fetching initial movies:', err);
        setError('Failed to load movies. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialMovies();
  }, []);

  // Handle movie selection (max 5)
  const handleMovieSelect = (movieId: number) => {
    setSelectedMovies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(movieId)) {
        newSet.delete(movieId);
      } else {
        if (newSet.size >= 5) {
          setError('You can only select 5 movies');
          setTimeout(() => setError(null), 3000);
          return prev;
        }
        newSet.add(movieId);
      }
      return newSet;
    });
  };

  // Generate related movies based on selected ones (Phase 2)
  const handlePhase1Complete = async () => {
    if (selectedMovies.size !== 5) {
      setError('Please select exactly 5 movies');
      return;
    }

    setLoading(true);
    try {
      // Buscar os géneros dos filmes selecionados
      const selectedMoviesList = availableMovies.filter(m => 
        selectedMovies.has(m.id)
      );

      // Extrair todos os géneros
      const genres = new Set<string>();
      selectedMoviesList.forEach(movie => {
        movie.genre.split(',').forEach(g => genres.add(g.trim()));
      });

      // Buscar filmes relacionados baseados nos géneros
      const genreArray = Array.from(genres).slice(0, 3);
      const { data, error } = await supabase
        .from('movies')
        .select('id, series_title, genre, poster_url, imdb_rating, overview, runtime')
        .not('poster_url', 'is', null)
        .gte('imdb_rating', 6.5)
        .not('id', 'in', `(${Array.from(selectedMovies).join(',')})`)
        .or(genreArray.map(g => `genre.ilike.%${g}%`).join(','))
        .order('imdb_rating', { ascending: false })
        .limit(25);

      if (error) throw error;

      if (data && data.length > 0) {
        const topMovies = data.slice(0, 10);
        console.log(`✅ Selected ${topMovies.length} top-rated related movies`);
        setRelatedMovies(topMovies);
        setCurrentPhase('rate-related');
      } else {
        throw new Error('No related movies found');
      }
    } catch (err) {
      console.error('Error generating related movies:', err);
      setError('Failed to load related movies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Skip onboarding - just navigate without saving anything
  const handleSkipOnboarding = () => {
    console.log('⏭️ Skipping onboarding (not marking as complete)');
    // Marcar flag no sessionStorage para evitar redirect automático
    sessionStorage.setItem('skipped_onboarding', 'true');
    navigate('/', { replace: true });
  };

  // Rating handlers
  const handleRateClick = () => {
    const currentMovie = relatedMovies[currentIndex];
    const existingRating = ratings.find(r => r.movieId === currentMovie.id);
    setTempRating(existingRating?.rating || 10);
    setShowRatingSelector(true);
  };

  const handleConfirmRating = () => {
    const currentMovie = relatedMovies[currentIndex];
    setRatings(prev => {
      const filtered = prev.filter(r => r.movieId !== currentMovie.id);
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
      setCurrentIndex(prev => prev + 1);
      setShowRatingSelector(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowRatingSelector(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  // Complete onboarding - save all data, mark as complete, and trigger recommendations
  const handleComplete = async () => {
    if (!userId) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setCurrentPhase('complete');

    try {
      // 1. Guardar os 5 filmes selecionados como "seen" com rating 15
      const selectedMoviesData = Array.from(selectedMovies).map(movieId => ({
        user_id: userId,
        movie_id: movieId,
        status: 'seen',
        rating: 15,
        created_at: new Date().toISOString()
      }));

      const { error: selectedError } = await supabase
        .from('user_movies')
        .upsert(selectedMoviesData, { 
          onConflict: 'user_id,movie_id' 
        });

      if (selectedError) throw selectedError;

      // 2. Guardar os ratings dos filmes relacionados
      if (ratings.length > 0) {
        const ratingsData = ratings.map(r => ({
          user_id: userId,
          movie_id: r.movieId,
          status: 'seen',
          rating: r.rating,
          created_at: new Date().toISOString()
        }));

        const { error: ratingsError } = await supabase
          .from('user_movies')
          .upsert(ratingsData, { 
            onConflict: 'user_id,movie_id' 
          });

        if (ratingsError) throw ratingsError;
      }

      // 3. Chamar a API para gerar recomendações
      try {
        await fetch(`http://127.0.0.1:8000/generate-recommendations/${userId}`, {
          method: 'POST',
        });
        console.log('✅ Recommendations generation triggered');
      } catch (apiError) {
        console.warn('⚠️ Could not trigger recommendations API:', apiError);
        // Não bloquear o fluxo se a API falhar
      }

      // 4. Marcar onboarding como completo
      const { error: updateError } = await supabase
        .from('User')
        .update({ has_completed_onboarding: true })
        .eq('id', userId);

      if (updateError) {
        console.error('❌ Error marking onboarding as complete:', updateError);
        throw updateError;
      }

      console.log('✅ Onboarding completed successfully!');

      // Limpar flag do sessionStorage
      sessionStorage.removeItem('skipped_onboarding');

      // Aguardar 2 segundos antes de redirecionar
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);

    } catch (err) {
      console.error('Error completing onboarding:', err);
      setError('Failed to save your preferences. Please try again.');
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
    handleMovieSelect,
    handlePhase1Complete,
    handleSkipOnboarding,
    handleRateClick,
    handleConfirmRating,
    handleNext,
    handlePrevious,
    handleOpenModal,
    handleComplete
  };
};