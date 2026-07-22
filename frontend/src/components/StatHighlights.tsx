import type { CSSProperties } from "react";
import type { GameState, PlayerStats, ShotAttempt, Team } from "../sim/types";

interface Props { game: GameState; }

export default function StatHighlights({ game }: Props) {
  const headerStyle = { fontSize: '1.3rem', marginTop: '0px', fontWeight: 'bold', marginBottom: '10px' };

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
    const labelStyle: CSSProperties = { fontSize: '0.7rem', opacity: '0.7', margin: '0 8px 0 4px' };
    return <div key={id} style={{ display: 'flex', gap: '12px', justifyContent: 'stretch', 
        padding: '10px', background: 'white', border: '1px solid gray'
    }}>
      <img style={{ maxWidth: '20%', maxHeight: '20dvh', objectFit: 'contain' }} src={`https://cdn.nba.com/headshots/nba/latest/260x190/${id}.png`}></img>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', color: 'black', gap: '4px' }}>
        <div style={{ color, fontWeight: 'bold' }}>{s.player} <span style={{ fontSize: '0.6rem', fontWeight: 'normal', opacity: 0.8 }}>({season})</span></div>
        <div>{s.fgm * 2 + s.ftm + s.fg3m}<span style={labelStyle}>pts</span> {s.oreb + s.dreb}<span style={labelStyle}>reb ({s.oreb}o)</span> {s.ast}<span style={labelStyle}>ast</span> {s.blk}<span style={labelStyle}>blk</span> {s.stl}<span style={labelStyle}>stl</span></div>
        <div>{s.fgm}/{s.fga}<span style={labelStyle}>fg ({shootingPct(s.fga, s.fgm)})</span> {s.fg3m}/{s.fg3a}<span style={labelStyle}>3p ({shootingPct(s.fg3a, s.fg3m)})</span> {s.ftm}/{s.fta}<span style={labelStyle}>ft ({shootingPct(s.fta, s.ftm)})</span></div>
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
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'center', padding: '0 8px', fontWeight: 'bold' }}>
          <div>{game.score[0]}</div>
          <div style={{margin: '4px 0', borderBottom: '1px solid gray', width: '100%' }}></div>
          <div>{game.score[1]}</div>
        </div>
      </div>

      <div style={{
        display:' flex', flexDirection: 'column', justifyContent: 'stretch', alignItems: 'start', 
        gap: '20px', marginTop: '20px'
      }}>
        <div>
          <div style={{...headerStyle, color: game.teamA.color}}>{game.teamA.name} <span style={{ fontSize: '0.8rem', opacity: '0.6', marginLeft: '4px'}}>(Top Performers)</span></div>
          <div style={{ display: 'flex', justifyContent: 'stretch', flexDirection: 'column', gap: '4px' }}>
            { game.teamA.stats.sort((a, b) => gamescore(b) - gamescore(a)).slice(0, 2).map(s => {
                const p = game.teamA.roster.find(p => p.name === s.player);
                return playerBlock(s, p?.id ?? 0, p?.season ?? "", game.teamA.color);
            })}
          </div>
        </div>

        <div>
          <div style={{...headerStyle, color: game.teamB.color}}>{game.teamB.name} <span style={{ fontSize: '0.8rem', opacity: '0.6', marginLeft: '4px'}}>(Top Performers)</span></div>
          <div style={{ display: 'flex', justifyContent: 'stretch', flexDirection: 'column', gap: '4px' }}>
            { game.teamB.stats.sort((a, b) => gamescore(b) - gamescore(a)).slice(0, 2).map(s => {
                const p = game.teamB.roster.find(p => p.name === s.player);
                return playerBlock(s, p?.id ?? 0, p?.season ?? "", game.teamB.color);
            })}
          </div>
        </div>
      </div>
    </div>
  );
}