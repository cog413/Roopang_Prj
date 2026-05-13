# Refresheet — Project Handoff

Read this file first. Then `chat_log.md` for session history, `AGENT_GUIDELINES.md` for workflow rules.

---

## Product

**Brand name**: MicroSnack  
**Service name**: Refresheet  
**Browser title**: `MicroSnack - Refresheet`  
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

## Review Tab / Comments

- Top ribbon `검토` is handled by `#review-menu-tab` and opens `#review-sheet` without changing the default sheet on initial load.
- Frontend module: `src/review/review.js`; imported from `src/main.js`.
- Backend endpoints live in `src/worker/index.js` under `/api/review/*`.
- D1 schema source: `docs/migrations/007_review_comments.sql`.
- This project uses `users.user_id TEXT`; do not copy schemas that reference `users(id)`.
- Public comments/replies share the `comments` table and count toward the 3-per-day creation limit. Edits do not count.
- Likes are stored in `comment_likes` with `UNIQUE(comment_id, user_id)`.
- Operator feedback is private in `operator_feedback`; never render it in public comments.
- Admin delete permission is backend-only and based on `jhchae9080@gmail.com`.
- Nicknames are stored in `user_profiles.nickname`, required before posting, and must stay globally unique.

---

## Unlocks / Referrals / NewGame

- Original Sudoku lives at `src/games/sudoku/sudoku.js`; do not modify it when changing NewGame.
- NewGame is a temporary copied Sudoku placeholder at `src/games/newgame/newGame.js`.
- NewGame sheet DOM uses `#newgame-sheet` and `#newgame-grid`; tab key is `data-sheet="newgame"` and unlockable key is `new_game`.
- NewGame tab must remain directly after SDK in the bottom sheet tabs.
- NewGame is locked by backend unlock state until the signed-in user has at least 2 valid referrals.
- Lock state APIs:
  - `GET /api/unlockables`
  - `GET /api/unlockables/check?item_key=new_game`
- Referral APIs:
  - `GET /api/referral`
  - `POST /api/referral`
- D1 schema source: `docs/migrations/008_unlockables_referrals.sql`.
- This project uses `users.user_id TEXT`; do not copy schemas that reference `users(id)`.
- Referral email is immutable after insert, normalized lowercase, must match an existing user, and cannot be the current user's email.
- NewGame score saves use `game_type='new_game'`; Worker rejects the score if the item is still locked.

---

## QA / Dev-Login (Preview Only)

`/api/dev-login` is a **preview-only** endpoint for automated QA sessions. Production hosts always receive 404.

### How it works

- Endpoint: `POST /api/dev-login`
- Allowed host: `sub.refresheet-prj.pages.dev` only
- On `refresheetkr.com` or `www.refresheetkr.com`: returns 404 (host check is first, before any env lookup)
- On allowed host: requires `DEV_LOGIN_ENABLED=true` + valid `Authorization: Bearer <token>`
- On success: issues the same `refresheet_session` cookie as Google OAuth (calls `createSession()` directly)
- No duplicate session logic — single source of truth

### QA Account

- Email: `qa_jhchae908p@refresheet.test`
- DB user_id: `usr_qa_refresheet_test_0001`
- No `google_sub`, no OAuth credential, no payment, no personal data
- Onboarding already done, pattie set to `mong`
- Never impersonate the production account (`jhchae9080@gmail.com`)

### Required Cloudflare Secrets (preview project only)

Set via PowerShell pipe — never Ctrl+V:
```powershell
Get-Clipboard | npx.cmd wrangler pages secret put DEV_LOGIN_ENABLED --project-name refresheet-prj
# value: true

Get-Clipboard | npx.cmd wrangler pages secret put DEV_LOGIN_TOKEN --project-name refresheet-prj
# value: <random strong token>
```

After setting secrets: redeploy the Pages project.

### Apply QA Seed Migration

```powershell
npx.cmd wrangler d1 execute DB --remote --file=./docs/migrations/006_qa_seed.sql
```

Apply to the **preview** D1 database only. Verify:
```powershell
npx.cmd wrangler d1 execute DB --remote --command "SELECT user_id, email FROM users WHERE email LIKE 'qa_%'"
```

### Playwright / Automated Tests

Install (first time):
```powershell
npm install
npx playwright install chromium
```

Run:
```powershell
$env:DEV_LOGIN_TOKEN="<token>"; npm run test:qa
```

View report:
```powershell
npm run test:qa:report
```

Test spec: `tests/qa-preview.spec.js`  
Screenshots saved to: `test-results/`

### #CHCK# Workflow

When `#CHCK#` appears in a request, the agent must open the actual preview site and verify rendering — not infer from code. See `refresheet.context` for full rule.

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
