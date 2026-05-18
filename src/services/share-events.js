const clients = new Map();
let clientId = 0;

export function addClient(controller) {
  const id = ++clientId;
  clients.set(id, controller);
  return id;
}

export function removeClient(id) {
  clients.delete(id);
}

export function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [id, controller] of clients) {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch {
      clients.delete(id);
    }
  }
}

// Heartbeat to keep connections alive (below CF 30s timeout)
setInterval(() => {
  const ping = `: heartbeat\n\n`;
  for (const [id, controller] of clients) {
    try {
      controller.enqueue(new TextEncoder().encode(ping));
    } catch {
      clients.delete(id);
    }
  }
}, 25000);
