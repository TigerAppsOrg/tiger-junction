// Authenticated encryption for sessions at rest (AES-256-GCM).
//
// A stored Stellic session is a live login. If the database leaks, the sealed
// blobs are useless without the key, which is kept outside the database — in an
// env var here, and in a KMS / secret manager in production.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // standard GCM nonce length
const KEY_BYTES = 32; // AES-256

/** Parse the hex-encoded 32-byte key from the environment, failing loudly. */
export function loadSealKey(hex: string | undefined): Buffer {
  if (!hex) throw new Error("SESSION_SEAL_KEY is not set");
  const key = Buffer.from(hex, "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `SESSION_SEAL_KEY must be ${KEY_BYTES} bytes (${KEY_BYTES * 2} hex chars)`,
    );
  }
  return key;
}

/** Encrypt an object to a base64 string of iv || authTag || ciphertext. */
export function seal(key: Buffer, value: unknown): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/** Reverse of seal(); throws if the blob was tampered with or the key is wrong. */
export function unseal<T>(key: Buffer, blob: string): T {
  const raw = Buffer.from(blob, "base64");
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + 16);
  const ciphertext = raw.subarray(IV_BYTES + 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
