import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAllHeaders, SECURITY_HEADERS } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLERK_FRONTEND_API = Deno.env.get("CLERK_FRONTEND_API")!;

// Remove protocol if present to avoid double https://
const cleanClerkUrl = CLERK_FRONTEND_API.replace(/^https?:\/\//, "");
const JWKS_URL = `https://${cleanClerkUrl}/.well-known/jwks.json`;

// Cache JWKS
let jwksCache: any = null;
let jwksExpiry = 0;
let jwksFetchPromise: Promise<any> | null = null;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = getAllHeaders(origin);

  // ✅ 1. Segurança de Origem (CORS)
  if (!headers['Access-Control-Allow-Origin'] && origin) {
    return new Response(
      JSON.stringify({ error: "Origin not allowed" }),
      { status: 403, headers: SECURITY_HEADERS }
    );
  }

  // ✅ 2. Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // ✅ 3. Validar Método
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers }
    );
  }

  let userId: string;

  try {
    // 🔐 4. Autenticação Robusta (Clerk JWT)
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Missing or invalid authorization header");
    }

    const token = authHeader.substring(7);
    if (!token) throw new Error("Empty token");

    // Verifica assinatura, expiração e claims
    const payload = await verifyClerkJWT(token);
    userId = payload.sub;

    if (!userId) throw new Error("Invalid token: missing subject");

  } catch (err: any) {
    console.error("❌ Authentication failed:", err.message);
    return new Response(
      JSON.stringify({ error: "Unauthorized", details: err.message }),
      { status: 401, headers }
    );
  }

  // 🚀 5. Lógica de Negócio
  try {
    const { movie_id } = await req.json();
    if (!movie_id || typeof movie_id !== "string") {
      return new Response(
        JSON.stringify({ error: "movie_id is required" }),
        { headers, status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    console.log("Fetching friends activity for movie:", movie_id, "user:", userId);

    // 1. Pega amigos
    const { data: friendships, error: friendsError } = await supabase
      .from("friendships")
      .select("user_id_a, user_id_b")
      .or(`user_id_a.eq.${userId},user_id_b.eq.${userId}`);

    if (friendsError) throw friendsError;

    if (!friendships || friendships.length === 0) {
      console.log("No friends found");
      return new Response(
        JSON.stringify({ activity: [] }),
        { headers, status: 200 }
      );
    }

    const friendIds = friendships.map(f =>
      f.user_id_a === userId ? f.user_id_b : f.user_id_a
    );

    console.log("Friends IDs:", friendIds);

    // 2. Pega atividades
    const { data: activities, error: actError } = await supabase
      .from("user_movies")
      .select(`
        user_id,
        status,
        rating,
        review,
        created_at,
        user:User!user_movies_user_id_fkey (id, name)
      `)
      .eq("movie_id", movie_id)
      .in("user_id", friendIds)
      .order("created_at", { ascending: false });

    if (actError) throw actError;

    const formatted = (activities || []).map(a => ({
      friend_id: a.user_id,
      friend_name: a.user?.[0]?.name || a.user?.name || "Friend",
      status: a.status || "unknown",
      rating: a.rating,
      review: a.review,
      created_at: a.created_at,
    }));

    console.log(`Found ${formatted.length} activities`);

    return new Response(
      JSON.stringify({ activity: formatted }),
      { headers, status: 200 }
    );

  } catch (error: any) {
    console.error("❌ Error in get-friends-activity:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { headers, status: 500 }
    );
  }
});

// === FUNÇÕES AUXILIARES DE SEGURANÇA (CLERK) ===

async function verifyClerkJWT(token: string): Promise<any> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed JWT");

  // 1. Decodificar Header
  let header: any;
  try {
    header = JSON.parse(atob(parts[0]));
  } catch {
    throw new Error("Invalid JWT header");
  }

  const kid = header.kid;
  if (!kid) throw new Error("Missing kid in JWT header");

  // 2. Buscar Chave Pública (JWKS)
  const jwks = await getJWKS();
  const jwk = jwks.keys.find((k: any) => k.kid === kid);

  if (!jwk) throw new Error(`Public key not found for kid: ${kid}`);
  if (jwk.alg !== 'RS256') throw new Error(`Unsupported algorithm: ${jwk.alg}`);

  // 3. Importar Chave
  let publicKey: CryptoKey;
  try {
    publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      true,
      ["verify"]
    );
  } catch {
    throw new Error("Failed to import public key");
  }

  // 4. Verificar Assinatura
  const encoder = new TextEncoder();
  const data = encoder.encode(`${parts[0]}.${parts[1]}`);
  const signature = base64UrlDecode(parts[2]);

  const isValid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    signature,
    data
  );

  if (!isValid) throw new Error("Invalid JWT signature");

  // 5. Decodificar e Validar Payload
  let payload: any;
  try {
    payload = JSON.parse(atob(parts[1]));
  } catch {
    throw new Error("Invalid JWT payload");
  }

  const now = Math.floor(Date.now() / 1000);
  const CLOCK_SKEW = 5;

  if (payload.exp && payload.exp < (now - CLOCK_SKEW)) throw new Error("Token expired");
  if (payload.nbf && payload.nbf > (now + CLOCK_SKEW)) throw new Error("Token not yet valid");

  // Validar Issuer
  const expectedIssuer = `https://${cleanClerkUrl}`;
  if (!payload.iss || payload.iss !== expectedIssuer) {
    if (!payload.iss?.includes(cleanClerkUrl)) {
      console.error("❌ Invalid issuer:", payload.iss, "Expected:", expectedIssuer);
      throw new Error("Invalid token issuer");
    }
  }

  // Validar AZP (Authorized Party)
  if (!payload.azp) throw new Error("Missing authorized party (azp) claim");

  return payload;
}

async function getJWKS(): Promise<any> {
  if (jwksFetchPromise) return jwksFetchPromise;
  if (jwksCache && Date.now() < jwksExpiry) return jwksCache;

  jwksFetchPromise = (async () => {
    try {
      const res = await fetch(JWKS_URL, {
        headers: { "User-Agent": "Supabase-Edge-Function", "Accept": "application/json" },
        signal: AbortSignal.timeout(5000)
      });

      if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);

      const data = await res.json();
      if (!data.keys?.length) throw new Error("Invalid JWKS response");

      jwksCache = data;
      jwksExpiry = Date.now() + 3_600_000; // 1h
      console.log(`✅ JWKS cached (${data.keys.length} keys)`);
      return data;
    } catch (err) {
      console.error("❌ Failed to fetch JWKS:", err);
      throw err;
    } finally {
      jwksFetchPromise = null;
    }
  })();

  return jwksFetchPromise;
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}