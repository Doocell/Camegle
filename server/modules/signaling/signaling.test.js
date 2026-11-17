import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { EVENTS } from '../../shared/events.js';
import {
  registerMatchingHandlers,
  resetMatchingStateForTests,
} from '../matching/index.js';
import { registerSignalingHandlers } from './index.js';

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
    registerSignalingHandlers(io, socket);
    return socket;
  }

  return { io, createSocket };
}

test('F4 Signaling - relays offer, answer, and ice candidate only to matched partner in same roomId', () => {
  resetMatchingStateForTests();
  const { createSocket } = createMockEnv();
  const s1 = createSocket('user-1');
  const s2 = createSocket('user-2');

  s1.trigger(EVENTS.QUEUE_JOIN, {});
  s2.trigger(EVENTS.QUEUE_JOIN, {});

  const matchEvent = s1.received.find((e) => e.event === EVENTS.MATCH_FOUND);
  const roomId = matchEvent.payload.roomId;

  s1.received = [];
  s2.received = [];

  // 1. s1 sends offer -> s2 receives offer
  s1.trigger(EVENTS.SIGNAL_OFFER, { roomId, sdp: { type: 'offer', sdp: 'v=0...' } });
  assert.equal(s2.received.length, 1);
  assert.equal(s2.received[0].event, EVENTS.SIGNAL_OFFER);
  assert.deepEqual(s2.received[0].payload, { roomId, sdp: { type: 'offer', sdp: 'v=0...' } });

  // 2. s2 sends answer -> s1 receives answer
  s2.trigger(EVENTS.SIGNAL_ANSWER, { roomId, sdp: { type: 'answer', sdp: 'v=0...' } });
  assert.equal(s1.received.length, 1);
  assert.equal(s1.received[0].event, EVENTS.SIGNAL_ANSWER);
  assert.deepEqual(s1.received[0].payload, { roomId, sdp: { type: 'answer', sdp: 'v=0...' } });

  // 3. s1 sends ice -> s2 receives ice
  s1.trigger(EVENTS.SIGNAL_ICE, { roomId, candidate: { candidate: 'candidate:1...' } });
  assert.equal(s2.received.length, 2);
  assert.equal(s2.received[1].event, EVENTS.SIGNAL_ICE);
});

test('F4 Signaling - rejects signaling events from outsider socket not in the roomId', () => {
  resetMatchingStateForTests();
  const { createSocket } = createMockEnv();
  const s1 = createSocket('user-1');
  const s2 = createSocket('user-2');
  const intruder = createSocket('intruder-3');

  s1.trigger(EVENTS.QUEUE_JOIN, {});
  s2.trigger(EVENTS.QUEUE_JOIN, {});

  const roomId = s1.received.find((e) => e.event === EVENTS.MATCH_FOUND).payload.roomId;
  s1.received = [];
  s2.received = [];

  // Intruder tries to inject offer into roomId
  intruder.trigger(EVENTS.SIGNAL_OFFER, { roomId, sdp: { type: 'offer', sdp: 'malicious' } });

  assert.equal(s1.received.length, 0);
  assert.equal(s2.received.length, 0);
});
