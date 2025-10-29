import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Bookmark,
  Play,
  Eye,
  User,
  ChevronLeft,
  UserPlus,
  Copy,
  Check,
} from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { useSupabase } from "@/hooks/useSupabase";
import "./ProfileModal.css";
import AddFriend from "../AddFriend/AddFriend";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  refreshTrigger?: number;
}

interface Friend {
  id: string;
  name: string;
}

interface FriendRequest {
  id: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
}

interface MovieStats {
  saved: number;
  watching: number;
  seen: number;
}

export default function ProfileModal({
  isOpen,
  onClose,
  refreshTrigger,
}: ProfileModalProps) {
  const { user } = useUser();
  const supabase = useSupabase();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userTag, setUserTag] = useState<string>("");
  const [tagCopied, setTagCopied] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [movieStats, setMovieStats] = useState<MovieStats>({
    saved: 0,
    watching: 0,
    seen: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setCurrentUserId(user.id);
    }
  }, [user]);

  const fetchUserTag = useCallback(async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("User")
      .select("taguser")
      .eq("id", currentUserId)
      .single();

    if (error) {
      console.error("Error fetching user tag:", error);
      return;
    }

    if (data?.taguser) {
      setUserTag(data.taguser);
    }
  }, [currentUserId, supabase]);

  const fetchMovieStats = useCallback(async () => {
    if (!currentUserId) return;

    console.log("🔄 Fetching movie stats for user:", currentUserId);

    const { data, error } = await supabase
      .from("user_movies")
      .select("status, rating")
      .eq("user_id", currentUserId);

    if (error) {
      console.error("Error fetching movie stats:", error);
      return;
    }

    console.log("📊 Raw data from DB:", data);
    console.log("📊 Unique statuses:", [...new Set(data.map((m) => m.status))]);

    const stats: MovieStats = {
      saved: data.filter((m) => m.status === "saved").length,
      watching: data.filter((m) => m.status === "watching").length,
      seen: data.filter((m) => m.status === "seen").length,
    };

    console.log("✅ Calculated stats:", stats);
    setMovieStats(stats);
  }, [currentUserId, supabase]);

  const fetchFriends = useCallback(async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("friendships")
      .select(
        `
        user_id_a,
        user_id_b,
        user_a:User!friendships_user_id_a_fkey(id, name),
        user_b:User!friendships_user_id_b_fkey(id, name)
      `
      )
      .or(`user_id_a.eq.${currentUserId},user_id_b.eq.${currentUserId}`);

    if (error) {
      console.error("Error fetching friends:", error);
      return;
    }

    const friendsList: Friend[] = data.map((friendship: any) => {
      if (friendship.user_id_a === currentUserId) {
        return {
          id: friendship.user_b.id,
          name: friendship.user_b.name,
        };
      } else {
        return {
          id: friendship.user_a.id,
          name: friendship.user_a.name,
        };
      }
    });

    setFriends(friendsList);
  }, [currentUserId, supabase]);

  const fetchFriendRequests = useCallback(async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("friend_request")
      .select(
        `
        id,
        sender_id,
        created_at,
        sender:User!friend_request_sender_id_fkey(id, name)
      `
      )
      .eq("receiver_id", currentUserId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching friend requests:", error);
      setFriendRequests([]);
      return;
    }

    const requestsList: FriendRequest[] = data.map((req: any) => ({
      id: req.id,
      sender_id: req.sender_id,
      sender_name: req.sender?.name || "Unknown User",
      created_at: req.created_at,
    }));

    setFriendRequests(requestsList);
  }, [currentUserId, supabase]);

  const fetchAllData = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    await Promise.all([
      fetchUserTag(),
      fetchFriends(),
      fetchFriendRequests(),
      fetchMovieStats(),
    ]);
    setLoading(false);
  }, [
    currentUserId,
    fetchUserTag,
    fetchFriends,
    fetchFriendRequests,
    fetchMovieStats,
  ]);

  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchAllData();
    }
  }, [isOpen, currentUserId, fetchAllData]);

  useEffect(() => {
    if (refreshTrigger !== undefined && currentUserId) {
      console.log("🔔 refreshTrigger changed:", refreshTrigger);
      fetchMovieStats();
    }
  }, [refreshTrigger, currentUserId, fetchMovieStats]);

  const handleCopyTag = async () => {
    if (!userTag) return;

    try {
      await navigator.clipboard.writeText(userTag);
      setTagCopied(true);
      setTimeout(() => setTagCopied(false), 2000);
    } catch (error) {
      console.error("Error copying tag:", error);
      alert("Failed to copy tag. Please try again.");
    }
  };

  const handleAcceptFriend = async (requestId: string, senderId: string) => {
    if (!currentUserId) return;

    try {
      const { error: updateError } = await supabase
        .from("friend_request")
        .update({ status: "accepted" })
        .eq("id", requestId);

      if (updateError) throw updateError;

      const { error: friendshipError } = await supabase
        .from("friendships")
        .insert({
          user_id_a: senderId,
          user_id_b: currentUserId,
          created_at: new Date().toISOString(),
        });

      if (friendshipError) throw friendshipError;

      await fetchAllData();
    } catch (error) {
      console.error("Error accepting friend request:", error);
      alert("Error accepting friend request. Please try again.");
    }
  };

  const handleRejectFriend = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("friend_request")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;
      await fetchFriendRequests();
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      alert("Error rejecting friend request. Please try again.");
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!currentUserId) return;

    if (!confirm("Are you sure you want to remove this friend?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .or(
          `and(user_id_a.eq.${currentUserId},user_id_b.eq.${friendId}),and(user_id_a.eq.${friendId},user_id_b.eq.${currentUserId})`
        );

      if (error) throw error;
      await fetchFriends();
    } catch (error) {
      console.error("Error removing friend:", error);
      alert("Error removing friend. Please try again.");
    }
  };

  if (!isOpen) return null;

  const userName = user?.fullName || user?.username || "User";
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";

  return (
    <>
      <div className="backdrop" onClick={onClose} />

      <div className="modal">
        <div className="header">
          {(showFriends || showFriendRequests) && (
            <button
              className="back-button"
              onClick={() => {
                setShowFriends(false);
                setShowFriendRequests(false);
              }}
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <h2
            className={`header-title ${
              showFriends || showFriendRequests ? "centered" : ""
            }`}
          >
            {showFriendRequests
              ? "Friend Requests"
              : showFriends
              ? "My Friends"
              : "My Profile"}
          </h2>
          <div className="header-buttons">
            <button
              className="icon-button add-friend"
              aria-label="Add friend"
              onClick={() => setShowAddFriend(true)}
              title="Add friend"
            >
              <UserPlus size={20} />
            </button>
            <button
              className="icon-button friend-requests"
              aria-label="View friend requests"
              onClick={() => {
                setShowFriends(false);
                setShowFriendRequests(!showFriendRequests);
              }}
            >
              <UserPlus size={20} />
              {friendRequests.length > 0 && (
                <span className="badge">{friendRequests.length}</span>
              )}
            </button>
            <button className="icon-button close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="content">
          <div className="user-info">
            <div className="avatar-container">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={userName}
                  className="avatar-image"
                />
              ) : (
                <User size={50} color="white" />
              )}
            </div>
            <h3 className="user-name">{userName}</h3>
            {userEmail && <p className="user-email">{userEmail}</p>}

            {/* Botão Copiar Tag */}
            {userTag && (
              <button
                className={`copy-tag-button ${tagCopied ? "copied" : ""}`}
                onClick={handleCopyTag}
                title="Copy your tag to share with friends"
              >
                {tagCopied ? (
                  <>
                    <Check size={18} color="#10b981" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={18} color="#991b1b" />
                    <span>Copy My Tag</span>
                  </>
                )}
              </button>
            )}

            <button
              className={`friends-toggle ${showFriends ? "underline" : ""}`}
              onClick={() => {
                setShowFriends(!showFriends);
                setShowFriendRequests(false);
              }}
            >
              <User size={18} color="#991b1b" />
              Friends: {friends.length}
            </button>
          </div>

          {loading ? (
            <div className="loading">Loading...</div>
          ) : showFriendRequests ? (
            <div className="list-container">
              {friendRequests.length > 0 ? (
                <ul className="list">
                  {friendRequests.map((request) => (
                    <li key={request.id} className="request-item">
                      <span>{request.sender_name}</span>
                      <div className="request-buttons">
                        <button
                          className="accept-friend-button"
                          onClick={() =>
                            handleAcceptFriend(request.id, request.sender_id)
                          }
                        >
                          Accept
                        </button>
                        <button
                          className="reject-friend-button"
                          onClick={() => handleRejectFriend(request.id)}
                          title="Reject request"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-items">No pending friend requests.</p>
              )}
            </div>
          ) : showFriends ? (
            <div className="list-container">
              {friends.length > 0 ? (
                <ul className="list">
                  {friends.map((friend) => (
                    <li key={friend.id} className="friend-item">
                      <div className="friend-info">
                        <div className="friend-avatar">
                          <User size={20} color="#991b1b" />
                        </div>
                        <span className="friend-name">{friend.name}</span>
                      </div>
                      <button
                        className="remove-friend-button"
                        onClick={() => handleRemoveFriend(friend.id)}
                        title="Remove friend"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-items">No friends yet.</p>
              )}
            </div>
          ) : (
            <div className="stats-grid">
              {/* Saved - Bookmark icon (igual ao MovieCard) */}
              <div className="stat-item saved">
                <div className="stat-icon saved">
                  <Bookmark size={20} color="#f59e0b" fill="#f59e0b" />
                </div>
                <div className="stat-value">{movieStats.saved}</div>
                <div className="stat-label">Saved</div>
              </div>
              {/* Watching - Play icon (igual ao MovieCard) */}
              <div className="stat-item watching">
                <div className="stat-icon watching">
                  <Play size={20} color="#10b981" fill="#10b981" />
                </div>
                <div className="stat-value">{movieStats.watching}</div>
                <div className="stat-label">Watching</div>
              </div>
              {/* Seen - Eye icon (igual ao MovieCard) */}
              <div className="stat-item seen">
                <div className="stat-icon seen">
                  <Eye size={20} color="#3b82f6" />
                </div>
                <div className="stat-value">{movieStats.seen}</div>
                <div className="stat-label">Seen</div>
              </div>
            </div>
          )}
        </div>

        {/* Add Friend Popup */}
        <AddFriend isOpen={showAddFriend} onClose={() => setShowAddFriend(false)} />
      </div>
    </>
  );
}