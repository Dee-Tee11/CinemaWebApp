import React from "react";
import { ChevronRight, ChevronLeft, Star, Search, Clock, Film } from "lucide-react";

interface Movie {
    id: number;
    series_title: string;
    genre: string;
    poster_url: string;
    imdb_rating: number;
    runtime?: string;
    director?: string;
}

interface Rating {
    movieId: number;
    rating: number;
}

interface RatingPhaseProps {
    relatedMovies: Movie[];
    currentIndex: number;
    ratings: Rating[];
    tempRating: number;
    searchQuery: string;
    searchResults: Movie[];
    onSetTempRating: (rating: number) => void;
    onConfirmRating: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onBack: () => void;
    onSearchChange: (query: string) => void;
    onAddSearchedMovie: (movie: Movie) => void;
    onClearSearch: () => void;
}

const RatingPhase: React.FC<RatingPhaseProps> = ({
    relatedMovies,
    currentIndex,
    ratings,
    tempRating,
    searchQuery,
    searchResults,
    onSetTempRating,
    onConfirmRating,
    onNext,
    onPrevious,
    onBack,
    onSearchChange,
    onAddSearchedMovie,
    onClearSearch,
}) => {
    if (relatedMovies.length === 0) return null;

    const currentMovie = relatedMovies[currentIndex];
    const hasRating = ratings.some((r) => r.movieId === currentMovie.id);
    const isFirstMovie = currentIndex === 0;
    const isLastMovie = currentIndex === relatedMovies.length - 1;

    return (
        <div className="onboarding-final-content">
            <button className="back-button" onClick={onBack}>
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
                        <div className="rating-badge rating-badge-large">
                            <Star size={14} color="#FFD700" fill="#FFD700" />
                            <span>{currentMovie.imdb_rating}</span>
                        </div>
                    </div>

                    <div className="horizontal-card-content">
                        {/* Search Bar */}
                        <div className="card-search-container">
                            <Search size={16} className="search-icon" />
                            <input
                                type="text"
                                className="card-search-input"
                                placeholder="Search to replace this movie..."
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                            />
                            {searchResults.length > 0 && (
                                <div className="search-results-dropdown">
                                    {searchResults.map((movie) => (
                                        <div
                                            key={movie.id}
                                            className="search-result-item"
                                            onClick={() => {
                                                onAddSearchedMovie(movie);
                                                onClearSearch();
                                            }}
                                        >
                                            <img src={movie.poster_url} alt="" className="search-result-img" />
                                            <div className="search-result-info">
                                                <div className="search-result-title">{movie.series_title}</div>
                                                <div className="search-result-genre">{movie.genre}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Movie Info */}
                        <div className="movie-meta-info">
                            <div className="movie-genre-badge">{currentMovie.genre.split(',')[0]}</div>
                            <h2 className="movie-title-large">{currentMovie.series_title}</h2>
                            <div className="movie-runtime">
                                <Clock size={14} /> {currentMovie.runtime || "N/A"}
                                <span className="runtime-separator">•</span>
                                <Film size={14} /> {currentMovie.director || "Unknown Director"}
                            </div>
                        </div>

                        {/* Rating Controls */}
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
                                    onChange={(e) => onSetTempRating(Number(e.target.value))}
                                    className="custom-range"
                                />
                            </div>

                            <div className="card-actions">
                                <button className="btn-action btn-rate-confirm" onClick={onConfirmRating}>
                                    {hasRating ? "Update Rating" : "Confirm Rating"}
                                </button>
                                <button className="btn-action btn-skip" onClick={onNext}>
                                    Skip <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className="rating-navigation">
                    <button
                        className="btn-nav btn-nav-prev"
                        onClick={onPrevious}
                        disabled={isFirstMovie}
                        title="Previous"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        className="btn-nav btn-nav-next"
                        onClick={onNext}
                        title={isLastMovie ? "Complete" : "Next"}
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* Progress Bar */}
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

export default RatingPhase;
