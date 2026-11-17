# PRD MVP: Platform Random Video Chat

**Nama platform:** `[NAMA_PLATFORM]` (placeholder, ganti nanti) **Versi:** MVP 1.0 **Target:** Pengguna di Indonesia, akses lewat browser (mobile-first) **Tujuan dokumen:** panduan untuk vibe coding dengan AI, dipecah per fitur supaya prompt tidak saling menabrak.

---

## 1. Ringkasan Produk

`[NAMA_PLATFORM]` adalah website untuk bertemu orang baru lewat video call acak 1-on-1. Pengguna tidak perlu login. Cukup buka website, setuju aturan 18+, izinkan kamera, lalu klik Start. Sistem memasangkan dengan pengguna lain yang sedang menunggu. Pengguna bisa lanjut ke orang berikutnya (Next), berhenti (Stop), atau melaporkan lawan bicara (Report).

**Masalah yang diselesaikan:** orang ingin ngobrol spontan dengan orang baru tanpa ribet daftar akun.

**Prinsip produk:**

1. Instan: dari buka website sampai ketemu orang maksimal 3 klik.
2. Aman sejak awal: safety adalah bagian inti, bukan tambahan.
3. Ringan: tanpa akun, tanpa menyimpan data pribadi.
4. Mobile-first: mayoritas pengguna lewat HP.

## 2. Scope MVP

**Masuk MVP:** landing page, age gate, preview kamera, random matching, video call, text chat, kontrol (Next, Stop, Mute, Kamera), Report, deteksi nudity otomatis, ban IP + fingerprint, rate limit, halaman legal.

**Tidak masuk MVP:** login/akun, filter minat/region, friend list, riwayat chat, grup video, efek/filter wajah, koin/gift, aplikasi native, monetisasi.

## 3. Tech Stack (Full JavaScript)

| Bagian | Pilihan |
| --- | --- |
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express + Socket.io |
| Video/Audio | WebRTC (bawaan browser) |
| TURN server | coturn (self-hosted di VPS) + STUN publik |
| Antrian matching | In-memory di server (MVP). Redis nanti kalau scale |
| Database | SQLite (MVP) atau Postgres/Supabase untuk report & ban |
| Deteksi nudity | NSFWJS (TensorFlow.js) berjalan di browser |
| Fingerprint | FingerprintJS versi open-source |

Cek versi terbaru tiap library sebelum install.

## 4. Struktur Folder (Wajib Diikuti)

Struktur ini menjadi kunci agar tiap fitur punya "wilayah" sendiri.

```
/client
  /src
    /pages            -> Landing.jsx, Room.jsx
    /features
      /age-gate       -> F1
      /media-preview  -> F2
      /matching       -> F3 (sisi client)
      /call           -> F4
      /controls       -> F5
      /chat           -> F6
      /report         -> F7
      /moderation     -> F8
      /legal          -> F1 (halaman legal)
    /lib
      socket.js       -> satu instance socket, dipakai semua fitur
      events.js       -> salinan kontrak event (lihat bagian 5)
      constants.js
/server
  index.js            -> setup Express + Socket.io, daftar modul
  /modules
    /matching         -> F3
    /signaling        -> F4
    /chat             -> F6
    /report           -> F7
    /guard            -> F9 (ban + rate limit)
  /shared
    events.js         -> kontrak event (sumber kebenaran)
```

## 5. Aturan Wajib untuk AI (Tempel di Awal Setiap Prompt)

```
Aturan proyek ini:
1. Kerjakan HANYA fitur yang saya sebutkan. Jangan menyentuh, mengubah, atau merefactor file di folder fitur lain.
2. Hanya boleh mengedit file di folder yang saya sebut sebagai "area kerja". Kalau butuh perubahan di luar itu, berhenti dan tanya saya dulu.
3. Semua nama event socket HARUS diambil dari /server/shared/events.js (dan salinannya di /client/src/lib/events.js). Dilarang membuat nama event baru tanpa menambahkannya ke file itu dan memberi tahu saya.
4. Jangan ganti struktur folder, nama file yang sudah ada, atau dependency yang sudah terpasang tanpa izin.
5. Pakai satu instance socket dari /client/src/lib/socket.js. Jangan membuat koneksi socket baru.
6. Jangan hapus fitur atau kode yang sudah berjalan. Tambahkan, bukan menimpa.
7. Di akhir, tulis daftar file yang dibuat/diubah dan cara mengetesnya manual.
```

