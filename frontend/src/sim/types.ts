export type TeamSide = "A" | "B";
export type Position = "PG" | "SG" | "SF" | "PF" | "C";

export type EventType = "shot" | "pass" | "rebound" | "turnover" | "foul";

export type CourtZone = "restricted_area" | "paint_non_ra" | "mid_range" |
  "left_corner_3" | "right_corner_3" | "above_break_3" | "backcourt";
export type ShotType = "tip_shot" | "bank_shot" | "layup" | "jump_shot" | 
  "hook_shot" | "alley_oop" | "finger_roll" | "fadeaway" | "dunk";
export const ShotTypesForZone = {
  "restricted_area" : ["bank_shot", "layup", "hook_shot", "finger_roll", "dunk"],
  "paint_non_ra" : ["bank_shot", "layup", "hook_shot"],
  "mid_range" : ["bank_shot", "jump_shot", "fadeaway"],
  "left_corner_3" : ["bank_shot", "jump_shot", "fadeaway"],
  "right_corner_3" : ["bank_shot", "jump_shot", "fadeaway"],
  "above_break_3" : ["bank_shot", "jump_shot", "fadeaway"],
  "backcourt" : ["bank_shot", "jump_shot", "fadeaway"],
};


export interface PlayerSelect {
  full_name: string, id: number,
  seasons: string[], selectedSeason: string
}

export interface Player {
  id: number, name: string,
  season: string, team: string,
  position: Position, height: string, weight: string,
  gp: number, mins: number, pie: number,

  scoring: {
    pts_per100: number, off_rating: number, 
    fg3a_per100: number,
    fg3_pct : number, efg_pct : number,
    zones: {
      restricted_area: { ast_fg_pct: number, uast_fg_pct: number, freq: number },
      paint_non_ra: { ast_fg_pct: number, uast_fg_pct: number, freq: number },
      mid_range: { ast_fg_pct: number, uast_fg_pct: number, freq: number },
      left_corner_3: { ast_fg_pct: number, uast_fg_pct: number, freq: number },
      right_corner_3: { ast_fg_pct: number, uast_fg_pct: number, freq: number },
      above_break_3: { ast_fg_pct: number, uast_fg_pct: number, freq: number },
      backcourt: { ast_fg_pct: number, uast_fg_pct: number, freq: number }
    },
    shot_types: {
      tip_shot: { ast_fg_pct: number, uast_fg_pct: number, freq: number },
      bank_shot: { ast_fg_pct: number, uast_fg_pct: number, freq: number },
      layup: { ast_fg_pct: number, uast_fg_pct: number, freq: number },
      jump_shot: { ast_fg_pct: number, uast_fg_pct: number, freq2: number, ast_fg3_pct: number, uast_fg3_pct: number, freq3: number },
      hook_shot: { ast_fg_pct: number, uast_fg_pct: number, freq: number },
      alley_oop: { ast_fg_pct: number, uast_fg_pct: number, freq: number },
      finger_roll: { ast_fg_pct: number, uast_fg_pct: number, freq: number },
      fadeaway: { ast_fg_pct: number, uast_fg_pct: number, freq2: number, ast_fg3_pct: number, uast_fg3_pct: number, freq3: number },
      dunk: { ast_fg_pct: number, uast_fg_pct: number, freq: number }
    },
    ft_pct: number, ft_rate: number,
    blka_per100: number, fl_pct: number 
  },
  defense: {
    def_rating: number, overall: number,

    restricted_area: { fga: number, fg_pct: number, pct_plusmin: number },
    paint_non_ra: { fga: number, fg_pct: number, pct_plusmin: number },
    mid_range: { fga: number, fg_pct: number, pct_plusmin: number },
    three: { fga: number, fg_pct: number, pct_plusmin: number },
    
    pct_stl: number, pct_blk: number, fl_pct: number,
    blk_per100: number, stl_per100: number,
  },
  rebounding: {
    dreb_per100: number, oreb_per100: number,
    c_rb_pct: number, oreb_to_dreb: number, 
    dreb_pct: number, oreb_pct: number 
  },
  playmaking: {
    ast_per100: number, ast_rate: number, tov_rate: number 
  },
  clutch: {
    close_end: { 
      fga: number, fg_pct: number, fg3a: number, fg3_pct: number,
      fta: number, ft_pct: number, plus_min: number
    },
    close_final: {
      fga: number, fg_pct: number, fg3a: number, fg3_pct: number,
      fta: number, ft_pct: number, plus_min: number
    }
  },

