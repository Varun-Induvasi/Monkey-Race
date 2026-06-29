export interface Player {
  socketId: string;
  userId: string;
  username: string;
  avatar: string;
  ready: boolean;
  isSpectator: boolean;
  
  // Real-time race stats
  progress: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errorCount: number;
  correctChars: number;
  incorrectChars: number;
  finished: boolean;
  timeTakenMs: number;
  
  timeline: {
    time: number;
    wpm: number;
    accuracy: number;
    progress: number;
  }[];
}

export type RoomStatus = 'waiting' | 'countdown' | 'racing' | 'finished';

export interface RoomSettings {
  mode: 'words' | 'time' | 'custom';
  value: number;
  difficulty: 'normal' | 'expert' | 'master';
  isPrivate: boolean;
}

export interface Room {
  code: string;
  status: RoomStatus;
  players: Record<string, Player>;
  hostId: string;
  textContent: string;
  settings: RoomSettings;
  countdownValue: number;
  timerValue: number;
  startTime: number | null;
}

export interface KeystrokeLog {
  t: number;
  k: string;
  a: 'insert' | 'delete';
  e: boolean;
}
