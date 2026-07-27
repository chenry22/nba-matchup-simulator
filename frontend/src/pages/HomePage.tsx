import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const nav = useNavigate();

  const buttonStyle: CSSProperties = {
    color: 'white', background: 'darkblue',
    cursor: 'pointer', padding: '12px 16px', borderRadius: '6px',
    width: 'fit-content', margin: '0 auto', fontSize: '1.2rem'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '40px 20%'}}>
      <h1 style={{ color: 'white', fontSize: '2.4rem', lineHeight: '2.2rem' }}>Untitled NBA Roguelike Simulator Project Thing</h1>

      <div style={{...buttonStyle, color: 'gray', cursor: 'not-allowed'}}>Play</div>
      <div style={buttonStyle} onClick={() => nav('/sandbox')}>Sandbox</div>
      <div style={{ color: 'darkgray', cursor: 'pointer' }} onClick={() => nav('/about')}>About</div>
    </div>
  );
}