/**
 * Encryption utilities for GhostPad
 *
 * Strategy:
 * - Key derivation: PBKDF2 (SHA-256, 200k iterations) → AES-GCM 256-bit key
 * - Random salt (16 bytes) + IV (12 bytes) stored alongside ciphertext
 * - Encrypted payload is prefixed with "enc:" in the URL hash so the app
 *   knows to prompt for a password instead of rendering raw content.
 *
 * URL hash format (encrypted):
 *   enc:<base64url(salt)>.<base64url(iv)>.<base64url(ciphertext)>
 */

const PBKDF2_ITERATIONS = 200_000;
const SALT_LENGTH = 16;  // bytes
const IV_LENGTH = 12;    // bytes for AES-GCM
const ENC_PREFIX = 'enc:';

/** Returns true if the URL hash looks like an encrypted payload */
export const isEncryptedHash = (hash: string): boolean =>
  hash.startsWith(ENC_PREFIX);

/** Encode bytes → URL-safe base64 */
const toBase64Url = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** Decode URL-safe base64 → Uint8Array */
const fromBase64Url = (str: string): Uint8Array => {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Derive an AES-GCM CryptoKey from a passphrase + salt via PBKDF2 */
const deriveKey = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};

/**
 * Encrypt plaintext with a passphrase.
 * Returns a string in the format:  enc:<salt_b64url>.<iv_b64url>.<cipher_b64url>
 */
export const encryptContent = async (
  plaintext: string,
  passphrase: string,
): Promise<string> => {
  const enc = new TextEncoder();
  const saltArr = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const ivArr = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const salt = new Uint8Array(saltArr);
  const iv = new Uint8Array(ivArr);
  const key = await deriveKey(passphrase, salt);

  const plainEncoded = enc.encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    plainEncoded as unknown as BufferSource,
  );

  return `${ENC_PREFIX}${toBase64Url(salt.buffer as ArrayBuffer)}.${toBase64Url(iv.buffer as ArrayBuffer)}.${toBase64Url(ciphertext)}`;
};

/**
 * Decrypt an encrypted payload with a passphrase.
 * Throws if the passphrase is wrong or the data is corrupted.
 */
export const decryptContent = async (
  encryptedHash: string,
  passphrase: string,
): Promise<string> => {
  const payload = encryptedHash.slice(ENC_PREFIX.length);
  const parts = payload.split('.');
  if (parts.length !== 3) throw new Error('Invalid encrypted payload format');

  const [saltB64, ivB64, cipherB64] = parts;
  const salt = fromBase64Url(saltB64);
  const iv = fromBase64Url(ivB64);
  const ciphertext = fromBase64Url(cipherB64);

  const key = await deriveKey(passphrase, salt);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(plainBuffer);
};
