import React, { useEffect, useRef, useState } from 'react';
import socket from '../../lib/socket.js';
import { EVENTS } from '../../lib/events.js';

/**
 * Komponen F3: SearchingView
 * Menggunakan desain asli Stitch "camelgle - Mencari Teman Perjalanan (Desktop)".
 */
export default function SearchingView({ localStream, peerLeft, onCancel }) {
  const pipVideoRef = useRef(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  useEffect(() => {
    if (pipVideoRef.current && localStream) {
      pipVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

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

  // Pintasan keyboard [Esc] untuk membatalkan pencarian
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const toggleMic = () => {
    if (!localStream) return;
    const nextState = !isMicOn;
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = nextState;
    });
    setIsMicOn(nextState);
  };

  const toggleCam = () => {
    if (!localStream) return;
    const nextState = !isCamOn;
    localStream.getVideoTracks().forEach((t) => {
      t.enabled = nextState;
    });
    setIsCamOn(nextState);
  };

  return (
    <div className="flex flex-col justify-between w-full relative min-h-screen bg-inverse-surface text-inverse-on-surface overflow-hidden select-none">
      {/* Glowing Desert Ambient Orbs */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[720px] bg-primary-container/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[480px] h-[480px] bg-tertiary-container/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -left-32 w-[420px] h-[420px] bg-secondary/15 rounded-full blur-[130px] pointer-events-none" />

      {/* Header & Live Wayfarer Status */}
      <header className="w-full max-w-7xl mx-auto px-space-xl pt-space-lg flex items-center justify-between z-20">
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-lowest/10 backdrop-blur-md shadow-sm">
            <span
              className="material-symbols-outlined text-primary-fixed-dim text-headline-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              explore
            </span>
            <span className="font-label-md text-label-md text-primary-fixed font-bold">
              camelgle
            </span>
          </div>
          {peerLeft && (
            <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-primary-container/20 text-primary-fixed font-label-sm">
              <span className="material-symbols-outlined text-[16px]">info</span>
              <span>Teman sebelumnya telah meninggalkan obrolan. Mencari teman baru...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-space-lg">
          <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-lowest/5 backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-fixed-dim opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary-fixed" />
            </span>
            <span className="font-label-md text-label-md text-secondary-fixed font-semibold">
              {onlineCount} musafir aktif
            </span>
          </div>
        </div>
      </header>

      {/* Center Stage: Searching Radar & Mascot Animation (Exact Stitch SVG) */}
      <div className="flex-1 w-full max-w-5xl mx-auto flex flex-col items-center justify-center relative px-space-xl py-space-md z-10 text-center my-auto">
        <div className="relative w-[320px] h-[320px] flex items-center justify-center mb-space-md">
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary-container/20 to-tertiary/10 animate-ping opacity-25"
            style={{ animationDuration: '3s' }}
          />
          <div className="absolute -inset-4 rounded-full bg-primary-container/10 blur-xl animate-pulse" />

          <div className="absolute inset-0 rounded-full overflow-hidden bg-surface-container-lowest/5 shadow-2xl backdrop-blur-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-inverse-surface/60 to-inverse-surface" />
          </div>

          {/* Animated SVG Mascot: Camel Walking on Warm Sand Dune */}
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center overflow-hidden rounded-full">
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 340 340"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="animate-bounce"
                cx="90"
                cy="180"
                fill="#f59e0b"
                opacity="0.6"
                r="2.5"
                style={{ animationDuration: '2.2s', animationDelay: '0.1s' }}
              />
              <circle
                className="animate-bounce"
                cx="130"
                cy="160"
                fill="#ffb95f"
                opacity="0.7"
                r="1.5"
                style={{ animationDuration: '1.8s', animationDelay: '0.5s' }}
              />
              <circle
                className="animate-bounce"
                cx="210"
                cy="190"
                fill="#ff956b"
                opacity="0.5"
                r="2"
                style={{ animationDuration: '2.6s', animationDelay: '0.3s' }}
              />
              <circle
                className="animate-bounce"
                cx="250"
                cy="170"
                fill="#f59e0b"
                opacity="0.4"
                r="3"
                style={{ animationDuration: '2s', animationDelay: '0.8s' }}
              />
            </svg>

            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg
                className="w-full h-full drop-shadow-[0_10px_20px_rgba(245,158,11,0.35)]"
                viewBox="0 0 200 200"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="duneGlow" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#ff956b" stopOpacity="0.2" />
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#ffb95f" stopOpacity="0.2" />
                  </linearGradient>
                  <linearGradient id="camelBody" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffb95f" />
                    <stop offset="100%" stopColor="#855300" />
                  </linearGradient>
                  <linearGradient id="saddleCloth" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#006c49" />
                    <stop offset="100%" stopColor="#6cf8bb" />
                  </linearGradient>
                </defs>
                <path
                  d="M 10 160 Q 100 135 190 160"
                  fill="none"
                  stroke="url(#duneGlow)"
                  strokeLinecap="round"
                  strokeWidth="4"
                />
                <path
                  d="M 25 168 Q 100 150 175 168"
                  fill="none"
                  stroke="#f59e0b"
                  strokeLinecap="round"
                  strokeOpacity="0.25"
                  strokeWidth="2"
                />
                <g className="animate-bounce" style={{ animationDuration: '1.4s' }}>
                  <path
                    d="M 75 125 L 70 152 L 64 154"
                    stroke="#653e00"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="5"
                  />
                  <path
                    d="M 115 125 L 120 152 L 126 154"
                    stroke="#653e00"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="5"
                  />
                  <path
                    d="M 58 108 Q 50 115 54 125"
                    fill="none"
                    stroke="#855300"
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  />
                  <circle cx="54" cy="126" fill="#653e00" r="3" />
                  <path
                    d="M 62 110 C 60 90, 85 70, 95 90 C 105 75, 125 80, 130 102 C 135 118, 120 128, 90 128 C 70 128, 62 120, 62 110 Z"
                    fill="url(#camelBody)"
                  />
                  <path
                    d="M 85 96 C 85 96, 98 94, 108 96 L 105 116 Q 96 120 87 116 Z"
                    fill="url(#saddleCloth)"
                  />
                  <path
                    d="M 124 108 C 130 95, 134 80, 136 68 C 138 60, 146 58, 154 60 C 160 62, 162 70, 155 76 C 148 82, 142 100, 134 116"
                    fill="url(#camelBody)"
                  />
                  <ellipse cx="156" cy="65" fill="#ffddb8" rx="10" ry="7" />
                  <path
                    d="M 154 68 Q 159 71 163 67"
                    fill="none"
                    stroke="#28180f"
                    strokeLinecap="round"
                    strokeWidth="2"
                  />
                  <path
                    d="M 148 61 Q 151 57 154 61"
                    fill="none"
                    stroke="#28180f"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  />
                  <circle cx="150" cy="66" fill="#ff956b" r="2.5" />
                  <ellipse
                    cx="139"
                    cy="56"
                    fill="#855300"
                    rx="3.5"
                    ry="6"
                    transform="rotate(-20 139 56)"
                  />
                  <path
                    d="M 88 126 L 94 154 L 100 156"
                    stroke="#855300"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="5"
                  />
                  <path
                    d="M 128 124 L 124 154 L 118 156"
                    stroke="#855300"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="5"
                  />
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* Prominent Dynamic Searching Typography */}
        <div className="space-y-space-xs max-w-xl mx-auto">
          <h1 className="font-headline-xl text-headline-xl text-surface-bright tracking-tight font-extrabold flex items-center justify-center gap-space-xs">
            <span>Mencari teman perjalanan</span>
            <span className="inline-flex gap-1 items-baseline ml-1">
              <span
                className="w-2 h-2 rounded-full bg-primary-container animate-bounce"
                style={{ animationDelay: '0.1s' }}
              />
              <span
                className="w-2 h-2 rounded-full bg-primary-container animate-bounce"
                style={{ animationDelay: '0.25s' }}
              />
              <span
                className="w-2 h-2 rounded-full bg-primary-container animate-bounce"
                style={{ animationDelay: '0.4s' }}
              />
            </span>
          </h1>
          <p className="font-body-lg text-body-lg text-outline-variant max-w-md mx-auto leading-relaxed pt-space-xs">
            Menghubungkan Anda dengan pengguna acak di seluruh Nusantara secara aman, hangat, dan anonim.
          </p>
        </div>

        {/* Progress Indicator & Security Latency Meta */}
        <div className="mt-space-lg flex flex-col items-center gap-space-sm">
          <div className="w-64 h-1.5 bg-surface-container-highest/15 rounded-full overflow-hidden p-0.5 relative">
            <div className="h-full bg-gradient-to-r from-primary-container via-tertiary-container to-secondary-fixed rounded-full w-2/3 animate-pulse" />
          </div>
          <div className="flex items-center gap-space-md text-surface-variant font-label-md text-label-md">
            <div className="flex items-center gap-space-xs text-primary-fixed-dim">
              <span className="material-symbols-outlined text-headline-sm">hourglass_top</span>
              <span>Menunggu musafir lain bergabung...</span>
            </div>
            <span className="text-outline-variant/60">•</span>
            <div className="flex items-center gap-space-xs text-secondary-fixed">
              <span
                className="material-symbols-outlined text-headline-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              <span>Enkripsi P2P Terlindungi</span>
            </div>
          </div>
        </div>

        {/* Primary Interaction: Batal Perjalanan Button */}
        <div className="mt-space-xl flex flex-col items-center gap-space-sm z-20">
          <button
            type="button"
            onClick={onCancel}
            className="group relative px-space-2xl py-space-md rounded-full bg-surface-container-highest/10 hover:bg-surface-container-highest/20 text-surface-bright font-label-lg text-label-lg transition-all duration-300 transform active:scale-95 shadow-lg hover:shadow-primary-container/20 flex items-center gap-space-md cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-error-container/20 text-error flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-headline-sm">close</span>
            </div>
            <span className="tracking-wide">Batal Perjalanan</span>
          </button>
          <span className="font-body-sm text-body-sm text-outline-variant/80 flex items-center gap-1.5">
            Tekan{' '}
            <kbd className="px-2 py-0.5 rounded bg-surface-container-lowest/10 font-mono text-label-sm text-surface-variant shadow-inner">
              [Esc]
            </kbd>{' '}
            untuk membatalkan
          </span>
        </div>
      </div>

      {/* Bottom Navigation Deck & Bottom Right PIP User Camera Preview */}
      <footer className="w-full max-w-7xl mx-auto px-space-xl pb-space-lg flex items-end justify-between z-20">
        <div className="hidden lg:flex items-center gap-space-md p-space-md rounded-xl bg-surface-container-lowest/5 backdrop-blur-md max-w-sm">
          <div className="p-space-xs rounded-full bg-primary-container/15 text-primary-fixed-dim">
            <span className="material-symbols-outlined text-headline-sm">lightbulb</span>
          </div>
          <p className="font-body-sm text-body-sm text-outline-variant leading-snug">
            Tips: Buka tab kedua di browser Anda dan klik Cari Teman untuk menguji perjodohan otomatis F3!
          </p>
        </div>

        {/* Bottom Right User PIP Camera Stream */}
        <div className="relative group ml-auto">
          <div className="w-64 h-44 rounded-lg overflow-hidden relative shadow-2xl bg-surface-container-lowest/10 backdrop-blur-xl border border-primary-container/55">
            <video
              ref={pipVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                transform: 'scaleX(-1)',
                filter: isCamOn ? 'none' : 'brightness(0.08) blur(8px)',
              }}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-space-xs left-space-xs z-30 flex items-center gap-space-xs bg-inverse-surface/80 backdrop-blur-md px-2 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-secondary-fixed" />
              <span className="font-label-sm text-label-sm text-surface-bright">Kamera Anda</span>
            </div>
            <div className="absolute bottom-space-xs right-space-xs z-30 flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMic}
                title="Mute Mikrofon"
                className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                  isMicOn
                    ? 'bg-surface-container-lowest/20 hover:bg-surface-container-lowest/40 text-surface-bright'
                    : 'bg-error text-white'
                }`}
              >
                <span className="material-symbols-outlined text-label-md">
                  {isMicOn ? 'mic' : 'mic_off'}
                </span>
              </button>
              <button
                type="button"
                onClick={toggleCam}
                title="Matikan Kamera"
                className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                  isCamOn
                    ? 'bg-surface-container-lowest/20 hover:bg-surface-container-lowest/40 text-surface-bright'
                    : 'bg-error text-white'
                }`}
              >
                <span className="material-symbols-outlined text-label-md">
                  {isCamOn ? 'videocam' : 'videocam_off'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
