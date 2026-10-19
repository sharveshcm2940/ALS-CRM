# Deployment Guide: Vercel (Frontend) & Render (Backend)

This guide walks you through deploying the **ALS Infonet CRM** with the **Frontend hosted on Vercel** and the **Backend API hosted on Render**.

---

## Architecture Overview

```
┌─────────────────────────────────┐           ┌──────────────────────────────────┐
│        Vercel (Frontend)        │           │         Render (Backend)         │
│   https://<your-app>.vercel.app │  ──────►  │  https://<backend>.onrender.com  │
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

## Step 1: Cloud MySQL Database Setup

ALS CRM requires a MySQL 8.x database. You can use any free or managed cloud MySQL provider, such as:
- **Aiven for MySQL** (Free tier available: [aiven.io](https://aiven.io))
- **Clever Cloud MySQL** (Free tier available: [clever-cloud.com](https://www.clever-cloud.com))
- **AWS RDS MySQL** or **Google Cloud SQL**

Once created, obtain:
- `DB_HOST` (e.g. `mysql-xyz.aivencloud.com`)
- `DB_PORT` (e.g. `3306` or provider port)
- `DB_USER` (e.g. `avnadmin`)
- `DB_PASSWORD` (your database password)
- `DB_NAME` (e.g. `als_crm`)
- `DB_SSL` (`true`)

To run the initial schema and migrations on your cloud database from your local terminal:
```bash
# In your local .env temporarily set the cloud DB credentials, then run:
npm run migrate
npm run seed
```

---

## Step 2: Deploy Backend to Render

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository: `https://github.com/sharveshcm2940/ALS-CRM`.
4. Configure the Web Service settings:
   - **Name**: `als-crm-backend` (or your choice)
   - **Region**: Choose the region closest to your database (e.g. Singapore / Frankfurt / Oregon)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
5. Under **Environment Variables**, add:
   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production security & optimizations |
   | `PORT` | `10000` | (Or leave empty, Render sets this automatically) |
   | `DB_HOST` | `<your-cloud-db-host>` | From Step 1 |
   | `DB_PORT` | `3306` | Default MySQL port |
   | `DB_USER` | `<your-db-user>` | From Step 1 |
   | `DB_PASSWORD` | `<your-db-password>` | From Step 1 |
   | `DB_NAME` | `als_crm` | From Step 1 |
   | `DB_SSL` | `true` | Required for cloud databases |
   | `APP_ORIGIN` | `https://<your-frontend>.vercel.app` | Your Vercel frontend URL (from Step 3) |
   | `COOKIE_SAMESITE` | `none` | Required for cross-site cookies between Vercel and Render |
   | `COMPANY_TIMEZONE` | `Asia/Kolkata` | Configured timezone |
6. Click **Deploy Web Service**.
7. Once deployed, copy your Render Service URL (e.g., `https://als-crm-backend.onrender.com`).

---

## Step 3: Deploy Frontend to Vercel

1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Import your GitHub repository: `sharveshcm2940/ALS-CRM`.
4. Vercel will automatically detect `Vite`:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | `https://<your-render-backend-url>.onrender.com/api` |
   *(Note: Make sure to include `/api` at the end of the URL)*
6. Click **Deploy**.
7. Once deployment finishes, copy your live Vercel domain (e.g., `https://als-crm.vercel.app`).

---

## Step 4: Final Link Verification

1. Go back to your **Render Dashboard** > **als-crm-backend** > **Environment**.
2. Verify that `APP_ORIGIN` matches your live Vercel URL:
   ```
   APP_ORIGIN=https://als-crm.vercel.app
   ```
   *(If you also have custom domains or preview URLs, you can separate them with commas)*.
3. Open your Vercel URL in your browser:
   - The sign-in page will load with the ALS Infonet theme.
   - Enter your credentials to log in.
   - All API endpoints communicate securely over TLS with double-submit CSRF and `SameSite=None; Secure` cookies.
