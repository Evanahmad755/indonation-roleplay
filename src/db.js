const mysql = require('mysql2/promise');

// Pool koneksi ke database GM SA-MP (tabel playerucp, player_characters, dst).
// Semua query di seluruh proyek ini WAJIB lewat pool ini, pakai placeholder "?"
// (parameterized query) — jangan pernah menempel input user langsung ke string SQL.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

module.exports = pool;