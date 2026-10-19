import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { pool, query, config } from "../config/index.js";
import { permissions, defaults } from "./permissions.js";

export async function runMigrations() {
  await query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(160) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)",
  );
  const migrationsDir = new URL("../migrations/", import.meta.url);
  const names = (await readdir(migrationsDir))
    .filter((name) => /^\d+_.*\.sql$/.test(name))
    .sort();

  for (const name of names) {
    const existing = await query(
      "SELECT name FROM schema_migrations WHERE name=?",
      [name],
    );
    if (existing.length) continue;

    const sql = await readFile(new URL(name, migrationsDir), "utf8");
    for (const statement of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)) {
      await query(statement);
    }
    await query("INSERT INTO schema_migrations(name) VALUES (?)", [name]);
    console.log(`[ALS CRM] Migration applied: ${name}`);
  }
}

export async function runSeeders() {
  const existingRoles = new Set(
    (await query("SELECT id FROM roles")).map((r) => r.id),
  );
  for (const [id, name] of [
    ["ceo", "CEO"],
    ["board", "Board member"],
    ["engineer", "Engineering"],
  ]) {
    await query("INSERT IGNORE INTO roles(id,name) VALUES (?,?)", [id, name]);
  }

  for (const p of permissions) {
    await query("INSERT IGNORE INTO permissions(id) VALUES (?)", [p]);
  }

  for (const role of Object.keys(defaults)) {
    if (!existingRoles.has(role)) {
      for (const p of defaults[role]) {
        await query("INSERT IGNORE INTO role_permissions VALUES (?,?)", [
          role,
          p,
        ]);
      }
    }
  }

  const defaultPassword =
    process.env.INITIAL_PASSWORD || process.env.ADMIN_PASSWORD || "Admin@12345";
  const passwordHash = await bcrypt.hash(defaultPassword, 12);
  const mustChange = process.env.MUST_CHANGE_PASSWORD === "true" ? 1 : 0;

  const users = [
    ["Abdul", "abdul", "ceo"],
    ["Aakash", "aakash", "board"],
    ["Aadarsh", "aadarsh", "board"],
    ["Tharun", "tharun", "board"],
    ["Siddharth", "siddharth", "engineer"],
    ["Lohith", "lohith", "engineer"],
    ["Sarveshvaran A", "sarveshvaran.a", "engineer"],
    ["Sharvesh CM", "sharvesh.cm", "engineer"],
    ["Saranya Devi", "saranya.devi", "engineer"],
  ];

  for (const [name, username, role] of users) {
    const existing = await query("SELECT id FROM users WHERE username=?", [
      username,
    ]);
    if (!existing.length) {
      await query(
        "INSERT INTO users(id,name,username,password_hash,role_id,must_change_password) VALUES (?,?,?,?,?,?)",
        [randomUUID(), name, username, passwordHash, role, mustChange],
      );
      console.log(`[ALS CRM] Provisioned user account: ${username}`);
    }
  }

  await query(
    "INSERT IGNORE INTO settings(id,company_name,timezone) VALUES (1,?,?)",
    ["ALS Infonet", config.timezone],
  );

  // Seed Jyothi Builders customer, project and tasks if not present
  const [ceo] = await query("SELECT id FROM users WHERE username='abdul'");
  const [sharvesh] = await query(
    "SELECT id FROM users WHERE username='sharvesh.cm'",
  );
  const [sarvesh] = await query(
    "SELECT id FROM users WHERE username='sarveshvaran.a'",
  );
  const [saranya] = await query(
    "SELECT id FROM users WHERE username='saranya.devi'",
  );

  if (ceo && sharvesh) {
    let customerId;
    const existingCustomer = await query(
      "SELECT id FROM customers WHERE name='Jyothi Builders'",
    );
    if (!existingCustomer.length) {
      customerId = randomUUID();
      await query(
        "INSERT INTO customers(id,name,organization,company_info,owner_id,status,notes,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?)",
        [
          customerId,
          "Jyothi Builders",
          "Jyothi Builders",
          "Commercial and residential construction firm requiring a specialized B2B CRM solution.",
          sharvesh.id,
          "Active",
          "Client for B2B CRM project. Initial contact for CRM workflows.",
          ceo.id,
          ceo.id,
        ],
      );
      console.log("[ALS CRM] Created customer: Jyothi Builders");
    } else {
      customerId = existingCustomer[0].id;
    }

    const existingProject = await query(
      "SELECT id FROM projects WHERE name='B2B CRM for Jyothi Builders'",
    );
    if (!existingProject.length) {
      const projectId = randomUUID();
      await query(
        "INSERT INTO projects(id,name,description,owner_id,customer_id,start_date,due_date,priority,status,progress,notes,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          projectId,
          "B2B CRM for Jyothi Builders",
          "Custom B2B CRM platform for Jyothi Builders. Commencing 2026-10-20, Deadline 2026-11-03. Team Lead: Sarveshvaran A (Backend & Business Logic). Sharvesh CM (Testing & Backend). Saranya Devi (Frontend & DB Design).",
          sarvesh.id,
          customerId,
          "2026-10-20",
          "2026-11-03",
          "High",
          "Planning",
          0,
          "Commences 2026-10-20. Deliver custom CRM by 2026-11-03.",
          ceo.id,
          ceo.id,
        ],
      );

      for (const member of [sarvesh, sharvesh, saranya].filter(Boolean)) {
        await query(
          "INSERT IGNORE INTO project_members(project_id,user_id) VALUES (?,?)",
          [projectId, member.id],
        );
      }

      const tasks = [
        [
          "Prepare Software Requirement Specifications (SRS)",
          "Prepare, review, and finalize SRS (Software Requirement Specifications) for Jyothi Builders B2B CRM ahead of development start date.",
          saranya ? saranya.id : sharvesh.id,
          "High",
          "2026-10-19",
          "2026-10-21",
        ],
        [
          "Get initial advance 5k within 2days",
          "Collect initial advance payment of ₹5,000 from Jyothi Builders within 2 days.",
          sharvesh.id,
          "Urgent",
          "2026-10-19",
          "2026-10-21",
        ],
        [
          "Lead Project Delivery & Backend Core Architecture",
          "Serve as Project Team Lead. Architect core RESTful backend APIs, transaction handling, and security middlewares for Jyothi Builders CRM.",
          sarvesh.id,
          "High",
          "2026-10-20",
          "2026-10-28",
        ],
        [
          "Business Logic & Construction CRM Workflows",
          "Develop business logic engine for construction pipeline tracking, lead conversion lifecycle, milestones, and audit trails.",
          sarvesh.id,
          "High",
          "2026-10-26",
          "2026-11-03",
        ],
        [
          "Backend Route Handlers & Integration Modules",
          "Develop backend route endpoints, authorization validation, request payload checking, and server response handlers.",
          sharvesh.id,
          "High",
          "2026-10-20",
          "2026-10-28",
        ],
        [
          "Comprehensive Testing & Quality Assurance",
          "Design and execute full automated test suites, end-to-end integration tests, security audits, and QA sign-off prior to the November 3 deadline.",
          sharvesh.id,
          "Urgent",
          "2026-10-27",
          "2026-11-03",
        ],
        [
          "Database Design & Relational Schema Modeling",
          "Design normalized relational database tables, foreign keys, schema constraints, and performance indexes for Jyothi Builders project.",
          saranya.id,
          "High",
          "2026-10-20",
          "2026-10-25",
        ],
        [
          "Frontend UI/UX Design & Client Interface Development",
          "Build modern, responsive customer and project management interfaces with ALS Infonet design tokens, accessible forms, and dashboard widgets.",
          saranya.id,
          "High",
          "2026-10-24",
          "2026-11-02",
        ],
      ];

      for (const [tName, desc, assignee, prio, startD, dueD] of tasks) {
        await query(
          "INSERT INTO tasks(id,name,description,assignee_id,project_id,priority,status,progress,start_date,due_date,created_by,updated_by) VALUES (?,?,?,?,?,?,?,0,?,?,?,?)",
          [
            randomUUID(),
            tName,
            desc,
            assignee,
            projectId,
            prio,
            "To Do",
            startD,
            dueD,
            ceo.id,
            ceo.id,
          ],
        );
      }
      console.log("[ALS CRM] Created project and tasks for Jyothi Builders");
    }
  }
}

export async function ensureDatabaseReady() {
  try {
    await query("SELECT 1");
  } catch (err) {
    console.warn(
      `[ALS CRM] Database connection not ready: ${err.message || err.code}`,
    );
    console.warn(
      "[ALS CRM] To connect a database in Render, add DATABASE_URL (or DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) to Render Environment Variables.",
    );
    return false;
  }

  try {
    console.log("[ALS CRM] Database connected. Checking migrations...");
    await runMigrations();
    await runSeeders();
    console.log("[ALS CRM] Database successfully initialized and ready!");
    return true;
  } catch (err) {
    console.error("[ALS CRM] Failed to initialize database:", err);
    return false;
  }
}
