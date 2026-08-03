import { useState, type CSSProperties } from "react";
import TeamBuilder from "../components/TeamBuilder";
import CourtView from "../components/CourtView";
import BoxScore from "../components/BoxScore";
import PlayByPlay from "../components/PlayByPlay";
import type { Player, PlayerSelect, PlayerStats, Team } from "../sim/types";
import { useSimulation } from "../sim/useSimulation";
import { getCachedPlayerData } from "../cache/firebase";
import StatHighlights from "../components/StatHighlights";
import RatingPreviewBlock from "../components/ratings/RatingPreviewBlock";
import PlayerIndex from "../components/PlayerIndex";
import FullRatingProfile from "../components/ratings/FullRatingProfile";
import { getOverall, getRatings } from "../components/ratings/Ratings";
import { useNavigate } from "react-router-dom";

export default function SimulatorPage() {
  const [teamA, setTeamA] = useState<Team>({ name: "Team A", color: '#af1e1e', rosterSelect: [], roster: [], stats: []});
  const [teamB, setTeamB] = useState<Team>({ name: "Team B", color: '#2735b1', rosterSelect: [], roster: [], stats: []});
  
  const [playerIndex, setPlayerIndex] = useState<Record<string, Player[]>>({});
  const [playerIndexSeason, setPlayerIndexSeason] = useState<string>("2025-26");
  const [playerIndexTeamFilter, setPlayerIndexTeamFilter] = useState<string>("");
  const [playerIndexPosFilter, setPlayerIndexPosFilter] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'teamBuilder' | 'simulator' | 'players'>('teamBuilder');

  const [showRatingProfile, setRatingProfileOverlay] = useState<Player | undefined>(undefined);
  const [showBoxScore, setShowBoxScore] = useState(false);

  const { game, clearGame, runSim, settings, setSettings } = useSimulation();
  const nav = useNavigate();

  const loadRosterStats = async (players: PlayerSelect[]) => {
    let playerObjs = await Promise.all(
      players.map(async player => {
        let cached = await getCachedPlayerData(player.id, player.selectedSeason);
        if (cached) { 
          console.log("Found cached data.");
          return cached as Player;
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
    clearGame();
    setLoading(false);
    teamAStats = teamAStats.filter(p => p !== undefined);
    teamBStats = teamBStats.filter(p => p !== undefined);
    teamAStats.forEach(p => p.ratings = getRatings(p));
    teamBStats.forEach(p => p.ratings = getRatings(p));

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

  return (
    <div style={styles.container}>
      <div className="wide-tabs" style={{ gap: '0.8rem', margin: '10px 16px 0' }}>
        <div onClick={() => nav('/')} style={{ color: 'white', alignSelf: 'center', marginLeft: '20px', cursor: 'pointer' }}>⌂ Home</div>
        <div style={tab === 'teamBuilder' ? styles.activeTab : styles.tab} onClick={() => setTab('teamBuilder')}>Build Teams</div>
        <div style={tab === 'simulator' ? styles.activeTab : styles.tab} onClick={() => setTab('simulator')}>Simulate</div>
        <div style={tab === 'players' ? styles.activeTab : styles.tab} onClick={() => setTab('players')}>Player Index</div>
      </div>

      <div className="mobile-tabs" style={{ gap: '0.6rem', margin: '10px 16px 0' }}>
        <div onClick={() => nav('/')} style={{ color: 'white', alignSelf: 'center', marginLeft: '20px', cursor: 'pointer' }}>⌂ Home</div>
        <div style={tab === 'teamBuilder' ? styles.activeTab : styles.mobileTab} onClick={() => setTab('teamBuilder')}>Teams</div>
        <div style={tab === 'simulator' ? styles.activeTab : styles.mobileTab} onClick={() => setTab('simulator')}>Sim</div>
        <div style={tab === 'players' ? styles.activeTab : styles.mobileTab} onClick={() => setTab('players')}>Players</div>
      </div>

      <div style={{...styles.page, display: tab === 'players' ? 'block' : 'none'}}>
        <PlayerIndex players={playerIndex} setPlayers={setPlayerIndex} 
          season={playerIndexSeason} setSeason={setPlayerIndexSeason}
          teamFilter={playerIndexTeamFilter} setTeamFilter={setPlayerIndexTeamFilter}
          posFilter={playerIndexPosFilter} setPosFilter={setPlayerIndexPosFilter}/>
      </div>

      { tab === 'teamBuilder' && 
        <div style={styles.page}>
          <div className="mobile-wrap" style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <TeamBuilder team={teamA} setTeam={setTeamA}/>
            <TeamBuilder team={teamB} setTeam={setTeamB}/>
          </div>

          { loading ? 
            <p>Loading...</p>
          :
            <div onClick={loadRosters} style={styles.button}>
              Load Rosters
            </div>
          }
        </div>
      }

      { tab === 'simulator' && 
        <div style={{...styles.page, textAlign: 'left'}}>
          { loading ? <div>Loading player profiles...</div>
            :  <>
            <div style={styles.ratingPreviews}>
              <h2 style={{ color: teamA.color, margin: 0, fontSize: '1.4rem' }}>{teamA.name}</h2>
              <div style={styles.horizontalScroll}>
                { teamA.roster.sort((a, b) => getOverall(b.ratings) - getOverall(a.ratings)).map(p => <RatingPreviewBlock p={p} setRatingProfileOverlay={() => setRatingProfileOverlay(p)}/>)}
              </div>
            </div>
            <div style={{height: '1rem' }}></div>
            <div style={styles.ratingPreviews}>
              <h2 style={{ color: teamB.color, margin: 0, fontSize: '1.4rem' }}>{teamB.name}</h2>
              <div style={styles.horizontalScroll}>
                { teamB.roster.sort((a, b) => getOverall(b.ratings) - getOverall(a.ratings)).map(p => <RatingPreviewBlock p={p} setRatingProfileOverlay={() => setRatingProfileOverlay(p)}/>)}
              </div>
            </div>
            </>
          }

          <div style={{...styles.row, margin: '24px 20px 0', justifyContent: 'center', color: 'darkblue', 
            gap: '1.6rem', flexWrap: 'wrap', rowGap: '10px'
          }}>
            <div style={styles.settingsRow}>
              <span>Periods</span>
              <input type="number" defaultValue={settings.periods} id="periods"
                min={1} max={4} style={{fontSize: '0.7rem', padding: '2px'}}
                onChange={(e) => setSettings({...settings, periods: parseInt(e.target.value)})}
              ></input>
            </div>
            <div style={styles.settingsRow}>
              <span>Period Length (mins)</span>
              <input type="number" defaultValue={settings.periodLength} id="period-length"
                min={1} max={12} style={{fontSize: '0.7rem', padding: '2px'}}
                onChange={(e) => setSettings({...settings, periodLength: parseInt(e.target.value)})}
              ></input>
            </div>
            <div style={styles.settingsRow}>
              <span>Shot Clock (s)</span>
              <input type="number" defaultValue={settings.shotClockLength} id="shot-clock"
                min={6} max={30} style={{fontSize: '0.7rem', padding: '2px'}}
                onChange={(e) => setSettings({...settings, shotClockLength: parseInt(e.target.value)})}
              ></input>
            </div>
          </div>
          <div style={{...styles.button, fontSize: '1.2rem', fontWeight: 'bold', padding: '10px 20px', margin: '20px auto 36px' }} onClick={() => {
            if (teamA.roster.length === 0 || teamB.roster.length === 0) { 
              alert("Build your teams in the 'Build Teams' tab! When you're finished, load the player profiles with the 'Load Rosters' button");
              return;
            }
            setTeamA({ ...teamA, stats: teamA.stats.map(p => emptyStats(p.player)) });
            setTeamB({ ...teamB, stats: teamB.stats.map(p => emptyStats(p.player)) });
            runSim(teamA, teamB);
          }}>Simulate</div>

          { game && 
            <div style={{ display: 'flex',  gap: '14px', justifyContent: 'center', alignItems: 'start' }}
              className="mobile-wrap"
            >
              <div style={{ flexBasis: '52%' }}>  
                <StatHighlights game={game}/>
                <div style={{...styles.button, fontSize: '1rem', padding: '10px 12px', marginTop: '14px'}}
                  onClick={() => setShowBoxScore(true)}
                >View Box Score</div>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '14px', flexBasis: '48%', flexShrink: '1' }}>
                <CourtView events={game.events} />
                <PlayByPlay events={game.events} teams={[game.teamA, game.teamB]} />
              </div>
            </div>
          }

          { showRatingProfile && <FullRatingProfile showRatingProfile={showRatingProfile} setRatingProfileOverlay={setRatingProfileOverlay}/> }

          { showBoxScore && game &&
            <div style={{ position: 'fixed', background: '#00000075', 
              width: '100%', height: '100%', top: 0, left: 0
            }} onClick={() => setShowBoxScore(false)}>
              <div style={{...styles.overlayBg, width: '70%', maxWidth: '940px',}} onClick={(e) => e.stopPropagation()}>
                <BoxScore game={game}/>
                <span style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '1.3rem', lineHeight: '1.5rem', fontWeight: 'bold',
                  backgroundColor: 'darkblue', borderRadius: '24px', padding: '4px 12px', cursor: 'pointer', color: 'white'
                }} onClick={() => setShowBoxScore(false)}
                >x</span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  );
}

const bgColor = '#fffefa';
const styles: Record<string, CSSProperties> = {
  container: {
    width: '100dvw', height: '100dvh', display: 'flex', flexDirection: 'column'
  },
  row: { display: 'flex', gap: '10px', alignItems: 'center' },
  settingsRow: { display: 'flex', gap: '0.4rem', alignItems: 'center', whiteSpace: 'nowrap' },
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
    padding: '2px 10px', fontSize: '0.8rem', width: 'fit-content',
    margin: '16px auto', cursor: 'pointer'
  },

  activeTab : {
    background: bgColor,
    padding: '12px 16px', cursor: 'pointer', color: 'black',
  },
  tab: {
    background: bgColor, opacity: 0.8,
    padding: '12px 16px', cursor: 'pointer',
  },
  mobileTab: {
    background: bgColor, opacity: 0.8,
    padding: '8px 12px', cursor: 'pointer',
  },

  page: {
    background: bgColor, margin: '0 16px 16px', flexGrow: '10', padding: '14px'
  },

  ratingsPreview: {

  },
  horizontalScroll: {
    overflowX: 'auto', display: 'flex', gap: '10px', padding: '6px 8px'
  }
};