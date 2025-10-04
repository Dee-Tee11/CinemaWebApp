// pages/Home.tsx
import Sidebar from "./components/Slidebar";
import MovieGrid from "./components/MovieGallery";
import Navbar from "./components/Navbar";

export default function Home() {
  const handleSettingsClick = () => {
    console.log("Settings clicked!");
    // Adiciona aqui a lógica para abrir configurações
  };

  const handleLogoClick = () => {
    console.log("Logo clicked!");
    // Adiciona aqui a lógica para quando clicarem no logo
    // Por exemplo: window.location.href = '/';
    // ou scroll para o topo: window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #fffff0 0%, #fff8dc 100%)",
      }}
    >
      {/* Navbar transparente no topo */}
      <Navbar />

      {/* Sidebar à esquerda */}
      <Sidebar onSettingsClick={handleSettingsClick} />

      {/* Conteúdo principal com margem para o sidebar e navbar */}
      <main
        style={{
          marginLeft: "80px",
          paddingTop: "100px", // Espaço para a navbar
          paddingLeft: "3rem",
          paddingRight: "3rem",
          paddingBottom: "3rem",
          minHeight: "100vh",
        }}
      >
        <div style={{ maxWidth: "100%", margin: "0 auto", maxHeight: "100%" }}>
          {/* Grid de Filmes */}
          <MovieGrid />
        </div>
      </main>
    </div>
  );
}
