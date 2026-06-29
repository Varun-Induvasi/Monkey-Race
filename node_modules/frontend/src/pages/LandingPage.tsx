import React, { useState } from 'react';
import { Key, Mail, User, Play, Award, Zap } from 'lucide-react';

interface LandingPageProps {
  onLogin: (token: string, userData: any) => void;
  onPlayAsGuest: (username: string) => void;
  onJoinRoom: (roomCode: string, isSpectator: boolean, guestName?: string) => void;
  onCreateRoom: (guestName?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLogin,
  onPlayAsGuest,
  onJoinRoom,
  onCreateRoom
}) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [roomCode, setRoomCode] = useState('');
  const [guestName, setGuestName] = useState('');
  
  // Auth Form State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/signup';
    const payload = isLoginMode 
      ? { email, password } 
      : { username, email, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onLogin(data.token, data.user);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = guestName.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    onPlayAsGuest(finalName);
  };

  const handleJoinSubmit = (e: React.FormEvent, isSpectator = false) => {
    e.preventDefault();
    if (!roomCode) return;
    onJoinRoom(roomCode, isSpectator, guestName);
  };

  return (
    <div 
      className="animate-fade-in"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '40px',
        alignItems: 'center',
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto',
        minHeight: '80vh'
      }}
    >
      {/* Product Hero Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: '20px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', width: 'fit-content' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} /> Real-Time Multiplayer Racing
          </span>
        </div>
        
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: '4rem', fontFamily: 'var(--font-display)', background: 'linear-gradient(to right, #ffffff, #a855f7, #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Monkey Race
        </h1>
        
        <p style={{ fontSize: '1.2rem', color: 'var(--color-text-muted)', lineHeight: '1.8rem' }}>
          Replicate the hyper-precise typing experience of Monkeytype, but side-by-side with your friends in a competitive 60 FPS multiplayer arena.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '8px', color: 'var(--color-cyan)' }}><Zap size={18} /></div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Ultra Low Latency Sync</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Socket-driven telemetry coordinates updates at &lt;100ms speeds.</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '8px', color: 'var(--color-secondary)' }}><Award size={18} /></div>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Gamified Ranking & Progression</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Level up, collect coins, unlock achievements and climb ranking badges.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Authentication Panel & Guest Join Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Play Instantly / Join Rooms Form */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>🕹️ Fast Match Lobby</h3>
          
          <form onSubmit={handleGuestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Select Display Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. SpeedMonkey42"
              className="form-input"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
              <button type="submit" className="btn btn-primary">
                <Play size={16} /> Guest Host
              </button>
              <button type="button" className="btn btn-outline" onClick={() => onCreateRoom(guestName)}>
                Quick Room
              </button>
            </div>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
            <span style={{ padding: '0 10px', fontSize: '0.85rem', color: 'var(--color-text-dark)' }}>OR JOIN CODE</span>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
          </div>

          <form onSubmit={(e) => handleJoinSubmit(e, false)} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Room Code (e.g. ABCD)"
              maxLength={4}
              className="form-input"
              style={{ textTransform: 'uppercase', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem', padding: '8px' }}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <button type="submit" className="btn btn-cyber-cyan" disabled={!roomCode}>
              Race
            </button>
            <button type="button" className="btn btn-outline" disabled={!roomCode} onClick={(e) => handleJoinSubmit(e, true)}>
              Spectate
            </button>
          </form>
        </div>

        {/* Member Authentication Form */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
            <button 
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                color: isLoginMode ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: 700,
                borderBottom: isLoginMode ? '2px solid var(--color-primary)' : 'none',
                cursor: 'pointer'
              }}
              onClick={() => setIsLoginMode(true)}
            >
              Sign In
            </button>
            <button 
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                color: !isLoginMode ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: 700,
                borderBottom: !isLoginMode ? '2px solid var(--color-primary)' : 'none',
                cursor: 'pointer'
              }}
              onClick={() => setIsLoginMode(false)}
            >
              Register Account
            </button>
          </div>

          {authError && (
            <div style={{ padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-char-incorrect)', color: 'var(--color-char-incorrect)', borderRadius: '6px', fontSize: '0.85rem' }}>
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!isLoginMode && (
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  placeholder="Username"
                  required
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                placeholder="Email or Username"
                required
                className="form-input"
                style={{ paddingLeft: '38px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Key size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--color-text-muted)' }} />
              <input
                type="password"
                placeholder="Password"
                required
                className="form-input"
                style={{ paddingLeft: '38px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ marginTop: '6px' }}>
              {isLoading ? 'Verifying...' : isLoginMode ? 'Sign In' : 'Create Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
