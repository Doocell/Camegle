import crypto from 'node:crypto';

/**
 * Generates time-limited TURN REST API credentials (HMAC-SHA1) compatible with coturn `use-auth-secret`.
 * Never exposes the static secret to clients.
 */
export function generateTurnCredentials({
  secret = process.env.TURN_STATIC_SECRET || '',
  turnUrl = process.env.TURN_URL || '',
  stunUrl = process.env.STUN_URL || 'stun:stun.l.google.com:19302',
  ttlSec = Number(process.env.TURN_TTL_SEC || 3600),
  nowSec = Math.floor(Date.now() / 1000),
  clientTag = 'nomad',
} = {}) {
  const iceServers = [{ urls: stunUrl }];

  if (!secret || !turnUrl) {
    return {
      ttl: ttlSec,
      username: null,
      credential: null,
      iceServers,
    };
  }

  const expiresAt = nowSec + ttlSec;
  const username = `${expiresAt}:${clientTag}`;
  const credential = crypto.createHmac('sha1', secret).update(username).digest('base64');

  iceServers.push({
    urls: turnUrl,
    username,
    credential,
  });

  return {
    ttl: ttlSec,
    username,
    credential,
    iceServers,
  };
}
