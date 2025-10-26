import React from 'react';
import { Bookmark, Play, Eye } from 'lucide-react';
import type { MovieStatus } from '../MovieCard/MovieCard';
import './MyMovies.css';

interface StatusFiltersProps {
  selectedStatus: MovieStatus | undefined;
  setSelectedStatus: (status: MovieStatus | undefined) => void;
  counts: {
    saved: number;
    watching: number;
    seen: number;
  };
}

export default function StatusFilters({
  selectedStatus,
  setSelectedStatus,
  counts
}: StatusFiltersProps) {
  const filters = [
    {
      value: undefined,
      label: 'All',
      icon: null,
      count: counts.saved + counts.watching + counts.seen
    },
    {
      value: 'saved' as MovieStatus,
      label: 'Saved',
      icon: <Bookmark size={16} />,
      color: '#3b82f6',
      count: counts.saved
    },
    {
      value: 'watching' as MovieStatus,
      label: 'Watching',
      icon: <Play size={16} />,
      color: '#f59e0b',
      count: counts.watching
    },
    {
      value: 'seen' as MovieStatus,
      label: 'Seen',
      icon: <Eye size={16} />,
      color: '#10b981',
      count: counts.seen
    },
  ];

  return (
    <div className="status-filters">
      {filters.map((filter) => {
        const isSelected = selectedStatus === filter.value;

        return (
          <button
            key={filter.label}
            onClick={() => setSelectedStatus(filter.value)}
            className={`status-filter-btn ${isSelected ? 'active' : ''}`}
            style={
              isSelected && filter.color
                ? { borderColor: filter.color, backgroundColor: `${filter.color}15` }
                : undefined
            }
          >
            {filter.icon && (
              <span className="status-icon" style={{ color: filter.color }}>
                {filter.icon}
              </span>
            )}
            <span className="status-label">{filter.label}</span>
            <span className="status-count">({filter.count})</span>
          </button>
        );
      })}
    </div>
  );
}