## 6. Kontrak Event Socket (Sumber Kebenaran)

Simpan sebagai `/server/shared/events.js`. Semua fitur wajib memakai nama ini.

**Client ke Server**

| Event | Payload | Dipakai fitur |
| --- | --- | --- |
| `queue:join` | `{ fingerprint }` | F3 |
| `queue:leave` | - | F3 |
| `match:next` | - | F3, F5 |
| `signal:offer` | `{ roomId, sdp }` | F4 |
| `signal:answer` | `{ roomId, sdp }` | F4 |
| `signal:ice` | `{ roomId, candidate }` | F4 |
| `chat:send` | `{ roomId, text }` | F6 |
| `report:submit` | `{ roomId, reason, snapshot, chatLog }` | F7 |
| `moderation:flag` | `{ roomId, type }` | F8 |

**Server ke Client**

| Event | Payload | Dipakai fitur |
| --- | --- | --- |
| `queue:waiting` | - | F3 |
| `match:found` | `{ roomId, isInitiator }` | F3, F4 |
| `match:peer-left` | - | F3, F5 |
| `signal:offer` / `signal:answer` / `signal:ice` | sama seperti di atas | F4 |
| `chat:receive` | `{ text, ts }` | F6 |
| `guard:banned` | `{ reason }` | F9 |
| `guard:rate-limited` | `{ retryAfterMs }` | F9 |
| `stats:online` | `{ count }` | opsional |

## 7. Urutan Build

Kerjakan berurutan. Jangan lompat sebelum fitur sebelumnya lolos tes manual.

**F0 (setup) -> F3 + F4 (inti) -> F2 -> F5 -> F6 -> F7 -> F9 -> F8 -> F1 (polish & legal) -> F10 (deploy)**

---

## F0. Setup Proyek & Kontrak

**Tujuan:** kerangka proyek yang siap dipakai semua fitur.

**Area kerja:** root proyek, `/client`, `/server`, `/server/shared`.

**Requirement:**

- Inisialisasi monorepo dengan folder sesuai bagian 4.
- Setup Vite + React + Tailwind di `/client`.
- Setup Express + Socket.io di `/server/index.js`, dengan CORS untuk dev.
- Buat `/server/shared/events.js` berisi semua nama event dari bagian 6, dan salinannya di client.
- Buat `/client/src/lib/socket.js` (satu instance socket).
- Buat halaman kosong `Landing.jsx` dan `Room.jsx` dengan routing.
- File `.env.example` (PORT, STUN/TURN config, DB path).

**Kriteria selesai:** client dan server jalan lokal, client terhubung ke server (log "connected" muncul), tidak ada fitur lain.

**Prompt:**

```
[tempel Aturan Wajib]
Fitur: F0 Setup Proyek.
Area kerja: seluruh root proyek (hanya untuk setup awal).
Buat monorepo dengan struktur folder sesuai PRD bagian 4. Setup Vite+React+Tailwind di /client, Express+Socket.io di /server. Buat events.js di server/shared dan salinannya di client/src/lib sesuai daftar event bagian 6. Buat socket.js (satu instance), halaman kosong Landing dan Room dengan react-router. Jangan buat fitur apa pun selain kerangka. Pastikan client terhubung ke server dan tampilkan log connected.
```

---

## F1. Landing Page, Age Gate, dan Halaman Legal

**Tujuan:** pintu masuk user, persetujuan 18+ dan aturan.

**Area kerja:** `/client/src/pages/Landing.jsx`, `/client/src/features/age-gate`, `/client/src/features/legal`.

**Requirement:**

