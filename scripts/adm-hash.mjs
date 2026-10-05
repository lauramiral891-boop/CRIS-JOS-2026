// Uso: node scripts/adm-hash.mjs "minha-senha-nova"   → imprime o hash para colar em ADM_HASH (src/lib/adm.ts)
import { createHash, randomBytes } from "crypto";
const sha = (t) => createHash("sha256").update(t, "utf8").digest("hex");
const pass = process.argv[2];
if (!pass || pass.length < 8) { console.error("Indique uma senha com 8+ caracteres."); process.exit(1); }
const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const salt = [...randomBytes(10)].map((b) => A[b % A.length]).join("");
let h = sha(`${salt}:${pass}`);
for (let i = 0; i < 2000; i++) h = sha(`${h}${salt}${pass}`);
console.log(`v1$${salt}$${h}`);
