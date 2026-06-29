import React, { useMemo } from 'react';
import type { Player } from '../types';

interface PerformanceGraphProps {
  players: Player[];
}

// Preset colors for player lines on the graph
const PLAYER_COLORS = [
  '#8b5cf6', // Violet
  '#f43f5e', // Pink
  '#06b6d4', // Cyan
  '#fbbf24', // Yellow
  '#10b981', // Green
  '#a855f7', // Magenta
  '#3b82f6'  // Blue
];

const PerformanceGraphComponent: React.FC<PerformanceGraphProps> = ({ players }) => {
  const typingPlayers = useMemo(() => players.filter(p => !p.isSpectator), [players]);

  // Determine limits for drawing bounds
  const limits = useMemo(() => {
    let maxTime = 15; // default minimum 15 seconds
    let maxWpm = 100; // default minimum 100 WPM

    typingPlayers.forEach(p => {
      p.timeline.forEach((point: { time: number; wpm: number }) => {
        if (point.time > maxTime) maxTime = point.time;
        if (point.wpm > maxWpm) maxWpm = point.wpm;
      });
    });

    // Pad slightly
    return {
      maxTime: Math.ceil(maxTime * 1.1),
      maxWpm: Math.ceil(maxWpm * 1.1)
    };
  }, [typingPlayers]);

  const width = 600;
  const height = 220;
  const paddingLeft = 40;
  const paddingBottom = 30;
  const paddingTop = 10;
  const paddingRight = 15;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Convert stats to coordinate point maps
  const getCoordinates = (timeline: { time: number; wpm: number }[]) => {
    if (timeline.length === 0) return '';
    
    return timeline
      .map((point: { time: number; wpm: number }, index: number) => {
        const x = paddingLeft + (point.time / limits.maxTime) * chartWidth;
        const y = height - paddingBottom - (point.wpm / limits.maxWpm) * chartHeight;
        
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Generate grids values
  const gridLines = useMemo(() => {
    const wpmTicks = 4;
    const timeTicks = 5;
    
    const horizontal = Array.from({ length: wpmTicks }).map((_, i) => {
      const val = Math.round((limits.maxWpm / (wpmTicks - 1)) * i);
      const y = height - paddingBottom - (val / limits.maxWpm) * chartHeight;
      return { val, y };
    });

    const vertical = Array.from({ length: timeTicks }).map((_, i) => {
      const val = parseFloat(((limits.maxTime / (timeTicks - 1)) * i).toFixed(1));
      const x = paddingLeft + (val / limits.maxTime) * chartWidth;
      return { val, x };
    });

    return { horizontal, vertical };
  }, [limits, chartWidth, chartHeight]);

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📈 Telemetry WPM Dashboard
      </h3>

      {/* SVG Canvas */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          style={{ width: '100%', minWidth: '450px', display: 'block', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}
        >
          {/* Neon path filters */}
          <defs>
            <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          <g stroke="rgba(255,255,255,0.04)" strokeWidth="1">
            {gridLines.horizontal.map((line, idx) => (
              <line key={`h-${idx}`} x1={paddingLeft} y1={line.y} x2={width - paddingRight} y2={line.y} />
            ))}
            {gridLines.vertical.map((line, idx) => (
              <line key={`v-${idx}`} x1={line.x} y1={paddingTop} x2={line.x} y2={height - paddingBottom} />
            ))}
          </g>

          {/* Axis Labels */}
          <g fill="var(--color-text-muted)" fontSize="10" fontFamily="var(--font-mono)">
            {/* WPM text ticks */}
            {gridLines.horizontal.map((line, idx) => (
              <text key={`ht-${idx}`} x={paddingLeft - 8} y={line.y + 4} textAnchor="end">
                {line.val}
              </text>
            ))}
            {/* Time text ticks */}
            {gridLines.vertical.map((line, idx) => (
              <text key={`vt-${idx}`} x={line.x} y={height - paddingBottom + 16} textAnchor="middle">
                {line.val}s
              </text>
            ))}
          </g>

          {/* Real-time player curves */}
          {typingPlayers.map((player, idx) => {
            const pathData = getCoordinates(player.timeline);
            if (!pathData) return null;
            const strokeColor = PLAYER_COLORS[idx % PLAYER_COLORS.length];

            return (
              <g key={player.socketId}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#neon-glow)"
                  style={{ transition: 'd 0.1s linear' }}
                />
                {/* Last coordinate point dot indicator */}
                {player.timeline.length > 0 && (
                  <circle
                    cx={paddingLeft + (player.timeline[player.timeline.length - 1].time / limits.maxTime) * chartWidth}
                    cy={height - paddingBottom - (player.timeline[player.timeline.length - 1].wpm / limits.maxWpm) * chartHeight}
                    r="4"
                    fill={strokeColor}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend display */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem', marginTop: '4px' }}>
        {typingPlayers.map((player, idx) => {
          const strokeColor = PLAYER_COLORS[idx % PLAYER_COLORS.length];
          return (
            <div key={player.socketId} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: strokeColor }} />
              <span style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{player.username}</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>({player.wpm} wpm)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function arePlayersEqual(prevPlayers: Player[], nextPlayers: Player[]) {
  if (prevPlayers.length !== nextPlayers.length) return false;
  for (let i = 0; i < prevPlayers.length; i++) {
    const p1 = prevPlayers[i];
    const p2 = nextPlayers[i];
    if (
      p1.socketId !== p2.socketId ||
      p1.progress !== p2.progress ||
      p1.wpm !== p2.wpm ||
      p1.accuracy !== p2.accuracy ||
      p1.finished !== p2.finished ||
      p1.timeline.length !== p2.timeline.length
    ) {
      return false;
    }
  }
  return true;
}

export const PerformanceGraph = React.memo(
  PerformanceGraphComponent,
  (prevProps, nextProps) => {
    return arePlayersEqual(prevProps.players, nextProps.players);
  }
);
