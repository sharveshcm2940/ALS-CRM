# Fullstack Deployment Guide: Render

This guide explains how to connect and run **ALS Infonet CRM** on **Render**.

---

## Why You Saw "Database is currently unreachable"

Render runs on isolated cloud servers. By default, it cannot reach `localhost:3306` because `localhost` points to your personal computer, not the Render cloud container.

The server has **automated database initialization** built in: as soon as you provide a MySQL database URL, Render will:
1. Automatically run all schema migrations.
2. Automatically provision all 9 ALS Infonet team accounts with default password `Admin@12345`.
3. Automatically seed the **Jyothi Builders** customer, project, and tasks.

---

## Option 1: Free Cloud MySQL via TiDB Cloud (Recommended — 2 Minutes, Free Forever)

**TiDB Cloud Serverless** gives you a 100% free, permanent MySQL 8.0-compatible database with 5 GB storage. No credit card required.

1. **Sign Up Free**: Go to [tidbcloud.com](https://tidbcloud.com) and sign in with Google or GitHub.
2. **Create Cluster**:
   - Choose **Serverless** (Free forever).
   - Select your nearest region (e.g., Singapore or Mumbai if available).
   - Click **Create**.
3. **Get Connection String**:
   - In the cluster overview, click **Connect**.
   - Select **General** or **Node.js**.
   - Copy the connection string (format: `mysql://<user>:<password>@<host>:4000/<dbname>?ssl={"rejectUnauthorized":true}`).
4. **Paste in Render**:
   - Go to your [Render Dashboard](https://dashboard.render.com/) and open your **`als-crm`** service.
   - Click **Environment** in the left menu.
   - Add a new environment variable:
     - **Key**: `DATABASE_URL`
     - **Value**: *(Paste the connection string from TiDB Cloud)*
   - Click **Save Changes**.
5. Render will automatically redeploy. The app will auto-migrate and auto-seed immediately!
6. Visit `https://als-crm-gz7g.onrender.com` and log in:
   - **Username**: `sharvesh.cm`
   - **Password**: `Admin@12345`

---

## Option 2: Connect Render to Your Laptop's MySQL via Ngrok (Instant, 0 Accounts)

If you want Render to connect directly to the MySQL database already running on your Windows laptop:

1. In your local terminal, run:
   ```powershell
   npx ngrok tcp 3306
   ```
2. Ngrok will output a forwarding address like:
   ```
   Forwarding   tcp://4.tcp.ngrok.io:12345 -> localhost:3306
   ```
3. In your Render Dashboard > **als-crm** > **Environment**:
   - `DB_HOST`: `4.tcp.ngrok.io` *(use the hostname from your ngrok output)*
   - `DB_PORT`: `12345` *(use the port number from your ngrok output)*
   - `DB_USER`: `root`
   - `DB_PASSWORD`: *(leave empty if no password)*
   - `DB_NAME`: `als_crm`
   - `DB_SSL`: `false`
4. Click **Save Changes**. Render will connect directly to your laptop's database!

---

## Offline SQL Backup & Import

A complete SQL dump of the database (including schema, users, and the Jyothi Builders project) is included in the repository at:
[`database/als_crm_dump.sql`](file:///c:/Users/Sharvesh%20C%20M/Downloads/Saranya-dad/database/als_crm_dump.sql)

You can import this file into any MySQL database tool (e.g. MySQL Workbench, phpMyAdmin, DBeaver, or TiDB Console) at any time.

---

## Default Team Credentials (Once Connected)

All team accounts are pre-configured with the default initial password `Admin@12345`:

| Username | Name | Role |
| :--- | :--- | :--- |
| `sharvesh.cm` | Sharvesh CM | Engineering |
| `abdul` | Abdul | CEO |
| `sarveshvaran.a` | Sarveshvaran A | Engineering |
| `saranya.devi` | Saranya Devi | Engineering |
| `aakash` | Aakash | Board member |
| `aadarsh` | Aadarsh | Board member |
| `tharun` | Tharun | Board member |
| `siddharth` | Siddharth | Engineering |
| `lohith` | Lohith | Engineering |
