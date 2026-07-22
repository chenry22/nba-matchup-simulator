"""
SimPlayerProfile — the canonical data contract between backend and frontend.
Any changes here must be mirrored in frontend/src/lib/types.ts.
"""

from pydantic import BaseModel
from typing import Optional


class ZoneStat(BaseModel):
    fg_pct: float
    freq: float   # % of this player's FGAs from this zone
    efg: float


class ScoringProfile(BaseModel):
    pts_per_game: float
    ts_pct: float
    efg_pct: float
    ft_pct: float
    ft_rate: float   # FTA/FGA
    zones: dict[str, ZoneStat]


class PlaymakingProfile(BaseModel):
    ast_pct: float
    potential_ast: float
    ast_to_ratio: float
    secondary_ast: float


class ReboundingProfile(BaseModel):
    orb_pct: float
    drb_pct: float
    contested_reb_pct: float
    putback_rate: float


class DefenseProfile(BaseModel):
    stl_pct: float
    blk_pct: float
    dfg_pct_at_rim: float
    contest_rate: float
    on_ball_def_rating: float


class SimPlayerProfile(BaseModel):
    id: int
    season: str
    gp: int
    
    name: str
    position: str
    mpg: float
    salary: Optional[int]

    scoring: ScoringProfile
    playmaking: PlaymakingProfile
    rebounding: ReboundingProfile
    defense: DefenseProfile