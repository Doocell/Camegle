/**
 * F9: Pengambilan Identitas Fingerprint Perangkat (/client/src/lib/fingerprint.js)
 * Diambil satu kali per sesi menggunakan kombinasi Canvas, WebGL, Audio/Hardware traits,
 * lalu di-hash dengan SHA-256.
 */

let cachedFingerprint = null;

function fnv1aHash(str) {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch * 31;
    h2 = Math.imul(h2, 0x01000193);
  }
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0')
  );
}

function collectBrowserSignals() {
  const parts = [
    navigator.userAgent || '',
    navigator.language || '',
    String(navigator.hardwareConcurrency || ''),
    String(navigator.deviceMemory || ''),
    String(screen?.width || '') + 'x' + String(screen?.height || ''),
    String(screen?.colorDepth || ''),
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  ];

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(10, 5, 80, 24);
      ctx.fillStyle = '#28180f';
      ctx.fillText('camelgle-fp-v1', 12, 10);
      parts.push(canvas.toDataURL());
    }
  } catch {
    // Abaikan jika canvas diblokir
  }

  return parts.join('||');
}

export async function getDeviceFingerprint() {
  if (cachedFingerprint) return cachedFingerprint;

  const rawSignals = collectBrowserSignals();

  try {
    if (window.crypto?.subtle) {
      const encoded = new TextEncoder().encode(rawSignals);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      cachedFingerprint = hashArray
        .slice(0, 16)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return cachedFingerprint;
    }
  } catch {
    // Fallback ke FNV-1a
  }

  cachedFingerprint = fnv1aHash(rawSignals);
  return cachedFingerprint;
}

export default getDeviceFingerprint;
