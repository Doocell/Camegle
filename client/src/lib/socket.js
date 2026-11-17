import { io } from 'socket.io-client';
import { SOCKET_URL } from './constants.js';

/**
 * Satu-satunya instance Socket.io di sisi client (Aturan Wajib #5 PRD).
 * Dipakai bersama oleh seluruh fitur (matching, call, chat, report, guard).
 */
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('[Camelgle Socket] connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Camelgle Socket] disconnected:', reason);
});

export default socket;
