import { type Event, type GameState, type Player, type ShotType, type Team, type Turnover, type Pass, type CourtZone, ShotTypesForZone, type Foul, type ShotAttempt, type PlayerStats, type Rebound } from "./types";

const TICK_SPEED = 500;

const MAX_TIME_FOR_ASSIST = 4;

/**
 * Simulate a full game. Returns a completed GameState with all events.
 * For live playback, use simulateGameLive() which yields events incrementally.
 */
export function simulateGame(teamA: Team, teamB: Team, periods: number, periodLength: number, shotClock: number): GameState {
  const state = initGameState(teamA, teamB, periods, periodLength, shotClock);
  for (let period = 1; period <= periods; period++) {
    simulatePeriod(state, period);

    // TODO: Check for tie at end of regulation, simulate OT if needed
    console.log("Period " + period + " completed.")
  }
  console.log(state);
  state.status = "final";
  return state;
}

function initGameState(teamA: Team, teamB: Team, periods: number, periodLength: number, shotClock: number): GameState {
  return {
    events: [], teamA, teamB, periods, periodLength, shotClockLength: shotClock, 
    period: 1, shotClock, gameClock: (periods * periodLength), periodClock: periodLength,
    score: [0, 0], possession: 'A', status: "idle",
  };
}

/**
 * Async generator version for live playback.
 * Yields updated GameState after each possession so the UI can re-render.
 *
 * Usage:
 *   for await (const state of simulateGameLive(config)) {
 *     setGameState({ ...state });
 *   }
 */
// export async function* simulateGameLive(teamA: Team, teamB: Team) : AsyncGenerator<GameState> {
//   const state = initGameState(teamA, teamB);

//   for (let period = 1; period <= PERIODS; period++) {
//     state.period = period;
//     state.periodClock = PERIOD_SECONDS;

//     while(state.periodClock > 0) {
//       const events = simulatePossession(state, SHOT_CLOCK_SECONDS);
//       applyEvents(state, events);
//       state.events.push(...events);

//       yield { ...state, events: [...state.events] };

//       if (TICK_SPEED > 0) {
//         await sleep(TICK_SPEED);
//       }
//     }
//   }

//   state.status = "final";
//   yield state;
// }

function simulatePeriod(state: GameState, period: number) {
  state.period = period;
  state.periodClock = state.periodLength;

  while (state.periodClock > 0) {
    const events = simulatePossession(state, state.shotClockLength);
    applyEvents(state, events);
    state.events.push(...events);
    state.possession = state.possession === "A" ? "B" : "A";
  }
}

/**
 * Core possession engine.
 * Returns array of events representing one offensive trip.
 *
 * Flow:
 *  1. Pick ball handler (weighted by usage/play-type)
 *  2. Pass or shoot until player decides to shoot
 *  3. Determine shot outcome
 *  4. If shot: pick zone, pick defender, resolve make/miss, resolve rebound
 */
