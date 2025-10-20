import React, { useState } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import './MovieOnboarding.css';

interface Movie {
  id: number;
  title: string;
  category: string;
  year: string;
  time: string;
  rating: number;
  img: string;
}

const MovieOnboardingSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<{ [key: number]: number }>({});
  const [showRatingSelector, setShowRatingSelector] = useState(false);
  const [tempRating, setTempRating] = useState(20);
  const [isComplete, setIsComplete] = useState(false);

  const movies: Movie[] = [
    { 
      id: 1, 
      title: "The Shawshank Redemption", 
      category: "Drama", 
      year: "1994",
      time: "142",
      rating: 9.3,
      img: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop"
    },
    { 
      id: 2, 
      title: "The Godfather", 
      category: "Crime, Drama", 
      year: "1972",
      time: "175",
      rating: 9.2,
      img: "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=400&h=600&fit=crop"
    },
    { 
      id: 3, 
      title: "The Dark Knight", 
      category: "Action, Crime", 
      year: "2008",
      time: "152",
      rating: 9.0,
      img: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop"
    },
    { 
      id: 4, 
      title: "Pulp Fiction", 
      category: "Crime, Drama", 
      year: "1994",
      time: "154",
      rating: 8.9,
      img: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop"
    },
    { 
      id: 5, 
      title: "Inception", 
      category: "Action, Sci-Fi", 
      year: "2010",
      time: "148",
      rating: 8.8,
      img: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=600&fit=crop"
    }
  ];

  const formatRuntime = (minutes: string): string => {
    const mins = parseInt(minutes);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`;
  };

  const currentMovie = movies[currentIndex];
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

  if (isComplete) {
    return (
      <div className="onboarding-container">
        <div className="complete-card">
          <div className="complete-emoji">🎉</div>
          <h2 className="complete-title">Thanks!</h2>
          <p className="complete-subtitle">Rate {Object.keys(ratings).length} movies</p>
          
          <div className="ratings-list">
            {movies.map(movie => (
              ratings[movie.id] !== undefined && (
                <div key={movie.id} className="rating-item">
                  <div className="rating-item-info">
                    <div className="rating-item-title">{movie.title}</div>
                    <div className="rating-item-category">{movie.category}</div>
                  </div>
                  <div className="rating-item-score">
                    <Star size={18} className="star-red" fill="#ef4444" />
                    <span className="rating-value">{ratings[movie.id]}/20</span>
                  </div>
                </div>
              )
            ))}
          </div>

          <button onClick={handleRestart} className="btn-restart">
            Start over
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
          <h1 className="onboarding-title"> Rating these movies</h1>
          <p className="onboarding-subtitle">Movie {currentIndex + 1} de {movies.length}</p>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar-container">
          {movies.map((_, idx) => (
            <div
              key={idx}
              className={`progress-bar-item ${
                idx < currentIndex ? 'completed' :
                idx === currentIndex ? 'active' :
                'inactive'
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
                style={{ backgroundImage: `url(${currentMovie.img})` }}
              >
                {/* Movie Rating Badge */}
                <div className="badge-rating">
                  <Star size={14} className="star-yellow" fill="#fbbf24" />
                  <span className="badge-text">{currentMovie.rating}</span>
                </div>

                {/* User Rating Badge */}
                {hasRating && (
                  <div className="badge-user-rating">
                    <Star size={14} className="star-white" fill="white" />
                    <span className="badge-text">{ratings[currentMovie.id]}/20</span>
                  </div>
                )}

                {/* Rating Selector Overlay */}
                {showRatingSelector && (
                  <div className="rating-overlay">
                    <div className="rating-selector-content">
                      <div className="rating-selector-header">
                        <div className="rating-selector-title">Rate this movie</div>
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

                      <button onClick={handleConfirmRating} className="btn-confirm">
                        Confirm Rating
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="card-info">
                <div className="card-category">
                  {currentMovie.category}
                </div>
                <div className="card-title">
                  {currentMovie.title}
                </div>
                <div className="card-meta">
                  {currentMovie.year} • {formatRuntime(currentMovie.time)}
                </div>
              </div>

              {/* Actions */}
              <div className="card-actions">
                {!hasRating ? (
                  <button onClick={handleRateClick} className="btn-rate">
                    <Star size={18} />
                   Rating Film
                  </button>
                ) : (
                  <button onClick={handleRateClick} className="btn-change-rating">
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
                    Back
                  </button>
                  <button onClick={handleNext} className="btn-nav btn-next">
                    {isLastMovie ? 'Finish' : 'Next'}
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieOnboardingSlider;