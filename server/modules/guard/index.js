import db from '../../shared/db.js';
import { EVENTS } from '../../shared/events.js';

/**
 * F9: Guard Module (Ban Identity & Rate Limit)
 * - Tabel SQLite `bans` untuk memblokir fingerprint dan/atau IP
 * - Rate limit match:next maksimal 10 kali per menit per identitas
 * - Rate limit koneksi aktif maksimal 5 socket per IP
 * - Mengekspor banIdentity() dan isBanned() untuk dipakai modul lain (F3, F7)
 */

const MAX_NEXT_PER_MINUTE = 10;
const NEXT_WINDOW_MS = 60 * 1000;
const MAX_SOCKETS_PER_IP = 5;

const nextRateMap = new Map(); // identityKey -> number[] (timestamps)
const ipConnectionCount = new Map(); // ip -> Set<socketId>
const socketIdentities = new Map(); // socketId -> { ip, fingerprint }
const recentSocketIdentities = new Map(); // socketId -> { ip, fingerprint, expiresAt }

export function resetGuardStateForTests() {
  db.exec('DELETE FROM bans;');
  nextRateMap.clear();
  ipConnectionCount.clear();
  socketIdentities.clear();
  recentSocketIdentities.clear();
}

export function extractSocketIp(socket) {
  const forwarded = socket?.handshake?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return socket?.handshake?.address || '127.0.0.1';
}

export function setSocketFingerprint(socketId, fingerprint) {
  const current = socketIdentities.get(socketId) || { ip: '127.0.0.1', fingerprint: null };
  if (fingerprint) {
    current.fingerprint = String(fingerprint);
  }
  socketIdentities.set(socketId, current);
}

export function getSocketIdentity(socketId) {
  if (socketIdentities.has(socketId)) {
    return socketIdentities.get(socketId);
  }
  const recent = recentSocketIdentities.get(socketId);
  if (recent && recent.expiresAt > Date.now()) {
    return { ip: recent.ip, fingerprint: recent.fingerprint };
  }
  return { ip: '127.0.0.1', fingerprint: null };
}

export function banIdentity({ fingerprint = null, ip = null, reason = 'Pelanggaran aturan komunitas', durationHours = 24 }) {
  const now = Date.now();
  const expiresAt = now + durationHours * 3600 * 1000;

  const stmt = db.prepare(`
    INSERT INTO bans (fingerprint, ip, reason, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(fingerprint || null, ip || null, reason, now, expiresAt);

  return { fingerprint, ip, reason, expiresAt };
}

export function isBanned({ fingerprint = null, ip = null }) {
  const now = Date.now();

  // Hapus ban yang sudah kedaluwarsa
  db.prepare('DELETE FROM bans WHERE expires_at <= ?').run(now);

  if (fingerprint) {
    const row = db
      .prepare('SELECT reason, expires_at FROM bans WHERE fingerprint = ? AND expires_at > ? ORDER BY expires_at DESC LIMIT 1')
      .get(String(fingerprint), now);
    if (row) {
      return { banned: true, reason: row.reason, expiresAt: row.expires_at };
    }
  }

  if (ip) {
    const row = db
      .prepare('SELECT reason, expires_at FROM bans WHERE ip = ? AND expires_at > ? ORDER BY expires_at DESC LIMIT 1')
      .get(String(ip), now);
    if (row) {
      return { banned: true, reason: row.reason, expiresAt: row.expires_at };
    }
  }

  return { banned: false, reason: null, expiresAt: null };
}

export function getActiveBans() {
  const now = Date.now();
  db.prepare('DELETE FROM bans WHERE expires_at <= ?').run(now);
  const rows = db
    .prepare('SELECT * FROM bans WHERE expires_at > ? ORDER BY created_at DESC LIMIT 200')
    .all(now);
  return rows.map((r) => ({
    id: r.id,
    fingerprint: r.fingerprint,
    ip: r.ip,
    reason: r.reason,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }));
}

export function unbanById(banId) {
  db.prepare('DELETE FROM bans WHERE id = ?').run(Number(banId));
}

export function checkNextRateLimit(identityKey, now = Date.now()) {
  const key = identityKey || 'anonymous';
  const timestamps = (nextRateMap.get(key) || []).filter((ts) => now - ts < NEXT_WINDOW_MS);

  if (timestamps.length >= MAX_NEXT_PER_MINUTE) {
    const oldest = timestamps[0];
    const retryAfterMs = Math.max(1000, NEXT_WINDOW_MS - (now - oldest));
    nextRateMap.set(key, timestamps);
    return { allowed: false, retryAfterMs };
  }

  timestamps.push(now);
  nextRateMap.set(key, timestamps);
  return { allowed: true, retryAfterMs: 0 };
}

export function registerGuardHandlers(_io, socket) {
  const ip = extractSocketIp(socket);
  socketIdentities.set(socket.id, { ip, fingerprint: null });

  // Rate limit jumlah koneksi aktif per IP
  const activeSet = ipConnectionCount.get(ip) || new Set();
  if (activeSet.size >= MAX_SOCKETS_PER_IP) {
    socket.emit(EVENTS.GUARD_RATE_LIMITED, { retryAfterMs: 10000 });
    if (typeof socket.disconnect === 'function') {
      socket.disconnect(true);
    }
    return;
  }

  activeSet.add(socket.id);
  ipConnectionCount.set(ip, activeSet);

  socket.on('disconnect', () => {
    const setForIp = ipConnectionCount.get(ip);
    if (setForIp) {
      setForIp.delete(socket.id);
      if (setForIp.size === 0) {
        ipConnectionCount.delete(ip);
      }
    }
    const existing = socketIdentities.get(socket.id);
    if (existing) {
      recentSocketIdentities.set(socket.id, {
        ...existing,
        expiresAt: Date.now() + 2 * 60 * 1000,
      });
    }
    socketIdentities.delete(socket.id);
  });
}
