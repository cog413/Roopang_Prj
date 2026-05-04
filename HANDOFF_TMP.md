# Handoff Temporary Context

## 1. Current Status
- Date/time: 2026-05-04 16:35:45 +09:00
- Branch: `sub`
- Git status before this handoff refresh:
  - `docs/MiniGgotchi_PRD.md` modified
  - `docs/MiniGgotchi_schema.sql` modified
  - `docs/MiniGgotchi_data_access_policy.md` untracked
  - `docs/migrations/001_user_content_history.sql` untracked
- Repository path: `C:\Users\user\.gemini\antigravity\scratch\Refresheet_Prj`
- Encoding note: keep this file ASCII-friendly where possible so future agents can read it reliably in PowerShell.

## 2. Latest User Request
The user noted that, based on the created DB tables:

- Character conversation type mapping should be managed in DB and called from the app, not hardcoded in JavaScript.
- Sudoku problem bank should also be managed in DB and fetched from the app.
- For problem-bank selection, puzzles already solved/played by a user should be deprioritized.

## 3. Completed Work
- Read existing `HANDOFF_TMP.md` before work.
- Added `docs/MiniGgotchi_data_access_policy.md`.
  - Defines DB-owned content vs frontend-owned rendering.
  - Documents scenario node/button runtime flow.
  - Documents Sudoku puzzle selection policy.
  - Documents temporary baseline query using `game_results.metadata_json`.
  - Documents recommended production query using `user_content_history`.
  - Defines recommended API endpoints through a server/API layer such as Cloudflare Workers.
- Added proposed migration `docs/migrations/001_user_content_history.sql`.
  - Adds `user_content_history` for prioritizing unplayed/less-recently-used reusable content.
  - Status is proposed/not yet applied.
- Updated `docs/MiniGgotchi_PRD.md`.
  - Added DB-managed content policy.
  - Added puzzle/prompt reuse priority policy.
  - Linked to data access policy and migration.
- Updated `docs/MiniGgotchi_schema.sql`.
  - Preserved applied Cloudflare baseline schema as-is.
  - Added migration 001 as a future candidate, not applied.
- Refreshed this handoff file.

## 4. Modified Files
- `docs/MiniGgotchi_PRD.md`
- `docs/MiniGgotchi_schema.sql`
- `docs/MiniGgotchi_data_access_policy.md`
- `docs/migrations/001_user_content_history.sql`
- `HANDOFF_TMP.md`

## 5. Remaining Work
- Commit and push these docs/migration-policy changes to `sub`.
- Cherry-pick the same commit to `main` and push `main` if keeping both branches aligned.
- Future implementation work:
  - Add Cloudflare Worker/API layer.
  - Replace hardcoded `src/pet/petEngine.js` scenario mapping with API calls to `scenario_nodes` and `scenario_buttons`.
  - Replace hardcoded Sudoku puzzle in `src/games/sudoku/sudoku.js` with API call to `sudoku_puzzles`.
  - Apply `docs/migrations/001_user_content_history.sql` to Cloudflare DB before relying on production priority query.

## 6. Important Decisions / Constraints
- Never revert user changes unless explicitly asked.
- Actual file state and `git status` take priority over this handoff text.
- Always run `git status --short --branch` before editing.
- Before finishing a task, remove any existing handoff file and create a new `HANDOFF_TMP.md` with current information.
- The applied DB schema must match what exists in Cloudflare. Do not modify `docs/MiniGgotchi_schema.sql` as if a migration is applied unless it has actually been applied.
- Cloudflare DB ID: `5c560a75-93a5-4414-88fc-0bd8e9ff4e26`.
- Frontend should not directly connect to Cloudflare DB. Use an API layer such as Cloudflare Workers.
- JS may render/cache current state, but DB/API should be the source of truth for scenario branching, puzzle/prompt selection, rewards, and point balances.

## 7. Verification
Commands run:
- `git status --short --branch`
  - Result before handoff refresh: modified PRD/schema and untracked data-access/migration docs.
- `git diff --check`
  - Result before handoff refresh: no whitespace errors, only CRLF warnings.
- `Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"`
  - Result: `2026-05-04 16:35:45 +09:00`

Not yet verified:
- Final `git status` after handoff refresh.
- Commit/push status for these changes.

## 8. Recommended Next Step
- Run `git status --short --branch`.
- Run `git diff --check`.
- Commit:
  - `docs/MiniGgotchi_PRD.md`
  - `docs/MiniGgotchi_schema.sql`
  - `docs/MiniGgotchi_data_access_policy.md`
  - `docs/migrations/001_user_content_history.sql`
  - `HANDOFF_TMP.md`
- Push to `sub`.
- Cherry-pick to `main` and push `main`.

## 9. Handoff Rule For Next LLM

Follow this protocol exactly:

```text
You are a coding/documentation agent continuing work from a previous LLM.

Core principles:
1. Before starting work, search the current folder for a temporary handoff file.
2. Candidate handoff filenames:
   - HANDOFF_TMP.md
   - .handoff_tmp.md
   - tmp_handoff.md
3. If a handoff file exists, read it first and use it as the starting context.
4. If no handoff file exists, inspect the current repo/file state directly and start from there.
5. If the handoff content conflicts with the actual file state, trust the actual file state.
6. Do not revert user changes unless explicitly asked.

Start-of-work procedure:
1. Run `git status --short --branch`.
2. Read any existing handoff file.
3. Compare the handoff with actual repo state.
4. Follow the user's latest request.
5. Preserve unrelated user work.

End-of-work procedure:
1. Delete any existing handoff file.
2. Create a fresh `HANDOFF_TMP.md`.
3. The new file must include:
   - Current date/time
   - Current branch
   - Git status summary
   - Latest user request
   - Completed work
   - Modified files
   - Remaining work
   - Important decisions/constraints
   - Verification commands and results
   - Recommended next step
   - This full handoff rule

Required `HANDOFF_TMP.md` structure:

# Handoff Temporary Context

## 1. Current Status
- Date/time:
- Branch:
- Git status:
- Workspace notes:

## 2. Latest User Request
Summary:

## 3. Completed Work
-

## 4. Modified Files
-

## 5. Remaining Work
-

## 6. Important Decisions / Constraints
- Never revert user changes unless explicitly asked.
- Actual file state takes priority over handoff text.
- Run `git status --short --branch` before work.
- Before ending work, delete the old handoff and create a fresh `HANDOFF_TMP.md`.

## 7. Verification
Verified:
-

Not verified:
-

## 8. Recommended Next Step
-

## 9. Handoff Rule For Next LLM
The next LLM must read this file first.
When finished, it must delete this file and create a fresh `HANDOFF_TMP.md` with updated context and this same rule.
```
