import React, { useEffect, useRef, useState } from 'react';
import { Play, Star, ThumbsUp, ThumbsDown, Heart, Eye } from 'lucide-react';

interface Movie {
  id: number;
  title: string;
  year: string;
  rating: number;
  image: string;
  genre: string;
}

const movies: Movie[] = [
  {
    id: 1,
    title: 'Inception',
    year: '2010',
    rating: 8.8,
    image: 'https://image.tmdb.org/t/p/w500/ljsZTbVsrQSqZgWeep2B1QiDKuh.jpg',
    genre: 'Ficção Científica'
  },
  {
    id: 2,
    title: 'The Dark Knight',
    year: '2008',
    rating: 9.0,
    image: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    genre: 'Ação'
  },
  {
    id: 3,
    title: 'Interstellar',
    year: '2014',
    rating: 8.6,
    image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    genre: 'Ficção Científica'
  },
  {
    id: 4,
    title: 'Pulp Fiction',
    year: '1994',
    rating: 8.9,
    image: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    genre: 'Crime'
  },
  {
    id: 5,
    title: 'The Matrix',
    year: '1999',
    rating: 8.7,
    image: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    genre: 'Ficção Científica'
  },
  {
    id: 6,
    title: 'Goodfellas',
    year: '1990',
    rating: 8.7,
    image: 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg',
    genre: 'Crime'
  }
];

function lerp(p1: number, p2: number, t: number): number {
  return p1 + (p2 - p1) * t;
}

