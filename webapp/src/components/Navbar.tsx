// components/Navbar.tsx
import React, { useState } from "react";
import Logo from "./Logo";

interface NavbarProps {
  onHomeClick?: () => void;
  onDocsClick?: () => void;
  onSearch?: (query: string) => void;
}

export default function Navbar({
  onHomeClick,
  onDocsClick,
  onSearch,
}: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery);
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
        // Glassmorphism effect
        background: "rgba(255, 255, 255, 0.15)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        borderRadius: "50px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
      }}
    >
            <div style={{
        backgroundColor: '#991b1b',
        borderRadius: '50%',
        padding: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Logo width={32} height={32} className="text-white" />
      </div>
      <button
        onClick={onHomeClick}
        style={{
          fontSize: "1rem",
          fontWeight: "500",
          color: "#1a1a1a",
          background: "transparent",
          border: "none",
          padding: "0.5rem 1.5rem",
          borderRadius: "50px",
          cursor: "pointer",
          transition: "all 0.3s ease",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.4)";
          e.currentTarget.style.color = "#dc2626";
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#1a1a1a";
          e.currentTarget.style.transform = "scale(1)";
        }}
      ></button>

      {/* Barra de Pesquisa */}
      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <input
          type="text"
          placeholder="Search movies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            fontSize: "0.95rem",
            color: "#1a1a1a",
            background: "rgba(255, 255, 255, 0.2)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            padding: "0.5rem 1.25rem",
            borderRadius: "50px",
            width: "300px",
            outline: "none",
            transition: "all 0.3s ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.35)";
            e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.4)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
          }}
        />
        <button
          type="submit"
          style={{
            fontSize: "1.2rem",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "0.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        ></button>
      </form>

      <button
        onClick={onDocsClick}
        style={{
          fontSize: "1rem",
          fontWeight: "500",
          color: "#1a1a1a",
          background: "transparent",
          border: "none",
          padding: "0.5rem 1.5rem",
          borderRadius: "50px",
          cursor: "pointer",
          transition: "all 0.3s ease",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.4)";
          e.currentTarget.style.color = "#dc2626";
          e.currentTarget.style.transform = "scale(1.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#1a1a1a";
          e.currentTarget.style.transform = "scale(1)";
        }}
      ></button>
    </nav>
  );
}