- Landing: nama platform, tagline singkat, tombol "Mulai", link ke Terms, Privacy, Guidelines.
- Age gate: modal wajib sebelum lanjut, berisi checkbox "Saya berusia 18 tahun ke atas dan setuju dengan aturan". Tombol lanjut nonaktif sampai dicentang.
- Simpan persetujuan di `localStorage` (dibungkus try/catch) agar tidak muncul lagi di kunjungan berikutnya.
- Tiga halaman statis: Terms, Privacy, Community Guidelines (isi draft dulu, nanti dicek ahli hukum).
- Aturan inti Guidelines: dilarang konten seksual/ketelanjangan, kekerasan, pelecehan, merekam tanpa izin, mengaku di bawah umur.
- Mobile-first, responsif.

**Kriteria selesai:** user tidak bisa menuju halaman kamera tanpa mencentang persetujuan; link legal berfungsi.

**Prompt:**

```
[tempel Aturan Wajib]
Fitur: F1 Landing + Age Gate + Legal.
Area kerja: client/src/pages/Landing.jsx, client/src/features/age-gate, client/src/features/legal.
Buat landing page mobile-first dengan tombol Mulai. Klik Mulai membuka modal age gate dengan checkbox 18+ dan setuju aturan; tombol lanjut nonaktif sebelum dicentang. Simpan persetujuan di localStorage (try/catch). Setelah setuju, arahkan ke /room. Buat 3 halaman statis Terms, Privacy, Community Guidelines dengan isi draft bahasa Indonesia. Jangan sentuh fitur lain.
```

---

## F2. Preview Kamera & Mic

**Tujuan:** user melihat dirinya dan memberi izin sebelum dicarikan lawan bicara.

**Area kerja:** `/client/src/features/media-preview`.

**Requirement:**

- Minta izin kamera + mic via `getUserMedia` (video diprioritaskan 480p, front camera di HP).
- Tampilkan preview video diri, tombol "Cari Teman" aktif hanya jika stream tersedia.
- Tangani error: izin ditolak, kamera dipakai aplikasi lain, tidak ada perangkat. Tampilkan pesan jelas dan tombol coba lagi.
- Export hook `useLocalStream()` yang mengembalikan `{ stream, error, retry }` untuk dipakai fitur lain. Fitur lain TIDAK boleh memanggil `getUserMedia` sendiri.

**Kriteria selesai:** preview tampil, pesan error jelas untuk tiap kasus, hook bisa diimpor fitur lain.

**Prompt:**

```
[tempel Aturan Wajib]
Fitur: F2 Preview Kamera & Mic.
Area kerja: client/src/features/media-preview.
Buat komponen preview kamera dan hook useLocalStream() yang mengembalikan { stream, error, retry }. Constraint video 640x480, facingMode user, audio aktif. Tangani error izin ditolak, device tidak ada, device sedang dipakai. Tombol "Cari Teman" hanya aktif jika stream ada, dan hanya memanggil callback onStart dari props. Jangan implementasikan matching atau call.
```

---

## F3. Random Matching

**Tujuan:** memasangkan dua user yang sedang menunggu.

**Area kerja:** `/server/modules/matching`, `/client/src/features/matching`.

**Requirement (server):**

- Antrian in-memory berisi socket yang menunggu.
- `queue:join`: jika ada user lain di antrian, pasangkan keduanya, buat `roomId`, kirim `match:found` ke keduanya (satu `isInitiator: true`, satunya `false`). Jika tidak ada, masukkan ke antrian dan kirim `queue:waiting`.
- `queue:leave` atau disconnect: keluarkan dari antrian. Jika sedang dalam room, kirim `match:peer-left` ke pasangannya.
- `match:next`: akhiri room saat ini, kirim `match:peer-left` ke pasangan, lalu masukkan user ke antrian lagi.
- Cegah user dipasangkan dengan dirinya sendiri dan dengan pasangan sebelumnya yang baru saja dilewati.
- Modul ini hanya mengelola pairing. Tidak menangani signaling atau chat.

**Requirement (client):**

- Hook `useMatching()` yang mengelola state: `idle | waiting | matched`, fungsi `start()`, `next()`, `stop()`, dan data `{ roomId, isInitiator }`.
- Tampilkan layar "Mencari orang..." saat `waiting`.