function simulatePossession(state: GameState, shotClock: number): Event[] {
  var offense = state.possession === "A" ? state.teamA : state.teamB;
  var defense = state.possession === "A" ? state.teamB : state.teamA;
  const events: Event[] = [];
  state.shotClock = Math.min(shotClock, state.periodClock);
  var ballHandler = pickPlayer(offense.roster);

  if (state.events.length > 0) {
    const lastEvent = state.events[state.events.length - 1];
    if (lastEvent.type === 'rebound') {
      ballHandler = offense.roster.find(p => lastEvent.player.name === p.name)!;
    } else if (lastEvent.type === 'turnover') {
      ballHandler = offense.roster.find(p => (lastEvent as Turnover).stolen_by?.name === p.name)!;
    }
  }

  var passFrom = null;
  let passes = 0;

  // TODO: add functionality for dribbling up court -> chance for steal
  let positionTime = Math.min(Math.floor(Math.random() * 4 + 4), state.shotClock);
  state.shotClock -= positionTime;
  state.periodClock -= positionTime;
  state.gameClock -= positionTime;

  // passing until shot
  if (offense.roster.length > 1) {
    while (state.shotClock > 0) {
      let pace = 1 / (ballHandler.tendencies.pace / 48 / 60);
      let passTime = Math.floor(Math.random() * pace * 0.3 + 0.5);

      // TODO: rank by usage, lower usage players should tend to pass
      let passChance = (ballHandler.tendencies.ast_rate / 5 + (ballHandler.playmaking.ast_rate / 120)) - (passes * 0.08) + (0.5 - ballHandler.tendencies.fga_rate) * 2;

      if (state.shotClock - passTime > 0 && Math.random() < passChance) {
        passes++;
        let passTo = passFromPlayer(offense.roster, ballHandler);
        state.shotClock -= passTime;
        state.periodClock -= passTime;
        state.gameClock -= passTime;

        const to = simulateTurnoverChance(ballHandler, defense.roster, offense.roster.indexOf(ballHandler));
        if (to) {
          events.push(to);
          return events;
        }

        // successful pass event
        events.push({ 
          player: { name: ballHandler.name, team: offense}, pass_to: { name: passTo.name, team: offense }, 
          type: "pass", period: state.period, timestamp: (state.periods * state.periodLength) - state.gameClock
        } as Pass);

        // update to new ball handler
        passFrom = ballHandler;
        ballHandler = passTo;
      } else {
        break;
      }
    }
  }

  const zone = pickShotZone(ballHandler);
  const shotType = pickShotType(ballHandler, zone);
  const defender = pickDefender(defense.roster, zone, offense.roster.indexOf(ballHandler));
  let { x, y } = zoneToCoordinates(zone);
  if (state.possession === "B") { y = 1 - y }

  // actual shot attempt
  const pace = (1 / (ballHandler.tendencies.pace / 48 / 60));
  const astPref = ballHandler.scoring.zones[zone].ast_fg_pct > ballHandler.scoring.zones[zone].uast_fg_pct;
  let shotTime = Math.min(Math.floor(Math.random() * pace * (astPref ? 0.15 : 0.5) + 0.5), state.shotClock);
  state.shotClock -= shotTime;
  state.periodClock -= shotTime;
  state.gameClock -= shotTime;

  // after shot, first check foul
  const foulProb = estimateFoulProbability(ballHandler, defender, zone);
  if (Math.random() < foulProb) {
    let ftm = 0;
    let fta = ["left_corner_3", "right_corner_3", "above_break_3", "backcourt"].includes(zone) ? 3 : 2;
    for (var i = 0; i < fta; i++) {
      if (Math.random() < ballHandler.scoring.ft_pct) {
        ftm++;
      }
    }
    events.push({ type: "foul", timestamp: (state.periods * state.periodLength) - state.gameClock, period: state.period, 
      fouled_by: { name: defender.name, team: defense }, 
      player: { name: ballHandler.name, team: offense },
      shot: { type: shotType, points: fta, zone: zone, x, y }, 
      free_throws_attempted: fta, free_throws_made: ftm
    } as Foul);
    return events;
  }

  let assister = shotTime <= MAX_TIME_FOR_ASSIST ? passFrom : null;
  const { made, pts, contestPct, blocked, stolen } =  resolveShotAttempt(ballHandler, defender, assister, zone, shotType);
  
  if (stolen) {
    events.push({
      type: 'turnover', timestamp: (state.periods * state.periodLength) - state.gameClock, period: state.period,
      player: { name: ballHandler.name, team: offense }, stolen_by: { name: defender.name, team: defense }
    } as Turnover);
    return events;
  }

  const shotEvent: ShotAttempt = {
      type: "shot", timestamp: (state.periods * state.periodLength) - state.gameClock, period: state.period,
      player: { name: ballHandler.name, team: offense }, 
      assisted_by: assister ? { name: assister.name, team: offense } : null,
      defended_by: { name: defender.name, team: defense }, 
      contest_pct: contestPct, made, blocked,
      shot: { zone, type: shotType, points: pts, x, y }
  };
  events.push(shotEvent);

  if (!made) {
      const reb = resolveRebound(offense.roster, defense.roster);
      const rebTime = Math.min(Math.floor(Math.random() * 3 + 0.5), state.shotClock);
      state.shotClock -= rebTime;
      state.periodClock -= rebTime;
      state.gameClock -= rebTime;

      events.push({ 
        type: "rebound", timestamp: (state.periods * state.periodLength) - state.gameClock, period: state.period,
        player: { name: reb.player.name, team: reb.offensive ? offense : defense }, 
        offensive: reb.offensive,
      } as Rebound);

      if (reb.offensive) {
        applyEvents(state, events);
        state.events.push(...events);
        return simulatePossession(state, state.shotClockLength - 10);
      }
  }

  return events;
}

