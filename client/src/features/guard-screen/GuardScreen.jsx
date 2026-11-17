import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Komponen F9: GuardScreen ("Akses Dibatasi")
 * Ditampilkan saat pengguna menerima event guard:banned dari server.
 * Menggunakan desain asli Stitch "camelgle - Peringatan Keamanan & Blokir Akun (Desktop)".
 */
export default function GuardScreen({ reason, expiresAt, fingerprint }) {
  const [remainingSecs, setRemainingSecs] = useState(() => {
    if (expiresAt && expiresAt > Date.now()) {
      return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    }
    return 24 * 3600;
  });
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [appealSent, setAppealSent] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSecs((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (total) => {
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="relative w-full bg-[#1E1410] text-[#ffede5] py-space-xl px-margin-lg overflow-hidden min-h-screen flex flex-col justify-between font-body-md select-none">
      {/* Ambient Desert Glow Lighting */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-primary/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 -left-20 w-[420px] h-[420px] bg-tertiary/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Centered Header Section */}
      <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
        <div className="relative mb-space-md">
          <div className="absolute inset-0 rounded-full bg-primary-container/25 blur-xl" />
          <div className="relative w-20 h-20 rounded-full bg-[#2A1E18] flex items-center justify-center shadow-xl">
            <span
              className="material-symbols-outlined text-primary-fixed-dim text-[40px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield_lock
            </span>
          </div>
        </div>

        <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-[#2A1E18] mb-space-sm shadow-sm">
          <span className="w-2 h-2 rounded-full bg-error animate-ping" />
          <span className="font-label-sm text-label-sm text-primary-fixed uppercase tracking-wider font-bold">
            AI Sentinel Guardian • F9 Guard
          </span>
        </div>

        <h1 className="font-headline-xl text-headline-xl text-[#fff8f6] tracking-tight max-w-3xl mb-space-xs font-extrabold">
          Perlindungan & Disiplin Komunitas camelgle
        </h1>
        <p className="font-body-lg text-body-lg text-outline-variant max-w-xl">
          Kenyamanan dan ruang aman Anda adalah prioritas utama kami di setiap pengembaraan visual.
        </p>
      </div>

      {/* Main Ban Card (Exact Stitch Hardware & Network Ban Card) */}
      <div className="relative z-10 max-w-2xl w-full mx-auto my-space-xl">
        <div className="relative bg-[#2A1E18]/90 backdrop-blur-xl rounded-lg p-space-xl flex flex-col justify-between shadow-2xl border border-error/30">
          <div>
            <div className="flex items-center justify-between gap-space-md mb-space-lg">
              <div className="inline-flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-error-container/20">
                <span className="w-2 h-2 rounded-full bg-error animate-ping" />
                <span className="font-label-sm text-label-sm text-error-container font-bold tracking-wide">
                  Akses Dibatasi
                </span>
              </div>
              <div className="inline-flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-[#1E1410] font-label-sm text-label-sm text-outline-variant">
                <span className="material-symbols-outlined text-[16px]">device_hub</span>
                <span>Hardware & IP Node Ban</span>
              </div>
            </div>

            <div className="flex items-start gap-space-md mb-space-md">
              <div className="w-12 h-12 rounded-full bg-error-container/20 flex-shrink-0 flex items-center justify-center text-error">
                <span className="material-symbols-outlined text-[26px]">block</span>
              </div>
              <div>
                <span className="font-label-sm text-label-sm text-error uppercase font-bold tracking-wider">
                  Tindakan Disiplin Jaringan
                </span>
                <h2 className="font-headline-md text-headline-md text-[#fff8f6] tracking-tight mt-space-xs">
                  Perangkat Diblokir Sementara dari Jaringan
                </h2>
              </div>
            </div>

            <p className="font-body-md text-body-md text-outline-variant mb-space-lg">
              {reason ||
                'Terdeteksi pelanggaran berulang atau laporan serius dengan bukti visual valid dari pengguna lain. Identifikasi sidik peramban & alamat jaringan Anda ditempatkan pada ruang karantina.'}
            </p>

            {/* Countdown Timer Module */}
            <div className="bg-[#1E1410] rounded-DEFAULT p-space-md mb-space-xl flex flex-col sm:flex-row sm:items-center justify-between gap-space-md shadow-inner">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-outline-variant uppercase font-semibold">
                  Isolasi Akses Tersisa
                </span>
                <div className="flex items-baseline gap-space-xs mt-space-xs">
                  <span className="font-headline-lg text-headline-lg font-extrabold text-tertiary-container tracking-wider font-mono">
                    {formatCountdown(remainingSecs)}
                  </span>
                  <span className="font-label-sm text-label-sm text-outline-variant">WIB</span>
                </div>
              </div>

              <div className="flex items-center gap-space-sm px-space-md py-space-sm rounded-full bg-[#2A1E18]">
                <span className="material-symbols-outlined text-tertiary-fixed text-[20px]">
                  lock_clock
                </span>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-[#fff8f6] font-bold">
                    Durasi Karantina
                  </span>
                  <span className="font-body-sm text-body-sm text-outline-variant text-[11px] leading-tight">
                    Berakhir otomatis
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-space-md pt-space-xs">
            <button
              type="button"
              onClick={() => setShowAppealModal(true)}
              className="w-full sm:flex-1 py-3 px-space-lg rounded-full bg-[#1E1410] hover:bg-[#38261E] text-tertiary-fixed-dim hover:text-[#fff8f6] font-label-lg text-label-lg transition-all text-center flex items-center justify-center gap-space-xs shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">gavel</span>
              <span>Ajukan Banding ke Tim Trust & Safety</span>
            </button>
            <Link
              to="/"
              className="w-full sm:w-auto py-3 px-space-lg rounded-full bg-gradient-to-r from-primary-container to-tertiary text-on-primary font-label-md text-label-md transition-all text-center flex items-center justify-center gap-space-xs"
            >
              <span className="material-symbols-outlined text-[18px]">home</span>
              <span>Kembali ke Beranda</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Appeal Modal Overlay */}
      {showAppealModal && (
        <div className="fixed inset-0 z-50 bg-[#1E1410]/80 backdrop-blur-md flex items-center justify-center p-space-md">
          <div className="bg-[#2A1E18] text-[#fff8f6] max-w-lg w-full rounded-lg p-space-xl shadow-2xl relative border border-white/10">
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary-fixed">
                  <span className="material-symbols-outlined text-[20px]">
                    assignment_turned_in
                  </span>
                </div>
                <h3 className="font-headline-sm text-headline-sm">Formulir Banding Keamanan</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAppealModal(false)}
                className="text-outline-variant hover:text-[#fff8f6] cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="font-body-sm text-body-sm text-outline-variant mb-space-md">
              Jika Anda meyakini pemblokiran ini adalah kekeliruan, tim Trust & Safety kami akan meninjau log laporan terkait.
            </p>
            {appealSent ? (
              <div className="p-4 rounded-DEFAULT bg-secondary/20 text-secondary-fixed font-label-md text-center">
                Permohonan banding Anda telah tercatat dan sedang ditinjau oleh tim moderator.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-space-sm mb-space-lg">
                  <label className="font-label-sm text-label-sm text-outline-variant">
                    ID Perangkat Karantina:{' '}
                    <span className="font-mono text-primary-fixed">
                      {fingerprint || 'CML-SEC-NODE'}
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    value={appealText}
                    onChange={(e) => setAppealText(e.target.value)}
                    placeholder="Tuliskan keterangan singkat terkait aktivitas terakhir Anda..."
                    className="w-full rounded-DEFAULT p-space-sm bg-[#1E1410] text-[#fff8f6] placeholder-outline-variant/60 font-body-sm text-body-sm outline-none resize-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-space-sm">
                  <button
                    type="button"
                    onClick={() => setShowAppealModal(false)}
                    className="px-space-md py-2 rounded-full font-label-md text-label-md text-outline-variant hover:text-[#fff8f6] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppealSent(true)}
                    className="px-space-lg py-2 rounded-full bg-primary-container text-[#28180f] font-label-md font-bold hover:brightness-110 cursor-pointer"
                  >
                    Kirim Peninjauan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer Guarantee Statement */}
      <div className="relative z-10 max-w-4xl mx-auto w-full pt-space-md pb-space-xs flex flex-col items-center text-center">
        <div className="flex items-center justify-center gap-space-sm text-outline-variant font-label-sm text-label-sm uppercase tracking-wider">
          <span className="material-symbols-outlined text-primary-container text-[16px]">
            security_update_good
          </span>
          <span>Sensor Otomatis P2P Tanpa Rekaman Disimpan • Tinjauan Manusia 24/7</span>
        </div>
      </div>
    </div>
  );
}
