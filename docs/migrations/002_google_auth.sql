-- Migration 002: Google OAuth user/profile/auth event tracking
-- Status: proposed, not yet applied
-- Purpose: extend the existing D1 auth schema without dropping existing data.
--
-- Apply once:
--   npx wrangler d1 execute db_game_info --remote --file=./docs/migrations/002_google_auth.sql

-- Existing baseline tables are:
--   users(user_id, email, created_at)
--   user_profiles(user_id, nickname, last_login_at, created_at)
-- Do not DROP these tables. ALTER them in place.

ALTER TABLE users ADD COLUMN google_sub TEXT;
ALTER TABLE users ADD COLUMN updated_at TEXT;

UPDATE users
SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
ALTER TABLE user_profiles ADD COLUMN updated_at TEXT;

UPDATE user_profiles
SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_events (
  event_id TEXT PRIMARY KEY,
  user_id TEXT,
  event_type TEXT NOT NULL,
  provider TEXT DEFAULT 'google',
  email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  metadata_json TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  is_new_user INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  revoked_at TEXT,
  metadata_json TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub
ON users(google_sub)
WHERE google_sub IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
ON users(email)
WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_events_user_created
ON auth_events(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user
ON auth_sessions(user_id, expires_at);
