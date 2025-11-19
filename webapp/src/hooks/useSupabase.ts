import { useAuth } from "@clerk/clerk-react";
import { useMemo } from "react";
import { createSupabaseWithClerk } from "../lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

export function useSupabase(): SupabaseClient {
  const { getToken, isLoaded } = useAuth();

  const supabaseClient = useMemo(() => {
    const tokenGetter = async () => {
      if (!isLoaded) return null;

      try {
        return await getToken({ template: "supabase" });
      } catch (error) {
        console.error("Falha na autenticação");
        return null;
      }
    };

    return createSupabaseWithClerk(tokenGetter);
  }, [getToken, isLoaded]);

  return supabaseClient;
}
