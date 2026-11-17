import { EVENTS } from '../../shared/events.js';
import { isSocketInRoom, getPartnerSocketId } from '../matching/index.js';

/**
 * F4: WebRTC Signaling Module
 * Meneruskan signal:offer, signal:answer, dan signal:ice HANYA ke pasangan
 * di roomId yang sama setelah memvalidasi pengirim adalah anggota room tersebut.
 */
function relaySignal(io, socket, eventName, payload) {
  const roomId = payload?.roomId;
  if (!roomId || !isSocketInRoom(roomId, socket.id)) {
    return;
  }

  const partnerId = getPartnerSocketId(roomId, socket.id);
  if (!partnerId) {
    return;
  }

  io.to(partnerId).emit(eventName, payload);
}

export function registerSignalingHandlers(io, socket) {
  socket.on(EVENTS.SIGNAL_OFFER, (payload) => {
    relaySignal(io, socket, EVENTS.SIGNAL_OFFER, payload);
  });

  socket.on(EVENTS.SIGNAL_ANSWER, (payload) => {
    relaySignal(io, socket, EVENTS.SIGNAL_ANSWER, payload);
  });

  socket.on(EVENTS.SIGNAL_ICE, (payload) => {
    relaySignal(io, socket, EVENTS.SIGNAL_ICE, payload);
  });
}
