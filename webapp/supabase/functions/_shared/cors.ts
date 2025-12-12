<<<<<<< HEAD
/**
 * 🔒 CORS Headers Seguros para Supabase Edge Functions
 * - Validação estrita de origens com verificação de protocolo
 * - Headers de segurança apropriados para APIs
 * - Suporte a variáveis de ambiente para produção
 */

// Lista de origens permitidas (sem trailing slash)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'https://movienightai.vercel.app', // URL de produção
  // Adicionar URLs de produção via env var: PRODUCTION_URLS=https://app.com,https://www.app.com
  ...(Deno.env.get('PRODUCTION_URLS')?.split(',').map(url => url.trim()).filter(Boolean) || [])
];

/**
 * Valida se a origem é permitida (match exato + protocolo seguro)
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  // Validar formato da URL
  try {
    const url = new URL(origin);

    // Só permitir http/https (bloqueia file://, data://, etc)
    if (!['http:', 'https:'].includes(url.protocol)) {
      console.warn(`⚠️ Blocked invalid protocol: ${url.protocol} from ${origin}`);
      return false;
    }
  } catch (err) {
    console.warn(`⚠️ Blocked malformed origin: ${origin}`);
    return false;
  }

  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Normaliza uma origem removendo trailing slashes
 */
function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, '');
}

/**
 * Gera headers CORS apropriados baseado na origem da requisição
 * 
 * @param origin - Header 'Origin' da requisição
 * @returns Headers CORS seguros ou null se origem não permitida
 */
export function getCorsHeaders(origin: string | null): Record<string, string> | null {
  const normalizedOrigin = origin ? normalizeOrigin(origin) : null;

  if (!isOriginAllowed(normalizedOrigin)) {
    console.warn(`⚠️ Blocked CORS request from: ${origin}`);
    return null;
  }

  return {
    'Access-Control-Allow-Origin': normalizedOrigin!,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, content-type, apikey, x-requested-with',
    'Access-Control-Max-Age': '86400', // 24h cache para preflight
    'Vary': 'Origin',
  };
}

/**
 * Headers de segurança padrão (aplicar a TODAS as respostas)
 * Otimizado para APIs REST
 */
export const SECURITY_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

/**
 * Combina CORS + Security headers
 */
export function getAllHeaders(origin: string | null): Record<string, string> {
  const corsHeaders = getCorsHeaders(origin);

  // Se CORS não é permitido, retornar só security headers
  if (!corsHeaders) {
    return SECURITY_HEADERS;
  }

  return {
    ...SECURITY_HEADERS,
    ...corsHeaders,
  };
}

/**
 * Utility: Verifica se é uma requisição preflight
 */
export function isPreflight(req: Request): boolean {
  return req.method === 'OPTIONS' &&
    req.headers.has('Access-Control-Request-Method');
}

/**
 * Utility: Response padrão para preflight
 */
export function createPreflightResponse(origin: string | null): Response {
  const headers = getAllHeaders(origin);

  if (!headers['Access-Control-Allow-Origin'] && origin) {
    return new Response(null, { status: 403, headers: SECURITY_HEADERS });
  }

  return new Response(null, { status: 204, headers });
=======
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
>>>>>>> 410001e6a0cfb928630a7d2eea7ffb041bb5979b
}
