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

## 용어 정의 (v1.4.0 확립)

| 용어 | 정의 | 위치 |
|------|------|------|
| **토닥이 맵** | 토닥이 캐릭터가 실제로 이동하는 영역. 차트, 막대그래프, 바닥 위에서 걷고 점프한다. | `#mp-chart` (우측 하단) |
| **토닥이 관리박스** | 포인트·행복점수·토닥여주기·간식주기·말걸기 설명과 버튼이 들어간 박스 | `#mp-manage-box` (좌측 하단) |

- 코드/주석/문서에서 위 용어를 일관 사용할 것
- 코드 내 zone 명칭(`sheet-zone`, `chart-zone` 등)은 `pattieWorldConfig.js` 기준 유지

---

## 토닥이 경제 시스템 (v1.4.0 신규)

### 핵심 개념

| 개념 | 설명 |
|------|------|
| **게임 포인트** | 게임 score 획득 시 1/10이 적립되는 관리시트 소비재. 랭킹 score와 완전히 별개. |
| **행복점수** | 토닥여주기/간식주기/말걸기로 증가. min:40 max:100 초기:40. |
| **apple** | 유일한 아이템. 300p/개. 간식주기에 사용. |

### DB 테이블 (migration 012)

- `user_points` — 보유 포인트 (current, total_earned, total_spent)
- `point_transactions` — EARN/SPEND/ADJUST 거래 내역 (source_id로 중복 방지)
- `user_item_inventory` — 아이템 수량 (user_id + item_id PK)
- `item_purchase_history` — 구매 이력
- `pet_happiness_state` — 현재 행복점수 + 마지막 마감일
- `pet_happiness_history` — PET/FEED/TALK/DAILY_CLOSE/SYSTEM 히스토리
- `pet_daily_interaction_limits` — 일일 점수 증가 횟수 (pet: 3회, talk: 3회)

### API 엔드포인트 (신규)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/pet/economy` | 포인트+인벤토리+행복+일일제한 한번에 조회 |
| POST | `/api/pet/items/purchase` | 아이템 구매 (포인트 차감, 인벤 증가, 이력 기록) |
| POST | `/api/pet/happiness/change` | 행복점수 변경 (PET/FEED/TALK/SYSTEM) |
| POST | `/api/pet/happiness/daily-close` | 자정 마감 처리 (×0.8~0.9, min 40) |

- POST `/api/scores` 및 `/api/games/typing/finish` → 이제 `earned_points` 필드 반환
- 포인트 중복 적립 방지: `point_transactions(source_type, source_id)` UNIQUE 인덱스

### 프론트엔드 모듈

- `src/patties/pattieEconomy.js` — 상태 관리 (loadEconomy, changeHappiness, purchaseItem)
- `src/patties/PattieApple.js` — 간식주기 메커니즘 (마우스 추적, 낙하, 먹기 연출)
- Economy 이벤트: `refresheet:economy-updated` → 포인트/행복바/apple HUD 갱신

### 캐릭터별 행복 증가량

| 캐릭터 | 토닥여주기 | 간식주기 | 말걸기 |
|--------|-----------|---------|--------|
| mong / corgi / rabbit / dog | +5~8 | +10~15 | +3~5 |
| cabul / kitty / cat | +2~5 | +15~20 | +1~3 |

- 설정 위치: `HAPPINESS_CONFIG` 상수 (worker/index.js)
- 새 캐릭터 추가 시 해당 config에 key 추가

### 일일 마감

- 자정 지나면 `loadEconomy()` → `_checkDailyClose()` → `POST /api/pet/happiness/daily-close` 자동 실행
- 마감 점수: 전일 × 0.8~0.9, min 40
- 80점 이상 마감 시 `achieved_daily_goal: true` (히스토리 metadata에 기록)
- **TODO**: readme 시트 KPI에 "토닥이 아껴주기 달성" 기준 반영 예정 (DAILY_CLOSE history 기준)

---

## Management Sheet / Current Cautions

