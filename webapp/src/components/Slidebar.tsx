import React from "react";
import { Settings, LogOut } from "lucide-react";
import { useClerk } from "@clerk/clerk-react";

interface SidebarProps {
  onSettingsClick?: () => void;
}

export default function Sidebar({ onSettingsClick }: SidebarProps) {
  const { signOut } = useClerk();

  return (
    <aside
      style={{
        position: "fixed",
        left: "1.5rem",
        top: "50%",
        transform: "translateY(-50%)",
        width: "70px",
        height: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "2rem",
        padding: "1.5rem 0",
        background: "#991b1b",
        borderRadius: "35px",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.3),
        0 2px 8px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1)
      `,
        zIndex: 1000,
      }}
    >
      {/* Logout Button */}
      <button
        onClick={() => signOut()}
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.3s ease",
          color: "rgba(255, 255, 255, 0.8)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
          e.currentTarget.style.color = "rgba(255, 255, 255, 1)";
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
          e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
          e.currentTarget.style.transform = "scale(1)";
        }}
        aria-label="Logout"
      >
        <LogOut size={22} />
      </button>

      {/* Settings Button */}
      <button
        onClick={onSettingsClick}
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.3s ease",
          color: "rgba(255, 255, 255, 0.8)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
          e.currentTarget.style.color = "rgba(255, 255, 255, 1)";
          e.currentTarget.style.transform = "scale(1.1) rotate(90deg)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
          e.currentTarget.style.color = "rgba(255, 255, 255, 0.8)";
          e.currentTarget.style.transform = "scale(1) rotate(0deg)";
        }}
        aria-label="Settings"
      >
        <Settings size={22} />
      </button>

      {/* Versão Mobile - Esconde em telas pequenas */}
      <style>{`
        @media (max-width: 768px) {
          aside {
            display: none !important;
          }
        }
      `}</style>
    </aside>
  );
}
