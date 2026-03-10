# Cloudflare Workers Demo · JSChile

Demo en vivo presentada en la primera meetup de **JSChile** que muestra 3 módulos corriendo en un único Cloudflare Worker:

| Módulo | Ruta | Tecnología |
|---|---|---|
| 1 — Guardar frase | `POST /api/phrases` | D1 (SQLite en el Edge) |
| 2 — Buscar frases | `GET /api/search?q=` | Cache API de Workers |
| 3 — Rate limit | middleware en `/api/search` | KV Namespace con TTL |

La web (React + Vite) también se sirve desde el mismo Worker usando **Static Assets**.

---

## Arquitectura

```
┌───────────────────────────────────────────────┐
│              Cloudflare Worker                 │
│                                               │
│  POST /api/phrases ──► Guardar en D1          │
│                                               │
│  GET  /api/search  ──► Rate limit (KV)        │
│                        └──► Buscar en D1      │
│                             └──► Cache API    │
│                                               │
│  GET  /*           ──► React SPA (app/dist/)  │
└───────────────────────────────────────────────┘
```

- **`src/index.ts`** — Router principal + Módulo 1 (POST → D1)
- **`src/index-cache.ts`** — Módulo 2: búsqueda con `caches.default`, header `X-Cache: HIT|MISS`
- **`src/index-middleware.ts`** — Módulo 3: máx. 10 búsquedas/2 min por IP usando KV
- **`src/types.ts`** — Interface `Env` compartida entre módulos
- **`migrations/0001_create_phrases.sql`** — Esquema D1
- **`app/`** — SPA React + Vite con `PhraseForm` y `SearchBar`

---

## Requisitos

- Node.js 18+
- pnpm (`npm i -g pnpm`)
- Cuenta de Cloudflare
- Wrangler autenticado:

```bash
npx wrangler login
```

---

## Setup para otro desarrollador

### 1. Clonar y configurar `wrangler.toml`

```bash
git clone <repo>
cd cloudflare-workers
cp wrangler.example.toml wrangler.toml
```

Editar `wrangler.toml` y pegar los IDs que generan los pasos siguientes.

### 2. Crear recursos en Cloudflare (una sola vez)

```bash
# Base de datos D1
npx wrangler d1 create jschile-phrases
# → copiar el database_id al campo [[d1_databases]].database_id en wrangler.toml

# KV para rate limiting
npx wrangler kv namespace create RATE_LIMIT_KV
# → copiar el id al campo [[kv_namespaces]].id en wrangler.toml
```

### 3. Aplicar migración D1 en local

```bash
npx wrangler d1 migrations apply jschile-phrases --local
```

### 4. Instalar dependencias del frontend

```bash
cd app && pnpm install && cd ..
```

---

## Desarrollo local

Abrir **dos terminales**:

```bash
# Terminal 1 — Worker (puerto 8787)
npx wrangler dev

# Terminal 2 — Frontend con HMR (puerto 5173, proxy → 8787)
cd app && pnpm dev
```

Abrir http://localhost:5173

---

## Deploy a producción

```bash
# 1. Build del frontend
cd app && pnpm build && cd ..

# 2. Aplicar migración en remoto (solo la primera vez o ante nuevas migrations)
npx wrangler d1 migrations apply jschile-phrases --remote

# 3. Desplegar Worker + assets
npx wrangler deploy
```

Wrangler imprime la URL pública al finalizar.

### Ver logs en tiempo real

```bash
npx wrangler tail
```

---

## Probar los endpoints manualmente

```bash
# Guardar una frase
curl -X POST https://<tu-worker>.workers.dev/api/phrases \
  -H "Content-Type: application/json" \
  -d '{"text":"Hola desde el Edge"}'

# Buscar frases (repetir para ver Cache HIT)
curl "https://<tu-worker>.workers.dev/api/search?q=hola"
# Header X-Cache: MISS en primera llamada, HIT en siguientes (TTL 60s)
```

---

## Estructura del proyecto

```
cloudflare-workers/
├── wrangler.example.toml          # Plantilla de config sin IDs reales
├── wrangler.toml                  # Config real (ignorado por git)
├── migrations/
│   └── 0001_create_phrases.sql    # Esquema D1
├── src/
│   ├── index.ts                   # Router + Módulo 1
│   ├── index-cache.ts             # Módulo 2 (Cache API)
│   ├── index-middleware.ts        # Módulo 3 (Rate limit)
│   └── types.ts                   # Interface Env compartida
└── app/                           # React + Vite
    ├── vite.config.js             # Proxy /api → localhost:8787 en dev
    └── src/
        ├── App.jsx
        ├── PhraseForm.jsx         # Formulario POST
        └── SearchBar.jsx          # Búsqueda + badge Cache + contador rate limit
```
