import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const nav = useNavigate();

  const buttonStyle: CSSProperties = {
    color: 'white', background: 'darkblue',
    cursor: 'pointer', padding: '8px 14px', borderRadius: '6px',
    width: 'fit-content', margin: '4px auto'
  };

  return (
    <div>
      <h1>Untitled NBA Roguelike</h1>

      <div style={buttonStyle}>Play</div>
      <div style={{...buttonStyle, fontSize: '0.9rem', opacity: 0.9 }} onClick={() => nav('/sandbox')}>Sandbox</div>
    </div>
  );
}