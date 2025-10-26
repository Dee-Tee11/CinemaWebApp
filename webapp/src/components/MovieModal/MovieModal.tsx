import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Star, X, Bookmark, Play, Users } from 'lucide-react';
import { type GridItem, type UserMovie, type MovieStatus } from '../MovieCard/MovieCard';
import { formatRuntime } from '../../lib/utils';
import { useFriendsMovies } from '../../hooks/useFriendsMovies';
import './MovieModal.css';

interface MovieModalProps {
  movie: GridItem;
  userMovie: UserMovie | null;
  onClose: () => void;
  onStatusChange: (id: string, status: MovieStatus, rating?: number) => void;
}

const MovieModal: React.FC<MovieModalProps> = ({ 
  movie, 
  userMovie,
  onClose, 
  onStatusChange
}) => {
  const [activeTab, setActiveTab] = useState<'synopsis' | 'friends'>('synopsis');
  const [showRatingSelector, setShowRatingSelector] = useState(false);
  const [tempRating, setTempRating] = useState<number>(10);

  // 🎯 Buscar atividades dos amigos para ESTE filme específico
  const { friendsActivity, isLoading: loadingFriends } = useFriendsMovies(movie.id);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);
    
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleStatusClick = (e: React.MouseEvent, newStatus: MovieStatus) => {
    e.stopPropagation();

    if (userMovie?.status === newStatus) {
      onStatusChange(movie.id, null);
      return;
    }

    if (newStatus === "seen") {
      setTempRating(userMovie?.rating || 10);
      setShowRatingSelector(true);
      return;
    }

    onStatusChange(movie.id, newStatus);
  };

  const handleConfirmRating = () => {
    onStatusChange(movie.id, "seen", tempRating);
    setShowRatingSelector(false);
  };

  const getStatusEmoji = (status: string) => {
    switch (status.toLowerCase()) {
      case 'seen':
        return '👁️';
      case 'watching':
        return '▶️';
      case 'saved':
      case 'watch later':
        return '🔖';
      default:
        return '⭐';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isSaved = userMovie?.status === 'saved';
  const isWatching = userMovie?.status === 'watching';
  const isSeen = userMovie?.status === 'seen';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="close-button">
          <X size={24} />
        </button>

        <div
          className="modal-image"
          style={{ backgroundImage: `url(${movie.img})` }}
        >
          {showRatingSelector && (
            <div className="modal-rating-selector-overlay" onClick={(e) => e.stopPropagation()}>
              <div className="modal-rating-selector">
                <div className="modal-rating-title">Rate this movie</div>
                <div className="modal-rating-display">{tempRating}/20</div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={tempRating}
                  onChange={(e) => setTempRating(Number(e.target.value))}
                  className="modal-rating-slider"
                />
                <div className="modal-rating-range">
                  <span>0</span>
                  <span>20</span>
                </div>
                <div className="modal-rating-actions">
                  <button 
                    className="modal-rating-confirm" 
                    onClick={handleConfirmRating}
                  >
                    Confirm
                  </button>
                  <button 
                    className="modal-rating-cancel" 
                    onClick={() => setShowRatingSelector(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-info">
          <div className="modal-header">
            <span className="modal-category">
              {movie.category || 'Uncategorized'}
            </span>
            {movie.rating && (
              <div className="modal-rating">
                <Star size={18} color="#FFD700" fill="#FFD700" />
                <span className="rating-text">{movie.rating}</span>
              </div>
            )}
          </div>

          <h2 className="modal-title">{movie.title}</h2>

          <p className="modal-runtime">
            {movie.time && `${formatRuntime(movie.time)}`}
          </p>

          {userMovie?.status === 'seen' && userMovie.rating && (
            <div className="user-rating-display">
              <Star size={20} color="#FFD700" fill="#FFD700" />
              <span>Your rating: {userMovie.rating}/20</span>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'synopsis' ? 'active' : ''}`}
              onClick={() => setActiveTab('synopsis')}
            >
              Synopsis
            </button>
            <button
              className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              Friends
              {friendsActivity.length > 0 && (
                <span className="friends-count-badge">{friendsActivity.length}</span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'synopsis' && (
              <div className="synopsis-container">
                <h3 className="synopsis-title">SYNOPSIS</h3>
                <p className="synopsis-text">
                  {movie.synopsis ||
                    'An engaging story that captivates audiences around the world. This film features a complex narrative and memorable characters that explore deep themes of the human condition, leaving a lasting mark on the history of cinema.'}
                </p>
              </div>
            )}

            {activeTab === 'friends' && (
              <div className="synopsis-container">
                <h3 className="synopsis-title">FRIENDS' ACTIVITY</h3>
                <div className="friends-activities">
                  {loadingFriends ? (
                    <div className="friends-loading">
                      <div className="loading-spinner"></div>
                      <p>Loading friends' activity...</p>
                    </div>
                  ) : friendsActivity.length > 0 ? (
                    friendsActivity.map((activity, index) => (
                      <div key={index} className="friend-activity-item">
                        <span className="friend-activity-text">
                          {activity.friend_name} - {activity.status.toLowerCase()}
                          {activity.rating && ` (Rating: ${activity.rating}/20)`} - {formatDate(activity.created_at)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="no-friends-activity">
                      <Users size={48} color="#ccc" />
                      <p>No friends have interacted with this movie yet.</p>
                      <p className="no-friends-subtitle">Be the first to rate it!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Status Action Buttons */}
          <div className="modal-status-actions">
            <button
              className={`modal-status-button saved ${isSaved ? 'active' : ''}`}
              onClick={(e) => handleStatusClick(e, 'saved')}
              title="Save to watch later"
            >
              <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              className={`modal-status-button watching ${isWatching ? 'active' : ''}`}
              onClick={(e) => handleStatusClick(e, 'watching')}
              title="Currently watching"
            >
              <Play size={20} fill={isWatching ? 'currentColor' : 'none'} />
              <span>{isWatching ? 'Watching' : 'Watch'}</span>
            </button>

            <button
              className={`modal-status-button seen ${isSeen ? 'active' : ''}`}
              onClick={(e) => handleStatusClick(e, 'seen')}
              title="Mark as seen"
            >
              {isSeen ? (
                <>
                  <Eye size={20} />
                  <span>Seen</span>
                </>
              ) : (
                <>
                  <EyeOff size={20} />
                  <span>Mark as Seen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieModal;