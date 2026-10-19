import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { query } from "../config/index.js";
import { permit, fail } from "../middleware/auth.js";
import { modules } from "../services/permissions.js";
import { getRecord, listRecords, saveRecord } from "../services/records.js";
import { transaction, audit } from "../services/audit.js";
export const recordsRouter = Router();
for (const module of modules) {
  const route = Router();
  route.get("/", permit(`${module}.read`), async (req, res) =>
    res.json(await listRecords(module, req.user, req.query)),
  );
  route.post(
    "/",
    (req, res, next) =>
      req.user.permissions.includes(`${module}.write`) ||
      (module === "tasks" && req.user.permissions.includes("tasks.create"))
        ? next()
        : next(fail(403, "Permission denied.")),
    async (req, res) =>
      res
        .status(201)
        .json({ data: await saveRecord(module, null, req.body, req.user) }),
  );
  route.get("/:id", permit(`${module}.read`), async (req, res) => {
    const record = await getRecord(module, req.params.id, req.user);
    if (module === "projects")
      record.members = (
        await query("SELECT user_id FROM project_members WHERE project_id=?", [
          record.id,
        ])
      ).map((x) => x.user_id);
    if (module === "meetings")
      record.participants = (
        await query(
          "SELECT user_id FROM meeting_participants WHERE meeting_id=?",
          [record.id],
        )
      ).map((x) => x.user_id);
    res.json({ data: record });
  });
  route.patch(
    "/:id",
    (req, res, next) =>
      req.user.permissions.includes(`${module}.write`) ||
      (module === "tasks" &&
        req.user.role_id === "engineer" &&
        req.user.permissions.includes("tasks.read"))
        ? next()
        : next(fail(403, "Permission denied.")),
    async (req, res) =>
      res.json({
        data: await saveRecord(module, req.params.id, req.body, req.user),
      }),
  );
  route.delete("/:id", permit(`${module}.archive`), async (req, res) => {
    await transaction(async (db) => {
      await getRecord(module, req.params.id, req.user, db);
      await query(
        `UPDATE ${module} SET archived_at=UTC_TIMESTAMP(),updated_by=? WHERE id=?`,
        [req.user.id, req.params.id],
        db,
      );
      await audit(
        req.user.id,
        "archived",
        module,
        req.params.id,
        "Archived record",
        db,
      );
    });
    res.json({ data: { ok: true } });
  });
  route.get("/:id/activity", permit(`${module}.read`), async (req, res) => {
    await getRecord(module, req.params.id, req.user);
    res.json({
      data: await query(
        "SELECT a.id,a.summary,a.action,a.created_at,u.name actor_name FROM activity_logs a LEFT JOIN users u ON u.id=a.actor_id WHERE a.module=? AND a.record_id=? ORDER BY a.created_at DESC LIMIT 50",
        [module, req.params.id],
      ),
    });
  });
  route.get("/:id/comments", permit(`${module}.read`), async (req, res) => {
    await getRecord(module, req.params.id, req.user);
    const table = module === "tasks" ? "task_comments" : "record_comments";
    res.json({
      data: await query(
        `SELECT c.id,c.body,c.created_at,u.name FROM ${table} c JOIN users u ON u.id=c.user_id WHERE ${module === "tasks" ? "c.task_id=?" : "c.module=? AND c.record_id=?"} ORDER BY c.created_at`,
        module === "tasks" ? [req.params.id] : [module, req.params.id],
      ),
    });
  });
  route.post(
    "/:id/comments",
    permit(`${module}.read`),
    permit("comments.write"),
    async (req, res) => {
      const { body } = z
        .object({ body: z.string().trim().min(1).max(5000) })
        .strict()
        .parse(req.body);
      await transaction(async (db) => {
        await getRecord(module, req.params.id, req.user, db);
        if (module === "tasks")
          await query(
            "INSERT INTO task_comments(id,task_id,user_id,body) VALUES (?,?,?,?)",
            [randomUUID(), req.params.id, req.user.id, body],
            db,
          );
        else
          await query(
            "INSERT INTO record_comments(id,module,record_id,user_id,body) VALUES (?,?,?,?,?)",
            [randomUUID(), module, req.params.id, req.user.id, body],
            db,
          );
        await audit(
          req.user.id,
          "commented",
          module,
          req.params.id,
          "Added a comment",
          db,
        );
      });
      res.status(201).json({ data: { ok: true } });
    },
  );
  if (module === "leads")
    route.post(
      "/:id/convert",
      permit("leads.write"),
      permit("customers.write"),
      async (req, res) => {
        const result = await transaction(async (db) => {
          const lead = await getRecord("leads", req.params.id, req.user, db);
          await query(
            "SELECT id FROM leads WHERE id=? FOR UPDATE",
            [lead.id],
            db,
          );
          const [fresh] = await query(
            "SELECT converted_customer_id FROM leads WHERE id=?",
            [lead.id],
            db,
          );
          if (fresh.converted_customer_id)
            throw fail(409, "Lead already converted.");
          const customerId = randomUUID();
          await query(
            "INSERT INTO customers(id,name,organization,email,phone,contact_verified,owner_id,notes,confidential,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            [
              customerId,
              lead.name,
              lead.organization,
              lead.email,
              lead.phone,
              lead.contact_verified,
              lead.owner_id,
              lead.notes,
              lead.confidential,
              req.user.id,
              req.user.id,
            ],
            db,
          );
          await query(
            "UPDATE leads SET status='Won',converted_customer_id=?,updated_by=? WHERE id=?",
            [customerId, req.user.id, lead.id],
            db,
          );
          await audit(
            req.user.id,
            "converted",
            "leads",
            lead.id,
            "Converted lead to customer",
            db,
          );
          return { customer_id: customerId };
        });
        res.status(201).json({ data: result });
      },
    );
  recordsRouter.use(`/${module}`, route);
}
