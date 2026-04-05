<div align="center">
  <h1>♟️ ChessLens</h1>
  <p><strong>The open-source chess analysis platform that rivals the best — free forever.</strong></p>
  <p>
    AI-powered game review · Stockfish 18 engine · Opening explorer · Repertoire builder · Chessable import · Auto-sync from Lichess &amp; Chess.com · Weekly coaching reports
  </p>
  <p>
    <a href="https://chesslens-web.azurewebsites.net">Live Demo</a> ·
    <a href="#-quick-start">Quick Start</a> ·
    <a href="#-features">Features</a> ·
    <a href="#-deploy-to-azure">Deploy to Azure</a> ·
    <a href="#-contributing">Contributing</a>
  </p>
  <br/>
  <p>
    <img alt="License" src="https://img.shields.io/badge/license-AGPL--3.0-blue?style=flat-square"/>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js"/>
    <img alt="Python" src="https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white"/>
    <img alt="Stockfish" src="https://img.shields.io/badge/Stockfish-18-green?style=flat-square"/>
    <img alt="Azure" src="https://img.shields.io/badge/Azure-Deployed-0078D4?style=flat-square&logo=microsoft-azure&logoColor=white"/>
  </p>
</div>

---

## Why ChessLens?

| | ChessLens | Lichess | Chess.com |
|---|:---:|:---:|:---:|
| **Free engine analysis** | ✅ Unlimited depth 22+ | ✅ Limited depth | ❌ Paywall (depth 20+) |
| **AI coaching review** | ✅ Azure AI per-game | ❌ None | ❌ $99/yr Game Review |
| **Opening explorer** | ✅ Lichess + Masters DB | ✅ | ❌ Paywall |
| **Repertoire builder** | ✅ + Chessable import | ❌ Basic studies | ❌ Paywall |
| **Chessable import** | ✅ Full variation trees | ❌ | ❌ |
| **Auto-import games** | ✅ Lichess + Chess.com | — | — |
| **Weekly AI reports** | ✅ Personalized coaching | ❌ | ❌ Paywall |
| **Self-hostable** | ✅ Docker + Azure | ✅ | ❌ |
| **Open source** | ✅ AGPL-3.0 | ✅ AGPL-3.0 | ❌ |
| **Your data, your control** | ✅ | ✅ | ❌ |

---

## ✨ Features

### 🔬 Deep Engine Analysis
Every game analyzed with **Stockfish 18** at adjustable depth (default 22). Each move is classified:

| Symbol | Classification | Centipawn Loss |
|--------|---------------|----------------|
| 🟦 | Brilliant | Player finds best sacrifice |
| 🟢 | Great | Best or near-best move |
| 🟩 | Good | < 50cp loss |
| 🟡 | Inaccuracy | 50–100cp loss |
| 🟠 | Mistake | 100–200cp loss |
| 🔴 | Blunder | > 200cp loss |

Features include:
- **Eval bar** — Visual evaluation from White's perspective with smooth animation
- **Best move arrows** — SVG arrows showing engine recommendations via Chessground
- **Principal variation** — See the engine's best line at each position
- **Accuracy percentage** — Per-player accuracy calculated from centipawn loss
- **Move-by-move navigation** — Keyboard shortcuts: ← → Home End F(lip)

### 🧠 AI-Powered Coaching
Powered by **Azure OpenAI** (gpt-4o-mini / o3-mini), each game review includes:

- **Opening assessment** — How well you followed theory and where you deviated
- **Middlegame themes** — Tactical patterns, strategic concepts, and key decisions
- **Endgame technique** — Assessment of endgame play when applicable
- **Key mistakes explained** — Natural language explanation of each blunder/mistake with the concept behind the better move
- **Study recommendations** — Personalized topics to study based on your mistake patterns
- **"Why was this a mistake?"** — Click any flagged move to get an AI explanation

### 📖 Opening Repertoire Builder
Build, maintain, and train your opening preparation:

