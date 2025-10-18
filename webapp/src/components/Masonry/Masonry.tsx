import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import MovieCard, {
  type GridItem,
  type Item,
  type MovieStatus,
  type UserMovie,
} from "../MovieCard/MovieCard";
import MovieModal from "../MovieModal/MovieModal";

// ==================== HOOKS ====================
const useMedia = (
  queries: string[],
  values: number[],
  defaultValue: number
): number => {
  const get = useCallback(
    () =>
      values[queries.findIndex((q) => matchMedia(q).matches)] ?? defaultValue,
    [queries, values, defaultValue]
  );

  const [value, setValue] = useState<number>(get);

  useEffect(() => {
    const handler = () => setValue(get);
    queries.forEach((q) => matchMedia(q).addEventListener("change", handler));
    return () =>
      queries.forEach((q) =>
        matchMedia(q).removeEventListener("change", handler)
      );
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
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = img.onerror = () => resolve();
        })
    )
  );
};

import "./Masonry.css";

// ==================== MASONRY COMPONENT ====================
interface MasonryProps {
  items: Item[];
  ease?: string;
  duration?: number;
  stagger?: number;
  animateFrom?: "bottom" | "top" | "left" | "right" | "center" | "random";
  scaleOnHover?: boolean;
  hoverScale?: number;
  blurToFocus?: boolean;
}

const Masonry: React.FC<MasonryProps> = ({
  items,
  ease = "power3.out",
  duration = 0.6,
  stagger = 0.05,
  animateFrom = "bottom",
  scaleOnHover = true,
  hoverScale = 1.05,
  blurToFocus = true,
}) => {
  const columns = useMedia(
    [
      "(min-width:1500px)",
      "(min-width:1000px)",
      "(min-width:600px)",
      "(min-width:400px)",
    ],
    [5, 4, 3, 2],
    1
  );

  const [containerRef, { width }] = useMeasure<HTMLDivElement>();
  const [imagesReady, setImagesReady] = useState(false);

  // Agora usamos um Record para guardar o estado completo de cada filme
  const [userMovies, setUserMovies] = useState<Record<string, UserMovie>>({});

  const [selectedMovie, setSelectedMovie] = useState<GridItem | null>(null);
  const hasMounted = useRef(false);

  // Nova função para lidar com mudanças de status
  const handleStatusChange = useCallback(
    async (id: string, status: MovieStatus, rating?: number) => {
      const userId = "currentUserId"; // Substituir pelo ID real do utilizador
      const movieId = id;

      setUserMovies((prev) => {
        // Se o status for null, remove o filme
        if (status === null) {
          const newState = { ...prev };
          delete newState[id];

          // API call para remover
          fetch("/api/user-movies/remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, movieId }),
          }).catch((error) => console.error("Error removing movie:", error));

          return newState;
        }

        // Atualiza o estado
        const newState = {
          ...prev,
          [id]: {
            status,
            rating:
              status === "seen" ? rating || prev[id]?.rating || null : null,
          },
        };

        // API call para atualizar
        fetch("/api/user-movies/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            movieId,
            status,
            rating: newState[id].rating,
          }),
        }).catch((error) => console.error("Error updating movie:", error));

        return newState;
      });
    },
    []
  );

  // Função para carregar os dados iniciais dos filmes do utilizador
  useEffect(() => {
    const loadUserMovies = async () => {
      const userId = "currentUserId"; // Substituir pelo ID real

      try {
        const response = await fetch(`/api/user-movies/${userId}`);
        const data = await response.json();

        // Converte o array para um Record
        const moviesMap: Record<string, UserMovie> = {};
        data.forEach((movie: any) => {
          moviesMap[movie.movie_id] = {
            status: movie.status,
            rating: movie.rating,
          };
        });

        setUserMovies(moviesMap);
      } catch (error) {
        console.error("Error loading user movies:", error);
      }
    };

    loadUserMovies();
  }, []);

  const getInitialPosition = useCallback(
    (item: GridItem) => {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return { x: item.x, y: item.y };

      let direction = animateFrom;

      if (animateFrom === "random") {
        const directions = ["top", "bottom", "left", "right"];
        direction = directions[
          Math.floor(Math.random() * directions.length)
        ] as typeof animateFrom;
      }

      switch (direction) {
        case "top":
          return { x: item.x, y: -200 };
        case "bottom":
          return { x: item.x, y: window.innerHeight + 200 };
        case "left":
          return { x: -200, y: item.y };
        case "right":
          return { x: window.innerWidth + 200, y: item.y };
        case "center":
          return {
            x: containerRect.width / 2 - item.w / 2,
            y: containerRect.height / 2 - item.h / 2,
          };
        default:
          return { x: item.x, y: item.y + 100 };
      }
    },
    [animateFrom, containerRef]
  );

  useEffect(() => {
    preloadImages(items.map((i) => i.img)).then(() => setImagesReady(true));
  }, [items]);

  const grid = useMemo<GridItem[]>(() => {
    if (!width) return [];

    const gap = 12;
    const colHeights = new Array(columns).fill(0);
    const columnWidth = (width - gap * (columns - 1)) / columns;

    return items.map((child) => {
      // Add more variation to heights for a more random look
      const heightVariation = 0.8 + Math.random() * 0.6; // Random between 0.8x and 1.4x
      const height = (child.height / 2) * heightVariation;

      // Place in shortest column for better balance
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = (columnWidth + gap) * col;
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
        height: item.h,
      };

      if (!hasMounted.current) {
        const initialPos = getInitialPosition(item);
        const initialState = {
          opacity: 0,
          x: initialPos.x,
          y: initialPos.y,
          width: item.w,
          height: item.h,
          ...(blurToFocus && { filter: "blur(10px)" }),
        };

        gsap.fromTo(selector, initialState, {
          opacity: 1,
          ...animationProps,
          ...(blurToFocus && { filter: "blur(0px)" }),
          duration: 0.8,
          ease: "power3.out",
          delay: index * stagger,
        });
      } else {
        gsap.to(selector, {
          ...animationProps,
          duration: duration,
          ease: ease,
          overwrite: "auto",
        });
      }
    });

    hasMounted.current = true;
  }, [
    grid,
    imagesReady,
    stagger,
    blurToFocus,
    duration,
    ease,
    getInitialPosition,
  ]);

  const handleMouseEnter = useCallback(
    (item: GridItem) => {
      if (!scaleOnHover) return;
      gsap.to(`[data-key="${item.id}"]`, {
        scale: hoverScale,
        duration: 0.3,
        ease: "power2.out",
        zIndex: 10,
      });
    },
    [scaleOnHover, hoverScale]
  );

  const handleMouseLeave = useCallback(
    (item: GridItem) => {
      if (!scaleOnHover) return;
      gsap.to(`[data-key="${item.id}"]`, {
        scale: 1,
        duration: 0.3,
        ease: "power2.out",
        zIndex: 1,
      });
    },
    [scaleOnHover]
  );

  return (
    <>
      <div
        ref={containerRef}
        style={{ position: "relative", width: "100%", margin: "0 auto" }}
      >
        {grid.map((item) => (
          <MovieCard
            key={item.id}
            item={item}
            userMovie={userMovies[item.id] || null}
            onStatusChange={handleStatusChange}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={setSelectedMovie}
          />
        ))}
      </div>

      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          userMovie={userMovies[selectedMovie.id] || null}
          onClose={() => setSelectedMovie(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
};

export default Masonry;
