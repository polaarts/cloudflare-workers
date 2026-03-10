// Búsqueda en D1 con Cache API de Cloudflare
// GET /api/search?q=término
// - Cache hit  → devuelve respuesta inmediata + header X-Cache: HIT
// - Cache miss → consulta D1, cachea resultado, retorna + X-Cache: MISS

import type { Env } from "./types";

const CACHE_TTL = 60;

export async function handleSearch(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();

  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cache = caches.default;

  // ── 1. Buscar en cache
  let response = await cache.match(cacheKey);

  if (response) {
    console.log(`[Cache] HIT: ${url.search}`);
    response = new Response(response.body, response);
    response.headers.set("X-Cache", "HIT");
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  }

  // ── 2. Cache miss → consultar D1
  console.log(`[Cache] MISS: ${url.search}`);

  const { results } = await env.jschile_phrases
    .prepare(
      "SELECT id, text, created_at FROM phrases WHERE text LIKE ? ORDER BY created_at DESC LIMIT 20",
    )
    .bind(`%${query}%`)
    .all();

  const body = JSON.stringify({ results, query });

  response = new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": `s-maxage=${CACHE_TTL}`,
      "X-Cache": "MISS",
    },
  });

  // ── 3. Guardar en cache sin bloquear la respuesta
  ctx.waitUntil(cache.put(cacheKey, response.clone()));

  return response;
}

