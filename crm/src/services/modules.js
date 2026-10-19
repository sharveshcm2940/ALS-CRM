const field = (key, label, type = "text", options) => ({
  key,
  label,
  type,
  options,
});
const name = field("name", "Name"),
  notes = field("notes", "Notes", "textarea"),
  owner = field("owner_id", "Relationship owner", "user"),
  priority = field("priority", "Priority", "select", [
    "Low",
    "Medium",
    "High",
    "Urgent",
  ]),
  confidential = field(
    "confidential",
    "Confidential — CEO access only",
    "checkbox",
  );
const contacts = [
  name,
  field("organization", "Organization"),
  field("email", "Email", "email"),
  field("phone", "Phone", "tel"),
  field(
    "contact_verified",
    "Contact details independently verified",
    "checkbox",
  ),
  owner,
  notes,
  confidential,
];
export const modules = {
  customers: {
    title: "Customers",
    singular: "customer",
    description:
      "Build lasting relationships. Keep every customer detail in one place.",
    columns: ["name", "organization", "owner_id", "status"],
    fields: [
      ...contacts,
      field("status", "Status", "select", ["Active", "Prospect", "Inactive"]),
      field("company_info", "Company information", "textarea"),
    ],
  },
  leads: {
    title: "Leads",
    singular: "lead",
    description:
      "A clear view of every opportunity, from first contact to conversion.",
    columns: [
      "name",
      "organization",
      "status",
      "priority",
      "follow_up_date",
      "value",
    ],
    fields: [
      ...contacts,
      field("source", "Lead source"),
      field("status", "Stage", "select", [
        "New",
        "Contacted",
        "Qualified",
        "Proposal",
        "Negotiation",
        "Won",
        "Lost",
      ]),
      priority,
      field("follow_up_date", "Follow-up date", "date"),
      field("value", "Opportunity value", "number"),
      field("currency", "Currency (ISO code)"),
    ],
  },
  projects: {
    title: "Projects",
    singular: "project",
    description: "Bring people, milestones, and progress together.",
    columns: ["name", "owner_id", "status", "priority", "progress", "due_date"],
    fields: [
      name,
      field("description", "Description", "textarea"),
      field("owner_id", "Project owner", "user"),
      field("customer_id", "Related customer", "customers"),
      field("members", "Team members", "multiuser"),
      field("start_date", "Start date", "date"),
      field("due_date", "Target completion", "date"),
      priority,
      field("status", "Status", "select", [
        "Planning",
        "Active",
        "On Hold",
        "Completed",
        "Cancelled",
      ]),
      field("progress", "Progress (%)", "number"),
      notes,
      confidential,
    ],
  },
  tasks: {
    title: "Tasks",
    singular: "task",
    description: "Make the next step clear. Keep work moving forward.",
    columns: ["name", "assignee_id", "status", "priority", "due_date"],
    fields: [
      name,
      field("description", "Description", "textarea"),
      field("assignee_id", "Assigned to", "user"),
      field("project_id", "Related project", "projects"),
      priority,
      field("status", "Status", "select", [
        "To Do",
        "In Progress",
        "In Review",
        "Completed",
      ]),
      field("progress", "Progress (%)", "number"),
      field("start_date", "Start date", "date"),
      field("due_date", "Due date", "date"),
    ],
  },
  meetings: {
    title: "Meetings",
    singular: "meeting",
    description:
      "Purposeful conversations, clear agendas, and recorded decisions.",
    columns: ["name", "organizer_id", "starts_at", "ends_at"],
    fields: [
      name,
      field("agenda", "Agenda", "textarea"),
      field("organizer_id", "Organizer", "user"),
      field("participants", "Participants", "multiuser"),
      field("customer_id", "Related customer", "customers"),
      field("project_id", "Related project", "projects"),
      field("starts_at", "Starts at (your local time)", "datetime-local"),
      field("ends_at", "Ends at (your local time)", "datetime-local"),
      notes,
      field("action_items", "Action items", "textarea"),
    ],
  },
  announcements: {
    title: "Announcements",
    singular: "announcement",
    description: "Keep the right people informed about what matters.",
    columns: ["name", "audience", "pinned", "created_at"],
    fields: [
      name,
      field("message", "Message", "textarea"),
      field("audience", "Audience", "select", ["all", "board", "engineer"]),
      field("pinned", "Pin announcement", "checkbox"),
    ],
  },
};
export function defaults(module, user) {
  return Object.fromEntries(
    modules[module].fields.map((f) => [
      f.key,
      f.type === "checkbox"
        ? false
        : f.type === "multiuser"
          ? []
          : f.type === "number"
            ? 0
            : f.type === "user"
              ? user.id
              : f.type === "select"
                ? f.options[0]
                : f.key === "currency"
                  ? "INR"
                  : f.type === "date" ||
                      f.type === "datetime-local" ||
                      ["customers", "projects"].includes(f.type)
                    ? null
                    : "",
    ]),
  );
}
