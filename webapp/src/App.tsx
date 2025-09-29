import { useUser } from "@clerk/clerk-react";
import { useSupabase } from "./hooks/useSupabase";
import { useEffect, useState } from "react";
import Auth from "./components/Auth";
import Info from "./components/Info";

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
        // Error handling
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
      // Error handling
    }
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
