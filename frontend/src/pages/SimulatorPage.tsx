import { useEffect, useState, type CSSProperties } from "react";
import TeamBuilder from "../components/TeamBuilder";
import CourtView from "../components/CourtView";
import BoxScore from "../components/BoxScore";
import PlayByPlay from "../components/PlayByPlay";
import type { Player, PlayerSelect, PlayerStats, Team } from "../sim/types";
import { useSimulation } from "../sim/useSimulation";
import { cachePlayerData, getCachedPlayerData } from "../cache/firebase";
import { getActivePlayers, getPlayerData } from "../api/client";
import RatingsBlock from "../components/RatingsBlock";
import { teamStyles } from "../components/TeamColors";
import { getOverall, getRatings } from "../components/Ratings";
import StatHighlights from "../components/StatHighlights";

export default function SimulatorPage() {
  const [bgLoad, setbgLoad] = useState(false);
  useEffect(() => {
    const load = async () => {
      if (bgLoad) return;
      if (window.confirm("load?")) {
        setbgLoad(true);
        const ids: number[] = (await getActivePlayers()).data;
        for (var id of ids) {
          let cached = await getCachedPlayerData(id, '2025-26');
          if (cached) { 
            console.log("Found cached data.");
            continue;
          }

          let data = await getPlayerData(id, '2025-26');
          if (data) {
            let p = data.data as Player
            cachePlayerData(p);
            console.log("Cached " + p.name);
          }
        }
      }
    }
    load();
  }, []);

  const [teamA, setTeamA] = useState<Team>({ name: "Team A", color: "red", rosterSelect: [], roster: [], stats: []});
  const [teamB, setTeamB] = useState<Team>({ name: "Team B", color: "blue", rosterSelect: [], roster: [], stats: []});

  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'teamBuilder' | 'simulator'>('teamBuilder');

  const [showRatingProfile, setRatingProfileOverlay] = useState<Player | undefined>(undefined);
  const [showBoxScore, setShowBoxScore] = useState(false);

  const { game, runSim, settings, setSettings } = useSimulation();

  const loadRosterStats = async (players: PlayerSelect[]) => {
    let playerObjs = await Promise.all(
      players.map(async player => {
        let cached = await getCachedPlayerData(player.id, player.selectedSeason);
        if (cached) { 
          console.log("Found cached data.");
          return cached as Player;
        }

        let data = await getPlayerData(player.id, player.selectedSeason);
        if(data) {
          let p = data.data as Player;
          cachePlayerData(p);
          return p;
        }
        return undefined;
      })  
    );
    let count = new Map();
    const playersFound = playerObjs.filter(p => p !== undefined);
    playersFound.forEach(p => {
      let key = p.name.split(" (")[0];
      if (count.has(p.name)) {
        let val = count.get(p.name);
        count.set(p.name, val + 1);
        p.name += " [" + val + "]";
      } else if (count.has(key)) {
        let val = count.get(key);
        p.name += " [" + val + "]";
        count.set(key, val + 1);
      } else {
        count.set(p.name, 1);
      }
    });
    return playersFound;
  };

  const loadRosters = async () => {
    if (teamA.rosterSelect.length !== teamB.rosterSelect.length) alert("Teams must have the same number of players");
    if (teamA.rosterSelect.length === 0) alert("Add players to simulate!");

    setTab('simulator');
    setLoading(true);
    var [teamAStats, teamBStats] = await Promise.all(
      [ loadRosterStats(teamA.rosterSelect), loadRosterStats(teamB.rosterSelect) ]
    );
    setLoading(false);
    teamAStats = teamAStats.filter(p => p !== undefined);
    teamBStats = teamBStats.filter(p => p !== undefined);

    setTeamA({ ...teamA, roster: teamAStats, stats: teamAStats.map(p => emptyStats(p.name)) });
    setTeamB({ ...teamB,  roster: teamBStats, stats: teamBStats.map(p => emptyStats(p.name)) });
  };

  function emptyStats(name: string): PlayerStats {
    return { player: name, fga: 0, fgm: 0,
      fg3a: 0, fg3m: 0, fta: 0, ftm: 0,
      ast: 0, dreb: 0, oreb: 0, 
      stl: 0, blk: 0, tov: 0, fl: 0
    }
  }

  function ratingBlock(p: Player) {
    const ovr = getOverall(getRatings(p));
    return <div key={p.id} 
      style={{ display: 'flex', gap: '10px', background: 'white', padding: '10px', 
        borderRadius: '8px', border: '2px solid gray', cursor: 'pointer',
      }}
      onClick={() => setRatingProfileOverlay(p)}
    >
      <img src={`https://cdn.nba.com/headshots/nba/latest/260x190/${p.id}.png`}
        style={{ maxWidth: '110px', maxHeight: '90px', objectFit: 'contain'}}></img>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', gap: '4px' }}>
        <span style={{ color: 'black', whiteSpace: 'nowrap' }}><b>{p.name}</b> <span style={{ fontSize: '0.7rem', opacity: '0.7', marginLeft: '2px' }}>({p.season})</span></span>
        <span style={{ whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: 'bold', color: `rgb(${5 * Math.max(0, 70 - ovr)}, ${3 * Math.max(0, ovr - 30)}, 80)` }}>{Math.round(ovr)} OVR</span>
          <span style={{...teamStyles[p.team], 
              borderRadius: '8px', borderWidth: '1px', margin: ' 0 12px', padding: '3px 5px',
              fontWeight: 'bold', fontSize: '0.7rem'
            }}>{p.team}</span>
          <span style={{ fontSize: '0.8rem'}}>{p.position}</span>
        </span>

        <div style={styles.button}>View Player Profile</div>
      </div>
    </div>
  }

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', gap: '20px', margin: '10px 16px 0' }}>
        <div style={tab === 'teamBuilder' ? styles.activeTab : styles.tab} onClick={() => setTab('teamBuilder')}>Build Teams</div>
        <div style={tab === 'simulator' ? styles.activeTab : styles.tab} onClick={() => setTab('simulator')}>Simulate</div>
      </div>

      { tab === 'teamBuilder' && 
        <div style={styles.page}>
          <h2 style={{ fontWeight: 'bold' }}>Build Teams</h2>

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <div>
              <h3>Team A</h3>
              <TeamBuilder team={teamA} setTeam={setTeamA}/>
            </div>

            <div>
              <h3>Team B</h3>
              <TeamBuilder team={teamB} setTeam={setTeamB}/>
            </div>
          </div>

          { loading ? 
            <p>Loading...</p>
          :
            <button onClick={loadRosters} style={styles.button}>
              Load Rosters
            </button>
          }
        </div>
      }

      { tab === 'simulator' && 
        <div style={{...styles.page, textAlign: 'left'}}>
          { loading ? <div>Loading player profiles...</div>
            :  <>
            <div style={styles.ratingPreviews}>
              <h2>{teamA.name}</h2>
              <div style={styles.horizontalScroll}>
                { teamA.roster.map(ratingBlock)}
              </div>
            </div>
            <div style={{height: '20px' }}></div>
            <div style={styles.ratingPreviews}>
              <h2>{teamB.name}</h2>
              <div style={styles.horizontalScroll}>
                { teamB.roster.map(ratingBlock)}
              </div>
            </div>
            </>
          }

          <div style={{...styles.row, marginTop: '24px', justifyContent: 'center'}}>
            <div style={styles.row}>
              <span>Periods</span>
              <input type="number" defaultValue={settings.periods} id="periods"
                min={1} max={4}
                onChange={(e) => setSettings({...settings, periods: parseInt(e.target.value)})}
              ></input>
            </div>
            <div style={styles.row}>
              <span>Period Length (minutes)</span>
              <input type="number" defaultValue={settings.periodLength} id="period-length"
                min={1} max={12}
                onChange={(e) => setSettings({...settings, periodLength: parseInt(e.target.value)})}
              ></input>
            </div>
            <div style={styles.row}>
              <span>Shot Clock (seconds)</span>
              <input type="number" defaultValue={settings.shotClockLength} id="shot-clock"
                min={6} max={30}
                onChange={(e) => setSettings({...settings, shotClockLength: parseInt(e.target.value)})}
              ></input>
            </div>
          </div>
          <div style={{...styles.button, fontSize: '1.2rem', fontWeight: 'bold', padding: '10px 20px', margin: '14px auto' }} onClick={() => {
            setTeamA({ ...teamA, stats: teamA.stats.map(p => emptyStats(p.player)) });
            setTeamB({ ...teamB, stats: teamB.stats.map(p => emptyStats(p.player)) });
            runSim(teamA, teamB);
          }}>Simulate</div>

          { game && 
            <div style={{ display: 'flex',  gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ flexBasis: '50%' }}>  
                <StatHighlights game={game}/>
                <div style={{...styles.button, marginTop: '14px'}}
                  onClick={() => setShowBoxScore(true)}
                >View Box Score</div>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '14px', flexBasis: '50%', flexShrink: '1' }}>
                <CourtView events={game.events} />
                <PlayByPlay events={game.events} teams={[game.teamA, game.teamB]} />
              </div>
            </div>
          }

          { showRatingProfile && 
            <div style={{ position: 'fixed', background: '#00000075', 
              width: '100%', height: '100%', top: 0, left: 0
            }} onClick={() => setRatingProfileOverlay(undefined)}>
              <div style={{...styles.overlayBg, maxWidth: '60%', minWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
                <RatingsBlock p={showRatingProfile}></RatingsBlock>
              </div>
              <span style={{ position: 'absolute', top: '2dvh', right: '15%', fontSize: '1.3rem', lineHeight: '1.5rem', fontWeight: 'bold',
                  backgroundColor: 'darkblue', borderRadius: '24px', padding: '6px 12px', cursor: 'pointer', color: 'white'
                }} onClick={() => setRatingProfileOverlay(undefined)}
                >x</span>
            </div>
          }

          { showBoxScore && game &&
            <div style={{ position: 'fixed', background: '#00000075', 
              width: '100%', height: '100%', top: 0, left: 0
            }} onClick={() => setShowBoxScore(false)}>
              <div style={{...styles.overlayBg, maxWidth: '80%', minWidth: '440px',}} onClick={(e) => e.stopPropagation()}>
                <BoxScore game={game}/>
              </div>
              <span style={{ position: 'absolute', top: '2dvh', right: '6%', fontSize: '1.3rem', lineHeight: '1.5rem', fontWeight: 'bold',
                  backgroundColor: 'darkblue', borderRadius: '24px', padding: '6px 12px', cursor: 'pointer', color: 'white'
                }} onClick={() => setShowBoxScore(false)}
                >x</span>
            </div>
          }
        </div>
      }
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    width: '100dvw', height: '100dvh', display: 'flex', flexDirection: 'column'
  },
  row: { display: 'flex', gap: '10px' },
  col: { display: 'flex', flexDirection: 'column', gap: '10px' },
  overlayBg : {
    display: 'flex', flexDirection: 'column',
    padding: '20px 32px', margin: '4dvh auto', 
    background: 'white', height: '86dvh', position: 'relative',
    justifyContent: 'left', textAlign: 'left', gap: '2px', 
    overflowY: 'auto'
  },

  button: { 
    color: 'white', background: '#240b55', 
    padding: '2px 10px', fontSize: '0.7rem', width: 'fit-content',
    margin: '2px auto', cursor: 'pointer'
  },

  activeTab : {
    background: '#fff8ea',
    padding: '12px 16px', cursor: 'pointer', color: 'black',
  },
  tab: {
    background: '#fff8ea', opacity: 0.8,
    padding: '12px 16px', cursor: 'pointer',
  },

  page: {
    background: '#fff8ea', margin: '0 16px 16px', flexGrow: '10', padding: '14px'
  },

  ratingsPreview: {

  },
  horizontalScroll: {
    overflowX: 'auto', display: 'flex', gap: '10px'
  }
};