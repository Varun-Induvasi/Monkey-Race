import { Room, Player, RoomSettings, RoomStatus } from '../types.js';
import { generateText } from '../utils/textGenerator.js';

const rooms = new Map<string, Room>();

// Helper to generate a unique 4-character room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

export function createRoom(
  hostSocketId: string,
  userId: string,
  username: string,
  avatar: string
): Room {
  const code = generateRoomCode();
  const defaultSettings: RoomSettings = {
    mode: 'words',
    value: 25,
    difficulty: 'normal',
    isPrivate: false
  };

  const textContent = generateText(defaultSettings.mode, defaultSettings.value);

  const hostPlayer: Player = {
    socketId: hostSocketId,
    userId,
    username,
    avatar,
    ready: false,
    isSpectator: false,
    progress: 0,
    wpm: 0,
    rawWpm: 0,
    accuracy: 100,
    errorCount: 0,
    correctChars: 0,
    incorrectChars: 0,
    finished: false,
    timeTakenMs: 0,
    timeline: []
  };

  const room: Room = {
    code,
    status: 'waiting',
    players: { [hostSocketId]: hostPlayer },
    hostId: hostSocketId,
    textContent,
    settings: defaultSettings,
    countdownValue: 3,
    timerValue: 0,
    startTime: null
  };

  rooms.set(code, room);
  return room;
}

export function joinRoom(
  code: string,
  socketId: string,
  userId: string,
  username: string,
  avatar: string,
  isSpectator = false
): Room {
  const room = rooms.get(code.toUpperCase());
  if (!room) {
    throw new Error('Room not found');
  }

  if (room.status !== 'waiting' && !isSpectator) {
    throw new Error('Race has already started. You can only join as a spectator.');
  }

  // Find if there is an existing player in this room with the same userId (reconnection check)
  const existingPlayerSocketId = Object.keys(room.players).find(
    sid => room.players[sid].userId === userId
  );

  if (existingPlayerSocketId) {
    // If socketId changed (e.g. reconnect), delete old reference and update player info
    if (existingPlayerSocketId !== socketId) {
      const oldPlayer = room.players[existingPlayerSocketId];
      delete room.players[existingPlayerSocketId];
      
      room.players[socketId] = {
        ...oldPlayer,
        socketId,
        username,
        avatar
      };
    }
    return room;
  }

  // Check if player is already in room by socketId
  if (room.players[socketId]) {
    return room;
  }

  const player: Player = {
    socketId,
    userId,
    username,
    avatar,
    ready: isSpectator, // Spectators are always "ready" so they don't block start
    isSpectator,
    progress: 0,
    wpm: 0,
    rawWpm: 0,
    accuracy: 100,
    errorCount: 0,
    correctChars: 0,
    incorrectChars: 0,
    finished: false,
    timeTakenMs: 0,
    timeline: []
  };

  room.players[socketId] = player;
  return room;
}

export function leaveRoom(socketId: string): { roomCode: string; room?: Room; wasHost: boolean; isEmpty: boolean } | null {
  for (const [code, room] of rooms.entries()) {
    if (room.players[socketId]) {
      const wasHost = room.hostId === socketId;
      delete room.players[socketId];

      const activePlayers = Object.values(room.players).filter(p => !p.isSpectator);
      const allPlayers = Object.keys(room.players);

      if (allPlayers.length === 0) {
        rooms.delete(code);
        return { roomCode: code, wasHost, isEmpty: true };
      }

      if (wasHost) {
        // Assign new host
        room.hostId = allPlayers[0];
      }

      return { roomCode: code, room, wasHost, isEmpty: false };
    }
  }
  return null;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function updateRoomSettings(
  code: string,
  hostSocketId: string,
  settings: Partial<RoomSettings>
): Room {
  const room = rooms.get(code.toUpperCase());
  if (!room) throw new Error('Room not found');
  if (room.hostId !== hostSocketId) throw new Error('Only the host can modify settings');
  if (room.status !== 'waiting') throw new Error('Cannot change settings while race is in progress');

  room.settings = { ...room.settings, ...settings };
  room.textContent = generateText(room.settings.mode, room.settings.value);

  // Reset players progress and ready states (except host)
  for (const pid in room.players) {
    const p = room.players[pid];
    if (pid !== hostSocketId && !p.isSpectator) {
      p.ready = false;
    }
    p.progress = 0;
    p.finished = false;
    p.wpm = 0;
    p.rawWpm = 0;
    p.accuracy = 100;
    p.errorCount = 0;
    p.correctChars = 0;
    p.incorrectChars = 0;
    p.timeTakenMs = 0;
    p.timeline = [];
  }

  return room;
}

export function togglePlayerReady(code: string, socketId: string): Room {
  const room = rooms.get(code.toUpperCase());
  if (!room) throw new Error('Room not found');
  
  const player = room.players[socketId];
  if (!player) throw new Error('Player not in room');
  if (player.isSpectator) return room; // spectators are always ready

  player.ready = !player.ready;
  return room;
}

export function updatePlayerProgress(
  code: string,
  socketId: string,
  progress: number,
  wpm: number,
  rawWpm: number,
  accuracy: number,
  errorCount: number,
  correctChars: number,
  incorrectChars: number,
  finished: boolean,
  timeTakenMs: number,
  timelineEntry?: { time: number; wpm: number; accuracy: number; progress: number }
): Room {
  const room = rooms.get(code.toUpperCase());
  if (!room) throw new Error('Room not found');

  const player = room.players[socketId];
  if (!player) throw new Error('Player not in room');
  if (player.isSpectator) throw new Error('Spectators cannot update progress');

  player.progress = progress;
  player.wpm = wpm;
  player.rawWpm = rawWpm;
  player.accuracy = accuracy;
  player.errorCount = errorCount;
  player.correctChars = correctChars;
  player.incorrectChars = incorrectChars;
  player.finished = finished;
  player.timeTakenMs = timeTakenMs;

  if (timelineEntry) {
    player.timeline.push(timelineEntry);
  }

  return room;
}

export function getAllRooms(): Room[] {
  return Array.from(rooms.values());
}
