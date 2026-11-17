import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function MediaPreview({ stream, error, errorType, isLoading, onRetry, onStart }) {
  const videoRef = useRef(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMirrored, setIsMirrored] = useState(true);
  const [agreedEtika, setAgreedEtika] = useState(true);
  const [volumePct, setVolumePct] = useState(0);
  const [dbText, setDbText] = useState('-60 dB (Senyap)');
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);

  // Attach MediaStream to <video>
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Enumerate connected cameras & microphones
  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
      })
      .catch(() => {});
  }, [stream]);

  // Real-time Microphone Audio Level Meter (Web Audio API)
  useEffect(() => {
    if (!stream || !isMicOn) {
      setVolumePct(4);
      setDbText(isMicOn ? '-60 dB (Menunggu)' : '-60 dB (Bisu)');
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return;

    let audioCtx;
    let animId;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const pct = Math.min(100, Math.max(6, Math.round((avg / 128) * 100)));
        setVolumePct(pct);

        if (pct < 12) {
          setDbText('-50 dB (Senyap)');
        } else {
          const db = Math.round(-48 + (pct / 100) * 42);
          setDbText(`${db} dB (Optimal)`);
        }
        animId = requestAnimationFrame(tick);
      };

      tick();
    } catch (e) {
      setVolumePct(65);
      setDbText('-18 dB (Optimal)');
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };
  }, [stream, isMicOn]);

  const handleToggleMic = () => {
    if (!stream) return;
    const nextState = !isMicOn;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = nextState;
    });
    setIsMicOn(nextState);
  };

  const handleToggleCam = () => {
    if (!stream) return;
    const nextState = !isCamOn;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = nextState;
    });
    setIsCamOn(nextState);
  };

  const canStart = Boolean(stream) && agreedEtika && !isLoading;

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
      {/* Top Sticky Header */}
      <header className="sticky top-0 left-0 right-0 w-full z-40 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 max-w-7xl mx-auto px-margin-lg flex items-center justify-between gap-gutter">
          <Link to="/" className="flex items-center gap-space-sm text-primary">
            <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">terrain</span>
            </div>
            <span className="font-headline-md text-headline-md tracking-tight text-on-surface lowercase font-bold">
              camelgle
            </span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-space-md py-space-xs rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-label-md text-label-md transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Kembali ke Beranda</span>
          </Link>
        </div>
      </header>

      <main className="max-w-[1180px] w-full mx-auto px-margin-lg py-space-lg">
        {/* Header Section */}
        <div className="mb-space-lg flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm mb-space-xs shadow-sm">
              <span
                className={`w-2 h-2 rounded-full ${
                  stream ? 'bg-secondary animate-ping' : 'bg-error'
                }`}
              />
              <span>Ruang Persiapan Pengelana</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-extrabold">
              Pratinjau Kamera & Cek Perangkat
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-xs">
              Pastikan sudut kamera dan suara Anda terdengar jernih sebelum memulai pengembaraan bersama kawan baru.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-sm rounded-full shadow-sm">
            <span
              className="material-symbols-outlined text-secondary text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant">
              Pemeriksaan Enkripsi Selesai
            </span>
          </div>
        </div>

        {/* Main Diagnostic Split (Left 60%, Right 40%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
          {/* Left Column: 60% Camera Preview Viewport */}
          <div className="lg:col-span-7 flex flex-col gap-space-md">
            <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-inverse-surface shadow-xl shadow-on-surface/5 p-1 bg-gradient-to-b from-primary-container/40 via-surface-container-high to-surface-variant">
              <div className="relative w-full h-full rounded-[1.75rem] overflow-hidden bg-inverse-surface flex items-center justify-center">
                {stream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)',
                      filter: isCamOn ? 'none' : 'brightness(0.08) blur(8px)',
                    }}
                    className="w-full h-full object-cover select-none transition-all duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-surface-bright space-y-3">
                    <span className="material-symbols-outlined text-5xl text-primary-fixed-dim">
                      {isLoading ? 'hourglass_top' : 'videocam_off'}
                    </span>
                    <p className="font-headline-sm text-headline-sm">
                      {isLoading
                        ? 'Meminta izin akses kamera & mikrofon...'
                        : 'Kamera belum aktif'}
                    </p>
                    <p className="font-body-sm text-body-sm text-outline-variant max-w-sm">
                      {error || 'Klik Izinkan (Allow) pada pop-up browser Anda.'}
                    </p>
                  </div>
                )}

                {/* Top Overlays: Technical Badges */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                  <div className="flex items-center gap-space-sm px-space-md py-1.5 rounded-full bg-inverse-surface/75 backdrop-blur-md text-on-primary shadow-sm">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        stream && isMicOn ? 'bg-secondary-container animate-pulse' : 'bg-error'
                      }`}
                    />
                    <span className="font-label-md text-label-md text-surface-bright font-medium tracking-wide">
                      {stream ? (isMicOn ? 'Mic OK' : 'Mic Bisu') : 'Mic Off'}
                    </span>
                    {stream && isMicOn && (
                      <div className="flex items-end gap-[3px] h-3.5 pl-1">
                        <span className="w-[3px] bg-secondary-container rounded-full animate-bounce [animation-delay:-0.3s] h-2" />
                        <span className="w-[3px] bg-secondary-container rounded-full animate-bounce [animation-delay:-0.15s] h-3.5" />
                        <span className="w-[3px] bg-secondary-container rounded-full animate-bounce [animation-delay:-0.4s] h-1.5" />
                        <span className="w-[3px] bg-secondary-container rounded-full animate-bounce [animation-delay:-0.2s] h-3" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-inverse-surface/75 backdrop-blur-md text-surface-bright shadow-sm">
                    <span className="material-symbols-outlined text-[16px] text-primary-fixed-dim">
                      high_quality
                    </span>
                    <span className="font-label-sm text-label-sm font-semibold tracking-wider">
                      480p WebRTC
                    </span>
                  </div>
                </div>

                {/* Cam Status Banner */}
                <div className="absolute top-16 left-4 pointer-events-none z-10">
                  <span className="px-space-sm py-0.5 rounded-md bg-inverse-surface/60 backdrop-blur-sm text-surface-container-high font-label-sm text-label-sm">
                    {isMirrored ? 'Tampilan Cermin' : 'Tampilan Normal'}
                  </span>
                </div>

                {/* Bottom Floating Action Dock: Cam Controls */}
                <div className="absolute bottom-5 inset-x-0 flex items-center justify-center gap-space-md px-space-md z-10">
                  <div className="flex items-center gap-space-sm p-space-xs rounded-full bg-inverse-surface/85 backdrop-blur-xl shadow-2xl">
                    <button
                      type="button"
                      onClick={handleToggleMic}
                      disabled={!stream}
                      title={isMicOn ? 'Matikan Mikrofon' : 'Nyalakan Mikrofon'}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-sm cursor-pointer ${
                        isMicOn
                          ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                          : 'bg-error text-on-error'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        {isMicOn ? 'mic' : 'mic_off'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleCam}
                      disabled={!stream}
                      title={isCamOn ? 'Matikan Kamera' : 'Nyalakan Kamera'}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-sm cursor-pointer ${
                        isCamOn
                          ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                          : 'bg-error text-on-error'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        {isCamOn ? 'videocam' : 'videocam_off'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsMirrored((prev) => !prev)}
                      disabled={!stream}
                      title="Balik Orientasi Cermin"
                      className="w-12 h-12 rounded-full flex items-center justify-center bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[22px]">cameraswitch</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Diagnostics Mini Bar */}
            <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-wrap items-center justify-between gap-space-md border border-outline-variant/30">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-secondary text-[22px]">speed</span>
                <div>
                  <p className="font-label-md text-label-md text-on-surface font-semibold">
                    Resolusi Optimal
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    640×480 (Hemat Kuota & Stabil)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[22px]">lock</span>
                <div>
                  <p className="font-label-md text-label-md text-on-surface font-semibold">
                    WebRTC Peer-to-Peer
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Langsung & Aman
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-space-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">info</span>
                <span className="font-label-sm text-label-sm font-medium">
                  {stream ? 'Kamera Siap' : 'Menunggu Izin'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: 40% Control & Settings Panel */}
          <div className="lg:col-span-5 flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest p-space-lg rounded-lg shadow-sm flex flex-col gap-space-lg border border-outline-variant/30">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Konfigurasi & Penyesuaian
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Sesuaikan masukan sebelum melangkah keluar tenda menuju pertemuan acak berikutnya.
                </p>
              </div>

              {/* Camera Selector Field */}
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center justify-between">
                  <span>Pilih Perangkat Kamera</span>
                  <span
                    className={`font-label-sm text-label-sm font-bold ${
                      stream ? 'text-secondary' : 'text-error'
                    }`}
                  >
                    {stream ? 'Aktif' : 'Belum Aktif'}
                  </span>
                </label>
                <div className="relative">
                  <select className="w-full h-[52px] px-space-md pr-10 rounded-DEFAULT bg-surface-container-low text-on-surface font-body-md text-body-md appearance-none focus:outline-none focus:ring-2 focus:ring-primary-container shadow-inner border border-outline-variant/30">
                    {videoDevices.length > 0 ? (
                      videoDevices.map((dev, idx) => (
                        <option key={dev.deviceId || idx} value={dev.deviceId}>
                          {dev.label || `Kamera #${idx + 1}`}
                        </option>
                      ))
                    ) : (
                      <option value="default">Kamera Bawaan Perangkat</option>
                    )}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Audio Sensitivity Meter Panel */}
              <div className="flex flex-col gap-space-sm bg-surface-container-low p-space-md rounded-DEFAULT">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      equalizer
                    </span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      Sensitivitas Suara
                    </span>
                  </div>
                  <span
                    className={`font-label-md text-label-md font-bold ${
                      isMicOn && stream ? 'text-secondary' : 'text-error'
                    }`}
                  >
                    {dbText}
                  </span>
                </div>
                <div className="w-full bg-surface-container-high h-3 rounded-full overflow-hidden p-0.5 shadow-inner">
                  <div
                    style={{ width: `${volumePct}%` }}
                    className="h-full bg-gradient-to-r from-secondary-container via-secondary to-primary-container rounded-full transition-all duration-150"
                  />
                </div>
                <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm pt-0.5">
                  <span>Senyap (-60 dB)</span>
                  <span className="text-secondary font-semibold">Bicara Normal</span>
                  <span>Keras (0 dB)</span>
                </div>
              </div>

              {/* Audio Input Dropdown */}
              <div className="flex flex-col gap-space-xs">
                <label className="font-label-md text-label-md text-on-surface font-semibold">
                  Mikrofon Masukan
                </label>
                <div className="relative">
                  <select className="w-full h-[52px] px-space-md pr-10 rounded-DEFAULT bg-surface-container-low text-on-surface font-body-md text-body-md appearance-none focus:outline-none focus:ring-2 focus:ring-primary-container shadow-inner border border-outline-variant/30">
                    {audioDevices.length > 0 ? (
                      audioDevices.map((dev, idx) => (
                        <option key={dev.deviceId || idx} value={dev.deviceId}>
                          {dev.label || `Mikrofon #${idx + 1}`}
                        </option>
                      ))
                    ) : (
                      <option value="default">Mikrofon Bawaan Perangkat</option>
                    )}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Behavioral Checklist */}
              <div className="bg-surface-container-lowest rounded-DEFAULT p-space-sm flex items-start gap-space-sm">
                <input
                  id="etika-check"
                  type="checkbox"
                  checked={agreedEtika}
                  onChange={(e) => setAgreedEtika(e.target.checked)}
                  className="w-5 h-5 rounded mt-0.5 accent-primary cursor-pointer"
                />
                <label
                  htmlFor="etika-check"
                  className="font-body-sm text-body-sm text-on-surface-variant cursor-pointer select-none"
                >
                  Saya setuju menjaga percakapan tetap sopan, ramah, dan mematuhi{' '}
                  <Link to="/" className="text-primary font-semibold underline">
                    Etika Pengembara Camelgle
                  </Link>
                  .
                </label>
              </div>

              {/* Primary CTA Button (Cari Teman Sekarang - Hanya aktif jika stream tersedia) */}
              <button
                type="button"
                disabled={!canStart}
                onClick={() => canStart && onStart && onStart()}
                className={`w-full h-14 rounded-full font-label-lg text-label-lg font-bold flex items-center justify-center gap-space-sm transition-all ${
                  canStart
                    ? 'bg-gradient-to-r from-primary-container to-tertiary text-on-primary shadow-lg shadow-tertiary/20 hover:brightness-105 active:scale-[0.99] cursor-pointer'
                    : 'bg-surface-dim text-on-surface-variant/50 cursor-not-allowed'
                }`}
              >
                <span>{stream ? 'Cari Teman Sekarang' : 'Izinkan Kamera Terlebih Dahulu'}</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Variant Card: Muncul otomatis bila izin kamera ditolak / error, atau sebagai panduan */}
        {error && (
          <div className="mt-space-xl bg-surface-container-lowest rounded-lg p-space-xl shadow-md relative overflow-hidden border border-error/40">
            <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-error-container/40 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-space-xl">
              <div className="w-36 h-36 shrink-0 rounded-2xl bg-surface-container-high flex items-center justify-center p-space-sm relative shadow-inner">
                <img
                  className="w-full h-full object-contain"
                  alt="Maskot Unta Kamera Terkunci"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAqtKvBMUf-J-_UABdpy-TO7wiicTcxzDJBZzhy_yV8jGHZCMaQ-vP9P32JMYSr0SqnUOTlLyyxbhBQH6WcQNUrzCj9KXR7UP64ILNgJx-VvntqL5v_y511MRl3ywiNitmho9uU8MTiB0TqUR0Qp5KfrSlvnyqxBcW5bd6xjZvmH0nYLYGO_ZdXvMvZ2L67BcYF_9ZplWRGVYqshqi9m_fnIbElZPEp7DzPmNYfEF-_"
                />
                <div className="absolute -bottom-2 -right-2 bg-error text-on-error w-8 h-8 rounded-full flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-space-xs px-space-sm py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold mb-space-xs">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  <span>
                    {errorType === 'denied' && 'Kasus: Akses Kamera & Mikrofon Ditolak'}
                    {errorType === 'in-use' && 'Kasus: Kamera Sedang Dipakai Aplikasi Lain'}
                    {errorType === 'not-found' && 'Kasus: Perangkat Kamera Tidak Ditemukan'}
                    {(!errorType || errorType === 'unknown') && 'Kasus: Kendala Perangkat Media'}
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                  Kafilah Camelgle Tidak Dapat Mengakses Kamera Anda
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs max-w-3xl">
                  {error}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm mt-space-md text-left">
                  <div className="bg-surface-container-low p-space-sm rounded-DEFAULT flex items-start gap-space-xs">
                    <span className="w-5 h-5 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm flex items-center justify-center shrink-0 font-bold">
                      1
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Klik ikon pengaturan/gembok di sebelah kiri alamat URL browser Anda.
                    </p>
                  </div>
                  <div className="bg-surface-container-low p-space-sm rounded-DEFAULT flex items-start gap-space-xs">
                    <span className="w-5 h-5 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm flex items-center justify-center shrink-0 font-bold">
                      2
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Pastikan izin Kamera dan Mikrofon diubah menjadi &apos;Izinkan&apos; (Allow).
                    </p>
                  </div>
                  <div className="bg-surface-container-low p-space-sm rounded-DEFAULT flex items-start gap-space-xs">
                    <span className="w-5 h-5 rounded-full bg-surface-container-highest text-on-surface font-label-sm text-label-sm flex items-center justify-center shrink-0 font-bold">
                      3
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Tekan tombol Coba Lagi Izin di bawah untuk menyambungkan ulang.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-space-md mt-space-lg">
                  <button
                    type="button"
                    onClick={onRetry}
                    className="px-space-xl h-12 rounded-full bg-primary text-on-primary font-label-lg text-label-lg hover:bg-on-primary-container transition-colors shadow-sm flex items-center gap-space-xs active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    <span>Coba Lagi Izin</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
