export interface Player {
  socketId: string;
  userId: string; // "guest" or user DB ID
  username: string;
  avatar: string; // Avatar name/identifier
  ready: boolean;
  isSpectator: boolean;
  
  // Real-time race stats
  progress: number; // 0 to 100
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errorCount: number;
  correctChars: number;
  incorrectChars: number;
  finished: boolean;
  timeTakenMs: number;
  
  // Real-time tracking arrays for graphing
  timeline: {
    time: number; // seconds
    wpm: number;
    accuracy: number;
    progress: number;
  }[];
}

export type RoomStatus = 'waiting' | 'countdown' | 'racing' | 'finished';

export interface RoomSettings {
  mode: 'words' | 'time' | 'custom';
  value: number; // number of words (e.g. 25, 50, 100) or seconds (e.g. 15, 30, 60)
  difficulty: 'normal' | 'expert' | 'master'; // normal: unlimited backspace, expert: error stops, master: one error fails
  isPrivate: boolean;
}

export interface Room {
  code: string;
  status: RoomStatus;
  players: Record<string, Player>; // socketId -> Player
  hostId: string; // socketId of the host
  textContent: string;
  settings: RoomSettings;
  countdownValue: number;
  timerValue: number;
  startTime: number | null; // epoch time when race started
}

export interface KeystrokeLog {
  t: number; // offset ms
  k: string; // key
  a: 'insert' | 'delete'; // action
  e: boolean; // error active
}

export interface DatabaseUser {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  xp: number;
  coins: number;
  avatar: string;
  created_at: string;
}

export interface MatchResult {
  userId: string;
  username: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errorsCount: number;
  timeTakenMs: number;
  xpGained: number;
  rank: number;
  replayData: KeystrokeLog[];
}
