import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { randomUUID, randomBytes } from "node:crypto";
import { query, config } from "../config/index.js";
import { permit, fail } from "../middleware/auth.js";
import { scope, listRecords } from "../services/records.js";
import { modules, permissions } from "../services/permissions.js";
import { transaction, audit } from "../services/audit.js";
import { companyTimezone, dateInZone, midnightUtc } from "../services/time.js";
export const operationsRouter = Router();
const safeUser =
  "id,name,username,email,email_verified,role_id,active,must_change_password,created_at";
const ceo = (req, res, next) =>
  req.user.role_id === "ceo" ? next() : next(fail(403, "CEO access required."));
async function activity(user) {
  if (user.role_id === "ceo")
    return query(
      "SELECT a.*,u.name actor_name FROM activity_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 30",
    );
  if (user.role_id === "engineer")
    return query(
      "SELECT a.*,u.name actor_name FROM activity_logs a LEFT JOIN users u ON u.id=a.actor_id WHERE a.actor_id=? ORDER BY a.created_at DESC LIMIT 30",
      [user.id],
    );
  const clauses = [],
    params = [];
  for (const m of modules.filter((m) =>
    user.permissions.includes(`${m}.read`),
  )) {
    const s = scope(m, user);
    clauses.push(
      `(a.module=? AND EXISTS(SELECT 1 FROM ${m} r WHERE r.id=a.record_id AND (${s.sql})))`,
    );
    params.push(m, ...s.params);
  }
  return query(
    `SELECT a.*,u.name actor_name FROM activity_logs a LEFT JOIN users u ON u.id=a.actor_id WHERE ${clauses.length ? clauses.join(" OR ") : "1=0"} ORDER BY a.created_at DESC LIMIT 30`,
    params,
  );
}
async function counts(module, user) {
  const s = scope(module, user);
  const timezone = await companyTimezone();
  const today = dateInZone(new Date(), timezone);
  const [row] = await query(
    `SELECT COUNT(*) total${module === "tasks" ? ", SUM(status='Completed' AND completed_at>=?) completed_month, SUM(status<>'Completed' AND due_date<?) overdue, SUM(status<>'Completed' AND due_date=?) due_today" : ""} FROM ${module} r WHERE r.archived_at IS NULL AND (${s.sql})`,
    [
      ...(module === "tasks"
        ? [midnightUtc(today.slice(0, 7) + "-01", timezone), today, today]
        : []),
      ...s.params,
    ],
  );
  return row;
}
operationsRouter.get("/dashboard", async (req, res) => {
  const user = req.user,
    metrics = {};
  for (const m of modules.filter((m) => user.permissions.includes(`${m}.read`)))
    metrics[m] = await counts(m, user);
  for (const m of ["leads", "projects"])
    if (metrics[m]) {
      const s = scope(m, user);
      const [r] = await query(
        `SELECT COUNT(*) total FROM ${m} r WHERE r.archived_at IS NULL AND (${s.sql}) AND r.status ${m === "leads" ? "NOT IN ('Won','Lost')" : "IN ('Planning','Active','On Hold')"}`,
        s.params,
      );
      metrics[m].active = r.total;
    }
  const recent = {};
  for (const m of ["projects", "tasks", "announcements"])
    if (user.permissions.includes(`${m}.read`))
      recent[m] = (
        await listRecords(m, user, { limit: 6, sort: "updated_at" })
      ).data;
  if (user.permissions.includes("meetings.read")) {
    const s = scope("meetings", user);
    recent.meetings = await query(
      `SELECT r.* FROM meetings r WHERE r.archived_at IS NULL AND r.starts_at>=UTC_TIMESTAMP() AND (${s.sql}) ORDER BY r.starts_at LIMIT 5`,
      s.params,
    );
    const [c] = await query(
      `SELECT COUNT(*) total FROM meetings r WHERE r.archived_at IS NULL AND r.starts_at>=UTC_TIMESTAMP() AND (${s.sql})`,
      s.params,
    );
    metrics.meetings.upcoming = c.total;
  }
  if (user.permissions.includes("tasks.read")) {
    const s = scope("tasks", user);
    recent.priorities = await query(
      `SELECT r.* FROM tasks r WHERE r.archived_at IS NULL AND r.status<>'Completed' AND (${s.sql}) AND r.priority IN ('High','Urgent') ORDER BY r.due_date IS NULL,r.due_date LIMIT 5`,
      s.params,
    );
    recent.deadlines = await query(
      `SELECT r.* FROM tasks r WHERE r.archived_at IS NULL AND r.status<>'Completed' AND r.due_date IS NOT NULL AND (${s.sql}) ORDER BY r.due_date LIMIT 5`,
      s.params,
    );
  }
  let workload = [];
  if (
    user.permissions.includes("team.read") &&
    user.permissions.includes("tasks.read")
  ) {
    const s = scope("tasks", user);
    workload = await query(
      `SELECT u.id,u.name,COUNT(r.id) tasks,COALESCE(SUM(r.status='Completed'),0) completed FROM users u LEFT JOIN tasks r ON r.assignee_id=u.id AND r.archived_at IS NULL AND (${s.sql}) WHERE u.active=1 GROUP BY u.id,u.name ORDER BY tasks DESC`,
      s.params,
    );
  }
  res.json({
    data: { metrics, recent, workload, activity: await activity(user) },
  });
});
operationsRouter.get("/team", permit("team.read"), async (req, res) =>
  res.json({
    data: await query("SELECT id,name,role_id,active FROM users ORDER BY name"),
  }),
);
operationsRouter.get("/activity", async (req, res) =>
  res.json({ data: await activity(req.user) }),
);
operationsRouter.get("/audit", ceo, permit("audit.read"), async (req, res) => {
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .max(100000)
    .parse(req.query.page || 1);
  const [{ total }] = await query("SELECT COUNT(*) total FROM activity_logs");
  const offset = Math.min(page - 1, 100000) * 30;
  res.json({
    data: await query(
      "SELECT a.*,u.name actor_name FROM activity_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 30 OFFSET ?",
      [offset],
    ),
    meta: { page, total, pages: Math.ceil(total / 30) },
  });
});
operationsRouter.get("/notifications", async (req, res) =>
  res.json({
    data: await query(
      "SELECT id,message,read_at,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
      [req.user.id],
    ),
  }),
);
operationsRouter.patch("/notifications/:id", async (req, res) => {
  z.uuid().parse(req.params.id);
  await query(
    "UPDATE notifications SET read_at=UTC_TIMESTAMP() WHERE id=? AND user_id=?",
    [req.params.id, req.user.id],
  );
  res.json({ data: { ok: true } });
});
operationsRouter.get("/settings", async (req, res) => {
  const [settings] = await query(
    "SELECT company_name,timezone FROM settings WHERE id=1",
  );
  res.json({
    data: settings || {
      company_name: "ALS Infonet",
      timezone: config.timezone,
    },
  });
});
operationsRouter.patch(
  "/settings",
  ceo,
  permit("settings.manage"),
  async (req, res) => {
    const input = z
      .object({
        company_name: z.string().trim().min(1).max(160),
        timezone: z
          .string()
          .min(1)
          .max(80)
          .refine((v) => {
            try {
              new Intl.DateTimeFormat("en", { timeZone: v });
              return true;
            } catch {
              return false;
            }
          }, "Use an IANA timezone"),
      })
      .strict()
      .parse(req.body);
    await transaction(async (db) => {
      await query(
        "UPDATE settings SET company_name=?,timezone=? WHERE id=1",
        [input.company_name, input.timezone],
        db,
      );
      await audit(
        req.user.id,
        "settings.updated",
        "settings",
        null,
        "Updated company settings",
        db,
      );
    });
    res.json({ data: input });
  },
);
operationsRouter.get(
  "/permissions",
  ceo,
  permit("permissions.manage"),
  async (req, res) =>
    res.json({
      data: {
        available: permissions,
        roles: await query("SELECT * FROM roles"),
        grants: await query("SELECT * FROM role_permissions"),
      },
    }),
);
operationsRouter.put(
  "/permissions/:role",
  ceo,
  permit("permissions.manage"),
  async (req, res) => {
    const role = z.enum(["board", "engineer"]).parse(req.params.role);
    const { grants } = z
      .object({ grants: z.array(z.enum(permissions)).max(100) })
      .strict()
      .parse(req.body);
    if (
      grants.some((p) =>
        [
          "users.manage",
          "settings.manage",
          "audit.read",
          "permissions.manage",
        ].includes(p),
      )
    )
      throw fail(400, "Administrative permissions are reserved for the CEO.");
    await transaction(async (db) => {
      await query("DELETE FROM role_permissions WHERE role_id=?", [role], db);
      for (const p of new Set(grants))
        await query("INSERT INTO role_permissions VALUES (?,?)", [role, p], db);
      await audit(
        req.user.id,
        "permissions.updated",
        "roles",
        null,
        `Updated ${role} permissions`,
        db,
      );
    });
    res.json({ data: { ok: true } });
  },
);
operationsRouter.get("/users", ceo, permit("users.manage"), async (req, res) =>
  res.json({
    data: await query(`SELECT ${safeUser} FROM users ORDER BY created_at`),
  }),
);
const userSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    username: z.string().regex(/^[a-z0-9._-]{3,80}$/),
    email: z
      .union([z.email().max(254), z.literal(""), z.null()])
      .transform((v) => v || null),
    email_verified: z.boolean(),
    role_id: z.enum(["ceo", "board", "engineer"]),
    active: z.boolean(),
  })
  .strict();
