import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcrypt";
import { randomUUID, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { app } from "../app.js";
import { pool, query } from "../config/index.js";
const created = {
  users: [],
  customers: [],
  leads: [],
  projects: [],
  tasks: [],
  meetings: [],
  announcements: [],
};
const password = randomBytes(20).toString("hex");
const prefix = `test_${Date.now()}_`;
const actors = {};
async function agentLogin(username, pass = password) {
  const agent = request.agent(app);
  const token = (await agent.get("/api/auth/csrf")).body.data.csrf;
  const response = await agent
    .post("/api/auth/login")
    .set("x-csrf-token", token)
    .send({ username, password: pass });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  return { agent, csrf: response.body.data.csrf };
}
function call(who, method, url, body) {
  const a = actors[who];
  return a.agent[method]("/api" + url)
    .set("x-csrf-token", a.csrf)
    .send(body);
}
async function create(module, body) {
  const r = await call("ceo", "post", "/" + module, body);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  created[module].push(r.body.data.id);
  return r.body.data.id;
}
const contact = () => ({
  name: "Development test customer",
  organization: "Test fixture — removed after tests",
  email: null,
  phone: "",
  contact_verified: false,
  owner_id: actors.ceo.id,
  notes: "Automated test only",
  confidential: false,
});
before(async () => {
  for (const role of ["ceo", "board", "engineer", "other"]) {
    const id = randomUUID(),
      username = prefix + role;
    await query(
      "INSERT INTO users(id,name,username,role_id,password_hash,must_change_password) VALUES (?,?,?,?,?,0)",
      [
        id,
        `Test ${role}`,
        username,
        role === "other" ? "engineer" : role,
        await bcrypt.hash(password, 12),
      ],
    );
    created.users.push(id);
    actors[role] = { ...(await agentLogin(username)), id, username };
  }
});
after(async () => {
  for (const module of [
    "announcements",
    "meetings",
    "tasks",
    "projects",
    "leads",
    "customers",
  ])
    for (const id of created[module]) {
      if (module === "tasks")
        await query("DELETE FROM task_comments WHERE task_id=?", [id]);
      if (module === "meetings")
        await query("DELETE FROM meeting_participants WHERE meeting_id=?", [
          id,
        ]);
      if (module === "projects")
        await query("DELETE FROM project_members WHERE project_id=?", [id]);
      await query("DELETE FROM record_comments WHERE record_id=?", [id]);
      await query("DELETE FROM activity_logs WHERE record_id=?", [id]);
      await query(`DELETE FROM ${module} WHERE id=?`, [id]);
    }
  for (const id of created.users) {
    await query("DELETE FROM notifications WHERE user_id=?", [id]);
    await query("DELETE FROM sessions WHERE user_id=?", [id]);
    await query("DELETE FROM activity_logs WHERE actor_id=? OR record_id=?", [
      id,
      id,
    ]);
    await query("DELETE FROM users WHERE id=?", [id]);
  }
  await pool.end();
});
let customer, lead, project, task, meeting, announcement, privateProject;
test("anonymous access, CSRF, origin and credential isolation", async () => {
  assert.equal((await request(app).get("/api/customers")).status, 401);
  assert.equal(
    (await actors.ceo.agent.post("/api/customers").send({})).status,
    403,
  );
  assert.equal(
    (
      await actors.ceo.agent
        .post("/api/customers")
        .set("x-csrf-token", actors.ceo.csrf)
        .set("Origin", "https://attacker.invalid")
        .send({})
    ).status,
    403,
  );
  const me = (await call("ceo", "get", "/auth/me")).body.data;
  assert.equal(me.role_id, "ceo");
  assert.ok(!JSON.stringify(me).includes("password_hash"));
});
test("all nine provisioned individual accounts authenticate and require initialization", async (t) => {
  let contents;
  try {
    contents = await readFile(".local/initial-accounts.txt", "utf8");
  } catch (e) {
    if (e.code === "ENOENT") {
      t.skip("Provisioning file was removed after credential delivery.");
      return;
    }
    throw e;
  }
  const entries = contents.trim().split("\n");
  assert.equal(entries.length, 9);
  for (const line of entries) {
    const [username, password] = line.split("\t");
    const [u] = await query(
      "SELECT must_change_password FROM users WHERE username=?",
      [username],
    );
    if (!u.must_change_password) continue;
    const actor = await agentLogin(username, password);
    const me = await actor.agent.get("/api/auth/me");
    assert.equal(me.body.data.username, username);
    assert.equal(me.body.data.must_change_password, 1);
    assert.equal((await actor.agent.get("/api/dashboard")).status, 403);
    await actor.agent
      .post("/api/auth/logout")
      .set("x-csrf-token", actor.csrf)
      .send({});
  }
});
test("customer persistence, validation, search and board write protection", async () => {
  customer = await create("customers", {
    ...contact(),
    status: "Active",
    company_info: "",
  });
  assert.equal(
    (await call("ceo", "get", `/customers/${customer}`)).body.data.name,
    "Development test customer",
  );
  assert.equal((await call("board", "post", "/customers", {})).status, 403);
  assert.equal((await call("engineer", "get", "/customers")).status, 403);
  assert.equal(
    (
      await call("ceo", "post", "/customers", {
        ...contact(),
        status: "Invalid",
      })
    ).status,
    400,
  );
  const list = await call(
    "ceo",
    "get",
    "/customers?q=Development%20test&limit=1&sort=name&direction=asc",
  );
  assert.ok(list.body.meta.total >= 1);
  assert.equal(list.body.data.length, 1);
  assert.equal(
    (
      await call("ceo", "patch", `/customers/${customer}`, {
        organization: "Updated fixture",
      })
    ).status,
    200,
  );
});
test("lead conversion is transactional and cannot duplicate customers", async () => {
  lead = await create("leads", {
    ...contact(),
    name: "Test opportunity",
    source: "Automated test",
    status: "Qualified",
    priority: "High",
    follow_up_date: null,
    value: 25000,
    currency: "INR",
  });
  const r = await call("ceo", "post", `/leads/${lead}/convert`, {});
  assert.equal(r.status, 201);
  created.customers.push(r.body.data.customer_id);
  assert.equal(
    (await call("ceo", "post", `/leads/${lead}/convert`, {})).status,
    409,
  );
  assert.equal(
    (await call("ceo", "get", `/leads/${lead}`)).body.data.status,
    "Won",
  );
});
test("project membership and task assignment prevent IDOR and privilege escalation", async () => {
  const body = {
    name: "Test delivery project",
    description: "Test fixture",
    owner_id: actors.ceo.id,
    customer_id: customer,
    start_date: "2026-01-01",
    due_date: "2026-12-30",
    priority: "High",
    status: "Active",
    progress: 20,
    notes: "",
    confidential: false,
    members: [actors.engineer.id],
  };
  project = await create("projects", body);
  privateProject = await create("projects", {
    ...body,
    name: "Confidential test",
    confidential: true,
    members: [],
  });
  assert.equal(
    (await call("board", "get", `/projects/${privateProject}`)).status,
    404,
  );
  assert.equal(
    (await call("engineer", "get", `/projects/${project}`)).status,
    200,
  );
  assert.equal(
    (await call("other", "get", `/projects/${project}`)).status,
    404,
  );
  task = await create("tasks", {
    name: "Test assigned work",
    description: "",
    assignee_id: actors.engineer.id,
    project_id: project,
    priority: "High",
    status: "To Do",
    progress: 0,
    start_date: "2026-01-01",
    due_date: "2026-01-02",
  });
  assert.equal((await call("other", "get", `/tasks/${task}`)).status, 404);
  assert.equal(
    (await call("other", "patch", `/tasks/${task}`, { status: "Completed" }))
      .status,
    404,
  );
  assert.equal(
    (
      await call("engineer", "patch", `/tasks/${task}`, {
        assignee_id: actors.other.id,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("engineer", "patch", `/tasks/${task}`, {
        status: "Completed",
        progress: 100,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call("engineer", "post", `/tasks/${task}/comments`, {
        body: "Completed and verified.",
      })
    ).status,
    201,
  );
  assert.equal(
    (await call("other", "get", `/tasks/${task}/comments`)).status,
    404,
  );
  assert.equal(
    (await call("engineer", "get", `/tasks/${task}/comments`)).body.data.length,
    1,
  );
});
test("meetings, audience rules, notifications, calendar and comments", async () => {
  meeting = await create("meetings", {
    name: "Test review",
    agenda: "Review fixture",
    organizer_id: actors.ceo.id,
    customer_id: customer,
    project_id: project,
    starts_at: "2026-12-20T10:00:00Z",
    ends_at: "2026-12-20T11:00:00Z",
    notes: "",
    action_items: "",
    participants: [actors.engineer.id],
  });
  assert.equal(
    (await call("other", "get", `/meetings/${meeting}`)).status,
    404,
  );
  assert.equal(
    (await call("engineer", "get", `/meetings/${meeting}`)).status,
    200,
  );
  const calendar = await call(
    "ceo",
    "get",
    "/meetings?from=2026-12-01&to=2027-01-01",
  );
  assert.ok(calendar.body.data.some((m) => m.id === meeting));
  announcement = await create("announcements", {
    name: "Test board notice",
    message: "Test only",
    audience: "board",
    pinned: true,
  });
  assert.equal(
    (await call("engineer", "get", `/announcements/${announcement}`)).status,
    404,
  );
  assert.equal(
    (await call("board", "get", `/announcements/${announcement}`)).status,
    200,
  );
  assert.ok(
    (await call("engineer", "get", "/notifications")).body.data.length >= 1,
  );
});
test("dashboards, reports, exports and audit reflect permitted database records", async () => {
  const d = (await call("engineer", "get", "/dashboard")).body.data;
  assert.ok(d.metrics.tasks.total >= 1);
  assert.equal(
    d.recent.projects.some((p) => p.id === privateProject),
    false,
  );
  assert.equal((await call("board", "get", "/audit")).status, 403);
  assert.equal((await call("engineer", "get", "/users")).status, 403);
  assert.equal(
    (
      await call("board", "put", "/permissions/engineer", {
        grants: ["users.manage"],
      })
    ).status,
    403,
  );
  const report = await call("board", "get", "/reports/projects");
  assert.equal(
    report.body.data.some((p) => p.id === privateProject),
    false,
  );
  const csv = await call("board", "get", "/reports/projects?format=csv");
  assert.equal(csv.status, 200);
  assert.match(csv.headers["content-type"], /text\/csv/);
  assert.ok(!csv.text.includes(privateProject));
  assert.equal(
    (await call("engineer", "get", "/reports/projects?format=csv")).status,
    403,
  );
  const audit = await call("ceo", "get", "/audit");
  assert.ok(audit.body.data.some((a) => a.module === "tasks"));
});
test("archival retains history and removes active records", async () => {
  assert.equal(
    (await call("ceo", "delete", `/announcements/${announcement}`, {})).status,
    200,
  );
  assert.equal(
    (await call("ceo", "get", `/announcements/${announcement}`)).status,
    404,
  );
  assert.ok(
    (
      await query("SELECT archived_at FROM announcements WHERE id=?", [
        announcement,
      ])
    )[0].archived_at,
  );
});
test("password change revokes sessions, deactivation blocks access and hashes stay private", async () => {
  assert.equal(
    (
      await call("other", "patch", "/auth/change-password", {
        currentPassword: password,
        newPassword: "too-short",
      })
    ).status,
    400,
  );
  const response = await call("other", "patch", "/auth/change-password", {
    currentPassword: password,
    newPassword: randomBytes(20).toString("hex"),
  });
  assert.equal(response.status, 200);
  assert.equal((await call("other", "get", "/auth/me")).status, 401);
  const users = await call("ceo", "get", "/users");
  assert.ok(!JSON.stringify(users.body).includes("password_hash"));
  assert.equal(
    (
      await call("ceo", "patch", `/users/${actors.engineer.id}`, {
        active: false,
      })
    ).status,
    200,
  );
  assert.equal((await call("engineer", "get", "/auth/me")).status, 401);
});
test("CEO account provisioning, reset and self-protection", async () => {
  const username = prefix + "managed";
  const createdUser = await call("ceo", "post", "/users", {
    name: "Development managed account",
    username,
    email: null,
    email_verified: false,
    role_id: "engineer",
    active: true,
  });
  assert.equal(createdUser.status, 201, JSON.stringify(createdUser.body));
  const id = createdUser.body.data.id;
  created.users.push(id);
  assert.ok(createdUser.body.data.temporary_password.length >= 20);
  const session = await agentLogin(
    username,
    createdUser.body.data.temporary_password,
  );
  assert.equal((await session.agent.get("/api/dashboard")).status, 403);
  const reset = await call("ceo", "post", `/users/${id}/reset-password`, {});
  assert.equal(reset.status, 200);
  assert.notEqual(
    reset.body.data.temporary_password,
    createdUser.body.data.temporary_password,
  );
  assert.equal((await session.agent.get("/api/auth/me")).status, 401);
  assert.equal(
    (await call("ceo", "patch", `/users/${actors.ceo.id}`, { active: false }))
      .status,
    400,
  );
  assert.equal(
    (
      await call("ceo", "patch", `/users/${id}`, {
        email: "",
        email_verified: true,
      })
    ).status,
    400,
  );
});
test("configurable grants apply immediately and list inputs reject invalid pagination", async () => {
  const original = (
    await query(
      "SELECT permission_id FROM role_permissions WHERE role_id='board'",
    )
  ).map((r) => r.permission_id);
  try {
    assert.equal(
      (
        await call("ceo", "put", "/permissions/board", {
          grants: original.filter((p) => p !== "reports.export"),
        })
      ).status,
      200,
    );
    assert.equal(
      (await call("board", "get", "/reports/projects?format=csv")).status,
      403,
    );
  } finally {
    assert.equal(
      (await call("ceo", "put", "/permissions/board", { grants: original }))
        .status,
      200,
    );
  }
  assert.equal((await call("ceo", "get", "/customers?limit=1.5")).status, 400);
  assert.equal(
    (await call("ceo", "get", "/customers?limit=10000&export=true")).status,
    400,
  );
  assert.equal(
    (await call("other", "get", `/projects/${project}/activity`)).status,
    401,
  );
  const history = await call("ceo", "get", `/projects/${project}/activity`);
  assert.equal(history.status, 200);
  assert.ok(history.body.data.length > 0);
});
test("login throttle rejects brute-force attempts", async () => {
  const a = request.agent(app);
  const token = (await a.get("/api/auth/csrf")).body.data.csrf;
  let status;
  for (let i = 0; i < 16; i++) {
    status = (
      await a
        .post("/api/auth/login")
        .set("x-csrf-token", token)
        .send({ username: "invalid-account", password: "invalid-password" })
    ).status;
    if (status === 429) break;
  }
  assert.equal(status, 429);
});
