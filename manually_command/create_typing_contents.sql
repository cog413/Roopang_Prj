-- Typing game: content bank and round results tables
-- Apply:
--   npx wrangler d1 execute DB --remote --file=./manually_command/create_typing_contents.sql
--   npx wrangler d1 execute DB --local  --file=./manually_command/create_typing_contents.sql

CREATE TABLE IF NOT EXISTS typing_contents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  length INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_typing_contents_category
ON typing_contents(category);

CREATE INDEX IF NOT EXISTS idx_typing_contents_active
ON typing_contents(is_active);

-- Per-game round results (typing_game and future games)
-- NOTE: user_id is TEXT to match this project's users.user_id type
CREATE TABLE IF NOT EXISTS game_round_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  game_key TEXT NOT NULL,
  score INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  is_point_eligible INTEGER NOT NULL DEFAULT 1,
  is_ranking_eligible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_game_round_results_game_created
ON game_round_results(game_key, created_at);

CREATE INDEX IF NOT EXISTS idx_game_round_results_game_score
ON game_round_results(game_key, score DESC);

CREATE INDEX IF NOT EXISTS idx_game_round_results_user_created
ON game_round_results(user_id, created_at);
