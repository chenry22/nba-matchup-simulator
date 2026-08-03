import { useState, type ChangeEvent } from "react";
import PlayerSearch from "./PlayerSearch";
import type { Team } from "../sim/types";
import { loadRandomPlayers, type FirebasePlayerMatch } from "../cache/firebase";

interface Props {
  team: Team;
  setTeam: (team: Team) => void;
}

export default function TeamBuilder({ team, setTeam }: Props) {
  const addPlayer = async (player: FirebasePlayerMatch) => {
    if (team.rosterSelect.length >= 5) return;
    let seasons = player.seasons;
    let dup = team.rosterSelect.filter(p => p.id ===  player.id).length;
    let p = {
      full_name: player.firstName + " " + player.lastName, id: player.id,
      duplicate: dup, seasons, selectedSeason: seasons.sort()[seasons.length - 1]
    }
    setTeam({...team, rosterSelect: [...team.rosterSelect, p]});
  };

  const removePlayer = (index: number) => {
    setTeam({...team, rosterSelect: team.rosterSelect.filter((_, i) => i !== index)});
  };

  const setSeason = (index: number, e: ChangeEvent<HTMLSelectElement, HTMLSelectElement>) => {
    let newTeam = team.rosterSelect.map((p, i) => {
      if (i === index) {
        p.selectedSeason = e.target.value;
        return p;
      }
      return p;
    });
    setTeam({...team, rosterSelect: newTeam});
  }

  const getRandomPlayers = async () => {
    const players = await loadRandomPlayers(randCount)
    setTeam({...team, rosterSelect: players})
  }

  const setColor = (color: string) => setTeam({ ...team, color });
  const setName = (name: string) =>  setTeam({...team, name});

  const [randCount, setRandCount] = useState(5);

  const buttonStyle = { color: 'black', border: '1px solid lightgray', padding: '3px 6px', 
    background: 'white', borderRadius: '4px', cursor: 'pointer', 
    display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.7rem'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '12px 20px',
      backgroundColor: team.color + '20',
      border: '1px solid lightgray', boxShadow: '-2px 2px 8px lightgray'}}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', 
        borderBottom: '1px solid lightgray', paddingBottom: '14px'
      }}>
        <input style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 4px' }} defaultValue={team.name} onChange={e => setName(e.target.value)}></input>
        <input type="color" defaultValue={team.color} onChange={e => setColor(e.target.value)}></input>
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        <div style={buttonStyle} onClick={() => getRandomPlayers()}>
          <input onClick={(e) => e.stopPropagation()} onChange={(e) => setRandCount(parseInt(e.target.value))} defaultValue={randCount} type="number" min={0} max={5}></input>
          <span>Randomize</span>
        </div>

        <div style={buttonStyle} onClick={() => setTeam({...team, rosterSelect: [] })}>Clear All [X]</div>
      </div>

      <PlayerSearch onSelect={addPlayer}/>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px'}}>
        {team.rosterSelect.map((player, i) => (
          <div 
            style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center',
              padding: '6px 8px', background: 'white', border: '1px solid lightgray'
             }}
            key={player.id + i}
          >
            <img style={{ maxHeight: '2.6rem', objectFit: 'contain' }} src={`https://cdn.nba.com/headshots/nba/latest/260x190/${player.id}.png`}/>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: 'black' }}>{player.full_name}</span>
              <select name={(player.id + i) + "-season"} defaultValue={player.selectedSeason}
                onChange={(e) => setSeason(i, e)}>
                {player.seasons.map((season: string) => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
            </div>
            <button 
              style={{ fontWeight: 'bold', padding: '2px 4px', color: 'red' }}
              onClick={() => removePlayer(i)}
            >X</button>
          </div>
        ))}
      </div>
    </div>
  );
}