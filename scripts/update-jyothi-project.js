import { randomUUID } from "node:crypto";
import { pool, query } from "../server/config/index.js";

const [sarvesh] = await query(
  "SELECT id FROM users WHERE username='sarveshvaran.a'",
);
const [sharvesh] = await query(
  "SELECT id FROM users WHERE username='sharvesh.cm'",
);
const [saranya] = await query(
  "SELECT id FROM users WHERE username='saranya.devi'",
);
const [abdul] = await query("SELECT id FROM users WHERE username='abdul'");

if (!sarvesh || !sharvesh || !saranya || !abdul) {
  throw new Error("Required users not found.");
}

const [project] = await query(
  "SELECT id FROM projects WHERE name LIKE '%Jyothi Builders%'",
);

if (!project) {
  throw new Error("Jyothi Builders project not found.");
}

const projectId = project.id;
const startDate = "2026-10-20"; // Commencing tomorrow
const dueDate = "2026-11-03"; // Deadline 3 November 2026

// Update project dates and description
await query(
  `UPDATE projects SET 
    start_date = ?, 
    due_date = ?, 
    owner_id = ?,
    status = 'Planning',
    description = 'Custom B2B CRM platform for Jyothi Builders. Commencing 2026-10-20, Deadline 2026-11-03. Team Lead: Sarveshvaran A (Backend & Business Logic). Sharvesh CM (Testing & Backend). Saranya Devi (Frontend & DB Design).'
  WHERE id = ?`,
  [startDate, dueDate, sarvesh.id, projectId],
);

// Ensure project members
for (const member of [sarvesh, sharvesh, saranya]) {
  await query(
    "INSERT IGNORE INTO project_members(project_id, user_id) VALUES (?,?)",
    [projectId, member.id],
  );
}

// Tasks to add
const tasksToAdd = [
  {
    name: "Lead Project Delivery & Backend Core Architecture",
    description:
      "Serve as Project Team Lead. Architect core RESTful backend APIs, transaction handling, and security middlewares for Jyothi Builders CRM.",
    assignee_id: sarvesh.id,
    start_date: "2026-10-20",
    due_date: "2026-10-28",
    priority: "High",
  },
  {
    name: "Business Logic & Construction CRM Workflows",
    description:
      "Develop business logic engine for construction pipeline tracking, lead conversion lifecycle, milestones, and audit trails.",
    assignee_id: sarvesh.id,
    start_date: "2026-10-26",
    due_date: "2026-11-03",
    priority: "High",
  },
  {
    name: "Backend Route Handlers & Integration Modules",
    description:
      "Develop backend route endpoints, authorization validation, request payload checking, and server response handlers.",
    assignee_id: sharvesh.id,
    start_date: "2026-10-20",
    due_date: "2026-10-28",
    priority: "High",
  },
  {
    name: "Comprehensive Testing & Quality Assurance",
    description:
      "Design and execute full automated test suites, end-to-end integration tests, security audits, and QA sign-off prior to the November 3 deadline.",
    assignee_id: sharvesh.id,
    start_date: "2026-10-27",
    due_date: "2026-11-03",
    priority: "Urgent",
  },
  {
    name: "Database Design & Relational Schema Modeling",
    description:
      "Design normalized relational database tables, foreign keys, schema constraints, and performance indexes for Jyothi Builders project.",
    assignee_id: saranya.id,
    start_date: "2026-10-20",
    due_date: "2026-10-25",
    priority: "High",
  },
  {
    name: "Frontend UI/UX Design & Client Interface Development",
    description:
      "Build modern, responsive customer and project management interfaces with ALS Infonet design tokens, accessible forms, and dashboard widgets.",
    assignee_id: saranya.id,
    start_date: "2026-10-24",
    due_date: "2026-11-02",
    priority: "High",
  },
];

for (const t of tasksToAdd) {
  const existing = await query(
    "SELECT id FROM tasks WHERE project_id=? AND name=?",
    [projectId, t.name],
  );
  if (!existing.length) {
    await query(
      `INSERT INTO tasks(id, name, description, assignee_id, project_id, priority, status, progress, start_date, due_date, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, 'To Do', 0, ?, ?, ?, ?)`,
      [
        randomUUID(),
        t.name,
        t.description,
        t.assignee_id,
        projectId,
        t.priority,
        t.start_date,
        t.due_date,
        abdul.id,
        abdul.id,
      ],
    );
    console.log(`Added task: ${t.name}`);
  } else {
    await query(
      `UPDATE tasks SET 
        description=?, 
        assignee_id=?, 
        priority=?, 
        start_date=?, 
        due_date=? 
      WHERE id=?`,
      [
        t.description,
        t.assignee_id,
        t.priority,
        t.start_date,
        t.due_date,
        existing[0].id,
      ],
    );
    console.log(`Updated task: ${t.name}`);
  }
}

console.log("Successfully updated Jyothi Builders project and assigned work!");
await pool.end();
