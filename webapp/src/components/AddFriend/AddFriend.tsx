import React, { useState, useEffect } from "react";
import { X, UserPlus, Check, Search } from "lucide-react";
import { useSupabase } from "@/hooks/useSupabase";
import { useUser, useAuth } from "@clerk/clerk-react";
import {
  verifyUserInSupabase,
  searchUserByTag,
  sendFriendRequest,
} from "../../hooks/addFriend";
import type { Friend } from "../../hooks/addFriend";
import { useFriendRequests } from "../../hooks/useFriendRequests";
import "./AddFriend.css";

interface AddFriendPopupProps {
  isOpen: boolean;
  onClose: () => void;
}
//rag teste
const AddFriendPopup: React.FC<AddFriendPopupProps> = ({ isOpen, onClose }) => {
  const supabase = useSupabase();
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Friend | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const { pendingRequests, acceptRequest, declineRequest, isLoading: isRequestsLoading } = useFriendRequests();

  // Loads the authenticated user ID from Clerk
  useEffect(() => {
    const getUserId = async () => {
      if (!clerkUser) {

        return;
      }

      const userId = clerkUser.id;
      setCurrentUserId(userId);

      // Verify user exists in Supabase
      await verifyUserInSupabase(supabase, userId);
    };
    getUserId();
  }, [clerkUser, supabase]);

  // Search for user by tag
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResult(null);
        setSearchError(null);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      const { user, error } = await searchUserByTag({
        supabase,
        searchQuery,
        currentUserId,
      });

      setSearchResult(user);
      setSearchError(error);
      setIsSearching(false);
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, supabase, currentUserId]);

  const handleAddFriend = async (friendId: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const { success, error } = await sendFriendRequest({
      friendId,
      currentUserId,
      getToken,
      supabaseUrl,
      supabaseAnonKey,
    });

    if (success) {
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);

      if (searchResult && searchResult.id === friendId) {
        setSearchResult({ ...searchResult, requestStatus: "pending" });
      }
    } else {
      setSearchError(error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="modal modal-compact">
        {/* Premium Header */}
        <div className="header header-compact">
          <div className="header-content">
            <h2 className="header-title">Add Friend</h2>
          </div>
          <button className="shared-close-button" onClick={onClose} type="button">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="content content-compact">
          {/* Section: Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="pending-requests-section">
              <h3 className="section-title">Pending Requests</h3>
              <div className="friends-list">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="friend-item">
                    <div className="friend-info">
                      <span className="friend-name">{req.sender_name}</span>
                      <span className="friend-tag">Sent you a request</span>
                    </div>
                    <div className="request-actions">
                      <button
                        className="action-button accept"
                        onClick={() => acceptRequest(req.id)}
                        title="Accept"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        className="action-button decline"
                        onClick={() => declineRequest(req.id)}
                        title="Decline"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="section-divider" />
            </div>
          )}

          {/* Premium Search Bar */}
          <div className="search-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Paste friend's tag (e.g., USR-A7K9B2)"
              className="search-input"
            />
            <Search size={20} className="search-icon" />
          </div>

          {/* Search Result */}
          <div className="friends-list">
            {isSearching ? (
              <p className="loading-message">Searching...</p>
            ) : searchError ? (
              <p className="no-results">{searchError}</p>
            ) : searchResult ? (
              <div className="friend-item">
                <div className="friend-info">
                  <span className="friend-name">{searchResult.name}</span>
                  <span className="friend-tag">{searchResult.taguser}</span>
                </div>
                {searchResult.requestStatus === "friends" ? (
                  <button className="add-button friends" disabled>
                    <Check size={16} /> Friends
                  </button>
                ) : searchResult.requestStatus === "pending" ? (
                  <button className="add-button pending" disabled>
                    Pending
                  </button>
                ) : (
                  <button
                    className="add-button"
                    onClick={() => handleAddFriend(searchResult.id)}
                  >
                    <UserPlus size={16} /> Add
                  </button>
                )}
              </div>
            ) : searchQuery ? null : (
              <div className="empty-state">
                <UserPlus size={48} className="empty-icon" />
                <p className="empty-title">Find friends by tag</p>
                <p className="empty-description">
                  Ask your friend to copy their tag from their profile and paste
                  it here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Success Toast */}
        {showSuccessToast && (
          <div className="success-toast">
            <Check size={20} />
            <span>Friend request sent successfully!</span>
          </div>
        )}
      </div>
    </>
  );
};

export default AddFriendPopup;
