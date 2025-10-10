import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import Logo from "./Logo";
import styles from "./Navbar.module.css";

interface NavbarProps {
  onHomeClick?: () => void;
  onFriendsClick?: () => void;
  onSearch?: (query: string) => void;
}

export default function Navbar({
  onHomeClick,
  onFriendsClick,
  onSearch,
}: NavbarProps) {
  const [activeTab, setActiveTab] = useState("forYou");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setSearchExpanded(false);
    if (tab === "forYou" && onHomeClick) {
      onHomeClick();
    } else if (tab === "friends" && onFriendsClick) {
      onFriendsClick();
    }
  };

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
      <Logo width={28} height={28} color="white" />

      {/* Tabs */}
      <div
        className={`${styles.tabsContainer} ${
          searchExpanded ? styles.hidden : styles.visible
        }`}
      >
        <button
          onClick={() => handleTabClick("forYou")}
          className={`${styles.tabButton} ${
            activeTab === "forYou" ? styles.active : styles.inactive
          } ${isScrolled ? styles.scrolled : styles.default}`}
        >
          For You
          {activeTab === "forYou" && <div className={styles.tabIndicator} />}
        </button>

        <button
          onClick={() => handleTabClick("friends")}
          className={`${styles.tabButton} ${
            activeTab === "friends" ? styles.active : styles.inactive
          } ${isScrolled ? styles.scrolled : styles.default}`}
        >
          Friends
          {activeTab === "friends" && <div className={styles.tabIndicator} />}
        </button>
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
