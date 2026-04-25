# 💊 MedTrack — Pharmacy SaaS Platform

Full-stack, production-ready pharmacy management system for Indian medical stores.

---

## 🗂️ Project Structure

```
medtrack/
├── backend/                  ← Node.js + Express API
│   ├── src/
│   │   ├── server.js         ← Entry point
│   │   ├── db/
│   │   │   ├── db.js         ← PostgreSQL pool
│   │   │   ├── migrate.js    ← Create all tables
│   │   │   └── seed.js       ← Demo data
│   │   ├── middleware/
│   │   │   └── auth.js       ← JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.js       ← Login / Register
│   │   │   ├── customers.js  ← Customer CRUD
│   │   │   ├── medicines.js  ← Medicine stats
│   │   │   ├── reminders.js  ← Refill reminders + SMS
│   │   │   ├── campaigns.js  ← Marketing campaigns
│   │   │   ├── analytics.js  ← Dashboard KPIs
│   │   │   └── export.js     ← CSV exports
│   │   └── services/
│   │       ├── messagingService.js  ← Twilio SMS/WhatsApp
│   │       └── reminderService.js   ← Daily cron job
│   ├── .env.example
│   ├── render.yaml           ← Render.com deploy config
│   └── package.json
│
├── frontend/                 ← React.js app
│   ├── src/
│   │   ├── index.js          ← App entry + routing
│   │   ├── index.css         ← Global styles
│   │   ├── api/client.js     ← Axios with JWT
│   │   ├── context/AuthContext.js
│   │   └── pages/
│   │       ├── LoginPage.js
│   │       ├── RegisterPage.js
│   │       ├── Dashboard.js
│   │       ├── DashboardHome.js
│   │       ├── CustomersPage.js
│   │       ├── RemindersPage.js
│   │       ├── AnalyticsPage.js
│   │       ├── CampaignsPage.js
│   │       └── ExportPage.js
│   ├── vercel.json
│   └── package.json
│
└── package.json              ← Root scripts to run both
```

---

## ⚡ Local Setup (VS Code)

### Prerequisites
- Node.js 18+  →  https://nodejs.org
- PostgreSQL 14+  →  https://postgresql.org
- Git

### Step 1 — Clone / Open in VS Code
```bash
cd medtrack
code .
```

### Step 2 — Install Dependencies
```bash
npm install          # root devDependencies (concurrently)
npm run install:all  # installs backend + frontend
```

### Step 3 — PostgreSQL Setup
```bash
# Open psql
psql -U postgres

# Create database
CREATE DATABASE medtrack;
\q
```

### Step 4 — Backend .env
```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/medtrack
JWT_SECRET=any_random_32_char_string_here_change_this
```

> Leave Twilio keys blank for now — messaging will be skipped gracefully.

### Step 5 — Run Database Migration + Seed
```bash
npm run setup
# This creates all tables and loads demo data
# Login: 9876543210 / demo1234
```

### Step 6 — Start Dev Servers
```bash
# From root folder — starts BOTH backend + frontend
npm run dev

# Or start separately:
npm run start:backend   # API on http://localhost:5000
npm run start:frontend  # React on http://localhost:3000
```

### Step 7 — Open Browser
```
http://localhost:3000
Login: 9876543210 / demo1234
```

---