**Kriteria selesai:** buka dua tab browser, keduanya klik Cari, keduanya menerima `match:found` dengan roomId sama dan peran initiator berbeda.

**Prompt:**

```
[tempel Aturan Wajib]
Fitur: F3 Random Matching.
Area kerja: server/modules/matching, client/src/features/matching.
Implementasikan antrian matching in-memory di server dengan event queue:join, queue:leave, match:next, serta emit queue:waiting, match:found {roomId,isInitiator}, match:peer-left sesuai events.js. Cegah self-match dan rematch langsung dengan pasangan sebelumnya. Di client buat hook useMatching() dengan state idle/waiting/matched. Jangan implementasikan WebRTC, chat, atau report. Beri cara tes dengan dua tab browser.
```

---

## F4. Signaling & Video Call (WebRTC)

**Tujuan:** video + audio dua arah antar pasangan.

**Area kerja:** `/server/modules/signaling`, `/client/src/features/call`.

**Requirement (server):**

- Relay `signal:offer`, `signal:answer`, `signal:ice` hanya ke pasangan di `roomId` yang sama (validasi bahwa pengirim memang anggota room).

**Requirement (client):**

- Hook `usePeerConnection({ roomId, isInitiator, localStream })`.
- Konfigurasi ICE servers dari environment (STUN + TURN). Jangan hardcode kredensial.
- Initiator membuat offer, non-initiator membalas answer; saling kirim ICE candidate.
- Output: `remoteStream`, `connectionState` (`connecting | connected | failed | closed`).
- Cleanup penuh saat room berakhir (tutup peer connection, stop listener) agar tidak ada memory leak ketika Next ditekan berulang.
- Komponen `<VideoCall />` menampilkan video lawan besar (full) dan video diri kecil (picture-in-picture).
- Jika `connectionState` gagal lebih dari 10 detik, panggil callback `onFail` (nanti dipakai untuk auto-skip).

**Kriteria selesai:** dua tab saling melihat video dan mendengar audio; menekan Next berulang 10 kali tidak membuat koneksi menumpuk.

**Prompt:**

```
[tempel Aturan Wajib]
Fitur: F4 Signaling & Video Call.
Area kerja: server/modules/signaling, client/src/features/call.
Server: relay signal:offer, signal:answer, signal:ice hanya ke pasangan dalam roomId yang sama, validasi keanggotaan room. Client: hook usePeerConnection({roomId,isInitiator,localStream}) dengan ICE server dari env, output remoteStream dan connectionState, cleanup penuh saat room berakhir, callback onFail bila gagal >10 detik. Komponen VideoCall: video lawan besar, video diri kecil pojok. Pakai localStream dari hook useLocalStream (F2) dan roomId dari useMatching (F3); jangan ubah keduanya.
```

---

## F5. Kontrol Panggilan & Status

**Tujuan:** user mengendalikan sesi dengan mudah.

**Area kerja:** `/client/src/features/controls`, dan `/client/src/pages/Room.jsx` (hanya untuk merakit komponen).

**Requirement:**

- Tombol: **Next**, **Stop**, **Mute mic**, **Matikan kamera**. Ukuran besar dan mudah dijangkau jempol di HP.
- Mute/kamera dilakukan dengan `track.enabled`, tidak membuat ulang stream.
- Next memanggil `next()` dari `useMatching`, Stop memanggil `stop()` lalu kembali ke landing.
- Indikator status: "Mencari...", "Menghubungkan...", "Terhubung", "Lawan keluar", "Koneksi gagal".
- Auto-skip: jika lawan keluar atau koneksi gagal, otomatis panggil Next setelah jeda 2 detik, dengan pesan singkat ke user.
- `Room.jsx` merakit: VideoCall + Controls + status. Slot untuk Chat dan Report dibiarkan sebagai placeholder.

**Kriteria selesai:** semua tombol bekerja, status berganti sesuai kondisi, auto-skip jalan saat salah satu tab ditutup.

**Prompt:**

