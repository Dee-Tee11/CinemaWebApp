import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Logo from "../Logo";
import styles from "./Navbar.module.css";

interface NavbarProps {
  onSearch?: (query: string) => void;
}

export default function Navbar({ onSearch }: NavbarProps) {
  const location = useLocation();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  const getActiveTab = () => {
    switch (location.pathname) {
      case "/friends":
        return "friends";
      case "/explore":
        return "explore";
      case "/mymovies":
        return "myMovies";
      case "/foryou":
        return "forYou";
      default:
        return "forYou";
    }
  };
  const activeTab = getActiveTab();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearchSubmit = () => {
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const handleSearchIconClick = () => {
    setSearchExpanded(!searchExpanded);
    if (searchExpanded) {
      setSearchQuery("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  return (
    <nav
      className={`${styles.navbar} ${
        isScrolled ? styles.scrolled : styles.default
      } ${searchExpanded ? styles.expanded : ""}`}
    >
      {/* Logo */}
      <Logo width={28} height={28}  />

      {/* Tabs */}
      <div
        className={`${styles.tabsContainer} ${
          searchExpanded ? styles.hidden : styles.visible
        }`}
      >
        <Link
          to="/foryou"
          className={`${styles.tabButton} ${
            activeTab === "forYou" ? styles.active : styles.inactive
          } ${isScrolled ? styles.scrolled : styles.default}`}
        >
          For You
          {activeTab === "forYou" && <div className={styles.tabIndicator} />}
        </Link>

        <Link
          to="/mymovies"
          className={`${styles.tabButton} ${
            activeTab === "myMovies" ? styles.active : styles.inactive
          } ${isScrolled ? styles.scrolled : styles.default}`}
        >
          My Movies
          {activeTab === "myMovies" && <div className={styles.tabIndicator} />}
        </Link>

        <Link
          to="/friends"
          className={`${styles.tabButton} ${
            activeTab === "friends" ? styles.active : styles.inactive
          } ${isScrolled ? styles.scrolled : styles.default}`}
        >
          Friends
          {activeTab === "friends" && <div className={styles.tabIndicator} />}
        </Link>

        <Link
          to="/explore"
          className={`${styles.tabButton} ${
            activeTab === "explore" ? styles.active : styles.inactive
          } ${isScrolled ? styles.scrolled : styles.default}`}
        >
          Explore
          {activeTab === "explore" && <div className={styles.tabIndicator} />}
        </Link>
      </div>

      {/* Search Bar */}
      <div
        className={`${styles.searchContainer} ${
          searchExpanded ? styles.expanded : styles.collapsed
        }`}
      >
        {searchExpanded && (
          <>
            <input
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              autoFocus
              className={`${styles.searchInput} ${
                isScrolled ? styles.scrolled : styles.default
              } ${styles.animate}`}
            />
            <button
              onClick={handleSearchIconClick}
              className={`${styles.closeButton} ${styles.animate}`}
            >
              <X size={20} />
            </button>
          </>
        )}
      </div>

      {/* Search Icon Button */}
      {!searchExpanded && (
        <button
          onClick={handleSearchIconClick}
          className={`${styles.searchIconButton} ${
            isScrolled ? styles.scrolled : styles.default
          }`}
        >
          <Search size={20} />
        </button>
      )}
    </nav>
  );
}