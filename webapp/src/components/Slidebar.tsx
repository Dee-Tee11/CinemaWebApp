import React, { useState } from "react";
import { Settings, User, Compass, Menu, X, MessageCircle, Mail } from "lucide-react";

import { Link } from "react-router-dom";
import Chatbot from "./Chatbot/Chatbot";
import Contact from "./Contact/Contact";
import "./Slidebar.css";

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

interface SidebarProps {
  onSettingsClick?: () => void;
  onProfileClick?: () => void;
}


const Logo: React.FC<LogoProps> = ({ width = 48, height = 48, className }) => {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      style={{ width, height }}
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
      />
    </svg>
  );
};

const Sidebar: React.FC<SidebarProps> = ({
  onSettingsClick,
  onProfileClick,
}) => {
  const [showChatbotPopup, setShowChatbotPopup] = useState(false);
  const [showContactPopup, setShowContactPopup] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleProfileClick = () => {
    if (onProfileClick) onProfileClick();
    setIsMobileMenuOpen(false);
  };

  const handleSettingsClick = () => {
    // setShowSettingsPopup(true); // Removido
    if (onSettingsClick) onSettingsClick();
    setIsMobileMenuOpen(false);
  };



  return (
    <div>
      {/* SIDEBAR DESKTOP */}
      <aside className="sidebar-container">
        <button
          onClick={onProfileClick}
          className="sidebar-button"
          aria-label="Profile"
        >
          <User size={22} />
        </button>

        <Link
          to="/explore"
          className="sidebar-button"
          aria-label="Explore"
        >
          <Compass size={22} />
        </Link>

        <button
          onClick={() => setShowChatbotPopup(true)}
          className="sidebar-button"
          aria-label="Assistant"
        >
          <MessageCircle size={22} />
        </button>


        <button
          onClick={() => setShowContactPopup(true)}
          className="sidebar-button"
          aria-label="Contact & Support"
        >
          <Mail size={22} />
        </button>

        <button
          onClick={() => {
            // setShowSettingsPopup(true); // Removido
            if (onSettingsClick) onSettingsClick();
          }}
          className="sidebar-button sidebar-button-settings"
          aria-label="Settings"
        >
          <Settings size={22} />
        </button>
      </aside>

      {/* MOBILE HAMBURGER BUTTON */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setIsMobileMenuOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>

      {/* MOBILE BACKDROP */}
      <div
        className={`sidebar-mobile-backdrop ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      {/* MOBILE SLIDE MENU */}

      <div className={`sidebar-mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-mobile-header">
          <div className="sidebar-mobile-logo-container">
            <div className="sidebar-mobile-logo-circle">
              <Logo width={28} height={28} />
            </div>
            <h2 className="sidebar-mobile-title">Menu</h2>
          </div>
          <button
            className="sidebar-mobile-close"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-mobile-buttons">
          <button
            onClick={handleProfileClick}
            className="sidebar-mobile-button"
          >
            <span className="sidebar-mobile-button-icon">
              <User size={22} />
            </span>
            Profile
          </button>

          <Link
            to="/explore"
            className="sidebar-mobile-button"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="sidebar-mobile-button-icon">
              <Compass size={22} />
            </span>
            Explore
          </Link>

          <button
            onClick={() => {
              setShowChatbotPopup(true);
              setIsMobileMenuOpen(false);
            }}
            className="sidebar-mobile-button"
          >
            <span className="sidebar-mobile-button-icon">
              <MessageCircle size={22} />
            </span>
            AI Assistant
          </button>


          <button
            onClick={() => {
              setShowContactPopup(true);
              setIsMobileMenuOpen(false);
            }}
            className="sidebar-mobile-button"
          >
            <span className="sidebar-mobile-button-icon">
              <Mail size={22} />
            </span>
            Contact & Support
          </button>

          <button
            onClick={handleSettingsClick}
            className="sidebar-mobile-button"
          >
            <span className="sidebar-mobile-button-icon">
              <Settings size={22} />
            </span>
            Settings
          </button>
        </div>
      </div>

      {/* POPUPS */}
      {/* SettingsPopup removido de Slidebar para evitar duplicacao com Home */}


      <Chatbot
        isOpen={showChatbotPopup}
        onClose={() => setShowChatbotPopup(false)}
      />

      <Contact
        isOpen={showContactPopup}
        onClose={() => setShowContactPopup(false)}
      />
    </div>
  );
};

export default Sidebar;