import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '@/hooks/useSupabase';
import { useUser } from '@clerk/clerk-react';

interface Movie {
  id: string;
  series_title: string;
  genre: string;
  imdb_rating: number;
  director: string;
  poster_url: string;
  runtime: string;
  overview?: string;
}

interface MovieRating {
  movieId: string;
  rating: number;
}

type Phase = 'welcome' | 'initial-selection' | 'rate-related' | 'complete';

export const useOnboarding = () => {
  const navigate = useNavigate();
  const supabase = useSupabase();
  const { user } = useUser();
  const [currentPhase, setCurrentPhase] = useState<Phase>('welcome');
  const [availableMovies, setAvailableMovies] = useState<Movie[]>([]);
  const [relatedMovies, setRelatedMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMovies, setSelectedMovies] = useState<Set<string>>(new Set());
  const [ratings, setRatings] = useState<MovieRating[]>([]);
  const [showRatingSelector, setShowRatingSelector] = useState(false);
  const [tempRating, setTempRating] = useState(20);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  useEffect(() => {
    if (currentPhase === 'initial-selection') {
      fetchInitialMovies();
    }
  }, [currentPhase]);

  const checkOnboardingStatus = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('User')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();
      
      if (!error && data?.onboarding_completed) {
        console.log('✅ User already completed onboarding, redirecting...');
        navigate('/');
      }
    } catch (err) {
      console.error('Error checking onboarding status:', err);
    }
  };

  const fetchInitialMovies = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching movies from API...');
      const response = await fetch('http://127.0.0.1:8000/onboarding/start', {
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.movies) {
          console.log(`✅ Loaded ${data.movies.length} movies from API`);
          setAvailableMovies(data.movies);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('⚠️ API unavailable, using database fallback');
    }

    try {
      const { data, error } = await supabase
        .from('movies')
        .select('id, series_title, genre, imdb_rating, director, poster_url, runtime, overview')
        .gte('imdb_rating', 7.0)
        .order('imdb_rating', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (data) {
        console.log(`✅ Loaded ${data.length} movies from database`);
        setAvailableMovies(data);
      }
    } catch (err) {
      console.error('❌ Error fetching movies:', err);
      setError('Failed to load movies. Please refresh the page.');
    }
    
    setLoading(false);
  };

  const handleMovieSelect = (movieId: string) => {
    const newSelected = new Set(selectedMovies);
    if (newSelected.has(movieId)) {
      newSelected.delete(movieId);
    } else if (newSelected.size < 5) {
      newSelected.add(movieId);
    }
    setSelectedMovies(newSelected);
  };

  const fetchRelatedMoviesFromDB = async (selectedIds: string[]) => {
    try {
      const selectedMoviesData = availableMovies.filter(m => selectedIds.includes(m.id));
      const allGenres = new Set<string>();
      
      selectedMoviesData.forEach(m => {
        m.genre.split(',').forEach(g => allGenres.add(g.trim()));
      });

      const genreArray = Array.from(allGenres);
      console.log('🎭 Searching for genres:', genreArray);

      const { data, error } = await supabase
        .from('movies')
        .select('id, series_title, genre, imdb_rating, director, poster_url, runtime, overview')
        .not('id', 'in', `(${selectedIds.join(',')})`)
        .gte('imdb_rating', 6.5)
        .limit(50);

      if (!error && data) {
        const filtered = data.filter(movie => {
          const movieGenres = movie.genre.split(',').map((g: string) => g.trim());
          return movieGenres.some((g: string) => genreArray.includes(g));
        });
        
        const shuffled = filtered.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 10);
      }
    } catch (err) {
      console.error('Error fetching related movies:', err);
    }
    
    return [];
  };

  const handlePhase1Complete = async () => {
    if (selectedMovies.size !== 5) {
      alert('Please select exactly 5 movies');
      return;
    }
    
    setLoading(true);
    setError(null);
    console.log('🎬 Phase 1 Complete - Processing...');

    const initialRatings = Array.from(selectedMovies).map(movieId => ({
      movieId,
      rating: 18
    }));
    
    setRatings(initialRatings);

    try {
      console.log('💾 Saving initial ratings to database...');
      for (const rating of initialRatings) {
        await supabase.from('user_movies').insert({
          user_id: user?.id,
          movie_id: rating.movieId,
          status: 'Watched',
          rating: rating.rating
        });
      }
      console.log('✅ Initial ratings saved!');

      try {
        console.log('🔄 Fetching related movies from API...');
        const response = await fetch('http://127.0.0.1:8000/onboarding/related', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            selectedMovieIds: Array.from(selectedMovies),
            ratings: initialRatings
          }),
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.success && data.movies && data.movies.length > 0) {
            console.log(`✅ Got ${data.movies.length} related movies from API`);
            setRelatedMovies(data.movies);
            setCurrentPhase('rate-related');
            setCurrentIndex(0);
            setLoading(false);
            return;
          }
        }
      } catch (apiError) {
        console.warn('⚠️ API unavailable, using database fallback');
      }

      console.log('🔄 Using database fallback for related movies...');
      const fallbackMovies = await fetchRelatedMoviesFromDB(Array.from(selectedMovies));
      
      if (fallbackMovies.length > 0) {
        console.log(`✅ Got ${fallbackMovies.length} related movies from database`);
        setRelatedMovies(fallbackMovies);
        setCurrentPhase('rate-related');
        setCurrentIndex(0);
      } else {
        throw new Error('No related movies found');
      }
    } catch (err) {
      console.error('❌ Error:', err);
      setError('Failed to load related movies. Please try again.');
    }

    setLoading(false);
  };

  const handleSkipOnboarding = async () => {
    if (!confirm('Skip personalization? You can set preferences later in your profile.')) {
      return;
    }

    setLoading(true);
    console.log('⏭️ Skipping onboarding...');

    try {
      try {
        await fetch('http://127.0.0.1:8000/onboarding/skip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id }),
          signal: AbortSignal.timeout(3000)
        });
      } catch (apiErr) {
        console.warn('⚠️ API skip failed, updating database directly');
      }

      if (user?.id) {
        await supabase
          .from('User')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
        
        console.log('✅ Onboarding skipped');
        navigate('/');
      }
    } catch (error) {
      console.error('❌ Error skipping:', error);
      setError('Failed to skip. Please try again.');
    }

    setLoading(false);
  };

  const handleRateClick = () => {
    const currentMovie = relatedMovies[currentIndex];
    const existingRating = ratings.find(r => r.movieId === currentMovie.id);
    setTempRating(existingRating?.rating || 20);
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

  const handleNext = () => {
    if (currentIndex === relatedMovies.length - 1) {
      handlePhase2Complete();
    } else {
      setCurrentIndex(currentIndex + 1);
      setShowRatingSelector(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowRatingSelector(false);
    }
  };

  const handlePhase2Complete = async () => {
    setLoading(true);
    setError(null);
    console.log('🏁 Completing onboarding...');

    try {
      const phase2Ratings = ratings.filter(r => !selectedMovies.has(r.movieId));
      
      if (phase2Ratings.length > 0) {
        console.log(`💾 Saving ${phase2Ratings.length} phase 2 ratings...`);
        for (const rating of phase2Ratings) {
          await supabase.from('user_movies').insert({
            user_id: user?.id,
            movie_id: rating.movieId,
            status: 'Watched',
            rating: rating.rating
          });
        }
        console.log('✅ Phase 2 ratings saved!');
      }

      if (user?.id) {
        await supabase
          .from('User')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
        console.log('✅ Onboarding marked as complete!');
      }

      try {
        await fetch('http://127.0.0.1:8000/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            ratings: ratings,
            skipped: false
          }),
          signal: AbortSignal.timeout(5000)
        });
        console.log('✅ Backend notified');
      } catch (apiErr) {
        console.warn('⚠️ Backend notification failed (not critical)');
      }

      try {
        await fetch(`http://127.0.0.1:8000/generate-recommendations/${user?.id}`, {
          method: 'POST',
          signal: AbortSignal.timeout(2000)
        });
        console.log('🚀 Recommendation generation triggered');
      } catch (recErr) {
        console.warn('⚠️ Could not trigger recommendations (will generate later)');
      }

      setCurrentPhase('complete');
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      setError('Failed to save. Please try again.');
    }

    setLoading(false);
  };

  const handleOpenModal = () => {
    if (!showRatingSelector) {
      setIsModalOpen(true);
    }
  };

  const handleComplete = () => {
    navigate('/');
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