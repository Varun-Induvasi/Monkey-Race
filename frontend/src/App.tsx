import { useState, useEffect, useRef } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { LobbyPage } from './pages/LobbyPage';
import { ArenaPage } from './pages/ArenaPage';
import { ResultsPage } from './pages/ResultsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReplayPage } from './pages/ReplayPage';
import { Signal, SignalHigh } from 'lucide-react';

function MonkeyRaceApp() {
  const { socket, isConnected, connectSocket } = useSocket();
  
  // Routing and User sessions states
  const [page, setPage] = useState<'landing' | 'dashboard' | 'lobby' | 'arena' | 'results' | 'profile' | 'replay'>('landing');
  const [user, setUser] = useState<any>(null); // { id, username, email, xp, coins, avatar, rankBadge, rankColor }
  const [room, setRoom] = useState<any>(null);
  
  // Cache variables for results and replay displays
  const [resultsData, setResultsData] = useState<any[]>([]);
  const [replayState, setReplayState] = useState<{ matchId: string; replayData: any[]; textContent: string } | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 
    (window.location.port === '5173' || window.location.port === '5174'
      ? 'http://localhost:3001'
      : window.location.origin);

  // 1. Session verification on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          connectSocket();
          setPage('dashboard');
        } else {
          localStorage.removeItem('token');
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    };

    checkSession();
  }, [API_URL, connectSocket]);

  // Keep page in a ref to avoid tearing down socket listeners on every navigation change
  const pageRef = useRef(page);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  // 2. Bind global WebSocket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('room-created', (roomDetails: any) => {
      setRoom(roomDetails);
      setPage('lobby');
    });

    socket.on('room-joined', (roomDetails: any) => {
      setRoom(roomDetails);
      if (roomDetails.status === 'racing') {
        setPage('arena');
      } else {
        setPage('lobby');
      }
    });

    socket.on('room-updated', (roomDetails: any) => {
      setRoom(roomDetails);
      if (roomDetails.status === 'countdown' && pageRef.current !== 'arena') {
        setPage('arena');
      } else if (roomDetails.status === 'racing' && pageRef.current !== 'arena') {
        setPage('arena');
      }
    });

    socket.on('countdown-tick', ({ value }: { value: number }) => {
      setRoom((prev: any) => prev ? { ...prev, countdownValue: value } : null);
    });

    socket.on('timer-tick', ({ value }: { value: number }) => {
      setRoom((prev: any) => prev ? { ...prev, timerValue: value } : null);
    });

    socket.on('race-finished', ({ results }: { results: any[] }) => {
      setResultsData(results);
      setPage('results');
    });

    socket.on('error', (msg: string) => {
      alert(`⚠️ Game Error: ${msg}`);
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('room-updated');
      socket.off('countdown-tick');
      socket.off('timer-tick');
      socket.off('race-finished');
      socket.off('error');
    };
  }, [socket]);

  // 3. User controllers

  const handleLogin = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    setUser(userData);
    connectSocket();
    setPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setRoom(null);
    setPage('landing');
  };

  const handlePlayAsGuest = (guestUsername: string) => {
    // Generate guest token model (not saved in DB)
    const guestUser = {
      id: `guest_${Math.floor(1000 + Math.random() * 9000)}`,
      username: guestUsername,
      avatar: 'monkey_banana',
      xp: 0,
      coins: 0,
      rankBadge: 'Bronze',
      rankColor: '#cd7f32'
    };
    setUser(guestUser);
    const activeSocket = socket || connectSocket();

    activeSocket.emit('create-room', {
      userId: guestUser.id,
      username: guestUser.username,
      avatar: guestUser.avatar
    });
  };

  const handleJoinRoom = (roomCode: string, isSpectator: boolean, guestUsername?: string) => {
    let currentUser = user;
    if (!currentUser) {
      const finalName = guestUsername?.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
      currentUser = {
        id: `guest_${Math.floor(1000 + Math.random() * 9000)}`,
        username: finalName,
        avatar: 'monkey_banana',
        xp: 0,
        coins: 0,
        rankBadge: 'Bronze',
        rankColor: '#cd7f32'
      };
      setUser(currentUser);
    }
    const activeSocket = socket || connectSocket();
    
    activeSocket.emit('join-room', {
      code: roomCode,
      userId: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.avatar,
      isSpectator
    });
  };

  const handleCreateRoom = (guestUsername?: string) => {
    let currentUser = user;
    if (!currentUser) {
      const finalName = guestUsername?.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
      currentUser = {
        id: `guest_${Math.floor(1000 + Math.random() * 9000)}`,
        username: finalName,
        avatar: 'monkey_banana',
        xp: 0,
        coins: 0,
        rankBadge: 'Bronze',
        rankColor: '#cd7f32'
      };
      setUser(currentUser);
    }
    const activeSocket = socket || connectSocket();

    activeSocket.emit('create-room', {
      userId: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.avatar
    });
  };

  const handleToggleReady = () => {
    if (!room) return;
    socket?.emit('toggle-ready', { code: room.code });
  };

  const handleChangeSettings = (settings: any) => {
    if (!room) return;
    socket?.emit('change-settings', { code: room.code, settings });
  };

  const handleStartRace = () => {
    if (!room) return;
    socket?.emit('start-race', { code: room.code });
  };

  const handleLeaveRoom = () => {
    if (!room) return;
    socket?.emit('leave-room');
    setRoom(null);
    
    // Guest gets routed to landing, registered user to dashboard
    if (user.id.startsWith('guest_')) {
      setPage('landing');
    } else {
      setPage('dashboard');
    }
  };

  const handleViewReplay = (matchId: string, replayData: any[], textContent: string) => {
    setReplayState({ matchId, replayData, textContent });
    setPage('replay');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Universal navigation header */}
      <header 
        style={{ 
          padding: '16px 40px', 
          borderBottom: '1px solid var(--color-border)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: 'rgba(5, 6, 8, 0.4)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <div 
          onClick={() => {
            if (room) {
              if (confirm('Leave current lobby / race?')) {
                handleLeaveRoom();
              }
              return;
            }
            if (user && !user.id.startsWith('guest_')) {
              setPage('dashboard');
            } else {
              setPage('landing');
            }
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <span style={{ fontSize: '1.8rem', animation: 'float 3s ease-in-out infinite' }}>🐵</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
            MONKEY <span style={{ color: 'var(--color-primary)' }}>RACE</span>
          </span>
        </div>

        {/* Server status indicator lights */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          {isConnected ? (
            <span style={{ color: 'var(--color-char-correct)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <SignalHigh size={14} /> Server Synced
            </span>
          ) : (
            <span style={{ color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Signal size={14} /> Standalone
            </span>
          )}
        </div>
      </header>

      {/* Main page content area */}
      <main style={{ flex: 1, padding: '20px' }}>
        {page === 'landing' && (
          <LandingPage
            onLogin={handleLogin}
            onPlayAsGuest={handlePlayAsGuest}
            onJoinRoom={(code, isSpectator, guestName) => handleJoinRoom(code, isSpectator, guestName)}
            onCreateRoom={handleCreateRoom}
          />
        )}

        {page === 'dashboard' && (
          <Dashboard
            user={user}
            onLogout={handleLogout}
            onJoinRoom={(code) => handleJoinRoom(code, false)}
            onCreateRoom={handleCreateRoom}
            onNavigateToProfile={() => setPage('profile')}
            onViewReplay={handleViewReplay}
          />
        )}

        {page === 'lobby' && room && (
          <LobbyPage
            room={room}
            socketId={socket?.id || ''}
            onToggleReady={handleToggleReady}
            onChangeSettings={handleChangeSettings}
            onStartRace={handleStartRace}
            onLeaveRoom={handleLeaveRoom}
          />
        )}

        {page === 'arena' && room && (
          <ArenaPage
            room={room}
            socketId={socket?.id || ''}
            onLeaveRoom={handleLeaveRoom}
          />
        )}

        {page === 'results' && (
          <ResultsPage
            results={resultsData}
            roomCode={room?.code || ''}
            socketId={socket?.id || ''}
            roomText={room?.textContent || ''}
            onBackToLobby={() => setPage('lobby')}
            onExitDashboard={() => {
              setRoom(null);
              if (user.id.startsWith('guest_')) {
                setPage('landing');
              } else {
                setPage('dashboard');
              }
            }}
          />
        )}

        {page === 'profile' && user && (
          <ProfilePage
            user={user}
            onUpdateUser={(updated) => setUser(updated)}
            onBackToDashboard={() => setPage('dashboard')}
          />
        )}

        {page === 'replay' && replayState && (
          <ReplayPage
            matchId={replayState.matchId}
            replayData={replayState.replayData}
            textContent={replayState.textContent}
            onBackToDashboard={() => setPage('dashboard')}
          />
        )}
      </main>

      {/* Page Footer */}
      <footer style={{ padding: '20px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-dark)', borderTop: '1px solid var(--color-border)', marginTop: '4px' }}>
        Monkey Race Typing Arena &copy; {new Date().getFullYear()} &middot; Built with React &amp; WebSockets
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>

    </div>
  );
}

export default function App() {
  return (
    <SocketProvider>
      <MonkeyRaceApp />
    </SocketProvider>
  );
}
