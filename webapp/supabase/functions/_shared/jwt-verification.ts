/**
 * 🔐 Verificação Segura de JWT do Clerk para Supabase Edge Functions
 * - Valida assinatura usando JWKS do Clerk
 * - Verifica expiração e claims do token
 * - Cache de JWKS para performance
 */

const CLERK_FRONTEND_API = Deno.env.get("CLERK_FRONTEND_API")!;

// Remove protocol if present to avoid double https://
const cleanClerkUrl = CLERK_FRONTEND_API.replace(/^https?:\/\//, "");
const JWKS_URL = `https://${cleanClerkUrl}/.well-known/jwks.json`;

// Cache JWKS
let jwksCache: any = null;
let jwksExpiry = 0;
let jwksFetchPromise: Promise<any> | null = null;

/**
 * Verifica e valida um JWT do Clerk
 * @param token - JWT do Clerk (sem o prefixo "Bearer ")
 * @returns Payload do token verificado
 * @throws Error se o token for inválido, expirado ou não verificável
 */
export async function verifyClerkJWT(token: string): Promise<any> {
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

/**
 * Busca e cacheia as chaves públicas do Clerk (JWKS)
 */
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

/**
 * Decodifica uma string base64url
 */
function base64UrlDecode(str: string): Uint8Array {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}
