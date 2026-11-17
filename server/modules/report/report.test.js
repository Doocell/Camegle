import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { EVENTS } from '../../shared/events.js';
import {
  registerGuardHandlers,
  isBanned,
  banIdentity,
  getActiveBans,
  unbanById,
  resetGuardStateForTests,
} from '../guard/index.js';
import {
  registerMatchingHandlers,
  resetMatchingStateForTests,
} from '../matching/index.js';
import {
  registerReportHandlers,
  getAllReports,
  purgeExpiredReports,
  setReportFlaggedForAction,
  deleteReportById,
  resetReportStateForTests,
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

  function createSocket(id, ip = '127.0.0.1') {
    const emitter = new EventEmitter();
    const socket = {
      id,
      handshake: { address: ip, headers: {} },
      data: {},
      received: [],
      on: emitter.on.bind(emitter),
      emit(event, payload) {
        socket.received.push({ event, payload });
      },
      disconnect() {},
      trigger(event, payload) {
        emitter.emit(event, payload);
      },
    };
    sockets.set(id, socket);
    registerGuardHandlers(io, socket);
    registerMatchingHandlers(io, socket);
    registerReportHandlers(io, socket);
    return socket;
  }

  return { io, createSocket };
}

test('F7 Report - stores report with snapshot, chatLog, and reported peer identity in SQLite', () => {
  resetGuardStateForTests();
  resetMatchingStateForTests();
  resetReportStateForTests();
  const { createSocket } = createMockEnv();

  const sReporter = createSocket('reporter-1', '10.10.1.1');
  const sOffender = createSocket('offender-1', '10.10.9.9');

  sReporter.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-good-1' });
  sOffender.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-offender-99' });

  const roomId = sReporter.received.find((e) => e.event === EVENTS.MATCH_FOUND).payload.roomId;

  sReporter.trigger(EVENTS.REPORT_SUBMIT, {
    roomId,
    reason: 'sexual_content',
    notes: 'Konten tidak pantas',
    snapshot: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    chatLog: [{ sender: 'peer', text: 'Halo', ts: Date.now() }],
  });

  const reports = getAllReports();
  assert.equal(reports.length, 1);
  assert.equal(reports[0].reason, 'sexual_content');
  assert.equal(reports[0].reportedFingerprint, 'fp-offender-99');
  assert.equal(reports[0].reportedIp, '10.10.9.9');
  assert.ok(reports[0].snapshot.startsWith('data:image/jpeg'));
  assert.equal(reports[0].chatLog.length, 1);
});

test('F7 Report - auto-bans identity via guard banIdentity() when reported by 3 distinct sessions within 24h', () => {
  resetGuardStateForTests();
  resetMatchingStateForTests();
  resetReportStateForTests();
  const { createSocket } = createMockEnv();

  const offender = createSocket('offender-main', '10.20.30.40');

  for (let i = 1; i <= 3; i++) {
    const reporter = createSocket(`reporter-${i}`, `10.0.0.${i}`);
    reporter.trigger(EVENTS.QUEUE_JOIN, { fingerprint: `fp-rep-${i}` });
    offender.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-repeat-offender' });

    const matchEvt = reporter.received.find((e) => e.event === EVENTS.MATCH_FOUND);
    const roomId = matchEvt.payload.roomId;

    reporter.trigger(EVENTS.REPORT_SUBMIT, {
      roomId,
      reason: 'harassment',
      snapshot: 'data:image/jpeg;base64,abc',
      chatLog: [],
    });

    // Leave room before next round
    reporter.trigger(EVENTS.QUEUE_LEAVE);
    offender.trigger(EVENTS.QUEUE_LEAVE);
    reporter.received = [];
    offender.received = [];
  }

  // After 3 distinct reports, offender must be automatically banned in Guard (F9)!
  const banCheck = isBanned({ fingerprint: 'fp-repeat-offender', ip: '10.20.30.40' });
  assert.equal(banCheck.banned, true);

  // Verify offender is now blocked on queue:join
  offender.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-repeat-offender' });
  assert.ok(offender.received.some((e) => e.event === EVENTS.GUARD_BANNED));
});

