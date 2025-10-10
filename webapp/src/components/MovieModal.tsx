import React, { useEffect } from 'react';
import { X, Eye, EyeOff, Star } from 'lucide-react';
import { GridItem } from '../types';

interface MovieModalProps {
  movie: GridItem;
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
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-10 backdrop-blur-lg" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>

        <div
          className="flex-[0_0_45%] bg-cover bg-center min-h-[600px]"
          style={{ backgroundImage: `url(${movie.img})` }}
        />

        <div className="flex-1 p-10 overflow-y-auto flex flex-col gap-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">
              {movie.category}
            </span>
            {movie.rating && (
              <div className="flex items-center gap-1.5 bg-yellow-400/15 px-3 py-2 rounded-lg">
                <Star size={18} color="#FFD700" fill="#FFD700" />
                <span className="text-yellow-400 font-bold text-base">{movie.rating}</span>
              </div>
            )}
          </div>

          <h2 className="text-white text-4xl font-extrabold m-0 leading-tight">
            {movie.title}
          </h2>

          <p className="text-white/50 text-lg m-0 font-medium">
            {movie.year}
          </p>

          <div>
            <h3 className="text-white text-xl font-bold mb-4">Synopsis</h3>
            <p className="text-white/85 text-base leading-relaxed m-0">
              {movie.synopsis || 'An engaging story that captivates audiences around the world. This film features a complex narrative and memorable characters that explore deep themes of the human condition, leaving a lasting mark on the history of cinema.'}
            </p>
          </div>

          <div className="flex gap-3 mt-auto pt-5">
            <button
              className="bg-red-700 text-white border-none rounded-lg px-7 py-3.5 text-base font-bold cursor-pointer hover:bg-red-800 hover:-translate-y-0.5 hover:shadow-lg transition-all flex-1"
            >
              Watch Now
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatched(movie.id, e);
              }}
              className={`border-2 rounded-lg px-7 py-3.5 text-base font-bold text-white flex items-center gap-2 transition-all hover:-translate-y-0.5 ${isWatched ? 'bg-green-500/20 border-green-500/80 hover:border-green-500' : 'bg-white/10 border-white/30 hover:border-white/50'}`}
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