import { type ChangeEvent } from "react";
import { getPlayerSeasons } from "../api/client";
import PlayerSearch from "./PlayerSearch";
import type { Team } from "../sim/types";

interface Props {
  team: Team;
  setTeam: (team: Team) => void;
}

export default function TeamBuilder({ team, setTeam }: Props) {
  const addPlayer = async (player: any) => {
    if (team.roster.length >= 5) return;
    let seasons = await getPlayerSeasons(player.id);
    let dup = team.roster.filter(p => p.id ===  player.id).length;
    let p = {
      full_name: player.full_name, id: player.id,
      duplicate: dup, seasons: seasons.data, selectedSeason: seasons.data[seasons.data.length - 1]
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