operationsRouter.post(
  "/users",
  ceo,
  permit("users.manage"),
  async (req, res) => {
    const input = userSchema.parse(req.body);
    if (input.email_verified && !input.email)
      throw fail(400, "A verified email requires an email address.");
    const id = randomUUID(),
      temporary_password = randomBytes(18).toString("base64url"),
      hash = await bcrypt.hash(temporary_password, 12);
    await transaction(async (db) => {
      await query(
        "INSERT INTO users(id,name,username,email,email_verified,role_id,active,password_hash) VALUES (?,?,?,?,?,?,?,?)",
        [
          id,
          input.name,
          input.username,
          input.email,
          input.email_verified,
          input.role_id,
          input.active,
          hash,
        ],
        db,
      );
      await audit(
        req.user.id,
        "user.created",
        "users",
        id,
        "Created individual account",
        db,
      );
    });
    res.status(201).json({ data: { id, temporary_password } });
  },
);
operationsRouter.patch(
  "/users/:id",
  ceo,
  permit("users.manage"),
  async (req, res) => {
    z.uuid().parse(req.params.id);
    const input = userSchema.partial().parse(req.body);
    if (
      req.params.id === req.user.id &&
      (input.active === false || (input.role_id && input.role_id !== "ceo"))
    )
      throw fail(400, "You cannot disable or demote your own CEO account.");
    const [existing] = await query("SELECT * FROM users WHERE id=?", [
      req.params.id,
    ]);
    if (!existing) throw fail(404, "User not found.");
    const merged = { ...existing, ...input };
    if (merged.email_verified && !merged.email)
      throw fail(400, "A verified email requires an email address.");
    if (
      input.email !== undefined &&
      input.email !== existing.email &&
      input.email_verified !== true
    )
      input.email_verified = false;
    const keys = Object.keys(input);
    if (!keys.length) throw fail(400, "No changes supplied.");
    await transaction(async (db) => {
      await query(
        `UPDATE users SET ${keys.map((k) => `${k}=?`).join(",")} WHERE id=?`,
        [...Object.values(input), req.params.id],
        db,
      );
      await query("DELETE FROM sessions WHERE user_id=?", [req.params.id], db);
      await audit(
        req.user.id,
        "user.updated",
        "users",
        req.params.id,
        "Updated user account; sessions revoked",
        db,
      );
    });
    res.json({ data: { ok: true } });
  },
);
operationsRouter.post(
  "/users/:id/reset-password",
  ceo,
  permit("users.manage"),
  async (req, res) => {
    z.uuid().parse(req.params.id);
    if (
      !(await query("SELECT id FROM users WHERE id=?", [req.params.id])).length
    )
      throw fail(404, "User not found.");
    const temporary_password = randomBytes(18).toString("base64url"),
      hash = await bcrypt.hash(temporary_password, 12);
    await transaction(async (db) => {
      await query(
        "UPDATE users SET password_hash=?,must_change_password=1 WHERE id=?",
        [hash, req.params.id],
        db,
      );
      await query("DELETE FROM sessions WHERE user_id=?", [req.params.id], db);
      await audit(
        req.user.id,
        "password.admin_reset",
        "users",
        req.params.id,
        "Issued temporary credential",
        db,
      );
    });
    res.json({ data: { temporary_password } });
  },
);
const reportModules = {
  pipeline: "leads",
  customers: "customers",
  projects: "projects",
  completion: "tasks",
  overdue: "tasks",
  workload: "tasks",
};
operationsRouter.get(
  "/reports/:report",
  permit("reports.read"),
  async (req, res) => {
    const module = reportModules[req.params.report];
    if (!module) throw fail(404, "Report not found.");
    if (!req.user.permissions.includes(`${module}.read`))
      throw fail(403, "Underlying module access required.");
    const s = scope(module, req.user);
    const reportToday = dateInZone(new Date(), await companyTimezone());
    let data;
    if (req.params.report === "workload")
      data = await query(
        `SELECT u.name assignee,COUNT(*) total,SUM(r.status='Completed') completed,SUM(r.status<>'Completed' AND r.due_date<?) overdue FROM tasks r JOIN users u ON u.id=r.assignee_id WHERE r.archived_at IS NULL AND (${s.sql}) GROUP BY u.id,u.name`,
        [reportToday, ...s.params],
      );
    else
      data = (
        await listRecords(module, req.user, { limit: 10000, export: true })
      ).data;
    if (req.params.report === "overdue") {
      const today = dateInZone(new Date(), await companyTimezone());
      data = data.filter(
        (r) => r.status !== "Completed" && r.due_date && r.due_date < today,
      );
    }
    if (req.query.format === "csv") {
      if (!req.user.permissions.includes("reports.export"))
        throw fail(403, "Export permission required.");
      const fields =
        req.params.report === "workload"
          ? ["assignee", "total", "completed", "overdue"]
          : [
              "id",
              "name",
              "status",
              ...(["leads", "tasks", "projects"].includes(module)
                ? ["priority"]
                : []),
              "created_at",
              "updated_at",
            ];
      const cell = (v) =>
        '"' +
        String(v ?? "")
          .replace(/^[=+@\-\t\r]/, "'$&")
          .replaceAll('"', '""') +
        '"';
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${req.params.report}.csv"`,
      );
      res
        .type("text/csv")
        .send(
          [fields, ...data.map((r) => fields.map((f) => r[f]))]
            .map((row) => row.map(cell).join(","))
            .join("\r\n"),
        );
      await audit(
        req.user.id,
        "exported",
        module,
        null,
        `Exported ${req.params.report} report`,
      );
    } else
      res.json({
        data,
        meta: { limit: 10000, truncated: data.length === 10000 },
      });
  },
);
operationsRouter.get("/search", async (req, res) => {
  const q = z.string().trim().min(2).max(180).parse(req.query.q);
  const results = [];
  for (const m of modules.filter((m) =>
    req.user.permissions.includes(`${m}.read`),
  )) {
    const rows = await listRecords(m, req.user, { q, limit: 5 });
    results.push(
      ...rows.data.map((r) => ({ id: r.id, name: r.name, module: m })),
    );
  }
  res.json({ data: results });
});
