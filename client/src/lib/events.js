/**
 * Salinan Kontrak Event Socket (Client)
 * Harus selalu identik dengan /server/shared/events.js (PRD Bagian 6).
 */

export const EVENTS = {
  // Client -> Server
  QUEUE_JOIN: 'queue:join',
  QUEUE_LEAVE: 'queue:leave',
  MATCH_NEXT: 'match:next',
  SIGNAL_OFFER: 'signal:offer',
  SIGNAL_ANSWER: 'signal:answer',
  SIGNAL_ICE: 'signal:ice',
  CHAT_SEND: 'chat:send',
  REPORT_SUBMIT: 'report:submit',
  MODERATION_FLAG: 'moderation:flag',

  // Server -> Client
  QUEUE_WAITING: 'queue:waiting',
  MATCH_FOUND: 'match:found',
  MATCH_PEER_LEFT: 'match:peer-left',
  CHAT_RECEIVE: 'chat:receive',
  GUARD_BANNED: 'guard:banned',
  GUARD_RATE_LIMITED: 'guard:rate-limited',
  STATS_ONLINE: 'stats:online',
};

export default EVENTS;
