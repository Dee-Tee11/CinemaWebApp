import React from 'react';
import './CategoryFilters.css';

interface CategoryFiltersProps {
  selectedCategory: string | undefined;
  setSelectedCategory: (category: string | undefined) => void;
}

const categories = [
  'All',
  'Action',
  'Sci-Fi',
  'Adventure',
  'Crime',
  'Drama',
  'Comedy',
  'Thriller',
  'Horror',
  'Romance',
  'Fantasy',
  'Mystery'
];

export default function CategoryFilters({ selectedCategory, setSelectedCategory }: CategoryFiltersProps) {
  return (
    <div className="category-filters">
      {categories.map((category) => {
        const isSelected = selectedCategory === category || (category === 'All' && !selectedCategory);
        
        return (
          <button
            key={category}
            onClick={() => setSelectedCategory(category === 'All' ? undefined : category)}
            className={`category-btn ${isSelected ? 'active' : ''}`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}