import type { Player, PlayerRating } from "../../sim/types";

const MAX_RATING = 200;
const MAX_RATING_OVR_BOOST = 100;

export function getRatings(p: Player) : PlayerRating {
    const minsAdjust = Math.max(0.1, Math.min(1, Math.min(28, p.mins) / 24 * Math.min(44, p.gp) / 40));
    const getShotRating = (ast: number, uast: number, base: number, max: number) => {
        return Math.max(0.01, ast * 0.28 + uast * 0.72 - base) * 100 / (max - base);
    }
    
    const threeBoost = Math.min(1, Math.max(0.01, p.scoring.fg3a_per100 - 2) / 6) * Math.max(1, 1 + (p.scoring.fg3a_per100 - 8) / 32 * minsAdjust);

    return {
        impact: Math.min(3.8, Math.pow(p.pie * 10, 2)) * (100 / 3.8) * minsAdjust, // normalize 0 to 3.6
        shot_tendency: Math.max(0, p.tendencies.fga_rate - 0.05) * 100 / 0.35,
        scoring: {
            overall: Math.max(0.001, p.scoring.pts_per100 - 8) * 100 / 32 * minsAdjust,
            efficiency: Math.max(0.001, p.scoring.efg_pct - 0.28) * 100 / 0.4,
            three: threeBoost * (Math.max(0.001, p.scoring.fg3_pct - 0.2) * 100 / 0.25),
            free_throw: Math.max(0.001, p.scoring.ft_pct - 0.5) * 100 / 0.5, 
            draw_foul: p.scoring.ft_rate * 100, // Math.max(0.001, p.scoring.fl_pct - 0.1) * 100 / 0.5,
            zones: {
                restricted_area: { 
                    skill: getShotRating(p.scoring.zones.restricted_area.ast_fg_pct, p.scoring.zones.restricted_area.uast_fg_pct, 0.34, 0.68)
                        * Math.max(0.7, Math.min(0.35, p.scoring.zones.restricted_area.freq) / 0.35), 
                    ast_buff: Math.max(0, Math.min(0.35, p.scoring.zones.restricted_area.ast_fg_pct - p.scoring.zones.restricted_area.uast_fg_pct)) * 100 / 0.35,
                    tendency: p.scoring.zones.restricted_area.freq * 100
                },
                paint_non_ra: {
                    skill: getShotRating(p.scoring.zones.paint_non_ra.ast_fg_pct, p.scoring.zones.paint_non_ra.uast_fg_pct, 0.34, 0.66)
                        * Math.max(0.7, Math.min(0.24, p.scoring.zones.paint_non_ra.freq) / 0.24), 
                    ast_buff: Math.max(0, Math.min(0.4, p.scoring.zones.paint_non_ra.ast_fg_pct - p.scoring.zones.paint_non_ra.uast_fg_pct)) * 100 / 0.4,
                    tendency: p.scoring.zones.paint_non_ra.freq * 100
                },
                mid_range: {
                    skill: getShotRating(p.scoring.zones.mid_range.ast_fg_pct, p.scoring.zones.mid_range.uast_fg_pct, 0.32, 0.66)
                        * Math.max(0.7, Math.min(0.18, p.scoring.zones.mid_range.freq) / 0.18), 
                    ast_buff: Math.max(0, Math.min(0.4, p.scoring.zones.mid_range.ast_fg_pct - p.scoring.zones.mid_range.uast_fg_pct)) * 100 / 0.4,
                    tendency: p.scoring.zones.mid_range.freq * 100
                },
                left_corner_3: {
                    skill: getShotRating(p.scoring.zones.left_corner_3.ast_fg_pct, p.scoring.zones.left_corner_3.uast_fg_pct, 0.16, 0.45)
                        * Math.max(0.7, Math.min(0.1, p.scoring.zones.left_corner_3.freq) / 0.1)
                        * threeBoost, 
                    ast_buff: Math.max(0, Math.min(0.4, p.scoring.zones.left_corner_3.ast_fg_pct - p.scoring.zones.left_corner_3.uast_fg_pct)) * 100 / 0.4,
                    tendency: p.scoring.zones.left_corner_3.freq * 100
                }, 
                right_corner_3: {
                    skill: getShotRating(p.scoring.zones.right_corner_3.ast_fg_pct, p.scoring.zones.right_corner_3.uast_fg_pct, 0.16, 0.45)
                        * Math.max(0.7, Math.min(0.1, p.scoring.zones.right_corner_3.freq) / 0.1)
                        * threeBoost,
                    ast_buff: Math.max(0, Math.min(0.4, p.scoring.zones.right_corner_3.ast_fg_pct - p.scoring.zones.right_corner_3.uast_fg_pct)) * 100 / 0.4,
                    tendency: p.scoring.zones.right_corner_3.freq * 100
                }, 
                above_break_3: {
                    skill: getShotRating(p.scoring.zones.above_break_3.ast_fg_pct, p.scoring.zones.above_break_3.uast_fg_pct, 0.2, 0.52)
                        * Math.max(0.7, Math.min(0.28, p.scoring.zones.above_break_3.freq) / 0.28)
                        * threeBoost, 
                    ast_buff: Math.max(0, Math.min(0.4, p.scoring.zones.above_break_3.ast_fg_pct - p.scoring.zones.above_break_3.uast_fg_pct)) * 100 / 0.4,
                    tendency: p.scoring.zones.above_break_3.freq * 100
                }
            }
        },
        defense: {
            overall: (p.defense.overall - 8) * -100 / 16 * minsAdjust,
            restricted_area: Math.min(0.01, p.defense.restricted_area.pct_plusmin - 10 + 0.001) * -100 / 18 * minsAdjust, 
            paint_non_ra: Math.min(0.01, p.defense.paint_non_ra.pct_plusmin - 7 + 0.001) * -100 / 14 * minsAdjust,
            mid_range: Math.min(0.01, p.defense.mid_range.pct_plusmin - 7 + 0.001) * -100 / 13 * minsAdjust, 
            three: Math.min(0.01, p.defense.three.pct_plusmin - 8 + 0.001) * -100 / 16 * minsAdjust,

            stl: Math.max(0.01, p.defense.stl_per100 - 0.4) * 100 / 2.6 * Math.max(minsAdjust, 0.6), 
            blk: Math.min(MAX_RATING, Math.max(0.01, p.defense.blk_per100 - 0.4) * 100 / 2.8), 
            fl: 100 - Math.min(99.99, (Math.max(0, p.defense.fl_pct - 0.08) * 100 / 0.24)),
        },
        rebounding: {
            contested_rebounding: Math.max(0.01, p.rebounding.c_rb_pct - 0.12) * (100 / 0.4) * minsAdjust, // normalize 0 to 0.8
            oreb: Math.max(0.01, p.rebounding.oreb_per100 - 0.4) * 100 / 6, 
            dreb: Math.max(0.01, p.rebounding.dreb_per100 - 3) * 100 / 11,
        },
        playmaking: {
            ast: Math.max(0.01, p.playmaking.ast_per100 - 2.6) * 100 / 10, 
            ast_rate: Math.min(100, Math.max(0.001, p.playmaking.ast_rate - 10) * 3.9), 
            tov: 100 - Math.min(99.99, (Math.max(0, p.playmaking.tov_rate - 4) * 100 / 20))
        },
        clutch: {
            end_three: Math.min(MAX_RATING, Math.max(0.001, p.clutch.close_end.fg3_pct - 0.15) * 100 / 0.45
                * Math.min(0.4, p.clutch.close_end.fg3a) / 0.4) * minsAdjust, 
            end_buff: Math.min(MAX_RATING, Math.max(0.001, p.clutch.close_end.fg_pct - 0.15) * 100 / 0.5
                * Math.min(1, p.clutch.close_end.fga) / 1) * minsAdjust,
            end_ft: Math.min(MAX_RATING, Math.max(0, p.clutch.close_end.ft_pct - 0.6) * 100 / 0.4) * minsAdjust,
            final_three: Math.min(MAX_RATING, Math.max(0.001, p.clutch.close_final.fg3_pct - 0.15) * 100 / 0.45
                * Math.min(0.2, p.clutch.close_end.fg3a) / 0.2) * minsAdjust, 
            final_buff: Math.min(MAX_RATING, Math.max(0.001, p.clutch.close_final.fg_pct - 0.15) * 100 / 0.5
                * Math.min(0.4, p.clutch.close_end.fg3a) / 0.4) * minsAdjust,
            final_ft: Math.min(MAX_RATING, Math.max(0, p.clutch.close_final.ft_pct - 0.6) * 100 / 0.4) * minsAdjust,
        }
    };
}

