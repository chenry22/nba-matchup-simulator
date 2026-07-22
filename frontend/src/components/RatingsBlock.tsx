import type { CSSProperties } from "react";
import type { Player } from "../sim/types";
import { teamStyles } from "./TeamColors";
import { getOverall, getRatings } from "./Ratings";

interface Props {
  p: Player
}

export default function RatingsBlock({ p } : Props) {
  function ratingNumBlock(rating: number, label: string, additional: number = -1) {
    return <div style={{...styles.col, gap: '0', padding: '8px 8px 4px', 
      border: '2px solid gray', borderRadius: '8px', textAlign: 'center'
    }}>
      <div style={{ margin: '0', padding: '0', fontSize: '0.7rem', lineHeight: '0.7rem', fontWeight: 'bold' }}>{label}</div>
      { rating === 0 ? 
      <h3 style={{ margin: '0', padding: '0'}}>-</h3>
        :  
      <h3 style={{ margin: '0', padding: '0', 
        color: `rgb(${4 * Math.max(0, 80 - rating)}, ${4 * Math.max(0, rating - 40)}, 60)`
      }}>
        {Math.round(rating)}
        { additional > 0 && 
          <span style={{ color: `rgb(10, ${Math.max(0, additional + 120)}, 80)`, 
            fontSize: '0.8rem', marginLeft: '4px'
          }}>({Math.round(additional)})</span>
        }
      </h3>
      }
    </div>
  }

  const ratings = getRatings(p);

  return <div style={{ margin: '4px' }}>
      <div style={styles.row}>
        <img style={{ objectFit: 'contain', maxHeight: '200px', minWidth: '160px', width: '60%', maxWidth: '260px' }} src={`https://cdn.nba.com/headshots/nba/latest/260x190/${p.id}.png`}></img>
        <div>
          <h2>{p.name} ({p.season})</h2> 
          <div>
            <span style={{...teamStyles[p.team], 
              borderRadius: '8px', borderWidth: '1px', marginRight: '8px', padding: '4px 6px',
              fontWeight: 'bold', fontSize: '0.7rem'
            }}>{p.team}</span>

            {p.height}, {p.weight}lb | {p.position}</div>
          <div>{p.mins} MPG | {p.gp} Games Played</div>

          <div style={{...styles.row, flexWrap: 'wrap', margin: '14px 0' }}>
            { ratingNumBlock(getOverall(ratings), "OVERALL") }
            { ratingNumBlock(ratings.impact, "IMPACT") }
            { ratingNumBlock(ratings.shot_tendency, "SHOT TENDENCY") }
          </div>
        </div>
      </div>

      <div style={{...styles.row, gap: '40px', flexWrap: 'wrap', rowGap: '20px' }}>
        <div style={{...styles.col, justifyContent: 'left'}}>
          <div><b>SCORING</b></div>
          <div style={{...styles.row, flexWrap: 'wrap' }}>
            { ratingNumBlock(ratings.scoring.overall, "SCORING") }
            { ratingNumBlock(ratings.scoring.efficiency, "EFFICIENCY") }
            { ratingNumBlock(ratings.scoring.three, "3PT") }
          </div>
        </div>
        <div style={{...styles.col, justifyContent: 'left'}}>
          <div><b>DEFENSE</b></div>
          <div style={{...styles.row, flexWrap: 'wrap' }}>
            { ratingNumBlock(ratings.defense.overall, "DEFENSE") }
            { ratingNumBlock(ratings.defense.stl, "STL") }
            { ratingNumBlock(ratings.defense.blk, "BLK") }
          </div>
        </div>
        <div style={{...styles.col, justifyContent: 'left'}}>
          <div><b>PLAYMAKING</b></div>
          <div style={{...styles.row, flexWrap: 'wrap' }}>
            { ratingNumBlock(ratings.playmaking.ast, "ASSIST") }
            { ratingNumBlock(ratings.playmaking.tov, "TOV PREVENT") }
          </div>
        </div>
        <div style={{...styles.col, justifyContent: 'left'}}>
          <div><b>REBOUNDING</b></div>
          <div style={{...styles.row, flexWrap: 'wrap' }}>
            { ratingNumBlock(ratings.rebounding.dreb, "DREB") }
            { ratingNumBlock(ratings.rebounding.oreb, "OREB") }
            { ratingNumBlock(ratings.rebounding.contested_rebounding, "CONTESTED REB") }
          </div>
        </div>

        <div style={{...styles.col, justifyContent: 'left'}}>
          <div><b>SCORING BY ZONE (AST BUFF)</b></div>
          <div style={{...styles.row, flexWrap: 'wrap' }}>
              { ratingNumBlock(ratings.scoring.zones.restricted_area.skill, "RESTRICTED AREA", ratings.scoring.zones.restricted_area.ast_buff) }
              { ratingNumBlock(ratings.scoring.zones.paint_non_ra.skill, "PAINT NON-RA", ratings.scoring.zones.paint_non_ra.ast_buff) }
              { ratingNumBlock(ratings.scoring.zones.mid_range.skill, "MID RANGE", ratings.scoring.zones.mid_range.ast_buff) }
              { ratingNumBlock(ratings.scoring.zones.left_corner_3.skill, "LEFT CORNER THREE", ratings.scoring.zones.left_corner_3.ast_buff) }
              { ratingNumBlock(ratings.scoring.zones.right_corner_3.skill, "RIGHT CORNER THREE", ratings.scoring.zones.right_corner_3.ast_buff) }
              { ratingNumBlock(ratings.scoring.zones.above_break_3.skill, "ABOVE BREAK THREE", ratings.scoring.zones.above_break_3.ast_buff) }
          </div>
        </div>
        <div style={{...styles.col, justifyContent: 'left'}}>
          <div><b>DEFENSE BY ZONE</b></div>
          <div style={{...styles.row, flexWrap: 'wrap' }}>
              { ratingNumBlock(ratings.defense.restricted_area, "RESTRICTED AREA") }
              { ratingNumBlock(ratings.defense.paint_non_ra, "PAINT NON-RA") }
              { ratingNumBlock(ratings.defense.mid_range, "MID RANGE") }
              { ratingNumBlock(ratings.defense.three, "THREE") }
              { ratingNumBlock(ratings.defense.fl, "AVOID FL") }
          </div>
        </div>
        <div style={{...styles.col, justifyContent: 'left'}}>
          <div><b>CLUTCH</b></div>
          <div style={{...styles.row, flexWrap: 'wrap' }}>
              { ratingNumBlock(ratings.clutch.end_buff, "ENDGAME SHOT") }
              { ratingNumBlock(ratings.clutch.end_three, "ENDGAME THREE") }
              { ratingNumBlock(ratings.clutch.end_ft, "ENDGAME FT") }
              { ratingNumBlock(ratings.clutch.final_buff, "FINAL SHOT") }
              { ratingNumBlock(ratings.clutch.final_three, "FINAL THREE") }
              { ratingNumBlock(ratings.clutch.final_ft, "FINAL FT") }
          </div>
        </div>
      </div>
    </div>
}

const styles: Record<string, CSSProperties> = {
  container: {
    width: '100dvw', height: '100dvh', display: 'flex', flexDirection: 'column'
  },
  row: { display: 'flex', gap: '10px' },
  col: { display: 'flex', flexDirection: 'column', gap: '10px' },
}