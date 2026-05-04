# Chat Log (Auto-Managed)

### [2026-05-04 23:33] (CLI: codex)

**1. 목표**
- Google 로그인 기능이 활성화되지 않는 원인을 확인하고 수정한다.
- 실제 활성화되는 요소만 인터랙티브 피드백을 보이게 한다.
- 2048/SDK 선택 안내 문구와 점수 보정 로직을 추가한다.
- 관리시트 미니미 버튼 위치, 수동/자동 말풍선 충돌, 다크모드 미니미 반전을 수정한다.
- main/sub 양쪽에 커밋/푸시한다.

**2. 현재 상태**
- `main`에는 로그인 버튼 UI가 있었지만, Cloudflare Pages에서 `/api/auth/google/start`가 `src/worker/index.js`로 라우팅되는 Pages Function이 없었다.
- `sub`에는 main의 일부 UI 커밋이 누락되어 있어 로그인 버튼 자체도 동기화가 필요했다.

**3. 문제**
- `src/worker/index.js`만 있으면 Cloudflare Pages 정적 배포에서 `/api/*`가 자동으로 활성화되지 않는다.
- 가짜 리본 버튼도 hover 반응이 있어 실제 버튼처럼 보였다.
- `.pet-interaction-panel`이 표 위쪽에 떠 있어 표를 가릴 수 있었다.
- 자동 말풍선 타이머와 유저 버튼 반응 말풍선이 서로 덮어쓸 수 있었다.

**4. 시도한 것**
- `functions/api/[[path]].js`를 추가해 Pages의 `/api/*` 요청을 기존 Worker fetch handler로 전달하게 했다.
- 가짜 리본 버튼 hover를 제거하고 실제 요소에만 hover/outline/cursor 피드백을 남겼다.
- 2048 그리드 크기 선택 안내 문구와 4x4/5x5 점수 보정 multiplier를 추가했다.
- SDK 난이도 안내 문구와 난이도/시간/실수 기반의 약한 점수 보정 로직을 조정했다.
- 미니미 버튼 패널을 line 28~34 위치에 해당하는 하단 영역으로 이동했다.
- 미니미 수동 말풍선 이벤트를 `refresheet:pet-say`로 분리하고, 수동 대화 5초 동안 자동 말풍선을 억제했다.
- 다크모드에서 미니미 본체/눈/입/발 색상이 반전되도록 CSS를 추가했다.

**5. 해결 / 인사이트**
- 로그인 비활성의 핵심 원인은 Google/D1 로직 부재가 아니라 Pages 배포에서 API route가 Worker에 연결되지 않은 점이었다.
- `functions/api/[[path]].js`가 추가되어 Pages 환경에서도 `/api/auth/google/start`, `/api/me`, `/api/auth/logout`가 기존 D1 Worker 로직을 사용한다.
- DB 적재 대상은 기존과 동일하게 D1 `db_game_info`의 `users`, `user_profiles`, `auth_events`, `auth_sessions`다.

**6. 반영 필요 사항 (중요)**
- Pages 배포에서 인증 API는 `functions/api/[[path]].js` 라우터를 유지해야 한다.
- 실제 동작하는 컨트롤에만 인터랙티브 피드백을 준다.
- 2048과 SDK 점수는 난이도/크기 차이를 보정해 기대 점수 범위를 맞춘다.
- 미니미 수동 대화 중에는 자동 말풍선을 억제한다.

---

이 파일은 모든 AI CLI(Gemini, Claude, Codex, GPT)의 대화 요약을 누적 관리한다.

## 📌 기록 규칙 (내재 프롬프트)

AI는 매 대화 종료 시 아래 규칙을 반드시 수행한다:

1. 현재 대화를 아래 형식으로 요약하여 이 파일에 append 한다.
2. 동일한 내용 중복 기록은 피한다.
3. 핵심 의사결정 / 변경사항 / 문제 해결만 기록한다.
4. 불필요한 raw 로그는 기록하지 않는다.

