import type { Player, Shot, ShotType } from "./types";

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function generateShot(player: Player): Shot {
  const r = Math.random();

  let type: ShotType;
  let points: 2 | 3;

  if (r < 0.2) {
    type = "rim";
    points = 2;
  } else if (r < 0.7) {
    type = "midrange";
    points = 2;
  } else {
    type = "three";
    points = 3;
  }

  return {
    type,
    points,
    x: rand(80, 420),
    y: type === "three" ? rand(300, 450) : rand(120, 350),
  };
}