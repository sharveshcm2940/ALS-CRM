import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { appendFile, mkdir } from "node:fs/promises";
import { pool, query } from "../server/config/index.js";
import { audit, transaction } from "../server/services/audit.js";
const username = process.argv[2];
if (!username) throw Error("Usage: npm run account:reset -- username");
const [u] = await query("SELECT id FROM users WHERE username=?", [username]);
if (!u) throw Error("Account not found");
const password = randomBytes(18).toString("base64url");
const hash = await bcrypt.hash(password, 12);
await transaction(async (db) => {
  await query(
    "UPDATE users SET password_hash=?,must_change_password=1 WHERE id=?",
    [hash, u.id],
    db,
  );
  await query("DELETE FROM sessions WHERE user_id=?", [u.id], db);
  await audit(
    null,
    "password.admin_reset",
    "users",
    u.id,
    "Administrator issued temporary credential via local CLI",
    db,
  );
});
await mkdir(".local", { recursive: true, mode: 0o700 });
await appendFile(".local/reset-credentials.txt", `${username}\t${password}\n`, {
  mode: 0o600,
});
console.log(
  "Temporary credential written to ignored .local/reset-credentials.txt. Deliver through a verified private channel.",
);
await pool.end();
