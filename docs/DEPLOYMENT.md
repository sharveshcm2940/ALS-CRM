# Deployment Guide: Netlify

This guide details how to deploy the **ALS Infonet CRM** on **Netlify**.

---

## Architecture Overview

```
┌─────────────────────────────────┐           ┌──────────────────────────────────┐
│        Netlify (Frontend)       │           │        Backend API Server        │
│   https://<your-app>.netlify.app│  ──────►  │   https://<api-host>/api         │
│      React 19 + Vite 7 SPA      │   HTTPS   │       Express 5 + Node.js        │
└─────────────────────────────────┘           └──────────────────────────────────┘
                                                               │
                                                               ▼
                                              ┌──────────────────────────────────┐
                                              │      Cloud MySQL Database        │
                                              │   (Aiven / PlanetScale / RDS)    │
                                              └──────────────────────────────────┘
```

---

## 1. Netlify Configuration Files

The repository includes pre-configured Netlify files:
- **`netlify.toml`**: Specifies build command (`npm run build`), publish directory (`dist`), Node 20 runtime, and SPA client-side route redirects.
- **`public/_redirects`**: Automatically copied to `dist/_redirects` during Vite builds, routing `/*` to `/index.html 200` to prevent 404s on page refresh.

---

## 2. Deploying on Netlify (Step-by-Step)

1. Log into your [Netlify Dashboard](https://app.netlify.com/).
2. Click **Add new site** > **Import an existing project**.
3. Choose **GitHub** and authorize access to your repository:
   ```
   https://github.com/sharveshcm2940/ALS-CRM
   ```
4. Netlify will automatically detect configuration from `netlify.toml`:
   - **Branch to deploy**: `main`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Under **Environment variables**, click **Add a variable**:
   | Variable | Value | Description |
   | :--- | :--- | :--- |
   | `VITE_API_URL` | `https://<your-backend-api-host>/api` | URL of your deployed Express API |
6. Click **Deploy ALS-CRM**.
7. Once deployed, Netlify will provide your live URL (e.g., `https://als-crm.netlify.app`).

---

## 3. Backend & Database Connectivity

1. **Database**: ALS CRM uses MySQL 8.x. Connect your API server to any cloud MySQL provider (Aiven, Clever Cloud, AWS RDS, PlanetScale).
2. **Backend Server**: Deploy the Express server (`server/index.js`) to your cloud host with environment variables:
   ```ini
   NODE_ENV=production
   DB_HOST=<cloud-mysql-host>
   DB_PORT=3306
   DB_USER=<cloud-mysql-user>
   DB_PASSWORD=<cloud-mysql-password>
   DB_NAME=als_crm
   DB_SSL=true
   APP_ORIGIN=https://<your-site-name>.netlify.app
   COOKIE_SAMESITE=none
   COMPANY_TIMEZONE=Asia/Kolkata
   ```
3. When `APP_ORIGIN` is set to your Netlify site URL, cross-origin requests, CSRF validation, and `SameSite=None; Secure` session cookies are fully authorized.
