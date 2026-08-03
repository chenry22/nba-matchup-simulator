import { type Event, type GameState, type Player, type ShotType, type Team, type Turnover, type Pass, type CourtZone, ShotTypesForZone, type Foul, type ShotAttempt, type PlayerStats, type Rebound } from "./types";

// const TICK_SPEED = 500;

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
  let positionTime = Math.min(Math.floor(Math.random() * 3.9 + 3), state.shotClock);
  state.shotClock -= positionTime;
  state.periodClock -= positionTime;
  state.gameClock -= positionTime;

  // passing until shot
  if (offense.roster.length > 1) {
    while (state.shotClock > 0) {
      let passTime = Math.floor(Math.random() * 5.8 + 1);

      // pass tendency positively affects passing, low shot tendency poasitively impacts
      let passChance = 0.2 + (ballHandler.ratings.playmaking.pass_tendency / 320)
        - (passes * 0.07) + (Math.max(0, 40 - ballHandler.ratings.shot_tendency) * 0.05);

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
  let shotTime = Math.min(Math.floor(Math.random() * (passFrom ? 1.4 : 2.8) * MAX_TIME_FOR_ASSIST + 0.8), state.shotClock);
  state.shotClock -= shotTime;
  state.periodClock -= shotTime;
  state.gameClock -= shotTime;

  // after shot, first check foul
  const foulProb = estimateFoulProbability(ballHandler, defender, zone);
  if (Math.random() < foulProb) {
    let ftm = 0;
    let fta = ["left_corner_3", "right_corner_3", "above_break_3", "backcourt"].includes(zone) ? 3 : 2;
    for (var i = 0; i < fta; i++) {
      if (Math.random() < 0.5 + ballHandler.ratings.scoring.free_throw / 200) {
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
  const zoneStats = shooter.ratings.scoring.zones[zone];
  const shooterZoneSkill = Math.max(100, zoneStats.skill) + (assister ? zoneStats.ast_buff * 0.4 : 0);
  const astBuff = assister ? assister.ratings.playmaking.ast / 540 + assister.ratings.impact / 900 : 0;
  const netOffBuff = (shooter.ratings.impact - defender.ratings.impact) / 1000;
  
  // soilly, idc, for compiling purposes
  if (shotType) { }

  let shooterBaseSkill = Math.max(20, 
    (shooter.ratings.scoring.efficiency / 1.6) 
    + ((Math.pow(Math.min(100, shooter.ratings.scoring.overall) - defender.ratings.defense.overall * 0.3, 2) - 800) / 500)
  );
  let defenderZoneSkill = 0;
  let pts: 2 | 3 = 2;
  if (zone === "mid_range") { 
    defenderZoneSkill = defender.ratings.defense.mid_range; 
  }  else if (zone === "restricted_area") { 
    defenderZoneSkill = defender.ratings.defense.restricted_area;
  } else if (zone === "paint_non_ra") { 
    defenderZoneSkill = defender.ratings.defense.paint_non_ra; 
  } else { 
    defenderZoneSkill = defender.ratings.defense.three; 
    shooterBaseSkill *= (0.18 + (shooter.ratings.scoring.three / 100) * 0.6);
    pts = 3;
  }

  // how much taller is defender
  const heightDiff = heightInches(defender.height) - heightInches(shooter.height);
  let blockChance = Math.max((defender.ratings.defense.blk / 380) + (heightDiff * 0.002), 0.01);
  let stealChance = Math.max((defender.ratings.defense.stl / 300) - (shooter.ratings.playmaking.tov / 500) - (heightDiff * 0.004), 0.01);

  const threeAttempt = zone === "above_break_3" || zone === "left_corner_3" || zone === "right_corner_3";
  if (threeAttempt) {
    blockChance *= 0.4;
    stealChance *= 0.35;
  }
  const weightBuff = zone === 'restricted_area' || zone === 'paint_non_ra' ? (parseInt(shooter.weight) - parseInt(defender.weight)) * 0.002 : 0;
  if (weightBuff > 0) {
    blockChance -= weightBuff / 2;
  }
  if (Math.random() < blockChance - netOffBuff * 0.14) {
    return { made: false, pts, contestPct: 1, blocked: true, stolen: false }
  }
  if (Math.random() < stealChance - netOffBuff * 0.4) {
    return { made: false, pts, contestPct: 0, blocked: false, stolen: true }
  }

  const defContestAbility = defender.ratings.defense.overall / 300 + defenderZoneSkill / 180 + (heightDiff * 0.004);
  const contestPct = Math.max(0, Math.min(1, Math.random() * (threeAttempt ? 0.8 : 1) * defContestAbility));

  const shotMakeSkill = (shooterBaseSkill / 120) + (shooterZoneSkill / 370);
  const shotChance = shotMakeSkill - (contestPct / 2.4) + astBuff + weightBuff + netOffBuff;
  const made = shotChance > Math.random();

  // console.log('-');
  // console.log(shooter.name, defender.name, weightBuff, heightDiff, zone);
  // console.log(`Shooter: ${shooterBaseSkill}, ${shooterZoneSkill}, ${shotMakeSkill}, ${astBuff}, ${netOffBuff}`)
  // console.log(`Defender: ${defContestAbility}, ${defenderZoneSkill}`)
  // console.log("contest: " + contestPct + ", chance: " + shotChance);
  return { made, pts, contestPct, blocked: false, stolen: false };
}

function heightInches(height: string) {
  return (parseInt(height.split("-")[0]) * 12) + parseInt(height.split("-")[1]);
}

function resolveRebound(offPlayers: Player[], defPlayers: Player[]): { player: Player; offensive: boolean } {
  const weightedSelect = (ps: any[]) => {
    const sum = ps.reduce((prev, curr) => prev + curr.score, 0);
    var choice = Math.random();
    for (const p of ps) {
      if (choice < p.score / sum) return p;
      choice -= p.score / sum;
    }
    return undefined;
  };

  let sortedOff = offPlayers.map(p => 
    ({ player: p, height: p.height, weight: p.weight,
      contested: p.ratings.rebounding.contested_rebounding,
      score: ((p.ratings.rebounding.oreb * 0.24 + p.ratings.impact * 0.1) / 100) + (heightInches(p.height) - 72) / 160 })
  ).sort((a, b) => b.score - a.score);

  let sortedDef = defPlayers.map(p => 
    ({ player: p, height: p.height, weight: p.weight,
      contested: p.ratings.rebounding.contested_rebounding,
      score: ((p.ratings.rebounding.dreb * 0.4 + p.ratings.impact * 0.16) / 100) + (heightInches(p.height) - 72) / 160 })
  ).sort((a, b) => b.score - a.score);

  while (sortedOff.length > 0 && sortedDef.length > 0) {
    var poppedOff = weightedSelect(sortedOff);
    var poppedDef = weightedSelect(sortedDef);
    sortedOff = sortedOff.filter(p => p !== poppedOff);
    sortedDef = sortedDef.filter(p => p !== poppedDef);

    const heightDiff = heightInches(poppedDef.height) - heightInches(poppedOff.height);
    const weightDiff = (parseInt(poppedDef.weight) - parseInt(poppedOff.weight));
    poppedOff.score -= (heightDiff / 220) + (weightDiff / 1500);
    poppedDef.score += (heightDiff / 220) + (weightDiff / 1500);

    const o = poppedOff.score * (Math.max(0.5 + poppedOff.contested / 200, Math.random()));
    const d = poppedDef.score * (Math.max(0.5 + poppedOff.contested / 200, Math.random()))
    const choice = Math.random();
    if (choice < d) {
      return { player: poppedDef.player, offensive: false };
    }
    if (choice < o) {
      return { player: poppedOff.player, offensive: true };
    }
  }
  
  return { player: defPlayers[Math.floor(Math.random() * defPlayers.length)], offensive: false };
}



function pickPlayer(players: Player[]): Player {
    // Go by usage, default to max usage player
    const sum = players.reduce((prev, curr) => prev + curr.ratings.usage + (curr.ratings.playmaking.ast / 5) + 5, 0);
    const sorted = players.sort((a, b) => (b.ratings.usage + (b.ratings.playmaking.ast / 5)) - (a.ratings.usage + (a.ratings.playmaking.ast / 5)));
    
    var choice = Math.random();
    for (const p of sorted) {
      const score = p.ratings.usage + (p.ratings.playmaking.ast / 5) + 5;
      if (choice < score / sum) {
        return p;
      }
      choice -= score / sum;
    }
    return sorted[0];
}
function passFromPlayer(players: Player[], passer: Player): Player {
    // Go by usage + shot tend, default to max usage player
    const ps = players.filter(p => p !== passer);
    const sum = ps.reduce((prev, curr) => prev + curr.ratings.usage + curr.ratings.shot_tendency * 2, 0);
    const sorted = ps.sort((a, b) => b.ratings.usage - a.ratings.usage);
    
    var choice = Math.random();
    for (const p of sorted) {
      const rating = p.ratings.usage + p.ratings.shot_tendency * 2;
      if (choice < rating / sum) {
        return p;
      }
      choice -= rating / sum;
    }
    return sorted[0];
}

function simulateTurnoverChance(handler: Player, defenders: Player[], matchupIndex: number, passMatchupIndex: number = -1) : Turnover | null {
    // primary defender gets full steal rate combined w player TO rate
    // const toChance = handler.playmaking.tov_rate / 100;
    // const stealChance = defenders[matchupIndex].defense.pct_stl
    if (handler && defenders && matchupIndex && passMatchupIndex) {}
    // if no steal, off-ball players have chance based on stl rate?


    return null;
}

function pickDefender(defenders: Player[], _zone: CourtZone, offenseIndex: number): Player {
  // TODO: Match by position/matchup for 5v5. For 1v1 always the one defender.
  if (defenders.length === 1) { return defenders[0]; }

  if (offenseIndex) {}

  const ovrDefenseChange = 2.4;
  const sum = defenders.reduce((prev, curr) => prev + curr.ratings.defense.overall / ovrDefenseChange + defenseForZone(_zone, curr) + 4, 0);
  const sorted = defenders.sort((b, a) => (a.ratings.defense.overall / ovrDefenseChange + defenseForZone(_zone, a)) - 
      (b.ratings.defense.overall / ovrDefenseChange + defenseForZone(_zone, b)));
// console.log(sorted.map(a => a.name + ", " + (a.ratings.defense.overall / 3 + defenseForZone(_zone, a)) / sum ))
  var select = Math.random();
  for (const p of sorted) {
    let chunk = p.ratings.defense.overall / ovrDefenseChange + defenseForZone(_zone, p) + 4;
    if (select < chunk / sum) {
        return p;
    }
    select -= chunk / sum; 
  }
  return sorted[0];
}
function defenseForZone(zone: CourtZone, defender: Player): number {
  if (zone === "mid_range") { 
    return defender.ratings.defense.mid_range;
  }  else if (zone === "restricted_area") { 
    return defender.ratings.defense.restricted_area;
  } else if (zone === "paint_non_ra") { 
    return defender.ratings.defense.paint_non_ra;
  } else { 
    return defender.ratings.defense.three;
  }
}


function pickShotZone(player: Player): CourtZone {
  const threeRateMult = player.tendencies.fg3a_rate / player.tendencies.fga_rate;
  const tendencies: {type: CourtZone, freq: number}[] = [
    { type: "restricted_area", freq: player.ratings.scoring.zones.restricted_area.tendency * 0.5 },
    { type: "paint_non_ra", freq: player.ratings.scoring.zones.paint_non_ra.tendency * 0.5 },
    { type: "mid_range", freq: player.ratings.scoring.zones.mid_range.tendency * 0.5 },
    { type: "left_corner_3", freq: player.ratings.scoring.zones.left_corner_3.tendency / 2 * threeRateMult },
    { type: "right_corner_3", freq: player.ratings.scoring.zones.right_corner_3.tendency * 0.5 * threeRateMult },
    { type: "above_break_3", freq: player.ratings.scoring.zones.above_break_3.tendency * 0.5 * threeRateMult }
  ];

  const sum = tendencies.reduce((prev, curr) => prev + curr.freq, 0);
  const sorted = tendencies.sort((a, b) => b.freq - a.freq);
  let choice = Math.random();

  for (var p of sorted) {
    if (choice < p.freq / sum) {
      return p.type;
    }
    choice -= p.freq / sum;
  }
  return sorted[0].type;
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
  const ft_draw = (shooter.ratings.scoring.draw_foul + shooter.ratings.impact / 4 - defender.ratings.defense.fl / 2) / 400;
  const baseChance = ft_draw + 0.06;
  return ['above_break_3', 'left_corner_3', 'right_corner_three'].includes(zone) ? baseChance * 0.4 : baseChance;
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
    restricted_area:   [0.5,  0.11],
    paint_non_ra:      [0.5,  0.18],
    mid_range_left:    [0.25, 0.2],
    mid_range_right:   [0.75,  0.2],
    mid_range_center:  [0.5,  0.28],
    left_corner_3:     [0.055, 0.08],
    right_corner_3:    [0.945,  0.08],
    above_break_3:     [0.5,  0.35],
    backcourt:         [0.5,  0.6]
  };
  const zoneJitter: Record<string, [number, number]> = {
    restricted_area:   [0.08,  0.06],
    paint_non_ra:      [0.12,  0.12],
    mid_range_left:    [0.07, 0.1],
    mid_range_right:   [0.07,  0.1],
    mid_range_center:  [0.1,  0.08],
    left_corner_3:     [0.025, 0.06],
    right_corner_3:    [0.025,  0.06],
    above_break_3:     [0.48,  0.02],
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
    const y = Math.min(Math.max(jitter(cy, zoneJitter[z][1]), 0.01), 0.99) - Math.pow(Math.abs(0.5 - x), 2) * 0.65;
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

// function sleep(ms: number) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }