import React from 'react';
import PillNav from './components/PillNav';
import Sidebar from './components/Slidebar';
import MovieGrid from './components/MovieGallery';

export default function Home() {
  const navItems = [
    { label: 'Suggested', href: '/Suggested' },
    { label: 'Favorites', href: '/Favorites' },
    { label: 'Already seen', href: '/Already seen' },
    { label: 'Suggestion from friends', href: '/Suggestion from friends' },
  ];

  const handleSettingsClick = () => {
    console.log('Settings clicked!');
    // Adiciona aqui a lógica para abrir configurações
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fffff0 0%, #fff8dc 100%)',
      }}
    >
      {/* Sidebar à esquerda */}
      <Sidebar
        logo="https://via.placeholder.com/50"
        logoAlt="Cinema App Logo"
        onSettingsClick={handleSettingsClick}
      />

      {/* Navbar no topo, ocupando toda a largura */}
      <PillNav
        logo="https://via.placeholder.com/50"
        items={navItems}
        activeHref="/"
        pillTextColor="#dc143c"
        pillColor="rgba(220, 20, 60, 0.1)"
        hoveredPillTextColor="#8b0000"
        initialLoadAnimation={true}
        showLogo={false}
      />

      {/* Conteúdo principal com margem para o sidebar */}
      <main
        style={{
          marginLeft: '80px',
          padding: '50px 3rem 3px', /* Ajuste o padding-top se necessário */
          minHeight: '100vh',
        }}
      >
        <div style={{ maxWidth: '100%', margin: '0 auto', maxHeight: '100%' }}>
          {/* Cabeçalho */}
          <div style={{ marginBottom: '2rem' }}></div>

          {/* Grid de Filmes */}
          <MovieGrid />
        </div>
      </main>

      {/* Versão mobile - remove margem do sidebar */}
      <style>{`
        @media (max-width: 768px) {
          main {
            margin-left: 0 !important;
            padding: 100px 1rem 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}