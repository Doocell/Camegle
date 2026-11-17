import React, { useEffect, useRef, useState } from 'react';

/**
 * Komponen F4: VideoCall
 * Layout seimbang kanan-kiri (50:50 split screen) antara video lawan bicara (kiri)
 * dan video diri sendiri (kanan), dengan bar kontrol F5 di bagian bawah.
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
  const [remoteResolution, setRemoteResolution] = useState('HD');

  // Pasang remoteStream ke elemen <video> kiri
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    } else {
      setRemoteResolution('HD');
    }
  }, [remoteStream, remoteVideoRef]);

  const handleRemoteVideoResize = () => {
    const h = remoteVideoRef.current?.videoHeight || 0;
    if (h >= 1080) {
      setRemoteResolution('1080p');
    } else if (h >= 720) {
      setRemoteResolution('720p');
    } else if (h > 0) {
      setRemoteResolution(`${h}p`);
    }
  };

  // Pasang localStream ke elemen <video> kanan
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
    <section className="col-span-12 lg:col-span-8 xl:col-span-8 flex flex-col gap-4">
      {/* Split Screen 50:50 Kiri (Lawan Bicara) & Kanan (Kamera Anda) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-[480px] lg:min-h-[540px]">
        {/* PANEL KIRI: Video Lawan Bicara (Remote Partner) */}
        <div className="relative rounded-2xl overflow-hidden bg-[#160e0b] shadow-2xl border border-white/10 min-h-[260px] md:min-h-full flex flex-col justify-between">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              onLoadedMetadata={handleRemoteVideoResize}
              onResize={handleRemoteVideoResize}
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

          {/* Subtle Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E1410]/80 via-transparent to-[#1E1410]/60 pointer-events-none" />

          {/* Top Overlays: Connection Status & Resolution */}
          <div className="relative z-10 p-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2A1E18]/85 backdrop-blur-md text-[#fff8f6] shadow-md">
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
              <span className="font-label-sm text-label-sm tracking-wide font-bold">
                {statusBannerText
                  ? statusBannerText
                  : connectionState === 'connected'
                  ? `Terhubung • ${formatDuration(elapsedSeconds)}`
                  : 'Menghubungkan...'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2A1E18]/75 backdrop-blur-sm text-[#ffb599]">
              <span className="material-symbols-outlined text-[15px]">signal_cellular_alt</span>
              <span className="font-label-sm text-label-sm">{remoteResolution} • P2P</span>
            </div>
          </div>

          {/* Safety Blur Notice Overlay (2s Initial Blur / Tirai Pasir) */}
          {(isInitialBlur || isSandCurtain) && (
            <div className="relative z-10 mx-4 my-auto bg-[#2A1E18]/90 backdrop-blur-md px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center shrink-0 text-primary-container">
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

          {/* Bottom Label: Lawan Bicara */}
          <div className="relative z-10 p-4 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs font-label-sm text-[#ffeedd]">
              <span className="material-symbols-outlined text-[14px] text-primary-fixed-dim">
                person
              </span>
              <span>Teman Perjalanan</span>
            </div>
          </div>
        </div>

        {/* PANEL KANAN: Video Diri Sendiri (Sama Besar) */}
        <div className="relative rounded-2xl overflow-hidden bg-[#160e0b] shadow-2xl border border-white/10 min-h-[260px] md:min-h-full flex flex-col justify-between">
          {localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{ transform: isLocalMirrored ? 'scaleX(-1)' : 'scaleX(1)' }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-[#160e0b] text-[#d8c3ad]/70 p-6 text-center space-y-2">
              <span className="material-symbols-outlined text-4xl">videocam_off</span>
              <p className="font-body-sm text-body-sm">Kamera lokal belum aktif</p>
            </div>
          )}

          {/* Subtle Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E1410]/80 via-transparent to-[#1E1410]/50 pointer-events-none" />

          {/* Top Overlays: Anda (Anonim) & P2P Privacy */}
          <div className="relative z-10 p-4 flex flex-wrap items-center justify-between gap-2">
            <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-xs font-label-sm text-[#ffeedd] font-bold">
              Anda (Anonim)
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2A1E18]/70 backdrop-blur-md text-[#d8c3ad]">
              <span className="material-symbols-outlined text-[15px] text-secondary-fixed">
                verified_user
              </span>
              <span className="font-label-sm text-label-sm">Enkripsi P2P Bebas Rekam</span>
            </div>
          </div>

          {/* Bottom Overlays: Mic Indicator & Mirror Toggle */}
          <div className="relative z-10 p-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1E1410]/80 backdrop-blur-sm">
              <span className="material-symbols-outlined text-[15px] text-secondary-fixed">
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
              className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/90 text-[#ffb599] flex items-center gap-1.5 cursor-pointer text-xs font-label-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">flip_camera_ios</span>
              <span>Cermin</span>
            </button>
          </div>
        </div>
      </div>

      {/* FLOATING BOTTOM CONTROL BAR SLOT (F5 Controls) */}
      <div className="w-full flex justify-center items-center pt-1">{controlsSlot}</div>
    </section>
  );
}
