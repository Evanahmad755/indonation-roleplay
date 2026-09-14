require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const { generateSalt, hashPassword } = require('./hash');
const { jobName, factionName, vehicleName, adminName } = require('./gamedata');
const { queryServerInfo } = require('./sampquery');
const { pushEnabled, VAPID_PUBLIC, saveSubscription, broadcastNotification } = require('./push');

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: (process.env.FRONTEND_ORIGIN || '').split(',').filter(Boolean),
  })
);

// Serve login.html / register.html / style.css langsung dari server yang sama,
// jadi satu alamat Vercel ini bisa dipakai buat frontend + backend sekaligus.
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/', (req, res) => res.redirect('/login.html'));

const UCP_REGEX = /^[A-Za-z0-9_\[\]]{3,22}$/; // sesuai kolom ucp varchar(22)

function badRequest(res, message) {
  return res.status(400).json({ ok: false, message });
}

// ---------- HEALTH CHECK ----------
// Buka https://domain-lu.vercel.app/api/health di browser buat ngecek apakah
// backend ini BENERAN bisa nyambung ke database-nya. Kalau "Terjadi kesalahan
// server" muncul pas login/pasang password, cek endpoint ini duluan — pesan
// errornya bakal kasih tau persis apa yang salah (host salah, password db
// salah, remote MySQL diblokir, dll), tanpa membocorkan credential.
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ ok: true, message: 'Koneksi database berhasil.' });
  } catch (err) {
    console.error('health check error:', err);
    return res.status(500).json({
      ok: false,
      message: 'Gagal konek ke database.',
      error_code: err.code || null,
      error_message: err.message || String(err),
    });
  }
});

// ---------- REGISTER (sebenarnya "pasang password pertama kali") ----------
// Akun UCP HANYA dibuat lewat bot Discord (lihat DISCORD.pwn), yang insert
// baris baru ke `playerucp` (ucp + verifycode + DiscordID), password masih
// kosong. Endpoint ini TIDAK membuat UCP baru — cuma mengizinkan user yang
// sudah punya UCP dari Discord buat pasang password pertama kalinya, dengan
// bukti kepemilikan lewat verifycode dari bot.
app.post('/api/register', async (req, res) => {
  const { ucp, password, verifycode } = req.body || {};

  if (!ucp || !UCP_REGEX.test(ucp)) {
    return badRequest(res, 'Username UCP harus 3-22 karakter (huruf/angka/underscore).');
  }
  if (!password || password.length < 6 || password.length > 32) {
    return badRequest(res, 'Password harus 6-32 karakter.');
  }
  if (!verifycode) {
    return badRequest(res, 'Kode verifikasi dari Discord wajib diisi.');
  }

  try {
    const [rows] = await pool.query(
      'SELECT ID, password, verifycode FROM playerucp WHERE ucp = ? LIMIT 1',
      [ucp]
    );

    if (rows.length === 0) {
      return badRequest(
        res,
        'UCP ini belum terdaftar. Buat akun dulu lewat bot Discord Indonation Roleplay.'
      );
    }

    const existing = rows[0];
    if (existing.password && existing.password.length > 0) {
      return badRequest(res, 'UCP ini sudah punya password. Silakan login, atau reset password.');
    }
    if (String(existing.verifycode) !== String(verifycode)) {
      return badRequest(res, 'Kode verifikasi salah.');
    }

    const salt = generateSalt();
    const hashed = hashPassword(password, salt);

    await pool.query(
      'UPDATE playerucp SET password = ?, salt = ?, verifycode = 0 WHERE ID = ?',
      [hashed, salt, existing.ID]
    );
    return res.json({ ok: true, message: 'Password berhasil dipasang, silakan login.' });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ ok: false, message: 'Terjadi kesalahan server.' });
  }
});

