import { useEffect, useState } from "react";
import RatingPreviewBlock from "./ratings/RatingPreviewBlock";
import FullRatingProfile from "./ratings/FullRatingProfile";
import type { Player } from "../sim/types";
import { loadPlayersFromSeason } from "../cache/firebase";
import { getOverall, getRatings } from "./ratings/Ratings";
import { teamStyles } from "./TeamColors";

export default function PlayerIndex() {
    const [showRatingProfile, setRatingProfileOverlay] = useState<Player | undefined>(undefined);
    const [players, setPlayers] = useState<Player[]>([]);

    const [teamFilter, setTeamFilter] = useState<string>("");

    useEffect(() => {
        const loadPlayers = async () => {
            const playerData = await loadPlayersFromSeason('2025-26');
            const ps = playerData.map(p => p.data() as Player);
            ps.forEach(p => p.ratings = getRatings(p));
            setPlayers(ps.sort((a, b) => getOverall(b.ratings) - getOverall(a.ratings)));
        };
        loadPlayers();
    }, [setPlayers]);

    return <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
        <div style={{display: 'flex', justifyContent: 'start'}}>
            <div>
                <label>Show Team </label>
                <select name="team-filter" defaultValue={""}
                    onChange={(e) => setTeamFilter(e.target.value)}
                >
                    <option value={""}>All</option>
                    {Object.entries(teamStyles).map(([team, _]) => (
                        <option key={team} value={team}>{team}</option>
                    ))}
                </select>
            </div>
        </div>
            
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center' }}>
            { players.filter(p => teamFilter.length === 0 || teamFilter === p.team)
                .map(p => <RatingPreviewBlock p={p} setRatingProfileOverlay={() => setRatingProfileOverlay(p) } />)}
        </div>
        { showRatingProfile && <FullRatingProfile showRatingProfile={showRatingProfile} setRatingProfileOverlay={setRatingProfileOverlay}/>}
    </div>;
}