## 📡 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register new pharmacy |
| POST | /api/auth/login | Login → returns JWT |
| GET | /api/auth/me | Current user info |
| GET | /api/customers | List customers (search, filter) |
| POST | /api/customers | Create customer |
| GET | /api/customers/:id | Customer + medicines + purchases |
| PUT | /api/customers/:id | Update customer |
| POST | /api/customers/:id/medicines | Add medicine prescription |
| POST | /api/customers/:id/purchases | Log purchase |
| GET | /api/reminders?days=7 | Refill reminders due in N days |
| POST | /api/reminders/send | Send SMS/WhatsApp to one customer |
| POST | /api/reminders/send-bulk | Send to all due customers |
| GET | /api/campaigns | List campaigns |
| POST | /api/campaigns | Create campaign |
| POST | /api/campaigns/:id/launch | Launch → send messages |
| GET | /api/analytics/dashboard | All KPIs in one call |
| GET | /api/analytics/revenue | Monthly revenue trend |
| GET | /api/export/customers | Download customers CSV |
| GET | /api/export/medicines | Download medicines CSV |
| GET | /api/export/refills | Download refill queue CSV |
| GET | /api/export/campaigns | Download campaigns CSV |
| GET | /api/export/purchases | Download purchases CSV |

All routes except `/api/auth/*` require `Authorization: Bearer <token>` header.

---

## 🌐 Production Deployment

### Option A — Free Tier (Recommended for testing)

**Backend → Render.com (Free)**
1. Push `backend/` to GitHub
2. Go to https://render.com → New Web Service
3. Connect your GitHub repo
4. Use `render.yaml` config (already included)
5. Add env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
6. Deploy → get URL like `https://medtrack-api.onrender.com`

**Frontend → Vercel (Free)**
1. Push `frontend/` to GitHub
2. Go to https://vercel.com → New Project
3. Set env var: `REACT_APP_API_URL=https://medtrack-api.onrender.com/api`
4. Deploy → get URL like `https://medtrack.vercel.app`

**Database → Render PostgreSQL (Free)**
- Already configured in `render.yaml`
- After deploy, run: `node src/db/migrate.js` then `node src/db/seed.js`

---

### Option B — Production Scale (Paid)

| Service | Use |
|---------|-----|
| AWS EC2 / Railway | Backend API hosting |
| AWS RDS / Supabase | PostgreSQL database |
| Vercel / Netlify | Frontend hosting |
| Twilio | SMS + WhatsApp |
| Razorpay | Subscription billing |
| Cloudflare | CDN + DDoS protection |

---

## 📲 Twilio Setup (SMS + WhatsApp)

1. Sign up at https://twilio.com
2. Get Account SID + Auth Token from Console
3. Buy an Indian SMS-capable number (~$1/month)
4. For WhatsApp: Join Sandbox → https://console.twilio.com/whatsapp/sandbox
5. Add to backend `.env`:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

---

## 🔐 Security Features

- ✅ JWT authentication (7 day tokens)
- ✅ Bcrypt password hashing (12 rounds)
- ✅ Helmet.js HTTP security headers
- ✅ CORS restricted to frontend URL
- ✅ Rate limiting (200 req / 15 min)
- ✅ Multi-tenant data isolation (pharmacy_id on all tables)
- ✅ Role-based access (owner / staff)
- ✅ SSL for production DB connections

---

## ⏰ Automatic Reminders

The backend runs a cron job every day at **9:00 AM IST**:
- Finds all premium pharmacy customers with refills due in 5 days
- Sends SMS automatically via Twilio
- Logs everything in `reminder_logs` table

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + React Router v6 |
| Styling | Tailwind CSS + Custom CSS |
| HTTP Client | Axios |
| Backend | Node.js + Express |
| Database | PostgreSQL 14 |
| Auth | JWT + bcryptjs |
| Messaging | Twilio (SMS + WhatsApp) |
| Scheduler | node-cron |
| Security | Helmet + cors + rate-limit |
| Deploy (API) | Render.com |
| Deploy (Web) | Vercel |

---

## 🧾 Demo Login

```
Mobile:   9876543210
Password: demo1234
Role:     Owner

Staff login:
Mobile:   9800000001
Password: staff1234
```

---

## 📦 Future Enhancements

- [ ] Razorpay subscription billing
- [ ] PDF invoice generation
- [ ] AI refill prediction
- [ ] Mobile app (React Native)
- [ ] WhatsApp Business API (non-sandbox)
- [ ] Multi-branch support
- [ ] Stock inventory management
