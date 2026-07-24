import type { Player } from "../../sim/types";
import { teamStyles } from "../TeamColors";
import { getOverall, getRatings, getTopRatings } from "./Ratings";

interface Props {
  p: Player;
  setRatingProfileOverlay: (p: Player) => void;
}

export default function RatingPreviewBlock({ p, setRatingProfileOverlay } : Props) {
    
    const ovr = getOverall(getRatings(p));

  return <div key={p.id} 
      style={{ display: 'flex', gap: '8px', background: 'white', padding: '10px', 
        borderRadius: '8px', border: '2px solid gray', cursor: 'pointer',
      }}
      onClick={() => setRatingProfileOverlay(p)}
    >
      <img src={`https://cdn.nba.com/headshots/nba/latest/260x190/${p.id}.png`}
        style={{ maxWidth: '120px', maxHeight: '90px', objectFit: 'contain'}}></img>
      <div style={{ display: 'flex', flexDirection: 'column', 
        justifyContent: 'center', textAlign: 'center', 
        alignItems: 'center', gap: '2px' 
      }}>
        <span style={{ color: 'black', whiteSpace: 'nowrap' }}><b>{p.name}</b> <span style={{ fontSize: '0.7rem', opacity: '0.7', marginLeft: '2px' }}>({p.season})</span></span>
        <span style={{ whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: 'bold', color: `rgb(${5 * Math.max(0, 80 - ovr)}, ${Math.min(200, 3 * Math.max(0, ovr - 25))}, 80)` }}>{Math.round(ovr)} OVR</span>
          <span style={{...teamStyles[p.team], 
              borderRadius: '8px', borderWidth: '1px', margin: ' 0 12px', padding: '3px 5px',
              fontWeight: 'bold', fontSize: '0.7rem'
            }}>{p.team}</span>
          <span style={{ fontSize: '0.8rem'}}>{p.position.split("-").map(s => s[0]).join("-")}</span>
        </span>

        {/* <div style={{display: 'flex', justifyContent: 'center', gap: '10px', 
          border: '2px solid lightgray', borderRadius: '80%', padding: '6px',
          marginBottom: '2px' 
        }}>
          { getTopRatings(p.ratings).map(r => <div key={r.label} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 'bold', color: `rgb(10, ${Math.max(0, r.rating + 120)}, 80)`, 
              fontSize: '0.8rem', lineHeight: '0.9rem' 
            }}>{r.rating}</div>
            <div style={{ textTransform: 'uppercase', fontSize: '0.5rem', lineHeight: '0.5rem'}}>{r.label}</div>
          </div>)}
        </div> */}

        <div style={styles.button}>View Player Profile</div>
      </div>
    </div>;
}

const styles = {
    button: { 
        color: 'white', background: '#240b55', 
        padding: '2px 10px', fontSize: '0.7rem', width: 'fit-content',
        margin: '2px auto', cursor: 'pointer'
    },
}