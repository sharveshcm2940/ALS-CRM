import { chromium } from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { pool, query } from "../server/config/index.js";
import { saveRecord } from "../server/services/records.js";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
});
const ids = [],
  taskIds = [],
  errors = [];
const base = process.env.TEST_BASE_URL || "http://localhost:5173";
async function account(role) {
  const id = randomUUID(),
    username = "error_test_" + randomUUID(),
    password = randomBytes(20).toString("hex");
  ids.push(id);
  await query(
    "INSERT INTO users(id,username,name,role_id,password_hash,must_change_password) VALUES (?,?,?,?,?,0)",
    [
      id,
      username,
      "Development regression " + role,
      role,
      await bcrypt.hash(password, 12),
    ],
  );
  return { id, username, password };
}
async function login(page, actor) {
  await page.getByLabel("Email or username").fill(actor.username);
  await page.getByLabel("Password", { exact: true }).fill(actor.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("heading", { name: "Good to see you, Development." })
    .waitFor();
}
async function nav(page, label) {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByText(label, { exact: true })
    .click();
}
try {
  const ceo = await account("ceo");
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Development test: service unavailable" }),
    }),
  );
  await page.goto(base);
  await page
    .getByRole("alert")
    .filter({ hasText: "service unavailable" })
    .waitFor();
  await page.unroute("**/api/auth/me");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.getByRole("heading", { name: "Welcome back" }).waitFor();
  await login(page, ceo);
  let fail = true;
  await page.route("**/api/customers?**", async (route) => {
    if (fail) {
      fail = false;
      await route.fulfill({
        status: 502,
        contentType: "text/html",
        body: "<html>Development proxy failure</html>",
      });
    } else await route.continue();
  });
  await nav(page, "Customers");
  await page.getByRole("heading", { name: "Could not load records" }).waitFor();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".records-panel table") ||
      [...document.querySelectorAll(".records-panel h3")].some(
        (e) => e.textContent === "No customers yet",
      ),
  );
  await page.unroute("**/api/customers?**");
  await page.route("**/api/customers?**", async (route) => {
    const q = new URL(route.request().url()).searchParams.get("q");
    if (!["old", "latest"].includes(q)) return route.continue();
    if (q === "old") await delay(650);
    try {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: randomUUID(),
              name:
                q === "old"
                  ? "Development stale result"
                  : "Development latest result",
              organization: "Regression fixture",
              status: "Active",
            },
          ],
          meta: { total: 1, page: 1, limit: 12, pages: 1 },
        }),
      });
    } catch {
      /* A replaced search request may already be aborted. */
    }
  });
  await page.getByLabel("Search customers").fill("old");
  await page.waitForRequest(
    (r) =>
      r.url().includes("/api/customers?") &&
      new URL(r.url()).searchParams.get("q") === "old",
  );
  await page.getByLabel("Search customers").fill("latest");
  await page
    .getByRole("button", { name: "Development latest result", exact: false })
    .waitFor();
  await delay(750);
  assert.equal(
    await page
      .getByRole("button", { name: "Development stale result", exact: false })
      .count(),
    0,
  );
  await page.unroute("**/api/customers?**");
  await page.route("**/api/reports/pipeline", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Development report failure" }),
    }),
  );
  await nav(page, "Reports");
  await page.getByRole("heading", { name: "Could not load report" }).waitFor();
  await page.unroute("**/api/reports/pipeline");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".report-summaries") ||
      [...document.querySelectorAll(".report-layout h3")].some(
        (e) => e.textContent === "No data to report yet",
      ),
  );
  await page.route("**/api/reports/pipeline?format=csv", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Session expired." }),
    }),
  );
  await page.getByRole("button", { name: "Export CSV" }).click();
  await page.getByRole("heading", { name: "Welcome back" }).waitFor();
  await page.close();
  const engineer = await account("engineer");
  const task = await saveRecord(
    "tasks",
    null,
    {
      name: "Development regression assigned task",
      description: "Temporary test fixture",
      assignee_id: engineer.id,
      project_id: null,
      priority: "Medium",
      status: "To Do",
      progress: 0,
      start_date: null,
      due_date: null,
    },
    { id: engineer.id, role_id: "ceo", name: "Development regression fixture" },
  );
  taskIds.push(task.id);
  const context = await browser.newContext(),
    eng = await context.newPage();
  eng.on("pageerror", (e) => errors.push(e.message));
  await eng.goto(base);
  await login(eng, engineer);
  await nav(eng, "Tasks");
  await eng
    .getByRole("button", {
      name: "Development regression assigned task",
      exact: false,
    })
    .click();
  await eng.getByRole("heading", { name: "Record history" }).waitFor();
  await eng
    .locator(".detail-grid dd")
    .filter({ hasText: "Development regression engineer" })
    .waitFor();
  let unrelatedRequests = 0;
  await eng.route("**/api/team", (route) => {
    unrelatedRequests++;
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unrelated lookup unavailable" }),
    });
  });
  await eng.getByRole("button", { name: "Update progress" }).click();
  await eng.getByLabel("Status", { exact: true }).selectOption("In Progress");
  await eng.getByRole("button", { name: "Save changes" }).click();
  await eng.waitForFunction(() => !document.querySelector("dialog[open]"));
  assert.equal(unrelatedRequests, 0);
  assert.equal(
    (await query("SELECT status FROM tasks WHERE id=?", [task.id]))[0].status,
    "In Progress",
  );
  await context.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: bootstrap retry, proxy-error recovery, stale-search cancellation, report retry, expired export sign-out and task updates without unrelated lookups.",
  );
} finally {
  await browser.close();
  for (const id of taskIds) {
    await query("DELETE FROM task_comments WHERE task_id=?", [id]);
    await query("DELETE FROM record_comments WHERE record_id=?", [id]);
    await query("DELETE FROM activity_logs WHERE record_id=?", [id]);
    await query("DELETE FROM tasks WHERE id=?", [id]);
  }
  for (const id of ids) {
    await query("DELETE FROM notifications WHERE user_id=?", [id]);
    await query("DELETE FROM sessions WHERE user_id=?", [id]);
    await query("DELETE FROM activity_logs WHERE actor_id=?", [id]);
    await query("DELETE FROM users WHERE id=?", [id]);
  }
  await pool.end();
}
