/**
 * BSE mark — a triangle (geometry) with one letter on each vertex: B on top, S bottom-left, E bottom-right.
 * Drawn in currentColor so it follows light / dark mode; letters are cut out in the page background.
 * public/favicon.svg is the same drawing on a dark tile.
 */
const VERTICES = [
  { letter: 'B', x: 21, y: 8 },
  { letter: 'S', x: 8, y: 30 },
  { letter: 'E', x: 34, y: 30 },
] as const;

export function Logo({ size = 34 }: { size?: number }): React.JSX.Element {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 42 38" aria-hidden="true">
      <polygon
        points={VERTICES.map((v) => `${v.x},${v.y}`).join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {VERTICES.map((v) => (
        <g key={v.letter}>
          <circle cx={v.x} cy={v.y} r="7" fill="currentColor" />
          <text
            x={v.x}
            y={v.y}
            dy="0.36em"
            textAnchor="middle"
            fontSize="9"
            fontWeight="800"
            fill="var(--background)"
          >
            {v.letter}
          </text>
        </g>
      ))}
    </svg>
  );
}
