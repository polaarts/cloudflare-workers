export interface Env {
  // Enlazamos nuestra cola desde el archivo de configuración
  PROCESS_QUEUE: Queue;
}

export default {
  // 1. Manejador HTTP: Intercepta peticiones entrantes
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== "POST") {
       return new Response("Por favor, envía un POST", { status: 405 });
    }

    // Simulamos recibir datos de un usuario o evento
    const payload = await request.json();

    // 2. Enviamos el mensaje a Cloudflare Queues
    // Esto es instantáneo, liberando al cliente de inmediato
    await env.PROCESS_QUEUE.send(payload);

    return new Response(JSON.stringify({ 
      status: "success", 
      message: "¡Tarea enviada a la cola en el Edge!" 
    }), {
      headers: { "Content-Type": "application/json" },
    });
  },

  // 3. Manejador de Colas: Procesa tareas en segundo plano
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      // Aquí ejecutaríamos tareas pesadas: base de datos, emails, scrapers, etc.
      console.log("Procesando tarea en background:", message.body);
      
      // Marcamos el mensaje como completado
      message.ack();
    }
  }
};