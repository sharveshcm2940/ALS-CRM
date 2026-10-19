import { readFile } from "node:fs/promises";
import { pool, query } from "../config/index.js";
await query(
  "CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(160) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
);
const name = "001_initial.sql";
if (
  !(await query("SELECT name FROM schema_migrations WHERE name=?", [name]))
    .length
) {
  const sql = await readFile(new URL(name, import.meta.url), "utf8");
  for (const statement of sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await query(statement);
  await query("INSERT INTO schema_migrations(name) VALUES (?)", [name]);
  console.log("Applied", name);
} else console.log("Schema current");
await pool.end();
