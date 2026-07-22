"""
Lineups router
Saved lineups + challenge system.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from routers.auth import oauth2_scheme

router = APIRouter()


class LineupSlot(BaseModel):
    player_id: int
    season: str       # e.g. "2022-23"
    position: str     # lineup slot label: PG/SG/SF/PF/C


class SaveLineupRequest(BaseModel):
    name: str
    mode: str              # "1v1" | "2v2" | "3v3" | "4v4" | "5v5"
    cap_mode: bool         # True = salary cap enforced
    slots: list[LineupSlot]
    is_public: bool = True # public lineups can be challenged by others


class ChallengeRequest(BaseModel):
    lineup_id: str
    challenger_slots: list[LineupSlot]


@router.get("/public")
async def list_public_lineups(mode: Optional[str] = None, skip: int = 0, limit: int = 20):
    """
    Browse public lineups. Used on the Challenge Hub page.
    TODO: Query DB with optional mode filter, paginate.
    """
    return []


@router.post("/save")
async def save_lineup(body: SaveLineupRequest, token: str = Depends(oauth2_scheme)):
    """
    Save a named lineup to the authenticated user's collection.
    TODO:
      1. Validate cap compliance if body.cap_mode == True
         (sum salaries from /players/{id}/salary/{season} for each slot)
      2. Persist to DB
      3. Return lineup_id
    """
    raise HTTPException(501, "Not implemented")


@router.get("/mine")
async def my_lineups(token: str = Depends(oauth2_scheme)):
    """
    Returns all lineups owned by the current user.
    TODO: Fetch from DB filtered by user_id from JWT.
    """
    return []


@router.post("/challenge")
async def challenge_lineup(body: ChallengeRequest, token: str = Depends(oauth2_scheme)):
    """
    Prepares a simulation by resolving both lineups' full SimPlayerProfiles.
    Returns { home_profiles: [...], away_profiles: [...] } for the frontend
    sim engine to consume. The actual simulation runs 100% on the client.

    TODO:
      1. Fetch target lineup from DB by lineup_id
      2. Validate challenger_slots length matches target
      3. Fetch SimPlayerProfile for each slot via NBAService
      4. Return both sets of profiles
    """
    raise HTTPException(501, "Not implemented")


@router.get("/salary-check")
async def check_salary(slots: list[LineupSlot], cap: int = 136000000):
    """
    Validate a proposed lineup against the salary cap.
    Returns { total, cap, valid, overage }.
    TODO: Sum salaries from DB/JSON salary table.
    CAP default is approximate 2024-25 NBA cap figure.
    """
    return {"total": 0, "cap": cap, "valid": True, "overage": 0}