// ---------- LOGIN ----------
app.post('/api/login', async (req, res) => {
  const { ucp, password } = req.body || {};
  if (!ucp || !password) {
    return badRequest(res, 'UCP dan password wajib diisi.');
  }

  try {
    const [rows] = await pool.query(
      'SELECT ID, ucp, password, salt FROM playerucp WHERE ucp = ? LIMIT 1',
      [ucp]
    );
    if (rows.length === 0) {
      return badRequest(res, 'UCP tidak ditemukan.');
    }

    const account = rows[0];
    if (!account.password) {
      return badRequest(res, 'Akun ini belum memasang password. Silakan register dulu.');
    }

    const attemptHash = hashPassword(password, account.salt);
    if (attemptHash !== account.password) {
      return badRequest(res, 'Password salah.');
    }

    const token = jwt.sign({ ucpId: account.ID, ucp: account.ucp }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({ ok: true, token, ucp: account.ucp });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ ok: false, message: 'Terjadi kesalahan server.' });
  }
});

// ---------- ME (buat dashboard: profil ringkas + daftar karakter) ----------
function getToken(req) {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

async function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ ok: false, message: 'Belum login.' });
  try {
    req.ucpPayload = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Token tidak valid atau kadaluarsa.' });
  }
}

// Admin ditentukan dari data ASLI di game: kalau salah satu karakter milik
// UCP ini punya Char_Admin > 0, dia dianggap admin di website juga — bukan
// role terpisah yang harus diatur manual dua kali.
async function requireAdmin(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT 1 FROM player_characters WHERE Char_UCP = ? AND Char_Admin > 0 LIMIT 1',
      [req.ucpPayload.ucp]
    );
    if (rows.length === 0) {
      return res.status(403).json({ ok: false, message: 'Bukan admin.' });
    }
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    return res.status(500).json({ ok: false, message: 'Terjadi kesalahan server.' });
  }
}

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const [chars] = await pool.query(
      `SELECT pID, Char_Name, Char_Level, Char_Skin, Char_Money, Char_BankMoney,
              Char_Job, Char_Faction, Char_Family, Char_Vip, Char_VipName, Char_Admin,
              Char_Health, Char_Armour
       FROM player_characters WHERE Char_UCP = ?`,
      [req.ucpPayload.ucp]
    );

    // Ambil nama family (kalau punya) dan daftar kendaraan buat semua karakter
    // sekaligus, biar gak query berkali-kali di dalam loop.
    const familyIds = [...new Set(chars.map((c) => c.Char_Family).filter((f) => f >= 0))];
    let familyMap = {};
    if (familyIds.length > 0) {
      const [families] = await pool.query(
        `SELECT F_ID, F_Name FROM families WHERE F_ID IN (${familyIds.map(() => '?').join(',')})`,
        familyIds
      );
      familyMap = Object.fromEntries(families.map((f) => [f.F_ID, f.F_Name]));
    }

    const pIds = chars.map((c) => c.pID);
    let vehiclesByOwner = {};
    if (pIds.length > 0) {
      const [vehicles] = await pool.query(
        `SELECT PVeh_OwnerID, PVeh_ModelID, PVeh_Plate, PVeh_Color1
         FROM player_vehicles WHERE PVeh_OwnerID IN (${pIds.map(() => '?').join(',')})`,
        pIds
      );
      for (const v of vehicles) {
        (vehiclesByOwner[v.PVeh_OwnerID] ||= []).push({
          modelId: v.PVeh_ModelID,
          modelName: vehicleName(v.PVeh_ModelID),
          plate: v.PVeh_Plate,
        });
      }    }

    // Inventory tiap karakter (tabel `inventory`, kolom `ID` = pID karakter).
    let invByOwner = {};
    if (pIds.length > 0) {
      const [items] = await pool.query(
        `SELECT ID, invItem, invQuantity FROM inventory WHERE ID IN (${pIds.map(() => '?').join(',')}) AND invQuantity > 0`,
        pIds
      );
      for (const it of items) {
        (invByOwner[it.ID] ||= []).push({ item: it.invItem, qty: it.invQuantity });
      }
    }

    const characters = chars.map((c) => ({
      pID: c.pID,
      name: c.Char_Name,
      level: c.Char_Level,
      skin: c.Char_Skin,
      health: Math.round(c.Char_Health),
      armour: Math.round(c.Char_Armour),
      cash: c.Char_Money,
      bank: c.Char_BankMoney,
      job: jobName(c.Char_Job),
      faction: factionName(c.Char_Faction),
      family: c.Char_Family >= 0 ? familyMap[c.Char_Family] || `Family #${c.Char_Family}` : null,
      isVip: c.Char_Vip > 0,
      vipName: c.Char_Vip > 0 ? c.Char_VipName : null,
      isAdmin: c.Char_Admin > 0,
      adminRank: c.Char_Admin >= 1 ? adminName(c.Char_Admin) : null,
      vehicles: vehiclesByOwner[c.pID] || [],
      inventory: invByOwner[c.pID] || [],
    }));

    return res.json({
      ok: true,
      ucp: req.ucpPayload.ucp,
      characters,
      isAdmin: characters.some((c) => c.isAdmin),
    });
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ ok: false, message: 'Terjadi kesalahan server.' });
  }
});

