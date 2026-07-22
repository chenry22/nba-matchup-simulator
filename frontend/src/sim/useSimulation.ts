import { useState } from "react";
import type { GameState, Team } from "./types";
import { simulateGame } from "./gameEngine";

export function useSimulation() {
  const [game, setGame] = useState<GameState | null>(null);
  const [settings, setSettings] = useState<{ periods: number, periodLength: number, shotClockLength: number }>({ periods: 4, periodLength: 12, shotClockLength: 24 });

  function runSim(teamA: Team, teamB: Team) {
    const result = simulateGame(teamA, teamB, settings.periods, settings.periodLength * 60, settings.shotClockLength);
    setGame(result);
  }

  return { game, runSim, settings, setSettings };
}