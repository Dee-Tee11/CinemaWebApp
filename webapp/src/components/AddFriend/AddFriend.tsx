import React, { useState, useEffect } from "react";
import { X, UserPlus, Check, Search } from "lucide-react";
import { useSupabase } from "@/hooks/useSupabase";
import { useUser } from "@clerk/clerk-react";
import "./AddFriend.css";

interface AddFriendPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Friend {
  id: string;
  name: string;
  taguser: string;
  requestStatus?: "none" | "pending" | "friends";
}

const AddFriendPopup: React.FC<AddFriendPopupProps> = ({ isOpen, onClose }) => {
  const supabase = useSupabase();
  const { user: clerkUser } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<Friend | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Loads the authenticated user ID from Clerk
  useEffect(() => {
    const getUserId = async () => {
      if (!clerkUser) {
        console.log("User not authenticated in Clerk");
        return;
      }

      const userId = clerkUser.id;
      console.log("Clerk User ID:", userId);
      setCurrentUserId(userId);

      // Verify user exists in Supabase
      const { data, error } = await supabase
        .from("User")
        .select("id")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("User not found in Supabase:", error);
      } else {
        console.log("User found in Supabase:", data);
      }
    };
    getUserId();
  }, [clerkUser, supabase]);

  // Search for user by tag
  useEffect(() => {
    const searchByTag = async () => {
      const trimmedQuery = searchQuery.trim();

      if (!trimmedQuery) {
        setSearchResult(null);
        setSearchError(null);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      console.log("Searching for tag:", trimmedQuery);

      try {
        const { data, error } = await supabase
          .from("User")
          .select("id, name, taguser")
          .eq("taguser", trimmedQuery)
          .neq("id", currentUserId) // Exclude current user
          .single();

        if (error) {
          console.log("User not found with tag:", trimmedQuery);
          setSearchResult(null);
          setSearchError("User not found with this tag");
          setIsSearching(false);
          return;
        }

        if (!data) {
          setSearchResult(null);
          setSearchError("User not found with this tag");
          setIsSearching(false);
          return;
        }

        console.log("User found:", data);

        // Check if already friends
        const { data: friendshipData } = await supabase
          .from("friendships")
          .select("*")
          .or(
            `and(user_id_a.eq.${currentUserId},user_id_b.eq.${data.id}),and(user_id_a.eq.${data.id},user_id_b.eq.${currentUserId})`
          );

        if (friendshipData && friendshipData.length > 0) {
          setSearchResult({ ...data, requestStatus: "friends" });
          setIsSearching(false);
          return;
        }

        // Check if there's a pending request
        const { data: requestData } = await supabase
          .from("friend_request")
          .select("*")
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${data.id}),and(sender_id.eq.${data.id},receiver_id.eq.${currentUserId})`
          )
          .eq("status", "pending");

        if (requestData && requestData.length > 0) {
          setSearchResult({ ...data, requestStatus: "pending" });
        } else {
          setSearchResult({ ...data, requestStatus: "none" });
        }
      } catch (err) {
        console.error("Search error:", err);
        setSearchError("Error searching for user");
        setSearchResult(null);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchByTag();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, supabase, currentUserId]);

  const handleAddFriend = async (friendId: string) => {
    if (!currentUserId) {
      console.error("User not authenticated");
      alert("You must be logged in to send friend requests");
      return;
    }

    console.log(`Sending friend request to user: ${friendId}`);
    console.log(`Current user ID: ${currentUserId}`);

    try {
      const { data, error } = await supabase
        .from("friend_request")
        .insert({
          sender_id: currentUserId,
          receiver_id: friendId,
          status: "pending",
        })
        .select();

      if (error) {
        console.error("Error sending friend request:", error);
        console.error(
          "Error details:",
          error.message,
          error.details,
          error.hint
        );
        setSearchError(`Error: ${error.message}`);
      } else {
        console.log("Friend request sent successfully!", data);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
        // Update the local state to reflect the new status
        if (searchResult && searchResult.id === friendId) {
          setSearchResult({ ...searchResult, requestStatus: "pending" });
        }
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setSearchError("An unexpected error occurred");
    }
  };

  const handlePasteTag = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setSearchQuery(text.trim());
    } catch (err) {
      console.error("Failed to read clipboard:", err);
      setSearchError("Failed to paste. Please paste manually.");
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
          <button className="close-button" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="content content-compact">
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
