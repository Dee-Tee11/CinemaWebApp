import React from 'react';
import { ChevronRight, Star, Sparkles, ChevronLeft, SkipForward } from 'lucide-react';
import MovieModal from './MovieOnboardingModal';
import { useOnboarding } from '../../hooks/useOnboarding';
import './MovieOnboardingNewVersion.css';

const OnboardingFlow: React.FC = () => {
  const {
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
  } = useOnboarding();

  const renderWelcome = () => (
    <div className="onboarding-page-content welcome-phase">
      <button 
        onClick={handleSkipOnboarding}
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          background: '#991b1b',
          border: '1px solid #991b1b ',
          color: 'rgba(255,255,255,0.7)',
          padding: '10px 20px',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          transition: 'all 0.2s',
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#991b1b';
          e.currentTarget.style.color = '#991b1b';
          e.currentTarget.style.background = 'white';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#991b1b';
          e.currentTarget.style.color = 'white';
          e.currentTarget.style.background = '#991b1b';
        }}
      >
        <SkipForward size={16} />
        Skip
      </button>

      <div className="welcome-icon">
        <Sparkles size={64} color="#991b1b" />
      </div>
      <h1 className="welcome-title">Welcome to CineMatch! 🎬</h1>
      <p className="welcome-subtitle">
        Let's personalize your experience with movies you love
      </p>
      <div className="welcome-steps">
        <div className="welcome-step">
          <div className="step-number">1</div>
          <div className="step-text">Choose 5 movies you love</div>
        </div>
        <div className="welcome-step">
          <div className="step-number">2</div>
          <div className="step-text">Rate some related movies</div>
        </div>
        <div className="welcome-step">
          <div className="step-number">3</div>
          <div className="step-text">Get personalized recommendations</div>
        </div>
      </div>
      <button
        className="onboarding-btn primary"
        onClick={() => setCurrentPhase('initial-selection')}
      >
        Let's Start <ChevronRight size={20} />
      </button>
    </div>
  );

  const renderInitialSelection = () => (
    <div className="onboarding-page-content selection-phase">
      <button 
        className="back-button"
        onClick={() => setCurrentPhase('welcome')}
        style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}
      >
        <ChevronLeft size={24} />
      </button>

      <button 
        onClick={handleSkipOnboarding}
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.2)',
          color: 'rgba(255,255,255,0.7)',
          padding: '10px 20px',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          transition: 'all 0.2s',
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
          e.currentTarget.style.color = 'white';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
        }}
      >
        <SkipForward size={16} />
        Skip
      </button>

      <div className="phase-header">
        <h2 className="phase-title">Choose 5 movies you LOVE</h2>
        <div className="phase-progress">
          {selectedMovies.size} / 5 selected
        </div>
      </div>

      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          zIndex: 1000
        }}>
          {error}
          <button 
            onClick={() => setError(null)}
            style={{
              marginLeft: '12px',
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="movies-grid">
        {availableMovies.map(movie => (
          <div
            key={movie.id}
            className={`onboarding-movie-card ${selectedMovies.has(movie.id) ? 'selected' : ''}`}
            onClick={() => handleMovieSelect(movie.id)}
          >
            <div
              className="card-image"
              style={{ backgroundImage: `url(${movie.poster_url})` }}
            >
              {selectedMovies.has(movie.id) && (
                <div className="selected-badge">
                  <Star size={20} color="#FFD700" fill="#FFD700" />
                </div>
              )}
              <div className="rating-badge">
                <Star size={14} color="#FFD700" fill="#FFD700" />
                <span>{movie.imdb_rating}</span>
              </div>
            </div>
            <div className="card-info">
              <div className="card-title">{movie.series_title}</div>
              <div className="card-genre">{movie.genre}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="phase-actions">
        <button
          className="onboarding-btn primary"
          onClick={handlePhase1Complete}
          disabled={selectedMovies.size !== 5 || loading}
        >
          {loading ? 'Loading...' : 'Continue'} <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );

  const renderRateRelated = () => {
    if (relatedMovies.length === 0) return null;
    
    const currentMovie = relatedMovies[currentIndex];
    const hasRating = ratings.some(r => r.movieId === currentMovie.id);
    const isLastMovie = currentIndex === relatedMovies.length - 1;

    return (
      <div className="onboarding-page-content rating-phase-slider">
        <button 
          className="back-button"
          onClick={() => setCurrentPhase('initial-selection')}
          style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}
        >
          <ChevronLeft size={24} />
        </button>

        <button 
          onClick={handleSkipOnboarding}
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.7)',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            transition: 'all 0.2s',
            zIndex: 100
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
          }}
        >
          <SkipForward size={16} />
          Skip
        </button>

        <div className="slider-header">
          <h1 className="slider-title">Rate These Movies</h1>
          <p className="slider-subtitle">
            Movie {currentIndex + 1} of {relatedMovies.length}
          </p>
        </div>

        <div className="progress-bar-container">
          {relatedMovies.map((_, idx) => (
            <div
              key={`progress-${idx}`}
              className={`progress-bar-item ${
                idx < currentIndex ? 'completed' :
                idx === currentIndex ? 'active' :
                'inactive'
              }`}
            />
          ))}
        </div>

        <div className="slider-card-container">
          <div className="slider-movie-card">
            <div 
              className="slider-card-image"
              style={{ backgroundImage: `url(${currentMovie.poster_url})` }}
              onClick={handleOpenModal}
            >
              <div className="badge-rating">
                <Star size={14} className="star-yellow" fill="#fbbf24" />
                <span className="badge-text">{currentMovie.imdb_rating}</span>
              </div>

              {hasRating && (
                <div className="badge-user-rating">
                  <Star size={14} className="star-white" fill="white" />
                  <span className="badge-text">
                    {ratings.find(r => r.movieId === currentMovie.id)?.rating}/20
                  </span>
                </div>
              )}

              {showRatingSelector && (
                <div 
                  className="rating-overlay"
                  onClick={(e) => e.stopPropagation()}
                >
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

            <div className="slider-card-info">
              <div className="slider-card-category">{currentMovie.genre}</div>
              <div className="slider-card-title">{currentMovie.series_title}</div>
              <div className="slider-card-meta">{currentMovie.runtime || ''}</div>
            </div>

            <div className="slider-card-actions">
              {!hasRating ? (
                <button onClick={handleRateClick} className="btn-rate">
                  <Star size={18} />
                  Rate Movie
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
                  Previous
                </button>
                <button onClick={handleNext} className="btn-nav btn-next">
                  {isLastMovie ? 'Finish' : 'Next'}
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {isModalOpen && (
          <MovieModal
            movie={{
              id: currentMovie.id,
              title: currentMovie.series_title,
              category: currentMovie.genre,
              img: currentMovie.poster_url,
              rating: currentMovie.imdb_rating,
              time: currentMovie.runtime || '',
              synopsis: currentMovie.overview || 'Synopsis not available'
            }}
            isWatched={false}
            onClose={() => setIsModalOpen(false)}
            onToggleWatched={() => {}}
          />
        )}
      </div>
    );
  };

  const renderComplete = () => (
    <div className="onboarding-page-content complete-phase">
      <div className="complete-icon">
        <Sparkles size={64} color="#22c55e" />
      </div>
      <h1 className="complete-title">You're all set! 🎉</h1>
      <p className="complete-subtitle">
        Your personalized "For You" page is ready with recommendations based on your taste
      </p>
      <button 
        className="onboarding-btn primary" 
        onClick={handleComplete}
      >
        Explore Movies
      </button>
    </div>
  );

  return (
    <div className="onboarding-page">
      {loading && (
        <div className="loading-overlay">
          <div className="loader"></div>
          <p>Processing your preferences...</p>
        </div>
      )}

      {currentPhase === 'welcome' && renderWelcome()}
      {currentPhase === 'initial-selection' && renderInitialSelection()}
      {currentPhase === 'rate-related' && renderRateRelated()}
      {currentPhase === 'complete' && renderComplete()}
    </div>
  );
};

export default OnboardingFlow;