  tendencies: {
    usg: number, ast_rate: number, 
    fga_rate: number, fg3a_rate: number,
    pace: number,
  },

  salary: string
}
export interface PlayerRating {
  overall: number, impact: number, shot_tendency: number

  scoring: {
    overall: number,
    zones: {
      restricted_area: { skill: number, tendency: number },
      paint_non_ra: { skill: number, tendency: number },
      mid_range: { skill: number, tendency: number },
      left_corner_3: { skill: number, tendency: number }, 
      right_corner_3: { skill: number, tendency: number }, 
      above_break_3: { skill: number, tendency: number }
    },
    shot_types: {
      tip_shot: { skill: number, tendency: number }, 
      bank_shot: { skill: number, tendency: number },
      layup: { skill: number, tendency: number },
      jump_shot_two: { skill: number, tendency: number }, 
      jump_shot_three: { skill: number, tendency: number },
      hook_shot: { skill: number, tendency: number },
      alley_oop: { skill: number, tendency: number }, 
      finger_roll: { skill: number, tendency: number },
      fadeaway_two: { skill: number, tendency: number },
      fadeaway_three: { skill: number, tendency: number },
      dunk: { skill: number, tendency: number }
    },
    free_throw: number, draw_foul: number,
  },
  defense: {
    overall: number,
    restricted_area: number, paint_non_ra: number,
    mid_range: number, three: number,
    stl: number, blk: number, fl: number,
  },
  reb: number, oreb: number, dreb: number,
  ast: number, tov: number,
  clutch: {
    end_three_bonus: number, end_two_bonus: number,
    final_three_bonus: number, final_two_bonus: number,
  }
}

export interface Shot {
  type: ShotType;
  zone: CourtZone;
  points: 2 | 3;
  x: number;
  y: number;
}

export interface PlayerInfo {
  name: string;
  team: Team;
}

export interface Event {
  player: PlayerInfo;
  type: EventType;

  timestamp: number;
  period: number;
}
export interface Rebound extends Event {
  offensive: boolean;
}
export interface ShotAttempt extends Event {
  assisted_by: PlayerInfo | null;
  defended_by: PlayerInfo;
  made: boolean;
  blocked: boolean;
  contest_pct: number;

  shot: Shot;
}
export interface Turnover extends Event {
  stolen_by: PlayerInfo | null;
}
export interface Pass extends Event {
  pass_to: PlayerInfo;
}
export interface Foul extends Event {
  fouled_by: PlayerInfo;

  shot: Shot;
  free_throws_made: 0 | 1 | 2 | 3;
  free_throws_attempted: 2 | 3;
}


export interface Team {
  name: string;
  color: string;
  
  rosterSelect: PlayerSelect[];
  roster: Player[];
  stats: PlayerStats[];
}

export interface GameState {
  status: string;
  periods: number;
  periodLength: number;
  shotClockLength: number,

  teamA: Team;
  teamB: Team;

  period: number;
  gameClock: number;
  periodClock: number;
  shotClock: number;

  score: number[];
  possession: TeamSide;
  events: Event[];
}

export interface PlayerStats {
  player: string;

  fga: number;
  fgm: number;
  fg3a: number;
  fg3m: number;
  fta: number;
  ftm: number;

  ast: number;
  dreb: number;
  oreb: number;
  stl: number;
  blk: number;
  tov: number;
  fl: number;
}