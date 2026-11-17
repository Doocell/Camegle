import crypto from 'node:crypto';
import { EVENTS } from '../../shared/events.js';
import {
  isBanned,
  checkNextRateLimit,
  extractSocketIp,
  setSocketFingerprint,
  getSocketIdentity,
} from '../guard/index.js';

/**
 * F3: Random Matching Module (In-Memory Queue & Room Pairing)
 * Mengelola antrean pencarian pasangan, pembuatan roomId, dan notifikasi peer-left.
 * Terintegrasi dengan F9 Guard (isBanned & checkNextRateLimit).
 */

const waitingQueue = []; // Array of { socketId, fingerprint }
const rooms = new Map(); // roomId -> { users: [socketId1, socketId2], createdAt }
const recentRooms = new Map(); // roomId -> { users: [socketId1, socketId2], expiresAt }
const socketToRoom = new Map(); // socketId -> roomId
const lastPartnerMap = new Map(); // socketId -> previousPartnerSocketId

export function resetMatchingStateForTests() {
  waitingQueue.length = 0;
  rooms.clear();
  recentRooms.clear();
  socketToRoom.clear();
  lastPartnerMap.clear();
}

export function isSocketInRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return false;
  return room.users.includes(socketId);
}

export function getPartnerSocketId(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room || !room.users.includes(socketId)) return null;
  return room.users.find((id) => id !== socketId) || null;
}

/**
 * Mengambil partnerSocketId untuk keperluan Report (F7) & Moderation (F8),
 * termasuk jika lawan bicara baru saja kabur/keluar dalam 2 menit terakhir.
 */
export function getReportablePartnerSocketId(roomId, socketId) {
  const activePartner = getPartnerSocketId(roomId, socketId);
  if (activePartner) return activePartner;

  const recent = recentRooms.get(roomId);
  if (recent && recent.expiresAt > Date.now() && recent.users.includes(socketId)) {
    return recent.users.find((id) => id !== socketId) || null;
  }
  return null;
}

function removeFromQueue(socketId) {
  const index = waitingQueue.findIndex((item) => item.socketId === socketId);
  if (index !== -1) {
    waitingQueue.splice(index, 1);
  }
}

function leaveCurrentRoom(io, socketId, recordLastPartner = false) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  const partnerId = getPartnerSocketId(roomId, socketId);
  if (room) {
    recentRooms.set(roomId, {
      users: [...room.users],
      expiresAt: Date.now() + 2 * 60 * 1000,
    });
  }
  rooms.delete(roomId);
  socketToRoom.delete(socketId);

  if (partnerId) {
    socketToRoom.delete(partnerId);
    if (recordLastPartner) {
      lastPartnerMap.set(socketId, partnerId);
      lastPartnerMap.set(partnerId, socketId);
    }
    io.to(partnerId).emit(EVENTS.MATCH_PEER_LEFT);
  }
}

function joinQueueAndMatch(io, socket, payload = {}) {
  const socketId = socket.id;
  const ip = extractSocketIp(socket);
  const fingerprint = payload?.fingerprint || getSocketIdentity(socketId).fingerprint || null;

  if (fingerprint) {
    setSocketFingerprint(socketId, fingerprint);
  }

  // F9 Guard Check: Cek apakah fingerprint atau IP sedang di-ban
  const banStatus = isBanned({ fingerprint, ip });
  if (banStatus.banned) {
    socket.emit(EVENTS.GUARD_BANNED, {
      reason: banStatus.reason,
      expiresAt: banStatus.expiresAt,
    });
    return;
  }

  // Pastikan tidak duplikat di antrean
  if (waitingQueue.some((item) => item.socketId === socketId)) {
    return;
  }

  // Cari kandidat di antrean yang bukan diri sendiri & bukan pasangan yang baru dilewati
  const lastSkipPartner = lastPartnerMap.get(socketId);
  const candidateIndex = waitingQueue.findIndex(
    (item) =>
      item.socketId !== socketId &&
      item.socketId !== lastSkipPartner &&
      lastPartnerMap.get(item.socketId) !== socketId
  );

  if (candidateIndex !== -1) {
    const [partner] = waitingQueue.splice(candidateIndex, 1);
    const roomId = crypto.randomUUID();

    rooms.set(roomId, {
      users: [partner.socketId, socketId],
      createdAt: Date.now(),
    });
    socketToRoom.set(partner.socketId, roomId);
    socketToRoom.set(socketId, roomId);

    // Bersihkan riwayat skip karena sudah dapat pasangan baru yang berbeda
    lastPartnerMap.delete(partner.socketId);
    lastPartnerMap.delete(socketId);

    // Emit match:found ke kedua pihak dengan peran isInitiator berbeda
    io.to(partner.socketId).emit(EVENTS.MATCH_FOUND, {
      roomId,
      isInitiator: true,
    });
    socket.emit(EVENTS.MATCH_FOUND, {
      roomId,
      isInitiator: false,
    });
  } else {
    waitingQueue.push({ socketId, fingerprint });
    socket.emit(EVENTS.QUEUE_WAITING);
  }
}

export function registerMatchingHandlers(io, socket) {
  socket.on(EVENTS.QUEUE_JOIN, (payload) => {
    leaveCurrentRoom(io, socket.id, false);
    joinQueueAndMatch(io, socket, payload);
  });

  socket.on(EVENTS.QUEUE_LEAVE, () => {
    removeFromQueue(socket.id);
    leaveCurrentRoom(io, socket.id, false);
  });

  socket.on(EVENTS.MATCH_NEXT, (payload) => {
    const ip = extractSocketIp(socket);
    const fingerprint = payload?.fingerprint || getSocketIdentity(socket.id).fingerprint || null;
    if (fingerprint) {
      setSocketFingerprint(socket.id, fingerprint);
    }

    // F9 Rate Limit: maksimal 10 kali match:next per menit per identitas
    const identityKey = fingerprint || ip || socket.id;
    const rateCheck = checkNextRateLimit(identityKey);
    if (!rateCheck.allowed) {
      socket.emit(EVENTS.GUARD_RATE_LIMITED, {
        retryAfterMs: rateCheck.retryAfterMs,
      });
      return;
    }

    removeFromQueue(socket.id);
    leaveCurrentRoom(io, socket.id, true);
    joinQueueAndMatch(io, socket, payload);
  });

  socket.on('disconnect', () => {
    removeFromQueue(socket.id);
    leaveCurrentRoom(io, socket.id, false);
    lastPartnerMap.delete(socket.id);
  });
}
