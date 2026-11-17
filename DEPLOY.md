# Panduan Deployment Produksi Camelgle (F10 — Deploy & TURN Server)

Dokumen ini menjelaskan langkah demi langkah untuk men-deploy platform **Camelgle** ke lingkungan produksi yang aman dengan dukungan **HTTPS**, **WebSocket (Socket.io)**, dan **TURN Server (`coturn`)** dengan kredensial sementara (*time-limited HMAC-SHA1 credentials*).

---

## Arsitektur Produksi

| Komponen | Direktori | Rekomendasi Hosting | Domain Contoh |
|---|---|---|---|
| **Frontend (React + Vite)** | `/client` | Cloudflare Pages / Vercel / Netlify | `https://camelgle.com` |
| **Backend (Node.js + Socket.io + SQLite)** | `/server` | VPS Ubuntu 22.04/24.04 LTS + PM2 + Nginx | `https://api.camelgle.com` |
| **TURN/STUN Relay (`coturn`)** | VPS | VPS Ubuntu (Port `3478` UDP/TCP & `5349` TLS) | `turn:turn.camelgle.com:3478` |

> **Penting:** Browser modern mewajibkan **HTTPS** agar API `navigator.mediaDevices.getUserMedia` dapat mengakses kamera dan mikrofon di luar `localhost`.

---

## 1. Persiapan & Instalasi `coturn` (TURN Server) di VPS

Sekitar **15–20% koneksi WebRTC** gagal terhubung secara langsung (*Peer-to-Peer*) karena NAT simetris atau firewall operator seluler (4G/5G). `coturn` bertugas merelay paket video/audio ketika jalur langsung terblokir.

### 1.1. Instalasi Paket
```bash
sudo apt update
sudo apt install -y coturn openssl
```

Aktifkan daemon `coturn` di `/etc/default/coturn`:
```bash
sudo sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn
```

### 1.2. Buat Secret Key Bersama (Shared Secret)
Buat secret acak 32-byte yang akan dipakai bersama oleh `/etc/turnserver.conf` dan `TURN_STATIC_SECRET` di `/server/.env`:
```bash
openssl rand -hex 32
```

### 1.3. Konfigurasi `/etc/turnserver.conf`
Ganti isi `/etc/turnserver.conf` dengan konfigurasi berikut:
```ini
# Port standar STUN/TURN
listening-port=3478
tls-listening-port=5349

# Gunakan autentikasi berbasis waktu (Time-Limited TURN REST API)
fingerprint
use-auth-secret
static-auth-secret=GANTI_DENGAN_HASIL_OPENSSL_RAND_HEX_32

# Nama domain/realm TURN Anda
realm=turn.camelgle.com

# Batas kuota dan keamanan
total-quota=100
stale-nonce=600
no-loopback-peers
no-multicast-peers

# Rentang port relay media UDP
min-port=49152
max-port=65535

# Sertifikat TLS Let's Encrypt (opsional untuk turns:// port 5349)
# cert=/etc/letsencrypt/live/turn.camelgle.com/fullchain.pem
# pkey=/etc/letsencrypt/live/turn.camelgle.com/privkey.pem
```

### 1.4. Buka Firewall VPS & Jalankan `coturn`
```bash
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp
sudo ufw allow 49152:65535/udp
sudo systemctl restart coturn
sudo systemctl status coturn
```

---

## 2. Deploy Backend (`/server`) di VPS Ubuntu

### 2.1. Siapkan Node.js v22 LTS & PM2
Karena Camelgle menggunakan modul bawaan `node:sqlite`, pastikan menggunakan **Node.js v22.5.0+**:
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx
sudo npm install -g pm2
```

### 2.2. Clone Repositori & Konfigurasi `/server/.env`
```bash
git clone <URL_REPO_ANDA> /var/www/camelgle
cd /var/www/camelgle
npm run install:all
```

Buat file `/var/www/camelgle/server/.env`:
```env
PORT=3001
CLIENT_ORIGIN=https://camelgle.com
DB_PATH=./data/camelgle.sqlite
ADMIN_PASSWORD=docil123

# Kredensial TURN Dinamis (Jangan ditaruh di kode client!)
STUN_URL=stun:stun.l.google.com:19302
TURN_URL=turn:turn.camelgle.com:3478
TURN_STATIC_SECRET=GANTI_DENGAN_HASIL_OPENSSL_RAND_HEX_32
TURN_TTL_SEC=3600
```

### 2.3. Jalankan Backend dengan PM2
```bash
cd /var/www/camelgle/server
pm2 start index.js --name camelgle-server
pm2 save
pm2 startup
```

### 2.4. Konfigurasi Reverse Proxy Nginx (Dukungan WebSocket + HTTPS)
Buat file `/etc/nginx/sites-available/api.camelgle.com`:
```nginx
server {
    listen 80;
    server_name api.camelgle.com;

    client_max_body_size 5M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        # Header wajib untuk Socket.io WebSocket Upgrade
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Aktifkan konfigurasi dan pasang sertifikat HTTPS Let's Encrypt:
```bash
sudo ln -s /etc/nginx/sites-available/api.camelgle.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.camelgle.com
```

---

## 3. Deploy Frontend (`/client`) ke Hosting Statis

Anda dapat men-deploy folder `/client` ke **Vercel**, **Netlify**, atau **Cloudflare Pages**.

### 3.1. Pengaturan Build
- **Root Directory:** `client`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### 3.2. Environment Variables di Hosting Statis
Cukup atur URL backend dan STUN publik (kredensial TURN diambil secara dinamis dari endpoint `GET /api/turn-credentials` saat sesi dimulai, sehingga **tidak ada password statis di bundle klien**):
```env
VITE_SOCKET_URL=https://api.camelgle.com
VITE_STUN_URL=stun:stun.l.google.com:19302
```

### 3.3. Aturan SPA Routing (Agar `/room` dan `/admin/reports` Tidak 404 Saat Di-refresh)
Jika menggunakan Vercel (`client/vercel.json`) atau Netlify (`client/public/_redirects`), arahkan semua rute ke `/index.html`:
```
/* /index.html 200
```

---

## 4. Daftar Periksa Verifikasi Produksi (Checklist)

1. **Cek Endpoint Kesehatan & Kredensial TURN:**
   - Buka `https://api.camelgle.com/api/health` -> pastikan mengembalikan `{"status":"ok","service":"camelgle-server"}`.
   - Buka `https://api.camelgle.com/api/turn-credentials` -> pastikan mengembalikan daftar `iceServers` dengan `username` berformat `<timestamp>:nomad` dan `credential` HMAC-SHA1.
2. **Uji Lintas Jaringan (WiFi Rumah vs. Data Seluler 4G/5G):**
   - Buka `https://camelgle.com` di Laptop (terhubung ke WiFi) dan di Smartphone (terhubung ke jaringan 4G/5G operator seluler, WiFi dimatikan).
   - Masuk ke `/room` di kedua perangkat dan klik **Mulai Ngobrol**.
   - Pastikan video dan audio kedua perangkat tersambung dalam `< 4 detik`.
3. **Uji Moderasi & Panel Admin:**
   - Buka `https://camelgle.com/admin/reports` dan masuk menggunakan kata sandi admin (`ADMIN_PASSWORD`).
