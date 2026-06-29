import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, BarChart2, List, Play, Square, Users } from 'lucide-react';

interface ResultsPageProps {
  results: any[];
  roomCode: string;
  socketId: string;
  roomText: string;
  onBackToLobby: () => void;
  onExitDashboard: () => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({
  results,
  roomCode,
  socketId,
  roomText,
  onBackToLobby,
  onExitDashboard
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'replay'>('stats');
  
  // Replay Player States
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0);
  const [replayText, setReplayText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  
  const playbackTimeoutRefs = useRef<any[]>([]);
  const selectedPlayer = results[selectedPlayerIndex];

  // Get podium ranks (1, 2, 3)
  const getMedal = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}th`;
  };

  // Replay playback triggers
  const stopReplay = () => {
    playbackTimeoutRefs.current.forEach(clearTimeout);
    playbackTimeoutRefs.current = [];
    setIsPlaying(false);
    setReplayText('');
    setReplayProgress(0);
  };

  const startReplay = () => {
    stopReplay();
    if (!selectedPlayer || !selectedPlayer.replayData || selectedPlayer.replayData.length === 0) {
      alert('No keystroke logs available for this player.');
      return;
    }

    setIsPlaying(true);
    const keyLogs = selectedPlayer.replayData;
    const finalLength = keyLogs.length;

    // Simulate key strokes
    let currentString = '';
    let completedCount = 0;

    keyLogs.forEach((log: any, idx: number) => {
      // Speed up factor: e.g. run at 1.5x speed if replay is too long
      const playbackDelay = log.t / 1.5;

      const tId = setTimeout(() => {
        if (log.a === 'insert') {
          currentString += log.k;
        } else if (log.a === 'delete') {
          currentString = currentString.slice(0, -1);
        }

        setReplayText(currentString);
        completedCount++;
        setReplayProgress(Math.round((completedCount / finalLength) * 100));

        if (idx === finalLength - 1) {
          setIsPlaying(false);
        }
      }, playbackDelay);

      playbackTimeoutRefs.current.push(tId);
    });
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      playbackTimeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div 
      className="animate-fade-in" 
      style={{ 
        maxWidth: '1000px', 
        margin: '0 auto', 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px' 
      }}
    >
      
      {/* 1. Header Podium Title */}
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 900, background: 'linear-gradient(to right, #fbbf24, #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🏁 Race Concluded!
        </h2>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '10px' }}>
          <button className="btn btn-cyber-cyan" onClick={onBackToLobby}>
            <RefreshCw size={16} /> Play Again
          </button>
          <button className="btn btn-outline" onClick={onExitDashboard}>
            Exit to Dashboard
          </button>
        </div>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Review typing speeds, precision accuracies, and watch keystrokes playbacks for Room {roomCode}.
        </p>
      </div>

      {/* Tab controls */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
        <button
          className={`btn ${activeTab === 'stats' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => { stopReplay(); setActiveTab('stats'); }}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <BarChart2 size={14} /> Telemetry Standings
        </button>
        <button
          className={`btn ${activeTab === 'replay' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('replay')}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <Play size={14} /> Keystroke Replays
        </button>
      </div>

      {/* TAB 1: Stats summary panel */}
      {activeTab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Detailed rankings grid */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.1rem' }}>
              <List size={16} /> Scoreboard standings
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {results.map((res: any) => {
                const isMe = res.userId === socketId || res.username === socketId; // guest check fallback
                
                return (
                  <div 
                    key={res.rank}
                    style={{
                      padding: '16px',
                      backgroundColor: isMe ? 'rgba(139, 92, 246, 0.04)' : 'rgba(255,255,255,0.01)',
                      border: '1px solid',
                      borderColor: isMe ? 'var(--color-primary)' : res.rank === 1 ? 'var(--color-gold)' : 'var(--color-border)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: isMe ? 'var(--shadow-neon-primary)' : res.rank === 1 ? '0 0 15px rgba(251,191,36,0.1)' : 'none'
                    }}
                  >
                    {/* Header: Rank + username */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                        {getMedal(res.rank)}
                      </span>
                      <strong style={{ fontSize: '1rem', color: '#fff' }}>
                        {res.username} {isMe && '(You)'}
                      </strong>
                    </div>

                    {/* Stats metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                      <div style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>Net WPM</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--color-cyan)' }}>{res.wpm}</strong>
                      </div>
                      <div style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>Accuracy</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--color-char-correct)' }}>{res.accuracy}%</strong>
                      </div>
                      <div style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>Time Taken</span>
                        <strong style={{ fontSize: '1.1rem' }}>{(res.timeTakenMs / 1000).toFixed(1)}s</strong>
                      </div>
                      <div style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.75rem' }}>XP Gained</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>+{res.xpGained} XP</strong>
                      </div>
                    </div>

                    {/* Extra detail line */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Errors: <strong>{res.errorsCount}</strong></span>
                      <span>Raw WPM: <strong>{res.rawWpm}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Replay playback boards */}
      {activeTab === 'replay' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          
          {/* Left panel: Player selector */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={14} /> Select Racer
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {results.map((res: any, idx: number) => (
                <button
                  key={res.rank}
                  onClick={() => { stopReplay(); setSelectedPlayerIndex(idx); }}
                  style={{
                    padding: '10px',
                    textAlign: 'left',
                    background: selectedPlayerIndex === idx ? 'rgba(139,92,246,0.1)' : 'rgba(0,0,0,0.2)',
                    color: selectedPlayerIndex === idx ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    border: '1px solid',
                    borderColor: selectedPlayerIndex === idx ? 'var(--color-primary)' : 'var(--color-border)',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>{getMedal(res.rank)} {res.username}</span>
                  <span style={{ fontSize: '0.75rem' }}>{res.wpm} WPM</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right panel: Replay simulator display */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
              <div>
                <h4 style={{ fontSize: '1.1rem' }}>Keystroke replay: {selectedPlayer?.username}</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Total Keypresses: {selectedPlayer?.replayData?.length || 0} (Speed: {selectedPlayer?.wpm} WPM)
                </p>
              </div>

              <div>
                {isPlaying ? (
                  <button className="btn btn-secondary" onClick={stopReplay} style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                    <Square size={12} /> Stop Replay
                  </button>
                ) : (
                  <button 
                    className="btn btn-primary" 
                    onClick={startReplay} 
                    disabled={!selectedPlayer?.replayData || selectedPlayer.replayData.length === 0}
                    style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                  >
                    <Play size={12} /> Play Replay
                  </button>
                )}
              </div>
            </div>

            {/* Replay display text box */}
            <div 
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.25rem',
                lineHeight: '1.8rem',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--color-border)',
                minHeight: '120px',
                color: 'var(--color-char-correct)',
                position: 'relative'
              }}
            >
              {replayText || (
                <span style={{ color: 'var(--color-text-dark)' }}>
                  Click Play Replay to simulate key events...
                </span>
              )}
              {isPlaying && <span className="caret"></span>}
            </div>

            {/* Playback progress bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                <span>Playback Progress</span>
                <span>{replayProgress}%</span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${replayProgress}%`, height: '100%', backgroundColor: 'var(--color-primary)', transition: 'width 0.1s ease' }} />
              </div>
            </div>

            {/* Reference text comparatives */}
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              <strong>Prompt Target:</strong>
              <div style={{ padding: '8px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '4px', border: '1px dashed var(--color-border)', marginTop: '4px' }}>
                "{roomText}"
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
