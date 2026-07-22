"""
Lineups router
Saved lineups + challenge system.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

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

@router.get("/salary-check")
async def check_salary(slots: list[LineupSlot], cap: int = 136000000):
    """
    Validate a proposed lineup against the salary cap.
    Returns { total, cap, valid, overage }.
    TODO: Sum salaries from DB/JSON salary table.
    CAP default is approximate 2024-25 NBA cap figure.
    """
    return {"total": 0, "cap": cap, "valid": True, "overage": 0}