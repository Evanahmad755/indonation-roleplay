-- Jalankan file ini SATU KALI di phpMyAdmin (di database yang sama dengan
-- database GM, mis. s355_Indonation) sebelum fitur Berita & Pengumuman
-- dipakai. Tabel ini terpisah dari tabel-tabel bawaan gamemode, jadi aman,
-- gak akan bentrok/mengubah data GM.

CREATE TABLE IF NOT EXISTS `web_posts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `type` ENUM('berita','pengumuman') NOT NULL DEFAULT 'berita',
  `title` VARCHAR(150) NOT NULL,
  `body` TEXT NOT NULL,
  `author_ucp` VARCHAR(22) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