```
[tempel Aturan Wajib]
Fitur: F5 Kontrol & Status.
Area kerja: client/src/features/controls, client/src/pages/Room.jsx (hanya untuk merakit).
Buat komponen Controls (Next, Stop, Mute, Kamera) mobile-friendly dan indikator status. Mute/kamera via track.enabled. Next dan Stop memakai fungsi dari useMatching. Auto-skip 2 detik saat peer-left atau koneksi gagal. Rakit di Room.jsx: VideoCall (F4) + Controls + status, sisakan slot kosong untuk Chat dan Report. Jangan ubah isi fitur F2, F3, F4.
```

---

## F6. Text Chat

**Tujuan:** komunikasi teks selama sesi, cadangan bila mic bermasalah.

**Area kerja:** `/server/modules/chat`, `/client/src/features/chat`.

**Requirement:**

- Server: terima `chat:send`, validasi pengirim ada di room, batasi panjang (misal 300 karakter), buang spasi berlebih, teruskan sebagai `chat:receive` ke pasangan saja.
- Rate limit sederhana: maksimal 5 pesan per 5 detik per user.
- Filter kata kasar dasar (daftar kata Indonesia + Inggris di file terpisah yang mudah diedit).
- Pesan **tidak disimpan** di server.
- Client: komponen `<Chat />` berisi daftar pesan + input; pesan dibersihkan otomatis saat sesi berganti. Teks ditampilkan sebagai plain text (cegah XSS, jangan render HTML).
- Export hook `useChatLog()` yang mengembalikan 10 pesan terakhir, dipakai Report (F7).

**Kriteria selesai:** dua tab saling kirim pesan, pesan hilang setelah Next, spam ditolak.

**Prompt:**

```
[tempel Aturan Wajib]
Fitur: F6 Text Chat.
Area kerja: server/modules/chat, client/src/features/chat.
Server: handle chat:send, validasi anggota room, max 300 karakter, rate limit 5 pesan/5 detik, filter kata kasar dari file wordlist terpisah, kirim chat:receive ke pasangan, JANGAN simpan pesan. Client: komponen Chat (plain text only, anti XSS), reset saat sesi berganti, hook useChatLog() mengembalikan 10 pesan terakhir. Tempatkan di slot Chat pada Room.jsx tanpa mengubah bagian lain.
```

---

## F7. Report

**Tujuan:** user bisa melaporkan lawan bicara yang melanggar.

**Area kerja:** `/server/modules/report`, `/client/src/features/report`.

**Requirement:**

- Tombol Report selalu terlihat saat panggilan berlangsung.
- Modal: pilih alasan (konten seksual, pelecehan, di bawah umur, spam/iklan, lainnya), tombol kirim.
- Saat kirim: ambil satu snapshot frame video lawan (canvas, kompres JPEG kualitas rendah) dan 10 pesan terakhir dari `useChatLog()`.
- Server: simpan ke database (id, waktu, alasan, IP & fingerprint pihak terlapor, snapshot, chatLog). Snapshot dan chat log dihapus otomatis setelah periode retensi pendek (usulan 7 hari) kecuali sudah ditandai untuk ditindaklanjuti.
- Setelah report terkirim, otomatis lanjut Next.
- Jika satu fingerprint/IP dilaporkan oleh 3 sesi berbeda dalam 24 jam, tandai untuk ban otomatis (diteruskan ke modul guard F9 lewat fungsi yang diekspor, bukan lewat edit file guard).
- Buat halaman admin sederhana `/admin/reports` (dilindungi password dari env) untuk melihat laporan dan menekan tombol ban manual.

**Kriteria selesai:** report tersimpan lengkap dengan snapshot, halaman admin menampilkan laporan, user otomatis pindah ke lawan baru.

**Prompt:**

```
[tempel Aturan Wajib]
Fitur: F7 Report.
Area kerja: server/modules/report, client/src/features/report.
Buat tombol Report + modal alasan. Saat kirim, ambil snapshot frame video lawan (canvas, JPEG kualitas rendah) dan 10 pesan terakhir dari useChatLog(). Server simpan ke database (SQLite) dengan retensi 7 hari. Setelah submit, panggil next(). Bila 3 sesi berbeda melaporkan fingerprint/IP yang sama dalam 24 jam, panggil fungsi banIdentity() yang diekspor modul guard (jangan edit modul guard). Buat halaman /admin/reports sederhana dilindungi password dari env.
```

