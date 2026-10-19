import { spawn } from "node:child_process";
import { mkdir, rename, unlink } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
await mkdir(".local", { recursive: true, mode: 0o700 });
const temporary = ".local/database.sql.tmp";
const child = spawn(
  "docker",
  [
    "exec",
    "als-crm-mysql",
    "sh",
    "-c",
    'MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump --user="$MYSQL_USER" --single-transaction --no-tablespaces --set-gtid-purged=OFF --column-statistics=0 "$MYSQL_DATABASE"',
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let error = "";
child.stderr.on("data", (b) => (error += b));
const completed = new Promise((resolve, reject) =>
  child
    .on("error", reject)
    .on("close", (code) =>
      code === 0 ? resolve() : reject(new Error("Backup failed: " + error)),
    ),
);
try {
  await Promise.all([
    pipeline(child.stdout, createWriteStream(temporary, { mode: 0o600 })),
    completed,
  ]);
  await rename(temporary, ".local/database.sql");
  console.log(
    "Consistent backup saved to ignored .local/database.sql. Treat it as sensitive and encrypt off-machine copies.",
  );
} catch (e) {
  await unlink(temporary).catch(() => {});
  throw e;
}
