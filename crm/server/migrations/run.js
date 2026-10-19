import { readFile, readdir } from "node:fs/promises";
import { pool, query } from "../config/index.js";
await query(
  "CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(160) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
);
const names = (await readdir(new URL(".", import.meta.url)))
  .filter((name) => /^\d+_.*\.sql$/.test(name))
  .sort();
for (const name of names) {
  if (
    (await query("SELECT name FROM schema_migrations WHERE name=?", [name]))
      .length
  )
    continue;
  const sql = await readFile(new URL(name, import.meta.url), "utf8");
  for (const statement of sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await query(statement);
  await query("INSERT INTO schema_migrations(name) VALUES (?)", [name]);
  console.log("Applied", name);
}
console.log("Schema current");
await pool.end();
