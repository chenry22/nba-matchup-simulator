// src/components/PlayByPlay.tsx
import type { Event, Foul, Pass, PlayerInfo, Rebound, ShotAttempt, Team, Turnover } from "../sim/types";

interface Props {
  events: Event[];
  teams: Team[];
}

export default function PlayByPlay({ events, teams }: Props) {
  function timestampString(seconds: number) {
    let m = Math.floor(seconds / 60);
    let s = seconds % 60;
    return `${(m < 10 ? "0" : "") + m}:${(s < 10 ? "0" : "") + s}`
  }

  function getScore(time: number) {
    let relevant = events.filter(e => {
      return e.timestamp <= time && ((e.type === "shot" && (e as ShotAttempt).made) || (e.type === "foul" && (e as Foul).free_throws_made > 0))
    });
    let scores = relevant.reduce((prev, curr) => {
      let pts = curr.type === "shot" ? (curr as ShotAttempt).shot.points : (curr as Foul).free_throws_made;
      if (isOnTeam(curr.player, teams[0])) {
        return [prev[0] + pts, prev[1]];
      } else {
        return [prev[0], prev[1] + pts];
      }
    }, [0, 0]);
    return <><span style={{ color: teams[0].color, fontWeight: 'bold' }}>{scores[0]}</span> - <span style={{ color: teams[1].color, fontWeight: 'bold' }}>{scores[1]}</span></>
  }
  function isOnTeam(player: PlayerInfo, team: Team) {
    return player.team === team;
  }

  function getShotDefenseCaption(shot: Event) {
    const s = shot as ShotAttempt;
    const defStyle = { fontSize: '0.65rem', lineHeight: '0.5rem', fontWeight: 'normal' }
    if (s.blocked) {
      return <span style={{...defStyle, fontSize: '0.7rem', lineHeight: '0.7rem', 
        fontWeight: 'bold', color: s.defended_by.team.color 
      }}>Blocked by {s.defended_by.name}</span>
    } else {
      return <span style={{...defStyle, opacity: s.contest_pct * 0.7 + 0.5, color: 'black' }}>
        {Math.round(s.contest_pct * 10000) / 100}% contested by <span style={{ opacity: 1, color: s.defended_by.team.color}}>{s.defended_by.name}</span>
      </span>
    }
  }

  function getPlayCaption(play: Event) {
    if (play.type === 'shot') {
      let shot = play as ShotAttempt;
      return <div style={{ display: 'flex', gap: '10px', alignItems: 'center'}}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', alignItems: 'center'}}>
          <span style={{ fontSize: '0.8rem' }}>Q{play.period} ({timestampString(shot.timestamp)})</span>
          { shot.made && <span>{getScore(shot.timestamp)}</span> }
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', 
          alignItems: 'start', gap: '10px', borderLeft: '1px solid gray', 
          paddingLeft: '10px', marginBottom: '6px'
        }}>
          <div style={{ fontSize: '0.8rem', lineHeight: '0.9rem', 
            color: shot.player.team.color, fontWeight: shot.made ? 'bold' : 'normal',
            opacity: shot.made ? 1 : 0.7
          }}>
            {shot.player.name} {shot.made ? "makes " : "misses "} {shot.shot.points}pt {shot.shot.type.trim()}
          </div>
          { shot.assisted_by && shot.made &&  
            <div style={{ fontSize: '0.7rem', lineHeight: '0.6rem', opacity: 1, color: 'black' }}>Assist by <span style={{color: shot.assisted_by.team.color}}>{shot.assisted_by.name}</span></div>
          }
          {getShotDefenseCaption(shot)}
        </div>
      </div>;
    } else if (play.type === "pass") {
      const pass = play as Pass;
      return <div style={{ fontSize: '0.65rem', lineHeight: '0.7rem' }}>
        Q{play.period} ({timestampString(play.timestamp)})
        <span style={{ opacity: 0.6, margin: '0 10px'}}>|</span>
        <span>
          <span style={{color: pass.player.team.color}}>{pass.player.name}</span> passes to <span style={{color: pass.player.team.color}}>{pass.pass_to.name}</span>
        </span>
      </div>
    } else if (play.type === 'rebound') {
      const reb = play as Rebound;
      return <div style={{ fontSize: '0.65rem', lineHeight: '0.7rem' }}>
        Q{play.period} ({timestampString(play.timestamp)})
        <span style={{ opacity: 0.6, margin: '0 10px'}}>|</span>
        <span style={{ fontWeight: reb.offensive ? 'bold' : 'normal', color: reb.offensive ? reb.player.team.color : 'inherit' }}>
          {reb.offensive ? "Offensive rebound " : "Defensive rebound "} by <span style={{color: reb.player.team.color}}>{reb.player.name}</span>
        </span>
      </div>
    } else if (play.type === 'foul') {
      const fl = play as Foul;
      return <div style={{ display: 'flex', gap: '10px', alignItems: 'center'}}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', alignItems: 'center', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: '0.8rem' }}>Q{play.period} ({timestampString(fl.timestamp)})</span>
          <span>{getScore(fl.timestamp)}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', 
          alignItems: 'start', gap: '10px', borderLeft: '1px solid gray', 
          paddingLeft: '10px', marginBottom: '6px'
        }}>
          <div style={{ fontSize: '0.8rem', lineHeight: '0.9rem' }}>
            <span style={{ color: fl.player.team.color }}>{fl.player.name}</span> fouled by <span style={{ color: fl.fouled_by.team.color }}>{fl.fouled_by.name}</span> on a {fl.shot.points}pt {fl.shot.type.trim()} attempt
          </div>
          <div style={{ color: fl.player.team.color, fontSize: '0.7rem', lineHeight: '0.7rem'}}>
            {fl.free_throws_made}/{fl.free_throws_attempted} free throws made
          </div>
        </div>
      </div>;
    } else if (play.type === 'turnover') {
      const tov = play as Turnover;
      const stolen_by = tov.stolen_by;
      return <div style={{ fontSize: '0.65rem', lineHeight: '0.6rem' }}>
        Q{play.period} ({timestampString(play.timestamp)})
        <span style={{ opacity: 0.6, margin: '0 10px'}}>|</span>
        { stolen_by ? 
          <span style={{ fontSize: '0.8rem', lineHeight: '1rem', color: stolen_by.team.color,
            fontWeight: 'bold'
          }}>
            {stolen_by.name} steals the ball from <span style={{ color: tov.player.team.color, fontWeight: 'normal' }}>{tov.player.name}</span>
          </span>
        : 
          <span style={{ color: tov.player.team.color, fontSize: '0.7rem' }}>{tov.player.name} turns the ball over</span>
        }
      </div>
    }
  }

  return (
    <div style={{ flexGrow: 20, flexBasis: '80%', backgroundColor: 'white', padding: '8px 14px', marginBottom: '36px' }}>
      <p style={{ margin: 0, padding: 0 }}><b>Play-by-Play</b></p>
      <div style={{ maxHeight: '48dvh', overflowY: "auto", display: 'flex', flexDirection: 'column' }}>
        { events.map((play, i) => (
          <div key={i} style={{ borderBottom: '1px solid lightgray', paddingBottom: '8px', margin: '4px 2px'}}>
            {getPlayCaption(play)}
          </div>
        ))}
      </div>
    </div>
  );
}