test('F8 Moderation Flag - moderation:flag records automated AI report in SQLite', () => {
  resetGuardStateForTests();
  resetMatchingStateForTests();
  resetReportStateForTests();
  const { createSocket } = createMockEnv();

  const s1 = createSocket('user-a', '10.1.1.1');
  const s2 = createSocket('user-b', '10.2.2.2');

  s1.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-a' });
  s2.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-b' });
  const roomId = s1.received.find((e) => e.event === EVENTS.MATCH_FOUND).payload.roomId;

  s1.trigger(EVENTS.MODERATION_FLAG, { roomId, type: 'Porn' });

  const reports = getAllReports();
  assert.equal(reports.length, 1);
  assert.equal(reports[0].reason, 'ai_moderation:Porn');
  assert.equal(reports[0].reportedFingerprint, 'fp-b');
});

test('F7 Report - still records report and offender identity even if offender left or disconnected right before report:submit', () => {
  resetGuardStateForTests();
  resetMatchingStateForTests();
  resetReportStateForTests();
  const { createSocket } = createMockEnv();

  const sReporter = createSocket('reporter-late', '10.10.2.1');
  const sOffender = createSocket('offender-flee', '10.10.9.99');

  sReporter.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-reporter-late' });
  sOffender.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-offender-flee' });

  const roomId = sReporter.received.find((e) => e.event === EVENTS.MATCH_FOUND).payload.roomId;

  // Offender flees (disconnects) while reporter is filling out the report modal!
  sOffender.trigger('disconnect');

  // Reporter clicks Submit Report 1 second later
  sReporter.trigger(EVENTS.REPORT_SUBMIT, {
    roomId,
    reason: 'sexual_content',
    notes: 'Offender kabur setelah melanggar',
    snapshot: 'data:image/jpeg;base64,flee',
    chatLog: [{ sender: 'peer', text: 'pesan buruk', ts: Date.now() }],
  });

  const reports = getAllReports();
  assert.equal(reports.length, 1);
  assert.equal(reports[0].reportedFingerprint, 'fp-offender-flee');
  assert.equal(reports[0].reportedIp, '10.10.9.99');
});

test('F7 Report - setReportFlaggedForAction preserves flagged reports beyond 7-day retention purge', () => {
  resetGuardStateForTests();
  resetMatchingStateForTests();
  resetReportStateForTests();
  const { createSocket } = createMockEnv();

  const s1 = createSocket('rep-flag-1', '10.1.1.1');
  const s2 = createSocket('off-flag-1', '10.2.2.2');

  s1.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-1' });
  s2.trigger(EVENTS.QUEUE_JOIN, { fingerprint: 'fp-2' });
  const roomId = s1.received.find((e) => e.event === EVENTS.MATCH_FOUND).payload.roomId;

  s1.trigger(EVENTS.REPORT_SUBMIT, {
    roomId,
    reason: 'underage',
    snapshot: 'data:image/jpeg;base64,1',
    chatLog: [],
  });

  const initialReports = getAllReports();
  assert.equal(initialReports.length, 1);
  const reportId = initialReports[0].id;

  // Mark report as flagged_for_action
  setReportFlaggedForAction(reportId, true);

  // Purge 10 days in the future -> flagged report must NOT be deleted
  const tenDaysLater = Date.now() + 10 * 24 * 3600 * 1000;
  purgeExpiredReports(tenDaysLater);

  const remaining = getAllReports();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].flaggedForAction, true);

  // Admin can delete a report manually
  deleteReportById(reportId);
  assert.equal(getAllReports().length, 0);
});

test('F7 & F9 Admin Management - getActiveBans lists active bans and unbanById revokes a ban', () => {
  resetGuardStateForTests();
  banIdentity({
    fingerprint: 'fp-banned-admin-test',
    ip: '192.168.1.77',
    reason: 'Tes Ban Admin',
    durationHours: 12,
  });

  const bans = getActiveBans();
  assert.equal(bans.length, 1);
  assert.equal(bans[0].fingerprint, 'fp-banned-admin-test');

  unbanById(bans[0].id);
  assert.equal(getActiveBans().length, 0);
  assert.equal(isBanned({ fingerprint: 'fp-banned-admin-test', ip: '192.168.1.77' }).banned, false);
});


