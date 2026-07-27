import nacl from 'tweetnacl';

const BRIDGE = 'https://bridge.tonapi.io/bridge';

function b64decode(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

function b64urlencode(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function hex2bytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) out[i >> 1] = parseInt(hex.slice(i, i + 2), 16);
  return out;
}

function crc16(data) {
  let crc = 0xffff;
  for (const b of data) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return crc & 0xffff;
}

// Converts raw TON address "0:<64hex>" to user-facing base64url form
export function rawToFriendly(raw, bounceable = false) {
  const [chain, hash] = raw.split(':');
  const wc = parseInt(chain, 10);
  const buf = new Uint8Array(36);
  buf[0] = bounceable ? 0x11 : 0x51;
  buf[1] = wc < 0 ? 0xff : wc;
  buf.set(hex2bytes(hash), 2);
  const sum = crc16(buf.slice(0, 34));
  buf[34] = (sum >> 8) & 0xff;
  buf[35] = sum & 0xff;
  return b64urlencode(buf);
}

// Creates a fresh client session — clientId MUST be hex(publicKey) so the
// wallet can encrypt its response to us using X25519 DH.
export function createSession() {
  const keypair = nacl.box.keyPair();
  const clientId = Array.from(keypair.publicKey, b => b.toString(16).padStart(2, '0')).join('');
  return { clientId, keypair };
}

// Builds the TON Connect 2.0 universal link for a given wallet app
export function buildConnectUrl(universalLink, manifestUrl, clientId) {
  const request = JSON.stringify({ manifestUrl, items: [{ name: 'ton_addr' }] });
  const r = b64urlencode(new TextEncoder().encode(request));
  return `${universalLink}?${new URLSearchParams({ v: '2', id: clientId, r, ret: 'none' })}`;
}

// Opens an SSE stream on the TON bridge and resolves when the wallet responds.
// Automatically reconnects if the bridge closes the connection (TTL ~300 s).
export function listenForWallet(clientId, keypair, signal) {
  return new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));

    let lastEventId = 0;

    async function poll() {
      if (signal.aborted) return;
      try {
        const url = `${BRIDGE}/events?client_id=${clientId}&last_event_id=${lastEventId}`;
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error(`Bridge returned ${res.status}`);

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) { setTimeout(poll, 1000); return; } // reconnect on normal close
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop();

          for (const line of lines) {
            if (line.startsWith('id:')) {
              lastEventId = parseInt(line.slice(3).trim(), 10) || lastEventId;
            }
            if (!line.startsWith('data:')) continue;
            try {
              const ev = JSON.parse(line.slice(5).trim());
              if (!ev.from || !ev.message) continue;

              // Decrypt NaCl box — first 24 bytes are the nonce
              const enc = b64decode(ev.message);
              const plain = nacl.box.open(
                enc.slice(24), enc.slice(0, 24),
                hex2bytes(ev.from), keypair.secretKey
              );
              if (!plain) continue;

              const payload = JSON.parse(new TextDecoder().decode(plain));
              if (payload.event !== 'connect') continue;

              const item = payload.payload?.items?.find(i => i.name === 'ton_addr');
              if (!item?.address) continue;

              resolve({
                raw: item.address,
                friendly: rawToFriendly(item.address),
                publicKey: item.publicKey,
                walletId: ev.from,
              });
              return;
            } catch { /* skip malformed frames */ }
          }
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
        if (!signal.aborted) setTimeout(poll, 2000); // retry on network error
      }
    }

    poll();
  });
}
