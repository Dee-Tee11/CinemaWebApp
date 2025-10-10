import React, { useState, useEffect } from 'react';
import { X, UserPlus as AddFriendIcon } from 'lucide-react';
import { useSupabase } from '../hooks/useSupabase'; // Adjust the path as needed
import './AddFriend.css';

interface AddFriendPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddFriendPopup: React.FC<AddFriendPopupProps> = ({ isOpen, onClose }) => {
  const supabase = useSupabase();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestedFriends, setSuggestedFriends] = useState<{ id: string; name: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Loads the authenticated user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
      else console.log('User not authenticated');
    };
    getUser();
  }, [supabase]);

  // Search for users based on searchQuery
  useEffect(() => {
    const fetchUsers = async () => {
      if (!searchQuery.trim()) {
        setSuggestedFriends([]);
        return;
      }
      console.log('Searching for users:', searchQuery);
      const { data, error } = await supabase
        .from('User')
        .select('id, name')
        .ilike('name', `%${searchQuery.trim().toLowerCase()}%`)
        .neq('id', currentUserId) // Excludes the logged in user from the results
        .limit(5);
      if (error) {
        console.error('Error fetching users:', error.message);
      } else {
        console.log('Search results:', data);
        setSuggestedFriends(data || []);
      }
    };
    fetchUsers();
  }, [searchQuery, supabase, currentUserId]);

  const handleAddFriend = async (friendId: string) => {
    if (!currentUserId) {
      console.error('User not authenticated');
      return;
    }
    console.log(`Adding friend with ID: ${friendId}`);
    const { error } = await supabase.from('FriendRequests').insert({
      user_id: currentUserId,
      friend_id: friendId,
      status: 'pending',
    });
    if (error) console.error('Error sending friend request:', error);
    else console.log('Friend request sent!');
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
            <AddFriendIcon size={20} className="search-icon" />
          </div>

          {/* Suggested Friends List */}
          <div className="friends-list">
            {suggestedFriends.length > 0 ? (
              suggestedFriends.map(friend => (
                <div key={friend.id} className="friend-item">
                  <span className="friend-name">{friend.name}</span>
                  <button className="add-button" onClick={() => handleAddFriend(friend.id)}>
                    <AddFriendIcon size={16} /> Add
                  </button>
                </div>
              ))
            ) : (
              searchQuery && <p className="no-results">No user found.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AddFriendPopup;