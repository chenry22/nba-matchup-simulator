"""
NBAService
Wraps nba_api calls and parses raw stat tables into SimPlayerProfile dicts.
"""

import time
from typing import Optional

from nba_api.stats.static import players, teams
from nba_api.stats.endpoints import (
    playergamelog,
    commonplayerinfo,
    playercareerstats,
    playerdashboardbygeneralsplits,
    playerdashboardbyshootingsplits,
    playerdashboardbyclutch,
    playerdashptreb,
    playerdashptshotdefend,
)

from nba_api.stats.library.http import NBAStatsHTTP

NBAStatsHTTP().headers = {
    "Host": "stats.nba.com",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nba.com/",
    "Origin": "https://www.nba.com",
}

DELAY_TIME = 1

PACE_DICT = { "1946-47": 93.7, "1947-48": 91.9, "1948-49": 84.1, "1949-50": 93.1,
    "1950-51": 91.3, "1951-52": 88.3, "1952-53": 90.7, "1953-54": 93.1, "1954-55": 92.9,
    "1955-56": 92.4, "1956-57": 96.8, "1957-58": 98.8, "1958-59": 103.1, "1959-60": 115.3,
    "1960-61": 121.1, "1961-62": 131.1, "1962-63": 126.2, "1963-64": 124.9, "1964-65": 121.6,
    "1965-66": 118.6, "1966-67": 117.4, "1967-68": 115.0, "1968-69": 112.5, "1969-70": 116.7, 
    "1970-71": 112.4, "1971-72": 115.0, "1972-73": 112.8, "1973-74": 107.8, "1974-75": 105.8,
    "1975-76": 105.5, "1976-77": 106.5, "1977-78": 107.7, "1978-79": 108.1, "1979-80": 103.1,
    "1980-81": 101.8, "1981-82": 100.9, "1982-83": 101.8, "1983-84": 102.1, "1984-85": 102.1,
    "1985-86": 102.1, "1986-87": 100.8, "1987-88": 99.6, "1988-89": 100.6, "1989-90": 98.3,
    "1990-91": 97.8, "1991-92": 96.6, "1992-93": 96.8, "1993-94": 95.1, "1994-95": 92.9, 
    "1995-96": 91.8,  "1996-97": 90.1, "1997-98": 90.3, "1998-99": 88.9, "1999-00": 93.1,
    "2000-01": 91.3, "2001-02": 90.7, "2002-03": 91.0, "2003-04": 90.1, "2004-05": 90.9,
    "2005-06": 90.5, "2006-07": 91.9, "2007-08": 92.4, "2008-09": 91.7, "2009-10": 92.7,
    "2010-11": 92.1, "2011-12": 91.3, "2012-13": 92.0, "2013-14": 93.9, "2014-15": 93.9, 
    "2015-16": 95.8, "2016-17": 96.4, "2017-18": 97.3, "2018-19": 100.0, "2019-20": 100.3,
    "2020-21": 99.2, "2021-22": 98.2, "2022-23": 99.2, "2023-24": 98.5, "2024-25": 98.8
}
ZONES_FOR_POS = {
    # restricted, paint non-ra, mid, three
    "Center" : [0.6, 0.28, 0.1, 0.02],
    "Forward" : [0.4, 0.3, 0.2, 0.1],
    "Guard" : [0.2, 0.3, 0.3, 0.2]
}
DEF_FOR_POS = {
    # restricted, paint non-ra, mid, three, BLK, STL, REB -> BLK
    "Center" : [-0.06, -0.04, 0.02, 0.06, 1.4, 0.4, 0.12],
    "Forward" : [-0.02, 0, -0.02, 0, 0.8, 0.6, 0.08],
    "Guard" : [0.04, 0.02, 0, -0.06, 0.4, 0.8, 0.05]
}
REB_FOR_POS = {
    # contested %, dreb %, oreb %, dreb % of reb, oreb % of reb
    "Center" : [0.35, 0.35, 0.25, 0.7, 0.3],
    "Forward" : [0.25, 0.25, 0.12, 0.8, 0.2],
    "Guard" : [0.15, 0.18, 0.05, 0.85, 0.15]
}

