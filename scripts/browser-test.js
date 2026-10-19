import { chromium } from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pool, query } from "../server/config/index.js";
const id = randomUUID(),
  username = "browser_test_" + Date.now(),
  password = randomBytes(20).toString("hex"),
  changed = randomBytes(20).toString("hex");
await query(
  "INSERT INTO users(id,username,name,role_id,password_hash) VALUES (?,?,?,?,?)",
  [
    id,
    username,
    "Development browser test",
    "ceo",
    await bcrypt.hash(password, 12),
  ],
);
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  const url = new URL(r.url());
  if (
    url.pathname.startsWith("/api/") &&
    r.status() >= 400 &&
    !["/api/auth/me", "/api/auth/logout"].includes(url.pathname)
  )
    errors.push(`${r.status()} ${url.pathname}`);
});
const base = process.env.TEST_BASE_URL || "http://localhost:5173";
async function login(pass) {
  await page.getByLabel("Email or username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(pass);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
async function modulePage(name) {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByText(name, { exact: true })
    .click();
}
async function fill(label, value) {
  await page.getByLabel(label, { exact: true }).fill(value);
}
async function create(module, singular, fields) {
  await modulePage(module);
  await page
    .getByRole("button", { name: `New ${singular}`, exact: true })
    .click();
  for (const [label, value] of Object.entries(fields)) await fill(label, value);
  await page
    .getByRole("button", { name: `Create ${singular}`, exact: true })
    .click();
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  await page
    .getByRole("button", { name: Object.values(fields)[0], exact: false })
    .first()
    .waitFor();
}
try {
  await page.goto(base);
  await page.getByRole("heading", { name: "Welcome back" }).waitFor();
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/login.png", fullPage: true });
  await login(password);
  await page.getByRole("heading", { name: "Secure your account" }).waitFor();
  await fill("Temporary or current password", password);
  await fill("New password", changed);
  await page
    .getByRole("button", { name: "Change password & sign out" })
    .click();
  await page.getByRole("heading", { name: "Welcome back" }).waitFor();
  await login(changed);
  await page
    .getByRole("heading", { name: "Good to see you, Development." })
    .waitFor();
  const sessionCookie = (await page.context().cookies()).find(
    (c) => c.name === "session",
  );
  assert.equal(sessionCookie.httpOnly, true);
  assert.equal(sessionCookie.sameSite, "Strict");
  if (process.env.EXPECT_SECURE_COOKIE === "1")
    assert.equal(sessionCookie.secure, true);
  await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
  await create("Customers", "customer", {
    Name: "Development-only browser customer",
    Organization: "Temporary automated test",
  });
  await page
    .getByRole("button", {
      name: "Development-only browser customer",
      exact: false,
    })
    .click();
  await page.getByRole("button", { name: "Edit record" }).click();
  await fill("Company information", "Verified end-to-end editing");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  await create("Leads", "lead", { Name: "Development-only browser lead" });
  await page
    .getByRole("button", {
      name: "Development-only browser lead",
      exact: false,
    })
    .click();
  await page.getByRole("button", { name: "Convert to customer" }).click();
  await page.getByRole("button", { name: "Confirm convert" }).click();
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  await page.getByRole("table").getByText("Won", { exact: true }).waitFor();
  await create("Projects", "project", {
    Name: "Development-only browser project",
    Description: "Temporary test project",
  });
  await create("Tasks", "task", {
    Name: "Development-only browser task",
    "Due date": "2026-12-30",
  });
  await page
    .getByRole("button", {
      name: "Development-only browser task",
      exact: false,
    })
    .click();
  await page
    .getByPlaceholder("Share an update or add a comment…")
    .fill("Development-only browser work update");
  await page.getByRole("button", { name: "Post comment" }).click();
  await page
    .getByText("Development-only browser work update", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await create("Meetings", "meeting", {
    Name: "Development-only browser meeting",
    "Starts at (your local time)": "2026-12-20T10:00",
    "Ends at (your local time)": "2026-12-20T11:00",
  });
  await page.getByRole("button", { name: "Toggle calendar view" }).click();
  await page.getByRole("button", { name: "Next month" }).click();
  await page.getByRole("button", { name: "Previous month" }).click();
  await create("Announcements", "announcement", {
    Name: "Development-only browser notice",
    Message: "Development-only announcement, removed after testing.",
  });
  await modulePage("Reports");
  await page
    .getByRole("heading", { name: "Lead pipeline", exact: true })
    .waitFor();
  await modulePage("Team");
  await page.getByRole("button", { name: "Add team member" }).waitFor();
  await modulePage("Settings");
  await page.getByRole("button", { name: "Permissions", exact: true }).click();
  await page.getByText("Role permissions", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Audit log", exact: true }).click();
  await page.getByRole("heading", { name: "Audit history" }).waitFor();
  await modulePage("Customers");
  await page
    .getByLabel("Search customers")
    .fill("Development-only browser customer");
  await page
    .getByRole("button", {
      name: "Development-only browser customer",
      exact: false,
    })
    .waitFor();
  await page
    .getByRole("button", {
      name: "Development-only browser customer",
      exact: false,
    })
    .click();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page.getByRole("button", { name: "Confirm archive" }).click();
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  await page.getByRole("heading", { name: "No matching records" }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await modulePage("Dashboard");
  await page
    .getByRole("heading", { name: "Good to see you, Development." })
    .waitFor();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Mobile horizontal overflow",
  );
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Notifications", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Close dialog" }).click();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: first-login password initialization, all six module forms, edit, conversion, comment, archive, reports, team, permissions, audit, calendar navigation, mobile drawer and no browser errors.",
  );
} catch (e) {
  await page.screenshot({ path: "test-results/failure.png", fullPage: true });
  throw e;
} finally {
  await browser.close();
  for (const m of [
    "announcements",
    "meetings",
    "tasks",
    "projects",
    "leads",
    "customers",
  ]) {
    const records = await query(`SELECT id FROM ${m} WHERE created_by=?`, [id]);
    for (const r of records) {
      if (m === "tasks")
        await query("DELETE FROM task_comments WHERE task_id=?", [r.id]);
      if (m === "meetings")
        await query("DELETE FROM meeting_participants WHERE meeting_id=?", [
          r.id,
        ]);
      if (m === "projects")
        await query("DELETE FROM project_members WHERE project_id=?", [r.id]);
      await query("DELETE FROM record_comments WHERE record_id=?", [r.id]);
      await query("DELETE FROM activity_logs WHERE record_id=?", [r.id]);
      await query(`DELETE FROM ${m} WHERE id=?`, [r.id]);
    }
  }
  await query("DELETE FROM sessions WHERE user_id=?", [id]);
  await query("DELETE FROM notifications WHERE user_id=?", [id]);
  await query("DELETE FROM activity_logs WHERE actor_id=? OR record_id=?", [
    id,
    id,
  ]);
  await query("DELETE FROM users WHERE id=?", [id]);
  await pool.end();
}
