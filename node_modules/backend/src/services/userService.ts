import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { DatabaseUser, MatchResult } from '../types.js';

export async function createUser(username: string, email: string, password: string): Promise<string> {
  const db = await getDb();
  
  // Check if username/email already exists
  const existingUser = await db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
  if (existingUser) {
    throw new Error('Username or email already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const userId = uuidv4();
  // Pick a random starter monkey avatar (e.g. monkey1, monkey2, etc.)
  const avatars = ['monkey_banana', 'monkey_ninja', 'monkey_cyborg', 'monkey_astronaut', 'monkey_wizard'];
  const avatar = avatars[Math.floor(Math.random() * avatars.length)];

  await db.run(
    'INSERT INTO users (id, username, email, password_hash, avatar) VALUES (?, ?, ?, ?, ?)',
    [userId, username, email, passwordHash, avatar]
  );

  return userId;
}

export async function authenticateUser(identifier: string, password: string): Promise<Omit<DatabaseUser, 'password_hash'>> {
  const db = await getDb();
  const user = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [identifier, identifier]);
  if (!user) {
    throw new Error('Invalid username/email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error('Invalid username/email or password');
  }

  const { password_hash, ...safeUser } = user;
  return safeUser;
}

export async function getUserById(id: string): Promise<Omit<DatabaseUser, 'password_hash'> | null> {
  const db = await getDb();
  const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) return null;
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

export async function getGlobalLeaderboard(limit = 10): Promise<any[]> {
  const db = await getDb();
  // Fetch top players ranked by total XP
  const topXp = await db.all(`
    SELECT id, username, xp, coins, avatar,
    (SELECT COUNT(*) FROM player_results WHERE user_id = users.id AND rank = 1) as wins,
    (SELECT COUNT(*) FROM player_results WHERE user_id = users.id) as total_races,
    (SELECT MAX(wpm) FROM player_results WHERE user_id = users.id) as max_wpm
    FROM users
    ORDER BY xp DESC
    LIMIT ?
  `, [limit]);

  return topXp;
}

export async function saveMatchAndResults(
  roomCode: string,
  textContent: string,
  results: MatchResult[]
): Promise<void> {
  const db = await getDb();
  const matchId = uuidv4();

  // Save the match metadata
  await db.run('INSERT INTO matches (id, room_code, text_content) VALUES (?, ?, ?)', [matchId, roomCode, textContent]);

  // Save results for all players
  for (const res of results) {
    const resultId = uuidv4();
    await db.run(
      `INSERT INTO player_results (
        id, match_id, user_id, username, wpm, raw_wpm, accuracy, errors_count, time_taken_ms, xp_gained, rank, replay_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resultId,
        matchId,
        res.userId,
        res.username,
        res.wpm,
        res.rawWpm,
        res.accuracy,
        res.errorsCount,
        res.timeTakenMs,
        res.xpGained,
        res.rank,
        JSON.stringify(res.replayData)
      ]
    );

    // If registered user, update their XP, coins and check achievements
    if (res.userId !== 'guest') {
      await db.run(
        'UPDATE users SET xp = xp + ?, coins = coins + ? WHERE id = ?',
        [res.xpGained, Math.floor(res.xpGained / 2), res.userId]
      );
      await checkAndUnlockAchievements(res.userId);
    }
  }
}

export async function getUserHistory(userId: string, limit = 20): Promise<any[]> {
  const db = await getDb();
  return db.all(`
    SELECT pr.*, m.text_content, m.created_at as match_date
    FROM player_results pr
    JOIN matches m ON pr.match_id = m.id
    WHERE pr.user_id = ?
    ORDER BY pr.created_at DESC
    LIMIT ?
  `, [userId, limit]);
}

export async function getUserProfileDetails(userId: string): Promise<any> {
  const db = await getDb();
  const stats = await db.get(`
    SELECT 
      COUNT(*) as total_races,
      COUNT(CASE WHEN rank = 1 THEN 1 END) as total_wins,
      MAX(wpm) as highest_wpm,
      AVG(accuracy) as average_accuracy,
      AVG(wpm) as average_wpm
    FROM player_results
    WHERE user_id = ?
  `, [userId]);

  const achievements = await db.all(`
    SELECT achievement_key, unlocked_at 
    FROM achievements 
    WHERE user_id = ?
    ORDER BY unlocked_at DESC
  `, [userId]);

  return {
    stats: {
      totalRaces: stats?.total_races || 0,
      totalWins: stats?.total_wins || 0,
      highestWpm: parseFloat((stats?.highest_wpm || 0).toFixed(1)),
      averageAccuracy: parseFloat((stats?.average_accuracy || 0).toFixed(1)),
      averageWpm: parseFloat((stats?.average_wpm || 0).toFixed(1)),
    },
    achievements: achievements.map(a => ({
      key: a.achievement_key,
      unlockedAt: a.unlocked_at
    }))
  };
}

export async function updateAvatar(userId: string, avatar: string): Promise<void> {
  const db = await getDb();
  await db.run('UPDATE users SET avatar = ? WHERE id = ?', [avatar, userId]);
}

export async function checkAndUnlockAchievements(userId: string): Promise<string[]> {
  const db = await getDb();
  const unlockedNow: string[] = [];

  // Get user overall stats
  const stats = await db.get(`
    SELECT 
      COUNT(*) as total_races,
      COUNT(CASE WHEN rank = 1 THEN 1 END) as total_wins,
      MAX(wpm) as max_wpm,
      MAX(accuracy) as max_accuracy
    FROM player_results
    WHERE user_id = ?
  `, [userId]);

  if (!stats) return [];

  const totalRaces = stats.total_races || 0;
  const totalWins = stats.total_wins || 0;
  const maxWpm = stats.max_wpm || 0;
  const maxAccuracy = stats.max_accuracy || 0;

  // Helper to unlock achievement
  const unlock = async (key: string) => {
    try {
      await db.run(
        'INSERT INTO achievements (id, user_id, achievement_key) VALUES (?, ?, ?)',
        [uuidv4(), userId, key]
      );
      unlockedNow.push(key);
    } catch (err) {
      // Ignore unique constraint violation if already unlocked
    }
  };

  // Check achievement logic
  if (totalWins >= 1) await unlock('first_victory');
  if (totalWins >= 10) await unlock('wins_10');
  
  if (totalRaces >= 10) await unlock('races_10');
  if (totalRaces >= 100) await unlock('races_100');

  if (maxWpm >= 100) await unlock('wpm_100');
  if (maxWpm >= 120) await unlock('wpm_120');
  if (maxWpm >= 150) await unlock('wpm_150');

  if (maxAccuracy >= 99) await unlock('accuracy_master');

  return unlockedNow;
}

// Get standard ranking badges based on XP
export function getRankBadge(xp: number): { tier: string; color: string } {
  if (xp >= 15000) return { tier: 'Grand Master', color: '#ff4500' };
  if (xp >= 8000) return { tier: 'Master', color: '#da70d6' };
  if (xp >= 4000) return { tier: 'Diamond', color: '#00ffff' };
  if (xp >= 2000) return { tier: 'Platinum', color: '#afeeee' };
  if (xp >= 1000) return { tier: 'Gold', color: '#ffd700' };
  if (xp >= 400) return { tier: 'Silver', color: '#c0c0c0' };
  return { tier: 'Bronze', color: '#cd7f32' };
}
