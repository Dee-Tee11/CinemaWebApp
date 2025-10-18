import React, { useState, useEffect } from "react";
import { X, UserPlus, Check } from "lucide-react";
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
  requestStatus?: 'none' | 'pending' | 'friends';
}

const AddFriendPopup: React.FC<AddFriendPopupProps> = ({ isOpen, onClose }) => {
  const supabase = useSupabase();
  const { user: clerkUser } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestedFriends, setSuggestedFriends] = useState<Friend[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Loads the authenticated user ID from Clerk
  useEffect(() => {
    const getUserId = async () => {
      if (!clerkUser) {
        console.log("User not authenticated in Clerk");
        return;
      }

      // Get the user ID from Clerk
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

  // Search for users based on searchQuery
  useEffect(() => {
    const fetchUsers = async () => {
      if (!searchQuery.trim()) {
        setSuggestedFriends([]);
        return;
      }
      console.log("Searching for users:", searchQuery);
      const { data, error } = await supabase
        .from("User")
        .select("id, name")
        .ilike("name", `%${searchQuery.trim().toLowerCase()}%`)
        .neq("id", currentUserId) // Excludes the logged in user from the results
        .limit(5);
      if (error) {
        console.error("Error fetching users:", error.message);
        setSuggestedFriends([]);
      } else {
        console.log("Search results:", data);
        
        if (!data || data.length === 0) {
          setSuggestedFriends([]);
          return;
        }

        // Check status for each user found
        const usersWithStatus = await Promise.all(
          data.map(async (user) => {
            // Check if already friends
            const { data: friendshipData } = await supabase
              .from("friendships")
              .select("*")
              .or(`and(user_id_a.eq.${currentUserId},user_id_b.eq.${user.id}),and(user_id_a.eq.${user.id},user_id_b.eq.${currentUserId})`);

            if (friendshipData && friendshipData.length > 0) {
              return { ...user, requestStatus: 'friends' as const };
            }

            // Check if there's a pending request
            const { data: requestData } = await supabase
              .from("friend_request")
              .select("*")
              .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${currentUserId})`)
              .eq("status", "pending");

            if (requestData && requestData.length > 0) {
              return { ...user, requestStatus: 'pending' as const };
            }

            return { ...user, requestStatus: 'none' as const };
          })
        );

        setSuggestedFriends(usersWithStatus);
      }
    };
    fetchUsers();
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
          status: "pending"
        })
        .select();

      if (error) {
        console.error("Error sending friend request:", error);
        console.error("Error details:", error.message, error.details, error.hint);
        alert(`Error sending friend request: ${error.message}`);
      } else {
        console.log("Friend request sent successfully!", data);
        alert("Friend request sent!");
        // Update the local state to reflect the new status
        setSuggestedFriends(prev =>
          prev.map(friend =>
            friend.id === friendId
              ? { ...friend, requestStatus: 'pending' }
              : friend
          )
        );
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="modal">
        {/* Premium Header */}
        <div className="header">
          <div className="header-content">
            <h2 className="header-title">Add a friend</h2>
            <span className="header-badge">and share moments</span>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={26} />
          </button>
        </div>

        {/* Content */}
        <div className="content">
          {/* Premium Search Bar */}
          <div className="search-container">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="search-input"
            />
            <UserPlus size={20} className="search-icon" />
          </div>

          {/* Suggested Friends List */}
          <div className="friends-list">
            {suggestedFriends.length > 0 ? (
              suggestedFriends.map((friend) => (
                <div key={friend.id} className="friend-item">
                  <span className="friend-name">{friend.name}</span>
                  {friend.requestStatus === 'friends' ? (
                    <button className="add-button friends" disabled>
                      <Check size={16} /> Friends
                    </button>
                  ) : friend.requestStatus === 'pending' ? (
                    <button className="add-button pending" disabled>
                      Pending
                    </button>
                  ) : (
                    <button
                      className="add-button"
                      onClick={() => handleAddFriend(friend.id)}
                    >
                      <UserPlus size={16} /> Add
                    </button>
                  )}
                </div>
              ))
            ) : searchQuery ? (
              <p className="no-results">No user found.</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};

export default AddFriendPopup;