# Deploy ALS Infonet CRM on Netlify

Netlify serves the React build and runs the Express REST API through `netlify/functions/api.mjs`. The `/api/*` rewrite must precede the React Router fallback. The frontend uses `/api` on the same origin, so browser sessions and CSRF do not depend on third-party cookies. Render is not required for this deployment.

## Prerequisites

- A Netlify account connected to the GitHub repository `sharveshcm2940/ALS-CRM`.
- A hosted **MySQL 8-compatible database** reachable over TLS from Netlify Functions. Netlify's PostgreSQL database product does not replace this application's MySQL schema. Choose a provider/account and plan that you authorize; this repository does not create a paid database or promise a permanent free plan.
- An operator able to run migrations and deliver individual temporary credentials privately.

## Publish

1. In Netlify, choose **Add new project → Import an existing project → GitHub**, then select `sharveshcm2940/ALS-CRM`, branch `main`.
2. Keep the base directory at the repository root. The checked-in `netlify.toml` specifies Node 24, build command `npm run build`, publish directory `dist`, and functions directory `netlify/functions`.
3. Add **server-side environment variables**, including the **Functions** scope:
   - `DATABASE_URL`: the provider's MySQL connection URL, entered securely in Netlify. Never put it in source control or a `VITE_` variable.
   - `APP_ORIGIN`: the exact assigned HTTPS site URL, for example `https://YOUR-SITE.netlify.app`. Update this if you set a custom domain. Do not allow all Netlify sites.
   - `COMPANY_TIMEZONE`: `Asia/Kolkata` unless the company chooses otherwise.
   - `DB_SSL`: `true`. Certificate verification remains enabled. If the provider uses a private CA, set `DB_SSL_CA` to its trusted PEM certificate in Netlify; certificate verification stays enabled.
     Keep `VITE_API_URL` unset; the built frontend should use the same-origin `/api` path.
4. Initialize the hosted database **once from a trusted operator machine**. Populate an ignored local `.env` with the same MySQL connection settings, then run:
   ```sh
   npm ci
   npm run migrate
   npm run seed
   ```
   Deliver each generated credential from `.local/initial-accounts.txt` privately and remove the delivery file afterward. Every initial account must change its password. Do not use a shared initial password or import the committed legacy SQL dump into a public production database without reviewing and rotating its accounts.
5. Deploy the site. Migrations and account creation intentionally do **not** run during a Netlify build or on incoming function requests. Build-time database credentials are unnecessary; they are needed by the runtime and the operator's migration command.
6. Verify `/api/health` returns HTTP 200 with `database: "connected"`. HTTP 503 means the database is not ready. Verify sign-in, logout, one permitted CRUD workflow, and one unauthorized API request. A page loading or a successful frontend build does not establish that the CRM works.

The deploy shortcut is `https://app.netlify.com/start/deploy?repository=https://github.com/sharveshcm2940/ALS-CRM`. It requires your Netlify sign-in and a database connection; saving code alone does not publish a site.

## Local deployment validation

```sh
npm ci
npm run build
node --test server/tests/netlify.test.js server/tests/client.test.js
# With Netlify CLI installed and the project linked:
netlify build --offline
```

The adapter tests verify rewrite routing, cookie attributes, CSRF rejection, origin rejection and protected endpoints without a database. To validate authenticated CRM behavior, provision an isolated development database and run the existing API and browser suites. Function instances reuse a bounded MySQL pool; account for concurrent instances when selecting the database connection limit. API throttling is currently per process: a shared rate-limit store or platform controls are needed for dependable global throttling across function instances.

## Deployment credentials

Netlify publication requires the owner's Netlify login/authorization. Store the database URL and any deployment token in a secure credential store or the appropriate environment settings, never in chat or Git. A repository connection does not supply a MySQL database. Existing users provisioned using the legacy shared password must have their credentials rotated before a public launch; this deployment does not silently reset existing accounts or delete business records.
