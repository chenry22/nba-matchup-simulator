"""
Players router
Wraps nba_api to fetch and parse player stats into sim-ready profiles.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from .nba_service import NBAService
from .player_models import SimPlayerProfile

router = APIRouter()
nba = NBAService()

@router.get("/active")
async def get_active_player_ids():
    active =  nba.get_active_players()
    ids = []
    for p in active: ids.append(p['id'])
    return ids

@router.get("/search")
async def search_players(q: str = Query(..., min_length=2)):
    """
    Full-text search across player names.
    Returns lightweight list: id, name, teams, active seasons.
    Used to populate the lineup builder autocomplete.
    """
    return nba.search(q)


@router.get("/{player_id}/seasons")
async def get_player_seasons(player_id: int):
    """
    Returns the list of seasons a player has stats for.
    Used to populate the season-year picker in the lineup builder.
    """
    return nba.get_seasons_list(player_id)


@router.get("/{player_id}/profile/{season}")
async def get_sim_profile(player_id: int, season: str):
    """
    Returns a fully parsed SimPlayerProfile for a specific season.
    This is the core data contract the frontend simulation engine consumes.

    season format: "2022-23"
    """
    profile = nba.build_sim_profile(player_id, season)
    if not profile:
        raise HTTPException(404, "Player/season not found")
    return profile


@router.get("/{player_id}/salary/{season}")
async def get_salary(player_id: int, season: str):
    """
    Returns player salary for a given season (for salary-cap mode).
    TODO: Integrate with a salary dataset (Basketball Reference, Spotrac scrape,
          or a manually maintained JSON. nba_api does NOT expose salaries.)
    """
    # TODO: Load from static salary JSON / DB table keyed on player_id + season
    return {"player_id": player_id, "season": season, "salary": None}