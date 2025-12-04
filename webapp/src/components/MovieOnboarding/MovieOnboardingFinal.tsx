import React, { useEffect, useRef } from "react";
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
        handlePrevious,
        handleComplete,
        // Rating phase search
        searchQuery,
        setSearchQuery,
        searchResults,
        searchMovies,
        addSearchedMovie,
        // Selection phase search
        selectionSearchQuery,
        setSelectionSearchQuery,
        selectionSearchResults,
        isSelectionSearching,
        searchMoviesForSelection,
    } = useOnboarding();

    // Debounce timer for selection search
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleSelectionSearch = (query: string) => {
        setSelectionSearchQuery(query);

        // Clear previous timer
        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }

        // Set new timer (300ms debounce)
        if (query.trim()) {
            searchTimerRef.current = setTimeout(() => {
                searchMoviesForSelection(query);
            }, 300);
        } else {
            searchMoviesForSelection("");
        }
    };

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
            }
        };
    }, []);

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
                    // Search props
                    searchQuery={selectionSearchQuery}
                    searchResults={selectionSearchResults}
                    isSearching={isSelectionSearching}
                    onSearchChange={handleSelectionSearch}
                    onClearSearch={() => {
                        setSelectionSearchQuery("");
                        searchMoviesForSelection("");
                    }}
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
                    onPrevious={handlePrevious}
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
