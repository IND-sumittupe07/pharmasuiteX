# 🚀 MedTrack Deployment Guide

## Prerequisites
- GitHub account (free)
- Render.com account (free)
- Vercel account (free)

---

## Step 1 — Upload to GitHub

1. Go to github.com → New Repository → Name: `medtrack`
2. Download GitHub Desktop from desktop.github.com
3. Add your project folder → Commit → Push

---

## Step 2 — Deploy Database (Render PostgreSQL)

1. Go to render.com → New → PostgreSQL
2. Name: `medtrack-db` | Plan: Free
3. Click Create → Wait 2 minutes
4. Copy the **External Database URL** — save it!

---

## Step 3 — Deploy Backend (Render Web Service)

1. Render → New → Web Service → Connect GitHub → Select `medtrack`
2. Fill in:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
   - **Plan:** Free
3. Add Environment Variables:
   ```
   DATABASE_URL      = (paste from Step 2)
   JWT_SECRET        = (random string: abcdef123456... minimum 32 chars)
   NODE_ENV          = production
   FRONTEND_URL      = https://medtrack-app.vercel.app (update after Step 4)
   RAZORPAY_KEY_ID   = rzp_live_...
   RAZORPAY_KEY_SECRET = ...
   FAST2SMS_API_KEY  = ...
   INTERAKT_API_KEY  = ...
   ```
4. Click Deploy → Wait 3-5 minutes
5. Once live, run migrations:
   - Go to your Render service → Shell tab
   - Run: `node src/db/migrate.js`
   - Run: `node src/db/migrate_medicines.js`
   - Run: `node src/db/migrate_payments.js`
   - Run: `node src/db/seed.js` (optional demo data)
6. Test: Visit `https://your-app.onrender.com/api/health`

---

## Step 4 — Deploy Frontend (Vercel)

1. Go to vercel.com → New Project → Import from GitHub
2. Select `medtrack` repo
3. Fill in:
   - **Root Directory:** `frontend`
   - **Framework:** Create React App
4. Add Environment Variable:
   ```
   REACT_APP_API_URL = https://your-backend.onrender.com/api
   ```
5. Click Deploy → Wait 2 minutes
6. Copy your Vercel URL (e.g. https://medtrack-app.vercel.app)
7. Go back to Render → Update `FRONTEND_URL` with Vercel URL
8. Restart Render service

---

## Step 5 — Custom Domain (Optional)

1. Buy domain at godaddy.com or namecheap.com (~₹800/year)
2. Vercel → Your project → Settings → Domains → Add domain
3. Follow DNS instructions

---

## Step 6 — Set Up Payments (Razorpay)

1. Go to razorpay.com → Sign up → Complete KYC
2. Settings → API Keys → Generate Live Keys
3. Add to Render environment variables
4. Test with ₹1 payment before going live

---

## Step 7 — Set Up SMS (Fast2SMS)

1. Go to fast2sms.com → Sign up
2. Add ₹100 credits (minimum)
3. Dashboard → Dev API → Copy API Key
4. Add as FAST2SMS_API_KEY in Render
5. Settings → Messaging → Paste key → Save

---

## Post-Launch Checklist

- [ ] Test login/register with real mobile number
- [ ] Add 1 real customer, check all features
- [ ] Test campaign SMS delivery
- [ ] Test Razorpay payment with ₹1
- [ ] Check mobile browser (open on phone)
- [ ] Install as PWA on phone (Add to Home Screen)
- [ ] Set up daily database backup on Render
- [ ] Monitor Render logs for errors

---

## Monitoring & Backups

**Render Free Plan Limitations:**
- Service sleeps after 15 min of inactivity (first request takes 30 sec)
- 750 hours/month free (enough for 1 service)
- Upgrade to Starter ($7/month) to avoid sleep

**Database Backup:**
- Render free PostgreSQL: manual backup only
- Render paid: automatic daily backups
- Manual backup command:
  `pg_dump DATABASE_URL > backup_$(date +%Y%m%d).sql`

---

## Support
Email: support@medtrack.in
WhatsApp: +91 98765 43210
