import bcrypt from "bcrypt";
import { query, pool } from "../server/config/index.js";

const hash = await bcrypt.hash("Admin@12345", 12);
await query(
  "UPDATE users SET password_hash = ?, must_change_password = 0 WHERE username IN ('sharvesh.cm', 'sarveshvaran.a', 'saranya.devi', 'abdul')",
  [hash],
);
console.log("Updated passwords for key team members to Admin@12345");
await pool.end();
