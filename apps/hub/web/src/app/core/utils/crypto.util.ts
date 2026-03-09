import { InjectionToken } from '@angular/core';

export const HUB_LOGIN_AES_KEY = new InjectionToken<string>('HUB_LOGIN_AES_KEY');

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(secret);
  const keyBytes = await crypto.subtle.digest('SHA-256', secretBytes);

  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt']);
}

export interface EncryptedLoginPayload {
  iv: string;
  cipherText: string;
}

export async function encryptLoginPassword(
  passwordWithNonce: string,
  secret: string
): Promise<EncryptedLoginPayload> {
  const encoder = new TextEncoder();
  const key = await deriveAesKey(secret);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plainBytes = encoder.encode(passwordWithNonce);

  const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBytes);

  return {
    iv: bytesToBase64(iv),
    cipherText: bytesToBase64(new Uint8Array(encryptedBuffer))
  };
}