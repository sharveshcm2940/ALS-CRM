import { randomBytes } from "node:crypto";
import { mkdir, writeFile, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
await mkdir(".local", { recursive: true, mode: 0o700 });
try {
  await access(".env");
} catch {
  await writeFile(
    ".env",
    `NODE_ENV=development\nPORT=4000\nAPP_ORIGIN=http://localhost:5173\nDB_HOST=127.0.0.1\nDB_PORT=3307\nDB_NAME=als_crm\nDB_USER=als_app\nDB_PASSWORD=${randomBytes(32).toString("hex")}\nCOMPANY_TIMEZONE=Asia/Kolkata\n`,
    { mode: 0o600 },
  );
}
await import("dotenv/config");
const existing = spawnSync("docker", ["inspect", "als-crm-mysql"], {
  stdio: "ignore",
});
if (existing.status === 0) {
  const r = spawnSync("docker", ["start", "als-crm-mysql"], {
    stdio: "inherit",
  });
  if (r.status) process.exit(r.status);
} else {
  const root = randomBytes(32).toString("hex");
  await writeFile(
    ".local/mysql.env",
    `MYSQL_ROOT_PASSWORD=${root}\nMYSQL_DATABASE=${process.env.DB_NAME}\nMYSQL_USER=${process.env.DB_USER}\nMYSQL_PASSWORD=${process.env.DB_PASSWORD}\n`,
    { mode: 0o600 },
  );
  const r = spawnSync(
    "docker",
    [
      "run",
      "-d",
      "--name",
      "als-crm-mysql",
      "--restart",
      "unless-stopped",
      "-p",
      "127.0.0.1:3307:3306",
      "--env-file",
      ".local/mysql.env",
      "-v",
      "als-crm-mysql-data:/var/lib/mysql",
      "mysql:8.4",
    ],
    { stdio: "inherit" },
  );
  if (r.status) process.exit(r.status);
}
const mysql = await import("mysql2/promise");
let ready = false;
for (let n = 0; n < 60; n++) {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    await db.query("SELECT 1");
    await db.end();
    ready = true;
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 1000));
  }
}
if (!ready) throw Error("MySQL readiness timeout");
const check = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
const [tables] = await check.query("SHOW TABLES");
await check.end();
if (tables.length === 0) {
  try {
    await access(".local/database.sql");
    const restored = spawnSync(
      "docker",
      [
        "exec",
        "-i",
        "als-crm-mysql",
        "sh",
        "-c",
        'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --user="$MYSQL_USER" "$MYSQL_DATABASE"',
      ],
      {
        input: Buffer.concat([
          await readFile(".local/database.sql"),
          Buffer.from("\nDELETE FROM sessions;\n"),
        ]),
        stdio: ["pipe", "inherit", "inherit"],
      },
    );
    if (restored.status) throw Error("Database snapshot restore failed");
    console.log("Restored retained database backup.");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}
console.log(
  "MySQL ready; local credentials are in ignored .env and .local/mysql.env.",
);
