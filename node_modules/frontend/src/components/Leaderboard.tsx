import React from 'react';
import type { Player } from '../types';

interface LeaderboardProps {
  players: Player[];
}

const LeaderboardComponent: React.FC<LeaderboardProps> = ({ players }) => {
  // Filter spectators and sort players by progress (descending) and time (ascending if progress is 100%)
  const sortedPlayers = [...players]
    .filter(p => !p.isSpectator)
    .sort((a, b) => {
      if (b.progress !== a.progress) {
        return b.progress - a.progress;
      }
      return a.timeTakenMs - b.timeTakenMs;
    });

  const getMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  return (
    <div 
      className="glass-panel" 
      style={{ 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        height: '100%' 
      }}
    >
      <h3 style={{ fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🏆 Live Standings
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
              <th style={{ padding: '8px 4px' }}>Rank</th>
              <th style={{ padding: '8px 4px' }}>Player</th>
              <th style={{ padding: '8px 4px' }}>WPM</th>
              <th style={{ padding: '8px 4px' }}>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, idx) => {
              const rank = idx + 1;
              const isFirst = rank === 1;

              return (
                <tr 
                  key={player.socketId}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    color: isFirst ? 'var(--color-gold)' : 'var(--color-text-main)',
                    fontWeight: isFirst ? 'bold' : 'normal'
                  }}
                >
                  <td style={{ padding: '10px 4px', fontSize: rank <= 3 ? '1.1rem' : '0.9rem' }}>
                    {getMedal(rank)}
                  </td>
                  <td style={{ padding: '10px 4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {player.username}
                  </td>
                  <td style={{ padding: '10px 4px', fontFamily: 'var(--font-mono)' }}>
                    {player.wpm}
                  </td>
                  <td style={{ padding: '10px 4px', fontFamily: 'var(--font-mono)', color: player.accuracy > 95 ? 'var(--color-char-correct)' : 'var(--color-text-muted)' }}>
                    {player.accuracy}%
                  </td>
                </tr>
              );
            })}

            {sortedPlayers.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No participants.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

export const Leaderboard = React.memo(
  LeaderboardComponent,
  (prevProps, nextProps) => {
    return arePlayersEqual(prevProps.players, nextProps.players);
  }
);
