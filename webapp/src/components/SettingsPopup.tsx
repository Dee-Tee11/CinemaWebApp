import React from "react";
import { X, LogOut } from "lucide-react";
import { useClerk } from "@clerk/clerk-react";
import "./SettingsPopup.css";

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPopup: React.FC<SettingsPopupProps> = ({ isOpen, onClose }) => {
  const { signOut } = useClerk();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="settings-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="settings-modal">
        {/* Header */}
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button className="settings-close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="settings-content">
          {/* Logout Button */}
          <button
            className="settings-logout-button"
            onClick={() => {
              signOut();
              onClose();
            }}
          >
            <LogOut size={18} className="settings-logout-icon" />
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default SettingsPopup;