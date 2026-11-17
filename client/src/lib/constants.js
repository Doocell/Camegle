/**
 * Konstanta Global Client (PRD Bagian 4 & F10 Dynamic TURN Credentials)
 * Di produksi (Vercel Services dengan shared domain rewrites), jika VITE_SOCKET_URL kosong,
 * gunakan same-origin ('') agar request menuju /api/* dan /socket.io/* pada domain yang sama.
 */

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || (import.meta.env?.DEV ? 'http://localhost:3001' : '');

export const ICE_SERVERS = [
  {
    urls: import.meta.env.VITE_STUN_URL || 'stun:stun.l.google.com:19302',
  },
];

/**
 * Mengambil kredensial TURN sementara (time-limited HMAC-SHA1) dari backend
 * sehingga tidak ada kredensial TURN statis di bundle klien (F10).
 */
export async function refreshTurnCredentials() {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return ICE_SERVERS;
  try {
    const res = await fetch(`${SOCKET_URL}/api/turn-credentials`);
    if (!res.ok) return ICE_SERVERS;
    const data = await res.json();
    if (Array.isArray(data?.iceServers) && data.iceServers.length > 0) {
      ICE_SERVERS.splice(0, ICE_SERVERS.length, ...data.iceServers);
    }
  } catch {
    // Fallback ke STUN default jika server belum terjangkau
  }
  return ICE_SERVERS;
}

if (typeof window !== 'undefined') {
  refreshTurnCredentials();
}

export const NSFW_CONFIG = {
  INITIAL_BLUR_MS: 2000,
  CHECK_INTERVAL_MS: 2000,
  THRESHOLD: 0.7,
  CONSECUTIVE_STRIKES: 2,
};
