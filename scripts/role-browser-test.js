import { chromium } from "@playwright/test";
import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import assert from "node:assert/strict";
import { pool, query } from "../server/config/index.js";
import { existsSync } from "node:fs";
function getExecutable() {
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH))
    return process.env.CHROMIUM_PATH;
  const candidates = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return undefined;
}
const browser = await chromium.launch({
    headless: true,
    ...(getExecutable() ? { executablePath: getExecutable() } : {}),
  }),
  ids = [];
const base = process.env.TEST_BASE_URL || "http://localhost:5173";
try {
  for (const role of ["board", "engineer"]) {
    const id = randomUUID(),
      username = "role_browser_" + role + "_" + Date.now(),
      password = randomBytes(20).toString("hex");
    ids.push(id);
    await query(
      "INSERT INTO users(id,username,name,role_id,password_hash,must_change_password) VALUES (?,?,?,?,?,0)",
      [
        id,
        username,
        `Development ${role} test`,
        role,
        await bcrypt.hash(password, 12),
      ],
    );
    const context = await browser.newContext(),
      page = await context.newPage();
    await page.goto(base);
    await page.getByLabel("Email or username").fill(username);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page
      .getByRole("heading", { name: "Good to see you, Development." })
      .waitFor();
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    assert.equal(
      await nav.getByText("Customers", { exact: true }).count(),
      role === "board" ? 1 : 0,
    );
    assert.equal((await page.request.get(base + "/api/users")).status(), 403);
    await nav.getByText("Settings", { exact: true }).click();
    await page.getByRole("heading", { name: "Account & security" }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Permissions", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Audit log", exact: true })
        .count(),
      0,
    );
    if (role === "engineer") {
      await page.goto(base + "/customers");
      await page.getByRole("heading", { name: "Access restricted" }).waitFor();
    }
    await query("DELETE FROM sessions WHERE user_id=?", [id]);
    await nav.getByText("Tasks", { exact: true }).click();
    await page.getByRole("heading", { name: "Welcome back" }).waitFor();
    await context.close();
  }
  console.log(
    "PASS: board/engineering dashboards and navigation, administration restrictions, protected direct route, and expired-session return to login.",
  );
} finally {
  await browser.close();
  for (const id of ids) {
    await query("DELETE FROM sessions WHERE user_id=?", [id]);
    await query("DELETE FROM activity_logs WHERE actor_id=?", [id]);
    await query("DELETE FROM users WHERE id=?", [id]);
  }
  await pool.end();
}
