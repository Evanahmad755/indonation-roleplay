const webpush = require('web-push');
const pool = require('./db');

// VAPID keys = "kunci identitas" buat push notification (BUKAN credential
// database). Generate sekali pakai: node -e "console.log(require('web-push').generateVAPIDKeys())"
// lalu taruh hasilnya di env VAPID_PUBLIC_KEY & VAPID_PRIVATE_KEY.
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const pushEnabled = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);

if (pushEnabled) {
  webpush.setVapidDetails('mailto:admin@indonation-roleplay.local', VAPID_PUBLIC, VAPID_PRIVATE);
}

async function saveSubscription(ucp, subscription) {
  await pool.query(
    `INSERT INTO push_subscriptions (ucp, endpoint, subscription_json)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE subscription_json = VALUES(subscription_json), ucp = VALUES(ucp)`,
    [ucp, subscription.endpoint, JSON.stringify(subscription)]
  );
}

async function broadcastNotification(title, body) {
  if (!pushEnabled) return { sent: 0, skipped: true };
  const [rows] = await pool.query('SELECT endpoint, subscription_json FROM push_subscriptions');
  let sent = 0;
  await Promise.all(
    rows.map(async (row) => {
      try {
        const sub = JSON.parse(row.subscription_json);
        await webpush.sendNotification(sub, JSON.stringify({ title, body }));
        sent += 1;
      } catch (err) {
        // Subscription basi (user uninstall/block notif) -> hapus biar gak nyoba lagi terus.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await pool.query('DELETE FROM push_subscriptions WHERE endpoint = ?', [row.endpoint]);
        }
      }
    })
  );
  return { sent, skipped: false };
}

module.exports = { pushEnabled, VAPID_PUBLIC, saveSubscription, broadcastNotification };
