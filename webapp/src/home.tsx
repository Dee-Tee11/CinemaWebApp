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
  const supabase = useSupabase();

  useEffect(() => {
    const fetchMovies = async () => {
      const { data, error } = await supabase.from("movies").select("*");
      if (error) {
        console.error("Error fetching movies:", error);
      } else {
        setMovies(data);
      }
    };

    fetchMovies();
  }, [supabase]);

  const filteredMovies = movies.filter((movie) =>
    movie.series_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const galleryItems = filteredMovies.map((movie) => ({
    image: movie.poster_url,
    text: movie.series_title,
  }));

  const handleSettingsClick = () => {
    console.log("Settings clicked!");
    // Adiciona aqui a lógica para abrir configurações
  };

  const handleLogoClick = () => {
    console.log("Logo clicked!");
    // Adiciona aqui a lógica para quando clicarem no logo
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
          height: "100vh",
          background: "linear-gradient(135deg, #f5f5dc 0%, #faf0e6 100%)",
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
      {/* Conteúdo principal - FULLSCREEN (por baixo de tudo) */}
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
        {/* Galeria Circular */}
        <CircularGallery
          items={galleryItems}
          bend={3}
          textColor="#ffffff"
          borderRadius={0.05}
          scrollSpeed={2}
          scrollEase={0.05}
        />
      </main>

      {/* Navbar transparente no topo (por cima) */}
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

      {/* Sidebar à esquerda (por cima) */}
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
