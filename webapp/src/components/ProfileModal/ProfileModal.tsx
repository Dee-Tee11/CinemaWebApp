import React, { useState, useEffect } from 'react';
import { X, Heart, Star, Eye, User, ChevronLeft, UserPlus, Check, XCircle, Trash2 } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { useSupabase } from '@/hooks/useSupabase';
import './ProfileModal.css';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  watchLater: number;
  watched: number;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user } = useUser();
  const supabase = useSupabase();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showFriends, setShowFriends] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [movieStats, setMovieStats] = useState<MovieStats>({
    watchLater: 0,
    watched: 0
  });
  const [loading, setLoading] = useState(true);

  // Get current user ID from Clerk
  useEffect(() => {
    if (user) {
      console.log("Setting current user ID from Clerk:", user.id);
      setCurrentUserId(user.id);
    }
  }, [user]);

  // Fetch all data when modal opens
  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchAllData();
    }
  }, [isOpen, currentUserId]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchFriends(),
      fetchFriendRequests(),
      fetchMovieStats()
    ]);
    setLoading(false);
  };

  // Fetch friends list
  const fetchFriends = async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        user_id_a,
        user_id_b,
        user_a:User!friendships_user_id_a_fkey(id, name),
        user_b:User!friendships_user_id_b_fkey(id, name)
      `)
      .or(`user_id_a.eq.${currentUserId},user_id_b.eq.${currentUserId}`);

    if (error) {
      console.error('Error fetching friends:', error);
      return;
    }

    // Map friends - get the OTHER user in the friendship
    const friendsList: Friend[] = data.map((friendship: any) => {
      if (friendship.user_id_a === currentUserId) {
        return {
          id: friendship.user_b.id,
          name: friendship.user_b.name
        };
      } else {
        return {
          id: friendship.user_a.id,
          name: friendship.user_a.name
        };
      }
    });

    setFriends(friendsList);
  };

  // Fetch pending friend requests (received by current user)
  const fetchFriendRequests = async () => {
    if (!currentUserId) {
      console.log("No currentUserId, skipping fetchFriendRequests");
      return;
    }

    console.log("Fetching friend requests for user:", currentUserId);

    const { data, error } = await supabase
      .from('friend_request')
      .select(`
        id,
        sender_id,
        created_at,
        sender:User!friend_request_sender_id_fkey(id, name)
      `)
      .eq('receiver_id', currentUserId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching friend requests:', error);
      setFriendRequests([]);
      return;
    }

    console.log("Friend requests data:", data);

    const requestsList: FriendRequest[] = data.map((req: any) => ({
      id: req.id,
      sender_id: req.sender_id,
      sender_name: req.sender?.name || 'Unknown User',
      created_at: req.created_at
    }));

    console.log("Parsed friend requests:", requestsList);
    setFriendRequests(requestsList);
  };

  // Fetch movie statistics
  const fetchMovieStats = async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from('user_movies')
      .select('status')
      .eq('user_id', currentUserId);

    if (error) {
      console.error('Error fetching movie stats:', error);
      return;
    }

    console.log('Movie stats raw data:', data);

    const stats: MovieStats = {
      watchLater: data.filter(m => m.status === 'saved').length,
      watched: data.filter(m => m.status === 'seen').length
    };

    console.log('Calculated stats:', stats);
    setMovieStats(stats);
  };

  // Accept friend request
  const handleAcceptFriend = async (requestId: string, senderId: string) => {
    if (!currentUserId) return;

    try {
      // 1. Update request status to 'accepted'
      const { error: updateError } = await supabase
        .from('friend_request')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // 2. Create friendship entry
      const { error: friendshipError } = await supabase
        .from('friendships')
        .insert({
          user_id_a: senderId,
          user_id_b: currentUserId,
          created_at: new Date().toISOString()
        });

      if (friendshipError) throw friendshipError;

      console.log('Friend request accepted!');
      
      // Refresh data
      await fetchAllData();

    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Error accepting friend request. Please try again.');
    }
  };

  // Reject friend request
  const handleRejectFriend = async (requestId: string) => {
    try {
      // Update request status to 'rejected'
      const { error } = await supabase
        .from('friend_request')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;

      console.log('Friend request rejected');
      
      // Refresh requests list
      await fetchFriendRequests();

    } catch (error) {
      console.error('Error rejecting friend request:', error);
      alert('Error rejecting friend request. Please try again.');
    }
  };

  // Remove friend
  const handleRemoveFriend = async (friendId: string) => {
    if (!currentUserId) return;

    // Confirm before removing
    if (!confirm('Are you sure you want to remove this friend?')) {
      return;
    }

    try {
      // Delete friendship entry (works for both directions)
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id_a.eq.${currentUserId},user_id_b.eq.${friendId}),and(user_id_a.eq.${friendId},user_id_b.eq.${currentUserId})`);

      if (error) throw error;

      console.log('Friend removed successfully');
      
      // Refresh friends list
      await fetchFriends();

    } catch (error) {
      console.error('Error removing friend:', error);
      alert('Error removing friend. Please try again.');
    }
  };

  if (!isOpen) return null;

  const userName = user?.fullName || user?.username || 'User';
  const userEmail = user?.primaryEmailAddress?.emailAddress || '';

  return (
    <>
      {/* Backdrop */}
      <div className="backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="modal">
        {/* Header */}
        <div className="header">
          {(showFriends || showFriendRequests) && (
            <button className="back-button" onClick={() => {
              setShowFriends(false);
              setShowFriendRequests(false);
            }}>
              <ChevronLeft size={24} />
            </button>
          )}
          <h2 className={`header-title ${showFriends || showFriendRequests ? 'centered' : ''}`}>
            {showFriendRequests ? 'Friend Requests' : showFriends ? 'My Friends' : 'My Profile'}
          </h2>
          <div className="header-buttons">
            {/* Friend Requests Icon with Badge */}
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
            {/* Close Button */}
            <button className="icon-button close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="content">
          {/* User Info */}
          <div className="user-info">
            <div className="avatar-container">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={userName} className="avatar-image" />
              ) : (
                <User size={50} color="white" />
              )}
            </div>
            <h3 className="user-name">{userName}</h3>
            {userEmail && <p className="user-email">{userEmail}</p>}
            {/* Friends Toggle Button */}
            <button
              className={`friends-toggle ${showFriends ? 'underline' : ''}`}
              onClick={() => {
                setShowFriends(!showFriends);
                setShowFriendRequests(false);
              }}
            >
              <User size={18} color="#991b1b" />
              Friends: {friends.length}
            </button>
          </div>

          {/* Content Switch */}
          {loading ? (
            <div className="loading">Loading...</div>
          ) : showFriendRequests ? (
            // Friend Requests List
            <div className="list-container">
              {friendRequests.length > 0 ? (
                <ul className="list">
                  {friendRequests.map((request) => (
                    <li key={request.id} className="request-item">
                      <span>{request.sender_name}</span>
                      <div className="request-buttons">
                        <button
                          className="accept-friend-button"
                          onClick={() => handleAcceptFriend(request.id, request.sender_id)}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          className="reject-friend-button"
                          onClick={() => handleRejectFriend(request.id)}
                          title="Reject request"
                        >
                          <X size={16} />
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
            // Friends List
            <div className="list-container">
              {friends.length > 0 ? (
                <ul className="list">
                  {friends.map((friend) => (
                    <li key={friend.id} className="request-item">
                      <span>{friend.name}</span>
                      <button
                        className="remove-friend-button"
                        onClick={() => handleRemoveFriend(friend.id)}
                        title="Remove friend"
                      >
                        Remover amigo
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-items">No friends yet.</p>
              )}
            </div>
          ) : (
            // Stats Grid
            <div className="stats-grid">
              {/* Watch Later */}
              <div className="stat-item watch-later">
                <div className="stat-icon watch-later">
                  <Star size={20} color="#eab308" fill="#eab308" />
                </div>
                <div className="stat-value">{movieStats.watchLater}</div>
                <div className="stat-label">Watch Later</div>
              </div>
              {/* Watched Movies */}
              <div className="stat-item watched">
                <div className="stat-icon watched">
                  <Eye size={20} color="#3b82f6" />
                </div>
                <div className="stat-value">{movieStats.watched}</div>
                <div className="stat-label">Watched</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}