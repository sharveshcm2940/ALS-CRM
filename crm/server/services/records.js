import { z } from "zod";
import { randomUUID } from "node:crypto";
import { query, pool } from "../config/index.js";
import { fail } from "../middleware/auth.js";
import { transaction, audit } from "./audit.js";
import { companyTimezone, midnightUtc } from "./time.js";
const name = z.string().trim().min(1).max(180),
  text = z.string().trim().max(10000),
  id = z.uuid(),
  optionalId = id.nullable(),
  date = z.iso.date().nullable(),
  email = z
    .union([z.email().max(254), z.literal("")])
    .nullable()
    .transform((v) => v || null),
  priority = z.enum(["Low", "Medium", "High", "Urgent"]);
const contact = {
  name,
  organization: z.string().trim().max(180),
  email,
  phone: z.string().trim().max(40),
  contact_verified: z.boolean(),
  owner_id: id,
  notes: text,
  confidential: z.boolean(),
};
export const schemas = {
  customers: z
    .object({
      ...contact,
      status: z.enum(["Active", "Prospect", "Inactive"]),
      company_info: text,
    })
    .strict(),
  leads: z
    .object({
      ...contact,
      source: z.string().trim().max(120),
      status: z.enum([
        "New",
        "Contacted",
        "Qualified",
        "Proposal",
        "Negotiation",
        "Won",
        "Lost",
      ]),
      priority,
      follow_up_date: date,
      value: z.number().min(0).max(9999999999999),
      currency: z.string().regex(/^[A-Z]{3}$/),
    })
    .strict(),
  projects: z
    .object({
      name,
      description: text,
      owner_id: id,
      customer_id: optionalId,
      start_date: date,
      due_date: date,
      priority,
      status: z.enum([
        "Planning",
        "Active",
        "On Hold",
        "Completed",
        "Cancelled",
      ]),
      progress: z.number().int().min(0).max(100),
      notes: text,
      confidential: z.boolean(),
      members: z.array(id).max(100),
    })
    .strict(),
  tasks: z
    .object({
      name,
      description: text,
      assignee_id: id,
      project_id: optionalId,
      priority,
      status: z.enum(["To Do", "In Progress", "In Review", "Completed"]),
      progress: z.number().int().min(0).max(100),
      start_date: date,
      due_date: date,
    })
    .strict(),
  meetings: z
    .object({
      name,
      agenda: text,
      organizer_id: id,
      customer_id: optionalId,
      project_id: optionalId,
      starts_at: z.iso.datetime({ offset: true }),
      ends_at: z.iso.datetime({ offset: true }),
      notes: text,
      action_items: text,
      participants: z.array(id).max(100),
    })
    .strict(),
  announcements: z
    .object({
      name,
      message: text.min(1),
      audience: z.enum(["all", "board", "engineer"]),
      pinned: z.boolean(),
    })
    .strict(),
};
export function scope(module, user, alias = "r") {
  if (user.role_id === "ceo") return { sql: "1=1", params: [] };
  if (module === "announcements")
    return {
      sql: `(${alias}.audience='all' OR ${alias}.audience=?)`,
      params: [user.role_id],
    };
  if (user.role_id === "board") {
    if (["customers", "leads", "projects"].includes(module))
      return { sql: `${alias}.confidential=0`, params: [] };
    if (["tasks", "meetings"].includes(module))
      return {
        sql: `(${alias}.project_id IS NULL OR EXISTS(SELECT 1 FROM projects p WHERE p.id=${alias}.project_id AND p.confidential=0))${module === "meetings" ? ` AND (${alias}.customer_id IS NULL OR EXISTS(SELECT 1 FROM customers c WHERE c.id=${alias}.customer_id AND c.confidential=0))` : ""}`,
        params: [],
      };
  }
  if (module === "projects")
    return {
      sql: `(${alias}.owner_id=? OR EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=${alias}.id AND pm.user_id=?)) AND ${alias}.confidential=0`,
      params: [user.id, user.id],
    };
  if (module === "tasks")
    return {
      sql: `${alias}.assignee_id=? AND (${alias}.project_id IS NULL OR EXISTS(SELECT 1 FROM projects p WHERE p.id=${alias}.project_id AND p.confidential=0 AND (p.owner_id=? OR EXISTS(SELECT 1 FROM project_members pm WHERE pm.project_id=p.id AND pm.user_id=?))))`,
      params: [user.id, user.id, user.id],
    };
  if (module === "meetings")
    return {
      sql: `(${alias}.organizer_id=? OR EXISTS(SELECT 1 FROM meeting_participants mp WHERE mp.meeting_id=${alias}.id AND mp.user_id=?)) AND (${alias}.project_id IS NULL OR EXISTS(SELECT 1 FROM projects p WHERE p.id=${alias}.project_id AND p.confidential=0)) AND (${alias}.customer_id IS NULL OR EXISTS(SELECT 1 FROM customers c WHERE c.id=${alias}.customer_id AND c.confidential=0))`,
      params: [user.id, user.id],
    };
  return { sql: "1=0", params: [] };
}
export async function getRecord(module, recordId, user, db = pool) {
  id.parse(recordId);
  const s = scope(module, user);
  const [record] = await query(
    `SELECT r.* FROM ${module} r WHERE r.id=? AND r.archived_at IS NULL AND (${s.sql})`,
    [recordId, ...s.params],
    db,
  );
  if (!record) throw fail(404, "Record not found.");
  return record;
}
const listQuery = z
  .object({
    q: z.string().trim().max(180).optional(),
    page: z.coerce.number().int().min(1).max(100000).optional(),
    limit: z.coerce.number().int().min(1).max(10000).optional(),
    sort: z.enum(["name", "created_at", "updated_at", "due_date"]).optional(),
    direction: z.enum(["asc", "desc"]).optional(),
    status: z.string().max(40).optional(),
    priority: z.string().max(20).optional(),
    assignee_id: z.union([z.uuid(), z.literal("")]).optional(),
    project_id: z.union([z.uuid(), z.literal("")]).optional(),
    owner_id: z.union([z.uuid(), z.literal("")]).optional(),
    period: z.enum(["past", "upcoming", ""]).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    export: z.boolean().optional(),
  })
  .strict();
