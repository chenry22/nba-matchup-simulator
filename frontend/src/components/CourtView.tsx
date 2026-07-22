// src/components/CourtView.tsx
import type { Event, ShotAttempt } from "../sim/types";

interface Props {
  events: Event[];
}

export default function CourtView({ events }: Props) {
  const width = window.innerWidth * 0.48;
  const height = width * 0.54;
  const MADE_SHOT_SIZE = 4;
  const MISSED_SHOT_SIZE = 4;
  const outlineColor = "#cbc0a0";

  return (<div style={{ background: "#391d1a81", width: width + 2, height: height + 2, overflow: 'hidden' }}>
    <svg width={width} height={height}>
      
      {/* Court */}
      <rect x={2} y={2} width={width} height={height} fill="#fff5d9" />
      {/* half court */}
      <rect x={width/2} y={0} width={1} height={height} fill={outlineColor}/>

      {/* left hoop */}
      <circle cx={width * 0.06} cy={height / 2} r={width * 0.008} fill="none" stroke={outlineColor} />
      <line stroke={outlineColor}
        x1={width * 0.04}
        y1={height * 0.44}
        x2={width * 0.04}
        y2={height * 0.56}
      />
      <rect stroke={outlineColor} fill="none"
        x={0}
        y={height * 0.34}
        width={width * 0.2}
        height={height * 0.32}
      />
      <path fill="none" stroke={outlineColor}
        d={`
          M ${width * 0.2} ${height * 0.34}
          A ${width * 0.1} ${width * 0.08} 0 0 1
            ${width * 0.2} ${height * 0.66}
        `}
      />
      <line stroke={outlineColor}
        x1={0}
        y1={height * 0.08}
        x2={width * 0.18}
        y2={height * 0.08}
      />
      <line stroke={outlineColor}
        x1={0}
        y1={height * 0.92}
        x2={width * 0.18}
        y2={height * 0.92}
      />
      <path fill="none" stroke={outlineColor}
        d={`
          M ${width * 0.18} ${height * 0.08}
          A ${width * 0.28} ${width * 0.26} 0 0 1
            ${width * 0.18} ${height * 0.92}
        `}
      />

      {/* left hoop */}
      <circle cx={width * (1 - 0.06)} cy={height / 2} r={width * 0.008} fill="none" stroke={outlineColor} />
      <line stroke={outlineColor}
        x1={width * (1 - 0.04)}
        y1={height * 0.44}
        x2={width * (1 - 0.04)}
        y2={height * 0.56}
      />
      <rect stroke={outlineColor} fill="none"
        x={width - width * 0.2}
        y={height * 0.34}
        width={width * (1 - 0.2)}
        height={height * 0.32}
      />
      <path fill="none" stroke={outlineColor}
        d={`
          M ${width * (1 - 0.2)} ${height * 0.34}
          A ${width * 0.1} ${width * 0.08} 0 0 0
            ${width * (1 - 0.2)} ${height * 0.66}
        `}
      />
      <line stroke={outlineColor}
        x1={width}
        y1={height * 0.08}
        x2={width * (1 - 0.18)}
        y2={height * 0.08}
      />
      <line stroke={outlineColor}
        x1={width}
        y1={height * 0.92}
        x2={width * (1 - 0.18)}
        y2={height * 0.92}
      />
      <path fill="none" stroke={outlineColor}
        d={`
          M ${width * (1 - 0.18)} ${height * 0.08}
          A ${width * 0.28} ${width * 0.26} 0 0 0
            ${width * (1 - 0.18)} ${height * 0.92}
        `}
      />

      {/* Shots */}
      {events.map((play, i) => {
        const shotAttempt: ShotAttempt = play as ShotAttempt;
        if (shotAttempt === undefined || shotAttempt.shot === undefined) { return null; }

        return shotAttempt.made ? (
          <circle
            key={i}
            cx={shotAttempt.shot.y * width}
            cy={shotAttempt.shot.x * height}
            r={MADE_SHOT_SIZE} fill="green"
          />
        ) : (
          <g key={i}>
            <line
              x1={shotAttempt.shot.y * width - MISSED_SHOT_SIZE}
              y1={shotAttempt.shot.x * height - MISSED_SHOT_SIZE}
              x2={shotAttempt.shot.y * width + MISSED_SHOT_SIZE}
              y2={shotAttempt.shot.x * height + MISSED_SHOT_SIZE}
              stroke="red"
            />
            <line
              x1={shotAttempt.shot.y * width + MISSED_SHOT_SIZE}
              y1={shotAttempt.shot.x * height- MISSED_SHOT_SIZE}
              x2={shotAttempt.shot.y * width - MISSED_SHOT_SIZE}
              y2={shotAttempt.shot.x * height + MISSED_SHOT_SIZE}
              stroke="red"
            />
          </g>
        );
      })}
    </svg>
  </div>);
}