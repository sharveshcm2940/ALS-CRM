import "dotenv/config";
import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.length < 32 ||
  process.env.JWT_SECRET.startsWith("REPLACE")
)
  throw new Error("Set a strong JWT_SECRET in .env");
export const config = {
  port: Number(process.env.PORT || 4000),
  origin: process.env.APP_ORIGIN || "http://localhost:5173",
  production: process.env.NODE_ENV === "production",
  timezone: process.env.COMPANY_TIMEZONE || "Asia/Kolkata",
};
export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3307),
  user: process.env.DB_USER || "als_app",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "als_crm",
  connectionLimit: 10,
  ...(process.env.DB_SSL === "true"
    ? {
        ssl: {
          rejectUnauthorized: true,
          ...(process.env.DB_SSL_CA_FILE
            ? { ca: readFileSync(process.env.DB_SSL_CA_FILE, "utf8") }
            : {}),
        },
      }
    : {}),
  timezone: "Z",
  dateStrings: true,
  decimalNumbers: true,
});
// mysql2's timezone option controls encoding; explicitly pin server sessions too.
pool.on("connection", (connection) =>
  connection.query("SET time_zone = '+00:00'"),
);
export async function query(sql, params = [], db = pool) {
  const [rows] = await db.execute(sql, params);
  return rows;
}
