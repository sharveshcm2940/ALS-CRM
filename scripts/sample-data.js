import { pool, query } from "../server/config/index.js";
import { saveRecord } from "../server/services/records.js";
if (process.env.NODE_ENV === "production")
  throw Error("Development fixtures are disabled in production.");
const [ceo] = await query(
  "SELECT id,role_id,name FROM users WHERE username='abdul'",
);
if (!ceo) throw Error("Run the initial seed first.");
if (
  (
    await query(
      "SELECT id FROM customers WHERE name='[DEVELOPMENT ONLY] Example customer'",
    )
  ).length
) {
  console.log("Development example already exists; no duplicates added.");
  await pool.end();
  process.exit(0);
}
const [engineer] = await query(
  "SELECT id FROM users WHERE username='saranya.devi'",
);
const customer = await saveRecord(
  "customers",
  null,
  {
    name: "[DEVELOPMENT ONLY] Example customer",
    organization: "Fictional development example",
    email: null,
    phone: "",
    contact_verified: false,
    company_info: "Not a real company. Development fixture only.",
    owner_id: ceo.id,
    status: "Active",
    notes: "Development fixture. Archive when finished.",
    confidential: false,
  },
  ceo,
);
const project = await saveRecord(
  "projects",
  null,
  {
    name: "[DEVELOPMENT ONLY] Example project",
    description: "A fictional project for trying the CRM.",
    owner_id: ceo.id,
    customer_id: customer.id,
    start_date: null,
    due_date: null,
    priority: "Medium",
    status: "Active",
    progress: 20,
    notes: "Development fixture only.",
    confidential: false,
    members: [engineer.id],
  },
  ceo,
);
await saveRecord(
  "tasks",
  null,
  {
    name: "[DEVELOPMENT ONLY] Try a task update",
    description:
      "Sign in as the assigned engineer and update progress. Not company work.",
    assignee_id: engineer.id,
    project_id: project.id,
    priority: "Medium",
    status: "To Do",
    progress: 0,
    start_date: null,
    due_date: null,
  },
  ceo,
);
console.log(
  "Added three clearly marked development-only example records. No invented contact details.",
);
await pool.end();
