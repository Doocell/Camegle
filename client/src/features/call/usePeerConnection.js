import { useEffect, useState, useRef } from 'react';
import socket from '../../lib/socket.js';
import { EVENTS } from '../../lib/events.js';
import { ICE_SERVERS } from '../../lib/constants.js';

/**
 * Hook F4: usePeerConnection({ roomId, isInitiator, localStream, onFail })
 * Mengelola siklus penuh RTCPeerConnection antar 2 browser.
 * Output: { remoteStream, connectionState } ('connecting' | 'connected' | 'failed' | 'closed')
 */
export function usePeerConnection({ roomId, isInitiator, localStream, onFail }) {
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState('connecting');
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;

  useEffect(() => {
    if (!roomId || !localStream) {
      setRemoteStream(null);
      setConnectionState('closed');
      return;
    }

    let isCleanedUp = false;
    let failTimer = null;
    const pendingCandidates = [];

    setConnectionState('connecting');
    setRemoteStream(null);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const incomingStream = new MediaStream();

    // Pasang seluruh track lokal (video + audio) ke PeerConnection dengan bitrate HD (720p/1080p)
    localStream.getTracks().forEach((track) => {
      const sender = pc.addTrack(track, localStream);
      if (track.kind === 'video' && typeof sender?.getParameters === 'function') {
        try {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = 2500000; // 2.5 Mbps untuk kualitas 720p/1080p tajam
          sender.setParameters(params).catch(() => {});
        } catch {
          // Abaikan jika browser tidak mendukung setParameters
        }
      }
    });

    // Terima track dari lawan bicara
    pc.ontrack = (event) => {
      if (isCleanedUp) return;
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else if (event.track) {
        incomingStream.addTrack(event.track);
        setRemoteStream(new MediaStream(incomingStream.getTracks()));
      }
    };

    // Kirim ICE candidate ke pasangan lewat signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate && !isCleanedUp) {
        socket.emit(EVENTS.SIGNAL_ICE, {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    const startFailWatchdog = () => {
      if (failTimer) clearTimeout(failTimer);
      failTimer = setTimeout(() => {
        if (!isCleanedUp && pc.connectionState !== 'connected' && pc.iceConnectionState !== 'connected') {
          setConnectionState('failed');
          if (onFailRef.current) onFailRef.current();
        }
      }, 10000);
    };

    startFailWatchdog();

    const updateState = () => {
      if (isCleanedUp) return;
      const state = pc.connectionState || pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        if (failTimer) clearTimeout(failTimer);
        setConnectionState('connected');
      } else if (state === 'failed') {
        setConnectionState('failed');
        startFailWatchdog();
      } else if (state === 'disconnected' || state === 'connecting' || state === 'checking') {
        setConnectionState('connecting');
        startFailWatchdog();
      } else if (state === 'closed') {
        setConnectionState('closed');
      }
    };

    pc.onconnectionstatechange = updateState;
    pc.oniceconnectionstatechange = updateState;

    async function flushPendingCandidates() {
      while (pendingCandidates.length > 0) {
        const cand = pendingCandidates.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (err) {
          // Abaikan kandidat yang sudah usang
        }
      }
    }

    async function onSignalOffer(payload) {
      if (isCleanedUp || payload?.roomId !== roomId || !payload?.sdp) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await flushPendingCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit(EVENTS.SIGNAL_ANSWER, {
          roomId,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.error('[WebRTC] Failed handling offer:', err);
      }
    }

    async function onSignalAnswer(payload) {
      if (isCleanedUp || payload?.roomId !== roomId || !payload?.sdp) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await flushPendingCandidates();
      } catch (err) {
        console.error('[WebRTC] Failed handling answer:', err);
      }
    }

    async function onSignalIce(payload) {
      if (isCleanedUp || payload?.roomId !== roomId || !payload?.candidate) return;
      if (pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          // Abaikan
        }
      } else {
        pendingCandidates.push(payload.candidate);
      }
    }

    socket.on(EVENTS.SIGNAL_OFFER, onSignalOffer);
    socket.on(EVENTS.SIGNAL_ANSWER, onSignalAnswer);
    socket.on(EVENTS.SIGNAL_ICE, onSignalIce);

    // Jika peran sebagai Initiator, buat Offer pertama kali
    if (isInitiator) {
      (async () => {
        try {
          const offer = await pc.createOffer();
          if (isCleanedUp) return;
          await pc.setLocalDescription(offer);
          socket.emit(EVENTS.SIGNAL_OFFER, {
            roomId,
            sdp: pc.localDescription,
          });
        } catch (err) {
          console.error('[WebRTC] Failed creating offer:', err);
        }
      })();
    }

    // Cleanup penuh saat room berakhir atau berganti (mencegah memory leak saat klik Next berulang)
    return () => {
      isCleanedUp = true;
      if (failTimer) clearTimeout(failTimer);
      socket.off(EVENTS.SIGNAL_OFFER, onSignalOffer);
      socket.off(EVENTS.SIGNAL_ANSWER, onSignalAnswer);
      socket.off(EVENTS.SIGNAL_ICE, onSignalIce);

      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.oniceconnectionstatechange = null;
      try {
        pc.close();
      } catch (e) {
        // Abaikan
      }
    };
  }, [roomId, isInitiator, localStream]);

  return {
    remoteStream,
    connectionState,
  };
}

export default usePeerConnection;