function resolveShotAttempt(shooter: Player, defender: Player, assister: Player | null, zone: CourtZone, shotType: ShotType): { made: boolean; pts: 2 | 3; contestPct: number; blocked: boolean; stolen: boolean; } {
  const zoneStats = shooter.scoring.zones[zone];
  const shooterZoneSkill = Math.max(0, assister ? zoneStats.ast_fg_pct : zoneStats.uast_fg_pct);
  const astBuff = assister ? assister.playmaking.ast_rate / 200 + Math.pow(assister.pie * 10, 2) / 100 : 0;
  const defPieBuff = Math.pow(defender.pie * 10, 2) / 100;
  const offPieBuff = Math.pow(shooter.pie * 10, 2) / 100;

  let shooterBaseSkill = shooter.scoring.efg_pct;
  let defenderZoneSkill = 0;
  let pts: 2 | 3 = 2;
  if (zone === "mid_range") { 
    defenderZoneSkill = defender.defense.mid_range.pct_plusmin; 
  }  else if (zone === "restricted_area") { 
    defenderZoneSkill = defender.defense.restricted_area.pct_plusmin; 
  } else if (zone === "paint_non_ra") { 
    defenderZoneSkill = defender.defense.paint_non_ra.pct_plusmin; 
  } else { 
    defenderZoneSkill = defender.defense.three.pct_plusmin;
    shooterBaseSkill = shooter.scoring.fg3_pct;
    pts = 3;
  }

  defenderZoneSkill = defenderZoneSkill / 60; // plus minus avg for shot type
  const overallDefense = defender.defense.overall / 100; // percentage diff for all shots on average

  // how much taller is defender
  let heightDiff = ((parseInt(defender.height.split("-")[0]) * 12) + parseInt(defender.height.split("-")[1])) 
    - ((parseInt(shooter.height.split("-")[0]) * 12) + parseInt(shooter.height.split("-")[1]));
  let blockChance = ((defender.defense.blk_per100 / 24) + (shooter.scoring.blka_per100 / 80)) + (heightDiff * 0.004) - overallDefense;
  let stealChance = (defender.defense.stl_per100 / 24) + (shooter.playmaking.tov_rate / 300) - (heightDiff * 0.002) - overallDefense;

  const threeAttempt = zone === "above_break_3" || zone === "left_corner_3" || zone === "right_corner_3";
  if (threeAttempt) {
    blockChance *= 0.45;
    stealChance *= 0.25;
  }
  const weightBuff = zone === 'restricted_area' || zone === 'paint_non_ra' ? (parseInt(shooter.weight) - parseInt(defender.weight)) * 0.006 : 0;
  if (weightBuff > 0) {
    blockChance -= weightBuff / 2;
  }
  if (Math.random() < blockChance + defPieBuff) {
    return { made: false, pts, contestPct: 1, blocked: true, stolen: false }
  }
  if (Math.random() < stealChance + defPieBuff) {
    return { made: false, pts, contestPct: 0, blocked: false, stolen: true }
  }

  // net rating diff should impact contest Pct, on scale of -10 to 10, taking into account defense skill for that zone
  const contestRange = 6;
  const contestSkill = -(defenderZoneSkill * 18) - overallDefense + (heightDiff * 0.008);
  let contestPct = (Math.random() * (threeAttempt ? 0.7 : 1) *
    (Math.max(-contestRange, Math.min(contestRange, contestSkill)) + contestRange)) / (contestRange * 2);

  const avgShotPct = shooterZoneSkill > 0 ? (shooterZoneSkill + shooterBaseSkill) / 2 : shooterBaseSkill;
  const shooterBuff = threeAttempt ? shooterBaseSkill * 0.5 : shooterBaseSkill * 0.35;
  const shotOffenseChance = avgShotPct + (Math.random() * shooterBuff);
  const shotChance = shotOffenseChance - (contestPct / 2.1) + overallDefense + astBuff + weightBuff + offPieBuff;
  const made = shotChance > Math.random();

  // console.log('-');
  // console.log(shooter.name, defender.name, weightBuff);
  // console.log(`Shooter: ${shooterBaseSkill}, ${shooterZoneSkill}, ${avgShotPct}, ${shotOffenseChance}`)
  // console.log(`Defender: ${overallDefense}, ${defenderZoneSkill}, ${contestSkill}`)
  // console.log("contest: " + contestPct + ", chance: " + shotChance + ", ast: " + astBuff);
  return { made, pts, contestPct, blocked: false, stolen: false };
}

