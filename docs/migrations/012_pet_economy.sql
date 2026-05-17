-- Migration 012: pet economy system
-- Adds: user_points, point_transactions, user_item_inventory,
--       item_purchase_history, pet_happiness_state,
--       pet_happiness_history, pet_daily_interaction_limits

-- 보유 포인트 (소비재, 랭킹 score와 별개)
CREATE TABLE IF NOT EXISTS user_points (
    user_id                 TEXT    PRIMARY KEY,
    current_points          INTEGER NOT NULL DEFAULT 0,
    total_earned_points     INTEGER NOT NULL DEFAULT 0,
    total_spent_points      INTEGER NOT NULL DEFAULT 0,
    created_at              TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 포인트 거래 내역
CREATE TABLE IF NOT EXISTS point_transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT    NOT NULL,
    type            TEXT    NOT NULL CHECK (type IN ('EARN','SPEND','ADJUST')),
    amount          INTEGER NOT NULL,
    source_type     TEXT    NOT NULL CHECK (source_type IN ('GAME_SCORE','ITEM_PURCHASE','ADMIN','ETC')),
    source_id       TEXT,           -- game_scores.id 등 참조, 중복 적립 방지용
    balance_after   INTEGER NOT NULL,
    metadata_json   TEXT,
    created_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
CREATE INDEX IF NOT EXISTS idx_pt_user_created ON point_transactions(user_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pt_source_unique
    ON point_transactions(source_type, source_id)
    WHERE source_id IS NOT NULL AND type = 'EARN';

-- 아이템 인벤토리
CREATE TABLE IF NOT EXISTS user_item_inventory (
    user_id     TEXT    NOT NULL,
    item_id     TEXT    NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 구매 이력
CREATE TABLE IF NOT EXISTS item_purchase_history (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                 TEXT    NOT NULL,
    item_id                 TEXT    NOT NULL,
    quantity                INTEGER NOT NULL,
    unit_price              INTEGER NOT NULL,
    total_price             INTEGER NOT NULL,
    point_transaction_id    INTEGER,
    created_at              TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (point_transaction_id) REFERENCES point_transactions(id)
);
CREATE INDEX IF NOT EXISTS idx_iph_user_created ON item_purchase_history(user_id, created_at);

-- 토닥이 행복점수 현황 (min 40, max 100)
CREATE TABLE IF NOT EXISTS pet_happiness_state (
    user_id                 TEXT    NOT NULL,
    pet_id                  TEXT    NOT NULL DEFAULT 'primary',
    current_score           INTEGER NOT NULL DEFAULT 40,
    last_daily_close_date   TEXT,   -- YYYY-MM-DD KST
    created_at              TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, pet_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 행복점수 변경 히스토리
CREATE TABLE IF NOT EXISTS pet_happiness_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         TEXT    NOT NULL,
    pet_id          TEXT    NOT NULL DEFAULT 'primary',
    action_type     TEXT    NOT NULL CHECK (action_type IN ('PET','FEED','TALK','DAILY_CLOSE','SYSTEM')),
    delta           INTEGER NOT NULL,
    score_before    INTEGER NOT NULL,
    score_after     INTEGER NOT NULL,
    metadata_json   TEXT,
    created_at      TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
CREATE INDEX IF NOT EXISTS idx_phh_user_created ON pet_happiness_history(user_id, created_at);

-- 일별 상호작용 횟수 (점수 증가 제한용)
CREATE TABLE IF NOT EXISTS pet_daily_interaction_limits (
    user_id                 TEXT    NOT NULL,
    pet_id                  TEXT    NOT NULL DEFAULT 'primary',
    action_date             TEXT    NOT NULL,   -- YYYY-MM-DD KST
    pet_count_for_score     INTEGER NOT NULL DEFAULT 0,
    talk_count_for_score    INTEGER NOT NULL DEFAULT 0,
    feed_count_for_score    INTEGER,            -- NULL = 미설정, 간식은 수량 기반이므로 참고용
    created_at              TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, pet_id, action_date),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
