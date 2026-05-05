-- Migration 004: consent fields
-- Apply:
--   npx wrangler d1 migrations apply DB --remote

ALTER TABLE users ADD COLUMN marketing_agreed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN terms_agreed_at TEXT;
