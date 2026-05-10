# Refresheet Handoff

## Corgi Sprite Assets

- Production sprite sheet originals are in `manually_command/export`.
- The originals are Aseprite sprite sheets with 1px padding and must not be modified.
- Runtime copies are served from `public/assets/corgi/`.
- The active manifest is `public/assets/corgi/manifest.json`.
- Code must adapt to the sprite sheet structure. Do not resize, regenerate, or rename the original images.
- Animation frame counts can differ by animation. The loader infers frame counts from actual image dimensions.
- Frame slicing is padding-aware through `sourcePaddingX`, `sourcePaddingY`, `frameSpacingX`, and `frameSpacingY`.

## Current Sprite Files

- `mong_idle.png`
- `mong_walk..png`
- `mong_run.png`
- `mong_sleep.png`
- `mong_happy.png`
- `mong_jump.png`

`climb` currently aliases to `jump` because no separate climb sheet exists in `manually_command/export`.
