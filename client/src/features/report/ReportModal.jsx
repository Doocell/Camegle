import React, { useState, useEffect } from 'react';
import socket from '../../lib/socket.js';
import { EVENTS } from '../../lib/events.js';

const REPORT_REASONS = [
  {
    value: 'sexual_content',
    icon: 'explicit',
    iconColor: 'text-error',
    title: 'Konten Seksual & Ketelanjangan',
    desc: 'Indikasi pornografi atau perilaku tidak senonoh',
  },
  {
    value: 'harassment',
    icon: 'front_hand',
    iconColor: 'text-tertiary',
    title: 'Pelecehan & Intimidasi',
    desc: 'Ancaman, kata kasar, atau ejekan berbau SARA',
  },
  {
    value: 'underage',
    icon: 'person_alert',
    iconColor: 'text-primary-container',
    title: 'Pengguna Di Bawah Umur',
    desc: 'Terlihat atau mengaku berumur di bawah 18 tahun',
  },
  {
    value: 'spam_bot',
    icon: 'smart_toy',
    iconColor: 'text-outline',
    title: 'Spam, Bot, atau Promosi Liar',
    desc: 'Jualan tanpa izin, tautan mencurigakan, atau rekaman palsu',
  },
  {
    value: 'other',
    icon: 'more_horiz',
    iconColor: 'text-on-surface-variant',
    title: 'Lainnya',
    desc: 'Perilaku lain yang mengganggu kenyamanan mengobrol',
  },
];

/**
 * Mengambil 1 tangkapan frame dari elemen <video> lawan bicara (JPEG kompresi rendah)
 */
export function captureVideoSnapshot(videoEl) {
  if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) {
    return '';
  }
  try {
    const canvas = document.createElement('canvas');
    const targetWidth = 320;
    const scale = targetWidth / videoEl.videoWidth;
    canvas.width = targetWidth;
    canvas.height = Math.round(videoEl.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.4);
  } catch {
    return '';
  }
}

/**
 * Komponen F7: ReportModal
 * Menggunakan desain asli Stitch "camelgle - Laporkan Pengguna (Report Modal Desktop)".
 */
