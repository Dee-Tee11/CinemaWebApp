import React from "react";
import { ChevronRight, ChevronLeft, Star } from "lucide-react";

interface Movie {
    id: number;
    series_title: string;
    genre: string;
    poster_url: string;
    imdb_rating: number;
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
}) => {
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

                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={onClearError}>✕</button>
                    </div>
                )}

                <div className="movies-grid-scrollable">
                    {availableMovies.map((movie) => (
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
                    ))}
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
