import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
<<<<<<< HEAD
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

  let sender_id: string;

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
    sender_id = payload.sub;

    if (!sender_id) throw new Error("Invalid token: missing subject");

  } catch (err: any) {
    console.error("❌ Authentication failed:", err.message);
    return new Response(
      JSON.stringify({ error: "Unauthorized", details: err.message }),
      { status: 401, headers }
    );
  }

  // 🚀 5. Lógica de Negócio
=======

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b
  try {
    // Get request body
    const { receiver_id } = await req.json();
    if (!receiver_id || typeof receiver_id !== "string" || receiver_id.trim() === "") {
      return new Response(
        JSON.stringify({ error: "receiver_id is required and must be a valid string." }),
<<<<<<< HEAD
        { headers, status: 400 }
      );
    }

    // Create Supabase client with service_role_key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

=======
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check for Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header. Please login." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Create Supabase client with service_role_key (INSECURE - TEMPORARY)
    // This bypasses all RLS. This is a temporary and insecure measure.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Manually decode token to get sender_id (INSECURE - TEMPORARY)
    let sender_id: string;
    try {
      const token = authHeader.replace("Bearer ", "");
      const payload = JSON.parse(atob(token.split(".")[1]));
      sender_id = payload.sub;
      if (!sender_id) throw new Error("User ID (sub) not found in token payload.");
    } catch (e) {
      console.error("Error manually decoding token:", e);
      return new Response(
        JSON.stringify({ error: "Invalid token format." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b
    // Validate: Cannot send a request to yourself
    if (sender_id === receiver_id) {
      return new Response(
        JSON.stringify({ error: "You cannot send a friend request to yourself." }),
<<<<<<< HEAD
        { headers, status: 400 }
=======
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b
      );
    }

    // Validate: Receiver must exist in the 'User' table
    const { data: receiverExists, error: receiverError } = await supabase
      .from("User")
      .select("id")
      .eq("id", receiver_id)
      .maybeSingle();

    if (receiverError) throw receiverError;
    if (!receiverExists) {
      return new Response(
        JSON.stringify({ error: "User not found. Please check the user ID." }),
<<<<<<< HEAD
        { headers, status: 404 }
=======
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b
      );
    }

    // Validate: Not already friends
    const { data: existingFriendship, error: friendshipError } = await supabase
      .from("friendships")
      .select("user_id_a, user_id_b")
      .or(`and(user_id_a.eq.${sender_id},user_id_b.eq.${receiver_id}),and(user_id_a.eq.${receiver_id},user_id_b.eq.${sender_id})`)
      .maybeSingle();

    if (friendshipError) throw friendshipError;
    if (existingFriendship) {
      return new Response(
        JSON.stringify({ error: "You are already friends with this user." }),
<<<<<<< HEAD
        { headers, status: 409 }
=======
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b
      );
    }

    // Validate: No pending request in either direction
    const { data: existingRequest, error: requestError } = await supabase
      .from("friend_request")
      .select("id, sender_id")
      .or(`and(sender_id.eq.${sender_id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${sender_id})`)
      .eq("status", "pending")
      .maybeSingle();

    if (requestError) throw requestError;
    if (existingRequest) {
      const error = existingRequest.sender_id === receiver_id
        ? "This user has already sent you a friend request. Please accept it instead."
        : "You already have a pending friend request with this user.";
      return new Response(
        JSON.stringify({ error }),
<<<<<<< HEAD
        { headers, status: 409 }
=======
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b
      );
    }

    // Insert new friend request
    const { data, error } = await supabase
      .from("friend_request")
      .insert({ sender_id, receiver_id, status: "pending" })
      .select("id, sender_id, receiver_id, status, created_at")
      .single();

    if (error) throw error;

    // Success
    return new Response(
      JSON.stringify({ success: true, data }),
<<<<<<< HEAD
      { headers, status: 201 }
=======
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b
    );

  } catch (error) {
    console.error("❌ Error in send-friend-request:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
<<<<<<< HEAD
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
=======
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b
