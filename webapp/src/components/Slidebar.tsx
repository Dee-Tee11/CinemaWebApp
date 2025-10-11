import React, { useState } from "react";
import { Settings, User, Compass, UserPlus } from "lucide-react";
import { useClerk } from "@clerk/clerk-react";
import SettingsPopup from "./SettingsPopup";
import AddFriendPopup from "./AddFriend/AddFriend"; // Ajuste o caminho conforme necessário

interface SidebarProps {
  onSettingsClick?: () => void;
  onProfileClick?: () => void;
  onExploreClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onSettingsClick,
  onProfileClick,
  onExploreClick,
}) => {
  const { signOut } = useClerk();
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [showAddFriendPopup, setShowAddFriendPopup] = useState(false);

  return (
    <div>
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
        {/* Profile Button */}
        <button
          onClick={onProfileClick}
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
          aria-label="Profile"
        >
          <User size={22} />
        </button>

        {/* Explore Button */}
        <button
          onClick={onExploreClick}
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
          aria-label="Explore"
        >
          <Compass size={22} />
        </button>

        {/* Adicionar Amigo Button */}
        <button
          onClick={() => setShowAddFriendPopup(true)}
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
          aria-label="Adicionar Amigo"
        >
          <UserPlus size={22} />
        </button>

        {/* Settings Button */}
        <button
          onClick={() => {
            setShowSettingsPopup(true);
            if (onSettingsClick) onSettingsClick();
          }}
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
      </aside>

      {/* Popup de Configurações */}
      <SettingsPopup
        isOpen={showSettingsPopup}
        onClose={() => setShowSettingsPopup(false)}
      />

      {/* Popup de Adicionar Amigo */}
      <AddFriendPopup
        isOpen={showAddFriendPopup}
        onClose={() => setShowAddFriendPopup(false)}
      />

      {/* Mobile Version - Hide on small screens */}
      <style>{`
        @media (max-width: 768px) {
          aside {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