---

## F8. Deteksi Nudity & Blur Awal

**Tujuan:** mengurangi paparan konten tidak pantas secara otomatis.

**Area kerja:** `/client/src/features/moderation`.

**Requirement:**

- Muat model NSFWJS (lazy load, jangan blokir halaman awal).
- **Blur awal:** video lawan di-blur selama 2 detik pertama setelah terhubung sambil cek frame pertama. Jika aman, blur dilepas.
- **Pengecekan berkala:** ambil frame video lawan tiap 2 detik, klasifikasikan. Jika skor kategori Porn/Hentai di atas ambang batas (konfigurasi di `constants.js`, awal 0.7) pada 2 pengecekan berturut-turut, blur video lawan, tampilkan peringatan, lalu panggil `next()`.
- Kirim `moderation:flag` ke server agar tercatat (diteruskan ke report/guard lewat event, bukan edit modul lain).
- Jaga performa: pengecekan tidak boleh membuat video patah-patah di HP kelas menengah; turunkan frekuensi bila FPS drop.
- Catatan jujur: ini mendeteksi frame lawan di sisi penerima, jadi tidak mencegah kamera tampil sebelum dicek. Itu sebabnya blur awal penting. Deteksi ini tidak sempurna, jadi Report tetap dibutuhkan.

**Kriteria selesai:** blur awal tampil 2 detik, gambar tes yang jelas tidak pantas memicu blur dan auto-skip, video tetap lancar.

**Prompt:**

```
[tempel Aturan Wajib]
Fitur: F8 Deteksi Nudity & Blur Awal.
Area kerja: client/src/features/moderation.
Buat komponen/hook useNsfwGuard(remoteVideoRef) yang lazy-load NSFWJS, blur video lawan 2 detik pertama, lalu cek frame tiap 2 detik. Jika skor Porn/Hentai >0.7 dua kali berturut-turut, blur, tampilkan peringatan, panggil next(), dan emit moderation:flag. Ambang batas dan interval di constants.js. Turunkan frekuensi bila performa buruk. Jangan ubah isi fitur call; cukup terima ref elemen video lewat props.
```

---

## F9. Guard: Ban & Rate Limit

**Tujuan:** pengganti akun untuk menahan pelanggar dan spam.

**Area kerja:** `/server/modules/guard`, `/client/src/features/age-gate` (hanya untuk mengambil fingerprint, lihat catatan).

**Requirement:**

- Client: ambil fingerprint (FingerprintJS open-source) sekali per sesi dan kirim saat `queue:join`. Fungsi pengambilan fingerprint ditaruh di `/client/src/lib/fingerprint.js`.
- Server: tabel `bans` (identitas = fingerprint dan/atau IP, alasan, waktu, kedaluwarsa).
- Cek ban saat `queue:join`: jika terblokir, kirim `guard:banned` dan jangan masukkan ke antrian.
- Rate limit `match:next`: maksimal 10 kali per menit per identitas; lebih dari itu kirim `guard:rate-limited`.
- Rate limit koneksi per IP (batasi jumlah socket aktif per IP).
- Ekspor fungsi `banIdentity({ fingerprint, ip, reason, durationHours })` dan `isBanned(...)` untuk dipakai modul lain.
- Sadari keterbatasan: VPN dan ganti browser bisa melewati ban. Ini hanya penghambat, bukan solusi sempurna.
- Client menampilkan layar "Akses dibatasi" saat menerima `guard:banned`.

**Kriteria selesai:** identitas yang di-ban tidak bisa masuk antrian; menekan Next terlalu cepat memicu rate limit.

**Prompt:**

```
[tempel Aturan Wajib]
Fitur: F9 Guard (Ban & Rate Limit).
Area kerja: server/modules/guard, client/src/lib/fingerprint.js, dan satu layar client/src/features/guard-screen.
Client: ambil fingerprint dengan FingerprintJS open-source dan kirim di queue:join. Server: tabel bans (SQLite), cek ban saat queue:join, rate limit match:next 10x/menit, limit koneksi socket per IP. Ekspor banIdentity() dan isBanned(). Tampilkan layar "Akses dibatasi" saat guard:banned. Integrasikan ke F3 hanya lewat pemanggilan isBanned() di handler queue:join dengan perubahan sekecil mungkin dan beri tahu saya baris yang diubah.
```

