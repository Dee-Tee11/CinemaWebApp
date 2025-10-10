import { useMemo, useState, useEffect } from "react";
import Sidebar from "./components/Slidebar";
import Navbar from "./components/Navbar";
import Masonry from "./components/Masonry";
import ProfileModal from "./components/ProfileModal";
import CategoryFilters from "./components/CategoryFilters";
import { useSupabase } from "./hooks/useSupabase";
import SettingsPopup from "./components/SettingsPopup";
import AddFriendPopup from "./components/AddFriend";

interface Item {
  id: string;
  img: string;
  url: string;
  height: number;
  title?: string;
  time?: string;
  category?: string;
  year?: string;
  rating?: number;
  synopsis?: string;
}

export default function Home() {
  const supabase = useSupabase();
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
  const [items, setItems] = useState<Item[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const INITIAL_LOAD = 30;
  const ITEMS_PER_PAGE = 5;

  const fetchMovies = async (page: number, reset: boolean = false) => {
    if (isLoading || (!hasMore && !reset)) return;

    setIsLoading(true);
    const itemsToFetch = page === 0 ? INITIAL_LOAD : ITEMS_PER_PAGE;
    const from = page === 0 ? 0 : INITIAL_LOAD + (page - 1) * ITEMS_PER_PAGE;
    const to = from + itemsToFetch - 1;

    let query = supabase
      .from("movies")
      .select(
        "id, series_title, poster_url, runtime, genre, imdb_rating, overview"
      );

    if (searchQuery.trim()) {
      const searchTerm = searchQuery.trim();
      query = query.or(`series_title.ilike.%${searchTerm}%`);
    }

    if (activeView === "explore" && selectedCategory && !searchQuery) {
      query = query.ilike("genre", `%${selectedCategory}%`);
    }

    const { data, error } = await query.range(from, to);

    if (error) {
      console.error("Error fetching movies:", error);
      setIsLoading(false);
      return;
    }

    console.log("Data received from Supabase:", data);
    console.log("Number of movies:", data?.length);
    console.log("Active filter:", { activeView, selectedCategory });

    const formattedItems = data.map((movie, index) => {
      const heightVariations = [600, 700, 800, 850, 900, 950, 1000];
      const randomHeight = heightVariations[index % heightVariations.length];

      return {
        id: movie.id.toString(),
        img: movie.poster_url,
        url: "#",
        height: randomHeight,
        title: movie.series_title,
        time: movie.runtime,
        category: movie.genre,
        year: movie.runtime
          ? new Date(movie.runtime).getFullYear().toString()
          : "2024",
        rating: movie.imdb_rating,
        synopsis: movie.overview || "Synopsis not available",
      };
    });

    setItems((prev) => (reset ? formattedItems : [...prev, ...formattedItems]));
    setHasMore(data.length === itemsToFetch);
    setIsLoading(false);

    console.log("Formatted items:", formattedItems.length);
    console.log(
      "Total items now:",
      reset ? formattedItems.length : items.length + formattedItems.length
    );
  };

  useEffect(() => {
    setItems([]);
    setCurrentPage(0);
    setHasMore(true);
    fetchMovies(0, true);
  }, [supabase, activeView, selectedCategory, searchQuery]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;

      if (
        scrollTop + clientHeight >= scrollHeight - 500 &&
        hasMore &&
        !isLoading
      ) {
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        fetchMovies(nextPage);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [currentPage, hasMore, isLoading]);

  const [userStats] = useState({
    likedMovies: 42,
    favoriteMovies: 15,
    watchedMovies: 128,
  });

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
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #fffff0 0%, #fff8dc 100%)",
        color: "#000",
      }}
    >
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

      <main
        style={{
          marginLeft: "80px",
          paddingTop: "100px",
          paddingLeft: "3rem",
          paddingRight: "3rem",
          paddingBottom: "3rem",
          minHeight: "100vh",
          backgroundColor: "transparent",
          color: "#000",
        }}
      >
        <div style={{ maxWidth: "100%", margin: "0 auto", maxHeight: "100%" }}>
          <div style={{ marginBottom: "2rem", paddingLeft: "1rem" }}>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                color: "#000000b4",
                margin: 0,
              }}
            >
              {searchQuery
                ? `Results for "${searchQuery}"`
                : activeView === "forYou"
                ? "For You"
                : activeView === "friends"
                ? "Friend's Suggestions"
                : "Explore"}
            </h2>
            <p
              style={{
                fontSize: "0.95rem",
                color: "#666",
                margin: "0.5rem 0 0 0",
              }}
            >
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
                style={{
                  marginTop: "1rem",
                  padding: "0.5rem 1rem",
                  backgroundColor: "transparent",
                  color: "rgb(153, 27, 27)",
                  border: "2px solid rgb(153, 27, 27)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "rgb(153, 27, 27)";
                  e.currentTarget.style.color = "white";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "rgb(153, 27, 27)";
                }}
              >
                ✕ Clear search
              </button>
            )}
          </div>

          <Masonry items={itemsToDisplay} />

          {items.length === 0 && !isLoading && (
            <div
              style={{
                textAlign: "center",
                padding: "4rem",
                color: "#666",
                fontSize: "1.1rem",
              }}
            >
              {searchQuery
                ? `No movies found for "${searchQuery}" 🔍`
                : "No movies found for this category 🎬"}
              <br />
              <button
                onClick={() => {
                  setSelectedCategory(undefined);
                  setSearchQuery("");
                }}
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "rgb(153, 27, 27)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "600",
                }}
              >
                See all movies
              </button>
            </div>
          )}

          {isLoading && (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "#666",
                fontSize: "1rem",
              }}
            >
              Loading more movies...
            </div>
          )}

          {!hasMore && items.length > 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "#999",
                fontSize: "0.95rem",
              }}
            >
              You have reached the end! 🎬
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
