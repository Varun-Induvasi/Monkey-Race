import React from 'react';
import type { Player } from '../types';

interface RaceTrackProps {
  players: Player[];
  hostId: string;
}

// Avatar name-to-emoji mapper
export const getAvatarEmoji = (avatarName: string): string => {
  switch (avatarName) {
    case 'monkey_ninja': return '🥷🐵';
    case 'monkey_cyborg': return '🤖🐵';
    case 'monkey_astronaut': return '🚀🐵';
    case 'monkey_wizard': return '🧙🐵';
    case 'monkey_banana':
    default:
      return '🍌🐵';
  }
};

export const getAvatarLabel = (avatarName: string): string => {
  switch (avatarName) {
    case 'monkey_ninja': return 'Ninja Monkey';
    case 'monkey_cyborg': return 'Cyborg Monkey';
    case 'monkey_astronaut': return 'Space Monkey';
    case 'monkey_wizard': return 'Wizard Monkey';
    case 'monkey_banana':
    default:
      return 'Banana Monkey';
  }
};

const RaceTrackComponent: React.FC<RaceTrackProps> = ({ players, hostId }) => {
  // Sort players by progress (spectators are ignored on track)
  const typingPlayers = players.filter(p => !p.isSpectator);

  return (
    <div 
      className="glass-panel" 
      style={{ 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px',
        width: '100%' 
      }}
    >
      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🏎️ Monkey Arena Track
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {typingPlayers.map((player) => {
          const isFinished = player.finished;
          const avatar = getAvatarEmoji(player.avatar);

          return (
            <div 
              key={player.socketId}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '10px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.04)',
                position: 'relative'
              }}
            >
              {/* Lane Info Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>
                    {player.username}
                  </span>
                  {player.socketId === hostId && (
                    <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--color-primary)', color: '#fff', padding: '1px 4px', borderRadius: '4px' }}>
                      Host
                    </span>
                  )}
                  {isFinished && (
                    <span style={{ color: 'var(--color-char-correct)', fontWeight: 'bold' }}>
                      🏁 Finished
                    </span>
                  )}
                </div>
                <div style={{ color: 'var(--color-text-muted)', display: 'flex', gap: '10px' }}>
                  <span>Speed: <strong style={{ color: 'var(--color-cyan)' }}>{player.wpm}</strong> WPM</span>
                  <span>Acc: <strong style={{ color: 'var(--color-char-correct)' }}>{player.accuracy}%</strong></span>
                </div>
              </div>

              {/* Lane Track */}
              <div 
                style={{
                  height: '40px',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 20px)'
                }}
              >
                {/* Finish Line Indicator */}
                <div 
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    right: '15px',
                    width: '6px',
                    backgroundImage: 'repeating-linear-gradient(0deg, #000 0px, #000 5px, #fff 5px, #fff 10px)',
                    opacity: 0.7
                  }}
                />

                {/* Animated Avatar Runner */}
                <div
                  style={{
                    position: 'absolute',
                    left: `calc(${player.progress}% - 24px)`, // Offset to prevent clipping at the start
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1.6rem',
                    transition: 'left 0.12s linear',
                    zIndex: 5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    filter: isFinished ? 'drop-shadow(0 0 8px var(--color-char-correct))' : 'none'
                  }}
                >
                  <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>
                    {avatar}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {typingPlayers.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Waiting for typing contestants...
          </div>
        )}
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

export const RaceTrack = React.memo(
  RaceTrackComponent,
  (prevProps, nextProps) => {
    return prevProps.hostId === nextProps.hostId && arePlayersEqual(prevProps.players, nextProps.players);
  }
);
