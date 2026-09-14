const crypto = require('crypto');

// Native SHA256_PassHash(password, salt, output) di gamemode itu artinya:
// output = SHA256(password + salt), ditulis dalam HEX HURUF BESAR.
// Fungsi di bawah ini harus persis meniru itu, biar password yang dibikin
// lewat website bisa dipakai login in-game, dan sebaliknya.

function generateSalt(length = 16) {
  // Di gamemode: for(i=0;i<16;i++) salt[i] = random(94) + 33;
  // artinya karakter ASCII printable dari kode 33 ('!') sampai 126 ('~').
  let salt = '';
  for (let i = 0; i < length; i++) {
    const code = crypto.randomInt(33, 127); // 33..126 inclusive
    salt += String.fromCharCode(code);
  }
  return salt;
}

function hashPassword(password, salt) {
  return crypto
    .createHash('sha256')
    .update(password + salt, 'utf8')
    .digest('hex')
    .toUpperCase();
}

module.exports = { generateSalt, hashPassword };
