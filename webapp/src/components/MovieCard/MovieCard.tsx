import React from 'react';
import { Eye, EyeOff, Star, ThumbsUp, ThumbsDown, Heart } from 'lucide-react';
import './MovieCard.css';

// TYPES
// Note: GridItem is also used by Masonry, might need a shared types file later.
export interface Item {
  id: string;
  img: string;
  url: string;
  height: number;
  title?: string;
  category?: string;
  year?: string;
  time?: string;
  rating?: number;
  synopsis?: string;
}

export interface GridItem extends Item {
  x: number;
  y: number;
  w: number;
  h: number;
}

// UTILITIES
const formatRuntime = (minutes?: number | string): string => {
  if (!minutes) return "-";
  const mins = typeof minutes === "string" ? parseInt(minutes) : minutes;
  if (isNaN(mins)) return "-";

  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (hours === 0) return `${remainingMins}min`;
  return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`;
};


// ACTION BUTTON COMPONENT
interface ActionButtonProps {
  Icon: React.ElementType;
  onClick: (e: React.MouseEvent) => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ Icon, onClick }) => {
  return (
    <div
      className="action-button"
      onClick={onClick}
    >
      <Icon size={18} color="black" />
    </div>
  );
};


// MOVIE CARD COMPONENT
export interface MovieCardProps {
  item: GridItem;
  isWatched: boolean;
  onToggleWatched: (id: string, e: React.MouseEvent) => void;
  onMouseEnter: (item: GridItem) => void;
  onMouseLeave: (item: GridItem) => void;
  onClick: (item: GridItem) => void;
}

const MovieCard: React.FC<MovieCardProps> = React.memo(
  ({
    item,
    isWatched,
    onToggleWatched,
    onMouseEnter,
    onMouseLeave,
    onClick,
  }) => {
    return (
      <div
        data-key={item.id}
        className="item-wrapper"
        onMouseEnter={() => onMouseEnter(item)}
        onMouseLeave={() => onMouseLeave(item)}
        onClick={() => onClick(item)}
      >
        <div className="movie-card">
          <div
            className="card-image-section"
            style={{ backgroundImage: `url(${item.img})` }}
          >
            <div
              className={`watch-button ${isWatched ? 'watched' : ''}`}
              onClick={(e) => onToggleWatched(item.id, e)}
            >
              {isWatched ? (
                <Eye size={16} color="white" />
              ) : (
                <EyeOff size={16} color="white" />
              )}
            </div>

            {item.rating && (
              <div className="rating-badge">
                <Star size={14} color="#FFD700" fill="#FFD700" />
                <span className="rating-text">{item.rating}</span>
              </div>
            )}

            <div className="action-buttons">
              <ActionButton
                Icon={ThumbsUp}
                onClick={(e) => e.stopPropagation()}
              />
              <ActionButton
                Icon={ThumbsDown}
                onClick={(e) => e.stopPropagation()}
              />
              <ActionButton Icon={Heart} onClick={(e) => e.stopPropagation()} />
            </div>
          </div>

          <div className="card-info-section">
            <div className="card-category">
              {item.category || "Uncategorized"}
            </div>
            <div className="card-title">{item.title}</div>
            <div className="card-year">
              {item.time && ` ${formatRuntime(item.time)}`}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MovieCard.displayName = "MovieCard";

export default MovieCard;
