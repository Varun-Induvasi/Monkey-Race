import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Square, SkipBack, Activity } from 'lucide-react';

interface ReplayPageProps {
  matchId: string;
  replayData: any[];
  textContent: string;
  onBackToDashboard: () => void;
}

export const ReplayPage: React.FC<ReplayPageProps> = ({
  matchId,
  replayData,
  textContent,
  onBackToDashboard
}) => {
  const [replayText, setReplayText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.5); // Default 1.5x speed
  
  const playbackTimeoutRefs = useRef<any[]>([]);

  const stopReplay = () => {
    playbackTimeoutRefs.current.forEach(clearTimeout);
    playbackTimeoutRefs.current = [];
    setIsPlaying(false);
    setReplayText('');
    setReplayProgress(0);
  };

  const startReplay = () => {
    stopReplay();
    if (!replayData || replayData.length === 0) {
      alert('No keystroke data available for this match.');
      return;
    }

    setIsPlaying(true);
    const finalLength = replayData.length;
    let currentString = '';
    let completedCount = 0;

    replayData.forEach((log: any, idx: number) => {
      // Speed up calculation: delay = offset / playbackSpeed
      const delay = log.t / playbackSpeed;

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
      }, delay);

      playbackTimeoutRefs.current.push(tId);
    });
  };

  // Auto start on page entry
  useEffect(() => {
    startReplay();
    return () => {
      stopReplay();
    };
  }, [matchId, playbackSpeed]);

  return (
    <div 
      className="animate-fade-in" 
      style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px' 
      }}
    >
      
      {/* Return link */}
      <div>
        <button 
          onClick={onBackToDashboard}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.95rem'
          }}
        >
          <ArrowLeft size={16} /> Return to Dashboard
        </button>
      </div>

      {/* Main player console */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header control deck */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} style={{ color: 'var(--color-cyan)' }} /> Telemetry Replay Player
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Match ID: {matchId.slice(0, 8)}...
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isPlaying ? (
              <button className="btn btn-secondary" onClick={stopReplay} style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                <Square size={12} /> Stop
              </button>
            ) : (
              <button className="btn btn-primary" onClick={startReplay} style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                <Play size={12} /> Play
              </button>
            )}
            <button className="btn btn-outline" onClick={stopReplay} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
              <SkipBack size={12} /> Reset
            </button>
          </div>
        </div>

        {/* Playback speed dials */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Playback Speed:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1.0, 1.5, 2.0, 3.0].map((speed) => (
              <button
                key={speed}
                onClick={() => { setPlaybackSpeed(speed); }}
                style={{
                  padding: '4px 10px',
                  backgroundColor: playbackSpeed === speed ? 'rgba(6,182,212,0.15)' : 'rgba(0,0,0,0.2)',
                  color: playbackSpeed === speed ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                  border: '1px solid',
                  borderColor: playbackSpeed === speed ? 'var(--color-cyan)' : 'var(--color-border)',
                  borderRadius: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                {speed.toFixed(1)}x
              </button>
            ))}
          </div>
        </div>

        {/* Typed content output pane */}
        <div 
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.3rem',
            lineHeight: '1.9rem',
            padding: '20px',
            borderRadius: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--color-border)',
            minHeight: '140px',
            color: 'var(--color-char-correct)',
            position: 'relative'
          }}
        >
          {replayText || (
            <span style={{ color: 'var(--color-text-dark)' }}>
              Awaiting replay trigger...
            </span>
          )}
          {isPlaying && <span className="caret"></span>}
        </div>

        {/* Progression bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span>Replay Progression</span>
            <span>{replayProgress}%</span>
          </div>
          <div style={{ height: '6px', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${replayProgress}%`, height: '100%', backgroundColor: 'var(--color-cyan)', transition: 'width 0.08s ease' }} />
          </div>
        </div>

        {/* Target Text comparators */}
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <strong>Original Target Prompt</strong>
          <div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px dashed var(--color-border)', color: 'var(--color-text-main)' }}>
            "{textContent}"
          </div>
        </div>

      </div>

    </div>
  );
};