export default function MovieGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scroll = useRef({ ease: 0.05, current: 0, target: 0, last: 0 });
  const isDown = useRef(false);
  const start = useRef(0);
  const position = useRef(0);
  const raf = useRef(0);
  const singleLoopWidth = useRef(0);

  const [movieStates, setMovieStates] = useState<{ [key: number]: { watched: boolean; liked: boolean; disliked: boolean; favorited: boolean } }>(
    movies.reduce((acc, movie) => ({ ...acc, [movie.id]: { watched: false, liked: false, disliked: false, favorited: false } }), {})
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !wrapperRef.current) return;

    singleLoopWidth.current = wrapperRef.current.clientWidth / 2;

    const onDown = (e: MouseEvent | TouchEvent) => {
      isDown.current = true;
      position.current = scroll.current.current;
      start.current = 'touches' in e ? e.touches[0].clientX : e.clientX;
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDown.current) return;
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const distance = (start.current - x) * 2;
      scroll.current.target = position.current + distance;
    };

    const onUp = () => {
      isDown.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      scroll.current.target += e.deltaY * 0.5;
    };

    container.addEventListener('mousedown', onDown);
    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseup', onUp);
    container.addEventListener('mouseleave', onUp);
    container.addEventListener('touchstart', onDown, { passive: false });
    container.addEventListener('touchmove', onMove, { passive: false });
    container.addEventListener('touchend', onUp);
    container.addEventListener('wheel', onWheel);

    const update = () => {
      scroll.current.current = lerp(scroll.current.current, scroll.current.target, scroll.current.ease);

      let current = scroll.current.current;
      const loopWidth = singleLoopWidth.current;

      if (current > loopWidth) {
        current -= loopWidth;
        scroll.current.target -= loopWidth;
      } else if (current < 0) {
        current += loopWidth;
        scroll.current.target += loopWidth;
      }

      if (wrapperRef.current) {
        wrapperRef.current.style.transform = `translateX(${-current}px)`;
      }

      scroll.current.last = scroll.current.current;
      raf.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      container.removeEventListener('mousedown', onDown);
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseup', onUp);
      container.removeEventListener('mouseleave', onUp);
      container.removeEventListener('touchstart', onDown);
      container.removeEventListener('touchmove', onMove);
      container.removeEventListener('touchend', onUp);
      container.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  const allMovies = [...movies, ...movies];

  const toggleWatched = (id: number) => {
    setMovieStates(prev => ({
      ...prev,
      [id]: { ...prev[id], watched: !prev[id].watched }
    }));
  };

  const toggleLiked = (id: number) => {
    setMovieStates(prev => ({
      ...prev,
      [id]: { ...prev[id], liked: !prev[id].liked, disliked: false }
    }));
  };

  const toggleDisliked = (id: number) => {
    setMovieStates(prev => ({
      ...prev,
      [id]: { ...prev[id], disliked: !prev[id].disliked, liked: false }
    }));
  };

  const toggleFavorited = (id: number) => {
    setMovieStates(prev => ({
      ...prev,
      [id]: { ...prev[id], favorited: !prev[id].favorited }
    }));
  };

  return (
    <div
      ref={containerRef}
      style={{
        overflowX: 'hidden',
        width: '100%',
        cursor: 'grab',
        userSelect: 'none'
      }}
    >
      <div
        ref={wrapperRef}
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '2rem',
          padding: '2rem 0'
        }}
      >
        {allMovies.map((movie, index) => (
          <div
            key={`${movie.id}-${index}`}
            style={{
              flex: '0 0 280px',
              position: 'relative',
              borderRadius: '16px',
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.4)';
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.15)';
              
              const overlay = e.currentTarget.querySelector('.movie-overlay') as HTMLElement;
              if (overlay) overlay.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.08)';
              
              const overlay = e.currentTarget.querySelector('.movie-overlay') as HTMLElement;
              if (overlay) overlay.style.opacity = '0';
            }}
          >
            {/* Imagem do filme */}
            <div style={{
              position: 'relative',
              paddingBottom: '150%',
              overflow: 'hidden'
            }}>
              <img
                src={movie.image}
                alt={movie.title}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              
              {/* Overlay com botão play */}
              <div
                className="movie-overlay"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.3s ease'
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: '#1a1a2eff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onClick={() => toggleWatched(movie.id)}
                >
                  <Play size={28} fill="currentColor" style={{ color: '#060010', marginLeft: '4px' }} />
                </div>
              </div>

              {/* Olho no canto superior esquerdo para indicar se viu */}
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  background: 'rgba(0, 0, 0, 0.8)',
                  backdropFilter: 'blur(10px)',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                onClick={() => toggleWatched(movie.id)}
              >
                <Eye
                  size={14}
                  fill={movieStates[movie.id].watched ? '#fff' : 'none'}
                  style={{ color: movieStates[movie.id].watched ? '#fff' : '#bbb', cursor: 'pointer' }}
                />
              </div>

              {/* Controles à direita (mais abaixo) */}
              <div
                style={{
                  position: 'absolute',
                  top: '60%', // Ajustado para ficar mais abaixo
                  right: '8px',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <ThumbsUp
                  size={18}
                  fill={movieStates[movie.id].liked ? '#fbbf24' : 'none'}
                  style={{ color: movieStates[movie.id].liked ? '#fbbf24' : '#fff', cursor: 'pointer' }}
                  onClick={() => toggleLiked(movie.id)}
                />
                <ThumbsDown
                  size={18}
                  fill={movieStates[movie.id].disliked ? '#ff4444' : 'none'}
                  style={{ color: movieStates[movie.id].disliked ? '#ff4444' : '#fff', cursor: 'pointer' }}
                  onClick={() => toggleDisliked(movie.id)}
                />
                <Heart
                  size={18}
                  fill={movieStates[movie.id].favorited ? '#ff69b4' : 'none'}
                  style={{ color: movieStates[movie.id].favorited ? '#ff69b4' : '#fff', cursor: 'pointer' }}
                  onClick={() => toggleFavorited(movie.id)}
                />
              </div>

              {/* Badge de rating */}
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                padding: '6px 12px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <Star size={14} fill="#fbbf24" style={{ color: '#fbbf24' }} />
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600' }}>
                  {movie.rating}
                </span>
              </div>
            </div>

            {/* Informações do filme */}
            <div style={{
              padding: '1.25rem',
              backgroundColor: '#1a1a2eff'
            }}>
              <div style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: '#fefefeff',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#1a1a2eff',
                marginBottom: '0.75rem',
                fontWeight: '500'
              }}>
                {movie.genre}
              </div>
              
              <h3 style={{
                color: '#fff',
                fontSize: '1.25rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
                lineHeight: '1.3'
              }}>
                {movie.title}
              </h3>
              
              <p style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}>
                {movie.year}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}