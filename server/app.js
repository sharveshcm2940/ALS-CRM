import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { ZodError } from "zod";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query, config } from "./config/index.js";
import {
  csrf,
  auth,
  initialized,
  isAllowedOrigin,
  fail,
} from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { recordsRouter } from "./routes/records.js";
import { operationsRouter } from "./routes/operations.js";
export const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) callback(null, true);
      else callback(fail(403, "Origin not allowed"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Request limit reached. Please wait a minute." },
  }),
);
app.get("/api/health", async (req, res) => {
  try {
    await query("SELECT 1");
    res.json({ data: { status: "ok", database: "connected" } });
  } catch (e) {
    res.status(200).json({
      data: {
        status: "degraded",
        database: "disconnected",
        hint: "Configure DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME (or DATABASE_URL) in Render Environment Variables.",
      },
    });
  }
});
app.use("/api", csrf);
app.use("/api/auth", authRouter);
app.use("/api", auth, initialized, operationsRouter, recordsRouter);
app.use("/api", (req, res) =>
  res.status(404).json({ error: "Endpoint not found." }),
);
const dist = fileURLToPath(new URL("../dist", import.meta.url));
app.use(express.static(dist));
app.get("/{*path}", (req, res) => res.sendFile(path.join(dist, "index.html")));
app.use((err, req, res, next) => {
  if (err instanceof ZodError)
    return res.status(400).json({
      error: "Please check the form fields.",
      details: err.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  if (err.code === "ER_DUP_ENTRY")
    return res
      .status(409)
      .json({ error: "A record with this unique value already exists." });
  if (err.code === "ER_NO_REFERENCED_ROW_2")
    return res
      .status(400)
      .json({ error: "A referenced record no longer exists." });
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ error: "Invalid JSON." });
  if (err.type === "entity.too.large")
    return res.status(413).json({ error: "Request too large." });
  if (
    err.code === "ECONNREFUSED" ||
    err.code === "ETIMEDOUT" ||
    err.code === "ENOTFOUND" ||
    err.code === "EAI_AGAIN" ||
    err.code === "ER_ACCESS_DENIED_ERROR" ||
    err.code === "ER_BAD_DB_ERROR"
  ) {
    console.error(
      `Database connection error (${err.code}): ensure DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD are configured correctly in Render Environment Variables.`,
    );
    return res.status(503).json({
      error:
        "Database is currently unreachable. Please ensure your cloud MySQL credentials (DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) are configured in your Render dashboard environment variables.",
    });
  }
  if (!err.status) console.error("Request failed:", err.code || err.name);
  res.status(err.status || 500).json({
    error: err.status
      ? err.message
      : "The request could not be completed. Please try again.",
  });
});
