import CryptoJS from 'crypto-js';

export interface EncryptedLoginPayload {
  iv: string;
  cipherText: string;
}

export function encryptLoginPassword(passwordWithNonce: string, secret: string): EncryptedLoginPayload {
  const key = CryptoJS.SHA256(secret);
  const iv = CryptoJS.lib.WordArray.random(16);

  const encrypted = CryptoJS.AES.encrypt(passwordWithNonce, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    iv: CryptoJS.enc.Base64.stringify(iv),
    cipherText: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
  };
}
