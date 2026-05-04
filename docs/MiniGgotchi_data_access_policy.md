# MiniGgotchi Data Access Policy

Updated: 2026-05-04

## 1. Principle

MiniGgotchi gameplay content should be managed by the database, not hardcoded JavaScript.

JavaScript should own:

- UI rendering
- Client-side interaction state
- Input handling
- Lightweight response caching
- Offline/fallback behavior where explicitly allowed

The database/API should own:

- Character conversation scenarios
- Scenario button mapping
- Sudoku problem bank
- Typing prompt bank
- User game result history
- Point ledger and wallet changes
- Company tag membership and ranking inclusion data

## 2. DB-Owned Content Mapping

| Feature | Source Table | Runtime Use |
| --- | --- | --- |
| Pet dialogue node/message | `scenario_nodes` | Load current message by scenario/node. |
| Pet dialogue buttons | `scenario_buttons` | Load available choices, action, cost, reward, conditions. |
| Sudoku problem bank | `sudoku_puzzles` | Select next active puzzle by difficulty and user history. |
| Typing prompt bank | `typing_prompts` | Select next active prompt by difficulty and user history. |
| Game rewards/history | `game_results` | Store normalized performance and reward result. |
| Point state | `point_wallets`, `point_ledger` | Wallet balance and auditable earn/spend history. |
| Company tag ranking | `company_tags`, `user_company_tags` | Tag membership and rankable company groups. |

## 3. Scenario Runtime Flow

### 3.1 Load Start Node

1. Client requests a scenario start node, for example `pet_daily_checkin`.
2. API queries `scenario_nodes` where `scenario_id = ?` and `is_start = 1`.
3. API queries `scenario_buttons` for the returned `node_id`.
4. Client renders the message and buttons.

### 3.2 Button Click

1. Client sends selected `button_id`.
2. API loads the button row.
3. API evaluates `condition_json`.
4. If `cost_point > 0`, API checks and writes point ledger/wallet changes.
5. If `reward_point > 0`, API writes point ledger/wallet changes.
6. If `target_node_id` exists, API returns the target node and its next buttons.
7. If no target node exists, API returns terminal action output.

JavaScript must not hardcode button-to-response mapping. It may cache the active node/buttons for the current session only.

## 4. Sudoku Puzzle Bank Selection

### 4.1 Required Behavior

When selecting a Sudoku puzzle:

- Prefer active puzzles matching requested difficulty.
- Prioritize puzzles the user has never solved or never attempted.
- Push recently played or already solved puzzles later.
- Avoid repeating the same puzzle too frequently.
- Fall back gracefully if the pool is small.

### 4.2 Baseline Implementation Using Existing Tables

The currently applied baseline schema can store `puzzle_id` inside `game_results.metadata_json`, but this is not ideal for efficient ranking/selection.

Temporary approach:

```sql
SELECT p.*
FROM sudoku_puzzles p
WHERE p.difficulty = ?
  AND p.is_active = 1
ORDER BY
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM game_results gr
      WHERE gr.user_id = ?
        AND gr.game_type = 'sudoku'
        AND gr.metadata_json LIKE '%' || p.puzzle_id || '%'
    ) THEN 1
    ELSE 0
  END ASC,
  RANDOM()
LIMIT 1;
```

This works only as a short-term bridge. String matching against JSON is fragile and should not be the long-term production method.

### 4.3 Recommended Production Migration

Add a generic content history table so puzzle/prompt/scenario reuse can be ranked efficiently.

```sql
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
```

### 4.4 Production Puzzle Selection Query

After the migration:

```sql
SELECT p.*
FROM sudoku_puzzles p
LEFT JOIN user_content_history h
  ON h.user_id = ?
 AND h.content_type = 'sudoku_puzzle'
 AND h.content_id = p.puzzle_id
WHERE p.difficulty = ?
  AND p.is_active = 1
ORDER BY
  CASE WHEN h.content_id IS NULL THEN 0 ELSE 1 END ASC,
  COALESCE(h.success_count, 0) ASC,
  COALESCE(h.play_count, 0) ASC,
  COALESCE(h.last_played_at, '1970-01-01') ASC,
  RANDOM()
LIMIT 1;
```

Priority order:

1. Never attempted puzzles.
2. Attempted but unsolved puzzles.
3. Solved fewer times.
4. Least recently played.
5. Random tie-breaker.

## 5. Typing Prompt Selection

Typing prompts should use the same content-history pattern.

Recommended `content_type`:

- `typing_prompt`

Selection should prioritize:

1. Never attempted prompts.
2. Low-success prompts.
3. Least recently used prompts.
4. Random tie-breaker.

## 6. API Boundary

The frontend should not connect directly to Cloudflare DB. Use a server/API layer such as Cloudflare Workers.

Recommended endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/scenarios/:scenarioId/start` | Load start node and buttons. |
| `POST /api/scenarios/buttons/:buttonId/select` | Execute button action and return next node. |
| `GET /api/games/sudoku/next?difficulty=normal` | Return next prioritized puzzle for the current user. |
| `GET /api/games/typing/next?difficulty=normal` | Return next prioritized prompt for the current user. |
| `POST /api/game-results` | Store result, update reward, update content history. |
| `POST /api/pets/:petId/feed` | Spend points and update pet hunger. |

## 7. Game Result Write Policy

When a game ends, the API should write in one transaction where possible:

1. `game_results`
2. `point_ledger`
3. `point_wallets`
4. `user_content_history` if the game used DB-managed content
5. `event_logs`

For Sudoku, `metadata_json` should include at minimum:

```json
{
  "puzzle_id": "sudoku_easy_001",
  "duration_sec": 180,
  "mistakes": 2,
  "completed": true
}
```

Even after adding `user_content_history`, keep `puzzle_id` in metadata for audit/debugging.

## 8. Migration Policy

The baseline Cloudflare schema is documented in `docs/MiniGgotchi_schema.sql`.

Do not edit that file as if a migration has already been applied. For DB changes:

1. Create a new migration SQL file.
2. Apply it to Cloudflare DB.
3. Update PRD/data-access docs with status.
4. Update handoff file.
