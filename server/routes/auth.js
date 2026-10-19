import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import bcrypt from "bcrypt";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { query } from "../config/index.js";
import { auth, cookieOptions, issueCsrf, fail } from "../middleware/auth.js";
import { audit, transaction } from "../services/audit.js";
export const authRouter = Router();
const loginSchema = z
  .object({
    username: z.string().trim().min(1).max(254),
    password: z.string().min(1).max(128),
  })
  .strict();
const passwordSchema = z
  .object({
    currentPassword: z.string().max(128),
    newPassword: z
      .string()
      .min(14)
      .max(72)
      .refine(
        (v) => Buffer.byteLength(v, "utf8") <= 72,
        "Password must be at most 72 UTF-8 bytes",
      )
      .regex(/[A-Za-z]/)
      .regex(/[0-9]/),
  })
  .strict();
const dummy = await bcrypt.hash(randomUUID(), 12);
authRouter.get("/csrf", (req, res) =>
  res.json({ data: { csrf: issueCsrf(res) } }),
);
authRouter.post(
  "/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    skipSuccessfulRequests: true,
    keyGenerator: (req) =>
      createHash("sha256")
        .update(
          String(req.body?.username || "")
            .trim()
            .toLowerCase(),
        )
        .digest("hex"),
    message: {
      error: "Too many attempts for this account. Try again in 15 minutes.",
    },
  }),
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many login attempts. Try again in 15 minutes." },
  }),
  async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const [u] = await query(
      "SELECT * FROM users WHERE username=? OR (email=? AND email_verified=1)",
      [username, username],
    );
    const valid = await bcrypt.compare(password, u?.password_hash || dummy);
    if (!u || !valid || !u.active) {
      await audit(null, "login.failed", "auth", null, "Failed sign-in attempt");
      throw fail(401, "Invalid credentials or inactive account.");
    }
    const id = randomUUID();
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await transaction(async (db) => {
      await query(
        "DELETE FROM sessions WHERE expires_at<=UTC_TIMESTAMP()",
        [],
        db,
      );
      await query(
        "INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 8 HOUR))",
        [id, u.id, tokenHash],
        db,
      );
      await audit(u.id, "login", "auth", u.id, "Signed in", db);
    });
    res.cookie("session", token, {
      ...cookieOptions,
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.json({
      data: {
        csrf: issueCsrf(res),
        must_change_password: !!u.must_change_password,
      },
    });
  },
);
authRouter.get("/me", auth, (req, res) => res.json({ data: req.user }));
authRouter.post("/logout", auth, async (req, res) => {
  await query("DELETE FROM sessions WHERE id=?", [req.sessionId]);
  await audit(req.user.id, "logout", "auth", req.user.id, "Signed out");
  res.clearCookie("session", cookieOptions);
  res.json({ data: { ok: true } });
});
authRouter.patch("/change-password", auth, async (req, res) => {
  const input = passwordSchema.parse(req.body);
  const [u] = await query("SELECT password_hash FROM users WHERE id=?", [
    req.user.id,
  ]);
  if (!(await bcrypt.compare(input.currentPassword, u.password_hash)))
    throw fail(400, "Current password is incorrect.");
  if (await bcrypt.compare(input.newPassword, u.password_hash))
    throw fail(400, "Choose a different password.");
  const hash = await bcrypt.hash(input.newPassword, 12);
  await transaction(async (db) => {
    await query(
      "UPDATE users SET password_hash=?,must_change_password=0 WHERE id=?",
      [hash, req.user.id],
      db,
    );
    await query("DELETE FROM sessions WHERE user_id=?", [req.user.id], db);
    await audit(
      req.user.id,
      "password.changed",
      "auth",
      req.user.id,
      "Password changed; all sessions revoked",
      db,
    );
  });
  res.clearCookie("session", cookieOptions);
  res.json({ data: { ok: true } });
});