// ---------- BERITA & PENGUMUMAN ----------
// Tabel `web_posts` BUKAN bagian dari database GM asli — ini tabel baru
// khusus buat website (lihat database/web_posts.sql). Jalankan file itu satu
// kali di phpMyAdmin sebelum endpoint di bawah ini kepake.
app.get('/api/posts', async (req, res) => {
  const allowed = ['pengumuman', 'berita', 'update'];
  const type = allowed.includes(req.query.type) ? req.query.type : null;
  try {
    const [rows] = type
      ? await pool.query('SELECT * FROM web_posts WHERE type = ? ORDER BY created_at DESC LIMIT 50', [type])
      : await pool.query('SELECT * FROM web_posts ORDER BY created_at DESC LIMIT 50');
    return res.json({ ok: true, posts: rows });
  } catch (err) {
    console.error('posts list error:', err);
    return res.status(500).json({
      ok: false,
      message: 'Gagal ambil berita/pengumuman. Sudah jalankan database/web_posts.sql belum?',
    });
  }
});

app.post('/api/posts', requireAuth, requireAdmin, async (req, res) => {
  const { type, title, body } = req.body || {};
  if (!['berita', 'pengumuman', 'update'].includes(type)) {
    return badRequest(res, "type harus 'berita', 'pengumuman', atau 'update'.");
  }
  if (!title || !title.trim() || !body || !body.trim()) {
    return badRequest(res, 'Judul dan isi wajib diisi.');
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO web_posts (type, title, body, author_ucp) VALUES (?, ?, ?, ?)',
      [type, title.trim(), body.trim(), req.ucpPayload.ucp]
    );
    // Kirim push notification ke semua yang subscribe (kalau fitur ini aktif).
    // Sengaja gak di-`await` biar respons ke admin gak ketahan nunggu proses
    // kirim notifikasi ke banyak orang.
    broadcastNotification(
      `${type === 'pengumuman' ? 'Pengumuman' : type === 'update' ? 'Update Server' : 'Berita'} baru`,
      title.trim()
    ).catch((err) => console.error('broadcast push error:', err));
    return res.json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error('posts create error:', err);
    return res.status(500).json({ ok: false, message: 'Terjadi kesalahan server.' });
  }
});

app.delete('/api/posts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM web_posts WHERE id = ?', [req.params.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('posts delete error:', err);
    return res.status(500).json({ ok: false, message: 'Terjadi kesalahan server.' });
  }
});