- **Interactive move tree editor** — Click or drag moves on the board to build variations
- **Variation branching** — Multiple responses at each position with visual tree
- **Text annotations** — Add notes and comments to any position
- **ECO auto-classification** — Automatic opening name and code detection
- **Import from games** — Add opening lines directly from your analyzed games
- **Training mode** — Quiz yourself: position shown, play the correct move
- **Chessable import** — Full variation trees, annotations, and NAG symbols preserved

### 🎓 Chessable Course Import
Import your entire Chessable course library:

1. In Chessable: Course → ⋯ → Export → PGN
2. In ChessLens: Import → Chessable Import → Drop your PGN file
3. All variations, comments, and move evaluations are preserved
4. Lines are auto-detected as White or Black repertoire
5. Merge into existing repertoires or create new ones
6. Chapter names and ECO codes are preserved

### 🌍 Opening Explorer
Explore opening theory backed by millions of real games:

- **Lichess database** — Filter by rating range (1000–2500+)
- **Masters database** — Over-the-board master games
- **Move statistics** — Games played, win/draw/loss percentages per move
- **Win rate bars** — Visual result distribution for each continuation
- **Interactive board** — Make moves to explore deeper, click any move in the table
- **Position summary** — Aggregate statistics for the current position

### 🔄 Automatic Game Import
Your games, automatically synced:

- **Lichess** — OAuth2 sign-in, streams all your rated games via ND-JSON API
- **Chess.com** — Public API, enter username, imports last 3 months of archives
- **Deduplication** — Never imports the same game twice
- **Background sync** — Celery beat auto-imports every 6 hours
- **PGN upload** — Manual import of multi-game PGN files (up to 10MB)
- **FEN import** — Load any position for analysis

### 📊 Weekly Progress Reports
Track your improvement over time:

- **Games played** — Win/Loss/Draw breakdown
- **Accuracy trends** — How your accuracy is changing week to week
- **Rating changes** — Track Lichess and Chess.com rating movements
- **Common openings** — Your most played openings with win rates
- **Recurring mistakes** — Patterns the AI identifies across multiple games
- **AI coaching summary** — Personalized weekly coaching paragraph
- **Charts and graphs** — Visual progress tracking with Recharts

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────┐
│           Next.js 14 Frontend            │
│  React 18 · Chessground · chess.js       │
│  TailwindCSS · shadcn/ui · Zustand       │
│  NextAuth (Lichess OAuth2 PKCE)          │
└─────────────────┬────────────────────────┘
                  │ REST API
┌─────────────────▼────────────────────────┐
│         Next.js API Routes               │
│  Game CRUD · Import · Auth · Repertoire  │
│  Prisma ORM → PostgreSQL                 │
└──────┬──────────────────────┬────────────┘
       │                      │ HTTP
       │         ┌────────────▼───────────┐
       │         │  Python FastAPI         │
       │         │  Stockfish 18 (UCI)     │
       │         │  Azure OpenAI           │
       │         │  Lichess/Chess.com APIs │
       │         │  Chessable PGN parser   │
       │         └────────────┬───────────┘
       │                      │
       │         ┌────────────▼───────────┐
       │         │  Celery + Redis         │
       │         │  Async analysis jobs    │
       │         │  Auto-import scheduler  │
       │         │  Weekly report gen      │
       │         └────────────────────────┘
       │
