import { useEffect, useState } from "react";
import Sidebar from "./components/Slidebar";
import Navbar from "./components/Navbar";
import CircularGallery from "./components/CircularGallery";
import { useSupabase } from "./hooks/useSupabase";
import Carousel, { type CarouselItem } from "./components/Carousel";
import {
  FiCheckCircle,
  FiMousePointer,
  FiSearch,
  FiSettings,
} from "react-icons/fi";

interface Movie {
  id: number;
  series_title: string;
  poster_url: string;
}

const instructionItems: CarouselItem[] = [
  {
    id: 1,
    title: "Welcome to CinemaApp!",
    description: "This is a brief introduction on how to use our application.",
    icon: <FiCheckCircle className="carousel-icon" />,
  },
  {
    id: 2,
    title: "Browse through the movies",
    description:
      "Use the mouse scroll or touch to navigate through the movie gallery.",
    icon: <FiMousePointer className="carousel-icon" />,
  },
  {
    id: 3,
    title: "Search for movies",
    description: "Use the search bar at the top to find specific movies.",
    icon: <FiSearch className="carousel-icon" />,
  },
  {
    id: 4,
    title: "Access settings",
    description:
      "Click on the settings icon in the sidebar to access your settings.",
    icon: <FiSettings className="carousel-icon" />,
  },
];

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showInstructions, setShowInstructions] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const supabase = useSupabase();

  const MOVIES_PER_PAGE = 20;

  const fetchMovies = async (pageToFetch: number) => {
    if (loading || !hasMore) return;

    setLoading(true);
    const from = pageToFetch * MOVIES_PER_PAGE;
    const to = from + MOVIES_PER_PAGE - 1;

    const { data, error } = await supabase
      .from("movies")
      .select("*")
      .range(from, to);

    if (error) {
      console.error("Error fetching movies:", error);
    } else if (data) {
      setMovies((prev) => [...prev, ...data]);
      if (data.length < MOVIES_PER_PAGE) {
        setHasMore(false);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (supabase) {
      fetchMovies(page);
    }
  }, [page, supabase]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const filteredMovies = movies.filter((movie) =>
    movie.series_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Adiciona o card de "Load More" ao final se houver mais filmes
  const galleryItems = filteredMovies.map((movie) => ({
    image: movie.poster_url,
    text: movie.series_title,
    isLoadMore: false,
  }));

  // Adiciona o card especial de carregar mais apenas se não houver busca ativa e houver mais filmes
  if (!searchQuery && hasMore) {
    galleryItems.push({
      image: "load-more-placeholder",
      text: loading ? "Loading..." : "Load More",
      isLoadMore: true,
    });
  }

  const handleSettingsClick = () => {
    console.log("Settings clicked!");
  };

  const handleLogoClick = () => {
    console.log("Logo clicked!");
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  if (showInstructions) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f5f5dc 0%, #faf0e6 100%)",
          padding: "2rem",
        }}
      >
        <Carousel items={instructionItems} />
        <button
          onClick={() => setShowInstructions(false)}
          style={{
            marginTop: "2rem",
            padding: "18px 48px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            border: "1.5px solid rgba(255, 255, 255, 0.4)",
            borderRadius: "50px",
            background: "#991b1b",
            color: "white",
            transition: "all 0.3s ease",
          }}
        >
          Get Started
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
      }}
    >
      <main
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #f5f5dc 0%, #faf0e6 100%)",
          overflowY: "auto",
          zIndex: 1,
        }}
      >
        <CircularGallery
          items={galleryItems}
          bend={3}
          textColor="#ffffff"
          borderRadius={0.05}
          scrollSpeed={2}
          scrollEase={0.05}
          onLoadMore={handleLoadMore}
          isLoading={loading}
        />
      </main>

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 100,
        }}
      >
        <Navbar onSearch={handleSearch} />
      </div>

      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100%",
          zIndex: 100,
        }}
      >
        <Sidebar onSettingsClick={handleSettingsClick} />
      </div>
    </div>
  );
}
