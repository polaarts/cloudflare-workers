// Rate Limit Middleware con KV
// Permite máximo MAX_REQUESTS búsquedas por IP cada WINDOW_SECONDS segundos.
// Estrategia: Fixed Window usando KV con TTL automático.

import type { Env } from "./types";

const WINDOW_SECONDS = 120;
const MAX_REQUESTS = 10;

export interface RateLimitResult {
  blocked: Response | null; // Response 429 si bloqueado, null si permitido
  remaining: number;
  resetAt: number; 
}

export async function rateLimit(
  request: Request,
  env: Env,
): Promise<RateLimitResult> {
  // CF-Connecting-IP es el header que inyecta Cloudflare con la IP real del cliente
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";

  // Fixed Window: todos los requests en el mismo periodo comparten contador
  const windowId = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const resetAt = (windowId + 1) * WINDOW_SECONDS * 1000;
  const kvKey = `rl:${ip}:${windowId}`;

  const current = parseInt((await env.RATE_LIMIT_KV.get(kvKey)) ?? "0", 10);

  if (current >= MAX_REQUESTS) {
    console.log(`[RateLimit] BLOQUEADO ip=${ip} ventana=${windowId} count=${current}`);
    return {
      remaining: 0,
      resetAt,
      blocked: new Response(
        JSON.stringify({
          error: "Rate limit excedido",
          message: `Límite de ${MAX_REQUESTS} búsquedas por ${WINDOW_SECONDS / 60} minutos alcanzado.`,
          retryAfterSeconds: WINDOW_SECONDS,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Retry-After": String(WINDOW_SECONDS),
            "X-RateLimit-Limit": String(MAX_REQUESTS),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetAt),
          },
        },
      ),
    };
  }

  await env.RATE_LIMIT_KV.put(kvKey, String(current + 1), {
    expirationTtl: WINDOW_SECONDS,
  });

  const remaining = MAX_REQUESTS - (current + 1);
  console.log(`[RateLimit] OK ip=${ip} count=${current + 1}/${MAX_REQUESTS} restantes=${remaining}`);
  return { blocked: null, remaining, resetAt };
}
