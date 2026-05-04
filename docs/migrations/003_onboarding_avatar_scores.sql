-- Migration 003: onboarding, avatar, game_scores, companies
-- Apply:
--   npx wrangler d1 migrations apply DB --remote

-- Extend users with onboarding fields
ALTER TABLE users ADD COLUMN company TEXT;
ALTER TABLE users ADD COLUMN commute_start TEXT DEFAULT '09:00';
ALTER TABLE users ADD COLUMN commute_end TEXT DEFAULT '18:00';
ALTER TABLE users ADD COLUMN onboarding_done INTEGER DEFAULT 0;

-- Companies registry (aggregated from users.company)
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Avatar / minime (one per user)
CREATE TABLE IF NOT EXISTS avatars (
  user_id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  character_type TEXT NOT NULL DEFAULT 'type_a',
  last_minime_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Game scores
CREATE TABLE IF NOT EXISTS game_scores (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  played_at TEXT DEFAULT CURRENT_TIMESTAMP,
  duration_seconds INTEGER,
  extra_json TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_scores_user_played
ON game_scores(user_id, played_at);

CREATE INDEX IF NOT EXISTS idx_game_scores_type_played
ON game_scores(game_type, played_at);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
