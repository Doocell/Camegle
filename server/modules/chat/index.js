import { EVENTS } from '../../shared/events.js';
import { isSocketInRoom, getPartnerSocketId } from '../matching/index.js';
import { BAD_WORDS } from './wordlist.js';

/**
 * F6: Text Chat Module
 * - Validasi pengirim adalah anggota room
 * - Buang spasi berlebih & batasi maksimal 300 karakter
 * - Rate limit: maksimal 5 pesan per 5 detik per user
 * - Filter kata kasar dari wordlist.js menjadi '***'
 * - Pesan TIDAK disimpan di server, langsung diteruskan sebagai chat:receive { text, ts }
 */

const MAX_LENGTH = 300;
const RATE_LIMIT_MAX_MSGS = 5;
const RATE_LIMIT_WINDOW_MS = 5000;

// Map: socketId -> array of timestamps (ms)
const messageTimestamps = new Map();

// Pre-compile regex untuk penyensoran kata kasar (boundary word case-insensitive)
const badWordsPattern = new RegExp(
  `\\b(${BAD_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'gi'
);

export function resetChatStateForTests() {
  messageTimestamps.clear();
}

export function sanitizeAndFilterText(rawText) {
  if (typeof rawText !== 'string') return '';
  // Buang spasi berlebih di awal/akhir dan rapikan spasi ganda
  let cleaned = rawText.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  // Batasi maksimal 300 karakter
  if (cleaned.length > MAX_LENGTH) {
    cleaned = cleaned.slice(0, MAX_LENGTH);
  }
  // Sensor kata kasar
  return cleaned.replace(badWordsPattern, '***');
}

function isWithinRateLimit(socketId, now = Date.now()) {
  const history = messageTimestamps.get(socketId) || [];
  const recent = history.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_MSGS) {
    messageTimestamps.set(socketId, recent);
    return false;
  }
  recent.push(now);
  messageTimestamps.set(socketId, recent);
  return true;
}

export function registerChatHandlers(io, socket) {
  socket.on(EVENTS.CHAT_SEND, (payload) => {
    const roomId = payload?.roomId;
    if (!roomId || !isSocketInRoom(roomId, socket.id)) {
      return;
    }

    const partnerId = getPartnerSocketId(roomId, socket.id);
    if (!partnerId) {
      return;
    }

    const filteredText = sanitizeAndFilterText(payload?.text);
    if (!filteredText) {
      return;
    }

    const now = Date.now();
    if (!isWithinRateLimit(socket.id, now)) {
      return;
    }

    io.to(partnerId).emit(EVENTS.CHAT_RECEIVE, {
      text: filteredText,
      ts: now,
    });
  });

  socket.on('disconnect', () => {
    messageTimestamps.delete(socket.id);
  });
}
