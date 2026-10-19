import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
function run(command, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "docker",
      ["exec", ...(input ? ["-i"] : []), "als-crm-mysql", "sh", "-c", command],
      { stdio: [input ? "pipe" : "ignore", "pipe", "pipe"] },
    );
    let output = "",
      error = "";
    child.stdout.on("data", (b) => (output += b));
    child.stderr.on("data", (b) => (error += b));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(output.trim()) : reject(new Error(error)),
    );
    if (input) pipeline(createReadStream(input), child.stdin).catch(reject);
  });
}
const root = 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql --user=root';
const db = "als_crm_recovery_" + Date.now();
const original = await run(
  `${root} --batch --skip-column-names "$MYSQL_DATABASE" -e 'SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM schema_migrations; SELECT COUNT(*) FROM customers; SELECT COUNT(*) FROM projects'`,
);
try {
  await run(`${root} -e 'CREATE DATABASE ${db}'`);
  await run(`${root} ${db}`, ".local/database.sql");
  const restored = await run(
    `${root} --batch --skip-column-names ${db} -e 'SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM schema_migrations; SELECT COUNT(*) FROM customers; SELECT COUNT(*) FROM projects'`,
  );
  if (restored !== original)
    throw new Error(
      "Restored counts differ from current database. Create a fresh backup and retry.",
    );
  console.log(
    "PASS: backup restored into isolated recovery database; account, migration, customer and project counts verified.",
  );
} finally {
  await run(`${root} -e 'DROP DATABASE IF EXISTS ${db}'`);
}
