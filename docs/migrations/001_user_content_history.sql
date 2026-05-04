-- Migration 001: content reuse history
-- Status: proposed, not yet applied
-- Purpose: prioritize unplayed/less-recently-played DB-managed content such as Sudoku puzzles and typing prompts.

CREATE TABLE user_content_history (
  user_id TEXT,
  content_type TEXT,
  content_id TEXT,
  play_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  last_played_at TEXT,
  best_performance_score REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, content_type, content_id)
);

CREATE INDEX idx_user_content_history_lookup
ON user_content_history(user_id, content_type, last_played_at);

CREATE INDEX idx_user_content_history_content
ON user_content_history(content_type, content_id);
