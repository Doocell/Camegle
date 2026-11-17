import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS } from './events.js';
import { createRealtimeHub } from './realtime.js';
import { resetMatchingStateForTests, registerMatchingHandlers } from '../modules/matching/index.js';
import { registerSignalingHandlers } from '../modules/signaling/index.js';
import { registerChatHandlers, resetChatStateForTests } from '../modules/chat/index.js';
import { registerGuardHandlers, resetGuardStateForTests } from '../modules/guard/index.js';
import { registerReportHandlers, resetReportStateForTests } from '../modules/report/index.js';

test('Vercel HTTP Realtime Hub - pairs two clients, relays WebRTC signals and chat over HTTP polling', () => {
  resetGuardStateForTests();
  resetMatchingStateForTests();
  resetChatStateForTests();
  resetReportStateForTests();

  const hub = createRealtimeHub((io, socket) => {
    registerGuardHandlers(io, socket);
    registerMatchingHandlers(io, socket);
    registerSignalingHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerReportHandlers(io, socket);
  });

  // 1. Client A and Client B poll & join queue
  const resA1 = hub.handlePoll({
    clientId: 'vercel-client-A',
    ip: '114.10.1.1',
    events: [{ event: EVENTS.QUEUE_JOIN, payload: { fingerprint: 'fp-mobile-hp' } }],
  });
  assert.equal(resA1.onlineCount, 1);
  assert.ok(resA1.messages.some((m) => m.event === EVENTS.QUEUE_WAITING));

  const resB1 = hub.handlePoll({
    clientId: 'vercel-client-B',
    ip: '180.20.2.2',
    events: [{ event: EVENTS.QUEUE_JOIN, payload: { fingerprint: 'fp-laptop-pc' } }],
  });
  assert.equal(resB1.onlineCount, 2);

  // Client B immediately receives match:found in its response
  const matchB = resB1.messages.find((m) => m.event === EVENTS.MATCH_FOUND);
  assert.ok(matchB);
  assert.equal(matchB.payload.isInitiator, false);

  // Client A polls and receives match:found (isInitiator: true)
  const resA2 = hub.handlePoll({
    clientId: 'vercel-client-A',
    ip: '114.10.1.1',
    events: [],
  });
  const matchA = resA2.messages.find((m) => m.event === EVENTS.MATCH_FOUND);
  assert.ok(matchA);
  assert.equal(matchA.payload.isInitiator, true);
  assert.equal(matchA.payload.roomId, matchB.payload.roomId);

  const roomId = matchA.payload.roomId;

  // 2. Client A sends WebRTC signal:offer -> Client B receives it on next poll
  hub.handlePoll({
    clientId: 'vercel-client-A',
    ip: '114.10.1.1',
    events: [{ event: EVENTS.SIGNAL_OFFER, payload: { roomId, sdp: { type: 'offer', sdp: 'v=0' } } }],
  });

  const resB2 = hub.handlePoll({
    clientId: 'vercel-client-B',
    ip: '180.20.2.2',
    events: [],
  });
  const offerAtB = resB2.messages.find((m) => m.event === EVENTS.SIGNAL_OFFER);
  assert.ok(offerAtB);
  assert.equal(offerAtB.payload.roomId, roomId);

  // 3. Client B sends chat message -> Client A receives it
  hub.handlePoll({
    clientId: 'vercel-client-B',
    ip: '180.20.2.2',
    events: [{ event: EVENTS.CHAT_SEND, payload: { roomId, text: 'Halo dari HP!' } }],
  });

  const resA3 = hub.handlePoll({
    clientId: 'vercel-client-A',
    ip: '114.10.1.1',
    events: [],
  });
  const chatAtA = resA3.messages.find((m) => m.event === EVENTS.CHAT_RECEIVE);
  assert.ok(chatAtA);
  assert.equal(chatAtA.payload.text, 'Halo dari HP!');
});
