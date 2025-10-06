import { useEffect, useState } from "react";
import Sidebar from "./components/Slidebar";
import Navbar from "./components/Navbar";
import CircularGallery from "./components/CircularGallery";
import { useSupabase } from "./hooks/useSupabase";

interface Movie {
  id: number;
  series_title: string;
  poster_url: string;
}

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
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

  const galleryItems = movies.map((movie) => ({
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
        <Navbar />
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