// ---------- STAFF (publik) ----------
// Nampilin karakter yang punya Char_Admin >= 1 (Admin Magang / level 0
// SENGAJA tidak dihitung staff aktif, sesuai keputusan owner).
app.get('/api/staff', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT Char_Name, Char_Admin, Char_Skin, Char_Faction
       FROM player_characters WHERE Char_Admin >= 1 ORDER BY Char_Admin DESC, Char_Name ASC LIMIT 100`
    );
    const staff = rows.map((r) => ({
      name: r.Char_Name,
      skin: r.Char_Skin,
      rank: adminName(r.Char_Admin),
      rankLevel: r.Char_Admin,
      faction: factionName(r.Char_Faction),
    }));
    return res.json({ ok: true, staff });
  } catch (err) {
    console.error('staff error:', err);
    return res.status(500).json({ ok: false, message: 'Terjadi kesalahan server.' });
  }
});

// ---------- LEADERBOARD (publik) ----------
app.get('/api/leaderboard', async (req, res) => {
  const type = req.query.type;
  const columns = {
    level: 'Char_Level',
    wealth: '(Char_Money + Char_BankMoney)',
  };
  const orderCol = columns[type] || columns.level;
  try {
    const [rows] = await pool.query(
      `SELECT Char_Name, Char_Skin, Char_Level, Char_Money, Char_BankMoney, Char_Faction
       FROM player_characters ORDER BY ${orderCol} DESC LIMIT 10`
    );
    const board = rows.map((r) => ({
      name: r.Char_Name,
      skin: r.Char_Skin,
      level: r.Char_Level,
      wealth: Number(r.Char_Money || 0) + Number(r.Char_BankMoney || 0),
      faction: factionName(r.Char_Faction),
    }));
    return res.json({ ok: true, type: type === 'wealth' ? 'wealth' : 'level', board });
  } catch (err) {
    console.error('leaderboard error:', err);
    return res.status(500).json({ ok: false, message: 'Terjadi kesalahan server.' });
  }
});

// ---------- GANTI PASSWORD (Settings) ----------
app.post('/api/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return badRequest(res, 'Password lama dan baru wajib diisi.');
  }
  if (newPassword.length < 6 || newPassword.length > 32) {
    return badRequest(res, 'Password baru harus 6-32 karakter.');
  }
  try {
    const [rows] = await pool.query('SELECT ID, password, salt FROM playerucp WHERE ucp = ? LIMIT 1', [
      req.ucpPayload.ucp,
    ]);
    if (rows.length === 0) return badRequest(res, 'Akun tidak ditemukan.');
    const account = rows[0];
    if (hashPassword(currentPassword, account.salt) !== account.password) {
      return badRequest(res, 'Password lama salah.');
    }
    const newSalt = generateSalt();
    const newHash = hashPassword(newPassword, newSalt);
    await pool.query('UPDATE playerucp SET password = ?, salt = ? WHERE ID = ?', [newHash, newSalt, account.ID]);
    return res.json({ ok: true, message: 'Password berhasil diganti.' });
  } catch (err) {
    console.error('change-password error:', err);
    return res.status(500).json({ ok: false, message: 'Terjadi kesalahan server.' });
  }
});

// ---------- STATUS SERVER LIVE (publik) ----------
const GAME_SERVER_HOST = process.env.GAME_SERVER_HOST || '217.216.111.29';
const GAME_SERVER_PORT = Number(process.env.GAME_SERVER_PORT || 7011);
app.get('/api/server-status', async (req, res) => {
  const info = await queryServerInfo(GAME_SERVER_HOST, GAME_SERVER_PORT);
  return res.json({ ok: true, ...info });
});

// ---------- SOCIAL / TWITTER FEED (publik, baca saja) ----------
// Nampilin feed Twitter DALAM GAME (tabel `tweets`, diisi dari fitur
// smartphone in-game) di website — bukan sistem chat baru. Read-only,
// sengaja tidak bisa posting baru dari website supaya gak bentrok dengan
// state game yang lagi berjalan.
app.get('/api/social/tweets', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT TwitterFrom, TwitterDate, TwitterText FROM tweets ORDER BY TwitterDate DESC LIMIT 20'
    );
    return res.json({ ok: true, tweets: rows });
  } catch (err) {
    console.error('tweets error:', err);
    return res.status(500).json({ ok: false, message: 'Terjadi kesalahan server.' });
  }
});

// ---------- PUSH NOTIFICATION ----------
app.get('/api/push/public-key', (req, res) => {
  return res.json({ ok: true, enabled: pushEnabled, publicKey: VAPID_PUBLIC });
});

app.post('/api/push/subscribe', requireAuth, async (req, res) => {
  const { subscription } = req.body || {};
  if (!subscription || !subscription.endpoint) {
    return badRequest(res, 'Subscription tidak valid.');
  }
  try {
    await saveSubscription(req.ucpPayload.ucp, subscription);
    return res.json({ ok: true });
  } catch (err) {
    console.error('push subscribe error:', err);
    return res.status(500).json({
      ok: false,
      message: 'Gagal simpan subscription. Sudah jalankan database/002_updates_and_push.sql belum?',
    });
  }
});

const PORT = process.env.PORT || 3001;

// Kalau file ini dijalanin langsung (npm start / node src/server.js), nyalain
// server biasa. Kalau file ini di-import sama Vercel (sebagai serverless
// function), jangan panggil listen() — cukup export app-nya.
if (require.main === module) {
  app.listen(PORT, () => console.log(`UCP auth API jalan di port ${PORT}`));
}

module.exports = app;