---

## 🧩 기록 포맷

### [YYYY-MM-DD HH:mm] (CLI: {gemini|claude|codex|gpt})

**1. 목표**
- 사용자가 하고자 한 것

**2. 현재 상태**
- 환경 / 진행 상황

**3. 문제**
- 에러 / 막힌 부분

**4. 시도한 것**
- 이미 시도한 접근

**5. 해결 / 인사이트**
- 해결 방법 또는 핵심 이해

**6. 반영 필요 사항 (중요)**
- refresheet.context에 추가해야 할 내용

---

## 🔁 정책 반영 규칙

AI는 아래를 판단해야 한다:

- 반복되는 요구
- 구조/설계 관련 결정
- UX/UI 규칙
- 데이터 구조

해당 시:
 refresheet.context 파일에 반영 또는 반영 제안 수행

---

### [2026-05-04 21:35] (CLI: codex)

**1. 목표**
- 프로젝트에 대화 기록 및 정책 자동 축적 시스템을 구축한다.

**2. 현재 상태**
- 프로젝트 루트에 `chat_log.md`와 `refresheet.context`를 생성했다.

**3. 문제**
- 기존 `chat_log.md` 및 `refresheet.context` 파일이 없어 신규 생성이 필요했다.

**4. 시도한 것**
- 루트 디렉터리와 기존 파일 존재 여부를 확인했다.
- 요청된 기록 규칙과 정책 반영 규칙을 파일에 반영했다.

**5. 해결 / 인사이트**
- 이후 대화 종료 시 핵심 요약을 `chat_log.md`에 append하고, 구조적/반복적 결정은 `refresheet.context` 반영 대상으로 판단한다.

**6. 반영 필요 사항 (중요)**
- 대화 종료 시 자동 기록, CLI 종류/시간 명시, 정책 반영 필요 여부 판단을 기본 운영 규칙으로 유지한다.

---

### [2026-05-04 21:38] (CLI: codex)

**1. 목표**
- 현재 기록/정책 파일 구조만으로 향후 새로운 CLI가 프로젝트 히스토리를 파악하고 작업할 수 있는지 확인한다.

**2. 현재 상태**
- `chat_log.md`와 `refresheet.context`가 루트에 생성되어 있으며, 대화 요약과 정책 축적 규칙이 들어 있다.

**3. 문제**
- 파일이 있어도 신규 CLI가 자동으로 읽는다는 보장은 없으며, 진입 시 어떤 파일을 먼저 봐야 하는지 명시하는 온보딩 규칙이 필요하다.

**4. 시도한 것**
- 현재 구조의 한계를 판단하고 `refresheet.context`에 신규 CLI 온보딩 규칙을 추가했다.

**5. 해결 / 인사이트**
- 신규 CLI가 루트 파일을 읽으면 히스토리 파악은 가능하지만, 안정적인 운영을 위해 시작 시 `refresheet.context`와 `chat_log.md`를 먼저 읽는 규칙을 명문화했다.

**6. 반영 필요 사항 (중요)**
- 신규 CLI는 작업 시작 전 `refresheet.context`를 정책 기준으로, `chat_log.md`를 히스토리 기준으로 확인해야 한다.

---

### [2026-05-04 21:39] (CLI: codex)

**1. 목표**
- 사용자가 게임 확인 후 추가 의견 또는 후속 요청을 전달하려는 상태를 기록한다.

**2. 현재 상태**
- 대화 기록/정책 축적 시스템은 구성되어 있다.
- 사용자는 게임을 확인했다고 언급했다.

**3. 문제**
- 후속 문장이 아직 완성되지 않아 구체적인 수정 또는 이슈 내용은 미정이다.

**4. 시도한 것**
- 추가 요청을 받을 수 있도록 대기한다.

**5. 해결 / 인사이트**
- 없음.

