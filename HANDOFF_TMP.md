# Handoff Temporary Context

## 1. Current Status
- Date/time: 2026-05-04 21:59 (Asia/Seoul)
- Branch: `sub` during cherry-pick of Google OAuth/D1 auth work
- Git status: resolving cherry-pick conflict in `HANDOFF_TMP.md`; `.claude/` remains unrelated and untracked
- Workspace notes: Root policy files are `refresheet.context` and `chat_log.md`; read them before new work.

## 2. Latest User Request
Summary: Implement Google OAuth login persistence in Cloudflare D1 so signup, login, and logout are tracked. Keep users/profile column names aligned with frontend login state. Commit and push to both `main` and `sub`.

## 3. Completed Work
- Added `docs/migrations/002_google_auth.sql` to alter existing `users` and `user_profiles` without dropping data, and to create `auth_events` and `auth_sessions`.
- Added `src/worker/index.js` Cloudflare Worker endpoints:
  - `GET /api/auth/google/start`
  - `GET /api/auth/google/callback`
  - `GET /api/me`
  - `POST /api/auth/logout`
- Worker logic reads Google `sub`, `email`, `name`, `picture`, upserts D1 user/profile, updates `last_login_at`, writes `signup/login/logout` auth events, and creates/revokes sessions.
- Added `src/auth/authState.js` and wired `src/main.js` so frontend login state uses `user_id`, `email`, `nickname`, `avatar_url`, `last_login_at`, `is_new_user`.
- Added `wrangler.toml` with D1 binding `DB` for `db_game_info`.
- Added package scripts for Worker deploy and Google auth migration.
- Updated docs and project policy files.
- `main` has been committed and pushed with commit `f57a90d`.

## 4. Modified Files
- `docs/migrations/002_google_auth.sql`
- `src/worker/index.js`
- `src/auth/authState.js`
- `src/main.js`
- `wrangler.toml`
- `package.json`
- `docs/MiniGgotchi_data_access_policy.md`
- `docs/MiniGgotchi_schema.sql`
- `docs/Refresheet_context.md`
- `refresheet.context`
- `chat_log.md`
- `HANDOFF_TMP.md`

## 5. Remaining Work
- Complete the `sub` cherry-pick and push `sub`.
- Cloudflare API rejected the remote D1 migration with authentication error code 10000. Re-run after fixing Cloudflare token/session:
  `npx.cmd wrangler d1 execute db_game_info --remote --file=./docs/migrations/002_google_auth.sql`
- Set Worker secrets before real OAuth use:
  `GOOGLE_CLIENT_ID`
  `GOOGLE_CLIENT_SECRET`
  optional `GOOGLE_REDIRECT_URI`
- Deploy Worker after secrets are configured:
  `npx.cmd wrangler deploy`
- Add visible login/logout UI if desired; current frontend initializes state but does not add controls.

## 6. Important Decisions / Constraints
- Never revert user changes unless explicitly asked.
- Actual file state takes priority over handoff text.
- Run `git status --short --branch` before work.
- Existing D1 tables must not be dropped; use migration/ALTER approach.
- `users.google_sub` is the primary Google identity key, but email-only existing users are linked instead of duplicated.
- `/api/me` and frontend state fields must remain aligned: `user_id`, `email`, `nickname`, `avatar_url`, `last_login_at`, `is_new_user`.
- Before ending work, delete the old handoff and create a fresh `HANDOFF_TMP.md`.

## 7. Verification
Verified:
- `node --check .\src\worker\index.js`
- `node --check .\src\auth\authState.js`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package ok')"`
- `npx.cmd wrangler --version` returned `4.87.0`

Not verified:
- Remote D1 migration did not apply due to Cloudflare API authentication error code 10000.
- Worker was not deployed because D1 migration/auth setup is blocked and OAuth secrets are not configured in this session.

## 8. Recommended Next Step
- Fix Cloudflare Wrangler authentication/token state, apply `docs/migrations/002_google_auth.sql`, set Google OAuth secrets, deploy Worker, then test first-time login, returning login, `/api/me`, and logout event rows.

## 9. Handoff Rule For Next LLM
The next LLM must read this file first.
When finished, it must delete this file and create a fresh `HANDOFF_TMP.md` with updated context and this same rule.
