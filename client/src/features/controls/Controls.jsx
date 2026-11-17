import React, { useState, useEffect, useCallback } from 'react';

/**
 * Komponen F5: Controls
 * Tombol: Next (LANJUT), Stop (Akhiri), Mute mic, Matikan kamera, dan tombol Report.
 * Mute/kamera dilakukan langsung melalui track.enabled tanpa membuat ulang stream.
 */
export default function Controls({
  localStream,
  onNext,
  onStop,
  onOpenReport,
}) {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  // Sinkronkan state awal dengan track yang ada di localStream
  useEffect(() => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    const videoTrack = localStream.getVideoTracks()[0];
    if (audioTrack) setIsMicOn(audioTrack.enabled);
    if (videoTrack) setIsCamOn(videoTrack.enabled);
  }, [localStream]);

  const toggleMic = useCallback(() => {
    if (!localStream) return;
    const nextState = !isMicOn;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = nextState;
    });
    setIsMicOn(nextState);
  }, [localStream, isMicOn]);

  const toggleCam = useCallback(() => {
    if (!localStream) return;
    const nextState = !isCamOn;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = nextState;
    });
    setIsCamOn(nextState);
  }, [localStream, isCamOn]);

  // Pintasan keyboard (Space = Next, M = Mute, V = Kamera, Esc = Stop)
  // Diabaikan jika sedang mengetik di input/textarea atau jika modal dialog sedang terbuka
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (document.querySelector('[role="dialog"]')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (onNext) onNext();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMic();
      } else if (e.key === 'v' || e.key === 'V') {
        toggleCam();
      } else if (e.key === 'Escape') {
        if (onStop) onStop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onStop, toggleMic, toggleCam]);

  return (
    <div className="bg-[#2A1E18]/90 backdrop-blur-xl px-5 py-3.5 rounded-full shadow-[0_16px_40px_rgba(0,0,0,0.5)] flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
      {/* Mute Audio Button */}
      <button
        type="button"
        onClick={toggleMic}
        title={isMicOn ? 'Bisukan Mikrofon (M)' : 'Nyalakan Mikrofon (M)'}
        className={`group relative w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer ${
          isMicOn
            ? 'bg-[#3E2C23] hover:bg-[#523A2F] text-[#fff8f6]'
            : 'bg-error text-white'
        }`}
      >
        <span className="material-symbols-outlined text-[22px]">
          {isMicOn ? 'mic' : 'mic_off'}
        </span>
      </button>

      {/* Video Toggle Button */}
      <button
        type="button"
        onClick={toggleCam}
        title={isCamOn ? 'Matikan Kamera (V)' : 'Nyalakan Kamera (V)'}
        className={`group relative w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer ${
          isCamOn
            ? 'bg-[#3E2C23] hover:bg-[#523A2F] text-[#fff8f6]'
            : 'bg-error text-white'
        }`}
      >
        <span className="material-symbols-outlined text-[22px]">
          {isCamOn ? 'videocam' : 'videocam_off'}
        </span>
      </button>

      {/* Report Suspicious Partner Button */}
      {onOpenReport && (
        <button
          type="button"
          onClick={onOpenReport}
          title="Laporkan Pengguna"
          className="w-12 h-12 rounded-full bg-[#3E2C23] hover:bg-tertiary text-tertiary-fixed-dim hover:text-white flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">flag</span>
        </button>
      )}

      <div className="h-7 w-[1px] bg-outline-variant/20 mx-1 hidden sm:block" />

      {/* Stop / End Call Button */}
      <button
        type="button"
        onClick={onStop}
        title="Berhenti & Kembali ke Beranda (ESC)"
        className="w-12 h-12 rounded-full bg-error hover:bg-red-700 text-on-error flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer"
      >
        <span
          className="material-symbols-outlined text-[22px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          call_end
        </span>
      </button>

      {/* Prominent Wide Amber Gradient 'LANJUT' (Next Match Button) */}
      <button
        type="button"
        onClick={onNext}
        className="group relative flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-primary-container via-amber-500 to-tertiary text-[#28180f] font-label-lg text-label-lg font-bold shadow-[0_8px_24px_rgba(245,158,11,0.35)] hover:shadow-[0_12px_28px_rgba(245,158,11,0.5)] active:scale-[0.98] transition-all cursor-pointer"
      >
        <span className="material-symbols-outlined text-[22px] text-[#28180f] group-hover:translate-x-1 transition-transform">
          skip_next
        </span>
        <span>LANJUT (SPASI)</span>
        <span className="w-6 h-6 rounded-full bg-[#28180f]/15 flex items-center justify-center text-[13px]">
          ➔
        </span>
      </button>
    </div>
  );
}
