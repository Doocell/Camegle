import React, { useState } from 'react';

const STORAGE_KEY = 'camelgle_age_verified_18';

export function hasAgeConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

export function saveAgeConsent() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch (e) {
    // Abaikan jika browser memblokir localStorage (mode privat ketat)
  }
}

export function clearAgeConsent() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Abaikan
  }
}

export default function AgeGateModal({ isOpen, onConfirm, onCancel, onOpenLegal }) {
  const [isChecked, setIsChecked] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!isChecked) return;
    saveAgeConsent();
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md sm:p-space-xl overflow-y-auto select-none">
      {/* Immersive Desert Landscape Backdrop with Sand Dunes (Stitch Design) */}
      <div
        className="fixed inset-0 bg-cover bg-center w-full h-full scale-105 filter blur-md transform -z-20 pointer-events-none"
        style={{
          backgroundImage:
            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCwqALa4QDmai9Fz2vhQGdsKnaiVwujBOUBgbYuy6l3RDP21b7Gjw0-rXqnfOqd0vsaBipchFtR-Yxp6wQTcdwh3ZiDhqWj_8mHthCES2c4wIOd6K4G6ABKx9tJEtn667Catr2MhbxytUbfiz_80tSDY13uVVahf5Zf5xBWX4bb2F0t-GaJW3pojbfGlqES7zbGfbK6xd5-JPKSn7eLAkIbruMCn-K9_XlmAuo0BW7L')",
        }}
      />
      <div className="fixed inset-0 bg-inverse-surface/75 backdrop-blur-sm -z-10" onClick={onCancel} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] bg-primary-container/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Central Modal Window (Warm Ivory/Sand Surface, 540px Max Width) */}
      <div className="relative w-full max-w-[540px] bg-surface-container-lowest text-on-surface rounded-lg shadow-2xl p-space-lg sm:p-space-xl border border-outline-variant/30 my-auto">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center mb-space-md">
            <div className="absolute inset-0 rounded-full bg-primary-container/30 blur-md animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-primary shadow-sm">
              <span
                className="material-symbols-outlined text-[34px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                cruelty_free
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-primary text-on-primary rounded-full px-space-xs py-0.5 shadow-sm flex items-center">
              <span className="font-label-sm text-label-sm font-bold">18+</span>
            </div>
          </div>

          <span className="text-tertiary font-label-md text-label-md uppercase tracking-wider mb-space-xs font-bold">
            Verifikasi Komunitas
          </span>
          <h2 className="text-primary font-headline-lg text-headline-lg tracking-tight">
            Sebelum berangkat
          </h2>
          <p className="text-on-surface-variant font-body-md text-body-md mt-space-xs max-w-md">
            camelgle adalah ruang persinggahan video khusus dewasa (18+) yang santun, ramah, dan saling menghormati.
          </p>
        </div>

        {/* 3 Key Pillars of Community Guidelines */}
        <div className="mt-space-lg flex flex-col gap-space-sm">
          <div className="flex items-start gap-space-md p-space-md bg-surface-container-low rounded-DEFAULT">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex-shrink-0 flex items-center justify-center text-tertiary">
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                shield
              </span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-on-surface font-headline-sm text-headline-sm">
                Bebas Konten Sensitif & Rekaman Tanpa Izin
              </h3>
              <p className="text-on-surface-variant font-body-sm text-body-sm mt-0.5">
                Dilarang keras konten seksual/ketelanjangan, kekerasan, pelecehan, merekam tanpa izin, atau mengaku di bawah umur.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-space-md p-space-md bg-surface-container-low rounded-DEFAULT">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex-shrink-0 flex items-center justify-center text-secondary">
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                handshake
              </span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-on-surface font-headline-sm text-headline-sm">
                Santun & Menghormati Sesama
              </h3>
              <p className="text-on-surface-variant font-body-sm text-body-sm mt-0.5">
                Sambut teman baru dengan ramah. Pelanggaran aturan akan dikenakan pemblokiran perangkat & IP secara otomatis.
              </p>
            </div>
          </div>
        </div>

        {/* Mandatory Checkbox Consent (PRD F1 Requirement) */}
        <label
          htmlFor="age-consent-checkbox"
          className="mt-space-lg p-space-md rounded-DEFAULT bg-surface-container/60 border border-outline-variant/40 flex items-start gap-space-sm cursor-pointer hover:bg-surface-container transition-colors"
        >
          <input
            id="age-consent-checkbox"
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="w-5 h-5 mt-0.5 rounded accent-primary cursor-pointer shrink-0"
          />
          <span className="font-body-sm text-body-sm text-on-surface leading-snug">
            <strong>Saya berusia 18 tahun ke atas</strong> dan setuju mematuhi{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (onOpenLegal) onOpenLegal('guidelines');
              }}
              className="text-primary font-bold underline hover:text-tertiary"
            >
              Pedoman Komunitas
            </button>
            ,{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (onOpenLegal) onOpenLegal('terms');
              }}
              className="text-primary font-bold underline hover:text-tertiary"
            >
              Ketentuan Layanan
            </button>
            , serta{' '}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (onOpenLegal) onOpenLegal('privacy');
              }}
              className="text-primary font-bold underline hover:text-tertiary"
            >
              Kebijakan Privasi
            </button>
            .
          </span>
        </label>

        {/* Action Buttons */}
        <div className="mt-space-lg flex flex-col gap-space-xs">
          <button
            type="button"
            disabled={!isChecked}
            onClick={handleConfirm}
            className={`w-full py-space-md px-space-xl rounded-full font-label-lg text-label-lg flex items-center justify-center gap-space-xs transition-all ${
              isChecked
                ? 'bg-gradient-to-r from-primary-container to-tertiary text-on-primary shadow-lg shadow-tertiary/25 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                : 'bg-surface-dim text-on-surface-variant/50 cursor-not-allowed'
            }`}
          >
            <span>Saya Berusia 18+ & Lanjutkan</span>
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-space-sm text-center font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    </div>
  );
}
