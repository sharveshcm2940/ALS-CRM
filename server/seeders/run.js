import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { mkdir, appendFile, chmod } from "node:fs/promises";
import { pool, query, config } from "../config/index.js";
import { permissions, defaults } from "../services/permissions.js";
const names = [
  ["Abdul", "abdul", "ceo"],
  ["Aakash", "aakash", "board"],
  ["Aadarsh", "aadarsh", "board"],
  ["Tharun", "tharun", "board"],
  ["Siddharth", "siddharth", "engineer"],
  ["Lohith", "lohith", "engineer"],
  ["Sarveshvaran A", "sarveshvaran.a", "engineer"],
  ["Sharvesh CM", "sharvesh.cm", "engineer"],
  ["Saranya Devi", "saranya.devi", "engineer"],
];
const existingRoles = new Set(
  (await query("SELECT id FROM roles")).map((r) => r.id),
);
for (const [id, name] of [
  ["ceo", "CEO"],
  ["board", "Board member"],
  ["engineer", "Engineering"],
])
  await query("INSERT IGNORE INTO roles(id,name) VALUES (?,?)", [id, name]);
for (const p of permissions)
  await query("INSERT IGNORE INTO permissions(id) VALUES (?)", [p]);
// Existing permission customizations are never overwritten by a seed rerun.
for (const role of Object.keys(defaults))
  if (!existingRoles.has(role))
    for (const p of defaults[role])
      await query("INSERT INTO role_permissions VALUES (?,?)", [role, p]);
await mkdir(".local", { recursive: true, mode: 0o700 });
let count = 0;
for (const [name, username, role] of names) {
  if ((await query("SELECT id FROM users WHERE username=?", [username])).length)
    continue;
  const password =
    process.env.INITIAL_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    randomBytes(18).toString("base64url");
  await query(
    "INSERT INTO users(id,name,username,password_hash,role_id) VALUES (?,?,?,?,?)",
    [randomUUID(), name, username, await bcrypt.hash(password, 12), role],
  );
  await appendFile(
    ".local/initial-accounts.txt",
    `${username}\t${password}\n`,
    { mode: 0o600 },
  );
  count++;
}
if (count) await chmod(".local/initial-accounts.txt", 0o600);
await query(
  "INSERT IGNORE INTO settings(id,company_name,timezone) VALUES (1,?,?)",
  ["ALS Infonet", config.timezone],
);
console.log(
  `Provisioned ${count} accounts. Temporary credentials are in ignored .local/initial-accounts.txt; users must change them on first login. No business records seeded.`,
);
await pool.end();
