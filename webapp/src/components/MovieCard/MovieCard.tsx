import React, { useState } from "react";
import { Eye, Bookmark, Play, Star } from "lucide-react";
import "./MovieCard.css";

// TYPES
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

export type MovieStatus = "saved" | "watching" | "seen" | null;

export interface UserMovie {
  review: null;
  status: MovieStatus;
  rating: number | null;
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

// STATUS BUTTON COMPONENT
interface StatusButtonProps {
  Icon: React.ElementType;
  isActive: boolean;
  onClick: (e: React.MouseEvent) => void;
  label: string;
  statusType: "saved" | "watching" | "seen";
}

const StatusButton: React.FC<StatusButtonProps> = ({
  Icon,
  isActive,
  onClick,
  label,
  statusType,
}) => {
  return (
    <button
      className={`status-btn ${statusType} ${isActive ? "active" : ""}`}
      onClick={onClick}
      title={label}
    >
      <Icon size={16} />
    </button>
  );
};

// RATING SELECTOR COMPONENT
interface RatingSelectorProps {
  currentRating: number | null;
  onRate: (rating: number) => void;
  onClose: () => void;
}

const RatingSelector: React.FC<RatingSelectorProps> = ({
  currentRating,
  onRate,
  onClose,
}) => {
  const [tempRating, setTempRating] = useState<number>(currentRating || 20);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempRating(Number(e.target.value));
  };

  const handleConfirm = () => {
    onRate(tempRating);
    onClose();
  };

  return (
    <div className="rating-selector" onClick={(e) => e.stopPropagation()}>
      <div className="rating-title">Rate this movie</div>
      <div className="rating-slider-container">
        <div className="rating-number">{tempRating}</div>
        <input
          type="range"
          min="0"
          max="20"
          value={tempRating}
          onChange={handleChange}
          className="rating-slider"
        />
        <div className="rating-range">
          <span>0</span>
          <span>20</span>
        </div>
      </div>
      <button className="rating-confirm-btn" onClick={handleConfirm}>
        Confirm
      </button>
    </div>
  );
};

// MOVIE CARD COMPONENT
export interface MovieCardProps {
  item: GridItem;
  userMovie: UserMovie | null;
  onStatusChange: (id: string, status: MovieStatus, rating?: number) => void;
  onMouseEnter: (item: GridItem) => void;
  onMouseLeave: (item: GridItem) => void;
  onClick: (item: GridItem) => void;
}

const MovieCard: React.FC<MovieCardProps> = React.memo(
  ({
    item,
    userMovie,
    onStatusChange,
    onMouseEnter,
    onMouseLeave,
    onClick,
  }) => {
    const [showRatingSelector, setShowRatingSelector] = useState(false);

    const handleStatusClick = (e: React.MouseEvent, newStatus: MovieStatus) => {
      e.stopPropagation();

      // Se clicar no mesmo status, remove-o
      if (userMovie?.status === newStatus) {
        onStatusChange(item.id, null);
        return;
      }

      // Se mudar para "seen", mostra o seletor de rating
      if (newStatus === "seen") {
        setShowRatingSelector(true);
        return;
      }

      // Para "saved" e "watching", muda diretamente
      onStatusChange(item.id, newStatus);
    };

    const handleRate = (rating: number) => {
      onStatusChange(item.id, "seen", rating);
      setShowRatingSelector(false);
    };

    const handleCardClick = () => {
      if (!showRatingSelector) {
        onClick(item);
      }
    };

    return (
      <div
        data-key={item.id}
        className="item-wrapper"
        onMouseEnter={() => onMouseEnter(item)}
        onMouseLeave={() => onMouseLeave(item)}
        onClick={handleCardClick}
      >
        <div className="movie-card">
          <div
            className="card-image-section"
            style={{ backgroundImage: `url(${item.img})` }}
          >
            {/* Rating badge (from API) */}
            {item.rating && (
              <div className="rating-badge">
                <Star size={14} color="#FFD700" fill="#FFD700" />
                <span className="rating-text">{item.rating}</span>
              </div>
            )}

            {/* User rating (if movie is seen) */}
            {userMovie?.status === "seen" && userMovie.rating && (
              <div className="user-rating-badge">
                <Star size={14} color="#FF6B6B" fill="#FF6B6B" />
                <span className="rating-text">{userMovie.rating}/20</span>
              </div>
            )}

            {/* Status buttons */}
            <div className="status-buttons">
              <StatusButton
                Icon={Bookmark}
                isActive={userMovie?.status === "saved"}
                onClick={(e) => handleStatusClick(e, "saved")}
                label="Save to watch later"
                statusType="saved"
              />
              <StatusButton
                Icon={Play}
                isActive={userMovie?.status === "watching"}
                onClick={(e) => handleStatusClick(e, "watching")}
                label="Currently watching"
                statusType="watching"
              />
              <StatusButton
                Icon={Eye}
                isActive={userMovie?.status === "seen"}
                onClick={(e) => handleStatusClick(e, "seen")}
                label="Mark as seen"
                statusType="seen"
              />
            </div>

            {/* Rating selector overlay */}
            {showRatingSelector && (
              <RatingSelector
                currentRating={userMovie?.rating || null}
                onRate={handleRate}
                onClose={() => setShowRatingSelector(false)}
              />
            )}
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
