const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initDB } = require('./db');

dotenv.config();

const authRoutes = require('./routes/auth');
const meterRoutes = require('./routes/meters');
const readingRoutes = require('./routes/readings');
const dashboardRoutes = require('./routes/dashboard');
const exportRoutes = require('./routes/export');
const auditRoutes = require('./routes/audit');
const backupRoutes = require('./routes/backup');
const { securityHeaders, apiRateLimiter } = require('./middleware/security');
const { initBackupScheduler } = require('./backupService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(securityHeaders);
app.use(cors());
app.use(express.json());
app.use('/api', apiRateLimiter(400, 60 * 1000));

// Mount API Routes (Supports both /api/* and /* for Vercel serverless rewrites)
const routes = [
  ['/auth', authRoutes],
  ['/meters', meterRoutes],
  ['/readings', readingRoutes],
  ['/dashboard', dashboardRoutes],
  ['/export', exportRoutes],
  ['/audit', auditRoutes],
  ['/backup', backupRoutes],
];

routes.forEach(([prefix, router]) => {
  app.use(`/api${prefix}`, router);
  app.use(prefix, router);
});

app.get(['/api/health', '/health'], (req, res) => {
  res.json({ 
    status: 'OK', 
    system: 'AQ TRACK Backend API', 
    security: 'Active (WAL Mode, Rate-Limited, RBAC Protected)',
    timestamp: new Date() 
  });
});

// Root Landing Page for Backend Server
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AQ TRACK - Backend API Server</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #090d16;
          color: #f1f5f9;
          min-h-screen: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .card {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 24px;
          padding: 36px;
          max-width: 640px;
          width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          text-align: center;
        }
        .badge {
          display: inline-block;
          background: #064e3b;
          color: #34d399;
          border: 1px solid #059669;
          padding: 4px 14px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          margin-bottom: 16px;
        }
        h1 { font-size: 28px; font-weight: 900; margin-bottom: 8px; color: #ffffff; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
        .endpoints {
          background: #020617;
          border: 1px solid #1e293b;
          border-radius: 16px;
          padding: 16px;
          text-align: left;
          font-family: monospace;
          font-size: 13px;
          margin-bottom: 24px;
        }
        .endpoints h3 { font-family: sans-serif; font-size: 12px; color: #06b6d4; text-transform: uppercase; margin-bottom: 8px; }
        .endpoints ul { list-style: none; }
        .endpoints li { padding: 4px 0; color: #cbd5e1; display: flex; justify-content: space-between; }
        .endpoints li span { color: #38bdf8; font-weight: bold; }
        .btn {
          display: inline-block;
          background: linear-gradient(135deg, #06b6d4, #2563eb);
          color: #ffffff;
          font-weight: 800;
          font-size: 15px;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(6, 182, 212, 0.4);
          transition: transform 0.2s, background 0.2s;
        }
        .btn:hover { transform: scale(1.03); }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">● SERVER ACTIVE & HEALTHY</span>
        <h1>AQ TRACK Backend API Server</h1>
        <p>Industrial Water Monitoring & Operational Data Service (Express + SQLite)</p>
        
        <div class="endpoints">
          <h3>Active API Endpoints</h3>
          <ul>
            <li><span>GET /api/health</span> System Health Status</li>
            <li><span>POST /api/auth/login</span> Worker Login & JWT Auth</li>
            <li><span>GET /api/readings</span> Daily Water Readings</li>
            <li><span>GET /api/dashboard</span> Analytics & KPI Metrics</li>
            <li><span>GET /api/export/excel</span> Excel Workbook Export</li>
            <li><span>GET /api/meters</span> Meter Configuration</li>
            <li><span>GET /api/audit</span> Audit Log History</li>
          </ul>
        </div>

        <a href="http://localhost:3000" class="btn">Open AQ TRACK Web Application →</a>
      </div>
    </body>
    </html>
  `);
});

// Fallback Handler for unknown routes
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json')) {
    return res.status(404).json({ error: `Route ${req.originalUrl} not found` });
  }

  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>AQ TRACK - Page Not Found</title>
      <style>
        body { font-family: sans-serif; background: #090d16; color: #f1f5f9; text-align: center; padding: 50px; }
        .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 20px; padding: 40px; max-width: 500px; margin: 0 auto; }
        h1 { color: #f43f5e; margin-bottom: 12px; }
        p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; }
        a { display: inline-block; background: #06b6d4; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>404 - Endpoint Not Found</h1>
        <p>The path <code>${req.originalUrl}</code> is not a valid API route on AQ TRACK backend server.</p>
        <a href="/">Return to AQ TRACK Application</a>
      </div>
    </body>
    </html>
  `);
});

// Initialize Database & Start Server
const initPromise = initDB()
  .then(() => {
    initBackupScheduler();
    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`AQ TRACK Backend Server running on http://localhost:${PORT}`);
      });
    }
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
  });

module.exports = app;
module.exports.initPromise = initPromise;
