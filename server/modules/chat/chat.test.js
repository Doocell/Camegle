import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { EVENTS } from '../../shared/events.js';
import {
  registerMatchingHandlers,
  resetMatchingStateForTests,
} from '../matching/index.js';
import {
  registerChatHandlers,
  resetChatStateForTests,
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
    registerChatHandlers(io, socket);
    return socket;
  }

  return { io, createSocket };
}

test('F6 Chat - relays trimmed message to matched partner with timestamp and ignores empty text', () => {
  resetMatchingStateForTests();
  resetChatStateForTests();
  const { createSocket } = createMockEnv();
  const s1 = createSocket('user-1');
  const s2 = createSocket('user-2');

  s1.trigger(EVENTS.QUEUE_JOIN, {});
  s2.trigger(EVENTS.QUEUE_JOIN, {});
  const roomId = s1.received.find((e) => e.event === EVENTS.MATCH_FOUND).payload.roomId;

  s1.received = [];
  s2.received = [];

  // Empty/whitespace message should be ignored
  s1.trigger(EVENTS.CHAT_SEND, { roomId, text: '     ' });
  assert.equal(s2.received.length, 0);

  // Valid message with extra spaces is trimmed and relayed only to partner
  s1.trigger(EVENTS.CHAT_SEND, { roomId, text: '  Halo   salam kenal dari Bandung!  ' });
  assert.equal(s2.received.length, 1);
  assert.equal(s2.received[0].event, EVENTS.CHAT_RECEIVE);
  assert.equal(s2.received[0].payload.text, 'Halo salam kenal dari Bandung!');
  assert.equal(typeof s2.received[0].payload.ts, 'number');
  assert.equal(s1.received.length, 0);
});

test('F6 Chat - truncates messages longer than 300 characters and filters bad words from wordlist', () => {
  resetMatchingStateForTests();
  resetChatStateForTests();
  const { createSocket } = createMockEnv();
  const s1 = createSocket('user-1');
  const s2 = createSocket('user-2');

  s1.trigger(EVENTS.QUEUE_JOIN, {});
  s2.trigger(EVENTS.QUEUE_JOIN, {});
  const roomId = s1.received.find((e) => e.event === EVENTS.MATCH_FOUND).payload.roomId;
  s2.received = [];

  // Test bad word filtering (Indonesian + English)
  s1.trigger(EVENTS.CHAT_SEND, { roomId, text: 'Dasar anjing dan fuck kamu' });
  assert.equal(s2.received.length, 1);
  assert.equal(s2.received[0].payload.text, 'Dasar *** dan *** kamu');

  // Test 300 character limit
  const longText = 'a'.repeat(350);
  s1.trigger(EVENTS.CHAT_SEND, { roomId, text: longText });
  assert.equal(s2.received.length, 2);
  assert.equal(s2.received[1].payload.text.length, 300);
});

test('F6 Chat - enforces rate limit of max 5 messages per 5 seconds per user', () => {
  resetMatchingStateForTests();
  resetChatStateForTests();
  const { createSocket } = createMockEnv();
  const s1 = createSocket('user-1');
  const s2 = createSocket('user-2');

  s1.trigger(EVENTS.QUEUE_JOIN, {});
  s2.trigger(EVENTS.QUEUE_JOIN, {});
  const roomId = s1.received.find((e) => e.event === EVENTS.MATCH_FOUND).payload.roomId;
  s2.received = [];

  for (let i = 1; i <= 7; i++) {
    s1.trigger(EVENTS.CHAT_SEND, { roomId, text: `Pesan ke-${i}` });
  }

  // Only the first 5 messages within 5 seconds should be relayed
  assert.equal(s2.received.length, 5);
  assert.equal(s2.received[4].payload.text, 'Pesan ke-5');
});

test('F6 Chat - rejects chat:send from socket not in roomId', () => {
  resetMatchingStateForTests();
  resetChatStateForTests();
  const { createSocket } = createMockEnv();
  const s1 = createSocket('user-1');
  const s2 = createSocket('user-2');
  const outsider = createSocket('outsider-3');

  s1.trigger(EVENTS.QUEUE_JOIN, {});
  s2.trigger(EVENTS.QUEUE_JOIN, {});
  const roomId = s1.received.find((e) => e.event === EVENTS.MATCH_FOUND).payload.roomId;
  s1.received = [];
  s2.received = [];

  outsider.trigger(EVENTS.CHAT_SEND, { roomId, text: 'Spam dari luar room' });
  assert.equal(s1.received.length, 0);
  assert.equal(s2.received.length, 0);
});