export function getOverall(r: PlayerRating) {
    return r.impact * 0.18 + r.scoring.overall * 0.12
      + Math.min(MAX_RATING_OVR_BOOST, r.scoring.efficiency) * 0.1 
      + r.scoring.three * 0.08 
      + r.scoring.free_throw * 0.04 + r.scoring.draw_foul * 0.02
      + r.scoring.zones.restricted_area.skill * 0.06 + r.scoring.zones.restricted_area.ast_buff * 0.012 + r.scoring.zones.paint_non_ra.skill * 0.05 + r.scoring.zones.paint_non_ra.ast_buff * 0.012
      + r.scoring.zones.mid_range.skill * 0.06 + r.scoring.zones.mid_range.ast_buff * 0.012
      + r.scoring.zones.left_corner_3.skill * 0.04 + r.scoring.zones.left_corner_3.ast_buff * 0.008 + r.scoring.zones.right_corner_3.skill * 0.04 + r.scoring.zones.right_corner_3.ast_buff * 0.008
      + r.scoring.zones.above_break_3.skill * 0.05 + r.scoring.zones.above_break_3.ast_buff * 0.01
      
      + r.defense.overall * 0.1
      + Math.min(MAX_RATING_OVR_BOOST, r.defense.restricted_area) * 0.03 
      + Math.min(MAX_RATING_OVR_BOOST, r.defense.paint_non_ra) * 0.03
      + Math.min(MAX_RATING_OVR_BOOST, r.defense.mid_range) * 0.03 
      + Math.min(MAX_RATING_OVR_BOOST, r.defense.three) * 0.03
      + r.defense.stl * 0.08
      + Math.min(MAX_RATING_OVR_BOOST, r.defense.blk) * 0.07
      + r.defense.fl * 0.02

      + Math.min(MAX_RATING_OVR_BOOST, r.rebounding.contested_rebounding) * 0.04
      + Math.min(MAX_RATING_OVR_BOOST, r.rebounding.oreb) * 0.1
      + r.rebounding.dreb * 0.08
      + r.playmaking.ast * 0.12 
      + r.playmaking.tov * 0.08
      + r.clutch.end_three * 0.01 + r.clutch.end_buff * 0.014 + r.clutch.end_ft * 0.003
      + r.clutch.final_three * 0.006 + r.clutch.final_buff * 0.008 + r.clutch.final_ft * 0.002;
}

export function getTopRatings(r: PlayerRating) {
    let top = [];
    let min = 0;

    // TODO: show top ratings for players
    return [{label: 'tmp', rating: 10}];
}