import { io } from 'socket.io-client';
import { SOCKET_URL } from './constants.js';
import { EVENTS } from './events.js';

/**
 * Adapter HTTP Polling untuk Vercel Serverless (ketika WebSocket tidak tersedia
 * dan VITE_SOCKET_URL tidak diset ke server eksternal).
 */
function createHttpPollingSocket(baseUrl = '') {
  const clientId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `http-${crypto.randomUUID()}`
      : `http-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const listeners = new Map();
  const outbox = [];
  let isPolling = false;
  let flushScheduled = false;
  let lastOnlineCount = null;

  function dispatchLocal(event, payload) {
    const handlers = listeners.get(event);
    if (!handlers) return;
    for (const fn of handlers) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[Camelgle Realtime] Listener error (${event}):`, err);
      }
    }
  }

  async function pollOnce() {
    if (isPolling) {
      flushScheduled = true;
      return;
    }
    isPolling = true;
    const batch = outbox.splice(0, outbox.length);

    try {
      const res = await fetch(`${baseUrl}/api/realtime/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, events: batch }),
      });

      if (res.ok) {
        const data = await res.json();
        if (typeof data.onlineCount === 'number' && data.onlineCount !== lastOnlineCount) {
          lastOnlineCount = data.onlineCount;
          dispatchLocal(EVENTS.STATS_ONLINE, { count: data.onlineCount });
        }
        if (Array.isArray(data.messages)) {
          for (const msg of data.messages) {
            if (msg && msg.event) {
              dispatchLocal(msg.event, msg.payload);
            }
          }
        }
      }
    } catch {
      // Abaikan gangguan jaringan sementara; siklus polling berikutnya akan mencoba lagi
    } finally {
      isPolling = false;
      if (flushScheduled || outbox.length > 0) {
        flushScheduled = false;
        pollOnce();
      }
    }
  }

  if (typeof window !== 'undefined') {
    pollOnce();
    setInterval(pollOnce, 1000);

    const handlePageHide = () => {
      try {
        const body = JSON.stringify({ clientId, leave: true });
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            `${baseUrl}/api/realtime/poll`,
            new Blob([body], { type: 'application/json' })
          );
        } else {
          fetch(`${baseUrl}/api/realtime/poll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
          });
        }
      } catch {
        // Ignore
      }
    };

    window.addEventListener('pagehide', handlePageHide);
  }

  return {
    id: clientId,
    connected: true,
    on(event, handler) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event).add(handler);
      if (event === EVENTS.STATS_ONLINE && lastOnlineCount !== null) {
        handler({ count: lastOnlineCount });
      }
      return this;
    },
    off(event, handler) {
      const set = listeners.get(event);
      if (set) {
        if (handler) {
          set.delete(handler);
        } else {
          set.clear();
        }
      }
      return this;
    },
    emit(event, payload) {
      outbox.push({ event, payload });
      pollOnce();
      return this;
    },
  };
}

/**
 * Satu-satunya instance koneksi realtime di sisi client (Aturan Wajib #5 PRD).
 * - Mode Dev / External Server (VITE_SOCKET_URL diisi): memakai Socket.io WebSocket.
 * - Mode Vercel Same-Origin: memakai HTTP Polling Realtime Hub (/api/realtime/poll).
 */
const useSocketIo = Boolean(import.meta.env?.DEV || import.meta.env?.VITE_SOCKET_URL);

export const socket = useSocketIo
  ? io(SOCKET_URL || undefined, {
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })
  : createHttpPollingSocket(SOCKET_URL);

if (useSocketIo) {
  socket.on('connect', () => {
    console.log('[Camelgle Socket] connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Camelgle Socket] disconnected:', reason);
  });
}

export default socket;