┌──────▼──────────────────────────────────┐
│            PostgreSQL 16                 │
│  Users · Games · Analysis · Repertoire  │
│  Weekly Reports · Auth Sessions          │
└──────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14, React 18, TypeScript | Server & client rendering |
| **Board UI** | [@lichess-org/chessground](https://github.com/lichess-org/chessground) v10 | Board rendering, drag & drop, arrows |
| **Game Logic** | [chess.js](https://github.com/jhlywa/chess.js) v1.4 | PGN/FEN parsing, move validation |
| **Styling** | TailwindCSS 3.4, shadcn/ui palette | Responsive dark-mode UI |
| **State** | Zustand 5 | Client-side game navigation |
| **Auth** | NextAuth.js 4 | Lichess OAuth2 PKCE flow |
| **ORM** | Prisma 6 | Type-safe database queries |
| **Backend** | Python 3.12, FastAPI | Async analysis microservice |
| **Engine** | Stockfish 18 via [python-chess](https://python-chess.readthedocs.io/) | UCI protocol, deep analysis |
| **AI** | Azure OpenAI (gpt-4o-mini) | Game reviews, coaching, reports |
| **Task Queue** | Celery 5 + Redis 7 | Background processing |
| **Database** | PostgreSQL 16 | Persistent storage with JSONB |
| **Explorer** | Lichess Explorer API | Opening move statistics |
| **Containers** | Docker Compose | Local development |
| **Cloud** | Azure App Service + Bicep | Production deployment |
| **CI/CD** | GitHub Actions | Automated testing & deployment |

---

## 🚀 Quick Start

### Option 1: Use the hosted version

Visit **[chesslens-web.azurewebsites.net](https://chesslens-web.azurewebsites.net)** — no installation needed.

### Option 2: Run locally with Docker

```bash
# Clone
git clone https://github.com/chesslens/chesslens.git
cd chesslens

# Configure
cp .env.example .env
# Edit .env — only AZURE_OPENAI_API_KEY is needed for AI features
# Stockfish analysis works without any API keys!

# Start everything
docker compose up -d

# Run database migrations
cd apps/web && npx prisma migrate dev

# Open http://localhost:3000
```

### Option 3: Run locally without Docker

```bash
# Prerequisites: Node.js 20+, Python 3.12+, PostgreSQL, Redis, Stockfish

# Frontend
cd apps/web
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# Analysis service (new terminal)
cd apps/analysis
pip install -e ".[dev]"
uvicorn main:app --reload --port 8000

# Celery worker (new terminal)
cd apps/analysis
celery -A tasks.celery_app worker --loglevel=info

# Celery scheduler (new terminal)
cd apps/analysis
celery -A tasks.celery_app beat --loglevel=info
```

---

## ☁️ Deploy to Azure

ChessLens includes full Azure infrastructure-as-code for one-command deployment.

### What gets deployed

| Resource | SKU | Purpose | Est. Cost/mo |
|----------|-----|---------|-------------|
| Azure OpenAI | S0 | AI coaching (gpt-4o-mini) | ~$5–20 |
| PostgreSQL Flexible | B1ms | Game & user storage | ~$13 |
| Azure Cache for Redis | Basic C0 | Task queue, caching | ~$16 |
| App Service Plan | B2 | Hosts web + API apps | ~$55 |
| App Service (web) | — | Next.js frontend | Included |
| App Service (api) | — | FastAPI + Stockfish | Included |
| **Total** | | | **~$89–104/mo** |

### Deploy with Azure Developer CLI

```bash
# Install azd
curl -fsSL https://aka.ms/install-azd.sh | bash

# Login and deploy
azd auth login
azd up
```

### Deploy with Azure CLI + Bicep

```bash
# Create resource group
az group create --name rg-chesslens --location eastus2

# Deploy all infrastructure
az deployment group create \
  --resource-group rg-chesslens \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam
```

---

## 📁 Project Structure

```
chesslens/
├── apps/
│   ├── web/                          # Next.js 14 frontend
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages & API routes
│   │   │   │   ├── api/              # 13 API route handlers
│   │   │   │   ├── games/            # Game library + viewer
│   │   │   │   ├── import/           # PGN/FEN/Lichess/Chess.com/Chessable
│   │   │   │   ├── explorer/         # Opening explorer
│   │   │   │   ├── repertoire/       # Repertoire list + editor
│   │   │   │   └── reports/          # Weekly dashboard
│   │   │   ├── components/           # Board, EvalBar, MoveList, AIReview
│   │   │   ├── stores/               # Zustand state management
│   │   │   └── lib/                  # Database + utilities
│   │   └── prisma/schema.prisma      # 9-table schema
│   │
│   └── analysis/                     # Python FastAPI service
│       ├── routers/                  # API endpoints (5 routers)
│       ├── services/                 # Stockfish, AI, Lichess, Chess.com, Chessable
│       ├── tasks/                    # Celery (analysis, import, reports)
│       └── models/                   # Pydantic schemas
│
├── packages/shared/                  # Shared TypeScript types
├── infra/                            # Azure Bicep templates
├── .github/workflows/ci.yml          # CI/CD pipeline
├── docker-compose.yml                # Local dev environment
├── Dockerfile.web                    # Next.js container
├── Dockerfile.analysis               # Python + Stockfish container
└── azure.yaml                        # azd deployment config
```

---

## 🗄️ Database Schema

9 tables managed by Prisma:

- **User** — id, lichessId, chesscomUser, linked accounts
- **Account / Session / VerificationToken** — NextAuth tables
- **Game** — PGN, source, players, ELO, opening, time control, result
- **GameAnalysis** — Per-move evals (JSONB), accuracy, move stats, AI review
- **Repertoire** — Name, color, move tree (JSONB), notes
- **RepertoirePosition** — FEN, move, annotation, engine eval
- **WeeklyReport** — Stats, openings, mistakes, AI summary

---

## ⚙️ Configuration

All via environment variables — see [`.env.example`](.env.example).

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection |
| `REDIS_URL` | ✅ | Redis connection |
| `NEXTAUTH_SECRET` | ✅ | Session encryption |
| `AZURE_OPENAI_API_KEY` | For AI | AI coaching features |
| `AZURE_OPENAI_ENDPOINT` | For AI | Azure OpenAI endpoint |
| `LICHESS_CLIENT_ID` | For OAuth | Lichess sign-in |
| `STOCKFISH_PATH` | Auto in Docker | Engine binary path |

> **Note:** Stockfish analysis works without any API keys. AI coaching requires Azure OpenAI.

---

## 🔌 API Documentation

Interactive docs available when the analysis service is running:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/analyze` | Queue Stockfish analysis |
| `GET` | `/analyze/{id}/status` | Check analysis progress |
| `POST` | `/coaching/review` | Generate AI game review |
| `POST` | `/import/lichess` | Import from Lichess |
| `POST` | `/import/chesscom` | Import from Chess.com |
| `POST` | `/import/chessable/parse` | Parse Chessable PGN |
| `POST` | `/import/chessable/merge` | Merge into repertoire |
| `POST` | `/reports/generate` | Generate weekly report |
| `GET` | `/health` | Health check |

---

## 🗺️ Roadmap

### v0.2
- [ ] In-browser Stockfish WASM (no server needed for quick analysis)
- [ ] Board themes and piece set customization
- [ ] Puzzle trainer from your own blunders
- [ ] Game annotation editor
- [ ] Shareable analysis links

### v0.3
- [ ] Desktop app (Electron with local Stockfish)
- [ ] Endgame tablebase integration (Syzygy)
- [ ] Tournament prep mode (prep against specific opponents)
- [ ] Spaced repetition for repertoire training

### v1.0
- [ ] Live game analysis (connect to Lichess/Chess.com in real-time)
- [ ] Team/club features with shared analysis
- [ ] Pattern recognition AI
- [ ] Multi-language support (i18n)

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

```bash
git checkout -b feature/my-feature
# Make changes
cd apps/web && npx tsc --noEmit      # Typecheck
cd apps/analysis && ruff check .       # Lint
# Submit PR
```

---

## 📄 License

[GNU Affero General Public License v3.0](LICENSE) — same as [Lichess](https://github.com/lichess-org/lila).

---

## 🙏 Acknowledgements

**[Lichess](https://lichess.org)** · **[Stockfish](https://stockfishchess.org)** · **[python-chess](https://python-chess.readthedocs.io/)** · **[chess.js](https://github.com/jhlywa/chess.js)** · **[Chess.com](https://www.chess.com)** · **[Chessable](https://www.chessable.com)** · **[Azure](https://azure.microsoft.com)**

---

<div align="center">
  <strong>Built with ♟️ by the chess community, for the chess community.</strong>
  <br/>
  If ChessLens helps your chess, give it a ⭐ on GitHub!
</div>
