import React, { useEffect, useState } from 'react';
import { LogOut, Plus, Trophy, History, User, Coins, Award } from 'lucide-react';
import { getAvatarEmoji } from '../components/RaceTrack';

interface DashboardProps {
  user: any;
  onLogout: () => void;
  onJoinRoom: (roomCode: string, isSpectator: boolean) => void;
  onCreateRoom: () => void;
  onNavigateToProfile: () => void;
  onViewReplay: (matchId: string, replayData: any, textContent: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  onLogout,
  onJoinRoom,
  onCreateRoom,
  onNavigateToProfile,
  onViewReplay
}) => {
  const [roomCode, setRoomCode] = useState('');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalRaces: 0, totalWins: 0, highestWpm: 0, averageAccuracy: 0 });
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Fetch Dashboard metadata on mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Leaderboard
        const leadersRes = await fetch(`${API_URL}/api/leaderboard`);
        if (leadersRes.ok) {
          const leadersData = await leadersRes.json();
          setLeaderboard(leadersData);
        }

        // 2. Fetch User Profile Stats
        const profileRes = await fetch(`${API_URL}/api/users/${user.id}/profile`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setStats(profileData.stats);
        }

        // 3. Fetch User History
        const historyRes = await fetch(`${API_URL}/api/users/${user.id}/history`);
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setHistory(historyData);
        }
      } catch (err) {
        console.error('Error fetching dashboard info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.id, API_URL]);

  const handleJoinSubmit = (e: React.FormEvent, isSpectator = false) => {
    e.preventDefault();
    if (!roomCode) return;
    onJoinRoom(roomCode, isSpectator);
  };

  const handlePlayReplay = (item: any) => {
    try {
      const parsedReplay = JSON.parse(item.replay_data);
      onViewReplay(item.match_id, parsedReplay, item.text_content);
    } catch (e) {
      console.error('Failed to parse replay:', e);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* 1. Header Profile Panel */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '24px', 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: '20px',
          background: 'linear-gradient(135deg, rgba(22, 28, 45, 0.7) 0%, rgba(17, 22, 37, 0.6) 100%)' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.4))' }}>
            {getAvatarEmoji(user.avatar)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{user.username}</h2>
              <span 
                className="rank-badge" 
                style={{ 
                  color: user.rankColor || '#ff4500', 
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  borderColor: 'currentColor',
                  fontSize: '0.7rem'
                }}
              >
                {user.rankBadge || 'Bronze'}
              </span>
            </div>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Member since {new Date(user.created_at).toLocaleDateString()}
            </p>
            {/* XP & Coins progress bar */}
            <div style={{ display: 'flex', gap: '15px', marginTop: '8px', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)', fontWeight: 600 }}>
                <Award size={14} /> {user.xp} XP
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-gold)', fontWeight: 600 }}>
                <Coins size={14} /> {user.coins} Coins
              </span>
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={onNavigateToProfile}>
            <User size={16} /> Profile
          </button>
          <button className="btn btn-outline" onClick={onLogout} style={{ color: 'var(--color-char-incorrect)' }}>
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </div>

      {/* 2. Overview Stats & Play Actions grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Play Action Panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>⚔️ Matchmaking Lobby</h3>
          
          <button className="btn btn-primary" onClick={onCreateRoom} style={{ width: '100%' }}>
            <Plus size={18} /> Host Custom Race
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0' }}>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
            <span style={{ padding: '0 10px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>OR ENTER CODE</span>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--color-border)' }} />
          </div>

          <form onSubmit={(e) => handleJoinSubmit(e, false)} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="ROOM CODE"
              maxLength={4}
              className="form-input"
              style={{ textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '1.1rem' }}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <button type="submit" className="btn btn-cyber-cyan" disabled={!roomCode}>
              Race
            </button>
          </form>
        </div>

        {/* Quick Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Races Completed</span>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>{stats.totalRaces}</span>
          </div>
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Races Won</span>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-gold)' }}>{stats.totalWins}</span>
          </div>
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Best Speed (WPM)</span>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-cyan)' }}>{stats.highestWpm}</span>
          </div>
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Avg Accuracy</span>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-char-correct)' }}>{stats.averageAccuracy}%</span>
          </div>
        </div>

      </div>

      {/* 3. History Logs & Leaderboards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Match History */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
            <History size={16} /> Recent Matches
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
            {history.map((item) => (
              <div 
                key={item.id}
                style={{
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 'bold', color: item.rank === 1 ? 'var(--color-gold)' : '#fff' }}>
                      Rank #{item.rank}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {new Date(item.match_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '4px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                    "{item.text_content}"
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--color-cyan)' }}>{Math.round(item.wpm)} WPM</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{Math.round(item.accuracy)}% Acc</div>
                  </div>
                  {item.replay_data && (
                    <button 
                      onClick={() => handlePlayReplay(item)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '1.1rem' }}
                      title="Play Keystroke Replay"
                    >
                      ▶️
                    </button>
                  )}
                </div>
              </div>
            ))}

            {history.length === 0 && !loading && (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No races logged yet. Host or join a match to make your mark!
              </div>
            )}
          </div>
        </div>

        {/* Global Leaderboard */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
            <Trophy size={16} /> Global Highscores
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
            {leaderboard.map((item, idx) => {
              const rank = idx + 1;
              const isFirst = rank === 1;

              return (
                <div 
                  key={item.id}
                  style={{
                    padding: '12px',
                    backgroundColor: isFirst ? 'rgba(139,92,246,0.05)' : 'rgba(255,255,255,0.01)',
                    border: isFirst ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 800, width: '20px', color: rank <= 3 ? 'var(--color-gold)' : 'var(--color-text-muted)' }}>
                      #{rank}
                    </span>
                    <span style={{ fontSize: '1.5rem' }}>{getAvatarEmoji(item.avatar)}</span>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{item.username}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        Tier: <span style={{ color: item.rankColor }}>{item.rankBadge}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{item.xp} XP</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {item.wins} Wins / {item.total_races} Races
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
