// src/components/PlayerSearch.tsx
import { useState } from "react";
import { searchForPlayer, type FirebasePlayerMatch } from "../cache/firebase";

interface Props {
  onSelect: (player: FirebasePlayerMatch) => void;
}

export default function PlayerSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FirebasePlayerMatch[]>([]);

  const handleChange = async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
      setResults([]);
      return;
    }
    const res = await searchForPlayer(val);
    setResults(res.slice(0, 3));
  };

  return (
    <div>
      <div>
        <input
          value={query}
          placeholder="Search for players..."
          onChange={(e) => handleChange(e.target.value)}
          style={{ fontSize: '0.6rem', padding: '2px 4px' }}
        />
        <span style={{ marginLeft: '8px', color: 'black', cursor: 'pointer' }} onClick={() => handleChange("")}>x</span>
      </div>

      <div style={{ marginTop: results.length > 0 ? '10px' : 0 }}>
        {results.map(player => (
          <div
            key={player.id}
            onClick={() => onSelect(player)}
            className="hover-text"
            style={{ cursor: "pointer", fontSize: "0.8rem", lineHeight: '1rem' }}
          >
            {player.firstName} {player.lastName}
          </div>
        ))}
      </div>
    </div>
  );
}