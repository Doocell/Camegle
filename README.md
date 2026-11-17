# 🐪 Camelgle — Platform Random Video Chat 1-on-1 (MVP)

**Camelgle** adalah aplikasi web obrolan video acak (*random 1-on-1 video chat*) berbasis **WebRTC**, **React + Vite + Tailwind CSS**, dan **Node.js + Express + Socket.io + SQLite** dengan desain bertema **Sunlit Sand Sanctuary & Warm Desert Campfire**.

---

## ✨ Fitur Utama (MVP F0–F10)

- **F0 — Arsitektur Monorepo & Kontrak Event Terpusat**: Pemisahan jelas antara `/client` dan `/server` dengan kontrak event Socket.io tunggal (`events.js`).
- **F1 — Landing Page, Age Gate 18+, & Halaman Legal**: Verifikasi usia 18+ wajib serta halaman *Pedoman Komunitas*, *Kebijakan Privasi*, dan *Ketentuan Layanan*.
- **F2 — Preview Kamera & Mikrofon (`useLocalStream`)**: Pratinjau video 480p, indikator *live audio dB meter*, tombol balik cermin kamera, dan penanganan error izin/perangkat.
- **F3 — Random Matching In-Memory**: Pemasangan pengguna secara acak dengan pencegahan *self-match* dan pencegahan *rematch* langsung dengan pasangan yang baru dilewati.
- **F4 — Signaling & Panggilan Video WebRTC (`usePeerConnection`)**: Aliran video & audio P2P terenkripsi DTLS-SRTP dengan *watchdog* koneksi 10 detik dan pembersihan memori penuh saat berganti pasangan.
- **F5 — Kontrol Panggilan & Auto-Skip 2 Detik**: Tombol **Next (`Space`)**, **Stop (`Esc`)**, **Mute (`M`)**, **Kamera (`V`)** berbasis `track.enabled`, serta fitur *Tirai Pasir* dan *auto-skip* 2 detik saat lawan keluar.
- **F6 — Text Chat & Filter Kata Kasar**: Chat teks *real-time* (maks 300 karakter), anti-XSS, *rate limit* 5 pesan / 5 detik, filter kata kasar Indonesia/Inggris, tanpa penyimpanan riwayat di server.
- **F7 — Sistem Laporan (Report) & Panel Moderator (`/admin/reports`)**: Pengambilan bukti 1 *snapshot frame* JPEG + 10 pesan chat terakhir, retensi otomatis 7 hari di SQLite, *auto-ban* jika dilaporkan 3 sesi berbeda dalam 24 jam, dan konsol moderator lengkap.
- **F8 — Moderasi AI Otomatis (`NSFWJS`) & Blur Awal 2 Detik**: Blur keamanan otomatis selama 2 detik pertama setiap sesi baru dan pemindaian berkala dengan *2-strike tracker* serta interval adaptif.
- **F9 — Guard (Ban Fingerprint + IP & Rate Limit)**: Identifikasi perangkat via *browser fingerprint*, pembatasan `match:next` (maks 10x/menit), batas maksimal 5 koneksi aktif per IP, serta layar karantina (*Akses Dibatasi*).
- **F10 — Kredensial TURN Dinamis (`coturn`) & Panduan Deployment**: Endpoint `GET /api/turn-credentials` berbasis HMAC-SHA1 *time-limited credentials* dan panduan produksi lengkap di [DEPLOY.md](./DEPLOY.md).

---

## 🚀 Cara Menjalankan secara Lokal

### 1. Prasyarat
- **Node.js v22.5.0+** (menggunakan modul bawaan `node:sqlite` dan `node:test`).

### 2. Instalasi Dependensi
```bash
npm run install:all
```

### 3. Konfigurasi Environment
Salin `.env.example` menjadi `server/.env`:
```bash
cp .env.example server/.env
```

### 4. Menjalankan Server & Client (Development)
Buka 2 terminal terpisah:

**Terminal 1 (Backend Server — Port 3001):**
```bash
npm run dev:server
```

**Terminal 2 (Frontend Vite — Port 5173):**
```bash
npm run dev:client
```

Buka **`http://localhost:5173`** di browser (dan **`http://localhost:5173/admin`** untuk membuka konsol moderator).

---

## 🧪 Menjalankan Pengujian (Unit & Integration Tests)

```bash
node --test server/modules/matching/matching.test.js server/modules/signaling/signaling.test.js server/modules/chat/chat.test.js server/modules/guard/guard.test.js server/modules/report/report.test.js server/shared/turn.test.js client/src/features/moderation/moderation.test.js
```
