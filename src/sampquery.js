const dgram = require('dgram');

// Implementasi protokol query UDP resmi SA-MP/open.mp (opcode 'i' = info).
// Ini query LANGSUNG ke server game, bukan lewat API pihak ketiga — jadi
// akurat real-time selama port query-nya kebuka (biasanya sama dengan port
// game). Ada timeout 2.5 detik: kalau server gak balas (mati, port query
// ketutup firewall, atau host serverless ini gak bisa kirim UDP keluar),
// otomatis dianggap "tidak diketahui" bukan error.
function queryServerInfo(host, port, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4');
    let done = false;

    const finish = (result) => {
      if (done) return;
      done = true;
      try { socket.close(); } catch (_) {}
      resolve(result);
    };

    const timer = setTimeout(() => finish({ online: false }), timeoutMs);

    socket.on('error', () => { clearTimeout(timer); finish({ online: false }); });

    socket.on('message', (msg) => {
      clearTimeout(timer);
      try {
        // Header: "SAMP" + 4 byte IP + 2 byte port + 1 byte opcode ('i')
        let offset = 11;
        const password = msg.readUInt8(offset); offset += 1;
        const players = msg.readUInt16LE(offset); offset += 2;
        const maxPlayers = msg.readUInt16LE(offset); offset += 2;
        const hostnameLen = msg.readUInt32LE(offset); offset += 4;
        const hostname = msg.toString('utf8', offset, offset + hostnameLen); offset += hostnameLen;
        const gamemodeLen = msg.readUInt32LE(offset); offset += 4;
        const gamemode = msg.toString('utf8', offset, offset + gamemodeLen);
        finish({ online: true, hostname, gamemode, players, maxPlayers, password: !!password });
      } catch (err) {
        finish({ online: false });
      }
    });

    try {
      const parts = host.split('.').map(Number);
      const header = Buffer.alloc(11);
      header.write('SAMP', 0, 'ascii');
      header.writeUInt8(parts[0], 4);
      header.writeUInt8(parts[1], 5);
      header.writeUInt8(parts[2], 6);
      header.writeUInt8(parts[3], 7);
      header.writeUInt16LE(port, 8);
      header.write('i', 10, 'ascii');
      socket.send(header, port, host);
    } catch (err) {
      clearTimeout(timer);
      finish({ online: false });
    }
  });
}

module.exports = { queryServerInfo };