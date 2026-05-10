# Agent Guidelines — Refresheet / SneakTime

For all AI agents: Claude, GPT, Gemini, Codex, or any future model.
Read this before writing any code. It is short on purpose.

---

## 1. Project Philosophy

*A bored office worker's screen, secretly alive.*

- Preserve the Excel disguise: row numbers, column headers, ribbon menus, cell grid
- Character movement is slow, cute, emotionally resonant — not efficient or gamified
- Minimal DOM/CSS footprint — no abstractions without a concrete reason
- Delight through subtlety — the character should feel like it wandered in

When in doubt, do less.

---

## 2. Before Starting Work

1. Read `HANDOFF.md` — architecture, constraints, asset rules
2. Read `chat_log.md` — what was tried, what failed, why decisions were made
3. Run `git log --oneline -10` — other agents may have committed since your last session
4. Read the actual file you plan to modify — never guess its current state

A rewrite that ignores history re-introduces already-solved bugs.

---

## 3. Simplicity First

- Three similar lines is better than a premature abstraction
- Do not add options or modes unless the task requires them
- Do not refactor surrounding code while fixing a bug
- Do not add error handling for impossible cases
- Do not create helpers unless logic is shared across three or more call sites

---

## 4. Surgical Changes

Make the smallest change that solves the problem.

- One thing at a time
- Do not touch unrelated CSS or variable names while fixing a bug
- Do not rename identifiers other agents established — they appear in `chat_log.md`
- Commit messages explain **why**, not what — the diff shows what
- Restructuring goes in a separate commit from a bug fix

---

## 5. Goal-Driven Execution

Do exactly what the user asked. Not more.

- "Fix terrain bug" ≠ "refactor movement system"
- "Add speech bubble" ≠ "redesign nameplate"
- If ambiguous, implement the minimal interpretation and report what you did
- If you think the approach is wrong, say so before coding

When done: state what changed and what is still pending. Two sentences.

---

## 6. Asset Rules

Sprite assets are pixel art. Treat them as permanent.
**Full rules are in `HANDOFF.md` § Sprite Assets.**

Key constraints to memorize:
- `manually_command/export/` is read-only
- `renderWidth` must be an integer downscale of `frameWidth` (64→32 ✓, 64→25 ✗)
- Current sprite B-plan keeps background coordinates in source-image units and uses CSS `transform: scale(0.5)` on `.pattie-sprite-base`; do not apply a second 0.5 scale in JS

---

## 7. Animation Philosophy

The character should feel alive, not mechanical.

- Walk: slow and deliberate — movement and leg frames must stay in sync
- Jump: small arc (~25px), adjacent bars only — no column skipping
- Sleep: horizontal pose, not a standing character squished
- Surface coords: chart-local space (not viewport) — survives page scroll
- Do not sacrifice game-feel for cleaner code

---

## 8. Documentation Discipline

After modifying files:

1. Append a summary to `chat_log.md` (see its header for format)
2. If architecture changed, update `HANDOFF.md`
3. Document failed attempts — they are as valuable as successes

Canonical files:
- `HANDOFF.md` — architecture and constraints (edit in place)
- `chat_log.md` — session history (append only, never overwrite)
- `AGENT_GUIDELINES.md` — this file (edit only when philosophy changes)

---

## 9. Multi-Agent Coordination

Multiple agents work on this repo. You are not the only one.

**During work:**
- Read another agent's code before overwriting it
- Do not silently change architecture — update `HANDOFF.md`
- Keep zone/terrain/surface naming consistent across agents
- Unknown code you didn't write → ask before changing

**After work:**
- Append to `chat_log.md`, including partial or failed work
- If you changed `HANDOFF.md` or a manifest, note it in the log entry
- Do not delete files another agent created without user confirmation

**Conflict resolution (sub branch):**
- `git checkout --theirs <file>` only when main is clearly canonical
- Unexpected state → investigate before overwriting

**Emotional continuity:**
Do not "optimize" the character's movement in ways that change its personality.
Do not "simplify" the terrain system in ways that remove bar-to-bar charm.
When in doubt, do less and surface the decision to the user.
