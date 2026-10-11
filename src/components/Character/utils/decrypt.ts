async function generateAESKey(password: string): Promise<CryptoKey> {
  const passwordBuffer = new TextEncoder().encode(password);
  const hashedPassword = await crypto.subtle.digest("SHA-256", passwordBuffer);
  return crypto.subtle.importKey(
    "raw",
    hashedPassword.slice(0, 32),
    { name: "AES-CBC" },
    false,
    ["encrypt", "decrypt"]
  );
}

export const decryptFile = async (
  url: string,
  password: string
): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  const encryptedData = await response.arrayBuffer();
  const iv = new Uint8Array(encryptedData.slice(0, 16));
  const data = encryptedData.slice(16);
  // Web Crypto exists only on HTTPS or localhost. Over plain HTTP (a dev server opened
  // from a phone on the LAN) the same decryption runs in JS instead.
  if (!globalThis.crypto?.subtle) {
    const { sha256, aes256CbcDecrypt } = await import("./aesFallback");
    const key = sha256(new TextEncoder().encode(password));
    const plain = aes256CbcDecrypt(key, iv, new Uint8Array(data));
    return plain.slice().buffer;
  }
  const key = await generateAESKey(password);
  return crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, data);
};
