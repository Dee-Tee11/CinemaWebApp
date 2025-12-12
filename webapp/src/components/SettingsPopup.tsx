import React from "react";
<<<<<<< HEAD
import { X, LogOut, Trash2 } from "lucide-react";
import { useClerk } from "@clerk/clerk-react";
import "./SettingsPopup.css";
import { useDeleteAccount } from "../hooks/useDeleteAccount";
=======
import { X, LogOut } from "lucide-react";
import { useClerk } from "@clerk/clerk-react";
import "./SettingsPopup.css";
>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPopup: React.FC<SettingsPopupProps> = ({ isOpen, onClose }) => {
  const { signOut } = useClerk();
<<<<<<< HEAD
  const { deleteAccount, isDeleting } = useDeleteAccount();

  if (!isOpen) return null;

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    if (!window.confirm("Really? All your data (movies, friends, etc.) will be permanently deleted.")) {
      return;
    }

    try {
      await deleteAccount();
      onClose();
    } catch (error) {
      // Error is already logged in the hook, but we can show an alert here if needed
      alert("Failed to delete account. Please try again.");
    }
  };

=======

  if (!isOpen) return null;

>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b
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
<<<<<<< HEAD
            style={{ marginBottom: '1rem' }}
=======
>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b
          >
            <LogOut size={18} className="settings-logout-icon" />
            Logout
          </button>
<<<<<<< HEAD

          {/* Delete Account Button */}
          <button
            className="settings-logout-button"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            style={{
              background: 'rgba(220, 38, 38, 0.15)',
              borderColor: 'rgba(220, 38, 38, 0.3)',
              color: '#dc2626'
            }}
          >
            <Trash2 size={18} className="settings-logout-icon" />
            {isDeleting ? "Deleting..." : "Delete Account"}
          </button>
=======
>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b
        </div>
      </div>
    </>
  );
};

export default SettingsPopup;