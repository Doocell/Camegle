import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { EVENTS } from '../../shared/events.js';
import {
  registerMatchingHandlers,
  resetMatchingStateForTests,
  isSocketInRoom,
  getPartnerSocketId,
} from './index.js';

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

  function createSocket(id) {
    const emitter = new EventEmitter();
    const socket = {
      id,
      received: [],
      on: emitter.on.bind(emitter),
      emit(event, payload) {
        socket.received.push({ event, payload });
      },
      trigger(event, payload) {
        emitter.emit(event, payload);
      },
    };
    sockets.set(id, socket);
    registerMatchingHandlers(io, socket);
    return socket;
  }

  return { io, createSocket };
}

test('F3 Matching - single user joining queue receives queue:waiting', () => {
  resetMatchingStateForTests();
  const { createSocket } = createMockEnv();
  const s1 = createSocket('user-1');

  s1.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-1' });

  assert.equal(s1.received.length, 1);
  assert.equal(s1.received[0].event, EVENTS.QUEUE_WAITING);
});

test('F3 Matching - two users joining queue are matched with same roomId and opposite isInitiator', () => {
  resetMatchingStateForTests();
  const { createSocket } = createMockEnv();
  const s1 = createSocket('user-1');
  const s2 = createSocket('user-2');

  s1.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-1' });
  s2.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-2' });

  const s1Match = s1.received.find((e) => e.event === EVENTS.MATCH_FOUND);
  const s2Match = s2.received.find((e) => e.event === EVENTS.MATCH_FOUND);

  assert.ok(s1Match, 'user-1 should receive match:found');
  assert.ok(s2Match, 'user-2 should receive match:found');
  assert.equal(s1Match.payload.roomId, s2Match.payload.roomId);
  assert.notEqual(s1Match.payload.isInitiator, s2Match.payload.isInitiator);

  const roomId = s1Match.payload.roomId;
  assert.equal(isSocketInRoom(roomId, 'user-1'), true);
  assert.equal(isSocketInRoom(roomId, 'user-2'), true);
  assert.equal(getPartnerSocketId(roomId, 'user-1'), 'user-2');
});

test('F3 Matching - prevents self-match if same socket sends queue:join twice', () => {
  resetMatchingStateForTests();
  const { createSocket } = createMockEnv();
  const s1 = createSocket('user-1');

  s1.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-1' });
  s1.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-1' });

  const matchEvents = s1.received.filter((e) => e.event === EVENTS.MATCH_FOUND);
  assert.equal(matchEvents.length, 0);
});

test('F3 Matching - match:next notifies partner with match:peer-left and avoids immediate rematch with same peer', () => {
  resetMatchingStateForTests();
  const { createSocket } = createMockEnv();
  const s1 = createSocket('user-1');
  const s2 = createSocket('user-2');
  const s3 = createSocket('user-3');

  s1.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-1' });
  s2.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-2' });

  // Clear received history after first match
  s1.received = [];
  s2.received = [];

  // user-1 clicks Next -> user-2 gets match:peer-left, user-1 enters queue
  s1.trigger(EVENTS.MATCH_NEXT);

  assert.ok(
    s2.received.some((e) => e.event === EVENTS.MATCH_PEER_LEFT),
    'user-2 should be notified match:peer-left'
  );
  assert.ok(
    s1.received.some((e) => e.event === EVENTS.QUEUE_WAITING),
    'user-1 should be placed back in waiting queue'
  );

  // If user-2 immediately rejoins while only user-1 is waiting, prevent immediate rematch
  s1.received = [];
  s2.received = [];
  s2.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-2' });

  assert.equal(
    s1.received.filter((e) => e.event === EVENTS.MATCH_FOUND).length,
    0,
    'should not immediately rematch user-1 and user-2 who just skipped each other'
  );

  // When user-3 joins, user-3 matches with user-1!
  s3.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-3' });
  assert.ok(s1.received.some((e) => e.event === EVENTS.MATCH_FOUND));
  assert.ok(s3.received.some((e) => e.event === EVENTS.MATCH_FOUND));
});

test('F3 Matching - disconnect notifies partner with match:peer-left', () => {
  resetMatchingStateForTests();
  const { createSocket } = createMockEnv();
  const s1 = createSocket('user-1');
  const s2 = createSocket('user-2');

  s1.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-1' });
  s2.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-2' });

  s2.received = [];
  s1.trigger('disconnect');

  assert.ok(
    s2.received.some((e) => e.event === EVENTS.MATCH_PEER_LEFT),
    'partner should receive match:peer-left on disconnect'
  );
});
