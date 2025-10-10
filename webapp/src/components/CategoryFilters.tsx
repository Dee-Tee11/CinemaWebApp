import React from 'react';

interface CategoryFiltersProps {
  selectedCategory: string | undefined;
  setSelectedCategory: (category: string | undefined) => void;
}

const categories = ['All', 'Action', 'Sci-Fi', 'Adventure', 'Crime', 'Drama', 'Comedy', 'Thriller'];



export default function CategoryFilters({ selectedCategory, setSelectedCategory }: CategoryFiltersProps) {
  return (
    <div style={{ 
      display: 'flex', 
      gap: '1rem', 
      marginTop: '1.5rem', 
      flexWrap: 'wrap',
      alignItems: 'center'
    }}>
      {categories.map((category) => {
        const isSelected = selectedCategory === category || (category === 'All' && !selectedCategory);
        
        return (
          <button
            key={category}
            onClick={() => setSelectedCategory(category === 'All' ? undefined : category)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              backgroundColor: isSelected ? '#991b1b' : 'rgba(153, 27, 27, 0.2)',
              color: isSelected ? 'white' : '#1a1a1a',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'rgba(153, 27, 27, 0.4)';
              } else {
                e.currentTarget.style.backgroundColor = '#7f1d1d';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'rgba(153, 27, 27, 0.2)';
              } else {
                e.currentTarget.style.backgroundColor = '#991b1b';
              }
            }}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}