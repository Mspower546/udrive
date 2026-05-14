async function hashWithPBKDF2(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    512
  );
  return arrayToHex(new Uint8Array(bits));
}

function arrayToHex(arr) {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return arrayToHex(array);
}

export async function hashPassword(password) {
  const salt = generateSalt();
  const hash = await hashWithPBKDF2(password, salt);
  return `${salt}:${hash}`;
}

export async function verifyPassword(password, stored) {
  const [salt, key] = stored.split(':');
  const hash = await hashWithPBKDF2(password, salt);
  return hash === key;
}
