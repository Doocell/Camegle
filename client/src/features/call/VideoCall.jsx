import React, { useEffect, useRef, useState } from 'react';

/**
 * Komponen F4: VideoCall
 * Menampilkan video lawan bicara besar (full) dan video diri kecil di pojok kanan bawah (PiP),
 * menggunakan desain asli Stitch "camelgle - Obrolan Video Langsung (In-Call Desktop)".
 */
export default function VideoCall({
  localStream,
  remoteStream,
  connectionState,
  statusBannerText,
  isInitialBlur = false,
  isSandCurtain = false,
  remoteVideoRef: externalRemoteVideoRef,
  controlsSlot,
}) {
  const internalRemoteRef = useRef(null);
  const remoteVideoRef = externalRemoteVideoRef || internalRemoteRef;
  const localVideoRef = useRef(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLocalMirrored, setIsLocalMirrored] = useState(true);

  // Pasang remoteStream ke elemen <video> utama
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef]);

  // Pasang localStream ke elemen <video> PiP
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Timer durasi panggilan saat sudah connected
  useEffect(() => {
    setElapsedSeconds(0);
    if (connectionState !== 'connected') return;

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [connectionState]);

  const formatDuration = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const shouldBlurRemote = isInitialBlur || isSandCurtain;

  return (
    <section className="col-span-12 lg:col-span-8 xl:col-span-8 flex flex-col relative rounded-lg overflow-hidden bg-[#160e0b] shadow-2xl">
      <div className="relative w-full h-[640px] lg:h-full min-h-[560px] rounded-lg overflow-hidden flex items-end">
        {/* Remote Partner Video Feed */}
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
              shouldBlurRemote ? 'sand-blur' : ''
            }`}
          />
        ) : (
          <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-[#160e0b] text-[#ffede5] p-6 text-center space-y-3">
            <span className="material-symbols-outlined text-5xl text-primary-container animate-spin">
              sync
            </span>
            <p className="font-headline-sm text-headline-sm">
              {statusBannerText || 'Menghubungkan aliran video P2P...'}
            </p>
            <p className="font-body-sm text-body-sm text-[#d8c3ad]/70">
              Bertukar kandidat jaringan WebRTC secara terenkripsi
            </p>
          </div>
        )}

        {/* Subtle Vignette & Desert Warmth Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E1410] via-transparent to-[#1E1410]/70 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1E1410]/40 via-transparent to-[#1E1410]/40 pointer-events-none" />

        {/* TOP STREAM OVERLAYS: Connection status, security */}
        <div className="absolute top-5 left-5 right-5 flex flex-wrap items-center justify-between gap-3 pointer-events-auto z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Live Duration & Status Chip */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2A1E18]/85 backdrop-blur-md text-[#fff8f6] shadow-md">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    connectionState === 'connected' ? 'bg-[#22C55E]' : 'bg-primary-container'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    connectionState === 'connected' ? 'bg-[#22C55E]' : 'bg-primary-container'
                  }`}
                />
              </span>
              <span className="font-label-md text-label-md tracking-wider font-bold">
                {statusBannerText
                  ? statusBannerText
                  : connectionState === 'connected'
                  ? `Terhubung • ${formatDuration(elapsedSeconds)}`
                  : 'Menghubungkan...'}
              </span>
            </div>

            {/* P2P Privacy Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2A1E18]/60 backdrop-blur-md text-[#d8c3ad]">
              <span className="material-symbols-outlined text-[15px] text-secondary-fixed">
                verified_user
              </span>
              <span className="font-label-sm text-label-sm">Enkripsi P2P Bebas Rekam</span>
            </div>
          </div>

          {/* Resolution / Network Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#2A1E18]/70 backdrop-blur-sm text-[#ffb599]">
            <span className="material-symbols-outlined text-[16px]">signal_cellular_alt</span>
            <span className="font-label-sm text-label-sm">480p • P2P</span>
          </div>
        </div>

        {/* SUB-VARIANT SAFETY BANNER OVERLAY (2s initial blur compliance notice) */}
        {(isInitialBlur || isSandCurtain) && (
          <div className="absolute top-20 left-5 max-w-md bg-[#2A1E18]/90 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-3 z-10">
            <div className="w-7 h-7 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0 text-primary-container">
              <span className="material-symbols-outlined text-[18px]">shield</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-[#fff8f6]">
                Protokol Api Unggun Aman
              </span>
              <p className="font-body-sm text-body-sm text-[#fbdcce]/80">
                {isSandCurtain
                  ? 'Tirai Pasir aktif: video diburamkan demi kenyamanan Anda.'
                  : '2 detik pertama video diburamkan otomatis [Memeriksa koneksi & norma...]'}
              </p>
            </div>
          </div>
        )}

        {/* USER SELF-VIEW PICTURE-IN-PICTURE (Bottom Right within feed) */}
        <div className="absolute bottom-28 right-5 w-40 h-52 sm:w-48 sm:h-64 rounded-2xl overflow-hidden shadow-2xl bg-[#2A1E18] transform hover:scale-105 transition-transform duration-200 z-20 border border-white/15">
          <div className="relative w-full h-full">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ transform: isLocalMirrored ? 'scaleX(-1)' : 'scaleX(1)' }}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-label-sm text-[#ffeedd]">
              Anda (Anonim)
            </div>
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#1E1410]/80 backdrop-blur-sm">
                <span className="material-symbols-outlined text-[14px] text-secondary-fixed">
                  mic
                </span>
                <div className="flex items-end gap-0.5 h-3">
                  <span className="w-0.5 h-1.5 bg-secondary-fixed rounded-full animate-pulse" />
                  <span className="w-0.5 h-3 bg-secondary-fixed rounded-full animate-pulse" />
                  <span className="w-0.5 h-2 bg-secondary-fixed rounded-full" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLocalMirrored((prev) => !prev)}
                title="Balik Cermin Kamera"
                className="w-6 h-6 rounded-full bg-black/60 text-[#ffb599] flex items-center justify-center hover:bg-black/90 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">flip_camera_ios</span>
              </button>
            </div>
          </div>
        </div>

        {/* FLOATING BOTTOM CONTROL BAR SLOT (F5 Controls) */}
        <div className="w-full px-6 pb-6 pt-12 flex justify-center items-center z-20">
          {controlsSlot}
        </div>
      </div>
    </section>
  );
}
