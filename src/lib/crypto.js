// SPDX-License-Identifier: Apache-2.0
const KDF_ITERATIONS = 310_000

export const cryptoAvailable = () =>
  typeof globalThis.crypto?.subtle?.deriveKey === 'function'

const enc = new TextEncoder()
const dec = new TextDecoder()

const toB64 = (buf) => {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  }
  return btoa(s)
}

const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

async function deriveKey(passphrase, salt, iterations) {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Verschlüsselt ein beliebiges JSON-fähiges Objekt zu einem Umschlag. */
export async function seal(data, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt, KDF_ITERATIONS)
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(data)),
  )
  return {
    alg: 'AES-GCM-256',
    kdf: 'PBKDF2-SHA256',
    iterations: KDF_ITERATIONS,
    salt: toB64(salt),
    iv: toB64(iv),
    ct: toB64(ct),
  }
}

/** Öffnet einen Umschlag. Wirft bei falscher Passphrase. */
export async function open(envelope, passphrase) {
  const key = await deriveKey(
    passphrase,
    fromB64(envelope.salt),
    envelope.iterations ?? KDF_ITERATIONS,
  )
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(envelope.iv) },
    key,
    fromB64(envelope.ct),
  )
  return JSON.parse(dec.decode(pt))
}
