import React, { useState } from "react";
import { ChevronRight, Star, Sparkles, ChevronLeft, Search, Clock, Film } from "lucide-react";
import { useOnboarding } from "../../hooks/useOnboarding";
import "./MovieOnboardingFinal.css";

const MovieOnboardingFinal: React.FC = () => {
    const {
        currentPhase,
        setCurrentPhase,
        availableMovies,
        relatedMovies,
        currentIndex,
        selectedMovies,
        ratings,
        tempRating,
        setTempRating,
        loading,
        error,
        setError,
        handleMovieSelect,
        handlePhase1Complete,
        handleConfirmRating,
        handleNext,
        handlePrevious,
        handleComplete,
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        searchMovies,
        addSearchedMovie,
    } = useOnboarding();

    // ============================================
    // WELCOME PHASE (Preserved)
    // ============================================
    const renderWelcome = () => (
        <div className="onboarding-final-content">
            <div className="welcome-phase">
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
        </div>
    );

    // ============================================
    // INITIAL SELECTION PHASE (Preserved)
    // ============================================
    const renderInitialSelection = () => (
        <div className="onboarding-final-content">
            <button
                className="back-button"
                onClick={() => setCurrentPhase("welcome")}
            >
                <ChevronLeft size={24} />
            </button>

            <div className="selection-phase">
                <div className="phase-header">
                    <h2 className="phase-title">Choose at least 5 movies you LOVE</h2>
                    <div className="phase-progress">{selectedMovies.size} movies selected</div>
                </div>

                {error && (
                    <div style={{
                        background: "#ef4444", color: "white", padding: "10px", borderRadius: "8px",
                        marginBottom: "10px", textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px"
                    }}>
                        {error}
                        <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>✕</button>
                    </div>
                )}

                <div className="movies-grid-scrollable">
                    {availableMovies.map((movie) => (
                        <div
                            key={movie.id}
                            className={`onboarding-movie-card ${selectedMovies.has(movie.id) ? "selected" : ""}`}
                            onClick={() => handleMovieSelect(movie.id)}
                        >
                            <div
                                className="card-image"
                                style={{ backgroundImage: `url(${movie.poster_url})` }}
                            >
                                {selectedMovies.has(movie.id) && (
                                    <div className="selected-badge">
                                        <Star size={16} color="#FFD700" fill="#FFD700" />
                                    </div>
                                )}
                                <div className="rating-badge">
                                    <Star size={10} color="#FFD700" fill="#FFD700" />
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
        </div>
    );

    // ============================================
    // RATE RELATED MOVIES PHASE (New Horizontal Layout)
    // ============================================
    const renderRateRelated = () => {
        if (relatedMovies.length === 0) return null;

        const currentMovie = relatedMovies[currentIndex];
        const hasRating = ratings.some((r) => r.movieId === currentMovie.id);
        const isLastMovie = currentIndex === relatedMovies.length - 1;

        return (
            <div className="onboarding-final-content">
                <button
                    className="back-button"
                    onClick={() => setCurrentPhase("initial-selection")}
                >
                    <ChevronLeft size={24} />
                </button>

                <div className="rating-phase-container">
                    <div className="rating-header">
                        <h1 className="rating-title">Rate These Movies</h1>
                        <p className="rating-subtitle">
                            Movie {currentIndex + 1} of {relatedMovies.length}
                        </p>
                    </div>

                    <div className="horizontal-card">
                        <div
                            className="horizontal-card-poster"
                            style={{ backgroundImage: `url(${currentMovie.poster_url})` }}
                        >
                            <div className="rating-badge" style={{ top: 16, left: 16, fontSize: 14, padding: "6px 12px" }}>
                                <Star size={14} color="#FFD700" fill="#FFD700" />
                                <span>{currentMovie.imdb_rating}</span>
                            </div>
                        </div>

                        <div className="horizontal-card-content">
                            {/* Integrated Search Bar */}
                            <div className="card-search-container">
                                <Search size={16} className="search-icon" />
                                <input
                                    type="text"
                                    className="card-search-input"
                                    placeholder="Search to replace this movie..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        searchMovies(e.target.value);
                                    }}
                                />
                                {searchResults.length > 0 && (
                                    <div className="search-results-dropdown">
                                        {searchResults.map((movie) => (
                                            <div
                                                key={movie.id}
                                                className="search-result-item"
                                                onClick={() => {
                                                    addSearchedMovie(movie);
                                                    setSearchQuery("");
                                                }}
                                            >
                                                <img src={movie.poster_url} alt="" className="search-result-img" />
                                                <div>
                                                    <div style={{ color: "white", fontSize: "14px", fontWeight: "bold" }}>{movie.series_title}</div>
                                                    <div style={{ color: "#999", fontSize: "12px" }}>{movie.genre}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="movie-meta-info">
                                <div className="movie-genre-badge">{currentMovie.genre.split(',')[0]}</div>
                                <h2 className="movie-title-large">{currentMovie.series_title}</h2>
                                <div className="movie-runtime">
                                    <Clock size={14} /> {currentMovie.runtime || "N/A"}
                                    <span style={{ margin: "0 8px" }}>•</span>
                                    <Film size={14} /> {currentMovie.director || "Unknown Director"}
                                </div>
                            </div>

                            <div className="rating-area">
                                <div className="rating-slider-container">
                                    <div className="rating-value-display">
                                        <span className="rating-label">Your Rating</span>
                                        <span className="rating-number">{tempRating}/20</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="20"
                                        value={tempRating}
                                        onChange={(e) => setTempRating(Number(e.target.value))}
                                        className="custom-range"
                                    />
                                </div>

                                <div className="card-actions">
                                    <button className="btn-action btn-rate-confirm" onClick={handleConfirmRating}>
                                        {hasRating ? "Update Rating" : "Confirm Rating"}
                                    </button>
                                    <button className="btn-action btn-skip" onClick={handleNext}>
                                        Skip <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="progress-container">
                        {relatedMovies.map((_, idx) => (
                            <div
                                key={idx}
                                className={`progress-segment ${idx <= currentIndex ? "active" : ""}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // ============================================
    // COMPLETE PHASE (Preserved)
    // ============================================
    const renderComplete = () => (
        <div className="onboarding-final-content">
            <div className="welcome-phase">
                <div className="welcome-icon">
                    <Sparkles size={64} color="#22c55e" />
                </div>
                <h1 className="welcome-title">You're all set! 🎉</h1>
                <p className="welcome-subtitle">
                    Your personalized "For You" page is ready with recommendations based on
                    your taste
                </p>
                <button className="onboarding-btn primary" onClick={handleComplete}>
                    Explore Movies
                </button>
            </div>
        </div>
    );

    return (
        <div className="onboarding-final-page">
            {loading && (
                <div className="loading-overlay">
                    <div className="loader"></div>
                    <p>Processing...</p>
                </div>
            )}
            {currentPhase === "welcome" && renderWelcome()}
            {currentPhase === "initial-selection" && renderInitialSelection()}
            {currentPhase === "rate-related" && renderRateRelated()}
            {currentPhase === "complete" && renderComplete()}
        </div>
    );
};

export default MovieOnboardingFinal;
