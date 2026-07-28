import type { CSSProperties } from "react";
import type { Player } from "../../sim/types"
import RatingsBlock from "./RatingsBlock";

interface Props {
    showRatingProfile: Player;
    setRatingProfileOverlay: (p: Player | undefined) => void;
}

export default function FullRatingProfile({ showRatingProfile, setRatingProfileOverlay } : Props) {
    const style: CSSProperties = {
        display: 'flex', flexDirection: 'column',
        padding: '20px 32px', margin: '4dvh auto', 
        background: 'white', height: '86dvh', position: 'relative',
        justifyContent: 'left', textAlign: 'left', gap: '2px', 
        overflowY: 'auto',
        width: '70%', maxWidth: '700px'
    };

    return <div style={{ position: 'fixed', background: '#00000075', 
        width: '100%', height: '100%', top: 0, left: 0
    }} onClick={() => setRatingProfileOverlay(undefined)}>
        <div style={style} onClick={(e) => e.stopPropagation()}>
            <RatingsBlock p={showRatingProfile}></RatingsBlock>
            <span style={{ position: 'absolute', top: '0', right: '0', fontSize: '1.4rem', lineHeight: '1.6rem', fontWeight: 'bold',
                padding: '4px 10px', cursor: 'pointer', color: 'black'
            }} onClick={() => setRatingProfileOverlay(undefined)}
            >x</span>
        </div>
    </div>
}