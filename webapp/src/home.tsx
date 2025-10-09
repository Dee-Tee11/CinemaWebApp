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
  const [totalMovies, setTotalMovies] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();

  const MOVIES_PER_PAGE = 20;

  useEffect(() => {
    const getTotalCount = async () => {
      if (!supabase) return;
      const { count, error } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error fetching movie count:', error);
      } else {
        setTotalMovies(count || 0);
      }
    };
    getTotalCount();
  }, [supabase]);

  useEffect(() => {
    const fetchMovies = async (pageToFetch: number) => {
      if (!supabase) return;
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
        setMovies(data);
      }
      setLoading(false);
    };

    if (totalMovies > 0) {
      fetchMovies(page);
    }
  }, [page, supabase, totalMovies]);

  const handleNextPage = () => {
    const lastPage = Math.ceil(totalMovies / MOVIES_PER_PAGE) - 1;
    if (!loading && page < lastPage) {
      setPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (!loading && page > 0) {
      setPage((prev) => prev - 1);
    }
  };

  const filteredMovies = movies.filter((movie) =>
    movie.series_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const galleryItems = [];

  if (!searchQuery) {
    if (page > 0) {
      galleryItems.push({
        image: "prev-placeholder",
        text: "Previous",
        cardType: 'prev' as const,
      });
    }

    filteredMovies.forEach(movie => {
      galleryItems.push({
        image: movie.poster_url,
        text: movie.series_title,
      });
    });

    const lastPage = Math.ceil(totalMovies / MOVIES_PER_PAGE) - 1;
    if (page < lastPage) {
      galleryItems.push({
        image: "next-placeholder",
        text: "Next",
        cardType: 'next' as const,
      });
    }
  } else {
    // When searching, just show the filtered movies without pagination cards
    filteredMovies.forEach(movie => {
      galleryItems.push({
        image: movie.poster_url,
        text: movie.series_title,
      });
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
          onNext={handleNextPage}
          onPrev={handlePrevPage}
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
