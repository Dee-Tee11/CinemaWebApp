import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Fábrica que recebe um getter de token do Clerk
export function createSupabaseWithClerk(
  getToken: () => Promise<string | null>
): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      // Interceta todas as chamadas e acrescenta Authorization: Bearer <JWT do Clerk>
      fetch: async (input, init) => {
        const token = await getToken();
        const headers = new Headers(init?.headers ?? {});
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
  });
}
