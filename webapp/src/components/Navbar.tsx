import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import Logo from "./Logo";

// Navbar Component
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

  const handleTabClick = (tab) => {
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

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  return (
    <nav
      style={{
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "0.75rem 1.5rem",
        background: isScrolled
          ? "rgba(255, 255, 255, 0.95)"
          : "rgba(255, 255, 255, 0.15)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: isScrolled
          ? "1px solid rgba(0, 0, 0, 0.1)"
          : "1px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "50px",
        boxShadow: isScrolled
          ? "0 8px 32px rgba(0, 0, 0, 0.15)"
          : "0 8px 32px rgba(0, 0, 0, 0.1)",
        transition: "all 0.3s ease",
        minWidth: searchExpanded ? "500px" : "auto",
      }}
    >
      {/* Logo */}
      <Logo width={28} height={28} color="white" />

      {/* Tabs - only visible when search is not expanded */}
      {!searchExpanded && (
        <>
          <button
            onClick={() => handleTabClick("forYou")}
            style={{
              fontSize: "1rem",
              fontWeight: activeTab === "forYou" ? "600" : "500",
              color: isScrolled
                ? activeTab === "forYou"
                  ? "#991b1b"
                  : "#1a1a1a"
                : activeTab === "forYou"
                ? "#1a1a1a"
                : "#1a1a1a",
              background:
                activeTab === "forYou"
                  ? isScrolled
                    ? "rgba(220, 38, 38, 0.1)"
                    : "rgba(255, 255, 255, 0.2)"
                  : "transparent",
              border: "none",
              padding: "0.5rem 1.5rem",
              borderRadius: "50px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              whiteSpace: "nowrap",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "forYou") {
                e.currentTarget.style.background = isScrolled
                  ? "rgba(255, 255, 255, 0.3)"
                  : "rgba(255, 255, 255, 0.2)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "forYou") {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            For You
            {activeTab === "forYou" && (
              <div
                style={{
                  position: "absolute",
                  bottom: "0",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "60%",
                  height: "3px",
                  backgroundColor: isScrolled ? "#991b1b" : "991b1b",
                  borderRadius: "2px",
                }}
              />
            )}
          </button>

          <button
            onClick={() => handleTabClick("friends")}
            style={{
              fontSize: "1rem",
              fontWeight: activeTab === "friends" ? "600" : "500",
              color: isScrolled
                ? activeTab === "friends"
                  ? "#991b1b"
                  : "#1a1a1a"
                : activeTab === "friends"
                ? "#1a1a1a"
                : "#1a1a1a",
              background:
                activeTab === "friends"
                  ? isScrolled
                    ? "rgba(220, 38, 38, 0.1)"
                    : "rgba(255, 255, 255, 0.2)"
                  : "transparent",
              border: "none",
              padding: "0.5rem 1.5rem",
              borderRadius: "50px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              whiteSpace: "nowrap",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== "friends") {
                e.currentTarget.style.background = isScrolled
                  ? "rgba(255, 255, 255, 0.3)"
                  : "rgba(255, 255, 255, 0.2)";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== "friends") {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            Friends
            {activeTab === "friends" && (
              <div
                style={{
                  position: "absolute",
                  bottom: "0",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "60%",
                  height: "3px",
                  backgroundColor: isScrolled ? "#991b1b" : "#991b1b",
                  borderRadius: "2px",
                }}
              />
            )}
          </button>
        </>
      )}

      {/* Search Bar */}
      {searchExpanded ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flex: 1,
          }}
        >
          <input
            type="text"
            placeholder="Search movies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            autoFocus
            style={{
              fontSize: "0.95rem",
              color: isScrolled ? "#1a1a1a" : "#991b1b",
              background: isScrolled
                ? "rgba(0, 0, 0, 0.05)"
                : "rgba(255, 255, 255, 0.2)",
              border: isScrolled
                ? "1px solid rgba(0, 0, 0, 0.1)"
                : "1px solid rgba(255, 255, 255, 0.3)",
              padding: "0.5rem 1.25rem",
              borderRadius: "50px",
              flex: 1,
              outline: "none",
              transition: "all 0.3s ease",
            }}
          />
          <button
            onClick={handleSearchIconClick}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1a1a1a",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#dc2626";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#1a1a1a";
            }}
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <button
          onClick={handleSearchIconClick}
          style={{
            background: isScrolled
              ? "rgba(0, 0, 0, 0.05)"
              : "rgba(255, 255, 255, 0.2)",
            border: isScrolled
              ? "1px solid rgba(0, 0, 0, 0.1)"
              : "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "50%",
            padding: "0.5rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isScrolled ? "#1a1a1a" : "#991b1b",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isScrolled
              ? "rgba(220, 38, 38, 0.1)"
              : "rgba(255, 255, 255, 0.35)";
            e.currentTarget.style.color = "#dc2626";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isScrolled
              ? "rgba(0, 0, 0, 0.05)"
              : "rgba(255, 255, 255, 0.2)";
            e.currentTarget.style.color = isScrolled ? "#1a1a1a" : "#ffffff";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <Search size={20} />
        </button>
      )}
    </nav>
  );
}
