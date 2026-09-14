# UCP Auth — Indonation Roleplay

API Login/Register yang langsung nyambung ke tabel `playerucp` & `player_characters`
di database GM SA-MP milik server Indonation Roleplay. Password di-hash persis
seperti in-game (`SHA256(password + salt)`, hex huruf besar) — sudah dicek cocok
dengan contoh resmi native `SHA256_PassHash`, jadi akun bisa dipakai login di
website maupun in-game tanpa perlu migrasi data.

## Cara jalanin di HP/PC lokal (buat testing)

```bash
cd ucp-backend
npm install
cp .env.example .env
# edit .env: isi DB_HOST/DB_USER/DB_PASSWORD/DB_NAME sesuai hosting database lu
npm start
```

Buka `public/login.html` atau `public/register.html` langsung di browser
(atau lewat Live Server), API jalan di `http://localhost:3001`.

## Yang perlu lu siapin di sisi hosting

1. **Remote MySQL access harus aktif.** Ini yang bikin rencana lama gagal
   (InfinityFree blokir koneksi keluar). Cek di panel hosting database lu
   (zeedun.my.id / phpMyAdmin) apakah ada opsi "Remote MySQL" / "Allow remote
   host" dan tambahkan IP server backend ini ke whitelist-nya.
2. Backend ini **tidak cocok dijalankan sebagai serverless function di Vercel**
   kalau databasenya jauh & connection pool perlu tetap hidup — mending
   dijalankan di layanan yang bisa nyala terus (VPS kecil, Railway, Render,
   atau bahkan di hosting SA-MP yang sama kalau support Node.js). **Frontend**
   (`public/`, atau nanti versi Next.js) tetap bisa di Vercel seperti rencana
   awal, tinggal arahkan `API_BASE` di `login.html`/`register.html` ke alamat
   backend ini.
3. Ganti `JWT_SECRET` di `.env` dengan string acak sendiri, jangan dipakai bareng project lain.

## Alur akun

Akun UCP **hanya dibuat lewat bot Discord** (lihat `DISCORD.pwn` — bot yang
insert baris ke `playerucp` dengan `verifycode`, password masih kosong).
Website ini **tidak bisa** dipakai buat bikin UCP baru dari nol.

`/api/register` di sini sebenarnya adalah endpoint **"pasang password
pertama kali"**: user submit `ucp` + `verifycode` (dari bot Discord) +
`password` baru → server cek UCP itu sudah ada, passwordnya masih kosong, dan
verifycode-nya cocok, baru dipasang password + salt-nya. Halaman
`register.html` juga kasih link ke Discord buat yang belum punya akun sama
sekali.

## Dashboard karakter (v2 — sidebar SPA)

