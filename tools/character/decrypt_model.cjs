// Decrypts public/models/character.enc to tools/character/model/character.glb (gitignored)
// so the Blender scripts can read it. Usage: node tools/character/decrypt_model.cjs
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "..", "public", "models", "character.enc");
const out = path.join(__dirname, "model", "character.glb");
const buf = fs.readFileSync(src);
// Same key the site uses at runtime (src/components/Character/utils/character.ts).
const key = crypto.createHash("sha256").update("MyCharacter12").digest();
const decipher = crypto.createDecipheriv("aes-256-cbc", key, buf.subarray(0, 16));
const glb = Buffer.concat([decipher.update(buf.subarray(16)), decipher.final()]);
if (glb.subarray(0, 4).toString() !== "glTF") throw new Error("Decryption did not produce a GLB");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, glb);
console.log("wrote", out);
