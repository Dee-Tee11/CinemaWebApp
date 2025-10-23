import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { UserPlus } from "lucide-react";
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
import { useUserStats } from "./hooks/useUserStats";
import "./home.css";

type ViewType = "forYou" | "friends" | "explore";

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>("forYou");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  // Hooks para diferentes views
  const exploreMovies = useMovies(activeView, selectedCategory, searchQuery);
  const recommendedMovies = useRecommendedMovies();
  const friendsMovies = useFriendsMovies();
  const userStats = useUserStats();

  // Selecionar dados baseado na view ativa
  const getCurrentViewData = () => {
    switch (activeView) {
      case 'forYou':
        return {
          ...recommendedMovies,
          needsRecommendations: recommendedMovies.needsOnboarding
        };
      case 'friends':
        return {
          ...friendsMovies,
          needsRecommendations: false,
          noFriends: !friendsMovies.hasFriends
        };
      case 'explore':
      default:
        return {
          ...exploreMovies,
          needsRecommendations: false
        };
    }
  };

  const { 
    items, 
    isLoading, 
    hasMore, 
    loadMore, 
    needsRecommendations,
    noFriends 
  } = getCurrentViewData();

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

  const handleGoToOnboarding = async () => {
    console.log('Botão clicado!');
    console.log('User:', user);
    
    if (user) {
      try {
        console.log('Atualizando metadata...');
        await user.update({
          publicMetadata: {
            ...user.publicMetadata,
            onboardingCompleted: false,
          },
        });
        console.log('Metadata atualizado! Navegando...');
        navigate('/onboarding');
      } catch (error) {
        console.error('Erro ao atualizar:', error);
        navigate('/onboarding');
      }
    } else {
      console.error('User não encontrado');
    }
  };

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
        likedMovies={userStats.likedMovies}
        favoriteMovies={userStats.favoriteMovies}
        watchedMovies={userStats.watchedMovies}
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
                ? "Friends Activity"
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
                ? `See what your ${friendsMovies.friendsCount} ${friendsMovies.friendsCount === 1 ? 'friend is' : 'friends are'} watching`
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

          {/* For You - Needs Onboarding */}
          {activeView === 'forYou' && needsRecommendations && (
            <div className="no-movies-container">
              <p>Rate at least 5 movies to get personalized recommendations. 🎬</p>
              <div className="no-movies-buttons">
                <button
                  onClick={handleGoToOnboarding}
                  className="onboarding-cta-button"
                >
                  Start Rating Movies
                </button>
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
            </div>
          )}

          {/* Friends - No Friends Yet */}
          {activeView === 'friends' && noFriends && !isLoading && (
            <div className="no-movies-container">
              <div className="empty-friends-state">
                <UserPlus size={64} color="#991b1b" />
                <h3>No Friends Yet</h3>
                <p>Add friends to see what they're watching!</p>
                <button
                  onClick={() => setIsAddFriendOpen(true)}
                  className="add-friends-button"
                >
                  <UserPlus size={20} />
                  Add Friends
                </button>
              </div>
            </div>
          )}

          {/* Friends - Has Friends But No Activity */}
          {activeView === 'friends' && !noFriends && items.length === 0 && !isLoading && (
            <div className="no-movies-container">
              <div className="empty-friends-state">
                <p>Your friends haven't rated any movies yet. 🎬</p>
                <p className="empty-friends-subtitle">
                  Be the first to rate movies and inspire your friends!
                </p>
                <button
                  onClick={() => navigate('/explore')}
                  className="see-all-movies-button"
                >
                  Explore Movies
                </button>
              </div>
            </div>
          )}

          {/* Show Movies */}
          {items.length > 0 && <Masonry items={itemsToDisplay} />}

          {/* No Results for Search/Category */}
          {items.length === 0 && 
           !isLoading && 
           !needsRecommendations && 
           !noFriends && 
           activeView !== 'friends' && (
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