import db from '../../shared/db.js';
import { EVENTS } from '../../shared/events.js';
import { getReportablePartnerSocketId } from '../matching/index.js';
import { getSocketIdentity, banIdentity, getActiveBans, unbanById } from '../guard/index.js';

/**
 * F7: Report Module
 * - Menyimpan laporan ke database SQLite (id, waktu, alasan, IP & fingerprint terlapor, snapshot, chatLog)
 * - Retensi otomatis 7 hari (menghapus laporan lama kecuali ditandai flagged_for_action = 1)
 * - Jika 1 fingerprint/IP dilaporkan oleh 3 sesi berbeda dalam 24 jam, otomatis panggil banIdentity() (F9)
 * - Menyediakan REST API Admin (/api/admin/reports & /api/admin/ban) yang dilindungi password dari env
 */

const RETENTION_MS = 7 * 24 * 3600 * 1000; // 7 hari
const AUTO_BAN_WINDOW_MS = 24 * 3600 * 1000; // 24 jam
const AUTO_BAN_THRESHOLD = 3; // 3 sesi pelapor berbeda

export function resetReportStateForTests() {
  db.exec('DELETE FROM reports;');
}

export function purgeExpiredReports(now = Date.now()) {
  const cutoff = now - RETENTION_MS;
  db.prepare('DELETE FROM reports WHERE created_at < ? AND flagged_for_action = 0').run(cutoff);
}

export function setReportFlaggedForAction(reportId, flagged = true) {
  db.prepare('UPDATE reports SET flagged_for_action = ? WHERE id = ?').run(
    flagged ? 1 : 0,
    Number(reportId)
  );
}

export function deleteReportById(reportId) {
  db.prepare('DELETE FROM reports WHERE id = ?').run(Number(reportId));
}

export function getAllReports() {
  purgeExpiredReports();
  const rows = db
    .prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT 200')
    .all();

  return rows.map((r) => ({
    id: r.id,
    roomId: r.room_id,
    reporterSocketId: r.reporter_socket_id,
    reporterFingerprint: r.reporter_fingerprint,
    reportedSocketId: r.reported_socket_id,
    reportedFingerprint: r.reported_fingerprint,
    reportedIp: r.reported_ip,
    reason: r.reason,
    notes: r.notes,
    snapshot: r.snapshot,
    chatLog: (() => {
      try {
        return JSON.parse(r.chat_log_json || '[]');
      } catch {
        return [];
      }
    })(),
    flaggedForAction: Boolean(r.flagged_for_action),
    createdAt: r.created_at,
  }));
}

function checkAndTriggerAutoBan({ reportedFingerprint, reportedIp, now }) {
  const since = now - AUTO_BAN_WINDOW_MS;

  if (reportedFingerprint) {
    const row = db
      .prepare(
        `SELECT COUNT(DISTINCT reporter_socket_id) AS cnt
         FROM reports
         WHERE reported_fingerprint = ? AND created_at >= ?`
      )
      .get(reportedFingerprint, since);

    if (row && row.cnt >= AUTO_BAN_THRESHOLD) {
      banIdentity({
        fingerprint: reportedFingerprint,
        ip: reportedIp || null,
        reason: 'Akun/perangkat dilaporkan oleh 3 pengguna berbeda dalam 24 jam terakhir.',
        durationHours: 24,
      });
      return true;
    }
  }

  if (reportedIp) {
    const row = db
      .prepare(
        `SELECT COUNT(DISTINCT reporter_socket_id) AS cnt
         FROM reports
         WHERE reported_ip = ? AND created_at >= ?`
      )
      .get(reportedIp, since);

    if (row && row.cnt >= AUTO_BAN_THRESHOLD) {
      banIdentity({
        fingerprint: reportedFingerprint || null,
        ip: reportedIp,
        reason: 'Alamat jaringan dilaporkan oleh 3 pengguna berbeda dalam 24 jam terakhir.',
        durationHours: 24,
      });
      return true;
    }
  }

  return false;
}

