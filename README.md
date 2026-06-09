# 💊 PharmaSuiteX — Pharmacy Management Platform

India's smartest pharmacy management SaaS. Built for medical store owners.

## Features
- 👥 Customer Management
- 💊 Medicine Inventory & Expiry Tracking
- 🧾 GST Billing & PDF Invoices
- 🔔 Auto Refill Reminders
- 📣 SMS & WhatsApp Campaigns
- 📊 Analytics & Reports
- 💎 Subscription Plans (Trial/Basic/Premium)

## Tech Stack
- **Frontend:** React 18 + React Router v6
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Auth:** JWT + bcryptjs
- **Deploy:** Render (backend) + Vercel (frontend)

## Deploy Settings

### Render Backend
```
Root Directory:   backend
Build Command:    npm install
Start Command:    node src/db/migrate_all.js && node src/db/seed.js && node src/server.js
Health Check:     /api/health
```

### Vercel Frontend
```
Root Directory:   frontend
Install Command:  npm install --legacy-peer-deps
Build Command:    npm run build
Output Directory: build
Env: REACT_APP_API_URL = https://your-backend.onrender.com/api
```

## Demo Login
```
Mobile:   9876543210
Password: demo1234
```
