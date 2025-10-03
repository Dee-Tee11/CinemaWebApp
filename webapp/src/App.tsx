import { useUser } from "@clerk/clerk-react";
import { useSupabase } from "./hooks/useSupabase";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Auth from "./components/Auth";
import Info from "./components/Info";
import Home from "./home";

function App() {
  const { user, isLoaded } = useUser();
  const supabase = useSupabase();
  const [, setUserData] = useState<any[] | null>(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (isLoaded && user && !synced) {
      syncUserToSupabase();
    }
  }, [isLoaded, user, synced]);

  async function syncUserToSupabase() {
    try {
      if (!user) {
        return;
      }

      const { error } = await supabase.from("User").upsert({
        id: user.id,
        name: user.fullName,
        email: user.emailAddresses[0]?.emailAddress,
      });

      if (error) {
        console.error("Erro ao sincronizar usuário:", error);
      } else {
        setSynced(true);

        let data = null;
        if (user?.id) {
          const response = await supabase
            .from("User")
            .select("*")
            .eq("id", user.id);
          data = response.data;
        }

        setUserData(data);
      }
    } catch (error) {
      console.error("Erro:", error);
    }
  }

  if (!isLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0a0a0a'
      }}>
        <p style={{ color: '#fff' }}>Carregando...</p>
      </div>
    );
  }

  if (user) {
    return (
      <BrowserRouter>
        <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/Favoritos" element={<div style={{ padding: '100px 20px', color: '#fff' }}>Página de Filmes</div>} />
            <Route path="/Sugestões" element={<div style={{ padding: '100px 20px', color: '#fff' }}>Página de Sessões</div>} />
            <Route path="/sobre" element={<div style={{ padding: '100px 20px', color: '#fff' }}>Página Sobre</div>} />
          </Routes>
        </div>
      </BrowserRouter>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      <Auth />
      <Info />
    </div>
  );
}

export default App; 