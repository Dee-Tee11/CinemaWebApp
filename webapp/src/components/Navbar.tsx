// components/Navbar.tsx
import React, { useState } from "react";
import Logo from "./Logo";

interface NavbarProps {
  onSearch?: (query: string) => void;
}

export default function Navbar({ onSearch }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
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
        background: "#991b1b",
        borderRadius: "50px",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.3),
          0 2px 8px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.1)
        `,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "50%",
          padding: "0.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        <Logo width={32} height={32} className="text-white" />
      </div>

      {/* Barra de Pesquisa */}
      <form
        onSubmit={(e) => e.preventDefault()}
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
          onChange={handleSearchChange}
          style={{
            fontSize: "0.95rem",
            color: "#ffffff",
            background: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "0.5rem 1.25rem",
            borderRadius: "50px",
            width: "300px",
            outline: "none",
            transition: "all 0.3s ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.4)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
          }}
        />
      </form>

      <style>{`
        input::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }
      `}</style>
    </nav>
  );
}
