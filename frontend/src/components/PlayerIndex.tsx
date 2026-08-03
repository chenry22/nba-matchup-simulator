import { useEffect, useState } from "react";
import RatingPreviewBlock from "./ratings/RatingPreviewBlock";
import FullRatingProfile from "./ratings/FullRatingProfile";
import type { Player } from "../sim/types";
import { loadPlayersFromSeason } from "../cache/firebase";
import { getOverall, getRatings } from "./ratings/Ratings";
import { teamStyles } from "./TeamColors";

const availableSeasons = ['2025-26', '2024-25', '2023-24', '2022-23', '2021-22', '2020-21', '2019-20', '2018-19'];

interface Props {
    players: Record<string, Player[]>,
    setPlayers: (playerIndex: Record<string, Player[]>) => void,
    season: string, setSeason: (a: string) => void,
    teamFilter: string, setTeamFilter: (a: string) => void,
    posFilter: string, setPosFilter: (a: string) => void
}

export default function PlayerIndex({players, setPlayers, season, setSeason, teamFilter, setTeamFilter, posFilter, setPosFilter}: Props) {
    const [showRatingProfile, setRatingProfileOverlay] = useState<Player | undefined>(undefined);

    async function loadPlayers(reload: boolean = false) {
        if (reload) {
            const cpy = {...players};
            delete cpy[season];
            setPlayers(cpy);
        } else if (players[season]) {
            return;
        }

        const playerData = await loadPlayersFromSeason(season);
        const ps = playerData.map(p => p.data() as Player);
        ps.forEach(p => p.ratings = getRatings(p));
        const cpy = {...players}
        cpy[season] = ps.sort((a, b) => getOverall(b.ratings) - getOverall(a.ratings));
        setPlayers(cpy);
    }

    useEffect(() => { loadPlayers() }, [season]);

    return <div style={{display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{display: 'flex', justifyContent: 'start', color: 'black',
            gap: "1.8rem", flexWrap: 'wrap', rowGap: '10px'
        }}>
            <div onClick={() => loadPlayers(true)} style={{ color: 'darkblue', cursor: 'pointer' }}>Refresh ⟳</div>
            <div>
                <label>Season </label>
                <select name="team-filter" defaultValue={season}
                    style={{ padding: '0 2px' }}
                    onChange={(e) => setSeason(e.target.value)}
                >
                    {availableSeasons.map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>
            <div>
                <label>Team </label>
                <select name="team-filter" defaultValue={""}
                    style={{ padding: '0 2px' }}
                    onChange={(e) => setTeamFilter(e.target.value)}
                >
                    <option value={""}>All</option>
                    {Object.entries(teamStyles).map(([team, _]) => (
                        <option key={team} value={team}>{team}</option>
                    ))}
                </select>
            </div>
            <div>
                <label>Position </label>
                <select name="pos-filter" defaultValue={""}
                    style={{ padding: '0 2px' }}
                    onChange={(e) => setPosFilter(e.target.value)}
                >
                    <option value={""}>All</option>
                    {["Guard", "Forward", "Center"].map((pos) => (
                        <option key={pos} value={pos[0]}>{pos}</option>
                    ))}
                </select>
            </div>
        </div>
            
        <div style={{ height: '78dvh', overflowY: 'auto', padding: '8px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center' }}>
                { players[season]?.filter(p => {
                        return (teamFilter.length === 0 || teamFilter === p.team)
                            && (posFilter === '' || p.position.includes(posFilter))
                    })
                    .map(p => <RatingPreviewBlock p={p} setRatingProfileOverlay={() => setRatingProfileOverlay(p) } />)
                ??
                    <div>Loading...</div>
                }
            </div>
        </div>
        { showRatingProfile && <FullRatingProfile showRatingProfile={showRatingProfile} setRatingProfileOverlay={setRatingProfileOverlay}/>}
    </div>;
}