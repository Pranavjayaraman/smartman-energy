# AQ TRACK - Industrial Water Monitoring & Operations Management Portal

A secure, crash-resilient, and bilingual (English & தமிழ்) industrial water accounting, sub-metering, and compliance platform built with React, Vite, Express, and SQLite with WAL mode.

---

## 🌟 Key Features

1. **Anti-Data-Loss Database Engine**:
   - **SQLite WAL Mode**: Write-Ahead Logging for high-concurrency read/write transactions without file-locking crashes.
   - **Automated Point-in-Time Backups**: Scheduled every 12 hours, at server startup, and on-demand in `server/backups/`.
   - **ACID Transactions**: Multi-meter batch entries are saved atomically (`BEGIN TRANSACTION ... COMMIT`).
   - **Database Health & Integrity Hub**: Admin view for live database file size, row counts, and `PRAGMA integrity_check`.

2. **Security & Threat Defense**:
   - **Rate Limiting**: Sliding-window rate limiters protecting authentication endpoints from brute-force attacks.
   - **Strict Role-Based Access Control (RBAC)**: Zone isolation preventing operators from writing to unassigned plant areas.
   - **Security Incident Logging**: Failed logins and unauthorized area attempts recorded in the audit trail.

3. **Intuitive & Friendly Worker UI**:
   - **Dedicated Central Login**: 1-Click role selection chips for all plant operators.
   - **Ubiquitous Back Navigation**: Sticky top header bar with `← Back to Dashboard` and `← Back to Daily Entry` on all pages.
   - **Bilingual Interface**: Seamless instant toggle between English and தமிழ் (Tamil).
   - **1-Click Ledger Export**: Formatted Excel workbook downloads.

---

## 🚀 How to Run Locally

### 1. Install Dependencies
```bash
# Install Server Dependencies
cd server && npm install

# Install Client Dependencies
cd ../client && npm install
```

### 2. Start Application
```bash
# Terminal 1 - Backend Server (Port 5000)
cd server
npm start

# Terminal 2 - Frontend Client (Port 3000)
cd client
npm run dev
```

- **Web Portal**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## 🔑 Default User Accounts

| Role | Username | Password | Permissions |
|---|---|---|---|
| **System Administrator** | `admin` | `admin123` | Full Access (Dashboard, Meters, Security Hub, Audit) |
| **Water Intake Operator** | `op_intake` | `intake123` | Water Intake Meter Entry & Past Records |
| **Process Water Operator** | `op_process` | `process123` | Process Water Lines Entry & Past Records |
| **Domestic & Garden Operator** | `op_dom_gard` | `domestic123` | Office, Restrooms & Garden Entry |
| **STP/ETP Plant Operator** | `op_treatment` | `treatment123` | Sewage & Effluent Recovery Plant Entry |
| **Operations Manager** | `manager` | `viewer123` | Read-only Dashboard Analytics & Export |

---

## 📤 Step-by-Step Guide: Push to GitHub

1. Open a terminal in the root project folder:
   ```bash
   git init
   git add .
   git commit -m "feat: complete AQ TRACK water monitoring system with database security, backups, and intuitive UI"
   git branch -M main
   ```

2. Create a new repository on [GitHub](https://github.com/new).

3. Link your local repository to GitHub and push:
   ```bash
   git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
   git push -u origin main
   ```

---

## ⚡ Step-by-Step Guide: Deploy to Vercel

The repository is pre-configured with `vercel.json` and serverless function handlers so that it deploys seamlessly without build errors.

### Option A: Via Vercel Dashboard (Easiest)
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** → **"Project"**.
3. Select your imported GitHub repository.
4. **Project Settings**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (or `client` if deploying frontend only)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist` (or `client/dist`)
5. Click **"Deploy"**.

### Option B: Via Vercel CLI
```bash
npm install -g vercel
vercel
```
Follow the interactive prompts (Accept defaults).

---

## 🛡️ Security & Environment Variables (Optional)

You can set these environment variables in your Vercel Dashboard or local `.env`:

```env
PORT=5000
JWT_SECRET=your_super_secret_jwt_key_2026
VITE_API_URL=https://your-api-domain.com   # (Only needed if backend is hosted separately)
```
