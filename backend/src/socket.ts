import { Server, Socket } from 'socket.io';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  updateRoomSettings,
  togglePlayerReady,
  updatePlayerProgress
} from './services/roomService.js';
import { saveMatchAndResults } from './services/userService.js';
import { MatchResult } from './types.js';

// Cache to store active countdown intervals by room code, avoiding serialization issues
const roomIntervals = new Map<string, NodeJS.Timeout>();

export function setupSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // 1. Host creates a new room
    socket.on('create-room', ({ userId, username, avatar }) => {
      try {
        const room = createRoom(socket.id, userId, username, avatar);
        socket.join(room.code);
        console.log(`[Socket] Room created: ${room.code} by host ${username} (${socket.id})`);
        socket.emit('room-created', room);
      } catch (err: any) {
        console.error(`[Socket] Error creating room: ${err.message}`);
        socket.emit('error', err.message);
      }
    });

    // 2. Player joins an existing room
    socket.on('join-room', ({ code, userId, username, avatar, isSpectator }) => {
      try {
        const room = joinRoom(code, socket.id, userId, username, avatar, isSpectator);
        socket.join(room.code);
        console.log(`[Socket] Player ${username} (${socket.id}) joined room ${room.code.toUpperCase()} as ${isSpectator ? 'spectator' : 'racer'}`);
        
        // Notify others in room
        io.to(room.code).emit('room-updated', room);
        socket.emit('room-joined', room);
      } catch (err: any) {
        console.error(`[Socket] Error joining room ${code}: ${err.message}`);
        socket.emit('error', err.message);
      }
    });

    // 3. Player toggles ready status
    socket.on('toggle-ready', ({ code }) => {
      try {
        const room = togglePlayerReady(code, socket.id);
        io.to(room.code).emit('room-updated', room);
      } catch (err: any) {
        socket.emit('error', err.message);
      }
    });

    // 4. Host changes room settings
    socket.on('change-settings', ({ code, settings }) => {
      try {
        const room = updateRoomSettings(code, socket.id, settings);
        io.to(room.code).emit('room-updated', room);
      } catch (err: any) {
        socket.emit('error', err.message);
      }
    });

    // 5. Host starts the countdown
    socket.on('start-race', ({ code }) => {
      try {
        const room = getRoom(code);
        if (!room) throw new Error('Room not found');
        if (room.hostId !== socket.id) throw new Error('Only the host can start the race');
        if (room.status !== 'waiting') throw new Error('Race already started or finished');

        // Check if all active typing players are ready
        const activePlayers = Object.values(room.players).filter(p => !p.isSpectator);
        const allReady = activePlayers.every(p => p.ready);
        if (!allReady) {
          throw new Error('All players must be ready to start the race');
        }

        // Start Countdown
        room.status = 'countdown';
        room.countdownValue = 3;
        io.to(room.code).emit('room-updated', room);

        const countdownInterval = setInterval(() => {
          room.countdownValue -= 1;
          if (room.countdownValue <= 0) {
            clearInterval(countdownInterval);
            
            // Start the actual race
            room.status = 'racing';
            room.startTime = Date.now();
            room.timerValue = room.settings.mode === 'time' ? room.settings.value : 0;
            io.to(room.code).emit('room-updated', room);

            // If time-based mode, start countdown timer
            if (room.settings.mode === 'time') {
              startRoomTimer(io, room);
            }
          } else {
            io.to(room.code).emit('countdown-tick', { value: room.countdownValue });
          }
        }, 1000);

      } catch (err: any) {
        socket.emit('error', err.message);
      }
    });

    // 6. Real-time progress synchronization
    socket.on(
      'update-progress',
      ({
        code,
        progress,
        wpm,
        rawWpm,
        accuracy,
        errorCount,
        correctChars,
        incorrectChars,
        finished,
        timeTakenMs,
        timelineEntry
      }) => {
        try {
          const room = getRoom(code);
          if (!room || room.status !== 'racing') return;

          const updatedRoom = updatePlayerProgress(
            code,
            socket.id,
            progress,
            wpm,
            rawWpm,
            accuracy,
            errorCount,
            correctChars,
            incorrectChars,
            finished,
            timeTakenMs,
            timelineEntry
          );

          // Check if player just finished
          if (finished) {
            const player = updatedRoom.players[socket.id];
            // Send finish event for splash animations
            io.to(room.code).emit('player-finished', {
              socketId: socket.id,
              username: player.username,
              wpm,
              timeTakenMs
            });

            // Check if all typing players are finished
            const typingPlayers = Object.values(updatedRoom.players).filter(p => !p.isSpectator);
            const allFinished = typingPlayers.every(p => p.finished);
            
            if (allFinished) {
              endRace(io, updatedRoom);
            } else {
              io.to(room.code).emit('room-updated', updatedRoom);
            }
          } else {
            // High frequency update for race tracks and graphs
            io.to(room.code).emit('room-updated', updatedRoom);
          }
        } catch (err: any) {
          socket.emit('error', err.message);
        }
      }
    );

    // 7. Player leaves or disconnects
    const handleLeave = () => {
      console.log(`[Socket] Disconnected/Left: ${socket.id}`);
      const result = leaveRoom(socket.id);
      if (result) {
        const { roomCode, room, isEmpty } = result;
        if (isEmpty) {
          const intervalId = roomIntervals.get(roomCode);
          if (intervalId) {
            clearInterval(intervalId);
            roomIntervals.delete(roomCode);
          }
        } else if (room) {
          io.to(roomCode).emit('room-updated', room);
          
          // Check if race was running and the leaving player was the last typist
          if (room.status === 'racing') {
            const activeTypists = Object.values(room.players).filter(p => !p.isSpectator && !p.finished);
            if (activeTypists.length === 0) {
              endRace(io, room);
            }
          }
        }
      }
    };

    socket.on('leave-room', handleLeave);
    socket.on('disconnect', handleLeave);
  });
}

