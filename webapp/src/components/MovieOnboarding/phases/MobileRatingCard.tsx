import React from "react";
import { ChevronRight, Star, Clock, Film, Search } from "lucide-react";

interface Movie {
    id: number;
    series_title: string;
    genre: string;
    poster_url: string;
    imdb_rating: number;
    runtime?: string;
    director?: string;
}

interface MobileRatingCardProps {
    movie: Movie;
    tempRating: number;
    hasRating: boolean;
    searchQuery: string;
    searchResults: Movie[];
    onSetTempRating: (rating: number) => void;
    onConfirmRating: () => void;
    onNext: () => void;
    onSearchChange: (query: string) => void;
    onAddSearchedMovie: (movie: Movie) => void;
    onClearSearch: () => void;
}

const MobileRatingCard: React.FC<MobileRatingCardProps> = ({
    movie,
    tempRating,
    hasRating,
    searchQuery,
    searchResults,
    onSetTempRating,
    onConfirmRating,
    onNext,
    onSearchChange,
    onAddSearchedMovie,
    onClearSearch,
}) => {
    return (
        <div className="mobile-rating-card">
            {/* Background Poster */}
            <div
                className="mobile-card-poster"
                style={{ backgroundImage: `url(${movie.poster_url})` }}
            />

            {/* Search Overlay (Top) */}
            <div className="mobile-search-overlay">
                <div className="mobile-search-bar">
                    <Search size={18} className="mobile-search-icon" />
                    <input
                        type="text"
                        className="mobile-search-input"
                        placeholder="Search to replace..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                {searchResults.length > 0 && (
                    <div className="search-results-dropdown mobile-search-results">
                        {searchResults.map((m) => (
                            <div
                                key={m.id}
                                className="search-result-item"
                                onClick={() => {
                                    onAddSearchedMovie(m);
                                    onClearSearch();
                                }}
                            >
                                <img src={m.poster_url} alt="" className="search-result-img" />
                                <div className="search-result-info">
                                    <div className="search-result-title">{m.series_title}</div>
                                    <div className="search-result-genre">{m.genre}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Content Overlay (Bottom) */}
            <div className="mobile-card-content">
                <div className="mobile-movie-info">
                    <div className="mobile-badges">
                        <span className="movie-genre-badge">{movie.genre.split(',')[0]}</span>
                        <div className="mobile-imdb-badge">
                            <Star size={12} fill="#FFD700" color="#FFD700" />
                            <span>{movie.imdb_rating}</span>
                        </div>
                    </div>

                    <h2 className="mobile-movie-title">{movie.series_title}</h2>

                    <div className="mobile-movie-meta">
                        <span><Clock size={12} /> {movie.runtime || "N/A"}</span>
                        <span className="meta-dot">•</span>
                        <span><Film size={12} /> {movie.director || "Unknown"}</span>
                    </div>
                </div>

                <div className="mobile-rating-controls">
                    <div className="mobile-slider-wrapper">
                        <div className="mobile-slider-labels">
                            <span>Your Rating</span>
                            <span className="mobile-rating-val">{tempRating}/20</span>
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

                    <div className="mobile-actions">
                        <button className="onboarding-btn primary mobile-confirm-btn" onClick={onConfirmRating}>
                            {hasRating ? "Update" : "Rate"}
                        </button>
                        <button className="mobile-skip-btn" onClick={onNext}>
                            Skip <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileRatingCard;
