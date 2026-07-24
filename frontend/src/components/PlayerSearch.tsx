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
            {player.firstName} {player.lastName}
          </div>
        ))}
      </div>
    </div>
  );
}