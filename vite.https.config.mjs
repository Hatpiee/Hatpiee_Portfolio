// Dev server and preview over HTTPS, for testing on a phone over the local network
// (`npm run dev:https`, `npm run preview:https`; see "Testing on a phone" in the README).
// Browsers only expose Web Crypto on HTTPS or localhost; this tests a phone in that secure
// context, as on the deployed site (plain http://<LAN IP> uses a slower JS decryption).
import fs from "node:fs";
import { defineConfig, mergeConfig } from "vite";
import baseConfig from "./vite.config.ts";

const key = new URL("./.cert/dev-key.pem", import.meta.url);
const cert = new URL("./.cert/dev-cert.pem", import.meta.url);
if (!fs.existsSync(key) || !fs.existsSync(cert)) {
  throw new Error(
    "Missing .cert/dev-key.pem or .cert/dev-cert.pem. Create a local self-signed certificate " +
      'first (see "Testing on a phone" in the README).'
  );
}
const https = { key: fs.readFileSync(key), cert: fs.readFileSync(cert) };

export default mergeConfig(
  baseConfig,
  defineConfig({
    server: { host: true, https },
    preview: { host: true, https },
  })
);
