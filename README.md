# Cloudflare Workers + Queues

Proyecto mínimo para probar un flujo **asincrónico** con Cloudflare:

- Un endpoint HTTP en un Worker recibe un `POST` con un JSON.
- El Worker envía ese payload a una cola (`Cloudflare Queues`).
- El mismo Worker consume la cola y procesa mensajes en background.

## ¿Qué hace este ejemplo?

1. **`fetch` handler**
	 - Acepta solo peticiones `POST`.
	 - Lee el body JSON.
	 - Encola el mensaje con `env.PROCESS_QUEUE.send(payload)`.
	 - Responde inmediatamente al cliente con estado `success`.

2. **`queue` handler**
	 - Recibe lotes de mensajes desde la cola.
	 - Imprime cada mensaje por consola (`console.log`).
	 - Marca cada mensaje como procesado con `message.ack()`.

## Requisitos

- Node.js 18+ (recomendado).
- Cuenta de Cloudflare.
- Wrangler CLI (se puede usar vía `npx`).
- Estar autenticado en Cloudflare:

```bash
npx wrangler login
```

## Configuración actual

En `wrangler.toml` ya está definido:

- Worker: `primera-meetup-jschile`
- Entry point: `src/index.ts`
- Cola: `primer-meetup-jschile-queue`
- Binding de productor: `PROCESS_QUEUE`
- Consumidor de la misma cola en el propio Worker

## Levantar el proyecto

### 1) Crear la cola (una sola vez por cuenta/entorno)

```bash
npx wrangler queues create primer-meetup-jschile-queue
```

### 2) Desplegar el Worker

```bash
npx wrangler deploy
```

### 3) Ver logs en tiempo real

```bash
npx wrangler tail
```

## Probar el endpoint

Haz un `POST` al URL que entrega `wrangler deploy`:

```bash
curl -X POST "https://<tu-worker>.workers.dev" \
	-H "Content-Type: application/json" \
	-d '{"user":"samuel","action":"demo","timestamp":"2026-03-03T10:00:00Z"}'
```

Respuesta esperada:

```json
{
	"status": "success",
	"message": "¡Tarea enviada a la cola en el Edge!"
}
```

En `wrangler tail` deberías ver algo como:

```text
Procesando tarea en background: { ...payload... }
```

## Estructura

```text
.
├── README.md
├── wrangler.toml
└── src/
		└── index.ts
```