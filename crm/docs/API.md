# REST API reference

All routes are under `/api`. Responses use `{data: ...}` with optional `meta` pagination; errors use `{error: "safe message", details?: [{field,message}]}`. JSON bodies are strictly validated. HTTP statuses: 200 successful read/update, 201 creation, 400 validation, 401 missing/expired session, 403 permission/CSRF/initialization failure, 404 inaccessible or missing record, 409 duplicate/conflict, 429 throttled.

## Authentication

1. `GET /auth/csrf` sets the readable `csrf` cookie and returns `data.csrf`.
2. Supply it in `x-csrf-token` for every POST/PATCH/PUT/DELETE. Send credentials/cookies. Browser Origin must match `APP_ORIGIN`.
3. `POST /auth/login` accepts `{username,password}` (verified email may substitute for username), sets an HttpOnly JWT session cookie, rotates CSRF, returns `must_change_password`.
4. `GET /auth/me` returns a safe user record with role and permissions.
5. `PATCH /auth/change-password` accepts `{currentPassword,newPassword}` and revokes all sessions. Temporary-password accounts can only use authentication routes until initialized.
6. `POST /auth/logout` revokes the current session.

No password hashes are returned. Initial and reset credentials are operator-issued; no public account registration or unverified-email reset endpoint exists.

## Business records

`M` is one of `customers`, `leads`, `projects`, `tasks`, `meetings`, `announcements`.

| Method | Route                | Purpose / permission                                            |
| ------ | -------------------- | --------------------------------------------------------------- |
| GET    | `/M`                 | Scoped list; `M.read`                                           |
| GET    | `/M/:id`             | Scoped detail; `M.read`                                         |
| POST   | `/M`                 | Create; `M.write` (or `tasks.create` for own engineering tasks) |
| PATCH  | `/M/:id`             | Update; `M.write`, or assigned engineer's task status/progress  |
| DELETE | `/M/:id`             | Archive; `M.archive`                                            |
| GET    | `/M/:id/activity`    | Scoped record history; `M.read`                                 |
| GET    | `/M/:id/comments`    | Scoped conversation; `M.read`                                   |
| POST   | `/M/:id/comments`    | `{body}`; `M.read` + `comments.write`                           |
| POST   | `/leads/:id/convert` | Transactional conversion; `leads.write` + `customers.write`     |

List query: `q`, `page` (default 1), `limit` (default 12, max 100), `sort` (`name`, `created_at`, `updated_at`, or `due_date` if present), `direction` (`asc`/`desc`), `status`, `priority`, `owner_id`, `assignee_id`, `project_id` where applicable. Meetings additionally accept `period=past|upcoming` and `from=YYYY-MM-DD&to=YYYY-MM-DD` for a company-timezone date interval (exclusive end). Pagination returns `{total,page,limit,pages}`. Archived records do not appear in lists/details; business history remains in storage.

POST requires all module schema fields; PATCH accepts a strict subset. See `server/services/records.js` for authoritative constraints and `src/services/modules.js` for labels/options. UUID foreign keys are validated against active users and accessible parent records. Task assignees must belong to a linked project's membership or own that project. Dates accept ISO calendar dates or null; meeting timestamps require ISO 8601 with an explicit offset. `members`/`participants` are arrays of user UUIDs. Progress is an integer 0–100. Estimated value is nonnegative; currency is three uppercase letters. Contact email is nullable; no contact data is invented.

Common contact fields: `name,organization,email,phone,contact_verified,owner_id,notes,confidential`.

- Customers add `status,company_info`.
- Leads add `source,status,priority,follow_up_date,value,currency`.
- Projects: `name,description,owner_id,customer_id,start_date,due_date,priority,status,progress,notes,confidential,members`.
- Tasks: `name,description,assignee_id,project_id,priority,status,progress,start_date,due_date`.
- Meetings: `name,agenda,organizer_id,customer_id,project_id,starts_at,ends_at,notes,action_items,participants`.
- Announcements: `name,message,audience,pinned`; audience is `all|board|engineer`.

## Operations

| Method | Route                         | Behavior                                                                                             |
| ------ | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| GET    | `/health`                     | Authenticated MySQL connectivity probe; no user credentials needed                                   |
| GET    | `/dashboard`                  | Role-scoped counts, progress, deadlines, priority work, workload and activity                        |
| GET    | `/search?q=...`               | Up to 5 matching accessible records per permitted module                                             |
| GET    | `/team`                       | Names, roles and active status; `team.read`                                                          |
| GET    | `/activity`                   | CEO all; board permitted business records; engineering own actions                                   |
| GET    | `/notifications`              | Own 50 most recent notifications                                                                     |
| PATCH  | `/notifications/:id`          | Mark own notification read                                                                           |
| GET    | `/settings`                   | Company name/timezone                                                                                |
| PATCH  | `/settings`                   | `{company_name,timezone}`; CEO + `settings.manage`                                                   |
| GET    | `/users`                      | Safe administrative account list; CEO + `users.manage`                                               |
| POST   | `/users`                      | Individual account; CEO + `users.manage`; one-time temporary credential                              |
| PATCH  | `/users/:id`                  | Change account fields; revokes sessions; CEO + `users.manage`                                        |
| POST   | `/users/:id/reset-password`   | One-time temporary credential, revoke sessions; CEO + `users.manage`                                 |
| GET    | `/permissions`                | Role/permission grants; CEO + `permissions.manage`                                                   |
| PUT    | `/permissions/:role`          | `{grants:[permissionIds]}` for board/engineer; CEO + `permissions.manage`                            |
| GET    | `/audit?page=1`               | Paginated sensitive-action history; CEO + `audit.read`                                               |
| GET    | `/reports/:report`            | `pipeline,customers,projects,completion,overdue,workload`; `reports.read` and underlying module read |
| GET    | `/reports/:report?format=csv` | Same scoping plus `reports.export`; maximum 10,000 rows                                              |

User create fields: `{name,username,email,email_verified,role_id,active}`. Username is lowercase letters/digits/dot/underscore/hyphen, 3–80 characters. Email may be null. `email_verified:true` is an administrator assertion after independent verification. PATCH accepts a subset. The current CEO cannot disable or demote themselves. Administrative permissions cannot be granted to board or engineering roles.