---

## F10. Deploy & TURN Server

**Tujuan:** website bisa diakses publik dan koneksi video stabil di jaringan seluler.

**Area kerja:** konfigurasi deploy, `/server` (env), dokumen `DEPLOY.md`.

**Requirement:**

- Frontend di Vercel/Netlify/Cloudflare Pages, backend Socket.io di VPS (butuh proses selalu hidup, bukan serverless).
- Install coturn di VPS (atau pakai layanan TURN berbayar untuk awal), kredensial sementara/time-limited lewat endpoint server.
- HTTPS wajib (kamera hanya jalan di HTTPS).
- Environment variable untuk semua secret.
- Tes di dua jaringan berbeda (WiFi dan data seluler) untuk memastikan TURN bekerja.
- Pantau penggunaan bandwidth TURN sejak hari pertama.

**Prompt:**

```
[tempel Aturan Wajib]
Fitur: F10 Deploy.
Area kerja: konfigurasi deploy dan file DEPLOY.md saja.
Buat panduan deploy langkah demi langkah: frontend ke hosting statis, backend ke VPS dengan PM2 dan Nginx + HTTPS, instalasi coturn, dan endpoint kredensial TURN sementara. Semua secret lewat env. Jangan ubah logika fitur apa pun.
```

---

## 8. Persyaratan Non-Fungsional

- **Performa:** waktu dari klik Start sampai terhubung idealnya di bawah 5 detik saat ada pasangan.
- **Kompatibilitas:** Chrome, Safari (iOS 15+), Firefox, Edge terbaru. Uji khusus Safari iOS karena WebRTC-nya paling rewel.
- **Privasi:** tanpa akun, tanpa menyimpan video/audio, chat tidak disimpan, data report dihapus sesuai retensi.
- **Keamanan:** validasi semua event di server (anggota room), sanitasi teks, rate limit, secret hanya di env.
- **Aksesibilitas dasar:** kontras jelas, tombol cukup besar untuk jempol.

## 9. Metrik Sukses MVP

| Metrik | Target awal |
| --- | --- |
| Match success rate (user yang dapat pasangan) | di atas 80% saat ada cukup user online |
| Durasi rata-rata sesi | di atas 1 menit |
| Koneksi video berhasil (bukan gagal/timeout) | di atas 90% |
| Rasio report per sesi | di bawah 5% |
| Waktu tunggu match rata-rata | di bawah 10 detik |

## 10. Risiko & Mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Konten tidak pantas / penyalahgunaan | Age gate, blur awal, NSFWJS, Report, ban, moderasi manual |
| Pengguna di bawah umur | Age gate + larangan eksplisit; sadari ini tidak bisa dicegah penuh |
| Biaya bandwidth TURN membengkak | Batasi kualitas 480p, coturn self-hosted, rilis bertahap |
| Cold start (sepi user, tidak ada pasangan) | Soft launch ke komunitas kampus agar ada user bersamaan |
| Aspek hukum Indonesia | Daftar PSE, siapkan Terms/Privacy, konsultasi ahli hukum sebelum launch publik |
| Bypass ban via VPN | Terima sebagai batasan MVP; pertimbangkan verifikasi nomor HP di fase berikutnya |

## 11. Checklist Sebelum Launch Publik

- [ ] Semua fitur F0-F9 lolos tes manual di HP asli (Android dan iPhone)
- [ ] TURN teruji di jaringan seluler
- [ ] Terms, Privacy, Guidelines final dan tampil jelas
- [ ] Pendaftaran PSE diproses
- [ ] Halaman admin report berfungsi dan ada orang yang memantau
- [ ] Rencana respons bila ada laporan konten serius (siapa yang menindak, berapa cepat)
- [ ] Batasi soft launch (waitlist/kuota) dulu sebelum dibuka luas