**6. 반영 필요 사항 (중요)**
- 현재 단계에서는 `refresheet.context`에 반영할 구조적 결정 없음.

---

### [2026-05-04 21:44] (CLI: codex)

**1. 목표**
- 2048 및 SDK 탭에서 실제 게임 화면 아래가 흰색 엑셀 시트처럼 보이는 원인을 확인하고, 오류이면 수정 후 커밋/푸시한다.

**2. 현재 상태**
- 현재 브랜치는 `sub`이며 원격은 `origin`이다.
- 로컬 HTTP 로드 상태는 200으로 확인했다.

**3. 문제**
- `.sheet-view`는 절대 배치되어 콘텐츠만 덮고, 배경 격자 역할의 `#dummy-grid`가 `z-index: -1`로 부모 배경 뒤에 숨어 게임 콘텐츠 아래 빈 영역이 흰색으로 보일 수 있었다.
- Git에서 safe.directory 설정이 없어 처음 `git status`가 차단됐다.

**4. 시도한 것**
- CSS 레이어 구조를 점검했다.
- `style.css`에서 `.sheet-view`를 `z-index: 1`, `.dummy-grid`를 `z-index: 0` 및 `pointer-events: none`으로 조정했다.
- Git safe.directory를 추가했다.

**5. 해결 / 인사이트**
- 게임 시트 아래쪽도 더미 엑셀 격자가 배경 레이어로 보이도록 수정했다.
- 실제 게임 요소는 더미 격자보다 위에 유지되어 클릭/키보드 상호작용에 영향을 주지 않는다.

**6. 반영 필요 사항 (중요)**
- 엑셀 UI 패턴상 게임 탭에서도 빈 영역은 흰 배경이 아니라 엑셀 격자 배경이 유지되어야 한다.

---

### [2026-05-04 21:59] (CLI: codex)

**1. 목표**
- Google OAuth 로그인 후 Cloudflare D1의 `users`, `user_profiles`, 인증 이벤트 테이블에 회원가입/로그인/로그아웃 이력이 남도록 구현한다.
- 변경사항을 `main`과 `sub` 양쪽에 커밋/푸시한다.

**2. 현재 상태**
- Worker 소스가 없던 상태에서 `src/worker/index.js`를 추가했다.
- D1 무손실 확장 마이그레이션 `docs/migrations/002_google_auth.sql`을 추가했다.
- 프론트 로그인 상태 초기화 모듈 `src/auth/authState.js`를 추가하고 `src/main.js`에 연결했다.

**3. 문제**
- 원격 D1 마이그레이션 실행 시 Cloudflare API 인증 오류(code 10000)로 실제 DB 적용이 차단됐다.

**4. 시도한 것**
- `npx.cmd wrangler --version`으로 Wrangler 실행 가능 여부를 확인했다.
- `npx.cmd wrangler d1 execute db_game_info --remote --file=./docs/migrations/002_google_auth.sql`을 실행했으나 인증 오류가 발생했다.
- JS 구문 검증을 `node --check`로 수행했다.

**5. 해결 / 인사이트**
- Worker는 Google userinfo의 `sub`, `email`, `name`, `picture`를 받아 `users`/`user_profiles`를 upsert하고 `auth_events`에 `signup`, `login`, `logout`을 기록하도록 구현됐다.
- `/api/me`는 `user_id`, `email`, `nickname`, `avatar_url`, `last_login_at`, `is_new_user`를 반환한다.
- 실제 D1 적용은 Cloudflare 인증 문제 해결 후 같은 migration 명령을 재실행해야 한다.

**6. 반영 필요 사항 (중요)**
- Google OAuth/D1 인증 정책: `users.google_sub` 우선 식별, email-only 기존 유저 연결, `auth_events` 기반 signup/login/logout 기록, 프론트와 Worker 필드명 일치.

---

### [2026-05-04 22:34] (CLI: codex)

