import React from "react";
import { ChevronRight, ChevronLeft, Star, Search } from "lucide-react";

interface Movie {
    id: number;
    series_title: string;
    genre: string;
    poster_url: string;
    imdb_rating: number;
    overview?: string;
    runtime?: string;
}

interface SelectionPhaseProps {
    availableMovies: Movie[];
    selectedMovies: Set<number>;
    loading: boolean;
    error: string | null;
    onMovieSelect: (movieId: number) => void;
    onContinue: () => void;
    onBack: () => void;
    onClearError: () => void;
    // Search functionality
    searchQuery: string;
    searchResults: Movie[];
    isSearching: boolean;
    onSearchChange: (query: string) => void;
    onClearSearch: () => void;
}

const SelectionPhase: React.FC<SelectionPhaseProps> = ({
    availableMovies,
    selectedMovies,
    loading,
    error,
    onMovieSelect,
    onContinue,
    onBack,
    onClearError,
    searchQuery,
    searchResults,
    isSearching,
    onSearchChange,
    onClearSearch,
}) => {
    // Determine which movies to display - search results or available movies
    const displayMovies = searchQuery.trim() ? searchResults : availableMovies;

    return (
        <div className="onboarding-final-content">
            <button className="back-button" onClick={onBack}>
                <ChevronLeft size={24} />
            </button>

            <div className="selection-phase">
                <div className="phase-header">
                    <h2 className="phase-title">Choose at least 5 movies you LOVE</h2>
                    <div className="phase-progress">{selectedMovies.size} movies selected</div>
                </div>

                {/* Search Bar */}
                <div className="selection-search-container">
                    <Search size={18} className="selection-search-icon" />
                    <input
                        type="text"
                        className="selection-search-input"
                        placeholder="Search all movies..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            className="selection-search-clear"
                            onClick={onClearSearch}
                            type="button"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={onClearError}>✕</button>
                    </div>
                )}

                <div className="movies-grid-scrollable">
                    {displayMovies.length > 0 ? (
                        displayMovies.map((movie) => (
                            <div
                                key={movie.id}
                                className={`onboarding-movie-card ${selectedMovies.has(movie.id) ? "selected" : ""}`}
                                onClick={() => onMovieSelect(movie.id)}
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
                        ))
                    ) : searchQuery.trim() && !isSearching ? (
                        <div className="no-results">
                            No movies found for "{searchQuery}"
                        </div>
                    ) : null}
                </div>

                <div className="phase-actions">
                    <button
                        className="onboarding-btn primary"
                        onClick={onContinue}
                        disabled={selectedMovies.size < 5 || loading}
                    >
                        {loading ? "Loading..." : "Continue"} <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SelectionPhase;
