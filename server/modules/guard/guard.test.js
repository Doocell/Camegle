import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { EVENTS } from '../../shared/events.js';
import {
  registerGuardHandlers,
  banIdentity,
  isBanned,
  checkNextRateLimit,
  resetGuardStateForTests,
} from './index.js';
import {
  registerMatchingHandlers,
  resetMatchingStateForTests,
} from '../matching/index.js';

function createMockEnv() {
  const sockets = new Map();

  const io = {
    to(targetId) {
      return {
        emit(event, payload) {
          const target = sockets.get(targetId);
          if (target) {
            target.received.push({ event, payload });
          }
        },
      };
    },
  };

  function createSocket(id, ip = '127.0.0.1') {
    const emitter = new EventEmitter();
    const socket = {
      id,
      handshake: { address: ip, headers: {} },
      data: {},
      received: [],
      disconnected: false,
      on: emitter.on.bind(emitter),
      emit(event, payload) {
        socket.received.push({ event, payload });
      },
      disconnect() {
        socket.disconnected = true;
        emitter.emit('disconnect');
      },
      trigger(event, payload) {
        emitter.emit(event, payload);
      },
    };
    sockets.set(id, socket);
    registerGuardHandlers(io, socket);
    registerMatchingHandlers(io, socket);
    return socket;
  }

  return { io, createSocket };
}

test('F9 Guard - banIdentity stores ban in SQLite and blocks banned user from queue:join with guard:banned', () => {
  resetGuardStateForTests();
  resetMatchingStateForTests();
  const { createSocket } = createMockEnv();

  banIdentity({
    fingerprint: 'bad-fp-999',
    ip: '10.0.0.99',
    reason: 'Pelanggaran pedoman komunitas (3 laporan)',
    durationHours: 24,
  });

  const checkFp = isBanned({ fingerprint: 'bad-fp-999', ip: '192.168.1.1' });
  assert.equal(checkFp.banned, true);
  assert.equal(checkFp.reason, 'Pelanggaran pedoman komunitas (3 laporan)');

  const sBanned = createSocket('user-banned', '10.0.0.99');
  sBanned.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'bad-fp-999' });

  const bannedEvt = sBanned.received.find((e) => e.event === EVENTS.GUARD_BANNED);
  const waitingEvt = sBanned.received.find((e) => e.event === EVENTS.QUEUE_WAITING);

  assert.ok(bannedEvt, 'Banned user should receive guard:banned event');
  assert.equal(waitingEvt, undefined, 'Banned user must NOT enter waiting queue');
});

test('F9 Guard - rate limits match:next to max 10 times per minute per identity', () => {
  resetGuardStateForTests();
  resetMatchingStateForTests();
  const { createSocket } = createMockEnv();
  const s1 = createSocket('user-spammer', '192.168.1.50');

  for (let i = 1; i <= 11; i++) {
    s1.trigger(EVENTS.MATCH_NEXT, { fingerprint: 'fp-spammer' });
  }

  const rateLimitedEvt = s1.received.find((e) => e.event === EVENTS.GUARD_RATE_LIMITED);
  assert.ok(rateLimitedEvt, '11th match:next within 1 minute should emit guard:rate-limited');
  assert.equal(typeof rateLimitedEvt.payload.retryAfterMs, 'number');
});

test('F9 Guard - limits maximum active socket connections per IP', () => {
  resetGuardStateForTests();
  resetMatchingStateForTests();
  const { createSocket } = createMockEnv();
  const ip = '203.0.113.5';

  const activeSockets = [];
  for (let i = 1; i <= 6; i++) {
    activeSockets.push(createSocket(`conn-${i}`, ip));
  }

  // Connection #6 from the same IP exceeds max 5 connections per IP
  const sixth = activeSockets[5];
  assert.equal(sixth.disconnected, true);
  assert.ok(sixth.received.some((e) => e.event === EVENTS.GUARD_RATE_LIMITED));
});
