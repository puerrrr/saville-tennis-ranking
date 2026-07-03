# Deploy STR for $0/month

Host Saville Tennis Ranking online using:

| Service | Role | Cost |
|---------|------|------|
| [Neon](https://neon.tech) | Postgres database (persistent) | $0 |
| [Render](https://render.com) | FastAPI backend | $0 (sleeps when idle) |
| [Cloudflare Pages](https://pages.cloudflare.com) | React frontend | $0 |

**Tradeoff:** The Render backend sleeps after ~15 minutes with no traffic. The first visit after that can take 30–60 seconds. Data in Neon is permanent.

---

## 1. Push code to GitHub

```powershell
cd c:\Users\pengy\projects\saville_tennis_ranking
git init
git add .
git commit -m "Saville Tennis Ranking app"
```

Create a new repo on GitHub, then:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/saville-tennis-ranking.git
git branch -M main
git push -u origin main
```

---

## 2. Create free Postgres on Neon

1. Sign up at [neon.tech](https://neon.tech) (no credit card).
2. **New Project** → name it `str-saville`.
3. Copy the **connection string** (use the pooled connection if offered).
   - It looks like: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
4. Keep this tab open — you'll paste it into Render next.

---

## 3. Deploy backend on Render (free)

1. Sign up at [render.com](https://render.com) (no credit card).
2. **New → Blueprint** → connect your GitHub repo.
3. Render detects `render.yaml` and creates the `str-api` web service.
4. When prompted, set environment variables:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Your Neon connection string |
   | `ALLOWED_ORIGINS` | Leave blank for now — update after step 4 |

5. Deploy. When finished, note your API URL, e.g. `https://str-api.onrender.com`.
6. Test: open `https://str-api.onrender.com/api/health` — should show `{"status":"ok",...}`.

**Manual setup** (if not using Blueprint):

- **New → Web Service** → connect repo
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Instance Type:** Free
- Add `DATABASE_URL` and `ALLOWED_ORIGINS` env vars as above

---

## 4. Deploy frontend on Cloudflare Pages (free)

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com).
2. **Workers & Pages → Create → Pages → Connect to Git**.
3. Select your GitHub repo.
4. Build settings:

   | Setting | Value |
   |---------|-------|
   | **Framework preset** | None (or Vite) |
   | **Root directory** | `frontend` |
   | **Build command** | `npm run build` |
   | **Build output directory** | `dist` |

5. **Environment variables** (Production):

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://str-api.onrender.com/api` |

   Replace with your actual Render URL from step 3.

6. **Save and Deploy**.
7. Note your Pages URL, e.g. `https://saville-tennis-ranking.pages.dev`.

---

## 5. Connect frontend ↔ backend (CORS)

Go back to **Render → str-api → Environment**:

Update `ALLOWED_ORIGINS` to your Cloudflare Pages URL:

```
https://saville-tennis-ranking.pages.dev
```

If you add a custom domain later, comma-separate them:

```
https://saville-tennis-ranking.pages.dev,https://str.yourclub.com
```

Save — Render redeploys automatically.

---

## 6. Share with your club

Send members your Cloudflare Pages URL. They can:

1. **Players** → register themselves
2. **Record Match** → enter scores after each hit
3. **Rankings** → see the live ladder

---

## Custom domain (optional, still free)

**Cloudflare Pages:** Pages project → **Custom domains** → add `str.yourclub.com`.

**Render:** Not needed if frontend talks directly to `str-api.onrender.com` via `VITE_API_URL`.

Remember to add the custom domain to `ALLOWED_ORIGINS` on Render.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **"Failed to fetch" / cannot reach API** | Backend not deployed on Render, or wrong URL in `frontend/public/config.js` |
| Site loads but no data | Check `config.js` or `VITE_API_URL` — must end with `/api` |
| CORS error in browser console | Add your Pages URL to `ALLOWED_ORIGINS` on Render |
| First load very slow | Normal on Render free tier — backend was sleeping |
| Database connection failed | Use Neon **pooled** connection string; ensure `?sslmode=require` |
| 404 on `/players/1` refresh | `_redirects` in `frontend/public/` handles SPA routing |

### Verify the backend is live

Open this in your browser (replace with your Render URL):

```
https://str-api.onrender.com/api/health
```

You should see: `{"status":"ok","system":"Saville Tennis Ranking"}`

If you see **Not Found** or a timeout, the Render backend is not deployed yet — complete step 3 below.

---

## Upgrading later (~$13/month)

When cold starts become annoying:

- Render web service: **Free → Starter ($7/mo)**
- Neon: stay on free, or Render Postgres **Basic ($6/mo)**

See [Render pricing](https://render.com/pricing).

---

## Local development (unchanged)

```powershell
# Terminal 1 — backend (SQLite by default)
cd backend
.venv\Scripts\uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` to the backend.

To test against Neon locally, create `backend/.env`:

```
DATABASE_URL=postgresql://...
ALLOWED_ORIGINS=http://localhost:5173
```
