import React from "react";
import { useOnboarding } from "../../hooks/useOnboarding";
import { WelcomePhase, SelectionPhase, RatingPhase, CompletePhase } from "./phases";
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
        handleComplete,
        searchQuery,
        setSearchQuery,
        searchResults,
        searchMovies,
        addSearchedMovie,
    } = useOnboarding();

    return (
        <div className="onboarding-final-page">
            {loading && (
                <div className="loading-overlay">
                    <div className="loader"></div>
                    <p>Processing...</p>
                </div>
            )}

            {currentPhase === "welcome" && (
                <WelcomePhase onStart={() => setCurrentPhase("initial-selection")} />
            )}

            {currentPhase === "initial-selection" && (
                <SelectionPhase
                    availableMovies={availableMovies}
                    selectedMovies={selectedMovies}
                    loading={loading}
                    error={error}
                    onMovieSelect={handleMovieSelect}
                    onContinue={handlePhase1Complete}
                    onBack={() => setCurrentPhase("welcome")}
                    onClearError={() => setError(null)}
                />
            )}

            {currentPhase === "rate-related" && (
                <RatingPhase
                    relatedMovies={relatedMovies}
                    currentIndex={currentIndex}
                    ratings={ratings}
                    tempRating={tempRating}
                    searchQuery={searchQuery}
                    searchResults={searchResults}
                    onSetTempRating={setTempRating}
                    onConfirmRating={handleConfirmRating}
                    onNext={handleNext}
                    onBack={() => setCurrentPhase("initial-selection")}
                    onSearchChange={(query) => {
                        setSearchQuery(query);
                        searchMovies(query);
                    }}
                    onAddSearchedMovie={addSearchedMovie}
                    onClearSearch={() => setSearchQuery("")}
                />
            )}

            {currentPhase === "complete" && (
                <CompletePhase onComplete={handleComplete} />
            )}
        </div>
    );
};

export default MovieOnboardingFinal;
