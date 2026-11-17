import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../lib/socket.js';
import { EVENTS } from '../lib/events.js';
import { AgeGateModal, hasAgeConsent, clearAgeConsent } from '../features/age-gate/index.js';
import { LegalView } from '../features/legal/index.js';

export default function Landing() {
  const navigate = useNavigate();
  const [onlineCount, setOnlineCount] = useState(1);
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [legalTab, setLegalTab] = useState(null); // null | 'guidelines' | 'privacy' | 'terms'

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

  const handleStartClick = () => {
    setLegalTab(null);
    if (hasAgeConsent()) {
      navigate('/room');
    } else {
      setShowAgeGate(true);
    }
  };

  const handleAgeConfirmed = () => {
    setShowAgeGate(false);
    navigate('/room');
  };

  if (legalTab) {
    return (
      <>
        <LegalView
          initialTab={legalTab}
          onBack={() => setLegalTab(null)}
          onStartJourney={handleStartClick}
        />
        <AgeGateModal
          isOpen={showAgeGate}
          onConfirm={handleAgeConfirmed}
          onCancel={() => setShowAgeGate(false)}
          onOpenLegal={(tab) => {
            setShowAgeGate(false);
            setLegalTab(tab);
          }}
        />
      </>
    );
  }

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen">
      {/* Top Global Sticky Header (Exact Stitch Design) */}
      <header className="fixed top-0 left-0 right-0 w-full z-40 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 max-w-7xl mx-auto px-margin-lg flex items-center justify-between gap-gutter">
          <div className="flex items-center gap-space-xl">
            <a
              href="#top"
              className="flex items-center gap-space-sm text-primary"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">terrain</span>
              </div>
              <span className="font-headline-md text-headline-md tracking-tight text-on-surface lowercase font-bold">
                camelgle
              </span>
            </a>
            <div className="hidden lg:flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-low">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                {onlineCount} orang sedang berjalan
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-space-xs">
            <button
              type="button"
              onClick={() => setLegalTab('guidelines')}
              className="px-space-md py-space-sm rounded-full font-label-md text-label-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all cursor-pointer"
            >
              Pedoman Komunitas
            </button>
            <button
              type="button"
              onClick={() => setLegalTab('privacy')}
              className="px-space-md py-space-sm rounded-full font-label-md text-label-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all cursor-pointer"
            >
              Privasi
            </button>
            <button
              type="button"
              onClick={() => setLegalTab('terms')}
              className="px-space-md py-space-sm rounded-full font-label-md text-label-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all cursor-pointer"
            >
              Ketentuan Layanan
            </button>
          </nav>

          <div className="flex items-center gap-space-md">
            <button
              type="button"
              onClick={handleStartClick}
              className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-primary text-on-primary font-label-sm text-label-sm font-bold shadow hover:bg-primary-container hover:text-on-primary-container transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">videocam</span>
              <span>Mulai</span>
            </button>
          </div>
        </div>
      </header>

      <main className="w-full pt-20 bg-surface">
        <div className="flex flex-col w-full">
          {/* 1. Hero Section */}
          <section className="relative w-full overflow-hidden px-margin-lg py-space-2xl bg-surface">
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-surface-container-high/40 blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 -right-24 w-[30rem] h-[30rem] rounded-full bg-primary-fixed-dim/20 blur-3xl pointer-events-none" />

            <div className="max-w-7xl mx-auto min-h-[540px] grid grid-cols-1 lg:grid-cols-12 gap-space-2xl items-center relative z-10">
              {/* Left Content Column */}
              <div className="lg:col-span-6 flex flex-col items-start gap-space-lg">
                <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-high text-primary">
                  <span className="material-symbols-outlined text-[18px]">wb_twilight</span>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold">
                    Oase Pertemuan Spontan
                  </span>
                </div>

                <div className="space-y-space-sm">
                  <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-extrabold max-w-xl">
                    Meet someone new on the road.
                  </h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg">
                    Obrolan video 1-on-1 acak secara anonim bagai singgah di oase padang pasir. Tanpa registrasi akun, langsung terhubung santun dan aman.
                  </p>
                </div>

                {/* CTA & Micro-interaction */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md w-full sm:w-auto pt-space-xs">
                  <button
                    type="button"
                    onClick={handleStartClick}
                    className="group relative flex items-center justify-center gap-space-sm px-space-xl py-space-md rounded-full bg-gradient-to-r from-primary-container to-tertiary text-on-primary font-label-lg text-label-lg shadow-xl shadow-tertiary/20 hover:shadow-tertiary/35 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>Mulai Perjalanan</span>
                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                      east
                    </span>
                  </button>
                  <div className="flex items-center gap-space-xs text-on-surface-variant px-space-sm py-space-xs">
                    <span className="material-symbols-outlined text-secondary text-[20px]">
                      verified_user
                    </span>
                    <span className="font-label-sm text-label-sm">Enkripsi P2P Langsung</span>
                  </div>
                </div>

                {/* Trust Chips */}
                <div className="flex flex-wrap items-center gap-space-sm pt-space-md">
                  <button
                    type="button"
                    onClick={() => setShowAgeGate(true)}
                    title="Klik untuk membuka modal verifikasi 18+"
                    className="flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-low hover:bg-surface-container shadow-sm cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-tertiary text-[18px]">
                      verified
                    </span>
                    <span className="font-label-md text-label-md text-on-surface">18+ saja</span>
                  </button>
                  <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-low shadow-sm">
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      lock_open_right
                    </span>
                    <span className="font-label-md text-label-md text-on-surface">Tanpa akun</span>
                  </div>
                  <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-low shadow-sm">
                    <span className="material-symbols-outlined text-error text-[18px]">flag</span>
                    <span className="font-label-md text-label-md text-on-surface">
                      Laporkan kapan saja
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Graphic / Mascot Illustration Panel */}
              <div className="lg:col-span-6 relative flex items-center justify-center">
                <div className="w-full aspect-[4/3] max-w-xl rounded-lg bg-surface-container-lowest shadow-xl shadow-on-surface/5 p-space-md flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute inset-0 z-0 pointer-events-none opacity-90">
                    <svg
                      className="w-full h-full"
                      fill="none"
                      viewBox="0 0 600 450"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="480" cy="110" fill="url(#sun-gradient)" r="70" />
                      <path
                        d="M0 320C120 280 260 350 400 300C490 265 550 280 600 270V450H0V320Z"
                        fill="#FFE2D5"
                      />
                      <path
                        d="M0 370C150 330 310 400 460 360C520 340 565 350 600 345V450H0V370Z"
                        fill="#FBDCCE"
                      />
                      <path d="M0 410C180 390 340 430 600 400V450H0V410Z" fill="#F2D4C5" />
                      <defs>
                        <radialGradient
                          cx="0"
                          cy="0"
                          gradientTransform="translate(480 110) rotate(90) scale(70)"
                          gradientUnits="userSpaceOnUse"
                          id="sun-gradient"
                          r="1"
                        >
                          <stop stopColor="#FFDDB8" />
                          <stop offset="0.7" stopColor="#F59E0B" />
                          <stop offset="1" stopColor="#A73A00" stopOpacity="0" />
                        </radialGradient>
                      </defs>
                    </svg>
                  </div>

                  <div className="relative z-10 w-full h-full rounded-DEFAULT overflow-hidden flex items-end justify-center">
                    <img
                      className="w-full h-full object-cover rounded-DEFAULT"
                      alt="Maskot Unta Camelgle"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAWPROWFDRij_dt1-VOn_JPtYU6Mn3saleIzvt1GLzJZxbFMucfaTNwexHNhLHleD6PVhVKj_wgwu04PIqx_hGeML8WN1T7ZlQuHfRkPaJDHhFLtEHlcETcQVvV9LgguWS3Jl4SO1BLTRmLI9ydB4XHRNqpkzzk4or0grz91ZUh_NaQ80PNNY4eEmdA8-gkXl6534PdfHpld_qiW9mkxYCLsH_8mVzIxiMgn90J_Uiv"
                    />
                  </div>

                  <div className="absolute bottom-space-lg left-space-lg z-20 flex items-center gap-space-sm bg-surface/90 backdrop-blur-md px-space-md py-space-sm rounded-full shadow-md">
                    <span className="w-3 h-3 rounded-full bg-secondary-fixed-dim animate-ping" />
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      Koneksi Oase Terbuka
                    </span>
                  </div>
                  <div className="absolute top-space-lg right-space-lg z-20 flex items-center gap-space-xs bg-surface-container-high/90 backdrop-blur-md px-space-md py-space-xs rounded-full">
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      nights_stay
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                      Jalur Nusantara
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. 3-Step Section: Langkah Mudah Berkelana */}
          <section className="w-full px-margin-lg py-space-2xl bg-surface-container-low">
            <div className="max-w-7xl mx-auto flex flex-col gap-space-2xl">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
                <div className="space-y-space-xs">
                  <div className="flex items-center gap-space-xs text-tertiary">
                    <span className="font-label-sm text-label-sm font-bold uppercase tracking-wider">
                      Perjalanan Singkat
                    </span>
                  </div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                    Langkah Mudah Berkelana
                  </h2>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                  Mulai percakapan hangat dengan teman baru hanya dalam hitungan detik tanpa perlu mengunduh aplikasi tambahan.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
                {[
                  {
                    num: '01',
                    icon: 'videocam',
                    title: 'Izinkan kamera',
                    desc: 'Izin video dan mikrofon yang aman langsung antar peramban melalui protokol WebRTC peer-to-peer tanpa pernah disimpan di peladen.',
                    badgeIcon: 'verified',
                    badgeText: 'Privasi terlindungi',
                  },
                  {
                    num: '02',
                    icon: 'explore',
                    title: 'Temukan teman acak',
                    desc: 'Sistem cerdas mencocokkan Anda dengan teman bicara santai dari Sabang sampai Merauke secara spontan dan setara.',
                    badgeIcon: 'bolt',
                    badgeText: 'Koneksi instan',
                  },
                  {
                    num: '03',
                    icon: 'skip_next',
                    title: 'Ngobrol & lanjut santai',
                    desc: 'Nikmati obrolan hangat seputar petualangan hidup, atau tekan tombol lewati kapan pun Anda ingin melanjutkan perjalanan ke musafir lain.',
                    badgeIcon: 'swipe_right',
                    badgeText: 'Kendali di tangan Anda',
                  },
                ].map((step) => (
                  <div
                    key={step.num}
                    className="group flex flex-col justify-between p-space-xl rounded-lg bg-surface-container-lowest shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col gap-space-lg">
                      <div className="flex items-center justify-between">
                        <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                          <span className="material-symbols-outlined text-[28px]">{step.icon}</span>
                        </div>
                        <span className="font-headline-lg text-headline-lg text-surface-dim font-extrabold">
                          {step.num}
                        </span>
                      </div>
                      <div className="space-y-space-xs">
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          {step.title}
                        </h3>
                        <p className="font-body-md text-body-md text-on-surface-variant">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                    <div className="mt-space-xl pt-space-md flex items-center gap-space-xs text-primary font-label-md text-label-md font-semibold">
                      <span className="material-symbols-outlined text-[18px]">{step.badgeIcon}</span>
                      <span>{step.badgeText}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 3. Trust Banner Section: Komitmen Oase Aman */}
          <section className="w-full px-margin-lg py-space-2xl bg-surface-container-high relative overflow-hidden">
            <div className="max-w-7xl mx-auto rounded-xl bg-surface-container-lowest p-space-xl md:p-space-2xl shadow-xl flex flex-col lg:flex-row items-center justify-between gap-space-xl relative z-10 border border-outline-variant/30">
              <div className="flex flex-col gap-space-md max-w-2xl">
                <div className="flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[24px]">shield</span>
                  </div>
                  <span className="font-headline-md text-headline-md text-on-surface font-bold">
                    Komitmen Oase Aman
                  </span>
                </div>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Keamanan dan kenyamanan ruang temu adalah prioritas utama kafilah kami. Camelgle mengkombinasikan moderasi cerdas otomatis dengan perlindungan privasi tanpa kompromi.
                </p>
              </div>

              <div className="w-full lg:w-auto flex flex-col items-center justify-center p-space-xl rounded-lg bg-surface-container-low text-center gap-space-md min-w-[280px]">
                <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                  <span className="material-symbols-outlined text-[32px]">handshake</span>
                </div>
                <div>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Siap Menjelajah?
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Oase perjumpaan menanti Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLegalTab('guidelines')}
                  className="w-full py-space-sm px-space-lg rounded-full bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-md font-bold cursor-pointer"
                >
                  Baca Pedoman Adab
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Global Footer */}
      <footer className="w-full bg-surface-container-low py-space-2xl border-t border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-margin-lg flex flex-col md:flex-row items-center justify-between gap-space-lg">
          <div className="flex items-center gap-space-sm">
            <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[18px]">terrain</span>
            </div>
            <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface lowercase font-bold">
              camelgle
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant ml-space-sm">
              © 2026 camelgle. Penjelajahan hangat tanpa sekat.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-space-lg">
            <button
              type="button"
              onClick={() => setLegalTab('guidelines')}
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Pedoman Komunitas
            </button>
            <button
              type="button"
              onClick={() => setLegalTab('privacy')}
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Kebijakan Privasi
            </button>
            <button
              type="button"
              onClick={() => setLegalTab('terms')}
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Ketentuan Layanan
            </button>
            <button
              type="button"
              onClick={() => {
                clearAgeConsent();
                setShowAgeGate(true);
              }}
              className="font-label-sm text-label-sm text-primary hover:underline cursor-pointer"
              title="Reset localStorage age gate untuk menguji ulang modal 18+"
            >
              Tes Ulang Age Gate 18+
            </button>
          </div>
        </div>
      </footer>

      {/* Modal Verifikasi Usia 18+ (F1) */}
      <AgeGateModal
        isOpen={showAgeGate}
        onConfirm={handleAgeConfirmed}
        onCancel={() => setShowAgeGate(false)}
        onOpenLegal={(tab) => {
          setShowAgeGate(false);
          setLegalTab(tab);
        }}
      />
    </div>
  );
}
