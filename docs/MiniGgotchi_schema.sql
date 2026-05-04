-- MiniGgotchi Cloudflare DB schema
-- Cloudflare DB ID: 5c560a75-93a5-4414-88fc-0bd8e9ff4e26
-- Status: The user confirmed this DB has already been created on Cloudflare and these tables have been created with the SQL below.
-- Important: This file documents the applied baseline schema. Do not add constraints/columns here unless a migration has actually been applied.

-- USERS
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- USER PROFILE
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY,
  nickname TEXT,
  last_login_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- PET
CREATE TABLE user_pets (
  pet_id TEXT PRIMARY KEY,
  user_id TEXT,
  level INTEGER DEFAULT 1,
  hunger INTEGER DEFAULT 100,
  exp INTEGER DEFAULT 0,
  last_fed_at TEXT,
  metadata_json TEXT,
  FOREIGN KEY(user_id) REFERENCES users(user_id)
);

-- GAME RESULT
CREATE TABLE game_results (
  result_id TEXT PRIMARY KEY,
  user_id TEXT,
  game_type TEXT,
  score INTEGER,
  difficulty TEXT,
  performance_score REAL,
  reward_point INTEGER,
  played_at TEXT DEFAULT CURRENT_TIMESTAMP,
  metadata_json TEXT,
  FOREIGN KEY(user_id) REFERENCES users(user_id)
);

-- POINT WALLET
CREATE TABLE point_wallets (
  user_id TEXT PRIMARY KEY,
  point_balance INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- POINT LEDGER
CREATE TABLE point_ledger (
  ledger_id TEXT PRIMARY KEY,
  user_id TEXT,
  change_amount INTEGER,
  reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  metadata_json TEXT
);

-- SUDOKU
CREATE TABLE sudoku_puzzles (
  puzzle_id TEXT PRIMARY KEY,
  difficulty TEXT,
  puzzle TEXT,
  solution TEXT,
  is_active INTEGER DEFAULT 1
);

-- TYPING
CREATE TABLE typing_prompts (
  prompt_id TEXT PRIMARY KEY,
  difficulty TEXT,
  content TEXT,
  is_active INTEGER DEFAULT 1
);

-- SCENARIO NODE
CREATE TABLE scenario_nodes (
  node_id TEXT PRIMARY KEY,
  scenario_id TEXT,
  message_text TEXT,
  is_start INTEGER DEFAULT 0
);

-- SCENARIO BUTTON
CREATE TABLE scenario_buttons (
  button_id TEXT PRIMARY KEY,
  node_id TEXT,
  button_text TEXT,
  action_type TEXT,
  target_node_id TEXT,
  cost_point INTEGER DEFAULT 0,
  reward_point INTEGER DEFAULT 0,
  condition_json TEXT
);

-- COMPANY TAG
CREATE TABLE company_tags (
  tag_id TEXT PRIMARY KEY,
  tag_name TEXT,
  user_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- USER TAG
CREATE TABLE user_company_tags (
  user_id TEXT,
  tag_id TEXT,
  PRIMARY KEY (user_id, tag_id)
);

-- EVENT LOG
CREATE TABLE event_logs (
  event_id TEXT PRIMARY KEY,
  user_id TEXT,
  event_name TEXT,
  event_time TEXT DEFAULT CURRENT_TIMESTAMP,
  metadata_json TEXT
);

-- Future migration candidates, not yet applied:
-- 1. Apply docs/migrations/001_user_content_history.sql to prioritize unplayed/less-recently-used puzzle and prompt bank content.
-- 2. Apply docs/migrations/002_google_auth.sql to add Google OAuth identity columns, auth event logging, and session tracking.
-- 3. Add uniqueness and indexes for frequently queried fields not covered by existing migrations.
-- 4. Add report/hidden state to company_tags or model tag reports as event_logs.
-- 5. Add CHECK constraints for performance_score 0-1, hunger 0-100, supported game_type, and supported difficulty.
-- 6. Add foreign keys to point_wallets, point_ledger, scenario_buttons, and user_company_tags if Cloudflare runtime behavior supports the desired enforcement.
