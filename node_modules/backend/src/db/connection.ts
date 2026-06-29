import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const dbPath = path.resolve(__dirname, '..', '..', 'monkey_race.db');
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign key support
  await dbInstance.run('PRAGMA foreign_keys = ON');

  await initializeDatabase(dbInstance);

  return dbInstance;
}

async function initializeDatabase(db: Database) {
  // Create Users Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      xp INTEGER DEFAULT 0,
      coins INTEGER DEFAULT 0,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Matches Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      room_code TEXT NOT NULL,
      text_content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Player Results Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS player_results (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      wpm REAL NOT NULL,
      raw_wpm REAL NOT NULL,
      accuracy REAL NOT NULL,
      errors_count INTEGER NOT NULL,
      time_taken_ms INTEGER NOT NULL,
      xp_gained INTEGER NOT NULL,
      rank INTEGER NOT NULL,
      replay_data TEXT, -- JSON string of keystrokes
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create Achievements Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      achievement_key TEXT NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, achievement_key)
    )
  `);

  // Create index for performance
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_player_results_user_id ON player_results(user_id);
    CREATE INDEX IF NOT EXISTS idx_player_results_match_id ON player_results(match_id);
  `);
}
