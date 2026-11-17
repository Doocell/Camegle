import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { generateTurnCredentials } from './turn.js';

test('F10 TURN Credentials - generates time-limited HMAC-SHA1 credentials for coturn', () => {
  const secret = 'super-secret-coturn-key';
  const turnUrl = 'turn:turn.camelgle.com:3478';
  const nowSec = 1700000000;
  const ttlSec = 3600;

  const result = generateTurnCredentials({
    secret,
    turnUrl,
    ttlSec,
    nowSec,
    clientTag: 'nomad',
  });

  assert.equal(result.ttl, 3600);
  assert.equal(result.username, '1700003600:nomad');
  const expectedHmac = crypto
    .createHmac('sha1', secret)
    .update('1700003600:nomad')
    .digest('base64');
  assert.equal(result.credential, expectedHmac);
  assert.deepEqual(result.iceServers, [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:turn.camelgle.com:3478',
      username: '1700003600:nomad',
      credential: expectedHmac,
    },
  ]);
});

test('F10 TURN Credentials - falls back to STUN only when TURN_STATIC_SECRET or TURN_URL is not configured', () => {
  const result = generateTurnCredentials({
    secret: '',
    turnUrl: '',
  });

  assert.equal(result.iceServers.length, 1);
  assert.equal(result.iceServers[0].urls, 'stun:stun.l.google.com:19302');
});
