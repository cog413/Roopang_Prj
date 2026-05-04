# Handoff Temporary Context

## 1. Current Status
- Date/time: 2026-05-04 15:57:44 +09:00
- Branch: `sub`
- Git status before this file: clean on `sub...origin/sub`
- Repository path: `C:\Users\user\.gemini\antigravity\scratch\Refresheet_Prj`
- Encoding note: keep this file ASCII-friendly where possible so future agents can read it reliably in PowerShell.

## 2. Latest User Request
The user wants a persistent temporary handoff file for future LLM continuity.

Core requirement:
- At the start of work, the next LLM must look for and read a handoff file.
- At the end of work, the LLM must delete the previous handoff file and create a fresh `HANDOFF_TMP.md`.
- The handoff file must include the handoff rules themselves, so another LLM can continue even if context is lost.
- The file should summarize recent changes, current repo status, remaining work, verification, and recommended next steps.

## 3. Completed Work
- Created `HANDOFF_TMP.md`.
- Added a reusable handoff protocol inside the file.
- Recorded the latest repo state and user intent.
- Rewrote the handoff in ASCII-friendly English to avoid Korean mojibake in Windows PowerShell.

## 4. Modified Files
- `HANDOFF_TMP.md`

## 5. Remaining Work
- Commit and push this handoff file if the user wants the protocol preserved in Git.
- If applying to both branches, add the same file to `main` and `sub`.

## 6. Important Decisions / Constraints
- Never revert user changes unless explicitly asked.
- Actual file state and `git status` take priority over this handoff text.
- Always run `git status --short --branch` before editing.
- Before finishing a task, remove any existing handoff file and create a new `HANDOFF_TMP.md` with current information.
- Treat these names as possible existing handoff files:
  - `HANDOFF_TMP.md`
  - `.handoff_tmp.md`
  - `tmp_handoff.md`
- This file is intentionally temporary in content, but the user wants the protocol to persist across context loss.

## 7. Verification
Commands already run:
- `git status --short --branch`
  - Result before creating this file: `## sub...origin/sub`
- `Get-ChildItem -Force -Filter '*handoff*'`
  - Result before creating this file: no handoff files existed.
- `git diff --check`
  - Result after creating this file: no whitespace errors.

Not yet verified:
- Final `git status` after this rewrite.
- Commit/push status for this handoff file.

## 8. Recommended Next Step
- Run `git status --short --branch`.
- If the user asked to "reflect/apply" this process permanently, commit this file.
- If needed on both branches, push to current branch, then cherry-pick or recreate the commit on the other branch.

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