**1. 목표**
- Cloudflare D1 migration apply 실패를 토큰 없음으로 단정하지 않고, 현재 세션 인증, Wrangler 설정, D1 binding/account mismatch, migration 경로 문제를 순서대로 점검한다.
- 실제 D1 반영 여부를 명확히 확인한다.

**2. 현재 상태**
- 현재 실행 환경에서 `npx.cmd wrangler whoami`는 정상 동작했다.
- Wrangler는 OAuth Token으로 로그인되어 있으며 계정은 `jhchae9080@gmail.com`, Account ID는 `6c58daf51e3d34cdfd6cb85bd1f158ae`로 확인됐다.
- Token Permissions에 `d1 (write)`가 표시됐다.
- PowerShell 환경변수 `$env:CLOUDFLARE_API_TOKEN`은 현재 세션에서는 `not set`이지만, Wrangler OAuth 로그인은 정상 인식됐다.
- 설정 파일은 `wrangler.jsonc`가 아니라 `wrangler.toml`만 존재한다.
- D1 binding은 `DB`, database_name은 `db_game_info`, database_id는 `5c560a75-93a5-4414-88fc-0bd8e9ff4e26`로 확인됐다.
- `npx.cmd wrangler d1 list`에서도 동일한 DB `db_game_info` / `5c560a75-93a5-4414-88fc-0bd8e9ff4e26`가 조회됐다.

**3. 문제**
- 최초 실패 로그:
  - 명령: `npx.cmd wrangler d1 execute db_game_info --remote --file=./docs/migrations/002_google_auth.sql`
  - 결과: Cloudflare API `/accounts/6c58daf51e3d34cdfd6cb85bd1f158ae/d1/database/5c560a75-93a5-4414-88fc-0bd8e9ff4e26/import` 요청 실패
  - 오류: `Authentication error [code: 10000]`
- migration list 실패 로그:
  - 명령: `npx.cmd wrangler d1 migrations list DB --remote`
  - 결과: `No migrations folder found. Set migrations_dir in your wrangler.toml file to choose a different path.`
  - 오류: `No migrations present at ...\Refresheet_Prj\migrations.`
  - 원인: migration 파일은 `docs/migrations`에 있었지만 Wrangler 기본값은 `./migrations`였다.

**4. 시도한 것**
- `npx.cmd wrangler whoami` 실행: OAuth 로그인 및 `d1 (write)` 권한 확인.
- `$env:CLOUDFLARE_API_TOKEN` 확인: 현재 PowerShell 세션에는 env token 없음 확인.
- `wrangler.toml` 확인: D1 binding/name/id가 실제 D1과 일치함 확인.
- `npx.cmd wrangler d1 list` 실행: 실제 DB 목록에서 `db_game_info` 확인.
- `npx.cmd wrangler d1 execute DB --remote --command "SELECT name FROM sqlite_master WHERE type='table';"` 실행: 직접 execute 성공 및 기존 테이블 존재 확인.
- `wrangler.toml`에 `migrations_dir = "docs/migrations"` 추가.
- `npx.cmd wrangler d1 migrations list DB --remote` 재실행: `001_user_content_history.sql`, `002_google_auth.sql` pending 확인.
- `npx.cmd wrangler d1 migrations apply DB --remote` 실행: 두 migration 모두 성공.
- 적용 후 확인 쿼리 실행:
  - `SELECT name FROM sqlite_master WHERE type='table';`
  - `PRAGMA table_info(users);`
  - `PRAGMA table_info(user_profiles);`
  - `npx.cmd wrangler d1 migrations list DB --remote`

**5. 해결 / 인사이트**
- 실제 D1 반영 완료.
- 적용된 신규 테이블:
  - `d1_migrations`
  - `user_content_history`
  - `auth_events`
  - `auth_sessions`
