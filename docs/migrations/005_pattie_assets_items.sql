-- Migration 005: Pattie character selection, items, and asset metadata
-- Apply:
--   npx wrangler d1 migrations apply DB --remote

ALTER TABLE avatars ADD COLUMN character_key TEXT DEFAULT 'rabbit';
ALTER TABLE avatars ADD COLUMN equipped_item_keys TEXT DEFAULT '[]';

CREATE TABLE IF NOT EXISTS character_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_key TEXT NOT NULL,
  animation_key TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'spritesheet',
  src TEXT NOT NULL,
  frame_count INTEGER NOT NULL,
  frame_width INTEGER NOT NULL DEFAULT 32,
  frame_height INTEGER NOT NULL DEFAULT 32,
  fps INTEGER NOT NULL DEFAULT 2,
  frame_duration_ms INTEGER NOT NULL DEFAULT 500,
  is_test_asset INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  version TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_character_assets_active
ON character_assets(character_key, animation_key, version);

CREATE TABLE IF NOT EXISTS pattie_items (
  item_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  src TEXT NOT NULL,
  is_test_asset INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_pattie_items (
  user_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  acquired_at TEXT DEFAULT CURRENT_TIMESTAMP,
  source TEXT DEFAULT 'default',
  PRIMARY KEY (user_id, item_key),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (item_key) REFERENCES pattie_items(item_key) ON DELETE CASCADE
);

INSERT OR IGNORE INTO pattie_items (item_key, display_name, item_type, src, is_test_asset)
VALUES
  ('sunglasses', 'Sunglasses', 'face', '/public/assets/patties/items/sunglasses.png', 1),
  ('bee_suit', 'Bee Suit', 'outfit', '/public/assets/patties/items/bee_suit.png', 1);

UPDATE avatars
SET character_key = CASE
    WHEN character_type = 'type_b' THEN 'dog'
    WHEN character_type = 'dog' THEN 'dog'
    WHEN character_type = 'cat' THEN 'cat'
    ELSE 'rabbit'
  END
WHERE character_key IS NULL OR character_key = '';
