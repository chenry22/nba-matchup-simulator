import type { GameState, PlayerStats, ShotAttempt, Team } from "../sim/types";

interface Props {
  game: GameState;
}

export default function BoxScore({ game }: Props) {
  const headerStyle = { fontSize: '1.3rem', marginTop: '0px', fontWeight: 'bold', marginBottom: '10px' };

  function shootingPct(attempts: number, made: number) : string {
    if (attempts > 0) {
      return (Math.round(made / attempts * 10000) / 100) + "%";
    } else {
      return "-";
    }
  }

  function playerBlock(s: PlayerStats, season: string ) {
    return <tr>
      <td>{s.player.split(" ")[0][0] + ". " + s.player.split(" ")[1]} <span style={{ fontSize: '0.5rem', opacity: 0.8 }}>({season})</span></td>
      <td>{s.fgm * 2 + s.ftm + s.fg3m}</td>
      <td>{s.oreb + s.dreb}</td>
      <td>{s.oreb}</td>
      <td>{s.dreb}</td>
      <td>{s.ast}</td>
      <td>{s.blk}</td>
      <td>{s.stl}</td>
      <td>{s.tov}</td>
      {/* <td>FL</td> */}
      <td>{s.fgm}/{s.fga}</td>
      <td>{shootingPct(s.fga, s.fgm)})</td>
      <td>{s.fg3m}/{s.fg3a}</td>
      <td>{shootingPct(s.fg3a, s.fg3m)}</td>
      <td>{s.ftm}/{s.fta}</td>
      <td>{shootingPct(s.fta, s.ftm)}</td>
    </tr>
  }

  function totalStatsRow(s: PlayerStats[]) {
    return <tr style={{ fontWeight: 'bold'}}>
      <td style={{background: 'black'}}></td>
      <td>{s.reduce((tot, s) => tot + s.fgm * 2 + s.ftm + s.fg3m, 0)}</td>
      <td>{s.reduce((tot, s) => tot + s.oreb + s.dreb, 0)}</td>
      <td>{s.reduce((tot, s) => tot + s.oreb, 0)}</td>
      <td>{s.reduce((tot, s) => tot + s.dreb, 0)}</td>
      <td>{s.reduce((tot, s) => tot + s.ast, 0)}</td>
      <td>{s.reduce((tot, s) => tot + s.blk, 0)}</td>
      <td>{s.reduce((tot, s) => tot + s.stl, 0)}</td>
      <td>{s.reduce((tot, s) => tot + s.tov, 0)}</td>
      {/* <td>FL</td> */}
      <td>{s.reduce((tot, s) => tot + s.fgm, 0)}/{s.reduce((tot, s) => tot + s.fga, 0)}</td>
      <td>{shootingPct(s.reduce((tot, s) => tot + s.fga, 0), s.reduce((tot, s) => tot + s.fgm, 0))}</td>
      <td>{s.reduce((tot, s) => tot + s.fg3m, 0)}/{s.reduce((tot, s) => tot + s.fg3a, 0)}</td>
      <td>{shootingPct(s.reduce((tot, s) => tot + s.fg3a, 0), s.reduce((tot, s) => tot + s.fg3m, 0))}</td>
      <td>{s.reduce((tot, s) => tot + s.ftm, 0)}/{s.reduce((tot, s) => tot + s.fta, 0)}</td>
      <td>{shootingPct(s.reduce((tot, s) => tot + s.fta, 0), s.reduce((tot, s) => tot + s.ftm, 0))}</td>
    </tr>
  }

  return (
    <div style={{
      display:' flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'start',
      margin: 'auto 0'
    }}>
      <div style={{...headerStyle, color: game.teamA.color}}>{game.teamA.name}</div>
      <div style={{ width: '100%', overflow: 'auto' }}>
        <table className="stat-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>PTS</th>
              <th>REB</th>
              <th>OREB</th>
              <th>DREB</th>
              <th>AST</th>
              <th>BLK</th>
              <th>STL</th>
              <th>TOV</th>
              {/* <th>FL</th> */}
              <th>FG</th>
              <th>FG%</th>
              <th>3P</th>
              <th>3P%</th>
              <th>FT</th>
              <th>FT%</th>
            </tr>
          </thead>
          <tbody>
            { game.teamA.stats.map(s =>
              playerBlock(s, game.teamA.roster.find(p => p.name === s.player)?.season ?? "")
            )}
            { totalStatsRow(game.teamA.stats) }
          </tbody>
        </table>
      </div>

      <div style={{...headerStyle, color: game.teamB.color, marginTop: '32px'}}>{game.teamB.name}</div>
      <div style={{ width: '100%', overflow: 'auto' }}>
        <table className="stat-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>PTS</th>
              <th>REB</th>
              <th>OREB</th>
              <th>DREB</th>
              <th>AST</th>
              <th>BLK</th>
              <th>STL</th>
              <th>TOV</th>
              {/* <th>FL</th> */}
              <th>FG</th>
              <th>FG%</th>
              <th>3P</th>
              <th>3P%</th>
              <th>FT</th>
              <th>FT%</th>
            </tr>
          </thead>
          <tbody>
            { game.teamB.stats.map(s =>
              playerBlock(s, game.teamB.roster.find(p => p.name === s.player)?.season ?? "")
            )}
            { totalStatsRow(game.teamB.stats) }
          </tbody>
        </table>
      </div>
    </div>
  );
}