export function registerReportHandlers(_io, socket) {
  socket.on(EVENTS.REPORT_SUBMIT, (payload) => {
    const roomId = payload?.roomId;
    if (!roomId) {
      return;
    }

    const partnerSocketId = getReportablePartnerSocketId(roomId, socket.id);
    if (!partnerSocketId) {
      return;
    }

    const reporterIdentity = getSocketIdentity(socket.id);
    const reportedIdentity = getSocketIdentity(partnerSocketId);
    const reason = String(payload?.reason || 'other').slice(0, 64);
    const notes = typeof payload?.notes === 'string' ? payload.notes.slice(0, 250) : '';
    const snapshot = typeof payload?.snapshot === 'string' ? payload.snapshot : '';
    const chatLog = Array.isArray(payload?.chatLog) ? payload.chatLog.slice(-10) : [];
    const now = Date.now();

    purgeExpiredReports(now);

    db.prepare(
      `INSERT INTO reports (
        room_id,
        reporter_socket_id,
        reporter_fingerprint,
        reported_socket_id,
        reported_fingerprint,
        reported_ip,
        reason,
        notes,
        snapshot,
        chat_log_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      roomId,
      socket.id,
      reporterIdentity.fingerprint || null,
      partnerSocketId,
      reportedIdentity.fingerprint || null,
      reportedIdentity.ip || null,
      reason,
      notes,
      snapshot,
      JSON.stringify(chatLog),
      now
    );

    checkAndTriggerAutoBan({
      reportedFingerprint: reportedIdentity.fingerprint,
      reportedIp: reportedIdentity.ip,
      now,
    });
  });

  // F8: Catat moderation:flag dari deteksi NSFWJS di client
  socket.on(EVENTS.MODERATION_FLAG, (payload) => {
    const roomId = payload?.roomId;
    if (!roomId) {
      return;
    }

    const partnerSocketId = getReportablePartnerSocketId(roomId, socket.id);
    if (!partnerSocketId) {
      return;
    }

    const reporterIdentity = getSocketIdentity(socket.id);
    const reportedIdentity = getSocketIdentity(partnerSocketId);
    const flagType = String(payload?.type || 'NSFW').slice(0, 32);
    const now = Date.now();

    db.prepare(
      `INSERT INTO reports (
        room_id,
        reporter_socket_id,
        reporter_fingerprint,
        reported_socket_id,
        reported_fingerprint,
        reported_ip,
        reason,
        notes,
        snapshot,
        chat_log_json,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      roomId,
      socket.id,
      reporterIdentity.fingerprint || null,
      partnerSocketId,
      reportedIdentity.fingerprint || null,
      reportedIdentity.ip || null,
      `ai_moderation:${flagType}`,
      'Deteksi otomatis NSFWJS (2 kali berturut-turut > ambang batas)',
      '',
      '[]',
      now
    );

    checkAndTriggerAutoBan({
      reportedFingerprint: reportedIdentity.fingerprint,
      reportedIp: reportedIdentity.ip,
      now,
    });
  });
}

export function registerAdminReportRoutes(app) {
  function requireAdminAuth(req, res, next) {
    const expectedPassword = process.env.ADMIN_PASSWORD || 'docil123';
    const provided = req.headers['x-admin-password'] || req.query.password;
    if (!provided || provided !== expectedPassword) {
      return res.status(401).json({ error: 'Password admin tidak valid' });
    }
    return next();
  }

  app.get('/api/admin/reports', requireAdminAuth, (_req, res) => {
    const reports = getAllReports();
    const bans = getActiveBans();
    res.json({ reports, bans });
  });

  app.post('/api/admin/reports/:id/flag', requireAdminAuth, (req, res) => {
    const reportId = Number(req.params.id);
    const flagged = req.body?.flagged !== undefined ? Boolean(req.body.flagged) : true;
    setReportFlaggedForAction(reportId, flagged);
    res.json({ ok: true, id: reportId, flaggedForAction: flagged });
  });

  app.delete('/api/admin/reports/:id', requireAdminAuth, (req, res) => {
    const reportId = Number(req.params.id);
    deleteReportById(reportId);
    res.json({ ok: true, id: reportId });
  });

  app.get('/api/admin/bans', requireAdminAuth, (_req, res) => {
    const bans = getActiveBans();
    res.json({ bans });
  });

  app.delete('/api/admin/bans/:id', requireAdminAuth, (req, res) => {
    const banId = Number(req.params.id);
    unbanById(banId);
    res.json({ ok: true, id: banId });
  });

  app.post('/api/admin/ban', requireAdminAuth, (req, res) => {
    const { reportId, fingerprint, ip, reason, durationHours } = req.body || {};
    if (!fingerprint && !ip) {
      return res.status(400).json({ error: 'Fingerprint atau IP wajib diisi' });
    }
    if (reportId) {
      setReportFlaggedForAction(reportId, true);
    }
    const result = banIdentity({
      fingerprint: fingerprint || null,
      ip: ip || null,
      reason: reason || 'Diblokir manual oleh Admin Moderator',
      durationHours: Number(durationHours) || 24,
    });
    res.json({ ok: true, ban: result });
  });
}
