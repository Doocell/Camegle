import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../lib/socket.js';
import { EVENTS } from '../lib/events.js';
import { hasAgeConsent } from '../features/age-gate/index.js';
import { useLocalStream, MediaPreview } from '../features/media-preview/index.js';
import { useMatching, SearchingView } from '../features/matching/index.js';
import { usePeerConnection, VideoCall } from '../features/call/index.js';
import { Controls } from '../features/controls/index.js';
import { useChatLog, Chat } from '../features/chat/index.js';
import { ReportModal } from '../features/report/index.js';
import { GuardScreen } from '../features/guard-screen/index.js';
import { useNsfwGuard } from '../features/moderation/index.js';

export default function Room() {
  const navigate = useNavigate();
  const remoteVideoRef = useRef(null);
  const { stream, error, errorType, isLoading, retry } = useLocalStream();
  const {
    status,
    roomId,
    isInitiator,
    peerLeft,
    banInfo,
    rateLimitNotice,
    fingerprint,
    start,
    next,
    stop,
  } = useMatching();
  const { messages, chatLog, sendMessage } = useChatLog(
    status === 'matched' && !peerLeft ? roomId : null
  );

  const [onlineCount, setOnlineCount] = useState(1);
  const [isSandCurtain, setIsSandCurtain] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // F8 — Nudity Detection & Initial 2s Blur via useNsfwGuard(remoteVideoRef)
  const { isBlurred, moderationNotice, dismissNotice } = useNsfwGuard(remoteVideoRef, {
    roomId,
    isActive: status === 'matched' && !peerLeft,
    onViolation: () => {
      next();
    },
  });

  // Proteksi rute: jika belum verifikasi 18+, kembalikan ke Landing (/)
  useEffect(() => {
    if (!hasAgeConsent()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    function onStatsOnline(data) {
      if (data && typeof data.count === 'number') {
        setOnlineCount(data.count);
      }
    }
    socket.on(EVENTS.STATS_ONLINE, onStatsOnline);
    return () => {
      socket.off(EVENTS.STATS_ONLINE, onStatsOnline);
    };
  }, []);

  // Cleanup saat keluar dari halaman /room
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const handleConnectionFail = useCallback(() => {
    setConnectionFailed(true);
  }, []);

  const { remoteStream, connectionState } = usePeerConnection({
    roomId: status === 'matched' && !peerLeft ? roomId : null,
    isInitiator,
    localStream: stream,
    onFail: handleConnectionFail,
  });

  // Reset flag saat roomId baru dimulai
  useEffect(() => {
    if (status === 'matched' && roomId) {
      setConnectionFailed(false);
      setShowReportModal(false);
    }
  }, [status, roomId]);

  // F5 Requirement: Auto-skip 2 detik saat lawan keluar (peer-left) atau koneksi gagal
  // Tunda auto-skip jika pengguna sedang membuka modal Report (showReportModal === true)
  useEffect(() => {
    if (status !== 'matched') return;
    if (!peerLeft && !connectionFailed) return;
    if (showReportModal) return;

    const timer = setTimeout(() => {
      setConnectionFailed(false);
      next();
    }, 2000);

    return () => clearTimeout(timer);
  }, [status, peerLeft, connectionFailed, showReportModal, next]);

  const handleStopAndExit = useCallback(() => {
    stop();
    navigate('/');
  }, [stop, navigate]);

  // 0. State 'banned' -> Tampilkan Layar Akses Dibatasi (F9 Guard Screen)
  if (status === 'banned') {
    return (
      <GuardScreen
        reason={banInfo?.reason}
        expiresAt={banInfo?.expiresAt}
        fingerprint={fingerprint}
      />
    );
  }

  // 1. State 'idle' -> Tampilkan Preview Kamera & Cek Perangkat (F2)
  if (status === 'idle') {
    return (
      <MediaPreview
        stream={stream}
        error={error}
        errorType={errorType}
        isLoading={isLoading}
        onRetry={retry}
        onStart={() => start()}
      />
    );
  }

  // 2. State 'waiting' -> Tampilkan Layar Mencari Teman Perjalanan Stitch (F3)
  if (status === 'waiting') {
    return (
      <div className="relative">
        {moderationNotice && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[92%] bg-[#4f261b]/95 border border-[#ffb4ab]/30 text-[#ffdad6] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#ffb4ab]">shield_lock</span>
              <span className="font-body-sm text-body-sm">{moderationNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={dismissNotice}
              className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}
        <SearchingView
          localStream={stream}
          peerLeft={peerLeft}
          onCancel={() => stop()}
        />
      </div>
    );
  }

  // Hitung teks indikator status (F5 + F9 Rate Limit Notice + F8 AI Moderation)
  let statusBannerText = null;
  if (moderationNotice) {
    statusBannerText = moderationNotice.message;
  } else if (rateLimitNotice) {
    statusBannerText = rateLimitNotice;
  } else if (peerLeft) {
    statusBannerText = 'Lawan keluar • Mencari teman baru...';
  } else if (connectionFailed || connectionState === 'failed') {
    statusBannerText = 'Koneksi gagal • Mencari teman baru...';
  } else if (connectionState === 'connecting') {
    statusBannerText = 'Menghubungkan...';
  }

  // 3. State 'matched' -> Tampilan Obrolan Video Langsung (In-Call Stitch Design: F4 + F5 + F6 + F7 + F8)
  return (
    <div className="w-full bg-[#1E1410] text-[#ffede5] min-h-screen p-6 lg:p-8 flex flex-col justify-between font-body-md select-none">
      {/* Top Global Meta Bar */}
      <header className="flex items-center justify-between pb-5 px-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-headline-md text-headline-md shadow-md">
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              explore
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-[#fff8f6] tracking-tight flex items-center gap-2">
              camelgle{' '}
              <span className="text-label-sm font-label-sm px-2 py-0.5 rounded-full bg-surface-variant/20 text-primary-fixed-dim uppercase tracking-wider">
                Nomad Live
              </span>
            </span>
            <span className="font-label-sm text-label-sm text-[#d8c3ad]/70">
              Lembah Pasir Virtual • Pertemuan Acak Hangat
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2A1E18] text-[#fbdcce]">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary-fixed animate-ping" />
            <span className="font-label-md text-label-md text-secondary-fixed">
              {onlineCount} Musafir Online
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsSandCurtain((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              isSandCurtain
                ? 'bg-primary-container text-[#28180f] font-bold'
                : 'bg-[#2A1E18] hover:bg-[#38261e] text-[#d8c3ad]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">blur_on</span>
            <span className="font-label-sm text-label-sm">Tirai Pasir</span>
          </button>
        </div>
      </header>

      {/* Main Live In-Call Workplace (Left ~70% VideoCall + Controls, Right ~30% Chat) */}
      <div className="grid grid-cols-12 gap-6 flex-1 items-stretch">
        <VideoCall
          localStream={stream}
          remoteStream={remoteStream}
          connectionState={connectionState}
          statusBannerText={statusBannerText}
          isInitialBlur={isBlurred}
          isSandCurtain={isSandCurtain}
          remoteVideoRef={remoteVideoRef}
          controlsSlot={
            <Controls
              localStream={stream}
              onNext={() => next()}
              onStop={handleStopAndExit}
              onOpenReport={() => setShowReportModal(true)}
            />
          }
        />

        {/* RIGHT SECTION (~30% Width, col-span-4): Fitur Chat (F6) */}
        <Chat
          messages={messages}
          onSendMessage={sendMessage}
          disabled={peerLeft}
        />
      </div>

      {/* Modal Laporkan Pengguna (F7) */}
      <ReportModal
        isOpen={showReportModal}
        roomId={roomId}
        remoteVideoRef={remoteVideoRef}
        chatLog={chatLog}
        onClose={() => setShowReportModal(false)}
        onSubmitted={() => {
          setShowReportModal(false);
          next();
        }}
      />

      {/* Bottom Keyboard Shortcut Guide Bar */}
      <footer className="mt-4 pt-3 flex flex-wrap items-center justify-between text-[#867461] font-label-sm text-label-sm px-2 gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded bg-[#2A1E18] text-[#ffddb8] font-bold">SPASI</kbd>{' '}
            Lewati & Cari Baru
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded bg-[#2A1E18] text-[#ffddb8] font-bold">M</kbd>{' '}
            Bisukan Suara
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded bg-[#2A1E18] text-[#ffddb8] font-bold">V</kbd>{' '}
            Matikan Kamera
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded bg-[#2A1E18] text-[#ffddb8] font-bold">ESC</kbd>{' '}
            Akhiri Panggilan
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>Enkripsi WebRTC DTLS-SRTP Aktif</span>
        </div>
      </footer>
    </div>
  );
}
