// src/components/PlayerSearch.tsx
import { useState } from "react";
import { searchPlayers } from "../api/client";

interface Props {
  onSelect: (player: any) => void;
}

export default function PlayerSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const handleChange = async (val: string) => {
    setQuery(val);
    if (val.length < 2) {
      setResults([]);
      return;
    }
    const res = await searchPlayers(val);
    setResults(res.data.slice(0, 3));
  };

  return (
    <div>
      <input
        value={query}
        placeholder="Search players..."
        onChange={(e) => handleChange(e.target.value)}
      />

      <div>
        {results.map(player => (
          <div
            key={player.id}
            onClick={() => onSelect(player)}
            style={{ cursor: "pointer", fontSize: "0.8rem" }}
          >
            {player.full_name}
          </div>
        ))}
      </div>
    </div>
  );
}