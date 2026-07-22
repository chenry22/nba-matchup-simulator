"""
Backend — FastAPI
Entry point. Mounts all routers and configures middleware.

Run with:  
    uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import players, lineups

app = FastAPI(title="NBA Matchup Simulator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", 
        "https://nba-matchup-simulator-backend-jfm8d66bx-chenry22s-projects.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(players.router,  prefix="/players", tags=["players"])
app.include_router(lineups.router,  prefix="/lineups", tags=["lineups"])

@app.get("/health")
def health():
    return {"status": "ok"}