function startRoomTimer(io: Server, room: any) {
  const existing = roomIntervals.get(room.code);
  if (existing) {
    clearInterval(existing);
  }

  const intervalId = setInterval(() => {
    room.timerValue -= 1;
    if (room.timerValue <= 0) {
      clearInterval(intervalId);
      roomIntervals.delete(room.code);
      endRace(io, room);
    } else {
      io.to(room.code).emit('timer-tick', { value: room.timerValue });
    }
  }, 1000);

  roomIntervals.set(room.code, intervalId);
}

async function endRace(io: Server, room: any) {
  const intervalId = roomIntervals.get(room.code);
  if (intervalId) {
    clearInterval(intervalId);
    roomIntervals.delete(room.code);
  }

  room.status = 'finished';

  const typingPlayers = Object.values(room.players).filter((p: any) => !p.isSpectator);

  // Sort players by progress (descending) and then timeTakenMs (ascending) to decide rankings
  const rankedPlayers = [...typingPlayers].sort((a: any, b: any) => {
    if (b.progress !== a.progress) {
      return b.progress - a.progress; // higher progress first
    }
    // If progress is equal (e.g. 100%), faster time first
    return a.timeTakenMs - b.timeTakenMs;
  });

  const results: MatchResult[] = rankedPlayers.map((player: any, idx: number) => {
    const rank = idx + 1;
    
    // Reward XP based on completion + rank
    // 1st: 100 XP, 2nd: 80 XP, 3rd: 60 XP, Others: 40 XP. Guests get XP too (but it's not saved in user DB)
    let xpGained = 40;
    if (player.progress > 0) {
      if (rank === 1) xpGained = 100;
      else if (rank === 2) xpGained = 80;
      else if (rank === 3) xpGained = 60;
    } else {
      xpGained = 0; // Did not participate
    }

    // Add extra XP for speed (1 XP per 10 WPM)
    xpGained += Math.floor(player.wpm / 10);

    // Anti-Cheat Check: Unrealistic speeds
    let isCheating = false;
    if (player.wpm > 240) {
      isCheating = true;
    }

    // Prepare result object
    return {
      userId: isCheating ? 'cheater' : player.userId,
      username: isCheating ? `${player.username} (FLAGGED)` : player.username,
      wpm: isCheating ? 0 : player.wpm,
      rawWpm: isCheating ? 0 : player.rawWpm,
      accuracy: isCheating ? 0 : player.accuracy,
      errorsCount: player.errorCount,
      timeTakenMs: player.timeTakenMs,
      xpGained: isCheating ? 0 : xpGained,
      rank,
      // Custom replay data mock (could be passed by client on final update, let's see how client stores it)
      replayData: player.replayData || []
    };
  });

  // Save to database
  try {
    await saveMatchAndResults(room.code, room.textContent, results);
  } catch (err) {
    console.error('Error saving match results:', err);
  }

  // Send end event with final structured statistics
  io.to(room.code).emit('race-finished', {
    code: room.code,
    results
  });

  // Reset room structure so players can stay in room for another round
  room.status = 'waiting';
  room.startTime = null;
  room.timerValue = 0;
  
  // Keep users in room, reset ready states to false so they must ready up again
  for (const socketId in room.players) {
    const p = room.players[socketId];
    p.ready = p.isSpectator; // spectators stay ready
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
}
