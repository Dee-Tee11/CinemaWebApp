import React, { useEffect } from 'react';
import { Eye, EyeOff, Star, X, Clock } from 'lucide-react';
import { type GridItem, type MovieStatus } from '../MovieCard/MovieCard';
import { formatRuntime } from '../../lib/utils';
import './MovieModal.css';

// ==================== MOVIE MODAL COMPONENT ====================
interface UserMovie {
  status: MovieStatus;
  rating?: number;
}

interface MovieModalProps {
  movie: GridItem;
  userMovie: UserMovie | null;
  onClose: () => void;
  onStatusChange: (movieId: string, status: MovieStatus) => Promise<void>;
}

const MovieModal: React.FC<MovieModalProps> = ({ 
  movie, 
  userMovie,
  onClose, 
  onStatusChange
}) => {
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

  const isWatched = userMovie?.status === 'seen';
  const isWatchLater = userMovie?.status === 'saved';

  const handleToggleWatched = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = isWatched ? null : 'seen';
    await onStatusChange(movie.id, newStatus as MovieStatus);
  };

  const handleToggleWatchLater = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = isWatchLater ? null : 'Watch Later';
    await onStatusChange(movie.id, newStatus as MovieStatus);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="close-button"
        >
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
            {movie.time && `| ${formatRuntime(movie.time)}`}
          </p>

          <div>
            <h3 className="synopsis-title">Synopsis</h3>
            <p className="synopsis-text">
              {movie.synopsis ||
                'An engaging story that captivates audiences around the world. This film features a complex narrative and memorable characters that explore deep themes of the human condition, leaving a lasting mark on the history of cinema.'}
            </p>
          </div>

          <div className="modal-actions">
            <button
              onClick={handleToggleWatchLater}
              className={`add-to-favorites-button ${isWatchLater ? 'saved' : ''}`}
            >
              {isWatchLater ? 'Saved to Watch Later' : 'Save to Watch Later'}
            </button>
            
            <button
              onClick={handleToggleWatched}
              className={`watched-button ${isWatched ? 'watched' : ''}`}>
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