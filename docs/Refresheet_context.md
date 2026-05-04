# Refresheet Context

Updated: 2026-05-04

Refresheet is a browser-based Excel disguise app with hidden game/rest features. The app starts from `index.html`, loads `src/main.js` as an ES module, and uses `style.css` for the Excel shell, game boards, dark mode, and pet UI.

## Current Structure

```text
Refresheet_Prj/
├── index.html
├── style.css
├── package.json
├── CHANGELOG.md
├── docs/
│   └── Refresheet_context.md
└── src/
    ├── main.js
    ├── layout/
    │   └── excelLayout.js
    ├── stealth/
    │   └── bossKey.js
    ├── pet/
    │   ├── miniPet.js
    │   └── petEngine.js
    └── games/
        ├── sudoku/
        │   └── sudoku.js
        └── game2048/
            ├── index.js
            ├── logic.js
            └── ui.js
```

## Active Sheets

- `README`: rest-right declaration screen.
- `관리시트`: formerly `미니미`; contains the single black-and-white dotted pet, fake performance tables, chart, minimap, and conversation buttons.
- `Sheet1`: Sudoku game disguised as Excel work.
- `Sheet2`: 2048 game disguised as Excel work.

The old `My_Pet` sheet has been removed. Its conversation behavior now lives inside `관리시트`.

## Pet System

`src/pet/miniPet.js` owns the visible pet scene:

- Creates one pet only (`mp-sprite-0`, `mp-bubble-0`).
- Uses a black-and-white dotted CSS sprite.
- Moves slowly with small random steps and long intervals.
- Builds fake performance tables, a chart, and a minimap dynamically.

`src/pet/petEngine.js` owns conversation:

- Uses delegated click handling for pet buttons.
- Supports `STRESS`, `MANAGER`, `TIRED`, `HARD`, `ENCOURAGE`, `SECRET`, and `GREETING` scenarios.
- Randomizes responses within each scenario.
- Shows responses in the `관리시트` pet bubble and mirrors the action in the formula bar with `=PET.TALK("TYPE")`.

Current conversation buttons:

- `팀장님이 괴롭혀`
- `팀장님이 힘들게 해`
- `너무 피곤해`
- `너무 힘들어`
- `응원해줘`
- `비밀작전`

## Layout And Navigation

`src/layout/excelLayout.js` generates Excel-like column/row headers, manages tab switching, toggles dark mode, and updates the formula bar.

Formula bar states:

- README: `=DECLARATION("RIGHT_TO_REST")`
- 관리시트: `=MANAGE.PET.STATUS(B2:F22)`
- Sheet1: `=SUDOKU.INIT(A1:I9)`
- Sheet2: `=SUM(A1:D4)*2048`

## Games

Sudoku remains in `src/games/sudoku/sudoku.js` and uses `#sudoku-grid` plus the validation modal for invalid moves.

2048 remains split into:

- `logic.js`: board state and movement rules.
- `ui.js`: rendering and fake score/chart updates.
- `index.js`: module entry point.

## Cleanup Notes

- Removed the separate `My_Pet` sheet and its unused DOM/CSS selectors.
- Removed legacy duplicated mini-pet CSS that was no longer used by the active `mp-*` implementation.
- Restored Sudoku and 2048 sheet bodies so their tabs and initializers still have matching DOM targets.
