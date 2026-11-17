import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../../lib/socket.js';
import { EVENTS } from '../../lib/events.js';
import { getDeviceFingerprint } from '../../lib/fingerprint.js';

/**
 * Hook F3 + F9: useMatching()
 * Mengelola state: 'idle' | 'waiting' | 'matched' | 'banned'
 * Mengambil fingerprint perangkat sekali per sesi dan mengirimkannya saat queue:join & match:next.
 */
export function useMatching() {
  const [status, setStatus] = useState('idle'); // 'idle' | 'waiting' | 'matched' | 'banned'
  const [roomId, setRoomId] = useState(null);
  const [isInitiator, setIsInitiator] = useState(false);
  const [peerLeft, setPeerLeft] = useState(false);
  const [banInfo, setBanInfo] = useState(null); // { reason, expiresAt }
  const [rateLimitNotice, setRateLimitNotice] = useState(null);
  const fingerprintRef = useRef(null);

  useEffect(() => {
    getDeviceFingerprint().then((fp) => {
      fingerprintRef.current = fp;
    });
  }, []);

  useEffect(() => {
    function onQueueWaiting() {
      setStatus('waiting');
      setRoomId(null);
      setIsInitiator(false);
    }

    function onMatchFound(payload) {
      setStatus('matched');
      setRoomId(payload?.roomId || null);
      setIsInitiator(Boolean(payload?.isInitiator));
      setPeerLeft(false);
    }

    function onPeerLeft() {
      setPeerLeft(true);
    }

    function onGuardBanned(payload) {
      setBanInfo({
        reason: payload?.reason || 'Akses Anda dibatasi karena pelanggaran aturan komunitas.',
        expiresAt: payload?.expiresAt || null,
      });
      setRoomId(null);
      setIsInitiator(false);
      setStatus('banned');
    }

    function onGuardRateLimited(payload) {
      const waitSec = Math.ceil((payload?.retryAfterMs || 5000) / 1000);
      setRateLimitNotice(`Terlalu cepat menekan Lanjut! Tunggu ${waitSec} detik.`);
      setTimeout(() => {
        setRateLimitNotice(null);
      }, 4000);
    }

    socket.on(EVENTS.QUEUE_WAITING, onQueueWaiting);
    socket.on(EVENTS.MATCH_FOUND, onMatchFound);
    socket.on(EVENTS.MATCH_PEER_LEFT, onPeerLeft);
    socket.on(EVENTS.GUARD_BANNED, onGuardBanned);
    socket.on(EVENTS.GUARD_RATE_LIMITED, onGuardRateLimited);

    return () => {
      socket.off(EVENTS.QUEUE_WAITING, onQueueWaiting);
      socket.off(EVENTS.MATCH_FOUND, onMatchFound);
      socket.off(EVENTS.MATCH_PEER_LEFT, onPeerLeft);
      socket.off(EVENTS.GUARD_BANNED, onGuardBanned);
      socket.off(EVENTS.GUARD_RATE_LIMITED, onGuardRateLimited);
    };
  }, []);

  const start = useCallback(async () => {
    const fp = fingerprintRef.current || (await getDeviceFingerprint());
    fingerprintRef.current = fp;
    setPeerLeft(false);
    setStatus('waiting');
    socket.emit(EVENTS.QUEUE_JOIN, { fingerprint: fp });
  }, []);

  const next = useCallback(async () => {
    const fp = fingerprintRef.current || (await getDeviceFingerprint());
    fingerprintRef.current = fp;
    setPeerLeft(false);
    setRoomId(null);
    setIsInitiator(false);
    setStatus('waiting');
    socket.emit(EVENTS.MATCH_NEXT, { fingerprint: fp });
  }, []);

  const stop = useCallback(() => {
    socket.emit(EVENTS.QUEUE_LEAVE);
    setStatus('idle');
    setRoomId(null);
    setIsInitiator(false);
    setPeerLeft(false);
  }, []);

  return {
    status,
    roomId,
    isInitiator,
    peerLeft,
    banInfo,
    rateLimitNotice,
    fingerprint: fingerprintRef.current,
    start,
    next,
    stop,
  };
}

export default useMatching;
