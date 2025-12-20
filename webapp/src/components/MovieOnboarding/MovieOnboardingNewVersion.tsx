import React from "react";
import { ChevronRight, Star, Sparkles, ChevronLeft } from "lucide-react";
import MovieModal from "./MovieOnboardingModal";
import { useOnboarding } from "../../hooks/useOnboarding";
import "./MovieOnboardingNewVersion.css";
import MobileRatingCard from "./phases/MobileRatingCard";

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
    handleRateClick,
    handleConfirmRating,
    handleNext,
    handlePrevious,
    handleOpenModal,
    handleComplete,
    selectionSearchQuery,
    setSelectionSearchQuery,
    selectionSearchResults,
    searchMoviesForSelection,
    searchQuery,
    setSearchQuery,
    searchResults,
    addSearchedMovie,
    searchMovies,
  } = useOnboarding();

  // ============================================
  // WELCOME PHASE
  // ============================================
  const renderWelcome = () => (
    <div className="onboarding-page-content welcome-phase">
      <div className="welcome-icon">
        <Sparkles size={64} color="#991b1b" />
      </div>
      <h1 className="welcome-title">Welcome to Movie Night ! 🎬</h1>
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
        onClick={() => setCurrentPhase("initial-selection")}
      >
        Let's Start <ChevronRight size={20} />
      </button>
    </div>
  );

  // ============================================
  // INITIAL SELECTION PHASE (5 MOVIES)
  // ============================================
  const renderInitialSelection = () => (
    <div className="onboarding-page-content selection-phase">
      <button
        className="back-button"
        onClick={() => setCurrentPhase("welcome")}
        style={{ position: "absolute", top: "24px", left: "24px", zIndex: 10 }}
      >
        <ChevronLeft size={24} />
      </button>

      <div className="phase-header">
        <h2 className="phase-title">Choose at least 5 movies you LOVE</h2>
        <div className="phase-progress">{selectedMovies.size} movies selected</div>

        <div className="search-container" style={{ marginTop: '1rem', width: '100%', maxWidth: '600px', display: 'flex', gap: '10px', margin: '1rem auto' }}>
          <input
            type="text"
            className="search-input"
            placeholder="Search for movies..."
            value={selectionSearchQuery}
            onChange={(e) => {
              setSelectionSearchQuery(e.target.value);
              searchMoviesForSelection(e.target.value);
            }}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: '25px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              background: 'rgba(0, 0, 0, 0.05)',
              color: '#1f2937',
              fontSize: '1rem',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
          />
        </div>
      </div>

      {error && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#ef4444",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            zIndex: 1000,
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: "12px",
              background: "transparent",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="movies-grid">
        {(selectionSearchQuery ? selectionSearchResults : availableMovies).map((movie) => (
          <div
            key={movie.id}
            className={`onboarding-movie-card ${selectedMovies.has(movie.id) ? "selected" : ""
              }`}
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
          disabled={selectedMovies.size < 5 || loading}
        >
          {loading ? "Loading..." : "Continue"} <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );

  // ============================================
  // RATE RELATED MOVIES PHASE (10 MOVIES)
  // ============================================
  // ============================================
  // RATE RELATED MOVIES PHASE (10 MOVIES)
  // ============================================
  const renderRateRelated = () => {
    if (relatedMovies.length === 0) return null;

    const currentMovie = relatedMovies[currentIndex];
    const hasRating = ratings.some((r) => r.movieId === currentMovie.id);
    const isLastMovie = currentIndex === relatedMovies.length - 1;

    // Helper to format user rating for slider
    const currentRatingValue = hasRating
      ? ratings.find((r) => r.movieId === currentMovie.id)?.rating || 10
      : 10;

    return (
      <div className="onboarding-page-content rating-phase-horizontal">
        <button
          className="back-button"
          onClick={() => setCurrentPhase("initial-selection")}
          style={{ position: "absolute", top: "24px", left: "24px", zIndex: 10 }}
        >
          <ChevronLeft size={24} />
        </button>

        <div className="desktop-rating-view">
          <div className="rating-card-horizontal">
            {/* LEFT: MOVIE POSTER */}
            <div
              className="horizontal-poster"
              style={{ backgroundImage: `url(${currentMovie.poster_url})` }}
            >
              <div className="poster-rating-badge">
                <Star size={14} fill="#fbbf24" color="#fbbf24" />
                <span>{currentMovie.imdb_rating}</span>
              </div>
            </div>

            {/* RIGHT: CONTENT */}
            <div className="horizontal-content">
              {/* SEARCH TO REPLACE */}
              <div className="search-replace-container">
                <div className="search-replace-input-wrapper">
                  <input
                    type="text"
                    className="search-replace-input"
                    placeholder="Search to replace this movie..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchMovies(e.target.value);
                    }}
                  />
                  <div className="search-icon-right">
                    <span style={{ fontSize: '18px' }}>🔍</span>
                  </div>
                </div>

                {/* DROPDOWN RESULTS */}
                {searchResults.length > 0 && searchQuery && (
                  <div className="search-replace-results">
                    {searchResults.map((movie) => (
                      <div
                        key={movie.id}
                        className="search-result-item"
                        onClick={() => {
                          addSearchedMovie(movie);
                          setSearchQuery(""); // Clear query to close dropdown
                        }}
                      >
                        <img src={movie.poster_url} alt={movie.series_title} />
                        <div className="result-info">
                          <div className="result-title">{movie.series_title}</div>
                          <div className="result-meta">{movie.runtime} • {movie.imdb_rating} ★</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="movie-details-section" key={currentMovie.id}>
                <div className="movie-genre-pill">
                  {currentMovie.genre.split(',')[0]}
                </div>
                <h1 className="movie-title-large">{currentMovie.series_title}</h1>
                <div className="movie-meta-large">
                  <span className="meta-item">⏱ {currentMovie.runtime || "N/A"}</span>
                </div>
              </div>

              <div className="rating-action-section">
                <div className="rating-slider-wrapper">
                  <div className="slider-labels">
                    <span className="label-text">Your Rating</span>
                    <span className="rating-value-large">{hasRating ? currentRatingValue : tempRating}/20</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={hasRating ? currentRatingValue : tempRating}
                    onChange={(e) => {
                      setTempRating(Number(e.target.value));
                    }}
                    className="horizontal-rating-slider"
                  />
                </div>

                <div className="action-buttons-row">
                  <button
                    className="btn-update-rating-white"
                    onClick={() => {
                      setTempRating(hasRating ? currentRatingValue : tempRating);
                      handleConfirmRating();
                      handleNext();
                    }}
                  >
                    {hasRating ? "Update Rating" : "Submit Rating"}
                  </button>

                  <button
                    className="btn-skip-transparent"
                    onClick={handleNext}
                  >
                    Skip <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="progress-dots">
                {relatedMovies.map((_, idx) => (
                  <div
                    key={idx}
                    className={`progress-dot ${idx === currentIndex ? 'active' : ''} ${idx < currentIndex ? 'completed' : ''}`}
                  />
                ))}
              </div>

            </div>
          </div>
        </div>

        <div className="mobile-rating-view">
          <MobileRatingCard
            movie={currentMovie}
            tempRating={hasRating ? currentRatingValue : tempRating}
            hasRating={hasRating}
            searchQuery={searchQuery}
            searchResults={searchResults}
            onSetTempRating={setTempRating}
            onConfirmRating={() => {
              setTempRating(hasRating ? currentRatingValue : tempRating);
              handleConfirmRating();
              handleNext();
            }}
            onNext={handleNext}
            onSearchChange={(q) => {
              setSearchQuery(q);
              searchMovies(q);
            }}
            onAddSearchedMovie={addSearchedMovie}
            onClearSearch={() => setSearchQuery("")}
          />
        </div>
      </div>
    );
  };

  // ============================================
  // COMPLETE PHASE
  // ============================================
  const renderComplete = () => (
    <div className="onboarding-page-content complete-phase">
      <div className="complete-icon">
        <Sparkles size={64} color="#22c55e" />
      </div>
      <h1 className="complete-title">You're all set! 🎉</h1>
      <p className="complete-subtitle">
        Your personalized "For You" page is ready with recommendations based on
        your taste
      </p>
      <button className="onboarding-btn primary" onClick={handleComplete}>
        Explore Movies
      </button>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="onboarding-page">
      {loading && (
        <div className="loading-overlay">
          <div className="loader"></div>
          <p>Processing your preferences...</p>
        </div>
      )}

      {currentPhase === "welcome" && renderWelcome()}
      {currentPhase === "initial-selection" && renderInitialSelection()}
      {currentPhase === "rate-related" && renderRateRelated()}
      {currentPhase === "complete" && renderComplete()}
    </div>
  );
};

export default OnboardingFlow;
