import { InjectionToken } from '@angular/core';
import CryptoJS from 'crypto-js';

export const HUB_LOGIN_AES_KEY = new InjectionToken<string>('HUB_LOGIN_AES_KEY');

export interface EncryptedLoginPayload {
  iv: string;
  cipherText: string;
}

export function encryptLoginPassword(
  passwordWithNonce: string,
  secret: string
): EncryptedLoginPayload {
  const key = CryptoJS.SHA256(secret);
  const iv = CryptoJS.lib.WordArray.random(16);

  const encrypted = CryptoJS.AES.encrypt(passwordWithNonce, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  return {
    iv: CryptoJS.enc.Base64.stringify(iv),
    cipherText: encrypted.ciphertext.toString(CryptoJS.enc.Base64)
  };
}