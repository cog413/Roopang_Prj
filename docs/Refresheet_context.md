# Refresheet Context

Updated: 2026-05-04

Refresheet is a browser-based Excel disguise app with hidden game/rest features. The app starts from `index.html`, loads `src/main.js` as an ES module, and uses `style.css` for the Excel shell, game boards, dark mode, and pet UI.

Authentication API work lives in `src/worker/index.js`. It is a Cloudflare Worker that handles Google OAuth, D1 user/profile upsert, auth event logging, session cookies, `/api/me`, and logout. The D1 migration for this auth layer is `docs/migrations/002_google_auth.sql`.

## Current Structure

```text
Refresheet_Prj/
?쒋?? index.html
?쒋?? style.css
?쒋?? package.json
?쒋?? CHANGELOG.md
?쒋?? docs/
??  ?붴?? Refresheet_context.md
?붴?? src/
    ?쒋?? main.js
    ?쒋?? layout/
    ??  ?붴?? excelLayout.js
    ?쒋?? stealth/
    ??  ?붴?? bossKey.js
    ?쒋?? pet/
    ??  ?쒋?? miniPet.js
    ??  ?붴?? petEngine.js
    ?붴?? games/
        ?쒋?? sudoku/
        ??  ?붴?? sudoku.js
        ?붴?? game2048/
            ?쒋?? index.js
            ?쒋?? logic.js
            ?붴?? ui.js
```

## Active Sheets

- `README`: rest-right declaration screen.
- `愿由ъ떆??: formerly `誘몃땲誘?; contains the single black-and-white dotted pet, fake performance tables, chart, minimap, and conversation buttons.
- `Sheet1`: Sudoku game disguised as Excel work.
- `Sheet2`: 2048 game disguised as Excel work.

The old `My_Pet` sheet has been removed. Its conversation behavior now lives inside `愿由ъ떆??.

## Pet System

Pattie update:

- The management sheet now has a Pattie world layer over the fake Excel habitat.
- `src/patties/PattieAssetLoader.js` loads `public/assets/patties/manifest.json`.
- Mong/Corgi production sprite sheets load `/public/assets/corgi/manifest.json`.
- Production sprite sheet originals live in `manually_command/export`; they are Aseprite exports with 1px padding and must not be modified.
- `src/patties/PattieSprite.js` renders transparent PNG sprite sheets with `image-rendering: pixelated`, inferred frame counts, and padding-aware frame slicing.
- `src/patties/PattieRoamingController.js` manages walk/idle/sleep/happy/jump/climb behavior and chart-bar climbing.
- `src/patties/pattieWorldConfig.js` defines `sheet`, `chart`, `card`, and `blocked` terrain rules.
- Pattie settings are saved through `/api/pattie`; DB migration is `docs/migrations/005_pattie_assets_items.sql`.

`src/pet/miniPet.js` owns the visible pet scene:

- Creates one pet only (`mp-sprite-0`, `mp-bubble-0`).
- Uses a black-and-white dotted CSS sprite.
- Moves slowly with small random steps and long intervals.
- Builds fake performance tables, a chart, and a minimap dynamically.

`src/pet/petEngine.js` owns conversation:

- Uses delegated click handling for pet buttons.
- Supports `STRESS`, `MANAGER`, `TIRED`, `HARD`, `ENCOURAGE`, `SECRET`, and `GREETING` scenarios.
- Randomizes responses within each scenario.
- Shows responses in the `愿由ъ떆?? pet bubble and mirrors the action in the formula bar with `=PET.TALK("TYPE")`.

Current conversation buttons:

- `??λ떂??愿대∼?`
- `??λ떂???섎뱾寃???
- `?덈Т ?쇨낀??
- `?덈Т ?섎뱾??
- `?묒썝?댁쨾`
- `鍮꾨??묒쟾`

## Layout And Navigation

`src/layout/excelLayout.js` generates Excel-like column/row headers, manages tab switching, toggles dark mode, and updates the formula bar.

Formula bar states:

- README: `=DECLARATION("RIGHT_TO_REST")`
- 愿由ъ떆?? `=MANAGE.PET.STATUS(B2:F22)`
- Sheet1: `=SUDOKU.INIT(A1:I9)`
- Sheet2: `=SUM(A1:D4)*2048`

## Games

Sudoku lives in `src/games/sudoku/sudoku.js` (async `initSudoku()`). On load it fetches `GET /api/games/sudoku/next?difficulty=normal` (Cloudflare Worker, not yet deployed). If the API returns a puzzle, the 81-character `puzzle` and `solution` strings are parsed into 9횞9 arrays. If the API is unavailable a hardcoded offline fallback puzzle is used. Win detection compares the full board to `solutionBoard` when available, otherwise checks that all 81 cells are filled. Invalid moves show the validation modal.

2048 remains split into:

- `logic.js`: board state and movement rules.
- `ui.js`: rendering and fake score/chart updates.
- `index.js`: module entry point.

## Cleanup Notes

- Removed the separate `My_Pet` sheet and its unused DOM/CSS selectors.
- Removed legacy duplicated mini-pet CSS that was no longer used by the active `mp-*` implementation.
- Restored Sudoku and 2048 sheet bodies so their tabs and initializers still have matching DOM targets.
