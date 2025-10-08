import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Eye, EyeOff, Star, ThumbsUp, ThumbsDown, Heart, X } from 'lucide-react';

// ==================== TYPES ====================
interface Item {
  id: string;
  img: string;
  url: string;
  height: number;
  title?: string;
  category?: string;
  year?: string;
  rating?: number;
  synopsis?: string;
}

interface GridItem extends Item {
  x: number;
  y: number;
  w: number;
  h: number;
}

// ==================== HOOKS ====================
const useMedia = (queries: string[], values: number[], defaultValue: number): number => {
  const get = useCallback(() => 
    values[queries.findIndex(q => matchMedia(q).matches)] ?? defaultValue,
    [queries, values, defaultValue]
  );
  
  const [value, setValue] = useState<number>(get);

  useEffect(() => {
    const handler = () => setValue(get);
    queries.forEach(q => matchMedia(q).addEventListener('change', handler));
    return () => queries.forEach(q => matchMedia(q).removeEventListener('change', handler));
  }, [queries, get]);

  return value;
};

const useMeasure = <T extends HTMLElement>() => {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return [ref, size] as const;
};

// ==================== UTILITIES ====================
const preloadImages = async (urls: string[]): Promise<void> => {
  await Promise.all(
    urls.map(src => new Promise<void>(resolve => {
      const img = new Image();
      img.src = src;
      img.onload = img.onerror = () => resolve();
    }))
  );
};

// ==================== STYLES ====================
const styles = {
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '40px',
    backdropFilter: 'blur(8px)'
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: '20px',
    overflow: 'hidden',
    maxWidth: '1100px',
    width: '100%',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'row' as const,
    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.9)',
    position: 'relative' as const
  },
  closeButton: {
    position: 'absolute' as const,
    top: '20px',
    right: '20px',
    background: 'rgba(0, 0, 0, 0.7)',
    border: 'none',
    borderRadius: '50%',
    width: '44px',
    height: '44px',
    cursor: 'pointer',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s',
    zIndex: 10
  },
  movieCard: {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0px 10px 40px -10px rgba(0, 0, 0, 0.4)',
    backgroundColor: '#1a1a1a'
  },
  cardImageSection: {
    width: '100%',
    height: '70%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative' as const
  },
  watchButton: {
    position: 'absolute' as const,
    top: '12px',
    left: '12px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s',
    zIndex: 2
  },
  ratingBadge: {
    position: 'absolute' as const,
    top: '12px',
    right: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '8px',
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  actionButtons: {
    position: 'absolute' as const,
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  },
  actionButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s',
    border: 'none'
  },
  cardInfoSection: {
    height: '30%',
    backgroundColor: 'rgb(153, 27, 27)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center'
  },
  cardCategory: {
    color: 'white',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: '6px',
    opacity: 0.9
  },
  cardTitle: {
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '6px',
    lineHeight: '1.3',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const
  },
  cardYear: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '13px',
    fontWeight: '500'
  }
};

// ==================== ACTION BUTTON COMPONENT ====================
interface ActionButtonProps {
  Icon: React.ElementType;
  onClick: (e: React.MouseEvent) => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ Icon, onClick }) => {
  return (
    <div
      style={styles.actionButton}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        const icon = e.currentTarget.querySelector('svg');
        if (icon) icon.style.color = '#000';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        const icon = e.currentTarget.querySelector('svg');
        if (icon) icon.style.color = '#fff';
      }}
    >
      <Icon size={18} color="white" />
    </div>
  );
};

