import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from '@clerk/clerk-react';
import { useSupabase } from './hooks/useSupabase';
import Sidebar from "./components/Slidebar";
import Navbar from "./components/Navbar/Navbar";
import Masonry from "./components/Masonry/Masonry";
import ProfileModal from "./components/ProfileModal/ProfileModal";
import CategoryFilters from "./components/CategoryFilters/CategoryFilters";
import StatusFilters from "./components/MyMovies/MyMovies";
import SettingsPopup from "./components/SettingsPopup";
import AddFriendPopup from "./components/AddFriend/AddFriend";
import { useMovies } from "./hooks/useMovies";
import { useRecommendedMovies } from "./hooks/useRecommendedMovies";
import { useFriendsMovies } from "./hooks/useFriendsMovies";
import { useMyMovies } from "./hooks/useMyMovies";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import type { MovieStatus } from "./components/MovieCard/MovieCard";
import "./home.css";

type ViewType = "forYou" | "friends" | "myMovies" | "explore";

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const supabase = useSupabase();
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>("forYou");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<MovieStatus | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  // Update activeView based on route
  useEffect(() => {
    const path = location.pathname;
    if (path === "/friends") {
      setActiveView("friends");
    } else if (path === "/explore") {
      setActiveView("explore");
    } else if (path === "/mymovies") {
      setActiveView("myMovies");
    } else {
      setActiveView("forYou");
    }
    setSelectedCategory(undefined);
    setSelectedStatus(undefined);
    setSearchQuery("");
  }, [location.pathname]);

  // Check onboarding status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!isLoaded || !user || !supabase) {
        return;
      }

      try {
        const { data, error } = await supabase
          .from('User')
          .select('Onboarding_status')
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        const status = data?.Onboarding_status;

        if (status === 'completed' || status === 'skipped') {
          setIsCheckingOnboarding(false);
        } else {
          navigate('/onboarding');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [isLoaded, user, supabase, navigate]);

  // Hooks for each view
  const exploreMovies = useMovies(activeView, selectedCategory, searchQuery);
  const recommendedMovies = useRecommendedMovies();
  const friendsMovies = useFriendsMovies();
  const myMoviesData = useMyMovies(selectedStatus, searchQuery);

  // Select data based on activeView
  let currentData;
  
  if (activeView === 'forYou') {
    currentData = recommendedMovies;
  } else if (activeView === 'friends') {
    currentData = { ...friendsMovies, needsRecommendations: false };
  } else if (activeView === 'myMovies') {
    currentData = { ...myMoviesData, needsRecommendations: false };
  } else {
    currentData = { ...exploreMovies, needsRecommendations: false };
  }

  const { items, isLoading, hasMore, loadMore, needsRecommendations } = currentData;

  useInfiniteScroll(loadMore, hasMore, isLoading);

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleProfileClick = () => {
    setIsProfileOpen(true);
  };

  const handleSearch = (query: string) => {
    console.log("Searching for:", query);
    setSearchQuery(query);
    setSelectedCategory(undefined);
    setSelectedStatus(undefined);
  };

  if (isCheckingOnboarding || !isLoaded) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0a0a0a',
        color: 'white',
        fontSize: '1.2rem'
      }}>
        Loading...
      </div>
    );
  }

  const getTotalCount = () => 
    myMoviesData.counts.saved + myMoviesData.counts.watching + myMoviesData.counts.seen;

  return (
    <div className="home-container">
      <Navbar onSearch={handleSearch} />

      <Sidebar
        onSettingsClick={handleSettingsClick}
        onProfileClick={handleProfileClick}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <SettingsPopup
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <AddFriendPopup
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
      />

      <main className="main-content">
        <div className="content-wrapper">
          <div className="header-section">
            <h2 className="page-title">
              {searchQuery
                ? `Results for "${searchQuery}"`
                : activeView === "forYou"
                ? "For You"
                : activeView === "friends"
                ? "Friend's Suggestions"
                : activeView === "myMovies"
                ? "My Movies"
                : "Explore"}
            </h2>
            <p className="page-subtitle">
              {searchQuery
                ? `${items.length} ${items.length === 1 ? "movie found" : "movies found"}`
                : activeView === "forYou"
                ? "Recommended movies based on your taste"
                : activeView === "friends"
                ? "See what your friends are watching"
                : activeView === "myMovies"
                ? `You have ${getTotalCount()} movies in your collection`
                : "Filter by category and explore movies"}
            </p>

            {/* Category Filters for Explore */}
            {activeView === "explore" && !searchQuery && (
              <CategoryFilters
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
              />
            )}

            {/* Status Filters for My Movies */}
            {activeView === "myMovies" && !searchQuery && (
              <StatusFilters
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
                counts={myMoviesData.counts}
              />
            )}

            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="clear-search-button"
              >
                ✕ Clear search
              </button>
            )}
          </div>

          {/* For You - Needs Recommendations */}
          {activeView === 'forYou' && needsRecommendations && (
            <div className="no-movies-container">
              <p>Rate at least 5 movies to get personalized recommendations. 🎬</p>
            </div>
          )}

          {/* Friends - No Friends */}
          {activeView === 'friends' && !friendsMovies.hasFriends && !isLoading && (
            <div className="no-movies-container">
              <p>You don't have any friends yet. Add friends to see their activity! 👥</p>
              <button
                onClick={() => setIsAddFriendOpen(true)}
                className="see-all-movies-button"
              >
                Add Friends
              </button>
            </div>
          )}

          {/* My Movies - Empty State */}
          {activeView === 'myMovies' && items.length === 0 && !isLoading && (
            <div className="no-movies-container">
              <div className="no-movies-icon">🎬</div>
              <h3>No movies found</h3>
              <p>
                {searchQuery
                  ? `No movies found for "${searchQuery}"`
                  : selectedStatus
                  ? `You don't have any ${selectedStatus} movies yet`
                  : "Start adding movies to your collection!"}
              </p>
              {(searchQuery || selectedStatus) && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedStatus(undefined);
                  }}
                  className="see-all-movies-button"
                >
                  See all movies
                </button>
              )}
            </div>
          )}

          {/* Movies Grid */}
          {items.length > 0 && <Masonry items={items} />}

          {/* Explore - No Results */}
          {items.length === 0 && 
           !isLoading && 
           !needsRecommendations && 
           activeView !== 'friends' && 
           activeView !== 'myMovies' && (
            <div className="no-movies-container">
              {searchQuery
                ? `No movies found for "${searchQuery}" 🔍`
                : "No movies found for this category 🎬"}
              <br />
              <button
                onClick={() => {
                  setSelectedCategory(undefined);
                  setSearchQuery("");
                }}
                className="see-all-movies-button"
              >
                See all movies
              </button>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="loading-container">
              Loading more movies...
            </div>
          )}

          {/* End of Results */}
          {!hasMore && items.length > 0 && (
            <div className="end-of-results-container">
              You have reached the end! 🎬
            </div>
          )}
        </div>
      </main>
    </div>
  );
}