Dashboard model **sidebar + tab** (Overview, Karakter, Kendaraan,
Leaderboard, Staff, Rules, Pengumuman, Berita, Kelola Berita khusus admin).
Ada tombol hamburger (&#9776;) buat buka sidebar di layar sempit/HP. Semua
pindah tab tanpa reload halaman. Mata uang ditampilkan dalam **Dollar ($)**.

`/api/me` balikin data lengkap tiap karakter: level, HP/Armour, cash/bank,
nama job & faction (disamain persis sama nama yang dipakai di GM), nama
family (join ke tabel `families`, "Tanpa Family" kalau `Char_Family = -1`),
status VIP, dan daftar kendaraan (join ke `player_vehicles` lewat `pID`,
nama model kendaraan pakai daftar standar ID 400-611).

`/api/leaderboard?type=level|wealth` dan `/api/staff` itu PUBLIK (gak perlu
login) — nampilin data dari SELURUH karakter di server, bukan cuma UCP yang
login. Rules masih teks statis di `dashboard.html` (cari `<!-- rules -->`
di HTML kalau mau edit isinya nanti).

**Gambar skin karakter**: dipakai langsung dari CDN publik resmi
[open.mp](https://assets.open.mp/assets/images/skins/{skin_id}.png) — proyek
open source yang jadi standar komunitas SA-MP/open.mp sekarang (pola yang
sama kayak dipakai bot Discord lu). Kalau skin ID-nya gak ada gambarnya di
CDN itu, otomatis fallback ke label "Skin #angka", gak error/rusak.

**Logo**: taruh file logo di `public/assets/logo.png` (udah termasuk di ZIP
ini kalau lu kirim logo-nya).

## Setup tambahan wajib (biar semua fitur baru jalan)

1. Jalankan `database/web_posts.sql` (kalau belum pernah)
2. Jalankan `database/002_updates_and_push.sql` — nambah tipe post "update" dan tabel `push_subscriptions`
3. (Opsional) Aktifkan Push Notification: generate VAPID key —
   ```bash
   node -e "console.log(require('web-push').generateVAPIDKeys())"
   ```
   Taruh hasil `publicKey`/`privateKey` ke env `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` di Vercel, lalu redeploy. Kalau dikosongin, tombol notifikasi di Settings otomatis nonaktif (gak error).
4. `npm install` ulang (ada dependency baru: `web-push`)

## Fitur-fitur v3

- **Jabatan Staff asli** — pakai daftar `AdminName` dari GM (`Admin Magang` sengaja TIDAK dihitung staff aktif, mulai dari `Trial Admin`)
- **Show/hide password** di form login & register (ikon mata)
- **Status server live** (`/api/server-status`) — query UDP langsung ke game server (opcode `i` bawaan SA-MP/open.mp). Ada kemungkinan gak jalan kalau hosting Vercel ngeblokir outbound UDP; kalau gitu otomatis fallback nampilin "Offline/tidak diketahui", gak error.
- **Karakter bisa diklik** → modal detail + **Inventory** (tabel `inventory`, join by `pID`)
- **Social** — read-only feed Twitter dalam game (tabel `tweets`)
- **Settings** — ganti password + toggle notifikasi push
- **Update Server** — tipe post ke-3 selain berita/pengumuman
- **Running text (ticker)** nempel di bawah layar, isinya judul post terbaru
- **Push Notification** ke HP tiap admin nerbitin post baru (kalau VAPID sudah diisi)
- Footer + copyright di halaman login, terinspirasi referensi

## "Terjadi kesalahan server" pas login/pasang password?

Buka `https://domain-lu.vercel.app/api/health` di browser. Itu bakal kasih
tau PERSIS penyebabnya tanpa membocorkan password database:

- `{"ok":true,...}` → database sudah kekonek, berarti masalahnya di tempat
  lain (cek lagi username/password UCP yang dites).
- `{"ok":false,"error_code":"ETIMEDOUT",...}` atau `ECONNREFUSED` → remote
  MySQL diblokir/host salah. Cek lagi opsi "Remote MySQL" di panel hosting
  database, dan pastikan `DB_HOST`/`DB_PORT` di Environment Variables Vercel
  benar (lalu **Redeploy**, env baru gak kepake tanpa redeploy).
- `ER_ACCESS_DENIED_ERROR` → `DB_USER`/`DB_PASSWORD` salah.
- `ER_BAD_DB_ERROR` → `DB_NAME` salah/belum ada.

## Setup tambahan: tabel Berita & Pengumuman

Fitur ini butuh 1 tabel baru (terpisah dari database GM, aman): buka
phpMyAdmin di database yang sama, jalankan isi file `database/web_posts.sql`
satu kali. Setelah itu dashboard & halaman "Kelola Berita" otomatis jalan.

Yang dianggap **admin** di website adalah siapapun yang salah satu
karakternya (`player_characters.Char_Admin`) bernilai lebih dari 0 di
database — jadi gak perlu diatur ulang manual, ngikut status admin in-game.



| Method | Path | Fungsi |
|---|---|---|
| GET | `/api/health` | Cek koneksi database (buat troubleshooting) |
| POST | `/api/register` | `{ ucp, password, verifycode }` — pasang password pertama kali |
| POST | `/api/login` | `{ ucp, password }` → balikin `token` |
| GET | `/api/me` | Header `Authorization: Bearer <token>` → profil + daftar karakter |
| GET | `/api/posts?type=berita\|pengumuman` | Publik, daftar berita/pengumuman |
| POST | `/api/posts` | Admin only — `{ type, title, body }` |
| DELETE | `/api/posts/:id` | Admin only |
| GET | `/api/staff` | Publik — daftar karakter dengan `Char_Admin > 0` |
| GET | `/api/leaderboard?type=level\|wealth` | Publik — top 10 karakter |

## Halaman yang tersedia

- `/login.html` — masuk
- `/register.html` — pasang password pertama kali (pakai kode Discord)
- `/dashboard.html` — profil karakter, pengumuman, berita, link Discord
- `/admin-posts.html` — kelola berita/pengumuman (cuma bisa dipakai efektif kalau akun kamu admin)

## Belum termasuk di tahap ini (sengaja, biar rilis bertahap)

- Rate limiting / brute-force protection di endpoint login
- Reset password / lupa password
- Halaman dashboard penuh (level, uang, kendaraan, dll — datanya sudah bisa
  diambil lewat `/api/me`, tinggal dibikin tampilannya)
- Deploy otomatis / CI
