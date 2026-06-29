import React, { useState, useEffect, useRef } from 'react';
import { Users, Settings, Play, Check, X, MessageSquare, Send, Copy } from 'lucide-react';
import { getAvatarEmoji } from '../components/RaceTrack';
import { useSocket } from '../context/SocketContext';

interface LobbyPageProps {
  room: any;
  socketId: string;
  onToggleReady: () => void;
  onChangeSettings: (settings: any) => void;
  onStartRace: () => void;
  onLeaveRoom: () => void;
}

export const LobbyPage: React.FC<LobbyPageProps> = ({
  room,
  socketId,
  onToggleReady,
  onChangeSettings,
  onStartRace,
  onLeaveRoom
}) => {
  const { socket } = useSocket();
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isHost = room.hostId === socketId;
  const myPlayer = room.players[socketId];

  const playersList = Object.values(room.players).filter((p: any) => !p.isSpectator);
  const spectatorsList = Object.values(room.players).filter((p: any) => p.isSpectator);

  const allReady = playersList.every((p: any) => p.ready);

  // Setup lobby chat listeners
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (msg: any) => {
      setChatMessages(prev => [...prev, msg]);
    };

    socket.on('chat-message', handleChatMessage);

    // Clean up
    return () => {
      socket.off('chat-message', handleChatMessage);
    };
  }, [socket]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;

    const chatMsg = {
      sender: myPlayer?.username || 'Player',
      avatar: myPlayer?.avatar || 'monkey_banana',
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Emit chat event to all room members
    socket.emit('send-chat', { code: room.code, message: chatMsg });
    setChatInput('');
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleModeChange = (mode: 'words' | 'time' | 'custom') => {
    let defaultValue = 25;
    if (mode === 'time') defaultValue = 30;
    onChangeSettings({ mode, value: defaultValue });
  };

  const handleValueChange = (val: number) => {
    onChangeSettings({ value: val });
  };

  const handleDifficultyChange = (difficulty: 'normal' | 'expert' | 'master') => {
    onChangeSettings({ difficulty });
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Lobby header section */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>WAITING LOBBY</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>Room Code: <span style={{ color: 'var(--color-cyan)' }}>{room.code}</span></h2>
            <button 
              onClick={copyRoomCode}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '6px 10px',
                cursor: 'pointer',
                color: 'var(--color-text-main)',
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Copy size={12} /> {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={onLeaveRoom} style={{ color: 'var(--color-char-incorrect)' }}>
            Leave Room
          </button>
          {!myPlayer?.isSpectator && (
            <button 
              className={`btn ${myPlayer?.ready ? 'btn-outline' : 'btn-cyber-cyan'}`}
              onClick={onToggleReady}
              style={{ borderColor: myPlayer?.ready ? 'var(--color-char-correct)' : '' }}
            >
              {myPlayer?.ready ? '✓ Ready' : 'Ready Up'}
            </button>
          )}
          {isHost && (
            <button 
              className="btn btn-primary"
              disabled={!allReady}
              onClick={onStartRace}
              title={!allReady ? 'Wait for all typists to ready up' : 'Start the Race!'}
            >
              <Play size={16} /> Start Race
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Settings & Players list */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Left Column: Room customization options */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
            <Settings size={18} /> Room Parameters
          </h3>

          {/* Mode Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Type Mode</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['words', 'time', 'custom'] as const).map((m) => (
                <button
                  key={m}
                  disabled={!isHost}
                  onClick={() => handleModeChange(m)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: room.settings.mode === m ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.2)',
                    color: room.settings.mode === m ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    border: '1px solid',
                    borderColor: room.settings.mode === m ? 'var(--color-primary)' : 'var(--color-border)',
                    borderRadius: '6px',
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    cursor: isHost ? 'pointer' : 'not-allowed'
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Value Selection (word limits / seconds counters) */}
          {room.settings.mode !== 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {room.settings.mode === 'words' ? 'Word Length' : 'Time Seconds'}
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(room.settings.mode === 'words' ? [15, 25, 50, 100] : [15, 30, 60, 120]).map((val) => (
                  <button
                    key={val}
                    disabled={!isHost}
                    onClick={() => handleValueChange(val)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      backgroundColor: room.settings.value === val ? 'rgba(6,182,212,0.15)' : 'rgba(0,0,0,0.2)',
                      color: room.settings.value === val ? 'var(--color-cyan)' : 'var(--color-text-muted)',
                      border: '1px solid',
                      borderColor: room.settings.value === val ? 'var(--color-cyan)' : 'var(--color-border)',
                      borderRadius: '6px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem',
                      cursor: isHost ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty Tiers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Rules Severity</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['normal', 'expert', 'master'] as const).map((diff) => {
                const colors = {
                  normal: 'var(--color-char-correct)',
                  expert: 'var(--color-gold)',
                  master: 'var(--color-char-incorrect)'
                };
                const isActive = room.settings.difficulty === diff;
                
                return (
                  <button
                    key={diff}
                    disabled={!isHost}
                    onClick={() => handleDifficultyChange(diff)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.2)',
                      color: isActive ? colors[diff] : 'var(--color-text-muted)',
                      border: '1px solid',
                      borderColor: isActive ? colors[diff] : 'var(--color-border)',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      cursor: isHost ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {diff}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: '1.1rem', marginTop: '2px' }}>
              {room.settings.difficulty === 'normal' && '🔓 Backspace is fully active. Fix any letter anytime.'}
              {room.settings.difficulty === 'expert' && '⚠️ Errors block typing input. Must delete and fix immediately.'}
              {room.settings.difficulty === 'master' && '💀 One wrong key and you are immediately disqualified.'}
            </p>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            {!isHost && (
              <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                🔒 Host <strong style={{ color: '#fff' }}>{(Object.values(room.players).find((p: any) => p.socketId === room.hostId) as any)?.username}</strong> is adjusting configuration...
              </span>
            )}
            {isHost && '🛠️ Choose game constraints for everyone in the room.'}
          </div>
        </div>

        {/* Right Column: Lobby players slots & Chat boards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Players Grid list */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} /> Racers ({playersList.length})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {playersList.map((player: any) => (
                <div 
                  key={player.socketId}
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.6rem' }}>{getAvatarEmoji(player.avatar)}</span>
                    <span style={{ fontWeight: 600 }}>{player.username}</span>
                    {player.socketId === room.hostId && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', border: '1px solid currentColor', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' }}>HOST</span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {player.ready ? (
                      <span style={{ color: 'var(--color-char-correct)', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        <Check size={16} /> Ready
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.85rem' }}>
                        <X size={14} /> Waiting
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {spectatorsList.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>SPECTATORS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {spectatorsList.map((spec: any) => (
                      <span 
                        key={spec.socketId}
                        style={{
                          fontSize: '0.8rem',
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--color-border)',
                          padding: '3px 8px',
                          borderRadius: '12px'
                        }}
                      >
                        👁️ {spec.username}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lobby chat box */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', height: '240px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
              <MessageSquare size={14} /> Lobby Chatter
            </h4>

            {/* Message Feed */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                    <span>{getAvatarEmoji(msg.avatar)}</span>
                    <strong style={{ color: 'var(--color-cyan)' }}>{msg.sender}</strong>
                    <span style={{ color: 'var(--color-text-dark)', fontSize: '0.65rem' }}>{msg.timestamp}</span>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem', borderLeft: '2px solid var(--color-primary)', width: 'fit-content', wordBreak: 'break-word' }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="Talk trash or type hello..."
                className="form-input"
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 12px' }}>
                <Send size={14} />
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
};
