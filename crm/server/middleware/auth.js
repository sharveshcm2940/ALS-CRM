import jwt from "jsonwebtoken";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { query, config } from "../config/index.js";
export const cookieOptions = {
  httpOnly: true,
  secure: config.production,
  sameSite: "strict",
  path: "/",
};
export function fail(status, message) {
  return Object.assign(new Error(message), { status });
}
export function csrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.get("origin") && req.get("origin") !== config.origin)
    return next(fail(403, "Origin not allowed"));
  const a = req.cookies.csrf,
    b = req.get("x-csrf-token");
  if (
    !a ||
    !b ||
    a.length !== b.length ||
    !timingSafeEqual(Buffer.from(a), Buffer.from(b))
  )
    return next(fail(403, "Invalid request token. Refresh and try again."));
  next();
}
export function issueCsrf(res) {
  const token = randomBytes(32).toString("hex");
  res.cookie("csrf", token, {
    ...cookieOptions,
    httpOnly: false,
    maxAge: 8 * 60 * 60 * 1000,
  });
  return token;
}
export async function auth(req, res, next) {
  try {
    const token = jwt.verify(
      req.cookies.session || "",
      process.env.JWT_SECRET,
      { algorithms: ["HS256"], issuer: "als-crm", audience: "als-browser" },
    );
    const rows = await query(
      "SELECT u.id,u.name,u.username,u.email,u.email_verified,u.role_id,u.must_change_password FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.id=? AND s.user_id=? AND s.expires_at>UTC_TIMESTAMP() AND u.active=1",
      [token.jti, token.sub],
    );
    if (!rows.length) throw Error();
    req.user = rows[0];
    req.sessionId = token.jti;
    req.user.permissions = (
      await query(
        "SELECT permission_id FROM role_permissions WHERE role_id=?",
        [req.user.role_id],
      )
    ).map((x) => x.permission_id);
    next();
  } catch (e) {
    if (e.code) return next(e);
    next(fail(401, "Your session has expired. Please sign in."));
  }
}
export function initialized(req, res, next) {
  if (req.user.must_change_password)
    return next(fail(403, "Change your temporary password before continuing."));
  next();
}
export function permit(permission) {
  return (req, res, next) =>
    req.user.permissions.includes(permission)
      ? next()
      : next(fail(403, "You do not have permission for this action."));
}
