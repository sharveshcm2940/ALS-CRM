import { app } from "./app.js";
import { pool, config } from "./config/index.js";
const server = app.listen(config.port, "0.0.0.0", () =>
  console.log(`ALS CRM API listening on port ${config.port}`),
);
async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