export async function listRecords(module, user, opts = {}, db = pool) {
  opts = listQuery.parse(opts);
  if (!opts.export && opts.limit > 100)
    throw fail(400, "Maximum page size is 100.");
  const s = scope(module, user),
    params = [...s.params];
  let where = `r.archived_at IS NULL AND (${s.sql})`;
  if (opts.q) {
    where += " AND r.name LIKE ?";
    params.push(`%${opts.q.slice(0, 180)}%`);
  }
  for (const field of [
    "status",
    "priority",
    "assignee_id",
    "project_id",
    "owner_id",
  ])
    if (opts[field] && Object.hasOwn(schemas[module].shape, field)) {
      where += ` AND r.${field}=?`;
      params.push(opts[field]);
    }
  if (module === "meetings" && opts.period) {
    where +=
      opts.period === "past"
        ? " AND r.ends_at<UTC_TIMESTAMP()"
        : " AND r.ends_at>=UTC_TIMESTAMP()";
  }
  if (module === "meetings" && opts.from && opts.to) {
    z.iso.date().parse(opts.from);
    z.iso.date().parse(opts.to);
    where += " AND r.starts_at>=? AND r.starts_at<?";
    const timezone = await companyTimezone();
    params.push(
      midnightUtc(opts.from, timezone),
      midnightUtc(opts.to, timezone),
    );
  }
  const sort = [
      "name",
      "created_at",
      "updated_at",
      ...(Object.hasOwn(schemas[module].shape, "due_date") ? ["due_date"] : []),
    ].includes(opts.sort)
      ? opts.sort
      : "created_at",
    direction = opts.direction === "asc" ? "ASC" : "DESC";
  const page = Math.max(1, Math.min(Number(opts.page) || 1, 100000)),
    limit = Math.max(
      1,
      Math.min(Number(opts.limit) || 12, opts.export ? 10000 : 100),
    );
  const [{ total }] = await query(
    `SELECT COUNT(*) total FROM ${module} r WHERE ${where}`,
    params,
    db,
  );
  const data = await query(
    `SELECT r.* FROM ${module} r WHERE ${where} ORDER BY ${module === "announcements" ? "r.pinned DESC, " : ""}r.${sort} ${direction},r.id LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
    params,
    db,
  );
  return {
    data,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}
async function references(module, input, user, db) {
  for (const key of [
    "owner_id",
    "assignee_id",
    "organizer_id",
    ...(input.members ? ["members"] : []),
    ...(input.participants ? ["participants"] : []),
  ]) {
    const values = Array.isArray(input[key])
      ? input[key]
      : input[key]
        ? [input[key]]
        : [];
    for (const uid of values)
      if (
        !(
          await query("SELECT id FROM users WHERE id=? AND active=1", [uid], db)
        ).length
      )
        throw fail(400, "Select an active team member.");
  }
  for (const [key, target] of [
    ["customer_id", "customers"],
    ["project_id", "projects"],
  ])
    if (input[key]) await getRecord(target, input[key], user, db);
  if (input.start_date && input.due_date && input.start_date > input.due_date)
    throw fail(400, "Due date must follow the start date.");
  if (
    module === "meetings" &&
    new Date(input.ends_at) <= new Date(input.starts_at)
  )
    throw fail(400, "Meeting end must follow its start.");
  if (module === "tasks" && input.project_id && input.assignee_id) {
    const [p] = await query(
      "SELECT owner_id FROM projects WHERE id=?",
      [input.project_id],
      db,
    );
    if (
      p.owner_id !== input.assignee_id &&
      !(
        await query(
          "SELECT 1 FROM project_members WHERE project_id=? AND user_id=?",
          [input.project_id, input.assignee_id],
          db,
        )
      ).length
    )
      throw fail(400, "Task assignee must be a project member or owner.");
  }
}
export async function saveRecord(module, recordId, raw, user) {
  return transaction(async (db) => {
    let input;
    if (recordId) await getRecord(module, recordId, user, db);
    if (module === "tasks" && user.role_id === "engineer" && recordId) {
      input = z
        .object({
          status: schemas.tasks.shape.status,
          progress: schemas.tasks.shape.progress,
        })
        .strict()
        .partial()
        .parse(raw);
      if (!Object.keys(input).length)
        throw fail(400, "Provide status or progress.");
    } else {
      input = (recordId ? schemas[module].partial() : schemas[module]).parse(
        raw,
      );
      if (
        !recordId &&
        user.role_id === "engineer" &&
        module === "tasks" &&
        input.assignee_id !== user.id
      )
        throw fail(403, "You can create tasks only for yourself.");
      const current = recordId
        ? await getRecord(module, recordId, user, db)
        : {};
      await references(module, { ...current, ...input }, user, db);
    }
    const members = input.members,
      participants = input.participants;
    delete input.members;
    delete input.participants;
    if (module === "meetings")
      for (const f of ["starts_at", "ends_at"])
        if (input[f])
          input[f] = new Date(input[f])
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");
    if (module === "tasks" && input.status)
      input.completed_at =
        input.status === "Completed"
          ? new Date().toISOString().slice(0, 19).replace("T", " ")
          : null;
    const record = recordId || randomUUID();
    input.updated_by = user.id;
    if (recordId) {
      const fields = Object.keys(input);
      await query(
        `UPDATE ${module} SET ${fields.map((f) => `${f}=?`).join(",")} WHERE id=?`,
        [...Object.values(input), record],
        db,
      );
    } else {
      input = { id: record, ...input, created_by: user.id };
      const fields = Object.keys(input);
      await query(
        `INSERT INTO ${module} (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`,
        Object.values(input),
        db,
      );
    }
    for (const [values, table, column] of [
      [members, "project_members", "project_id"],
      [participants, "meeting_participants", "meeting_id"],
    ])
      if (values) {
        await query(`DELETE FROM ${table} WHERE ${column}=?`, [record], db);
        for (const uid of new Set(values))
          await query(`INSERT INTO ${table} VALUES (?,?)`, [record, uid], db);
      }
    const assigned = input.assignee_id || input.owner_id || input.organizer_id;
    for (const uid of new Set(
      [assigned, ...(members || []), ...(participants || [])].filter(
        (v) => v && v !== user.id,
      ),
    )) {
      const [recipient] = await query(
        "SELECT u.id,u.role_id FROM users u JOIN role_permissions rp ON rp.role_id=u.role_id AND rp.permission_id=? WHERE u.id=?",
        [`${module}.read`, uid],
        db,
      );
      if (!recipient) continue;
      try {
        await getRecord(module, record, recipient, db);
      } catch (e) {
        if (e.status === 404) continue;
        throw e;
      }
      await query(
        "INSERT INTO notifications(id,user_id,message) VALUES (?,?,?)",
        [
          randomUUID(),
          uid,
          `${user.name} ${recordId ? "updated" : "assigned"} ${module}: ${(input.name || "record").slice(0, 140)}`,
        ],
        db,
      );
    }
    await audit(
      user.id,
      recordId ? "updated" : "created",
      module,
      record,
      `${recordId ? "Updated" : "Created"} ${module} record`,
      db,
    );
    return { id: record };
  });
}
