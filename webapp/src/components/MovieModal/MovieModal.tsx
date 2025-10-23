import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Star, X, Heart, Save, Bookmark } from 'lucide-react';
import { type GridItem } from '../MovieCard/MovieCard';
import { formatRuntime } from '../../lib/utils';
import { useFriendsMovies } from '../../hooks/useFriendsMovies'; // Ajuste o caminho conforme necessário
import './MovieModal.css';

interface MovieModalProps {
  movie: GridItem;
  isWatched: boolean;
  onClose: () => void;
  onToggleWatched: (id: string, e: React.MouseEvent) => void;
}

const MovieModal: React.FC<MovieModalProps> = ({ 
  movie, 
  isWatched, 
  onClose, 
  onToggleWatched 
}) => {
  const [activeTab, setActiveTab] = useState<'synopsis' | 'friends'>('synopsis');
  const { friendsActivity, isLoading } = useFriendsMovies(movie.id); // Passa o movie.id como parâmetro

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="close-button">
          <X size={24} />
        </button>

        <div
          className="modal-image"
          style={{ backgroundImage: `url(${movie.img})` }}
        />

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
                <div className="friends-text">
                  {isLoading ? (
                    <p className="friend-text">Loading friends' activity...</p>
                  ) : friendsActivity.length > 0 ? (
                    friendsActivity.map((friend, index) => (
                      <p key={index} className="friend-text">
                        {friend.friend_name} - {friend.status}
                        {friend.rating ? ` (Rating: ${friend.rating}/20)` : ''} - {new Date(friend.created_at).toLocaleDateString()}
                      </p>
                    ))
                  ) : (
                    <p className="friend-text">No friends have interacted with this movie yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button className="add-to-favorites-button">
              <Bookmark size={20} />
              Add to Favorites
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatched(movie.id, e);
              }}
              className={`watched-button ${isWatched ? 'watched' : ''}`}
            >
              {isWatched ? (
                <>
                  <Eye size={20} /> Watched
                </>
              ) : (
                <>
                  <EyeOff size={20} /> Mark as Watched
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