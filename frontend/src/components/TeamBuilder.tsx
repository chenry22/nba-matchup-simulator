import { type ChangeEvent } from "react";
import PlayerSearch from "./PlayerSearch";
import type { Team } from "../sim/types";
import type { FirebasePlayerMatch } from "../cache/firebase";

interface Props {
  team: Team;
  setTeam: (team: Team) => void;
}

export default function TeamBuilder({ team, setTeam }: Props) {
  const addPlayer = async (player: FirebasePlayerMatch) => {
    if (team.roster.length >= 5) return;
    let seasons = player.seasons;
    let dup = team.roster.filter(p => p.id ===  player.id).length;
    let p = {
      full_name: player.firstName + " " + player.lastName, id: player.id,
      duplicate: dup, seasons, selectedSeason: seasons.sort()[0]
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

  return (
    <div>
      <PlayerSearch onSelect={addPlayer}/>

      <ul>
        {team.rosterSelect.map((player, i) => (
          <li key={player.id + i}>
            {player.full_name}
            <select name={(player.id + i) + "-season"} defaultValue={player.seasons[player.seasons.length - 1]}
              onChange={(e) => setSeason(i, e)}>
              {player.seasons.map((season: string) => (
                <option key={season} value={season}>{season}</option>
              ))}
            </select>
            <button onClick={() => removePlayer(i)}>
              x
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}