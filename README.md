# Saville Tennis Ranking (STR)

A local club tennis ranking web app inspired by [UTR](https://www.utrsports.net/pages/how-utr-works). Players record match results and track STR ratings on a 1.00–16.50 scale.

## Features

- **Player registration** — add club members with optional starting STR
- **Match recording** — enter set-by-set game scores
- **UTR-style STR algorithm** — ratings based on game-win % vs expectation, not just W/L
- **Leaderboard** — ranked list with projected (P) vs reliable ratings
- **Player profiles** — match history and rating trend chart

## How STR Works

1. For each match, the system computes a **match rating** from the rating gap and actual % of games won.
2. Your **STR** is the weighted average of up to your **30 most recent matches** within **12 months**.
3. Match weights consider format length, competitiveness, opponent reliability, and recency.
4. Ratings show **(P)** until you have **5+ matches** — then they become reliable.

## Quick Start

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Deploy online ($0/month)

See **[DEPLOY.md](DEPLOY.md)** for step-by-step instructions to deploy on:

- **Neon** — free Postgres (data persists)
- **Render** — free FastAPI backend
- **Cloudflare Pages** — free React frontend

## Project Structure

```
saville_tennis_ranking/
├── backend/
│   ├── app/
│   │   ├── main.py       # REST API
│   │   ├── models.py     # SQLite models
│   │   ├── rating.py     # STR algorithm
│   │   ├── services.py   # Rating computation
│   │   └── schemas.py    # Pydantic schemas
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/        # Dashboard, Rankings, Record Match, Players
        └── api.js        # API client
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/players` | List all players with STR |
| POST | `/api/players` | Register a player |
| GET | `/api/players/{id}` | Player detail + history |
| GET | `/api/leaderboard` | Ranked players |
| GET | `/api/matches` | Recent matches |
| POST | `/api/matches` | Record a match |

## Match Formats

- `single_set` — one set
- `pro_set` — 8-game pro set
- `best_of_3` — standard club match (default)
- `best_of_5` — longer format, higher weight

## License

MIT — use freely for your local club.