function resolveRebound(offPlayers: Player[], defPlayers: Player[]): { player: Player; offensive: boolean } {
  let sortedOff = offPlayers.map(p => 
    ({ player: p, height: p.height, weight: p.weight,
      score: Math.random() * p.rebounding.c_rb_pct * p.rebounding.oreb_pct * p.rebounding.oreb_to_dreb * 1.5 
        + p.rebounding.oreb_per100 / 20 + Math.pow(p.pie * 10, 2) / 100 })
  ).sort((a, b) => a.score - b.score);
  let sortedDef = defPlayers.map(p => 
    ({ player: p, height: p.height, weight: p.weight,
      score: Math.random() * p.rebounding.c_rb_pct * p.rebounding.dreb_pct * 1.5 
        + p.rebounding.dreb_per100 / 30 + Math.pow(p.pie * 10, 2) / 100 })
  ).sort((a, b) => a.score - b.score);

  const fallback = sortedDef[Math.floor(Math.random() * sortedDef.length)];
  while (sortedOff.length > 0 && sortedDef.length > 0) {
    let poppedDef = sortedDef.pop()!;
    let poppedOff = sortedOff.pop()!;

    const heightDiff = ((parseInt(poppedDef.height.split("-")[0]) * 12) + parseInt(poppedDef.height.split("-")[1])) 
      - ((parseInt(poppedOff.height.split("-")[0]) * 12) + parseInt(poppedOff.height.split("-")[1]));
    const weightDiff = (parseInt(poppedDef.weight) - parseInt(poppedOff.weight));
    poppedOff.score -= (heightDiff / 180) + (weightDiff / 1200);
    poppedDef.score += (heightDiff / 180) + (weightDiff / 1200);
    // console.log(poppedOff, poppedDef);

    if (poppedOff.score > poppedDef.score) {
      if (Math.random() < poppedOff.score) {
        return { player: poppedOff.player, offensive: true };
      }
      if (Math.random() < poppedDef.score) {
        return { player: poppedDef.player, offensive: false };
      }
    } else {
      if (Math.random() < poppedDef.score) {
        return { player: poppedDef.player, offensive: false };
      }
      if (Math.random() < poppedOff.score) {
        return { player: poppedOff.player, offensive: true };
      }
    }
  }
  return { player: fallback.player, offensive: false };
}



function pickPlayer(players: Player[]): Player {
    // Go by usage, default to max usage player
    const sorted = players.sort((a, b) => b.tendencies.usg - a.tendencies.usg);
    for (var p of sorted) {
      if (Math.random() < p.tendencies.usg) {
        return p;
      }
    }
    return sorted[Math.floor(Math.random() * sorted.length)];
}
function passFromPlayer(players: Player[], passer: Player): Player {
    // Go by usage, default to max usage player
    let sorted = players.filter(p => p != passer);
    sorted = sorted.sort((a, b) => b.tendencies.usg - a.tendencies.usg);
    for (var p of sorted) {
        if (Math.random() < p.tendencies.usg) {
            return p;
        }
    }
    return sorted[Math.floor(Math.random() * sorted.length)];
}

function simulateTurnoverChance(handler: Player, defenders: Player[], matchupIndex: number, passMatchupIndex: number = -1) : Turnover | null {
    // primary defender gets full steal rate combined w player TO rate
    const toChance = handler.playmaking.tov_rate / 100;
    // const stealChance = defenders[matchupIndex].defense.pct_stl

    // if no steal, off-ball players have chance based on stl rate?


    return null;
}

function pickDefender(defenders: Player[], _zone: CourtZone, offenseIndex: number): Player {
  // TODO: Match by position/matchup for 5v5. For 1v1 always the one defender.
  const sorted = defenders.sort((b, a) => 
    (a.defense.blk_per100 + a.defense.stl_per100 - defenseForZone(_zone, a)) - 
      (b.defense.blk_per100 + b.defense.stl_per100 - defenseForZone(_zone, b))
  );
  for (var i = 0; i < sorted.length; i++) {
    let p = sorted[i];
    if (Math.random() < ((0.5 - defenseForZone(_zone, p) / 20)
      * ((sorted.length - i) / sorted.length))) {
        return p;
    }
  }
  return sorted[Math.floor(Math.random() * sorted.length)];
}
function defenseForZone(zone: CourtZone, defender: Player): number {
  if (zone === "mid_range") { 
    return defender.defense.mid_range.pct_plusmin; 
  }  else if (zone === "restricted_area") { 
    return defender.defense.restricted_area.pct_plusmin; 
  } else if (zone === "paint_non_ra") { 
    return defender.defense.paint_non_ra.pct_plusmin; 
  } else { 
    return defender.defense.three.pct_plusmin;
  }
}


