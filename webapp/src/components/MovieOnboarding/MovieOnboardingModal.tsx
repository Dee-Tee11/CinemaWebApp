import React, { useEffect } from 'react';
import { Eye, EyeOff, Star, X } from 'lucide-react';
import { formatRuntime } from '../../lib/utils';
import '../MovieModal/MovieModal.css';

interface Movie {
  id: string | number ;
  title: string;
  category: string;
  img: string;
  rating?: number;  
  time?: string;
  synopsis?: string;
}

interface MovieModalProps {
  movie: Movie;
  isWatched: boolean;
  onClose: () => void;
  onToggleWatched: (id: string, e: React.MouseEvent) => void;
}

const MovieModal: React.FC<MovieModalProps> = ({ movie, isWatched, onClose, onToggleWatched }) => {
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
              {movie.synopsis || 'An engaging story that captivates audiences around the world. This film features a complex narrative and memorable characters that explore deep themes of the human condition, leaving a lasting mark on the history of cinema.'}
            </p>
          </div>

         
        </div>
      </div>
    </div>
  );
};

export default MovieModal;