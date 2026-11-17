import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import socket from '../../lib/socket.js';
import { EVENTS } from '../../lib/events.js';
import { SOCKET_URL } from '../../lib/constants.js';

const SESSION_PWD_KEY = 'camelgle_admin_pwd';

const REASON_META = {
  sexual_content: {
    label: 'Konten Seksual & Ketelanjangan',
    icon: 'explicit',
    badgeClass: 'bg-error-container text-on-error-container border-error/25',
  },
  harassment: {
    label: 'Pelecehan & Intimidasi',
    icon: 'front_hand',
    badgeClass: 'bg-tertiary-fixed text-[#3b0900] border-tertiary/25',
  },
  underage: {
    label: 'Indikasi Di Bawah Umur (<18)',
    icon: 'person_alert',
    badgeClass: 'bg-primary-fixed text-on-primary-fixed border-primary/25',
  },
  spam_bot: {
    label: 'Spam, Bot, atau Promosi Liar',
    icon: 'smart_toy',
    badgeClass: 'bg-surface-container-highest text-on-surface-variant border-outline-variant/40',
  },
  other: {
    label: 'Pelanggaran Lainnya',
    icon: 'flag',
    badgeClass: 'bg-surface-container-high text-on-surface border-outline-variant/30',
  },
};

function getReasonMeta(reason = '') {
  if (reason.startsWith('ai_moderation')) {
    const subType = reason.split(':')[1] || 'NSFW';
    return {
      label: `Intervensi AI Otomatis (${subType})`,
      icon: 'shield_lock',
      badgeClass: 'bg-[#28180f] text-primary-fixed-dim border-primary-container/40',
    };
  }
  return (
    REASON_META[reason] || {
      label: reason || 'Laporan Komunitas',
      icon: 'report',
      badgeClass: 'bg-surface-container-high text-on-surface border-outline-variant/30',
    }
  );
}

function formatRemainingTime(expiresAt) {
  if (!expiresAt) return '-';
  const diffMs = expiresAt - Date.now();
  if (diffMs <= 0) return 'Kedaluwarsa';
  const totalHours = Math.floor(diffMs / (3600 * 1000));
  const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const remHours = totalHours % 24;
    return `${days} hari ${remHours} jam`;
  }
  return `${totalHours}j ${mins}m`;
}

/**
 * Halaman F7 & F9: /admin/reports & /admin
 * Dirancang mengikuti estetika Stitch Camelgle ("Sunlit Sand Sanctuary & Warm Desert Campfire").
 */
