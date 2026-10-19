# Fullstack Deployment Guide: Render

This guide walks you through deploying the complete **ALS Infonet CRM** (both the React frontend and Express API together on one domain) using **Render**.

---

## Why Render All-In-One is the Best Approach

- **Single Domain**: Both the frontend (`/`, `/projects`, `/team`) and backend API (`/api/*`) run together on `https://your-crm.onrender.com`.
- **Zero CORS / Cookie Issues**: Cookies operate as first-party Same-Origin cookies, avoiding cross-site third-party cookie restrictions.
- **Automated Builds**: Render runs `npm install && npm run build` to compile the Vite frontend, and `npm start` to run the Express production server.

---

## Step 1: Cloud MySQL Database Setup

ALS CRM runs on MySQL 8.x. You need a cloud MySQL database accessible over the internet:

1. **Get Free Cloud MySQL**:
   - Go to [Aiven.io](https://aiven.io/) (free trial with managed MySQL) or [Clever-Cloud.com](https://www.clever-cloud.com/) (free MySQL add-on).
   - Alternatively, use **AWS RDS MySQL** or **Google Cloud SQL**.
2. **Note your credentials**:
   - `DB_HOST`: Hostname (e.g. `mysql-xxxx.aivencloud.com`)
   - `DB_PORT`: Port (typically `3306`)
   - `DB_USER`: Database user (e.g. `avnadmin` or `root`)
   - `DB_PASSWORD`: Database password
   - `DB_NAME`: Database name (e.g. `als_crm`)
   - `DB_SSL`: `true`
3. **Run Initial Migrations & Seeds**:
   From your local terminal, point your `.env` to the cloud DB credentials and run:
   ```bash
   npm run migrate
   npm run seed
   ```

---

## Step 2: Deploy to Render

1. Log into your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository:
   ```
   https://github.com/sharveshcm2940/ALS-CRM
   ```
4. Configure the Web Service:
   - **Name**: `als-crm` (or any name you choose)
   - **Region**: Choose the region closest to your database
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
5. Under **Environment Variables**, add:
   | Key | Value |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `DB_HOST` | `<your-cloud-mysql-host>` |
   | `DB_PORT` | `3306` |
   | `DB_USER` | `<your-db-user>` |
   | `DB_PASSWORD` | `<your-db-password>` |
   | `DB_NAME` | `als_crm` |
   | `DB_SSL` | `true` |
   | `COMPANY_TIMEZONE` | `Asia/Kolkata` |
6. Click **Deploy Web Service**.

---

## Step 3: Access Your CRM

Render will deploy your application and provide your live URL (e.g. `https://als-crm.onrender.com`).
When you open this URL:
- The React SPA loads instantly.
- The Express server serves `/api` requests on the same domain.
- Sign in with your provisioned account credentials.
