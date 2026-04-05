from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from config import settings
from routers import analysis, chessable, coaching, import_games, reports, tablebase

app = FastAPI(
    title="ChessLens Analysis Service",
    description="Stockfish engine analysis + AI coaching for chess games",
    version="0.1.0",
)

# CORS — configurable per environment
_allowed_origins = settings.cors_origins.split(",") if settings.cors_origins else ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-memory rate limiter (per-IP, 60 requests/minute)
_rate_limit: dict[str, list[float]] = {}
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 60


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    hits = _rate_limit.setdefault(client_ip, [])
    hits[:] = [t for t in hits if now - t < RATE_LIMIT_WINDOW]
    if len(hits) >= RATE_LIMIT_MAX:
        return JSONResponse(status_code=429, content={"detail": "Too many requests"})
    hits.append(now)
    return await call_next(request)

app.include_router(analysis.router, tags=["Analysis"])
app.include_router(coaching.router, prefix="/coaching", tags=["Coaching"])
app.include_router(import_games.router, prefix="/import", tags=["Import"])
app.include_router(chessable.router, prefix="/import", tags=["Chessable"])
app.include_router(reports.router, prefix="/reports", tags=["Reports"])
app.include_router(tablebase.router, tags=["Tablebase"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "chesslens-analysis"}