function pickShotZone(player: Player): CourtZone {
  const threeRateMult = player.tendencies.fg3a_rate / player.tendencies.fga_rate;
  const tendencies: {type: CourtZone, freq: number}[] = [
    { type: "restricted_area", freq: player.scoring.zones.restricted_area.freq },
    { type: "paint_non_ra", freq: player.scoring.zones.paint_non_ra.freq },
    { type: "mid_range", freq: player.scoring.zones.mid_range.freq },
    { type: "left_corner_3", freq: player.scoring.zones.left_corner_3.freq * threeRateMult },
    { type: "right_corner_3", freq: player.scoring.zones.right_corner_3.freq * threeRateMult },
    { type: "above_break_3", freq: player.scoring.zones.above_break_3.freq * threeRateMult },
    { type: "backcourt", freq: player.scoring.zones.backcourt.freq },
  ];

  tendencies.sort((a, b) => b.freq - a.freq);
  for (let i = 0; i < tendencies.length; i++) {
    if (Math.random() < tendencies[i].freq + ((tendencies.length - i) * 0.01)) {
      return tendencies[i].type;
    }
  }
  // fallback to random from top 2
  return tendencies[Math.floor(Math.random() * 3)].type;
}

function pickShotType(player: Player, _zone: CourtZone): ShotType {
  const types = ShotTypesForZone[_zone];
  let sum = types.reduce((prev, _, i, arr) => {
    let key = arr[i] as ShotType;
    if (key === "jump_shot" || key === "fadeaway") {
      if (_zone === "mid_range" || _zone === "restricted_area" || _zone === "paint_non_ra") {
        return player.scoring.shot_types[key].freq2 + prev;
      } else {
        return player.scoring.shot_types[key].freq3 + prev;
      }
    } else {
      return player.scoring.shot_types[key].freq + prev;
    }
  }, 0);
  let tendencies = types.map(type => {
    let key = type as ShotType;
    if (key === "jump_shot" || key === "fadeaway") {
      if (_zone === "mid_range" || _zone === "restricted_area" || _zone === "paint_non_ra") {
        return { key, freq: player.scoring.shot_types[key].freq2 / sum };
      } else {
        return { key, freq: player.scoring.shot_types[key].freq3 / sum };
      }
    } else {
      return { key, freq: player.scoring.shot_types[key].freq / sum };
    }
  });
  
  tendencies.sort((a, b) => a.freq - b.freq);
  for (let i = 0; i < tendencies.length; i++) {
    if (Math.random() < tendencies[i].freq) {
      return tendencies[i].key;
    }
  }
  // fallback to random from top 3
  return tendencies[Math.floor(Math.random() * 3)].key;
}

function estimateFoulProbability(shooter: Player, defender: Player, zone: CourtZone): number {
  // TODO: Use shooter.scoring.ft_rate + shotType (drives draw more fouls)
  const ft_draw = (shooter.scoring.ft_rate + shooter.scoring.fl_pct) / 2;
  const fl_chance = defender.defense.fl_pct / 3;
  const ratingDiff = shooter.scoring.off_rating > 0 && defender.defense.def_rating > 0 ? shooter.scoring.off_rating - defender.defense.def_rating : 0;
  const baseChance = (ft_draw + fl_chance) / 4 + (ratingDiff / 200);
  return ['above_break_3', 'left_corner_3', 'right_corner_three'].includes(zone) ? baseChance * 0.3 : baseChance;
}

/**
 * Maps a CourtZone to normalized (x, y) coordinates for shot chart rendering.
 * Origin: bottom-center of offensive half court (basket).
 * x: -1 (left) to +1 (right), y: 0 (basket) to 1 (half court line)
 *
 * TODO: Add jitter so shots from same zone don't stack exactly.
 */
