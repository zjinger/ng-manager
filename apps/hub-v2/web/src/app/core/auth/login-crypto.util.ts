export interface EncryptedLoginPayload {
  cipherText: string;
}

export async function encryptLoginPassword(
  plaintext: string,
  publicKeyPem: string
): Promise<EncryptedLoginPayload> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('web crypto api is unavailable');
  }

  const keyData = pemToArrayBuffer(publicKeyPem);
  const key = await subtle.importKey(
    'spki',
    keyData,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await subtle.encrypt({ name: 'RSA-OAEP' }, key, encoded);
  return {
    cipherText: arrayBufferToBase64(encrypted),
  };
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalizedPem = pem.replace(/\\n/g, '\n').trim();
  const base64 = normalizedPem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s+/g, '');

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}
