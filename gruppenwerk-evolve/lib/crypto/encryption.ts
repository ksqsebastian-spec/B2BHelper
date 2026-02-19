/**
 * AES-256-GCM Verschluesselungs-Utility fuer API-Schluessel.
 * Verwendet Node.js crypto-Modul fuer serverseitige Verschluesselung.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/** Algorithmus fuer die Verschluesselung */
const ALGORITHM = 'aes-256-gcm' as const;

/** Laenge des Initialisierungsvektors in Bytes */
const IV_LENGTH = 16;

/** Laenge des Authentifizierungs-Tags in Bytes */
const AUTH_TAG_LENGTH = 16;

/**
 * Liest den Verschluesselungsschluessel aus der Umgebungsvariable.
 * Der Schluessel muss ein 64-Zeichen Hex-String sein (32 Bytes).
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY ist nicht gesetzt. Bitte setzen Sie die Umgebungsvariable.'
    );
  }

  if (key.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY muss ein 64-Zeichen Hex-String sein (256 Bit).'
    );
  }

  return Buffer.from(key, 'hex');
}

/**
 * Verschluesselt einen Klartext-String mit AES-256-GCM.
 * Gibt einen Base64-kodierten String zurueck, der IV, Auth-Tag und Chiffretext enthaelt.
 *
 * Format: base64(iv + authTag + ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // IV + Auth-Tag + verschluesselter Text zusammenfuegen
  const combined = Buffer.concat([iv, authTag, encrypted]);

  return combined.toString('base64');
}

/**
 * Entschluesselt einen Base64-kodierten String, der mit encrypt() erstellt wurde.
 * Erwartet das Format: base64(iv + authTag + ciphertext)
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();

  const combined = Buffer.from(ciphertext, 'base64');

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Ungueltiger verschluesselter Text: Zu kurz.');
  }

  // Bestandteile extrahieren
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
