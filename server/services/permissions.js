export const modules = [
  "customers",
  "leads",
  "projects",
  "tasks",
  "meetings",
  "announcements",
];
export const permissions = [
  ...modules.flatMap((m) => [`${m}.read`, `${m}.write`, `${m}.archive`]),
  "comments.write",
  "reports.read",
  "reports.export",
  "team.read",
  "users.manage",
  "settings.manage",
  "audit.read",
  "permissions.manage",
  "tasks.create",
];
export const defaults = {
  ceo: permissions,
  board: [
    ...modules.map((m) => `${m}.read`),
    "comments.write",
    "team.read",
    "reports.read",
    "reports.export",
  ],
  engineer: [
    "projects.read",
    "tasks.read",
    "meetings.read",
    "announcements.read",
    "comments.write",
    "team.read",
  ],
};
