import CryptoJS from 'crypto-js';

export interface EncryptedLoginPayload {
  cipherText: string;
}

const LOGIN_AES_KEY_SALT = 'ngm_hub_v2_login_key_v1';
const LOGIN_AES_IV_SALT = 'ngm_hub_v2_login_iv_v1';

export async function encryptLoginPassword(
  plaintext: string,
  nonce: string
): Promise<EncryptedLoginPayload> {
  const key = CryptoJS.SHA256(`${nonce}:${LOGIN_AES_KEY_SALT}`);
  const ivHex = CryptoJS.SHA256(`${nonce}:${LOGIN_AES_IV_SALT}`)
    .toString(CryptoJS.enc.Hex)
    .slice(0, 32);
  const iv = CryptoJS.enc.Hex.parse(ivHex);

  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    cipherText: CryptoJS.enc.Base64.stringify(encrypted.ciphertext),
  };
}

