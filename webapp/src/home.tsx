import { useState } from "react";
import Sidebar from "./components/Slidebar";
import Navbar from "./components/Navbar/Navbar";
import Masonry from "./components/Masonry/Masonry";
import ProfileModal from "./components/ProfileModal/ProfileModal";
import CategoryFilters from "./components/CategoryFilters";
import SettingsPopup from "./components/SettingsPopup";
import AddFriendPopup from "./components/AddFriend/AddFriend";
import { useMovies } from "./hooks/useMovies";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { useUserStats } from "./hooks/useUserStats";
import "./home.css";

export default function Home() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [activeView, setActiveView] = useState<
    "forYou" | "friends" | "explore"
  >("forYou");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { items, isLoading, hasMore, loadMore } = useMovies(
    activeView,
    selectedCategory,
    searchQuery
  );
  const userStats = useUserStats();

  useInfiniteScroll(loadMore, hasMore, isLoading);

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  const handleProfileClick = () => {
    setIsProfileOpen(true);
  };

  const handleForYouClick = () => {
    console.log("For You clicked!");
    setActiveView("forYou");
    setSelectedCategory(undefined);
  };

  const handleFriendsClick = () => {
    console.log("Friends suggestions clicked!");
    setActiveView("friends");
    setSelectedCategory(undefined);
  };

  const handleExploreClick = () => {
    console.log("Explore clicked!");
    setActiveView("explore");
    setSelectedCategory(undefined);
  };

  const handleSearch = (query: string) => {
    console.log("Searching for:", query);
    setSearchQuery(query);
    setSelectedCategory(undefined);
  };

  const itemsToDisplay = items;

  return (
    <div className="home-container">
      <Navbar
        onHomeClick={handleForYouClick}
        onFriendsClick={handleFriendsClick}
        onSearch={handleSearch}
      />

      <Sidebar
        onSettingsClick={handleSettingsClick}
        onProfileClick={handleProfileClick}
        onExploreClick={handleExploreClick}
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

          <Masonry items={itemsToDisplay} />

          {items.length === 0 && !isLoading && (
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
