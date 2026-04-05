from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import analysis, chessable, coaching, import_games, reports

app = FastAPI(
    title="ChessLens Analysis Service",
    description="Stockfish engine analysis + AI coaching for chess games",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router, tags=["Analysis"])
app.include_router(coaching.router, prefix="/coaching", tags=["Coaching"])
app.include_router(import_games.router, prefix="/import", tags=["Import"])
app.include_router(chessable.router, prefix="/import", tags=["Chessable"])
app.include_router(reports.router, prefix="/reports", tags=["Reports"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "chesslens-analysis"}
