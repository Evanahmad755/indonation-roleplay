-- Jalankan file ini SATU KALI di phpMyAdmin (sesudah web_posts.sql).

-- Tambah tipe post baru "update" (buat Update Server / changelog harian),
-- selain "berita" dan "pengumuman" yang udah ada.
ALTER TABLE `web_posts`
  MODIFY `type` ENUM('berita','pengumuman','update') NOT NULL DEFAULT 'berita';

-- Tabel buat nyimpen langganan push notification browser (bukan bagian
-- database GM, aman/terpisah).
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `ucp` VARCHAR(22) DEFAULT NULL,
  `endpoint` VARCHAR(512) NOT NULL,
  `subscription_json` TEXT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `endpoint_unique` (`endpoint`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