function zoneToCoordinates(zone: CourtZone): { x: number; y: number } {
  const centers: Record<string, [number, number]> = {
    restricted_area:   [0.5,  0.1],
    paint_non_ra:      [0.5,  0.18],
    mid_range_left:    [0.25, 0.2],
    mid_range_right:   [0.75,  0.2],
    mid_range_center:  [0.5,  0.28],
    left_corner_3:     [0.055, 0.08],
    right_corner_3:    [0.945,  0.08],
    above_break_3:     [0.5,  0.36],
    backcourt:         [0.5,  0.6]
  };
  const zoneJitter: Record<string, [number, number]> = {
    restricted_area:   [0.05,  0.06],
    paint_non_ra:      [0.1,  0.12],
    mid_range_left:    [0.07, 0.1],
    mid_range_right:   [0.07,  0.1],
    mid_range_center:  [0.1,  0.08],
    left_corner_3:     [0.025, 0.06],
    right_corner_3:    [0.025,  0.06],
    above_break_3:     [0.46,  0.02],
    backcourt:         [0.3,  0.1]
  };
  let z: string = zone;
  if (z === "mid_range") {
    z = ["mid_range_left", "mid_range_right", "mid_range_center"][Math.floor(Math.random() * 3)]
  }
  const [cx, cy] = centers[z] ?? [0, 0.5];
  // Add small random jitter within zone
  const jitter = (n: number, j: number) => n + (Math.random() * j * 2 - j);
  if (z === 'above_break_3') {
    const x = Math.min(Math.max(jitter(cx, zoneJitter[z][0] * (Math.random() * 0.8 + 0.2)), 0.01), 0.99);
    const y = Math.min(Math.max(jitter(cy, zoneJitter[z][1]), 0.01), 0.99) - Math.abs(0.5 - x) * 0.2;
    return {x, y}
  }
  return { x: Math.min(Math.max(jitter(cx, zoneJitter[z][0]), 0.01), 0.99), y: Math.min(Math.max(jitter(cy, zoneJitter[z][1]), 0.01), 0.99) };
}


function applyEvents(state: GameState, toLog: Event[]) {
  const offense = state.possession === "A" ? state.teamA : state.teamB;
  const defense = state.possession === "A" ? state.teamB : state.teamA;

  for (const e of toLog) {
    if (e.type === "shot") {
      let shot = e as ShotAttempt
      let i = indexOfPlayer(offense.stats, e.player.name);
      offense.stats[i].fga++;
      offense.stats[i].fgm += shot.made ? 1 : 0;
      if (shot.shot.points === 3) {
        offense.stats[i].fg3a++;
      }
      
      if (shot.made) {
        state.possession === "A" ? state.score[0] += 2 : state.score[1] += 2;
        if (shot.shot.points === 3) {
          offense.stats[i].fg3m += shot.made ? 1 : 0;
          state.possession === "A" ? state.score[0] += 1 : state.score[1] += 1;
        }
        if (shot.assisted_by) {
          offense.stats[indexOfPlayer(offense.stats, shot.assisted_by.name)].ast++;
        }
      }
      if (shot.blocked) {
        defense.stats[indexOfPlayer(defense.stats, shot.defended_by.name)].blk++;
      }
    } else if (e.type === "rebound") {
      const reb = e as Rebound;
      if (reb.offensive) {
        offense.stats[indexOfPlayer(offense.stats, e.player.name)].oreb++;
      } else {
        defense.stats[indexOfPlayer(defense.stats, e.player.name)].dreb++;
      }
    } else if (e.type === "turnover") {
      let i = indexOfPlayer(offense.stats, e.player.name);
      offense.stats[i].tov++;

      const stolenBy = (e as Turnover).stolen_by;
      if (stolenBy) {
        defense.stats[indexOfPlayer(defense.stats, stolenBy.name)].stl++;
      }
    } else if (e.type === "foul") {
      let foul = e as Foul;
      let i = indexOfPlayer(defense.stats, foul.fouled_by.name);
      defense.stats[i].fl++;

      let j = indexOfPlayer(offense.stats, foul.player.name);
      offense.stats[j].fta += foul.free_throws_attempted;
      offense.stats[j].ftm += foul.free_throws_made;
      state.possession === "A" ? state.score[0] += foul.free_throws_made : state.score[1] += foul.free_throws_made;
    }
  }
}

function indexOfPlayer(stats: PlayerStats[], player: string) {
  return stats.findIndex(p => p.player === player);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}