// ==================== MOVIE MODAL COMPONENT ====================
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
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={styles.closeButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(199, 31, 31, 0.7)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <X size={24} />
        </button>

        <div
          style={{
            flex: '0 0 45%',
            backgroundImage: `url(${movie.img})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '600px'
          }}
        />

        <div
          style={{
            flex: '1',
            padding: '50px 40px',
            overflowY: 'auto',
            background: 'linear-gradient(135deg, #fffff0 0%, #fff8dc 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span
              style={{
                backgroundColor: '#991b1bff',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '1.5px'
              }}
            >
              {movie.category}
            </span>
            {movie.rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255, 215, 0, 0.15)', padding: '8px 12px', borderRadius: '8px' }}>
                <Star size={18} color="#FFD700" fill="#FFD700" />
                <span style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '16px' }}>
                  {movie.rating}
                </span>
              </div>
            )}
          </div>

          <h2
            style={{
              color: 'black',
              fontSize: '42px',
              fontWeight: '800',
              margin: 0,
              lineHeight: '1.1',
              letterSpacing: '-0.5px'
            }}
          >
            {movie.title}
          </h2>

          <p style={{ color: 'rgba(0, 0, 0, 1)', fontSize: '18px', margin: 0, fontWeight: '500' }}>
            {movie.year}
          </p>

          <div>
            <h3 style={{ color: 'black', fontSize: '22px', marginBottom: '16px', fontWeight: '700', }}>
              Sinopse
            </h3>
            <p
              style={{
                color: 'rgba(0, 0, 0, 0.85)',
                fontSize: '16px',
                lineHeight: '1.8',
                margin: 0
              }}
            >
              {movie.synopsis || 'Uma história envolvente que cativa audiências de todo o mundo. Este filme apresenta uma narrativa complexa e personagens memoráveis que exploram temas profundos da condição humana, deixando uma marca duradoura na história do cinema.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '20px' }}>
            <button
              style={{
                backgroundColor: 'rgb(153, 27, 27)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '14px 28px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s',
                flex: '1'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(153, 27, 27)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgb(153, 27, 27)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(153, 27, 27)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Adicionar Favorito
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatched(movie.id, e);
              }}
              style={{
                backgroundColor: isWatched ? 'rgba(0, 0, 0, 1)' : 'rgba(0, 0, 0, 1)',
                color: isWatched ? 'white' : 'white',
                border: '4px solid',
                borderColor: isWatched ? 'rgba(34, 197, 94, 0.8)' : 'rgba(0, 0, 0, 0.3)',
                borderRadius: '10px',
                padding: '14px 28px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = isWatched ? 'rgba(34, 197, 94, 1)' : 'rgba(0, 0, 0, 1)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isWatched ? 'rgba(34, 197, 94, 0.8)' : 'rgba(0, 0, 0, 1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {isWatched ? (
                <>
                  <Eye size={20} /> Visto
                </>
              ) : (
                <>
                  <EyeOff size={20} /> Marcar como visto
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MOVIE CARD COMPONENT ====================
interface MovieCardProps {
  item: GridItem;
  isWatched: boolean;
  onToggleWatched: (id: string, e: React.MouseEvent) => void;
  onMouseEnter: (item: GridItem) => void;
  onMouseLeave: (item: GridItem) => void;
  onClick: (item: GridItem) => void;
}

const MovieCard: React.FC<MovieCardProps> = React.memo(({
  item,
  isWatched,
  onToggleWatched,
  onMouseEnter,
  onMouseLeave,
  onClick
}) => {
  return (
    <div
      data-key={item.id}
      style={{ position: 'absolute', cursor: 'pointer' }}
      onMouseEnter={() => onMouseEnter(item)}
      onMouseLeave={() => onMouseLeave(item)}
      onClick={() => onClick(item)}
    >
      <div style={styles.movieCard}>
        <div
          style={{
            ...styles.cardImageSection,
            backgroundImage: `url(${item.img})`
          }}
        >
          <div
            style={{
              ...styles.watchButton,
              backgroundColor: isWatched ? 'rgba(34, 197, 94, 0.9)' : 'rgba(0, 0, 0, 0.7)'
            }}
            onClick={(e) => onToggleWatched(item.id, e)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isWatched ? <Eye size={16} color="white" /> : <EyeOff size={16} color="white" />}
          </div>

          {item.rating && (
            <div style={styles.ratingBadge}>
              <Star size={14} color="#FFD700" fill="#FFD700" />
              <span style={{ color: 'white', fontSize: '13px', fontWeight: 'bold' }}>
                {item.rating}
              </span>
            </div>
          )}

          <div style={styles.actionButtons}>
            <ActionButton Icon={ThumbsUp} onClick={(e) => e.stopPropagation()} />
            <ActionButton Icon={ThumbsDown} onClick={(e) => e.stopPropagation()} />
            <ActionButton Icon={Heart} onClick={(e) => e.stopPropagation()} />
          </div>
        </div>

        <div style={styles.cardInfoSection}>
          <div style={styles.cardCategory}>
            {item.category || 'Ação'}
          </div>
          <div style={styles.cardTitle}>
            {item.title || 'Título do Filme'}
          </div>
          <div style={styles.cardYear}>
            {item.year || '2024'}
          </div>
        </div>
      </div>
    </div>
  );
});

MovieCard.displayName = 'MovieCard';

// ==================== MASONRY COMPONENT ====================
interface MasonryProps {
  items: Item[];
  ease?: string;
  duration?: number;
  stagger?: number;
  animateFrom?: 'bottom' | 'top' | 'left' | 'right' | 'center' | 'random';
  scaleOnHover?: boolean;
  hoverScale?: number;
  blurToFocus?: boolean;
}

const Masonry: React.FC<MasonryProps> = ({
  items,
  ease = 'power3.out',
  duration = 0.6,
  stagger = 0.05,
  animateFrom = 'bottom',
  scaleOnHover = true,
  hoverScale = 1.05,
  blurToFocus = true
}) => {
  const columns = useMedia(
    ['(min-width:1500px)', '(min-width:1000px)', '(min-width:600px)', '(min-width:400px)'],
    [5, 4, 3, 2],
    1
  );

  const [containerRef, { width }] = useMeasure<HTMLDivElement>();
  const [imagesReady, setImagesReady] = useState(false);
  const [watchedMovies, setWatchedMovies] = useState<Set<string>>(new Set());
  const [selectedMovie, setSelectedMovie] = useState<GridItem | null>(null);
  const hasMounted = useRef(false);

const toggleWatched = useCallback(async (id: string, e: React.MouseEvent) => {
  e.stopPropagation();
  const userId = 'currentUserId'; // Substitua por um valor dinâmico (ex.: do estado do usuário logado)
  const movieId = id;

  setWatchedMovies(prev => {
    const newSet = new Set(prev);
    const newStatus = newSet.has(id) ? 'not_watched' : 'watched';
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);

    // Atualizar o backend
    fetch('/api/user-movies/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, movieId, status: newStatus }),
    }).catch(error => console.error('Erro ao atualizar status:', error));

    return newSet;
  });
}, []);

  const getInitialPosition = useCallback((item: GridItem) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return { x: item.x, y: item.y };

    let direction = animateFrom;

    if (animateFrom === 'random') {
      const directions = ['top', 'bottom', 'left', 'right'];
      direction = directions[Math.floor(Math.random() * directions.length)] as typeof animateFrom;
    }

    switch (direction) {
      case 'top': return { x: item.x, y: -200 };
      case 'bottom': return { x: item.x, y: window.innerHeight + 200 };
      case 'left': return { x: -200, y: item.y };
      case 'right': return { x: window.innerWidth + 200, y: item.y };
      case 'center': return {
        x: containerRect.width / 2 - item.w / 2,
        y: containerRect.height / 2 - item.h / 2
      };
      default: return { x: item.x, y: item.y + 100 };
    }
  }, [animateFrom, containerRef]);

  useEffect(() => {
    preloadImages(items.map(i => i.img)).then(() => setImagesReady(true));
  }, [items]);

  const grid = useMemo<GridItem[]>(() => {
    if (!width) return [];

    const gap = 12;
    const colHeights = new Array(columns).fill(0);
    const columnWidth = (width - gap * (columns - 1)) / columns;

    return items.map(child => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = (columnWidth + gap) * col;
      const height = child.height / 2;
      const y = colHeights[col];

      colHeights[col] += height + gap;

      return { ...child, x, y, w: columnWidth, h: height };
    });
  }, [columns, items, width]);

  useLayoutEffect(() => {
    if (!imagesReady) return;

    grid.forEach((item, index) => {
      const selector = `[data-key="${item.id}"]`;
      const animationProps = {
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h
      };

      if (!hasMounted.current) {
        const initialPos = getInitialPosition(item);
        const initialState = {
          opacity: 0,
          x: initialPos.x,
          y: initialPos.y,
          width: item.w,
          height: item.h,
          ...(blurToFocus && { filter: 'blur(10px)' })
        };

        gsap.fromTo(selector, initialState, {
          opacity: 1,
          ...animationProps,
          ...(blurToFocus && { filter: 'blur(0px)' }),
          duration: 0.8,
          ease: 'power3.out',
          delay: index * stagger
        });
      } else {
        gsap.to(selector, {
          ...animationProps,
          duration: duration,
          ease: ease,
          overwrite: 'auto'
        });
      }
    });

    hasMounted.current = true;
  }, [grid, imagesReady, stagger, blurToFocus, duration, ease, getInitialPosition]);

  const handleMouseEnter = useCallback((item: GridItem) => {
    if (!scaleOnHover) return;
    gsap.to(`[data-key="${item.id}"]`, {
      scale: hoverScale,
      duration: 0.3,
      ease: 'power2.out',
      zIndex: 10
    });
  }, [scaleOnHover, hoverScale]);

  const handleMouseLeave = useCallback((item: GridItem) => {
    if (!scaleOnHover) return;
    gsap.to(`[data-key="${item.id}"]`, {
      scale: 1,
      duration: 0.3,
      ease: 'power2.out',
      zIndex: 1
    });
  }, [scaleOnHover]);

  return (
    <>
      <div ref={containerRef} style={{ position: 'relative', width: '100%', margin: '0 auto' }}>
        {grid.map(item => (
          <MovieCard
            key={item.id}
            item={item}
            isWatched={watchedMovies.has(item.id)}
            onToggleWatched={toggleWatched}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={setSelectedMovie}
          />
        ))}
      </div>

      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          isWatched={watchedMovies.has(selectedMovie.id)}
          onClose={() => setSelectedMovie(null)}
          onToggleWatched={toggleWatched}
        />
      )}
    </>
  );
};

export default Masonry;