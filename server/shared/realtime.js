import { EventEmitter } from 'node:events';

const CLIENT_TTL_MS = 25000;

/**
 * HTTP Polling Realtime Hub untuk Vercel Serverless.
 * Menyediakan adapter `io` dan `socket` yang kompatibel dengan modul Socket.io
 * (guard, matching, signaling, chat, report) melalui endpoint `POST /api/realtime/poll`.
 */
export function createRealtimeHub(onConnection) {
  const clients = new Map(); // clientId -> { socket, emitter, queue, lastSeen }

  const io = {
    to(targetId) {
      return {
        emit(event, payload) {
          const target = clients.get(targetId);
          if (target) {
            target.queue.push({ event, payload });
          }
        },
      };
    },
    emit(event, payload) {
      for (const client of clients.values()) {
        client.queue.push({ event, payload });
      }
    },
  };

  function removeClient(clientId) {
    const entry = clients.get(clientId);
    if (!entry) return;
    clients.delete(clientId);
    entry.emitter.emit('disconnect', 'transport close');
  }

  function pruneStaleClients(now = Date.now()) {
    for (const [id, entry] of clients.entries()) {
      if (now - entry.lastSeen > CLIENT_TTL_MS) {
        removeClient(id);
      }
    }
  }

  function ensureClient(clientId, ip, now) {
    let entry = clients.get(clientId);
    if (entry) {
      entry.lastSeen = now;
      return entry;
    }

    const emitter = new EventEmitter();
    const queue = [];

    const socket = {
      id: clientId,
      handshake: {
        address: ip || '127.0.0.1',
        headers: ip ? { 'x-forwarded-for': ip } : {},
      },
      data: {},
      on(event, handler) {
        emitter.on(event, handler);
      },
      off(event, handler) {
        emitter.off(event, handler);
      },
      emit(event, payload) {
        queue.push({ event, payload });
      },
      disconnect() {
        removeClient(clientId);
      },
    };

    entry = {
      socket,
      emitter,
      queue,
      lastSeen: now,
    };
    clients.set(clientId, entry);

    if (typeof onConnection === 'function') {
      onConnection(io, socket);
    }

    return entry;
  }

  function handlePoll({ clientId, ip = '127.0.0.1', events = [], leave = false } = {}) {
    const now = Date.now();
    pruneStaleClients(now);

    if (!clientId || typeof clientId !== 'string') {
      return { onlineCount: clients.size, messages: [] };
    }

    if (leave) {
      removeClient(clientId);
      return { onlineCount: clients.size, messages: [] };
    }

    const entry = ensureClient(clientId, ip, now);

    if (Array.isArray(events)) {
      for (const item of events) {
        if (item && typeof item.event === 'string' && item.event !== 'disconnect') {
          entry.emitter.emit(item.event, item.payload);
        }
      }
    }

    const messages = entry.queue.splice(0, entry.queue.length);
    return {
      onlineCount: clients.size,
      messages,
    };
  }

  return {
    handlePoll,
    pruneStaleClients,
    getOnlineCount: () => clients.size,
  };
}