- `users` 컬럼 확인 결과:
  - `user_id`
  - `email`
  - `created_at`
  - `google_sub`
  - `updated_at`
- `user_profiles` 컬럼 확인 결과:
  - `user_id`
  - `nickname`
  - `last_login_at`
  - `created_at`
  - `avatar_url`
  - `updated_at`
- `npx.cmd wrangler d1 migrations list DB --remote` 최종 결과: `No migrations to apply!`
- 결론: 토큰/권한 자체 문제가 아니라, migration command에서는 `migrations_dir` 설정 누락이 핵심 원인이었다. 직접 execute by binding `DB`는 정상 동작했다.

**6. 반영 필요 사항 (중요)**
- D1 migration 파일 위치가 `docs/migrations`인 경우 `wrangler.toml`의 `[[d1_databases]]`에 `migrations_dir = "docs/migrations"`를 반드시 유지한다.
- D1 명령은 database name보다 binding 이름 `DB` 기준으로 실행한다.

---

### [2026-05-04 22:41] (CLI: codex)

**1. 목표**
- 사용자가 제공한 `[오늘의 KPI]`, `[SOP]`, `[시트 안내]` 내용을 ReadMe 시트에 반영한다.
- 현재처럼 문서 UI/카드처럼 보이지 않고, 엑셀에 직접 입력한 느낌으로 표시한다.

**2. 현재 상태**
- `index.html`의 ReadMe 시트는 기존 `declaration-box` 카드형 문서 UI로 구성되어 있었다.

**3. 문제**
- 카드형 선언문 UI는 사용자가 원하는 엑셀 입력형 ReadMe 시트 패턴과 맞지 않았다.

**4. 시도한 것**
- `declaration-box` DOM을 제거하고 `readme-grid` 기반 셀형 콘텐츠로 교체했다.
- KPI/SOP/시트 안내를 라벨 셀, 본문 셀, 섹션 헤더 셀로 배치했다.
- `style.css`에서 선언문 카드 CSS를 제거하고 ReadMe 전용 셀 CSS 및 다크모드 스타일을 추가했다.

**5. 해결 / 인사이트**
- ReadMe 시트가 문서 박스가 아니라 엑셀 셀에 입력된 안내 표처럼 보이도록 변경됐다.

**6. 반영 필요 사항 (중요)**
- ReadMe 시트는 카드/문서 UI가 아니라 셀 병합과 채우기 색을 활용한 엑셀 입력형 UI 패턴을 유지한다.

---

### [2026-05-04 22:47] (CLI: codex)

**1. 목표**
- ReadMe 하단에 "마우스를 올렸을 때 반응하는 버튼만 진짜입니다. (예: 보기 탭)" 문장을 추가한다.
- 상단 `보기` 탭에 다크모드 기능을 넣는다.
- 기존 `JH` 버튼을 Google 로그인 버튼으로 바꾸고, 로그인 성공 후 Office 365처럼 초성/이니셜을 표시한다.
- 로그인/회원가입 정보가 어떤 DB에 쌓이는지 확인하고 기존 인증 흐름과 연결한다.

**2. 현재 상태**
- Google OAuth Worker는 Cloudflare D1 `db_game_info`에 연결되어 있으며 binding은 `DB`이다.
- 인증 데이터는 `users`, `user_profiles`, `auth_events`, `auth_sessions`에 기록되는 구조다.

**3. 문제**
- 기존 `JH` 버튼은 다크모드 토글 역할이어서 로그인 버튼 역할과 충돌했다.
- 다크모드는 사용자가 기대한 `보기` 탭이 아니라 우측 계정 버튼에 연결되어 있었다.

