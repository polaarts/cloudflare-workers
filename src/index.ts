import { handleSearch } from "./cache";
import { rateLimit } from "./middleware";
import type { Env } from "./types";

export type { Env };

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Guardar frase
    if (url.pathname === "/api/phrases" && request.method === "POST") {
      let body: { text?: string };
      try {
        body = await request.json<{ text?: string }>();
      } catch {
        return jsonResponse({ error: "Body JSON inválido" }, 400);
      }

      const text = body.text?.trim();
      if (!text) {
        return jsonResponse({ error: "El campo 'text' es obligatorio y no puede estar vacío" }, 400);
      }

      await env.jschile_phrases.prepare("INSERT INTO phrases (text) VALUES (?)")
        .bind(text)
        .run();

      return jsonResponse({ status: "ok", message: "¡Frase guardada!" });
    }

    // Rate limit + Búsqueda con cache
    if (url.pathname === "/api/search" && request.method === "GET") {
      const { blocked, remaining, resetAt } = await rateLimit(request, env);
      if (blocked) return blocked;

      const searchResponse = await handleSearch(request, env, ctx);
      const finalResponse = new Response(searchResponse.body, searchResponse);
      finalResponse.headers.set("X-RateLimit-Remaining", String(remaining));
      finalResponse.headers.set("X-RateLimit-Reset", String(resetAt));
      return finalResponse;
    }

    return jsonResponse({ error: "Ruta no encontrada" }, 404);
  },
};