export default function AdminReportsPage() {
  const [password, setPassword] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_PWD_KEY) || '';
    } catch {
      return '';
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reports, setReports] = useState([]);
  const [bans, setBans] = useState([]);
  const [onlineCount, setOnlineCount] = useState(1);

  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'bans' | 'manual_ban'
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [safeBlurDefault, setSafeBlurDefault] = useState(true);
  const [unblurredIds, setUnblurredIds] = useState({});
  const [zoomedSnapshot, setZoomedSnapshot] = useState(null);
  const [selectedBanHours, setSelectedBanHours] = useState({});

  const [manualFp, setManualFp] = useState('');
  const [manualIp, setManualIp] = useState('');
  const [manualReason, setManualReason] = useState(
    'Pelanggaran Pedoman Komunitas Camelgle (Tindakan Moderator)'
  );
  const [manualDuration, setManualDuration] = useState(24);

  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toastNotice, setToastNotice] = useState(null);

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

  const showToast = (text, type = 'success') => {
    setToastNotice({ text, type });
    setTimeout(() => {
      setToastNotice((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const fetchDashboardData = async (pwd = password) => {
    if (!pwd) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${SOCKET_URL}/api/admin/reports`, {
        headers: {
          'x-admin-password': pwd,
        },
      });
      if (!res.ok) {
        throw new Error('Kata sandi moderator tidak valid atau akses ditolak (401).');
      }
      const data = await res.json();
      setReports(data.reports || []);
      setBans(data.bans || []);
      setIsAuthenticated(true);
      try {
        sessionStorage.setItem(SESSION_PWD_KEY, pwd);
      } catch {
        // Ignore storage error
      }
    } catch (err) {
      setErrorMsg(err.message);
      setIsAuthenticated(false);
      try {
        sessionStorage.removeItem(SESSION_PWD_KEY);
      } catch {
        // Ignore
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (password && !isAuthenticated) {
      fetchDashboardData(password);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    fetchDashboardData(password);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    setReports([]);
    setBans([]);
    try {
      sessionStorage.removeItem(SESSION_PWD_KEY);
    } catch {
      // Ignore
    }
  };

  const handleManualBanFromReport = async (report) => {
    const hours = Number(selectedBanHours[report.id] || 24);
    try {
      const res = await fetch(`${SOCKET_URL}/api/admin/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          reportId: report.id,
          fingerprint: report.reportedFingerprint,
          ip: report.reportedIp,
          reason: `Tindakan Moderator atas Laporan #${report.id} (${getReasonMeta(report.reason).label})`,
          durationHours: hours,
        }),
      });
      if (!res.ok) throw new Error('Gagal memproses pemblokiran');
      showToast(
        `Perangkat (${report.reportedFingerprint || 'Anonim'} / IP ${report.reportedIp || '-'}) berhasil dikarantina selama ${hours} jam.`
      );
      fetchDashboardData(password);
    } catch (err) {
      showToast(`Gagal: ${err.message}`, 'error');
    }
  };

  const handleCreateCustomBan = async (e) => {
    e.preventDefault();
    if (!manualFp.trim() && !manualIp.trim()) {
      showToast('Masukkan minimal Fingerprint atau Alamat IP yang ingin diblokir.', 'error');
      return;
    }
    try {
      const res = await fetch(`${SOCKET_URL}/api/admin/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          fingerprint: manualFp.trim() || null,
          ip: manualIp.trim() || null,
          reason: manualReason.trim() || 'Diblokir manual oleh Moderator Trust & Safety',
          durationHours: Number(manualDuration) || 24,
        }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan blokir manual');
      setManualFp('');
      setManualIp('');
      showToast('Identitas berhasil ditambahkan ke daftar karantina aktif.');
      setActiveTab('bans');
      fetchDashboardData(password);
    } catch (err) {
      showToast(`Gagal: ${err.message}`, 'error');
    }
  };

  const handleToggleFlag = async (report) => {
    try {
      const nextFlagged = !report.flaggedForAction;
      const res = await fetch(`${SOCKET_URL}/api/admin/reports/${report.id}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ flagged: nextFlagged }),
      });
      if (!res.ok) throw new Error('Gagal memperbarui status retensi laporan');
      showToast(
        nextFlagged
          ? `Laporan #${report.id} ditandai untuk tindak lanjut (disimpan permanen >7 hari).`
          : `Penanda tindak lanjut Laporan #${report.id} dilepas.`
      );
      fetchDashboardData(password);
    } catch (err) {
      showToast(`Gagal: ${err.message}`, 'error');
    }
  };

  const handleDeleteReport = async (reportId) => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/admin/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': password,
        },
      });
      if (!res.ok) throw new Error('Gagal menghapus laporan');
      showToast(`Laporan #${reportId} telah dihapus dari antrean.`);
      fetchDashboardData(password);
    } catch (err) {
      showToast(`Gagal: ${err.message}`, 'error');
    }
  };

  const handleUnban = async (ban) => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/admin/bans/${ban.id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': password,
        },
      });
      if (!res.ok) throw new Error('Gagal mencabut blokir');
      showToast(
        `Karantina untuk ${ban.fingerprint || ban.ip || `#${ban.id}`} berhasil dicabut.`
      );
      fetchDashboardData(password);
    } catch (err) {
      showToast(`Gagal: ${err.message}`, 'error');
    }
  };

  const handleCopyText = (text, label) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    showToast(`${label} disalin ke papan klip.`);
  };

  const isIdentityCurrentlyBanned = (fp, ip) => {
    return bans.some(
      (b) => (fp && b.fingerprint === fp) || (ip && b.ip === ip && ip !== '127.0.0.1')
    );
  };

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (filterCategory === 'flagged' && !r.flaggedForAction) return false;
      if (filterCategory === 'ai_moderation' && !String(r.reason).startsWith('ai_moderation')) {
        return false;
      }
      if (
        filterCategory !== 'all' &&
        filterCategory !== 'flagged' &&
        filterCategory !== 'ai_moderation' &&
        r.reason !== filterCategory
      ) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchFp = (r.reportedFingerprint || '').toLowerCase().includes(q);
        const matchIp = (r.reportedIp || '').toLowerCase().includes(q);
        const matchNotes = (r.notes || '').toLowerCase().includes(q);
        const matchRoom = (r.roomId || '').toLowerCase().includes(q);
        const matchReason = (r.reason || '').toLowerCase().includes(q);
        return matchFp || matchIp || matchNotes || matchRoom || matchReason;
      }
      return true;
    });
  }, [reports, filterCategory, searchQuery]);

  const stats = useMemo(() => {
    const aiCount = reports.filter((r) => String(r.reason).startsWith('ai_moderation')).length;
    const flaggedCount = reports.filter((r) => r.flaggedForAction).length;
    return {
      totalReports: reports.length,
      userReports: reports.length - aiCount,
      aiCount,
      flaggedCount,
      activeBans: bans.length,
    };
  }, [reports, bans]);

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col justify-between relative overflow-x-hidden">
      {/* Ambient Sunlit Sand Sanctuary Lighting Orbs */}
      <div className="fixed -top-32 -left-32 w-96 h-96 rounded-full bg-surface-container-high/50 blur-3xl pointer-events-none z-0" />
      <div className="fixed top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full bg-primary-fixed-dim/20 blur-3xl pointer-events-none z-0" />

      {/* Top Global Sticky Header (Matching Landing.jsx & LegalView.jsx Stitch Design) */}
      <header className="sticky top-0 left-0 right-0 w-full z-40 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(40,24,15,0.05)] border-b border-outline-variant/15">
        <div className="h-20 max-w-7xl mx-auto px-margin-md sm:px-margin-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-space-md sm:gap-space-lg">
            <Link to="/" className="flex items-center gap-space-sm text-primary group">
              <div className="w-10 h-10 rounded-full bg-surface-container-high group-hover:bg-primary-container transition-colors flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-primary group-hover:text-on-primary-container">
                  terrain
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-headline-md text-headline-md tracking-tight text-on-surface lowercase font-bold leading-none">
                    camelgle
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#28180f] text-primary-fixed-dim font-label-sm text-label-sm uppercase tracking-wider font-bold">
                    Sentinel Admin
                  </span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant hidden sm:inline">
                  Oase Trust & Safety • Pusat Moderasi Komunitas
                </span>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-low border border-outline-variant/20">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                {onlineCount} musafir online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && (
              <>
                <button
                  type="button"
                  onClick={() => fetchDashboardData(password)}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-all cursor-pointer shadow-sm"
                >
                  <span
                    className={`material-symbols-outlined text-[18px] text-primary ${
                      loading ? 'animate-spin' : ''
                    }`}
                  >
                    refresh
                  </span>
                  <span className="hidden sm:inline">Muat Ulang</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-error-container/60 hover:bg-error-container text-on-error-container font-label-md text-label-md transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </>
            )}

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-label-md text-label-md font-bold shadow transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">home</span>
              <span className="hidden sm:inline">Beranda</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Toast Notification Banner */}
      {toastNotice && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-[#28180f] text-[#ffede5] px-5 py-3.5 rounded-2xl shadow-[0_20px_50px_rgba(40,24,15,0.35)] border border-primary-container/40 flex items-center gap-3 animate-bounce">
          <span
            className={`material-symbols-outlined ${
              toastNotice.type === 'error' ? 'text-error' : 'text-primary-container'
            }`}
          >
            {toastNotice.type === 'error' ? 'warning' : 'verified'}
          </span>
          <span className="font-body-sm text-body-sm flex-1">{toastNotice.text}</span>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            className="text-xs text-primary-fixed-dim hover:underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Lightbox Modal untuk Zoom Bukti Snapshot */}
      {zoomedSnapshot && (
        <div
          className="fixed inset-0 z-50 bg-[#1A0E08]/85 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setZoomedSnapshot(null)}
        >
          <div
            className="bg-surface-container-lowest rounded-[28px] max-w-2xl w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error">photo_camera</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Bukti Tangkapan Layar Laporan #{zoomedSnapshot.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setZoomedSnapshot(null)}
                className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <img
              src={zoomedSnapshot.snapshot}
              alt={`Snapshot #${zoomedSnapshot.id}`}
              className="w-full rounded-2xl bg-black object-contain max-h-[65vh] border border-outline-variant/30"
            />
            <div className="flex flex-wrap items-center justify-between text-xs text-on-surface-variant gap-2">
              <span>
                Terlapor: <strong className="font-mono">{zoomedSnapshot.reportedFingerprint || 'anonim'}</strong> ({zoomedSnapshot.reportedIp || '-'})
              </span>
              <span>{new Date(zoomedSnapshot.createdAt).toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-margin-md sm:px-margin-lg py-space-xl">
        {!isAuthenticated ? (
          /* ================= 1. STITCH DESERT SANCTUARY LOGIN SCREEN ================= */
          <div className="min-h-[72vh] flex flex-col items-center justify-center py-8">
            <div className="w-full max-w-[500px] bg-surface-container-lowest rounded-[28px] shadow-[0_24px_64px_rgba(40,24,15,0.14)] border border-outline-variant/25 overflow-hidden">
              {/* Top Decorative Desert Rim Gradient */}
              <div className="h-2.5 w-full bg-gradient-to-r from-primary-container via-tertiary-container to-error" />

              <form onSubmit={handleLogin} className="p-8 sm:p-10 space-y-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-primary shadow-inner">
                    <span
                      className="material-symbols-outlined text-[34px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      admin_panel_settings
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-surface-container-low text-primary font-label-sm text-label-sm uppercase tracking-wider font-bold">
                    <span className="material-symbols-outlined text-[15px]">verified_user</span>
                    <span>Gerbang Penjaga Oase • F7 & F9</span>
                  </div>

                  <h1 className="font-headline-md text-headline-md text-on-surface tracking-tight">
                    Masuk Panel Trust & Safety
                  </h1>
                  <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm leading-relaxed">
                    Ruang khusus moderator <strong className="text-primary">camelgle</strong> untuk
                    meninjau bukti snapshot laporan, log percakapan, serta mengelola karantina
                    perangkat.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-4 rounded-2xl bg-error-container/70 border border-error/30 text-on-error-container flex items-start gap-3">
                    <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">
                      error
                    </span>
                    <span className="font-body-sm text-body-sm font-semibold">{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label
                    htmlFor="admin-password-input"
                    className="block font-label-md text-label-md text-on-surface font-semibold"
                  >
                    Kata Sandi Moderator (<code>ADMIN_PASSWORD</code>)
                  </label>
                  <div className="relative">
                    <input
                      id="admin-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi moderator..."
                      autoFocus
                      className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-surface-container-low text-on-surface placeholder:text-outline font-body-md focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container border border-outline-variant/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
                      title={showPassword ? 'Sembunyikan Sandi' : 'Tampilkan Sandi'}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !password}
                  className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary font-label-lg text-label-lg font-bold shadow-[0_10px_24px_rgba(139,80,0,0.25)] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">lock_open</span>
                  <span>{loading ? 'Memverifikasi Otoritas...' : 'Buka Konsol Moderasi'}</span>
                </button>

                <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-secondary">
                      schedule
                    </span>
                    Retensi bukti otomatis 7 hari
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-primary">
                      gavel
                    </span>
                    Auto-Ban 3 laporan / 24j
                  </span>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* ================= 2. AUTHENTICATED STITCH ADMIN CONSOLE ================= */
          <div className="space-y-8">
            {/* Hero Banner & Mode Switcher */}
            <section className="bg-gradient-to-br from-[#28180f] via-[#342015] to-[#1E1410] text-[#ffede5] rounded-[28px] p-6 sm:p-8 shadow-[0_20px_50px_rgba(40,24,15,0.18)] relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-primary-container/15 blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-primary-fixed-dim font-label-sm text-label-sm uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-ping" />
                    <span>Trust & Safety Sentinel Aktif</span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg text-white tracking-tight">
                    Pusat Kendali Moderasi & Disiplin Jaringan
                  </h1>
                  <p className="font-body-sm text-body-sm text-[#d8c3ad]/85 leading-relaxed">
                    Kelola laporan masuk beserta bukti 1 frame snapshot & 10 pesan terakhir. Laporan
                    reguler dihapus otomatis setelah 7 hari kecuali ditandai untuk tindak lanjut.
                  </p>
                </div>

                {/* Navigation Pill Tabs */}
                <div className="flex flex-wrap items-center gap-2 bg-[#160e0b]/80 p-1.5 rounded-full border border-white/10 self-start lg:self-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('reports')}
                    className={`px-4 py-2.5 rounded-full font-label-md text-label-md font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'reports'
                        ? 'bg-primary-container text-[#28180f] shadow'
                        : 'text-[#d8c3ad] hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">flag</span>
                    <span>Laporan ({stats.totalReports})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bans')}
                    className={`px-4 py-2.5 rounded-full font-label-md text-label-md font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'bans'
                        ? 'bg-primary-container text-[#28180f] shadow'
                        : 'text-[#d8c3ad] hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">block</span>
                    <span>Karantina Aktif ({stats.activeBans})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manual_ban')}
                    className={`px-4 py-2.5 rounded-full font-label-md text-label-md font-bold flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'manual_ban'
                        ? 'bg-primary-container text-[#28180f] shadow'
                        : 'text-[#d8c3ad] hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">add_moderator</span>
                    <span>Blokir Manual</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Bento KPI Summary Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-surface-container-lowest rounded-[24px] p-5 shadow-[0_8px_24px_rgba(40,24,15,0.05)] border border-outline-variant/20 flex items-start justify-between">
                <div className="space-y-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Total Laporan Masuk
                  </span>
                  <p className="font-headline-lg text-headline-lg text-on-surface font-extrabold">
                    {stats.totalReports}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {stats.userReports} laporan pengguna • {stats.aiCount} intervensi AI
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-error-container/70 text-error flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">report</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-[24px] p-5 shadow-[0_8px_24px_rgba(40,24,15,0.05)] border border-outline-variant/20 flex items-start justify-between">
                <div className="space-y-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Ditandai Tindak Lanjut
                  </span>
                  <p className="font-headline-lg text-headline-lg text-primary font-extrabold">
                    {stats.flaggedCount}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Disimpan melewati batas 7 hari
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">bookmark_added</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-[24px] p-5 shadow-[0_8px_24px_rgba(40,24,15,0.05)] border border-outline-variant/20 flex items-start justify-between">
                <div className="space-y-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Karantina Aktif (F9)
                  </span>
                  <p className="font-headline-lg text-headline-lg text-tertiary font-extrabold">
                    {stats.activeBans}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    Fingerprint & IP sedang diblokir
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed text-tertiary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">gavel</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-[24px] p-5 shadow-[0_8px_24px_rgba(40,24,15,0.05)] border border-outline-variant/20 flex items-start justify-between">
                <div className="space-y-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    Polisi Otomatis (AI + Guard)
                  </span>
                  <p className="font-headline-sm text-headline-sm text-secondary font-extrabold pt-1">
                    3 Laporan = Auto-Ban
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    NSFWJS 2-Strike & Rate Limit Aktif
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">shield_lock</span>
                </div>
              </div>
            </section>

            {/* ================= TAB 1: DAFTAR LAPORAN (REPORTS) ================= */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                {/* Filter & Search Bar */}
                <div className="bg-surface-container-low rounded-[24px] p-4 sm:p-5 border border-outline-variant/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { id: 'all', label: 'Semua Laporan' },
                      { id: 'sexual_content', label: 'Konten Seksual' },
                      { id: 'harassment', label: 'Pelecehan' },
                      { id: 'underage', label: 'Di Bawah Umur' },
                      { id: 'spam_bot', label: 'Spam / Bot' },
                      { id: 'ai_moderation', label: 'Deteksi AI NSFW' },
                      { id: 'flagged', label: 'Ditandai (>7 Hari)' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFilterCategory(tab.id)}
                        className={`px-3.5 py-1.5 rounded-full font-label-sm text-label-sm font-bold transition-all cursor-pointer ${
                          filterCategory === tab.id
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative min-w-[240px]">
                      <span className="material-symbols-outlined text-[18px] text-outline absolute left-3.5 top-1/2 -translate-y-1/2">
                        search
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari Fingerprint, IP, catatan..."
                        className="w-full pl-10 pr-4 py-2 rounded-full bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-sm text-body-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSafeBlurDefault((prev) => !prev);
                        setUnblurredIds({});
                      }}
                      className={`px-4 py-2 rounded-full font-label-sm text-label-sm font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                        safeBlurDefault
                          ? 'bg-surface-container-highest text-on-surface border-outline-variant/40'
                          : 'bg-error-container text-on-error-container border-error/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {safeBlurDefault ? 'blur_on' : 'blur_off'}
                      </span>
                      <span>{safeBlurDefault ? 'Blur Aman Aktif' : 'Blur Aman Mati'}</span>
                    </button>
                  </div>
                </div>

                {/* Report List */}
                {filteredReports.length === 0 ? (
                  <div className="bg-surface-container-lowest rounded-[28px] p-14 text-center border border-outline-variant/20 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-surface-container-low mx-auto flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[32px]">verified</span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">
                      Tidak Ada Laporan yang Cocok
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mx-auto">
                      Belum ada laporan pelanggaran pada filter ini. Oase pertemuan dalam kondisi
                      kondusif.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {filteredReports.map((rep) => {
                      const meta = getReasonMeta(rep.reason);
                      const isBlurred = safeBlurDefault && !unblurredIds[rep.id];
                      const alreadyBanned = isIdentityCurrentlyBanned(
                        rep.reportedFingerprint,
                        rep.reportedIp
                      );

                      return (
                        <article
                          key={rep.id}
                          className="bg-surface-container-lowest rounded-[28px] p-6 sm:p-7 shadow-[0_12px_32px_rgba(40,24,15,0.06)] border border-outline-variant/25 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
                        >
                          {/* Left Column: Snapshot Frame Evidence */}
                          <div className="lg:col-span-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">
                                Bukti Snapshot Frame
                              </span>
                              <span className="font-mono text-xs text-outline">#{rep.id}</span>
                            </div>

                            {rep.snapshot ? (
                              <div className="relative group w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#160e0b] border border-outline-variant/30 shadow-inner">
                                <img
                                  src={rep.snapshot}
                                  alt={`Bukti laporan #${rep.id}`}
                                  className={`w-full h-full object-cover transition-all duration-300 ${
                                    isBlurred ? 'blur-xl scale-105' : ''
                                  }`}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 flex flex-col justify-between p-3">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setUnblurredIds((prev) => ({
                                          ...prev,
                                          [rep.id]: !prev[rep.id],
                                        }))
                                      }
                                      className="px-3 py-1 rounded-full bg-black/70 hover:bg-black text-white font-label-sm text-label-sm flex items-center gap-1 cursor-pointer backdrop-blur-sm"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">
                                        {isBlurred ? 'visibility' : 'visibility_off'}
                                      </span>
                                      <span>{isBlurred ? 'Buka Blur' : 'Sembunyikan'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setZoomedSnapshot(rep)}
                                      className="w-7 h-7 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center cursor-pointer backdrop-blur-sm"
                                      title="Perbesar Gambar"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">
                                        zoom_in
                                      </span>
                                    </button>
                                  </div>
                                  <span className="text-[11px] text-white/80 font-label-sm">
                                    JPEG Tangkapan Kanvas • 320px
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full aspect-[4/3] rounded-2xl bg-surface-container-low border border-dashed border-outline-variant/40 flex flex-col items-center justify-center text-on-surface-variant p-4 text-center gap-2">
                                <span className="material-symbols-outlined text-[28px] text-outline">
                                  hide_image
                                </span>
                                <span className="font-label-sm text-label-sm">
                                  Tidak ada frame snapshot (Laporan AI / Kamera mati)
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-on-surface-variant bg-surface-container-low px-3.5 py-2 rounded-xl">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px]">
                                  schedule
                                </span>
                                {new Date(rep.createdAt).toLocaleString('id-ID')}
                              </span>
                              <span className="font-mono text-[11px] truncate max-w-[120px]" title={rep.roomId}>
                                Room: {String(rep.roomId).slice(0, 8)}
                              </span>
                            </div>
                          </div>

                          {/* Right Column: Metadata, Chat Log, & Moderator Controls */}
                          <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
                            {/* Top Badges */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-label-md text-label-md font-bold border ${meta.badgeClass}`}
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    {meta.icon}
                                  </span>
                                  <span>{meta.label}</span>
                                </span>

                                {alreadyBanned && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-error text-on-error font-label-sm text-label-sm font-bold uppercase">
                                    <span className="material-symbols-outlined text-[14px]">
                                      block
                                    </span>
                                    Sedang Diblokir
                                  </span>
                                )}

                                {rep.flaggedForAction && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold">
                                    <span className="material-symbols-outlined text-[14px]">
                                      bookmark_added
                                    </span>
                                    Disimpan &gt;7 Hari
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteReport(rep.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/30 font-label-sm text-label-sm transition-colors cursor-pointer"
                                title="Hapus laporan ini"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  delete
                                </span>
                                <span>Hapus</span>
                              </button>
                            </div>

                            {/* Identity Details Box */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/20">
                              <div className="flex flex-col">
                                <span className="font-label-sm text-label-sm text-on-surface-variant">
                                  Fingerprint Terlapor
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-xs font-bold text-on-surface truncate">
                                    {rep.reportedFingerprint || 'anonim'}
                                  </span>
                                  {rep.reportedFingerprint && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopyText(
                                          rep.reportedFingerprint,
                                          'Fingerprint Terlapor'
                                        )
                                      }
                                      className="text-primary hover:opacity-80 cursor-pointer"
                                      title="Salin Fingerprint"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">
                                        content_copy
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col">
                                <span className="font-label-sm text-label-sm text-on-surface-variant">
                                  Alamat IP Terlapor
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-xs font-bold text-secondary truncate">
                                    {rep.reportedIp || '-'}
                                  </span>
                                  {rep.reportedIp && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopyText(rep.reportedIp, 'IP Terlapor')
                                      }
                                      className="text-primary hover:opacity-80 cursor-pointer"
                                      title="Salin IP"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">
                                        content_copy
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col">
                                <span className="font-label-sm text-label-sm text-on-surface-variant">
                                  Fingerprint Pelapor
                                </span>
                                <span className="font-mono text-xs text-on-surface-variant mt-0.5 truncate">
                                  {rep.reporterFingerprint || rep.reporterSocketId || 'anonim'}
                                </span>
                              </div>
                            </div>

                            {/* Reporter Notes */}
                            {rep.notes && (
                              <div className="bg-[#FFF3EE] border border-tertiary/20 rounded-2xl p-3.5 flex items-start gap-2.5">
                                <span className="material-symbols-outlined text-tertiary text-[18px] mt-0.5">
                                  format_quote
                                </span>
                                <p className="font-body-sm text-body-sm text-on-surface">
                                  <strong className="font-semibold">Catatan Pelapor:</strong>{' '}
                                  {rep.notes}
                                </p>
                              </div>
                            )}

                            {/* Last 10 Chat Messages Transcript */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">
                                  Transkrip 10 Pesan Chat Terakhir ({rep.chatLog?.length || 0})
                                </span>
                              </div>
                              <div className="max-h-36 overflow-y-auto bg-surface-container-low rounded-2xl p-3.5 space-y-2 border border-outline-variant/20">
                                {rep.chatLog && rep.chatLog.length > 0 ? (
                                  rep.chatLog.map((c, idx) => {
                                    const isOffender = c.sender === 'peer';
                                    return (
                                      <div
                                        key={idx}
                                        className="flex items-baseline justify-between gap-2 text-xs"
                                      >
                                        <div>
                                          <span
                                            className={`inline-block px-2 py-0.5 rounded-full font-bold mr-2 text-[11px] ${
                                              isOffender
                                                ? 'bg-error-container text-on-error-container'
                                                : 'bg-surface-container-highest text-on-surface-variant'
                                            }`}
                                          >
                                            {isOffender ? 'Terlapor' : 'Pelapor'}
                                          </span>
                                          <span className="text-on-surface font-body-sm">
                                            {c.text}
                                          </span>
                                        </div>
                                        {c.ts && (
                                          <span className="text-[10px] text-outline shrink-0 font-mono">
                                            {new Date(c.ts).toLocaleTimeString('id-ID', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              second: '2-digit',
                                            })}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="text-xs text-outline italic">
                                    Tidak ada percakapan teks yang terekam pada sesi ini.
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Action Toolbar */}
                            <div className="pt-2 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => handleToggleFlag(rep)}
                                className={`px-4 py-2.5 rounded-full font-label-md text-label-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  rep.flaggedForAction
                                    ? 'bg-primary-fixed text-on-primary-fixed border border-primary/30'
                                    : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  {rep.flaggedForAction ? 'bookmark_added' : 'bookmark'}
                                </span>
                                <span>
                                  {rep.flaggedForAction
                                    ? 'Ditandai Tindak Lanjut (>7 Hari)'
                                    : 'Tandai Tindak Lanjut'}
                                </span>
                              </button>

                              <div className="flex flex-wrap items-center gap-2">
                                <select
                                  aria-label="Durasi Blokir"
                                  value={selectedBanHours[rep.id] || 24}
                                  onChange={(e) =>
                                    setSelectedBanHours((prev) => ({
                                      ...prev,
                                      [rep.id]: Number(e.target.value),
                                    }))
                                  }
                                  className="px-3.5 py-2.5 rounded-full bg-surface-container-low text-on-surface font-label-sm text-label-sm font-bold border border-outline-variant/30 focus:outline-none cursor-pointer"
                                >
                                  <option value={1}>Karantina 1 Jam</option>
                                  <option value={24}>Karantina 24 Jam</option>
                                  <option value={168}>Karantina 7 Hari</option>
                                  <option value={720}>Karantina 30 Hari</option>
                                  <option value={87600}>Blokir Permanen</option>
                                </select>

                                <button
                                  type="button"
                                  onClick={() => handleManualBanFromReport(rep)}
                                  className="px-5 py-2.5 rounded-full bg-error hover:opacity-95 text-on-error font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-[0_6px_18px_rgba(186,26,26,0.28)] active:scale-95 transition-all cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    gavel
                                  </span>
                                  <span>
                                    {alreadyBanned ? 'Perbarui Blokir' : 'Ban Identitas Ini'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 2: DAFTAR KARANTINA AKTIF (ACTIVE BANS) ================= */}
            {activeTab === 'bans' && (
              <div className="space-y-5">
                <div className="bg-surface-container-low rounded-[24px] p-5 border border-outline-variant/20 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">
                      Daftar Perangkat & Jaringan dalam Karantina (`bans`)
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Identitas di bawah ini otomatis ditolak saat mencoba masuk ke antrean{' '}
                      <code>queue:join</code> dan diarahkan ke layar Akses Dibatasi (`F9`).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manual_ban')}
                    className="px-5 py-2.5 rounded-full bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_moderator</span>
                    <span>Tambah Blokir Manual</span>
                  </button>
                </div>

                {bans.length === 0 ? (
                  <div className="bg-surface-container-lowest rounded-[28px] p-14 text-center border border-outline-variant/20 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-surface-container-low mx-auto flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[32px]">lock_open</span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">
                      Tidak Ada Identitas yang Sedang Diblokir
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mx-auto">
                      Daftar karantina saat ini kosong. Blokir otomatis akan aktif apabila satu
                      identitas dilaporkan oleh 3 pengguna berbeda dalam 24 jam.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {bans.map((b) => (
                      <div
                        key={b.id}
                        className="bg-surface-container-lowest rounded-[24px] p-6 shadow-[0_8px_24px_rgba(40,24,15,0.06)] border border-error/25 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                              <span className="w-2 h-2 rounded-full bg-error animate-ping" />
                              Karantina #{b.id}
                            </span>
                            <span className="font-label-sm text-label-sm text-tertiary font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px]">
                                timer
                              </span>
                              Sisa: {formatRemainingTime(b.expiresAt)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-3 rounded-xl text-xs font-mono">
                            <div>
                              <span className="text-on-surface-variant block font-sans">
                                Fingerprint:
                              </span>
                              <strong className="text-on-surface">
                                {b.fingerprint || 'Semua (Berbasis IP)'}
                              </strong>
                            </div>
                            <div>
                              <span className="text-on-surface-variant block font-sans">
                                Alamat IP:
                              </span>
                              <strong className="text-secondary">{b.ip || '-'}</strong>
                            </div>
                          </div>

                          <p className="font-body-sm text-body-sm text-on-surface">
                            <strong>Alasan:</strong> {b.reason}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
                          <span>
                            Berakhir: {new Date(b.expiresAt).toLocaleString('id-ID')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUnban(b)}
                            className="px-4 py-2 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm font-bold flex items-center gap-1 hover:opacity-90 cursor-pointer shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              lock_open
                            </span>
                            <span>Cabut Blokir (Unban)</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 3: FORM BLOKIR MANUAL ================= */}
            {activeTab === 'manual_ban' && (
              <div className="max-w-2xl mx-auto bg-surface-container-lowest rounded-[28px] shadow-[0_16px_44px_rgba(40,24,15,0.08)] border border-outline-variant/25 overflow-hidden">
                <div className="h-2 w-full bg-gradient-to-r from-primary-container via-tertiary-container to-error" />
                <form onSubmit={handleCreateCustomBan} className="p-6 sm:p-8 space-y-5">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-error-container/70 text-error flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[26px]">gavel</span>
                    </div>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">
                        Tambah Karantina Perangkat / IP Secara Manual
                      </h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Gunakan formulir ini untuk memblokir sidik perangkat (FingerprintJS) atau
                        alamat IP secara langsung ke database <code>bans</code>.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block font-label-md text-label-md text-on-surface font-semibold">
                        Fingerprint Perangkat (Opsional)
                      </label>
                      <input
                        type="text"
                        value={manualFp}
                        onChange={(e) => setManualFp(e.target.value)}
                        placeholder="Contoh: fp-98a7bc..."
                        className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-on-surface placeholder:text-outline font-mono text-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-label-md text-label-md text-on-surface font-semibold">
                        Alamat IP (Opsional)
                      </label>
                      <input
                        type="text"
                        value={manualIp}
                        onChange={(e) => setManualIp(e.target.value)}
                        placeholder="Contoh: 103.10.22.1"
                        className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-on-surface placeholder:text-outline font-mono text-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block font-label-md text-label-md text-on-surface font-semibold">
                        Durasi Karantina
                      </label>
                      <select
                        value={manualDuration}
                        onChange={(e) => setManualDuration(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-on-surface font-body-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                      >
                        <option value={1}>1 Jam</option>
                        <option value={24}>24 Jam (Standar)</option>
                        <option value={168}>7 Hari</option>
                        <option value={720}>30 Hari</option>
                        <option value={87600}>Permanen (10 Tahun)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block font-label-md text-label-md text-on-surface font-semibold">
                        Alasan Tindakan Disiplin
                      </label>
                      <input
                        type="text"
                        value={manualReason}
                        onChange={(e) => setManualReason(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-on-surface font-body-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('reports')}
                      className="px-5 py-2.5 rounded-full bg-surface-container text-on-surface-variant font-label-md text-label-md cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-full bg-error text-on-error font-label-md text-label-md font-bold flex items-center gap-2 shadow-[0_8px_20px_rgba(186,26,26,0.28)] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">block</span>
                      <span>Aktifkan Blokir Sekarang</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Desert Sanctuary Footer */}
      <footer className="relative z-10 w-full border-t border-outline-variant/20 bg-surface-container-low/60 py-5 px-margin-md sm:px-margin-lg mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[16px]">shield</span>
            <span>
              <strong>camelgle</strong> Trust & Safety Sentinel • Bukti laporan dienkripsi &
              dihapus otomatis sesuai retensi 7 hari.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-primary underline">
              Beranda
            </Link>
            <Link to="/room" className="hover:text-primary underline">
              Ruang Obrolan
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
