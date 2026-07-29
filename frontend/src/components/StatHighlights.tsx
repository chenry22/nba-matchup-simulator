import { useState, type CSSProperties } from "react";
import type { GameState, PlayerStats, ShotAttempt, Team } from "../sim/types";

interface Props { game: GameState; }

export default function StatHighlights({ game }: Props) {
  const headerStyle = { fontSize: '1.3rem', marginTop: '0px', fontWeight: 'bold', marginBottom: '10px' };

  const [aOffset, setAOffset] = useState(0);
  const [bOffset, setBOffset] = useState(0);

  function scoreForPeriod(period: number, team: Team) {
    return game.events.reduce((prev, curr) => {
      const shot = curr as ShotAttempt
      if (shot && shot.made && curr.period === period && curr.player.team === team) {
        return prev + shot.shot.points;
      }
      return prev;
    }, 0)
  }

  function shootingPct(attempts: number, made: number) : string {
    if (attempts > 0) {
      return (Math.round(made / attempts * 10000) / 100) + "%";
    } else {
      return "-";
    }
  }

  function gamescore(s: PlayerStats) {
    return s.fg3m + s.fgm * 2 + s.ftm
        + 0.4 * s.fgm - 0.7 * s.fga
        - 0.4 * (s.fta - s.ftm) 
        + 0.7 * s.oreb + 0.3 * s.dreb 
        + s.stl + 0.7 * s.ast + 0.7 * s.blk 
        - 0.4 * s.fl - s.tov;
  }

  function playerBlock(s: PlayerStats, id: number, season: string, color: string) {
    const labelStyle: CSSProperties = { fontSize: '0.7rem', opacity: '0.7', margin: '0 0.5rem 0 0.14rem' };
    return <div key={id + "-" + season + s.player} style={{ display: 'flex', gap: '12px', justifyContent: 'stretch', 
        padding: '10px', background: 'white', border: '1px solid gray', letterSpacing: '-0.002em'
    }}>
      <img style={{ maxWidth: '20%', maxHeight: '20dvh', objectFit: 'contain' }} src={`https://cdn.nba.com/headshots/nba/latest/260x190/${id}.png`}></img>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', color: 'black', gap: '4px' }}>
        <div style={{ color, fontWeight: 'bold' }}>{s.player} <span style={{ fontSize: '0.6rem', fontWeight: 'normal', opacity: 0.8 }}>({season})</span></div>
        <div>{s.fgm * 2 + s.ftm + s.fg3m}<span style={labelStyle}>pts</span> {s.oreb + s.dreb}<span style={labelStyle}>reb ({s.oreb}o)</span> {s.ast}<span style={labelStyle}>ast</span> {s.blk}<span style={labelStyle}>blk</span> {s.stl}<span style={labelStyle}>stl</span></div>
        <div style={{ display: 'flex', gap: '0', flexWrap: 'wrap'}}>
          <span style={{ whiteSpace: 'nowrap' }}>{s.fgm}/{s.fga}<span style={labelStyle}>fg ({shootingPct(s.fga, s.fgm)})</span></span> 
          <span style={{ whiteSpace: 'nowrap' }}>{s.fg3m}/{s.fg3a}<span style={labelStyle}>3p ({shootingPct(s.fg3a, s.fg3m)})</span></span> 
          <span style={{ whiteSpace: 'nowrap' }}>{s.ftm}/{s.fta}<span style={labelStyle}>ft ({shootingPct(s.fta, s.ftm)})</span></span>
        </div>
      </div>
    </div>;
  }

  return (
    <div>
      <div style={{display: 'flex', backgroundColor: 'white', padding: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid gray', textAlign: 'center' }}>
          <div style={{ padding: '0 14px 0 8px', color: game.teamA.color }}>{game.teamA.name}</div>
          <div style={{margin: '4px 0', borderBottom: '1px solid gray', width: '100%' }}></div>
          <div style={{ padding: '0 14px 0 8px', color: game.teamB.color }}>{game.teamB.name}</div>
        </div>
        { Array.from(Array(game.periods).keys()).map(period => 
          <div key={period} style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid gray', textAlign: 'center' }}>
            <div>{scoreForPeriod(period + 1, game.teamA)}</div>
            <div style={{margin: '4px 0', padding: '0 14px', borderBottom: '1px solid gray', width: '100%' }}></div>
            <div>{scoreForPeriod(period + 1, game.teamB)}</div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'center', padding: '0 12px', 
          fontWeight: 'bold', color: 'black', fontSize: '1.3rem'
        }}>
          <div>{game.score[0]}</div>
          <div style={{margin: '4px 0', borderBottom: '1px solid gray', width: '140%' }}></div>
          <div>{game.score[1]}</div>
        </div>
      </div>

      <div style={{
        display:' flex', flexDirection: 'column', justifyContent: 'stretch', alignItems: 'start', 
        gap: '20px', marginTop: '20px'
      }}>
        <div>
          <div style={{...headerStyle, color: game.teamA.color, width: '100%'}}>
            {game.teamA.name} <span style={{ fontSize: '0.8rem', opacity: '0.6', marginLeft: '4px'}}>(Top Performers)</span>
            
            <span style={{ color: 'black', fontSize: '1rem', float: 'right', userSelect: 'none' }}>
              <span 
                onClick={() => setAOffset(Math.max(0, aOffset - 2))}
                style={{ color: aOffset > 0 ? 'black' : 'lightgray', cursor: 'pointer' }}>&larr;</span>
              <span 
                onClick={() => setAOffset(aOffset + 2)}
                style={{ color: aOffset < game.teamA.roster.length - 2 ? 'black' : 'lightgray', cursor: 'pointer' }}>&rarr;</span>
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'stretch', flexDirection: 'column', gap: '4px' }}>
            { game.teamA.stats.sort((a, b) => gamescore(b) - gamescore(a)).slice(aOffset, aOffset + 2).map(s => {
                const p = game.teamA.roster.find(p => p.name === s.player);
                return playerBlock(s, p?.id ?? 0, p?.season ?? "", game.teamA.color);
            })}
          </div>
        </div>

        <div style={{ width: '100%' }}>
          <div style={{...headerStyle, color: game.teamB.color}}>
            {game.teamB.name} <span style={{ fontSize: '0.8rem', opacity: '0.6', marginLeft: '4px'}}>(Top Performers)</span>

            <span style={{ color: 'black', fontSize: '1rem', float: 'right', userSelect: 'none' }}>
              <span 
                onClick={() => setBOffset(Math.max(bOffset - 2, 0))}
                style={{ color: bOffset > 0 ? 'black' : 'lightgray', cursor: 'pointer' }}>&larr;</span>
              <span 
                onClick={() => setBOffset(bOffset + 2)}
                style={{ color: bOffset < game.teamB.roster.length - 2 ? 'black' : 'lightgray', cursor: 'pointer' }}>&rarr;</span>
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'stretch', flexDirection: 'column', gap: '4px' }}>
            { game.teamB.stats.sort((a, b) => gamescore(b) - gamescore(a)).slice(bOffset, bOffset + 2).map(s => {
                const p = game.teamB.roster.find(p => p.name === s.player);
                return playerBlock(s, p?.id ?? 0, p?.season ?? "", game.teamB.color);
            })}
          </div>
        </div>
      </div>
    </div>
  );
}