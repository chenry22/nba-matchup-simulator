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
        padding: '20px 32px', margin: '3dvh auto', 
        background: 'white', height: '88dvh', position: 'relative',
        justifyContent: 'left', textAlign: 'left', gap: '2px', 
        overflowY: 'auto',
        maxWidth: '60%', minWidth: '440px'
    };

    return <div style={{ position: 'fixed', background: '#00000075', 
        width: '100%', height: '100%', top: 0, left: 0
    }} onClick={() => setRatingProfileOverlay(undefined)}>
        <div style={style} onClick={(e) => e.stopPropagation()}>
        <RatingsBlock p={showRatingProfile}></RatingsBlock>
        </div>
        <span style={{ position: 'absolute', top: '2dvh', right: '15%', fontSize: '1.3rem', lineHeight: '1.5rem', fontWeight: 'bold',
            backgroundColor: 'darkblue', borderRadius: '24px', padding: '6px 12px', cursor: 'pointer', color: 'white'
        }} onClick={() => setRatingProfileOverlay(undefined)}
        >x</span>
    </div>
}