class NBAService:
    """
    Thin wrapper around nba_api with parsing into sim-ready profiles.
    Add a caching layer (Redis or simple dict) before going to production —
    nba_api rate-limits aggressively (~1 req/sec).
    """

    def get_active_players(self) -> list[dict]:
        return players.get_active_players()

    def search(self, query: str) -> list[dict]:
        """
        Search players by name. Returns [{id, full_name, is_active}]
        """
        return players.find_players_by_full_name(query)

    def get_seasons_list(self, player_id: int) -> list[str]:
        """
        Returns seasons player has data for, e.g. ["2003-04", ..., "2023-24"]
        """
        data = commonplayerinfo.CommonPlayerInfo(player_id=player_id).get_data_frames()[0]

        start_year = int(data.iloc[0]["FROM_YEAR"])
        end_year = int(data.iloc[0]["TO_YEAR"])
        if player_id in map(lambda x : x['id'], players.get_active_players()):
            end_year = 2026

        seasons = []
        for x in range(end_year - start_year):
            seasons.append(f'{start_year + x}-{str(start_year + x + 1)[2:]}')
        return seasons

    def build_sim_profile(self, player_id: int, season: str) -> Optional[dict]:
        """
        Core method. Fetches all relevant stat endpoints for a player/season
        and assembles a SimPlayerProfile.

        Returns dict matching SimPlayerProfile TypeScript interface.
        """

        team = playergamelog.PlayerGameLog(player_id=player_id, season=season).get_data_frames()[0]
        time.sleep(DELAY_TIME)
        try: 
            team = team.iloc[0]['MATCHUP'].split()[0]
        except:
            team = "-"

        info = commonplayerinfo.CommonPlayerInfo(player_id=player_id).get_data_frames()[0]
        time.sleep(DELAY_TIME)
        name, pos, height, weight = info[["DISPLAY_FIRST_LAST", "POSITION", "HEIGHT", "WEIGHT"]].loc[0]
        pos_key = str(pos).split("-")[0]

        # Usage, Misc
        basic = playerdashboardbygeneralsplits.PlayerDashboardByGeneralSplits(player_id=player_id, season=season, per_mode_detailed='Per100Possessions', rank='N').get_data_frames()[0]
        print(basic)
        if basic.empty:
            basic = playercareerstats.PlayerCareerStats(player_id=player_id).get_data_frames()[0]
            basic = basic[basic["SEASON_ID"] == season]
            if basic.empty:
                return
            basic = basic.iloc[0]
            pace_adjust = 100 / PACE_DICT[season]
            mins = float(basic["MIN"]) / int(basic["GP"])
        else:
            basic = basic.iloc[0]
            mins = basic["MIN"]
        gp = int(basic['GP'])
        time.sleep(DELAY_TIME)

        advanced = playerdashboardbygeneralsplits.PlayerDashboardByGeneralSplits(player_id=player_id, season=season, per_mode_detailed='Per100Possessions', measure_type_detailed='Advanced', rank='N').get_data_frames()[0]
        time.sleep(DELAY_TIME)

        if not advanced.empty:
            advanced = advanced.assign(TOV_PCT = (100 * basic['TOV'] /
                (basic['FGA'] + 0.44 * basic['FTA'] + basic['TOV']))
            )
            advanced = advanced[[
                'OFF_RATING', 'DEF_RATING', 'NET_RATING',
                'AST_TO', 'AST_RATIO', 'TOV_PCT',
                'OREB_PCT', 'DREB_PCT', 'TM_TOV_PCT', 'E_TOV_PCT',
                'PACE', 'SP_WORK_PACE',
                'PIE', 'POSS', 'MIN'
            ]]
            mins = advanced.iloc[0]["MIN"]

        # what is this player responsible for on the court
        use = playerdashboardbygeneralsplits.PlayerDashboardByGeneralSplits(player_id=player_id, season=season, per_mode_detailed='PerGame', measure_type_detailed='Usage', rank='N').get_data_frames()[0]
        if not use.empty:
            use = use [[
                'USG_PCT', 'PCT_FGA', 'PCT_FG3A', 'PCT_FTA',
                'PCT_OREB', 'PCT_DREB', 'PCT_STL', 'PCT_AST',
                'PCT_BLK', 'PCT_BLKA', 'PCT_PF', 'PCT_PFD',
            ]].iloc[0]
        time.sleep(DELAY_TIME)

        
        # Each parser method returns a sub-dict that gets merged into the profile.
        
        # Scoring
        try: 
            scoring = self._parse_scoring(player_id, season)
            scoring["pts_per100"] = float(basic["PTS"])
            scoring["fg3a_per100"] = float(basic["FG3A"])
            scoring["off_rating"] = float(advanced.iloc[0]['OFF_RATING']) if not advanced.empty else -1
            scoring["ft_pct"] = float(basic['FT_PCT'])
            scoring["ft_rate"] = float(basic['FTA'] / basic['FGA']) # FTA/FGA — how often player gets to line
            scoring["blka_per100"] = float(basic['BLKA'])
            scoring["fl_pct"] = float(use['PCT_PFD']) if not use.empty else -1
        except:
            default_pct = float(basic["FG_PCT"])
            three_pct = float(basic["FG3_PCT"] or 0)
            three_rate = float(basic["FG3A"] or 0) / gp * pace_adjust

            scoring = {
                "pts_per100" : float(basic["PTS"]) / gp * pace_adjust,
                "fg3a_per100" : float(basic["FG3A"]) / gp * pace_adjust,
                "fg3_pct" : float(basic["FG3_PCT"] or 0),
                "efg_pct" : (float(basic["FGM"]) + 0.5 * float(basic["FG3M"] or 0)) / float(basic["FGA"]),
                "zones": {
                    "restricted_area" : { "ast_fg_pct" : default_pct * 1.2, "uast_fg_pct" : default_pct, "freq": ZONES_FOR_POS[pos_key][0] },
                    "paint_non_ra" : { "ast_fg_pct" : default_pct * 1.1, "uast_fg_pct" : default_pct * 0.9, "freq": ZONES_FOR_POS[pos_key][1] },
                    "mid_range" : { "ast_fg_pct" : default_pct, "uast_fg_pct" : default_pct * 0.8, "freq": ZONES_FOR_POS[pos_key][2] },
                    "left_corner_3" : { "ast_fg_pct" : three_pct, "uast_fg_pct" : three_pct * 0.8, "freq": three_rate / 25 },
                    "right_corner_3" : { "ast_fg_pct" : three_pct, "uast_fg_pct" : three_pct * 0.8, "freq": three_rate / 25 },
                    "above_break_3" : { "ast_fg_pct" : three_pct * 1.1, "uast_fg_pct" : three_pct * 0.9, "freq": three_rate / 25 },
                    "backcourt" : { "ast_fg_pct" : three_pct * 0.3, "uast_fg_pct" : three_pct * 0.1, "freq": 0 },
                },
                "shot_types": {
                    "tip_shot" : { "ast_fg_pct" : default_pct, "uast_fg_pct" : default_pct, "freq": -1 },
                    "bank_shot" : { "ast_fg_pct" : default_pct, "uast_fg_pct" : default_pct, "freq": -1 },
                    "layup" : { "ast_fg_pct" : default_pct, "uast_fg_pct" : default_pct, "freq": -1 },
                    "jump_shot" : { 
                        "ast_fg_pct" : default_pct, "uast_fg_pct" : default_pct, 
                        "ast_fg3_pct" : three_pct, "uast_fg3_pct" : three_pct, 
                        "freq2": -1, "freq3": -1
                    },
                    "hook_shot" : { "ast_fg_pct" : default_pct, "uast_fg_pct" : default_pct, "freq": -1 },
                    "alley_oop" : { "ast_fg_pct" : default_pct, "uast_fg_pct" : default_pct, "freq": -1 },
                    "finger_roll" : { "ast_fg_pct" : default_pct, "uast_fg_pct" : default_pct, "freq": -1 },
                    "fadeaway" : { 
                        "ast_fg_pct" : default_pct, "uast_fg_pct" : default_pct, 
                        "ast_fg3_pct" : three_pct, "uast_fg3_pct" : three_pct, 
                        "freq2": -1, "freq3": -1
                    },
                    "dunk" : { "ast_fg_pct" : default_pct * 1.3, "uast_fg_pct" : default_pct * 1.1, "freq": -1 },
                },
                "off_rating": -1, "ft_pct" : float(basic['FT_PCT']), 
                "ft_rate":  float(basic['FTA']) / float(basic['FGA']), # FTA/FGA — how often player gets to line
                "blka_per100" : 0, "fl_pct": float(basic['FTA']) / float(basic['FGA']) # just dup...
            }

        # Defense
        try: 
            defense = self._parse_defense(player_id, season)
            defense['def_rating'] = float(advanced.iloc[0]['DEF_RATING']) if not advanced.empty else -1
            defense['pct_stl'] = float(use['PCT_STL']) if not use.empty else -1
            defense['pct_blk'] = float(use['PCT_BLK']) if not use.empty else -1
            defense['blk_per100'] = float(basic['BLK'])
            defense['stl_per100'] = float(basic['STL'])
            defense['fl_pct'] = float(use["PCT_PF"]) if not use.empty else -1
        except: 
            defense = {
                "overall" : 0,
                "restricted_area" : { "fga": 0, "fg_pct" : -1, "pct_plusmin" : DEF_FOR_POS[pos_key][0] },
                "paint_non_ra" : { "fga": 0, "fg_pct" : -1, "pct_plusmin" : DEF_FOR_POS[pos_key][1] },
                "mid_range" : { "fga": 0, "fg_pct" : -1, "pct_plusmin" : DEF_FOR_POS[pos_key][2] },
                "three" : { "fga": 0, "fg_pct" : -1, "pct_plusmin" : DEF_FOR_POS[pos_key][3] },
                'def_rating': -1, 'pct_stl': -1, 'pct_blk': -1,
                'blk_per100': float(basic['BLK']) / gp * pace_adjust if basic['BLK'] else DEF_FOR_POS[pos_key][4] + DEF_FOR_POS[pos_key][6] * float(basic["REB"]) / gp * pace_adjust,
                'stl_per100': float(basic['STL']) / gp * pace_adjust if basic['STL'] else DEF_FOR_POS[pos_key][5],
                'fl_pct': float(basic['PF']) / gp * pace_adjust / 14 # 6 fouls max so???
            }

        # Rebounding
        try: 
            rebounding = self._parse_rebounding(player_id, season, team)
            rebounding['dreb_pct'] = float(use["PCT_DREB"]) if not use.empty else -1
            rebounding['oreb_pct'] = float(use["PCT_OREB"]) if not use.empty else -1
            rebounding['dreb_per100'] = float(basic['DREB'])
            rebounding['oreb_per100'] = float(basic['OREB'])
        except: 
            rebounding = {
                "c_rb_pct" : REB_FOR_POS[pos_key][0],
                "oreb_to_dreb" : 0.25,
                'dreb_pct': REB_FOR_POS[pos_key][1], 'oreb_pct': REB_FOR_POS[pos_key][2],
                'dreb_per100': float(basic['DREB'] or float(basic["REB"]) * REB_FOR_POS[pos_key][3]) / gp * pace_adjust,
                'oreb_per100' : float(basic['OREB'] or float(basic["REB"]) * REB_FOR_POS[pos_key][4]) / gp * pace_adjust,
            }

        try:
            playmaking = {
                "ast_per100" : float(basic['AST']),
                "ast_rate" : float(advanced.iloc[0]['AST_RATIO']), # how often assisting
                "tov_rate" : float(advanced.iloc[0]['TOV_PCT']), # how often TOVing
            }
        except:
            playmaking = {
                "ast_per100" : float(basic['AST']) / gp * pace_adjust,
                "ast_rate" : float(basic['AST']) / gp * pace_adjust * 2, # how often assisting
                "tov_rate" : float(basic["TOV"]) / gp * pace_adjust * 2 if basic["TOV"] else 12 * float(basic["MIN"]) / gp / 48, # how often TOVing
            }

        try:
            tendencies = {
                "usg" : use["USG_PCT"], "ast_rate" : use["PCT_AST"],
                "fga_rate" : use['PCT_FGA'], "fg3a_rate" : use['PCT_FG3A'],
                "pace" : float(advanced.iloc[0]['PACE'])
            }
        except: 
            tendencies = {
                "usg" : float(basic["PTS"]) / gp * pace_adjust / 80, 
                "ast_rate" : float(basic['AST']) / gp * pace_adjust / 30,
                "fga_rate" : float(basic['FGA']) / gp * pace_adjust / 50, 
                "fg3a_rate" : float(basic['FG3A'] or 0) / gp * pace_adjust / 50,
                "pace" : PACE_DICT[season]
            }

        profile = {
            "id": player_id,
            "name": name,
            "season" : season,
            "team" : team,
            "position" : pos,
            "height" : height,
            "weight" : weight,

            "gp" : gp,
            "mins" : mins,
            "pie" : float(advanced.iloc[0]["PIE"]) if not advanced.empty else 0,

            "scoring" : scoring,
            "defense" : defense,
            "rebounding" : rebounding,
            "playmaking" : playmaking,

            "clutch" : self._parse_clutch(player_id, season),
            "tendencies" : tendencies,

            # ── Salary (populated separately via /salary endpoint) ─────────────
            "salary": None,
        }
        return profile





    def _parse_scoring(self, player_id: int, season: str) -> dict:
        """
        Returns per-shot-zone FG% and volume
        """

        season_data = playerdashboardbyshootingsplits.PlayerDashboardByShootingSplits(player_id=player_id, season=season).get_data_frames()
        time.sleep(DELAY_TIME)

        area = season_data[3][['GROUP_VALUE', 'BLKA', 'PCT_AST_2PM', 'PCT_UAST_2PM', 'PCT_AST_3PM', 'PCT_UAST_3PM', 'FGA']]
        shot_type = season_data[5][['GROUP_VALUE', 'BLKA', 'PCT_AST_2PM', 'PCT_UAST_2PM', 'PCT_AST_3PM', 'PCT_UAST_3PM', 'FGA', 'FG3A']]

        fga_sum = sum(area['FGA'])
        area = area.assign(freq = (area['FGA'] / fga_sum).values)
        fga_sum = sum(shot_type['FGA'])
        shot_type = shot_type.assign(
            freq2 = ((shot_type['FGA'] - shot_type['FG3A']) / fga_sum).values,
            freq3 = (shot_type['FG3A'] / fga_sum).values
        )
        
        return {
            "fg3_pct" : float(season_data[0].iloc[0]["FG3_PCT"]),
            "efg_pct" : float(season_data[0].iloc[0]["EFG_PCT"]),
            "zones": {
                "restricted_area" : { "ast_fg_pct" : area.iloc[0]['PCT_AST_2PM'], "uast_fg_pct" : area.iloc[0]['PCT_UAST_2PM'], "freq": area.iloc[0]['freq'] },
                "paint_non_ra" : { "ast_fg_pct" : area.iloc[1]['PCT_AST_2PM'], "uast_fg_pct" : area.iloc[1]['PCT_UAST_2PM'], "freq": area.iloc[1]['freq'] },
                "mid_range" : { "ast_fg_pct" : area.iloc[2]['PCT_AST_2PM'], "uast_fg_pct" : area.iloc[2]['PCT_UAST_2PM'], "freq": area.iloc[2]['freq'] },
                "left_corner_3" : { "ast_fg_pct" : area.iloc[3]['PCT_AST_3PM'], "uast_fg_pct" : area.iloc[3]['PCT_UAST_3PM'], "freq": area.iloc[3]['freq'] },
                "right_corner_3" : { "ast_fg_pct" : area.iloc[4]['PCT_AST_3PM'], "uast_fg_pct" : area.iloc[4]['PCT_UAST_3PM'], "freq": area.iloc[4]['freq'] },
                "above_break_3" : { "ast_fg_pct" : area.iloc[5]['PCT_AST_3PM'], "uast_fg_pct" : area.iloc[5]['PCT_UAST_3PM'], "freq": area.iloc[5]['freq'] },
                "backcourt" : { "ast_fg_pct" : area.iloc[6]['PCT_AST_3PM'], "uast_fg_pct" : area.iloc[6]['PCT_UAST_3PM'], "freq": area.iloc[6]['freq'] },
            },
            "shot_types": {
                "tip_shot" : { "ast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Tip Shot"].iloc[0]['PCT_AST_2PM'], 
                              "uast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Tip Shot"].iloc[0]['PCT_UAST_2PM'], 
                              "freq": shot_type.loc[shot_type["GROUP_VALUE"] == "Tip Shot"].iloc[0]['freq2'] },
                "bank_shot" : { "ast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Bank Shot"].iloc[0]['PCT_AST_2PM'], 
                               "uast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Bank Shot"].iloc[0]['PCT_UAST_2PM'], 
                               "freq": shot_type.loc[shot_type["GROUP_VALUE"] == "Bank Shot"].iloc[0]['freq2'] },
                "layup" : { "ast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Layup"].iloc[0]['PCT_AST_2PM'], 
                           "uast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Layup"].iloc[0]['PCT_UAST_2PM'], 
                           "freq": shot_type.loc[shot_type["GROUP_VALUE"] == "Layup"].iloc[0]['freq2'] },
                "jump_shot" : { 
                    "ast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Jump Shot"].iloc[0]['PCT_AST_2PM'], "uast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Jump Shot"].iloc[0]['PCT_UAST_2PM'], 
                    "ast_fg3_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Jump Shot"].iloc[0]['PCT_AST_3PM'], "uast_fg3_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Jump Shot"].iloc[0]['PCT_UAST_3PM'], 
                    "freq2": shot_type.loc[shot_type["GROUP_VALUE"] == "Jump Shot"].iloc[0]['freq2'], "freq3": shot_type.loc[shot_type["GROUP_VALUE"] == "Jump Shot"].iloc[0]['freq3']
                },
                "hook_shot" : { "ast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Hook Shot"].iloc[0]['PCT_AST_2PM'], 
                               "uast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Hook Shot"].iloc[0]['PCT_UAST_2PM'], 
                               "freq": shot_type.loc[shot_type["GROUP_VALUE"] == "Hook Shot"].iloc[0]['freq2'] },
                "alley_oop" : { "ast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Alley Oop"].iloc[0]['PCT_AST_2PM'], 
                               "uast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Alley Oop"].iloc[0]['PCT_UAST_2PM'], 
                               "freq": shot_type.loc[shot_type["GROUP_VALUE"] == "Alley Oop"].iloc[0]['freq2'] },
                "finger_roll" : { "ast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Finger Roll"].iloc[0]['PCT_AST_2PM'], 
                                 "uast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Finger Roll"].iloc[0]['PCT_UAST_2PM'],
                                "freq": shot_type.loc[shot_type["GROUP_VALUE"] == "Finger Roll"].iloc[0]['freq2'] },
                "fadeaway" : { 
                    "ast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Fadeaway"].iloc[0]['PCT_AST_2PM'], "uast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Fadeaway"].iloc[0]['PCT_UAST_2PM'], 
                    "ast_fg3_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Fadeaway"].iloc[0]['PCT_AST_3PM'], "uast_fg3_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Fadeaway"].iloc[0]['PCT_UAST_3PM'], 
                    "freq2": shot_type.loc[shot_type["GROUP_VALUE"] == "Fadeaway"].iloc[0]['freq2'], "freq3": shot_type.loc[shot_type["GROUP_VALUE"] == "Fadeaway"].iloc[0]['freq3']
                },
                "dunk" : { "ast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Dunk"].iloc[0]['PCT_AST_2PM'], 
                          "uast_fg_pct" : shot_type.loc[shot_type["GROUP_VALUE"] == "Dunk"].iloc[0]['PCT_UAST_2PM'], 
                          "freq": shot_type.loc[shot_type["GROUP_VALUE"] == "Dunk"].iloc[0]['freq2'] },
            }
        }


    def _parse_rebounding(self, player_id: int, season: str, team: str) -> dict:
        """
        Using PlayerDashPtReb
        """

        rb = playerdashptreb.PlayerDashPtReb(team_id=(teams.find_team_by_abbreviation(team)['id']), player_id=player_id, season=season).get_data_frames()
        time.sleep(DELAY_TIME)

        rb = rb[0]
        return {
            "c_rb_pct" : rb.iloc[0]['C_REB_PCT'],
            "oreb_to_dreb" : float(rb.iloc[0]['OREB'] / rb.iloc[0]['DREB']),
        }

    def _parse_defense(self, player_id: int, season: str) -> dict:
        """
        Using PlayerDashPtShotDefend
        """
        defense = playerdashptshotdefend.PlayerDashPtShotDefend(team_id=0, player_id=player_id, season=season, per_mode_simple='PerGame').get_data_frames()
        defense = defense[0]
        paint_non_ra_shots = float(defense.iloc[5]['D_FGA']) - float(defense.iloc[3]['D_FGA'])
        mid_range_shots = float(defense.iloc[4]['D_FGA']) - float(defense.iloc[5]['D_FGA'])
        time.sleep(DELAY_TIME)
        return {
            "overall" : round(float(defense.iloc[0]["PCT_PLUSMINUS"]) * 100, 2),
            "restricted_area" : { 
                "fga": defense.iloc[3]['D_FGA'],
                "fg_pct" : round(float(defense.iloc[3]["D_FG_PCT"]) * 100, 2),
                "pct_plusmin" : round(float(defense.iloc[3]["PCT_PLUSMINUS"]) * 100, 2)
            },
            "paint_non_ra" : {
                "fga": float(defense.iloc[5]['D_FGA']) - float(defense.iloc[3]['D_FGA']),
                "fg_pct" : -1 if paint_non_ra_shots == 0 else round((float(defense.iloc[5]['D_FGM']) - float(defense.iloc[3]['D_FGM'])) / paint_non_ra_shots * 100, 2),
                "pct_plusmin" : round(float(defense.iloc[3]["PCT_PLUSMINUS"] + defense.iloc[5]["PCT_PLUSMINUS"]) * 50, 2)
            },
            "mid_range" : {
                "fga": float(defense.iloc[4]['D_FGA']) - float(defense.iloc[5]['D_FGA']),
                "fg_pct" : 0 if mid_range_shots == 0 else round((float(defense.iloc[4]['D_FGM']) - float(defense.iloc[5]['D_FGM'])) / mid_range_shots * 100, 2),
                "pct_plusmin" : round(float(defense.iloc[4]["PCT_PLUSMINUS"] + defense.iloc[5]["PCT_PLUSMINUS"]) * 50, 2)
            },
            "three" : { 
                "fga": defense.iloc[2]['D_FGA'],
                "fg_pct" : round(float(defense.iloc[2]["D_FG_PCT"]) * 100, 2),
                "pct_plusmin" : round(float(defense.iloc[2]["PCT_PLUSMINUS"]) * 100, 2)
            }
        }
    
    def _parse_clutch(self, player_id: int, season: str) -> dict:
        """
        Using PlayerDashPtShotDefend
        """
        clutch = playerdashboardbyclutch.PlayerDashboardByClutch(player_id=player_id, season=season, per_mode_detailed='PerGame', rank='N').get_data_frames()
        time.sleep(DELAY_TIME)
        min_3 = clutch[2]
        sec_30 = clutch[4]
        close_end = {
                "fga" : min_3.iloc[0]['FGA'], "fg_pct" : min_3.iloc[0]['FG_PCT'],
                "fg3a" : min_3.iloc[0]['FG3A'], "fg3_pct" : min_3.iloc[0]['FG3_PCT'],
                "fta" : min_3.iloc[0]['FTA'], "ft_pct" : min_3.iloc[0]['FT_PCT'],
                "plus_min" : min_3.iloc[0]['PLUS_MINUS']
            } if len(min_3) > 0 else {
                "fga" : -1, "fg_pct" : -1,
                "fg3a" : -1, "fg3_pct" : -1,
                "fta" : -1, "ft_pct" : -1,
                "plus_min" : -1
            }
        close_final = {
                "fga" : sec_30.iloc[0]['FGA'], "fg_pct" : sec_30.iloc[0]['FG_PCT'],
                "fg3a" : sec_30.iloc[0]['FG3A'], "fg3_pct" : sec_30.iloc[0]['FG3_PCT'],
                "fta" : sec_30.iloc[0]['FTA'], "ft_pct" : sec_30.iloc[0]['FT_PCT'],
                "plus_min" : sec_30.iloc[0]['PLUS_MINUS']
            } if len(sec_30) > 0 else {
                "fga" : -1, "fg_pct" : -1,
                "fg3a" : -1, "fg3_pct" : -1,
                "fta" : -1, "ft_pct" : -1,
                "plus_min" : -1
            }
        return { 
            "close_end" : close_end,
            "close_final" : close_final
        }