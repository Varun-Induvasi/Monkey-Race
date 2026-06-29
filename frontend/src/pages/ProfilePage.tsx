import React, { useEffect, useState } from 'react';
import { Award, ArrowLeft, Check, BarChart3, Lock, CheckCircle } from 'lucide-react';
import { getAvatarEmoji, getAvatarLabel } from '../components/RaceTrack';

interface ProfilePageProps {
  user: any;
  onUpdateUser: (updatedUser: any) => void;
  onBackToDashboard: () => void;
}

const AVATAR_OPTIONS = [
  'monkey_banana',
  'monkey_ninja',
  'monkey_cyborg',
  'monkey_astronaut',
  'monkey_wizard'
];

const ACHIEVEMENT_INFO: Record<string, { title: string; desc: string; icon: string }> = {
  first_victory: {
    title: '🥇 First Victory',
    desc: 'Finish rank #1 in a typing race.',
    icon: '👑'
  },
  wins_10: {
    title: '🏆 Champion Racer',
    desc: 'Secure 10 race victories.',
    icon: '⚔️'
  },
  races_10: {
    title: '🏃 Veteran Starter',
    desc: 'Complete 10 typing matches.',
    icon: '🏁'
  },
  races_100: {
    title: '⚡ Marathon Runner',
    desc: 'Complete 100 typing matches.',
    icon: '🔥'
  },
  wpm_100: {
    title: '🚀 100 WPM Club',
    desc: 'Achieve a typing speed of 100 WPM or more.',
    icon: '⚡'
  },
  wpm_120: {
    title: '☄️ 120 WPM Club',
    desc: 'Achieve a typing speed of 120 WPM or more.',
    icon: '✨'
  },
  wpm_150: {
    title: '🛸 150 WPM Overdrive',
    desc: 'Achieve a typing speed of 150 WPM or more.',
    icon: '🛰️'
  },
  accuracy_master: {
    title: '🎯 Accuracy Master',
    desc: 'Finish a race with 99% or higher precision.',
    icon: '🎯'
  }
};

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onUpdateUser,
  onBackToDashboard
}) => {
  const [profileData, setProfileData] = useState<any>(null);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Fetch full stats and achievements on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/${user.id}/profile`);
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
        }
      } catch (err) {
        console.error('Error fetching profile stats:', err);
      }
    };

    fetchProfile();
  }, [user.id, API_URL]);

  const handleAvatarSelect = async (avatarName: string) => {
    if (updatingAvatar) return;
    setUpdatingAvatar(true);
    setSelectedAvatar(avatarName);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatar: avatarName })
      });

      if (res.ok) {
        // Update user state at app level
        onUpdateUser({ ...user, avatar: avatarName });
      } else {
        alert('Failed to update avatar.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const unlockedSet = new Set(
    profileData?.achievements?.map((a: any) => a.key) || []
  );

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
      
      {/* Return button */}
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
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      {/* Main Profile Info Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Avatar customization tool */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.15rem' }}>🐵 Select Monkey Character</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {AVATAR_OPTIONS.map((opt) => {
              const isActive = selectedAvatar === opt;
              return (
                <button
                  key={opt}
                  onClick={() => handleAvatarSelect(opt)}
                  disabled={updatingAvatar}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: isActive ? 'rgba(139,92,246,0.1)' : 'rgba(0,0,0,0.2)',
                    border: '1px solid',
                    borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    color: '#fff',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '2rem' }}>{getAvatarEmoji(opt)}</span>
                    <strong style={{ fontSize: '0.9rem' }}>{getAvatarLabel(opt)}</strong>
                  </div>
                  {isActive && <Check size={18} style={{ color: 'var(--color-primary)' }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats aggregate values */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart3 size={18} /> Career Statistics
          </h3>

          {profileData ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Races Run</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{profileData.stats.totalRaces}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Victories</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-gold)' }}>{profileData.stats.totalWins}</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Highest speed</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-cyan)' }}>{profileData.stats.highestWpm} WPM</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Avg accuracy</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-char-correct)' }}>{profileData.stats.averageAccuracy}%</div>
              </div>
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Lifetime XP Level</span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>
                  {user.rankBadge} Rank ({user.xp} XP total)
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              Loading player telemetry...
            </div>
          )}
        </div>

      </div>

      {/* Achievements Gallery grid */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
          <Award size={18} style={{ color: 'var(--color-gold)' }} /> Achievements Gallery
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {Object.entries(ACHIEVEMENT_INFO).map(([key, info]) => {
            const isUnlocked = unlockedSet.has(key);
            
            return (
              <div
                key={key}
                style={{
                  padding: '16px',
                  backgroundColor: isUnlocked ? 'rgba(139,92,246,0.04)' : 'rgba(0,0,0,0.3)',
                  border: '1px solid',
                  borderColor: isUnlocked ? 'var(--color-primary)' : 'var(--color-border)',
                  borderRadius: '10px',
                  opacity: isUnlocked ? 1 : 0.45,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  position: 'relative',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.8rem' }}>{info.icon}</span>
                  {isUnlocked ? (
                    <CheckCircle size={16} style={{ color: 'var(--color-char-correct)' }} />
                  ) : (
                    <Lock size={14} style={{ color: 'var(--color-text-dark)' }} />
                  )}
                </div>
                
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: isUnlocked ? '#fff' : 'var(--color-text-muted)' }}>
                  {info.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: '1rem' }}>
                  {info.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
