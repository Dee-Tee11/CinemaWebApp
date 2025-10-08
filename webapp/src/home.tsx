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
    title: "Bem-vindo ao CinemaApp!",
    description:
      "Esta é uma breve introdução sobre como usar a nossa aplicação.",
    icon: <FiCheckCircle className="carousel-icon" />,
  },
  {
    id: 2,
    title: "Navegue pelos filmes",
    description:
      "Use o scroll do rato ou o toque para navegar pela galeria de filmes.",
    icon: <FiMousePointer className="carousel-icon" />,
  },
  {
    id: 3,
    title: "Pesquise por filmes",
    description:
      "Use a barra de pesquisa no topo para encontrar filmes específicos.",
    icon: <FiSearch className="carousel-icon" />,
  },
  {
    id: 4,
    title: "Aceda às definições",
    description:
      "Clique no ícone de definições na barra lateral para aceder às suas definições.",
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
            padding: "1rem 2rem",
            fontSize: "1.2rem",
            cursor: "pointer",
            border: "none",
            borderRadius: "5px",
            background: "#333",
            color: "white",
          }}
        >
          Começar a usar
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
