import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Koneksi SQLite Tunggal untuk Modul Guard (F9) & Report (F7)
 * Menggunakan modul bawaan Node.js v22 (node:sqlite).
 * Saat dijalankan di dalam test runner (node --test), gunakan ':memory:'
 * agar worker paralel tidak saling mengunci file SQLite milik dev server.
 */
const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  process.execArgv.some((arg) => arg.includes('--test')) ||
  process.argv.some((arg) => arg.endsWith('.test.js'));

const defaultFileDbPath = process.env.VERCEL
  ? '/tmp/camelgle.sqlite'
  : './data/camelgle.sqlite';
const dbPath = isTestEnv ? ':memory:' : process.env.DB_PATH || defaultFileDbPath;

if (dbPath !== ':memory:') {
  const resolvedDir = path.dirname(path.resolve(dbPath));
  if (!fs.existsSync(resolvedDir)) {
    fs.mkdirSync(resolvedDir, { recursive: true });
  }
}

export const db = new DatabaseSync(dbPath);

if (dbPath !== ':memory:') {
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
}

db.exec(`
  CREATE TABLE IF NOT EXISTS bans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT,
    ip TEXT,
    reason TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    reporter_socket_id TEXT NOT NULL,
    reporter_fingerprint TEXT,
    reported_socket_id TEXT NOT NULL,
    reported_fingerprint TEXT,
    reported_ip TEXT,
    reason TEXT NOT NULL,
    notes TEXT,
    snapshot TEXT,
    chat_log_json TEXT,
    flagged_for_action INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  );
`);

export default db;
