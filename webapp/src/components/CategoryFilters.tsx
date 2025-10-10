import React from 'react';

interface CategoryFiltersProps {
  selectedCategory: string | undefined;
  setSelectedCategory: (category: string | undefined) => void;
}

const categories = ['Todas', 'Action', 'Sci-Fi', 'Adventure', 'Crime', 'Drama', 'Comedy', 'Thriller'];

const categoryTranslations: Record<string, string> = {
  'todas': 'Todas',
  'action': 'Ação',
  'adventure': 'Aventura',
  'comedy': 'Comédia',
  'sci-fi': 'Ficção Científica',
  'drama': 'Drama',
  'thriller': 'Suspense',
  'crime': 'Crime'
};

const translateCategory = (category: string): string => {
  return categoryTranslations[category.toLowerCase()] || category;
};

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
        const isSelected = selectedCategory === category || (category === 'Todas' && !selectedCategory);
        
        return (
          <button
            key={category}
            onClick={() => setSelectedCategory(category === 'Todas' ? undefined : category)}
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
            {translateCategory(category)}
          </button>
        );
      })}
    </div>
  );
}