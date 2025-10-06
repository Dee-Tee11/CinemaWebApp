// pages/Home.tsx
import Sidebar from "./components/Slidebar";
import Navbar from "./components/Navbar";
import CircularGallery from "./components/CircularGallery"; // Importa a galeria circular

// Importar as imagens locais (adiciona isto no topo do ficheiro)
import image1 from "./assets/imagem1.jpg";
import image2 from "./assets/imagem2.jpg";
import image3 from "./assets/imagem3.jpg";
import image4 from "./assets/imagem4.jpg";
import image5 from "./assets/imagem5.jpg";
import image6 from "./assets/imagem6.jpg";
import image7 from "./assets/imagem8.jpg";
import image8 from "./assets/imagem9.jpg";
import image9 from "./assets/imagem10.jpg";
import image10 from "./assets/imagem11.jpg";
// Converter filmes para o formato que CircularGallery espera
const galleryItems = [
  {
    image: image1,
    text: "Wolf of Wall Street",
  },
  {
    image: image2,
    text: "Fantastic 4",
  },
  {
    image: image3,
    text: "Demon Slayer Infinity Castle ",
  },
  {
    image: image4,
    text: "Aztec Batman : Clash of Empires",
  },
  {
    image: image5,
    text: "Superman",
  },
  {
    image: image6,
    text: "F1 the movie",
  },
  {
    image: image7,
    text: "CHAINSAW MAN : Reze Arc ",
  },
  {
    image: image8,
    text: "Lilo & Stitch",
  },
  {
    image: image9,
    text: "Interstellar",
  },
  {
    image: image10,
    text: "The Conjuring",
  },
];

export default function Home() {
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
