import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Timer, Keyboard, Eye } from 'lucide-react';
import { TypingArea } from '../components/TypingArea';
import { RaceTrack } from '../components/RaceTrack';
import { PerformanceGraph } from '../components/PerformanceGraph';
import { Leaderboard } from '../components/Leaderboard';
import { useSocket } from '../context/SocketContext';

interface ArenaPageProps {
  room: any;
  socketId: string;
  onLeaveRoom: () => void;
}

export const ArenaPage: React.FC<ArenaPageProps> = ({ room, socketId, onLeaveRoom }) => {
  const { socket } = useSocket();
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerIntervalRef = useRef<any>(null);

  const myPlayer = room.players[socketId];
  const isSpectator = myPlayer?.isSpectator;

  // Sync elapsed timer on client for words-based mode
  useEffect(() => {
    if (room.status === 'racing' && room.startTime) {
      // Calculate local elapsed timer every 100ms
      timerIntervalRef.current = setInterval(() => {
        const delta = (Date.now() - room.startTime) / 1000;
        setElapsedTime(parseFloat(delta.toFixed(1)));
      }, 100);
    } else {
      setElapsedTime(0);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [room.status, room.startTime]);

  const handleProgressUpdate = useCallback((stats: any) => {
    if (!socket || isSpectator) return;
    
    // Broadcast progress stats to all players in the room
    socket.emit('update-progress', {
      code: room.code,
      progress: stats.progress,
      wpm: stats.wpm,
      rawWpm: stats.rawWpm,
      accuracy: stats.accuracy,
      errorCount: stats.errorCount,
      correctChars: stats.correctChars,
      incorrectChars: stats.incorrectChars,
      finished: stats.finished,
      timeTakenMs: stats.timeTakenMs,
      timelineEntry: stats.timelineEntry,
      // Pass the keystroke logs for replay recording
      replayData: stats.replayData
    });
  }, [socket, isSpectator, room.code]);

  const getTimerDisplay = () => {
    if (room.settings.mode === 'time') {
      return `${room.timerValue}s remaining`;
    }
    return `${elapsedTime}s elapsed`;
  };

  return (
    <div 
      className="animate-fade-in" 
      style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '20px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px' 
      }}
    >
      
      {/* 1. Synced Countdown Screen Overlay */}
      {room.status === 'countdown' && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'rgba(5, 6, 8, 0.96)', 
            backdropFilter: 'blur(12px)',
            zIndex: 1000 
          }}
        >
          <div 
            style={{ 
              fontSize: '12rem', 
              fontWeight: 900, 
              color: room.countdownValue === 1 ? 'var(--color-secondary)' : 'var(--color-primary)', 
              fontFamily: 'var(--font-display)',
              filter: `drop-shadow(0 0 30px ${room.countdownValue === 1 ? 'var(--color-secondary)' : 'var(--color-primary)'})`,
              animation: 'scalePulse 1s ease-in-out infinite'
            }}
          >
            {room.countdownValue}
          </div>
          <h2 style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '1.2rem', color: 'var(--color-text-muted)', marginTop: '20px' }}>
            Get ready to race
          </h2>
        </div>
      )}

      {/* 2. Top Stats Header Row */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '16px 24px', 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: '12px' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>Arena: <span style={{ color: 'var(--color-primary)' }}>{room.code}</span></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-cyan)', fontSize: '0.9rem' }}>
            <Timer size={16} />
            <strong style={{ fontFamily: 'var(--font-mono)' }}>{getTimerDisplay()}</strong>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Rules: <strong style={{ textTransform: 'capitalize', color: '#fff' }}>{room.settings.difficulty}</strong> Mode
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isSpectator && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: 'rgba(6, 182, 212, 0.1)', border: '1px solid var(--color-cyan)', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--color-cyan)', fontWeight: 'bold' }}>
              <Eye size={12} /> SPECTATING
            </span>
          )}
          <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={onLeaveRoom}>
            Forfeit Race
          </button>
        </div>
      </div>

      {/* 3. Main Arena layout grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px' }}>
        
        {/* Left Column: Typing box, tracks, telemetry graph */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main typing container */}
          {isSpectator ? (
            <div 
              className="glass-panel" 
              style={{ 
                padding: '40px', 
                textAlign: 'center', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px', 
                alignItems: 'center',
                color: 'var(--color-text-muted)' 
              }}
            >
              <Keyboard size={36} style={{ color: 'var(--color-cyan)' }} />
              <h4 style={{ fontSize: '1.2rem', color: '#fff' }}>Match in Progress</h4>
              <p style={{ fontSize: '0.9rem', maxWidth: '400px' }}>
                You are currently spectating this match. Progress curves and avatar standings are displayed in real-time below.
              </p>
            </div>
          ) : (
            <TypingArea
              textContent={room.textContent}
              difficulty={room.settings.difficulty}
              onProgressUpdate={handleProgressUpdate}
              isActive={room.status === 'racing'}
              startTime={room.startTime}
            />
          )}

          {/* Smooth Race Tracks */}
          <RaceTrack players={Object.values(room.players)} hostId={room.hostId} />

          {/* SVG Telemetry Dashboard */}
          <PerformanceGraph players={Object.values(room.players)} />

        </div>

        {/* Right Column: Live standings */}
        <div style={{ minWidth: '240px' }}>
          <Leaderboard players={Object.values(room.players)} />
        </div>

      </div>

      {/* Embedded scale frames for animations */}
      <style>{`
        @keyframes scalePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
      `}</style>

    </div>
  );
};