export default function ReportModal({
  isOpen,
  roomId,
  remoteVideoRef,
  chatLog = [],
  onClose,
  onSubmitted,
}) {
  const [selectedReason, setSelectedReason] = useState('sexual_content');
  const [notes, setNotes] = useState('');
  const [capturedSnapshot, setCapturedSnapshot] = useState('');

  // Ambil snapshot frame lawan bicara tepat saat tombol Report diklik (isOpen === true)
  // agar tetap terekam meskipun lawan langsung mematikan kamera atau keluar
  useEffect(() => {
    if (isOpen) {
      const snap = captureVideoSnapshot(remoteVideoRef?.current);
      setCapturedSnapshot(snap);
    } else {
      setCapturedSnapshot('');
    }
  }, [isOpen, remoteVideoRef]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomId) return;

    const snapshot = capturedSnapshot || captureVideoSnapshot(remoteVideoRef?.current);

    socket.emit(EVENTS.REPORT_SUBMIT, {
      roomId,
      reason: selectedReason,
      notes: notes.trim().slice(0, 250),
      snapshot,
      chatLog,
    });

    setNotes('');
    if (onSubmitted) {
      onSubmitted();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A0E08]/75 backdrop-blur-md flex items-center justify-center p-space-md overflow-y-auto select-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-report-title"
        className="w-full max-w-[560px] bg-surface-container-lowest rounded-[28px] shadow-[0_24px_64px_rgba(40,24,15,0.32)] overflow-hidden flex flex-col relative z-50 my-auto"
      >
        {/* Top Decorative Desert Rim Ambient Glow */}
        <div className="h-2 w-full bg-gradient-to-r from-primary-container via-tertiary-container to-error opacity-90" />

        <form onSubmit={handleSubmit} className="p-space-xl md:p-[2.25rem] flex flex-col space-y-gutter-lg">
          {/* Header Section */}
          <div className="flex items-start space-x-space-md">
            <div className="w-14 h-14 rounded-full bg-error-container/60 flex items-center justify-center flex-shrink-0 text-error shadow-sm">
              <span
                className="material-symbols-outlined text-[30px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                shield
              </span>
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center space-x-space-xs mb-1">
                <h2
                  id="modal-report-title"
                  className="font-headline-md text-headline-md text-on-surface tracking-tight"
                >
                  Laporkan Pengguna
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                  Penting
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                Bantu <span className="font-headline-sm text-primary font-bold">camelgle</span>{' '}
                menjaga ruang obrolan tetap aman, santun, dan nyaman untuk semua petualang.
              </p>
            </div>
          </div>

          {/* Violation Categories (Radio Option List) */}
          <div role="radiogroup" aria-label="Alasan Pelanggaran" className="space-y-space-xs">
            {REPORT_REASONS.map((item) => {
              const checked = selectedReason === item.value;
              return (
                <label
                  key={item.value}
                  className={`group relative flex items-center justify-between p-space-md rounded-DEFAULT cursor-pointer transition-all duration-150 ${
                    checked
                      ? 'bg-[#FFF3EE] shadow-[0_4px_16px_rgba(186,26,26,0.08)] border border-error/30'
                      : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center space-x-space-md min-w-0 pr-2">
                    <span
                      className={`material-symbols-outlined ${item.iconColor} text-[22px] flex-shrink-0 group-hover:scale-110 transition-transform`}
                    >
                      {item.icon}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-lg text-label-lg text-on-surface font-bold truncate">
                        {item.title}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant/90 truncate">
                        {item.desc}
                      </span>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="report_reason"
                    value={item.value}
                    checked={checked}
                    onChange={() => setSelectedReason(item.value)}
                    className="w-5 h-5 accent-error cursor-pointer flex-shrink-0"
                  />
                </label>
              );
            })}
          </div>

          {/* Optional Text Area */}
          <div className="flex flex-col space-y-space-xs">
            <div className="flex justify-between items-center px-1">
              <label
                htmlFor="report-notes"
                className="font-label-md text-label-md text-on-surface font-semibold"
              >
                Catatan tambahan (opsional):
              </label>
              <span className="font-label-sm text-label-sm text-outline">
                {notes.length} / 250
              </span>
            </div>
            <textarea
              id="report-notes"
              rows={2}
              maxLength={250}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tuliskan detail singkat jika diperlukan..."
              className="w-full rounded-DEFAULT p-3 bg-surface-container-low text-on-surface placeholder:text-outline-variant font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition duration-150 resize-none"
            />
          </div>

          {/* Privacy Shield Micro-Badge */}
          <div className="flex items-center space-x-space-sm p-space-sm px-space-md rounded-full bg-surface-container-high/60">
            <span
              className="material-symbols-outlined text-secondary text-[18px] flex-shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              lock
            </span>
            <p className="font-label-sm text-label-sm text-on-surface-variant leading-snug">
              Laporan bersifat anonim (menyertakan bukti 1 snapshot frame & 10 pesan terakhir). Setelah dikirim, Anda langsung dialihkan ke teman baru.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end space-y-space-sm sm:space-y-0 sm:space-x-space-md pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-space-xl py-3 rounded-full bg-surface-container text-on-surface-variant font-label-lg text-label-lg hover:bg-surface-container-high active:scale-95 transition-all text-center cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-space-xl py-3.5 rounded-full bg-error text-on-error font-label-lg text-label-lg shadow-[0_8px_20px_rgba(186,26,26,0.3)] hover:opacity-95 active:scale-95 transition-all flex items-center justify-center space-x-space-xs group cursor-pointer"
            >
              <span className="material-symbols-outlined text-[19px] group-hover:rotate-12 transition-transform">
                block
              </span>
              <span>Kirim Laporan & Lanjut (Next)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
