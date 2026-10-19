# ALS Infonet CRM

A working internal CRM built with **React, Vite, React Router, Express, MySQL 8.4, mysql2, JWT cookie sessions, and bcrypt**. The original Next.js demonstration remains at the repository root; this CRM is independent in `crm/`.

## Quick start

Use the existing checkout at `/workspace/Saranya-dad/crm`; cloud tasks are already isolated. Do not create another worktree unless requested. Verified with Node 24, npm 11, Docker 28, MySQL 8.4, and system Chromium.

```sh
cd /workspace/Saranya-dad/crm
npm ci --cache /workspace/.npm-cache
npm run db:up
npm run migrate
npm run seed
npm run dev
```

`db:up` generates private local configuration if absent, starts the `als-crm-mysql` Docker container bound to **127.0.0.1:3307**, and verifies a real authenticated database query. MySQL data uses the named Docker volume `als-crm-mysql-data`. On a fresh container with an empty schema, a retained `.local/database.sql` is automatically restored if available and restored sessions are revoked. Existing database contents and `.env` files are preserved. The API uses port **4000**; Vite uses **5173** and proxies `/api`. Do not expose the MySQL port publicly.

For an existing managed MySQL database, provision `crm/.env` from `.env.example`, use a strong random signing secret, then run `migrate`, `seed`, and `dev` without `db:up`. No cloud API keys or email service are needed.

## First sign-in and account delivery

The repeatable seed creates nine individual accounts with no email addresses or phone numbers. It seeds roles and permissions but **no business records**.

| Name           | Username         | Role        |
| -------------- | ---------------- | ----------- |
| Abdul          | `abdul`          | CEO         |
| Aakash         | `aakash`         | Board       |
| Aadarsh        | `aadarsh`        | Board       |
| Tharun         | `tharun`         | Board       |
| Siddharth      | `siddharth`      | Engineering |
| Lohith         | `lohith`         | Engineering |
| Sarveshvaran A | `sarveshvaran.a` | Engineering |
| Sharvesh CM    | `sharvesh.cm`    | Engineering |
| Saranya Devi   | `saranya.devi`   | Engineering |

Initial temporary credentials are randomly generated into **`.local/initial-accounts.txt`**, readable only by the local owner. They are never printed, embedded in the client, committed, or returned by user-list endpoints. An administrator must deliver each person's credential through a verified private channel, then remove the provisioning file after delivery. Users must change their password before accessing CRM data. Passwords require 14–72 characters, a letter and number, and at most 72 UTF-8 bytes. The bcrypt cost is 12.

CEO account management is in **Team**. Add verified email addresses there only after independent verification; no fictional contact details are supplied. Email sign-in requires an explicitly verified email. Forgot-password instructions direct the user to an administrator: the CEO can issue a new random temporary credential, shown once, and all existing sessions are revoked. For CEO recovery by a trusted operator:

```sh
npm run account:reset -- abdul
```

That writes a credential to private `.local/reset-credentials.txt`. No email reset service or email-delivery claims are made.

## Workflow and permissions

- **CEO:** all records, executive metrics, assignments, archival, accounts, roles, company timezone, configurable permissions, reports, CSV exports, and audit logs.
- **Board:** nonconfidential customer/lead/project summaries, accessible tasks and meetings, announcements for all/board, comments, reports and CSV exports. No account administration or system permissions.
- **Engineering:** nonconfidential projects they own or belong to, their own assigned tasks within accessible projects, meetings they organize or participate in, all/engineering announcements, progress updates, comments, team directory, and their own activity.

Permission grants are stored in `permissions` and `role_permissions`, loaded from MySQL on every request, and configurable by the CEO in Settings. Administrative grants remain CEO-only. Record-level assignment, membership, audience and confidentiality rules remain enforced even if module permissions change. Engineers may update only status/progress of assigned tasks; the optional `tasks.create` grant allows them to create tasks for themselves. Every other protected field is rejected by strict server validation.

All six modules support record creation, detail views, editing, retained-history archival, comments, search, pagination and name sorting where authorized. Tasks also filter by status, priority, assignee and project. Leads support opportunity value/currency, follow-up dates, seven pipeline stages, and transactional customer conversion. Projects manage team membership. Meetings store UTC timestamps and provide upcoming/past and navigable calendar views; dates display in the configured company timezone. Meeting form date/time inputs are explicitly labeled as the browser's local time. Notifications are persisted for authorized assignees and participants and can be marked read.

Dashboard metrics and reports come from MySQL. Empty data produces zero counts and clear empty states. CSV exports apply the same permission and record scopes and escape spreadsheet formula prefixes. Reports are bounded to 10,000 records and disclose truncation. Notifications, search and business activity feeds respect record access. No AI/chat widgets, remote fonts, or invented live statistics are used.

## Verification