**4. 시도한 것**
- `index.html`에서 `JH` 영역을 `login-button`으로 교체했다.
- `보기` 메뉴 탭에 `view-menu-tab` ID를 부여하고 다크모드 토글로 연결했다.
- `src/auth/authState.js`에서 비로그인 시 Google OAuth 시작 URL로 이동하고, 로그인 상태면 `/api/me`의 `nickname`/`email` 기반 초성 또는 이니셜을 표시하도록 구현했다.
- `style.css`에 Office 계정 배지 느낌의 `account-button` 스타일을 추가했다.
- `node --check`로 `authState.js`, `excelLayout.js` 구문을 확인했다.

**5. 해결 / 인사이트**
- 비로그인 상태에서는 우측 버튼이 `로그인`으로 보이고 `/api/auth/google/start`로 이동한다.
- 로그인 성공 후 `/api/me`가 반환하는 사용자 정보 기준으로 버튼에 초성/이니셜이 표시된다.
- DB 적재 대상은 Cloudflare D1 `db_game_info`의 `users`, `user_profiles`, `auth_events`, `auth_sessions`로 명확하다.

**6. 반영 필요 사항 (중요)**
- 다크모드는 `보기` 탭에서 토글한다.
- 우측 계정 버튼은 Google 로그인 진입점이며 로그인 후 사용자 초성/이니셜을 표시한다.
- 인증 데이터는 D1 `db_game_info`의 `users`, `user_profiles`, `auth_events`, `auth_sessions`에 누적한다.

---

### [2026-05-04 22:54] (CLI: codex)

**1. 목표**
- 2048 및 SDK 시트에서 게임 활성화 영역 아래로 보이는 흰 박스를 제거한다.
- 기능 저하가 생기지 않도록 보완책을 판단하고 main/sub 양쪽에 커밋/푸시한다.

**2. 현재 상태**
- 2048, SDK 게임 보드는 `.sheet-layout` 내부 flex item인 `.game-grid`로 렌더링된다.

**3. 문제**
- `.sheet-layout`의 기본 flex 동작인 `align-items: stretch` 때문에 `.game-grid`가 좌우 대시보드 높이만큼 세로로 늘어났다.
- 실제 게임 셀 아래 남는 영역이 `.game-grid`의 흰 배경으로 표시되어 엑셀 시트 격자가 아닌 흰 박스처럼 보였다.

**4. 시도한 것**
- `.game-grid`에 `align-self: flex-start`를 추가했다.

**5. 해결 / 인사이트**
- 게임 보드는 실제 셀 높이만큼만 렌더링되고, 아래쪽 빈 영역은 기존 dummy-grid 엑셀 배경이 보인다.
- 게임 셀, 키보드 입력, 클릭 영역은 줄어들지 않으므로 서비스 기능 저하는 없다.

**6. 반영 필요 사항 (중요)**
- 게임 보드는 flex stretch로 늘리지 않고 실제 셀 크기에 맞춰 `align-self: flex-start`를 유지한다.
---

### [2026-05-04 23:42] (CLI: codex)

**1. 목표**
- Google 로그인 시 `Missing environment variable: GOOGLE_CLIENT_ID` 오류가 뜨는 원인을 확인하고 수정한다.

**2. 현재 상태**
- 실제 배포 대상은 Cloudflare Pages 프로젝트 `refresheet-prj` 및 `refresheet-prj-global-prod`이다.
- `npx.cmd wrangler pages secret list --project-name refresheet-prj` 결과 production secrets가 비어 있었다.
- `npx.cmd wrangler pages secret list --project-name refresheet-prj-global-prod` 결과 production secrets가 비어 있었다.

