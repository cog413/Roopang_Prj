# Refresheet — Project Handoff

Read this file first. Then `chat_log.md` for session history, `AGENT_GUIDELINES.md` for workflow rules.

---

## Product

**Brand name**: SneakTime  
**Service name**: Refresheet  
**Browser title**: `SneakTime - Refresheet`  
**Concept**: Excel-disguised browser app with games and an emotional companion (Pattie/Mong).

---

## Architecture

- **Frontend**: Vanilla JS + CSS, served as static assets from project root
- **Backend**: Cloudflare Pages Functions — `functions/api/[[path]].js` → `src/worker/index.js`
- **Database**: Cloudflare D1 `db_game_info` (binding: `DB`)
- **Migrations**: `docs/migrations/` — source of truth for all table schemas
- **Deployment**: `npx.cmd wrangler pages deploy .` (Pages, not Worker)

---

## D1 Conventions

- Binding name in wrangler commands: always `DB` (not `db_game_info`)
- Migration apply: `npx.cmd wrangler d1 migrations apply DB --remote`
- Direct query: `npx.cmd wrangler d1 execute DB --remote --command "SELECT ..."`
- **Never drop tables** — additive migrations only (ALTER, CREATE IF NOT EXISTS)
- Keep `migrations_dir = "docs/migrations"` under `[[d1_databases]]` in `wrangler.toml`
- `/api/me` fields: `user_id`, `email`, `nickname`, `avatar_url`, `last_login_at`, `is_new_user` — Worker and frontend must stay in sync

For table schemas, see `docs/migrations/`.

---

## Google OAuth / Secrets

- Required: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Register with PowerShell pipe — never Ctrl+V (causes control character corruption):
  ```powershell
  Get-Clipboard | npx.cmd wrangler pages secret put GOOGLE_CLIENT_ID --project-name refresheet-prj
  ```
- After secret change: redeploy Pages
- Verify: `/api/auth/google/debug` endpoint

---

## Sprite Assets

- **Originals**: `manually_command/export/` — read-only, never modify or rename
- **Runtime copies**: `public/assets/corgi/` — copy only, no transformation
- **Manifest**: `public/assets/corgi/manifest.json` — authoritative for all animation metadata
- Frame counts are inferred from actual image dimensions at load time — never hardcode them
- `renderWidth` must be an integer downscale of `frameWidth`:
  - 64 → 32 (×0.5) ✓
  - 64 → 25 (×0.390625) ✗ — causes asymmetric pixel sampling
- Current B-plan rendering keeps the outer `.pattie-sprite` at collision/layout size (currently 32x32), while `.pattie-sprite-base` renders the native source frame (currently 64x64) and scales visually with CSS `transform: scale(0.5)`.
- In `applyFrame()`, keep `backgroundSize` and `backgroundPosition` in source image coordinates; do not multiply them by 0.5.

For current sprite filenames, see `public/assets/corgi/manifest.json`.

---

## Pattie World System

- Zone config: `src/patties/pattieWorldConfig.js`
- Bar terrain attribute: `data-pattie-terrain="chart-bar"` on `mp-bar` elements
- **Surface coords must use the parent `mp-bar-pair` rect** — `mp-bar` alone is narrower than `spriteSize`
- `spriteSize` in config must always match manifest `renderWidth` (currently both 32)
- `maxJumpDistancePx: 62` — limits bar-to-bar movement to adjacent columns only
- `walkFrameDurationMs` must scale proportionally with walk speed — change both together
- Speech bubble (`.pattie-speech`) is repositioned in `updateNameplate()` every rAF tick
- Chart title shows pet nickname via `updateChartTitle()` in `src/pet/miniPet.js`

---

## Management Sheet / Current Cautions

- Bar landing correction applies only to bar surfaces: `bar.top - size + 6`; floor surface math must stay unchanged.
- Sleep is locked for two decision cycles after entering sleep; do not re-pick state until the lock expires.
- Sheet/card sleep and idle weights are intentionally increased; keep totals normalized by reducing walk, not terrain jump/climb behavior.
- `src/pet/miniPet.js` builds the management dashboard DOM: sales table on the left; `mp-dashboard-main-section` on the right; project table first; `mp-analysis-row` below it with monthly trend and realtime analysis.
- Do not move monthly trend/realtime analysis back beside the project table; that caused overlap.
- Project-name cells use first-column ellipsis inside `.proj-table`; do not widen the whole table to solve long text.
- Realtime analysis uses the actual `#mp-map-canvas` with DPR-aware sizing in `renderRealtimeAnalysis()`. Do not replace it with a pseudo-element placeholder.
- Pattie settings button belongs inside `#mp-chart` top-right. If the chart is not built yet, it may temporarily attach to `#mini-pet-habitat` and then move.

---

## Branch Strategy

- `main`: canonical development branch
- `sub`: secondary deployment branch
- Flow: commit main → push main → checkout sub → merge main → push sub → checkout main
- Sub conflicts: `git checkout --theirs <file>` when main is clearly canonical

---

## Before Starting Work

```
git log --oneline -10
```

Other agents commit to this repo. Never assume file state matches memory.
