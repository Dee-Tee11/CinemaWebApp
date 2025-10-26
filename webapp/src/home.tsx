import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from '@clerk/clerk-react';
import { useSupabase } from './hooks/useSupabase';
import Sidebar from "./components/Slidebar";
import Navbar from "./components/Navbar/Navbar";
import Masonry from "./components/Masonry/Masonry";
import ProfileModal from "./components/ProfileModal/ProfileModal";
import CategoryFilters from "./components/CategoryFilters";
import SettingsPopup from "./components/SettingsPopup";
import AddFriendPopup from "./components/AddFriend/AddFriend";
import { useMovies } from "./hooks/useMovies";
import { useRecommendedMovies } from "./hooks/useRecommendedMovies";
import { useFriendsMovies } from "./hooks/useFriendsMovies";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import "./home.css";

type ViewType = "forYou" | "friends" | "explore";

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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/friends") {
      setActiveView("friends");
    } else if (path === "/explore") {
      setActiveView("explore");
    } else {
      setActiveView("forYou");
    }
    setSelectedCategory(undefined);
    setSearchQuery("");
  }, [location.pathname]);

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

        if (error && error.code !== 'PGRST116') { // Ignore "row not found" error
          throw error;
        }

        const status = data?.Onboarding_status;

        if (status === 'completed' || status === 'skipped') {
          // User is onboarded or has skipped, show the main page
          setIsCheckingOnboarding(false);
        } else {
          // Status is 'pending', null, or undefined. Redirect to onboarding
          navigate('/onboarding');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Fallback to allow access to the app even if the check fails
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [isLoaded, user, supabase, navigate]);

  const exploreMovies = useMovies(activeView, selectedCategory, searchQuery);
  const recommendedMovies = useRecommendedMovies();
  const friendsMovies = useFriendsMovies();

  const { items, isLoading, hasMore, loadMore, needsRecommendations } = 
    activeView === 'forYou' 
      ? recommendedMovies 
      : activeView === 'friends'
      ? { ...friendsMovies, needsRecommendations: false }
      : { ...exploreMovies, needsRecommendations: false };


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
  };

  // Mostrar loading enquanto verifica onboarding
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

  const itemsToDisplay = items;

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
                : "Explore"}
            </h2>
            <p className="page-subtitle">
              {searchQuery
                ? `${items.length} ${
                    items.length === 1 ? "movie found" : "movies found"
                  }`
                : activeView === "forYou"
                ? "Recommended movies based on your taste"
                : activeView === "friends"
                ? "See what your friends are watching"
                : "Filter by category and explore movies"}
            </p>

            {activeView === "explore" && !searchQuery && (
              <CategoryFilters
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
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

          {activeView === 'forYou' && needsRecommendations && (
            <div className="no-movies-container">
              <p>Rate at least 5 movies to get personalized recommendations. 🎬</p>
            </div>
          )}

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

          <Masonry items={itemsToDisplay} />

          {items.length === 0 && !isLoading && !needsRecommendations && activeView !== 'friends' && (
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

          {isLoading && (
            <div className="loading-container">
              Loading more movies...
            </div>
          )}

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