- Bar landing correction applies only to bar surfaces: `bar.top - size + 6`; floor surface math must stay unchanged.
- Sleep is locked for two decision cycles after entering sleep; do not re-pick state until the lock expires.
- Sheet/card sleep and idle weights are intentionally increased; keep totals normalized by reducing walk, not terrain jump/climb behavior.
- `src/pet/miniPet.js` builds the management dashboard DOM: sales table on the left; `mp-dashboard-main-section` on the right; project table first; `mp-analysis-row` below it with monthly trend and realtime analysis. **After v1.4.0**: `#mp-manage-box`(관리박스) is inserted between `mp-dashboard-main-section` and `#mp-chart`.
- Do not move monthly trend/realtime analysis back beside the project table; that caused overlap.
- Project-name cells use first-column ellipsis inside `.proj-table`; do not widen the whole table to solve long text.
- Realtime analysis uses the actual `#mp-map-canvas` with DPR-aware sizing in `renderRealtimeAnalysis()`. Do not replace it with a pseudo-element placeholder.
- Pattie settings button belongs inside `#mp-chart` top-right. If the chart is not built yet, it may temporarily attach to `#mini-pet-habitat` and then move.
- 토닥이 맵(`#mp-chart`)에는 `.mp-map-actions` (간식주기 버튼 + apple HUD)가 추가됨. 절대위치 top:6px right:6px로 배치.
- **Action lock 우선순위** (PattieRoamingController v1.4.0): FEEDING(4) > CLICK_HAPPY(3) > JUMP(2) > MOVE(1) > IDLE(0). `actionLock=true`인 동안 일반 AI decide/move가 차단됨.
- `mong_surprise.png` 스프라이트가 corgi manifest에 추가됨 (`surprise` 애니메이션). 간식 먹기 연출에 사용.
- `apple_idle..png` — 파일명에 점 두 개(`..`) 주의. 기존 `mong_walk..png`와 동일 패턴.

---

## 파일 탭 / File Guide Sheet

### 구현 목적 (AdSense 심사 대비)

파일 탭(`#file-menu-tab` → `#file-sheet`)은 순수 UX 기능이 아니라 **Google AdSense 심사 통과**를 위한 의도적 설계다.

AdSense 심사에서 요구하는 핵심 조건:
- **E-E-A-T**: 서비스의 목적·철학·운영 주체를 명시하는 콘텐츠 존재
- **Helpful Content**: 실제 사용자에게 가치 있는 정보 페이지
- **Crawlability**: 검색 엔진이 색인할 수 있는 퍼블릭 URL

### 구조

- 파일 탭 클릭 → `#file-sheet`가 `.grid-content` 안에서 일반 sheet-view로 열림 (overlay 아님)
- 모든 Excel 크롬(툴바·포뮬러바·시트탭) 유지 — "별도 문서 시트" 느낌
- 카드 6개 각각이 퍼블릭 정적 페이지로 연결:

| 카드 | URL | 목적 |
|------|-----|------|
| Refresheet 소개 | `/about` | E-E-A-T: 서비스 배경·핵심 가치 |
| 마이크로 브레이크 가이드 | `/micro-break` | Helpful Content: 짧은 휴식의 과학적 근거 |
| 토닥이 가이드 | `/todaki` | Helpful Content: 캐릭터 세계관 |
| 디자인 철학 | `/design-philosophy` | E-E-A-T: 설계 의도·UX 철학 |
| 집중 리프레시 | `/focus-refresh` | Helpful Content: 게임 설계 이유 |
| 자주 묻는 질문 | `/faq` | Trust: 운영 정책·데이터 처리 |

### 정적 페이지 관리 원칙

- 모든 정적 페이지: `public/` 디렉터리, 고유 canonical URL
- `robots.txt`: `Allow: /`, sitemap 등록 (`sitemap.xml`)
- 페이지 내 "Microsoft Excel" 등 타사 브랜드 노출 금지 — AdSense Brand Impersonation 위반
- 서비스 명칭은 항상 **MicroSnack** 또는 **Refresheet** 사용

### 주의

- 파일 탭은 `sheetViews` NodeList에 포함됨 (`querySelectorAll('.sheet-view')`)
- JS에서 `display: flex`로 열고, 일반 시트 탭 클릭 시 `display: none`으로 자동 닫힘
- `updateFormulaBarForSheet('file')` → `=GUIDE.INDEX("서비스_안내")`

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
