import React, { useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import "./MovieOnboarding.css";
import MovieModal from "./MovieOnboardingModal";

interface Movie {
  id: number;
  series_title: string;
  genre: string;
  poster_url: string;
  imdb_rating: number;
  overview: string;
}

const MovieOnboardingSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<{ [key: number]: number }>({});
  const [showRatingSelector, setShowRatingSelector] = useState(false);
  const [tempRating, setTempRating] = useState(20);
  const [isComplete, setIsComplete] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    fetch("http://127.0.0.1:8000/onboarding")
      .then((response) => {

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then((data) => {

        if (data.movies && Array.isArray(data.movies)) {
          setMovies(data.movies);
          setError(null);
        } else {
          throw new Error('Invalid response: "movies" is not an array');
        }
      })
      .catch((error) => {
        setError("Error loading movies");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const currentMovie = movies[currentIndex] || {
    id: 0,
    series_title: "",
    genre: "",
    poster_url: "",
    imdb_rating: 0,
    overview: "",
  };

  const hasRating = ratings[currentMovie.id] !== undefined;
  const isLastMovie = currentIndex === movies.length - 1;

  const handleRateClick = () => {
    setTempRating(ratings[currentMovie.id] || 20);
    setShowRatingSelector(true);
  };

  const handleConfirmRating = () => {
    setRatings({ ...ratings, [currentMovie.id]: tempRating });
    setShowRatingSelector(false);
  };

  const handleNext = () => {
    if (isLastMovie) {
      setIsComplete(true);
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

  const handleRestart = () => {
    setCurrentIndex(0);
    setRatings({});
    setIsComplete(false);
    setShowRatingSelector(false);
  };

  // FIX: Só abre modal se não estiver mostrando rating selector
  const handleOpenModal = (e: React.MouseEvent) => {
    if (!showRatingSelector) {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="onboarding-container">
        <p>Loading Movies...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="onboarding-container">
        <h1>Error loading movies</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="onboarding-container">
        <div className="complete-card">
          <div className="complete-emoji">🎉</div>
          <h2 className="complete-title">Thanks, now you can use the app</h2>
          <p className="complete-subtitle">
            You rated {Object.keys(ratings).length} movies
          </p>

          <div className="ratings-list">
            {movies.map(
              (movie) =>
                ratings[movie.id] !== undefined && (
                  <div key={movie.id} className="rating-item">
                    <div className="rating-item-info">
                      <div className="rating-item-title">
                        {movie.series_title}
                      </div>
                      <div className="rating-item-category">{movie.genre}</div>
                    </div>
                    <div className="rating-item-score">
                      <Star size={18} className="star-red" fill="#ef4444" />
                      <span className="rating-value">
                        {ratings[movie.id]}/20
                      </span>
                    </div>
                  </div>
                )
            )}
          </div>

          <button onClick={handleRestart} className="btn-restart">
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-content">
        {/* Header */}
        <div className="onboarding-header">
          <h1 className="onboarding-title">Rate These Movies</h1>
          <p className="onboarding-subtitle">
            Movie {currentIndex + 1} of {movies.length}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar-container">
          {movies.map((_, idx) => (
            <div
              key={`progress-${idx}`}
              className={`progress-bar-item ${idx < currentIndex
                ? "completed"
                : idx === currentIndex
                  ? "active"
                  : "inactive"
                }`}
            />
          ))}
        </div>

        {/* Movie Card */}
        <div className="card-container">
          <div className="movie-card-wrapper">
            <div className="movie-card-main">
              {/* Image Section */}
              <div
                className="card-image"
                style={{
                  backgroundImage: `url(${currentMovie.poster_url || ""})`,
                }}
                onClick={handleOpenModal}
              >
                {/* Movie Rating Badge */}
                <div className="badge-rating">
                  <Star size={14} className="star-yellow" fill="#fbbf24" />
                  <span className="badge-text">
                    {currentMovie.imdb_rating || 0}
                  </span>
                </div>

                {/* User Rating Badge */}
                {hasRating && (
                  <div className="badge-user-rating">
                    <Star size={14} className="star-white" fill="white" />
                    <span className="badge-text">
                      {ratings[currentMovie.id]}/20
                    </span>
                  </div>
                )}

                {/* Rating Selector Overlay - FIX: stopPropagation */}
                {showRatingSelector && (
                  <div
                    className="rating-overlay"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="rating-selector-content">
                      <div className="rating-selector-header">
                        <div className="rating-selector-title">
                          Rate this movie
                        </div>
                        <div className="rating-display">{tempRating}</div>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={tempRating}
                        onChange={(e) => setTempRating(Number(e.target.value))}
                        className="rating-slider"
                      />

                      <div className="rating-range-labels">
                        <span>0</span>
                        <span>20</span>
                      </div>

                      <button
                        onClick={handleConfirmRating}
                        className="btn-confirm"
                      >
                        Confirm Rating
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="card-info">
                <div className="card-category">
                  {currentMovie.genre || "No category"}
                </div>
                <div className="card-title">
                  {currentMovie.series_title || "No title"}
                </div>
                <div className="card-meta">
                  {/* Placeholder for year and time */}
                </div>
              </div>

              {/* Actions */}
              <div className="card-actions">
                {!hasRating ? (
                  <button onClick={handleRateClick} className="btn-rate">
                    <Star size={18} />
                    Rate Movie
                  </button>
                ) : (
                  <button
                    onClick={handleRateClick}
                    className="btn-change-rating"
                  >
                    <Star size={18} />
                    Change Rating
                  </button>
                )}

                <div className="navigation-buttons">
                  <button
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="btn-nav btn-previous"
                  >
                    <ChevronLeft size={18} />
                    Previous
                  </button>
                  <button onClick={handleNext} className="btn-nav btn-next">
                    {isLastMovie ? "Finish" : "Next"}
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <MovieModal
          movie={{
            id: currentMovie.id.toString(),
            title: currentMovie.series_title,
            category: currentMovie.genre,
            img: currentMovie.poster_url,
            rating: currentMovie.imdb_rating,
            time: "",
            synopsis: currentMovie.overview || "Synopsis not available",
          }}
          isWatched={false}
          onClose={handleCloseModal}
          onToggleWatched={() => { }}
        />
      )}
    </div>
  );
};

export default MovieOnboardingSlider;