```sh
npm test                 # integration tests against the configured MySQL database
npm run build            # optimized production React build
npm run test:browser      # with dev servers running; system /usr/bin/chromium
npm run test:roles        # board/engineering UI, API restrictions and session expiry
npm audit --omit=dev
npm run db:backup
npm run db:test-recovery
```

The API suite checks authentication, all nine provisioned logins when still using temporary credentials, first-login enforcement, CSRF/origin checks, CRUD persistence, lead conversion, project/task IDOR resistance, confidential records, announcement audiences, comments, notifications, reports/CSV, audit access, password changes, deactivation and login throttling. Integration fixtures use unique test accounts and are removed afterward. Run tests in a development database; intentional login-failure security events remain in the audit trail.

The browser suite creates a temporary CEO fixture, exercises the forced password change, all six create forms, edits, conversion, comments, archival, reports, team/settings/audit views, calendar navigation and mobile layout, then removes only its fixtures. Screenshots go to ignored `test-results/`. Use `TEST_BASE_URL` to target a running production bundle. `npm run seed:demo` optionally adds three visibly labeled **[DEVELOPMENT ONLY]** example records; it refuses production mode and does not fabricate contact details. It is not run automatically.

## Production build and deployment

1. Use Node 24 and a MySQL 8.4 database. Back up before migrations. Use a migration principal for setup and a separate runtime database principal restricted to the schema's required SELECT/INSERT/UPDATE/DELETE operations.
2. Provision secret environment variables securely. Use a fresh, high-entropy `JWT_SECRET` and database credentials; never copy development credentials to production. `.env.example` contains placeholders only. Set `NODE_ENV=production`, `PORT=4000`, `APP_ORIGIN=https://YOUR_VERIFIED_COMPANY_HOST`, database variables, and `COMPANY_TIMEZONE` for initial setup. Subsequent timezone changes are stored in Settings.
3. Run `npm ci`, `npm run migrate`, `npm run seed`, and `npm run build` from `crm/`. Deliver initial credentials securely and delete provisioning files. Run `npm run start` under a process supervisor. Express serves both `dist/` and `/api` from the same origin. Do not use Vite's development server publicly.
4. Terminate HTTPS at a reverse proxy, forward requests to the private API port, preserve the approved origin, and restrict direct network access. Secure cookies are enabled when `NODE_ENV=production`; CORS accepts only `APP_ORIGIN`. For managed MySQL, set `DB_SSL=true` to verify the server certificate against system trust; set `DB_SSL_CA_FILE` to an operator-provided trusted CA file if required. Keep certificate verification enabled. Also configure private network controls. For a multi-instance deployment, add a shared rate-limit store; the supplied limiter is process-local.
5. Confirm `/api/health`, sign-in, a permitted CRUD workflow, and negative permission tests behind the real HTTPS host. Protect database backups, centralize security logs, monitor expiry/disk capacity, and set an organization retention policy.

Sessions use HttpOnly/SameSite=Strict cookies, Secure in production, fixed eight-hour JWT expiry with issuer/audience/algorithm checks, and a database session record checked on each request. Logout deletes that session. Password/role/status changes revoke all sessions. There is no long-lived refresh token. CSRF requires a matching cookie/header pair plus an approved browser Origin for mutations, including login. Secure headers, strict payload validation, parameterized SQL, IP/account login throttles, and generic client-facing server errors are enabled. The API does not trust forwarded IP headers by default; a single trusted reverse proxy may aggregate requests under one IP, so configure a narrowly trusted proxy topology before scaling.

## Backups and recovery

`npm run db:backup` creates a consistent transactional dump in ignored **`.local/database.sql`** using the local Docker instance. This contains sensitive account hashes and business data: encrypt off-machine copies and restrict access. A Docker volume alone is not a cloud filesystem snapshot; refresh this dump before publishing an environment or moving machines.

`npm run db:test-recovery` restores that dump into a uniquely named isolated database, compares user/migration/customer/project counts against the current database, and removes only that recovery database. It never replaces the live database. Use a fresh backup immediately before this check.

For production recovery, stop application writers, preserve the current database for investigation, provision an empty replacement database, and import an authorized backup using an operator-controlled MySQL client. Revoke all restored `sessions`, run migrations, verify account and business-record counts plus representative authenticated workflows, then switch the application connection. Keep the previous database until recovery is verified. Schedule encrypted automated backups and periodic restore drills using your infrastructure's supported tooling; this repository does not provision a cloud backup scheduler.

## Structure and API

`src/` separates layout, reusable forms/tables/dialogs, pages and API services. `server/` separates routing, authentication/authorization middleware, query services, configuration, SQL migrations, seeders and integration tests. The database has separate normalized tables with UUID identifiers, foreign keys, indexes, timestamps and archival. See [API reference](docs/API.md) and [security and access model](docs/SECURITY.md).

Cloud configuration saving and environment publication are separate steps. A working current instance and saved scripts do not prove a fresh-task snapshot restoration or a production deployment.
