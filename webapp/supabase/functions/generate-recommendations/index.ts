import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
<<<<<<< HEAD
import { getAllHeaders, SECURITY_HEADERS } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLERK_FRONTEND_API = Deno.env.get("CLERK_FRONTEND_API")!;
const FASTAPI_URL = Deno.env.get("FASTAPI_URL") || "https://movienight-ai.onrender.com";

const JWKS_URL = `https://${CLERK_FRONTEND_API.replace(/^https?:\/\//, "")}/.well-known/jwks.json`;
const MINIMUM_RATED_MOVIES = 5;

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
    // Inicializa Supabase com Service Role (Seguro pois já validamos o userId acima)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // A. Verifica se tem filmes suficientes
=======

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MINIMUM_RATED_MOVIES = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userId = payload.sub;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Invalid token: missing user ID" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);


    // 1. Verifica se tem ≥5 filmes
>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b
    const { count: userMoviesCount, error: countError } = await supabase
      .from("user_movies")
      .select("movie_id", { count: "exact", head: true })
      .eq("user_id", userId);

<<<<<<< HEAD
    if (countError) {
      console.error("❌ DB Error:", countError);
      throw new Error("Database error checking movies");
    }
=======
    if (countError) throw countError;

>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b

    if (!userMoviesCount || userMoviesCount < MINIMUM_RATED_MOVIES) {
      return new Response(
        JSON.stringify({
          success: false,
          needsMoreRatings: true,
          currentCount: userMoviesCount || 0,
          requiredCount: MINIMUM_RATED_MOVIES,
          message: `You need to rate at least ${MINIMUM_RATED_MOVIES} movies. You have rated ${userMoviesCount || 0}.`,
        }),
<<<<<<< HEAD
        { status: 200, headers }
      );
    }

    // B. Chama FastAPI para recomendações
    console.log(`🚀 Calling FastAPI: ${FASTAPI_URL}/generate-recommendations/${userId}`);

    const response = await fetch(
      `${FASTAPI_URL}/generate-recommendations/${userId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ FastAPI error (${response.status}):`, errorText);
      throw new Error(`FastAPI returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ FastAPI response:", result);

    return new Response(
      JSON.stringify({
        success: true,
        needsMoreRatings: false,
        message: result.message || "Recommendations generated successfully",
      }),
      { status: 200, headers }
    );

  } catch (err: any) {
    console.error("❌ Error in generate-recommendations:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Internal server error"
      }),
      { status: 500, headers }
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
  const expectedIssuer = `https://${CLERK_FRONTEND_API}`;
  if (!payload.iss || payload.iss !== expectedIssuer) {
    // Fallback para lidar com possíveis diferenças de protocolo/trailing slash se necessário
    if (!payload.iss?.includes(CLERK_FRONTEND_API)) {
      console.error("❌ Invalid issuer:", payload.iss, "Expected:", expectedIssuer);
      throw new Error("Invalid token issuer");
    }
  }

  // Validar AZP (Authorized Party)
  // Nota: ALLOWED_ORIGINS não está acessível aqui dentro facilmente sem passar como argumento ou exportar do cors.ts
  // Como o cors.ts não exporta a lista, vamos confiar na validação de CORS feita no início da request
  // e na validação de assinatura que garante que o token veio do Clerk.
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
=======
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 2. Chamar FastAPI para gerar recomendações KNN
    const FASTAPI_URL = Deno.env.get("FASTAPI_URL") || "https://movienight-ai.onrender.com";

    try {
      console.log(`🚀 Calling FastAPI: ${FASTAPI_URL}/generate-recommendations/${userId}`);

      const response = await fetch(
        `${FASTAPI_URL}/generate-recommendations/${userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ FastAPI error (${response.status}):`, errorText);
        throw new Error(`FastAPI returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("✅ FastAPI response:", result);

      return new Response(
        JSON.stringify({
          success: true,
          needsMoreRatings: false,
          message: result.message || "Recommendations generated successfully",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (apiError) {
      console.error("❌ Error calling FastAPI:", apiError);

      // Fallback: retornar erro mas não bloquear
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to generate recommendations via FastAPI",
          details: apiError.message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }
  } catch (error) {
    console.error("❌ Error in generate-recommendations:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b