**3. 문제**
- Pages Function 환경에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`이 등록되어 있지 않아 OAuth 시작 단계에서 실패했다.
- 기존 `wrangler.toml`은 Worker용 `main` 설정과 Pages용 설정이 혼재되어 Pages 설정 검증에서 충돌했다.

**4. 시도한 것**
- `wrangler secret list`를 실행했으나 Worker `refresheet-prj`가 없어 실패했다. 이는 Worker 배포가 아니라 Pages 배포임을 시사한다.
- `wrangler pages project list`로 Pages 프로젝트 `refresheet-prj`, `refresheet-prj-global-prod`를 확인했다.
- `wrangler.toml`을 Pages 기준으로 정리했다: `main` 제거, `pages_build_output_dir = "."` 추가.
- `src/worker/index.js`에서 Google OAuth env 누락 시 `internal_error` 대신 `auth_config_missing` 503 응답을 반환하도록 보완했다.
- `package.json`의 배포 스크립트를 Worker deploy에서 Pages deploy로 변경했다.

**5. 해결 / 인사이트**
- 코드 라우팅은 정상화됐지만, 실제 Google 로그인 성공에는 Cloudflare Pages production secret 등록이 반드시 필요하다.
- 등록해야 할 값은 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`이며 선택적으로 `GOOGLE_REDIRECT_URI`도 등록할 수 있다.
- OAuth 값은 프로젝트 코드에서 추론할 수 없어 사용자가 제공하거나 Cloudflare Dashboard/CLI에서 설정해야 한다.

**6. 반영 필요 사항 (중요)**
- 이 프로젝트는 Pages 배포 기준이므로 `wrangler.toml`에 `pages_build_output_dir = "."`를 유지하고 Worker용 `main`과 혼용하지 않는다.
- Google 로그인 활성화 전 `refresheet-prj` Pages production 환경에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`을 반드시 설정한다.

---

### [2026-05-05 00:27] (CLI: codex)

**1. 목표**
- Cloudflare 토큰 업데이트 후 Google OAuth 로그인 설정을 다시 확인하고 main/sub 양쪽에 기록을 반영한다.

**2. 현재 상태**
- `npx.cmd wrangler whoami` 성공: 계정 `jhchae9080@gmail.com`, account_id `6c58daf51e3d34cdfd6cb85bd1f158ae`, Pages/D1 write 권한 확인.
- 현재 셸의 `$env:CLOUDFLARE_API_TOKEN`은 비어 있지만 Wrangler OAuth 로그인 세션으로 Cloudflare API 접근은 정상 동작한다.
- `refresheet-prj` 및 `refresheet-prj-global-prod` production Pages secrets 목록은 비어 있다.

**3. 문제**
- `https://refresheetkr.com/api/auth/google/start`가 503을 반환한다.
- 실제 응답: `{"error":"auth_config_missing","message":"Google login is not configured. Missing: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET","missing":["GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET"]}`.
- `https://refresheet.com/api/auth/google/start`는 API JSON이 아니라 예전 정적 HTML을 반환하여 글로벌 Pages 프로젝트는 최신 Functions 라우터가 반영되지 않은 상태로 보인다.

**4. 시도한 것**
- `wrangler whoami`로 토큰/세션 권한 확인.
- `wrangler pages secret list --project-name refresheet-prj` 확인.
- `wrangler pages secret list --project-name refresheet-prj-global-prod` 확인.
- production OAuth start endpoint를 `curl.exe -i`로 직접 확인.

**5. 해결 / 인사이트**
- 이번 오류는 Cloudflare 토큰 인증 실패가 아니라 Pages production 런타임에 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`이 없는 문제다.
- Google OAuth secret 값은 코드나 Cloudflare 토큰에서 추론할 수 없으므로 실제 Google OAuth Client ID/Secret을 Pages production secret으로 등록해야 로그인 활성화가 가능하다.

**6. 반영 필요 사항 (중요)**
- Cloudflare Wrangler 인증 성공과 Google OAuth 앱 secret 등록은 별개로 판단한다.
- OAuth 로그인 장애 점검 시 `whoami` 성공 후에도 반드시 `wrangler pages secret list` 및 production `/api/auth/google/start` 응답을 확인한다.
- `refresheetkr.com`은 `refresheet-prj`의 최신 API 라우터를 사용하고, `refresheet.com`은 글로벌 프로젝트 배포 상태를 별도 확인해야 한다.
