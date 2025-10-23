import { useUser } from "@clerk/clerk-react";
import { useSupabase } from "./hooks/useSupabase";
import { useEffect, useState } from "react";
import Auth from "./components/Auth/Auth";
import Info from "./components/Info/Info";
import AppRouter from "./router";

function App() {
  const { user, isLoaded } = useUser();
  const supabase = useSupabase();
  const [, setUserData] = useState<any[] | null>(null);
  const [synced, setSynced] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (isLoaded && user && !synced) {
      checkAndSyncUser();
    }
  }, [isLoaded, user, synced]);

  async function checkAndSyncUser() {
    try {
      if (!user) {
        return;
      }

      // Verifica se o user já existe no Supabase
      const { data: existingUser } = await supabase
        .from("User")
        .select("id")
        .eq("id", user.id)
        .single();

      // Se não existe, é user novo! Marca para redirecionar
      const isNewUser = !existingUser;

      // Sincroniza no Supabase
      const { error } = await supabase.from("User").upsert({
        id: user.id,
        name: user.fullName,
        email: user.emailAddresses[0]?.emailAddress,
      });

      if (error) {
        console.error("Erro ao sincronizar usuário:", error);
      } else {
        const response = await supabase
          .from("User")
          .select("*")
          .eq("id", user.id);
        setUserData(response.data);
      }

      setSynced(true);
      
      // Se é novo user, ativa o redirect
      if (isNewUser) {
        setShouldRedirect(true);
      }
    } catch (error) {
      console.error("Erro:", error);
      setSynced(true);
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
        <p style={{ color: '#fff' }}>Loading...</p>
      </div>
    );
  }

  if (user) {
    return <AppRouter shouldRedirectToOnboarding={shouldRedirect} />;
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