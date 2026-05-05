# MiniGgotchi Product Requirements Document

Version: v0.4  
Updated: 2026-05-05

## 1. Product Overview

### 1.1 Product Name

MiniGgotchi (미니고찌)

### 1.2 Motto / Vision

"짧게 플레이하고, 꾸준히 성장한다"

MiniGgotchi combines short daily mini-games, pet growth, and lightweight competition. The product is designed for repeatable low-friction sessions, fair skill-based rewards, and a sustainable long-term point economy.

### 1.3 Product Goals

| Goal | Description |
| --- | --- |
| Retention | Encourage daily return through limited play, pet care, ranking, and progression. |
| Fairness | Normalize all game outcomes to a common 0-1 performance scale. |
| Economy Health | Balance point earning and spending to avoid inflation. |
| Competition | Support personal, game-specific, and company-tag rankings. |
| Expansion | Prepare systems for PvP, company competitions, events, and monetization. |
| Globalization | KR version ships first; all systems must be designed for locale-swappable global reuse. |
| Monetization | Google AdSense (display) + direct payment for cosmetics/convenience items. |

### 1.4 Core Gameplay Loop

```text
Mini-game play -> Performance normalization -> Reward calculation -> Point earning
-> Pet feeding/growth/customization -> Ranking updates -> Return next day
```

Players complete short mini-games, receive points based on difficulty and performance, spend points on pet survival/growth/customization, and compete through rankings.

## 2. Core Game Systems

### 2.1 Game Types

| Game | Result Type | Primary Skill Signal | Notes |
| --- | --- | --- | --- |
| Sudoku | Clear/time/accuracy | Puzzle solving efficiency | Player selects difficulty. |
| 2048 | Score-based | Tile score and survival efficiency | Difficulty can affect board modifiers or target thresholds. |
| Typing | Speed/accuracy | WPM and accuracy | Rewards must avoid speed-only abuse by requiring accuracy. |

### 2.2 Difficulty System

Each game exposes a difficulty multiplier used in reward calculation.

| Difficulty | Multiplier | Policy |
| --- | ---: | --- |
| Easy | 0.8 | Low pressure, limited daily count to prevent farming. |
| Normal | 1.0 | Default baseline. |
| Hard | 1.25 | Higher reward for higher challenge. |
| Expert | 1.5 | Optional high-risk/high-skill tier, subject to cap rules. |

Difficulty must represent real challenge, not only reward labeling. Game-specific implementations can vary, but reward output must remain aligned across games.

### 2.3 Performance System

All games convert raw outcomes into a normalized performance score from `0.0` to `1.0`.

| Score Range | Meaning |
| --- | --- |
| 0.0-0.3 | Failed or very weak performance. |
| 0.3-0.6 | Partial completion or below-average performance. |
| 0.6-0.85 | Solid completion. |
| 0.85-1.0 | Excellent performance. |

Game-specific normalization examples:

| Game | Normalization Inputs | Example Approach |
| --- | --- | --- |
| Sudoku | Completion, mistakes, time | Completion ratio with time bonus and mistake penalty. |
| 2048 | Final score, max tile, move efficiency | Log-scaled score against target range. |
| Typing | WPM, accuracy, completion | Weighted score: accuracy gate plus speed normalization. |

Performance normalization requirements:

- Output must always be clamped to `0 <= performance <= 1`.
- Raw score distributions should be monitored and periodically recalibrated.
- Games with different raw score scales must produce comparable reward ranges.
- Accuracy or completion gates should prevent low-quality farming.

## 3. Reward & Economy System

### 3.1 Reward Formula

Base reward formula:

```text
reward = baseReward * difficultyMultiplier * performance
```

Default production range:

```text
30pt <= finalReward <= 150pt
```

Recommended baseline:

```text
baseReward = 100pt
finalReward = clamp(round(baseReward * difficultyMultiplier * performance), 30, 150)
```

No reward should be issued for invalid, abandoned, automated, or anti-abuse-flagged sessions.

### 3.2 Reward Range Normalization

Cross-game reward balancing is mandatory. Sudoku, 2048, and Typing may use different raw metrics, but after normalization their expected reward ranges should align.

| Policy | Requirement |
| --- | --- |
| Same effort, similar reward | Comparable skill and time investment should produce similar points across games. |
| Range alignment | Most valid sessions should land within 30-150pt before daily cap enforcement. |
| Distribution monitoring | Track average reward by game/difficulty/performance bucket. |
| Rebalancing | Adjust game normalization thresholds, not the global economy formula, when one game overpays. |

### 3.3 Point Economy Structure

Points are earned through mini-game play and spent on pet survival, growth, cosmetic expression, competition, and convenience.

| Economy Side | System | Description |
| --- | --- | --- |
| Earn | Game rewards | Points from valid sessions using difficulty and performance. |
| Spend | Feeding | Required to maintain pet hunger/survival. |
| Spend | Growth buffs | Temporary or permanent growth accelerators. |
| Spend | Skins | Cosmetic pet customization. |
| Spend | Random boxes | Optional chance-based cosmetic/reward sink. |
| Spend | Events | Entry fees or contribution mechanics for competitions. |
| Spend | Convenience | Time reduction, recovery, or minor quality-of-life boosts. |

### 3.4 Economy Balance Principles

- A player should maintain basic pet feeding through roughly 2-3 valid plays per day.
- Additional play should primarily support accumulation, cosmetics, event participation, and growth acceleration.
- Daily caps prevent inflation and preserve long-term progression.
- Required survival costs must not feel punitive for casual daily users.
- Cosmetic and event sinks should absorb surplus points from highly active users.
- Paid monetization must not break competitive fairness.

## 4. Pet System

### 4.0 Character Types

Three character types are planned at launch (KR v1). Each has a distinct visual identity, idle animation, and reaction animation set.

| Type | Identity | Visual Concept | Status |
|------|----------|----------------|--------|
| A | 직장인 A (정장) | Blue body, red tie, sharp eyes | CSS sprite (basic) |
| B | 직장인 B (캐주얼) | Green rounded body, glasses | CSS sprite (basic) |
| C | 직장인 C (막내) | To be designed | Planned |

Animation requirements per character:
- **Idle**: subtle wiggle / breathing loop
- **Walking**: foot step alternation (already partial)
- **Reaction - 기쁨**: jump or spin
- **Reaction - 슬픔**: droop / shrink
- **Reaction - 배고픔**: shake left-right
- **Reaction - 응원**: arms up motion (CSS keyframe)
- **Strain (낑낑)**: already implemented for all types

All animations must be CSS keyframe only — no canvas, no external library. Character type is stored in `avatars.character_type` and must drive both the 관리시트 sprite and the 미니미 setup modal preview identically.

### 4.1 Growth Mechanics

The pet is the emotional and progression anchor of MiniGgotchi.

| Growth Input | Effect |
| --- | --- |
| Feeding | Maintains survival and basic happiness. |
| Consistent daily care | Increases attachment and progression streaks. |
| Growth items/buffs | Accelerate growth or unlock special states. |
| Milestones | Unlock skins, animations, titles, or profile badges. |

Growth should be gradual, visible, and tied to repeated engagement rather than single-session grinding.

### 4.2 Hunger System

| Rule | Requirement |
| --- | --- |
| Baseline sustain | 2-3 normal valid games should provide enough points for daily feeding. |
| Hunger decay | Hunger decreases over time, preferably daily rather than hourly. |
| Penalty | Low hunger reduces happiness/growth, but should not permanently punish casual users. |
| Recovery | Feeding restores hunger and may restore happiness over time. |

### 4.3 Interaction Loop

```text
Play games -> Earn points -> Feed pet -> Improve pet state
-> Spend surplus on growth/customization -> Show progress -> Return tomorrow
```

Core interactions:

- Feed pet.
- Check hunger/happiness/growth stage.
- Equip skins.
- Use growth buffs.
- Receive pet reactions after play, feeding, streaks, and ranking milestones.

## 5. Ranking & Competition

### 5.0 Ranking Terminology (KR Version)

All ranking UI must use office-worker disguise terminology. Do not use gaming vocabulary.

| System Concept | KR Display Label | Reset Cycle |
|---|---|---|
| Daily personal ranking | 오늘의 실적 | Daily 00:00 KST |
| Weekly personal ranking | 주간 성과 리포트 | Monday 00:00 KST |
| Monthly personal ranking | 이달의 사원 | 1st of month 00:00 KST |
| Company ranking | 매출 순위 / 부서 실적 현황 | Weekly (Monday reset) |
| Personal best record | 개인 최고 실적 | All-time, no reset |

The reset cycle and cutoff policy must be documented in the app UI (ReadMe 시트 또는 별도 정책 탭).

### 5.1 Personal Ranking

Personal ranking tracks a player's own progress over time.

| Ranking Type | KR Label | Description |
| --- | --- | --- |
| Daily best | 오늘의 실적 | Best performance by game per day. |
| Weekly progress | 주간 성과 리포트 | Weekly points, growth, or streak performance. |
| Monthly best | 이달의 사원 | Top performer of the month by cumulative score. |
| Personal records | 개인 최고 실적 | Best Sudoku clear, best 2048 score, best Typing result. |

### 5.2 Game Ranking

Game rankings compare players within each mini-game.

| Game | KR Label | Ranking Metric |
| --- | --- | --- |
| Sudoku | SDK 데이터 분석 실적 | Difficulty-adjusted clear performance. |
| 2048 | 자산 운용 수익률 | Normalized score or max tile performance. |
| Typing | 보고서 작성 속도 | Accuracy-gated speed performance. |

Ranking scores should use normalized performance and difficulty to avoid over-rewarding naturally high-score games.

### 5.3 Company-Based Ranking

Company-based ranking uses user-generated company tags rather than normalized verified company entities.

| Rule | Description |
| --- | --- |
| Tag-based grouping | Users join rankings through selected company tags. |
| Minimum population | A company tag requires at least 5 users before ranking inclusion. |
| Non-normalized identity | Similar tags can coexist unless moderation or suggestion flows guide consolidation. |
| Abuse handling | Hidden or flagged tags are excluded from public ranking. |

## 6. Company Tag System

### 6.1 Tag Creation

Company tags are user-generated and intentionally non-normalized. The system does not require official verification at launch.

| Rule | Requirement |
| --- | --- |
| Length | 2-30 characters. |
| Daily creation limit | Maximum 3 new tags per user per day. |
| Ownership | Tags are community-created, not owned by a single user. |
| Sorting | Autocomplete sorts by user count and relevance. |

### 6.2 Similarity Suggestion

When a user creates or searches for a tag, the system suggests similar existing tags.

Suggestion signals:

- Exact or partial text match.
- Case/spacing/punctuation similarity.
- Korean/English alias similarity where available.
- User count popularity.
- Recent active usage.

The user may still create a distinct valid tag unless it violates abuse rules.

### 6.3 Abuse Prevention

| Abuse Vector | Prevention |
| --- | --- |
| Tag spam | 3 creations per user per day. |
| Offensive tags | Report and moderation queue. |
| Impersonation | Similarity suggestion and reporting. |
| Ranking manipulation | Minimum 5 users before ranking eligibility. |
| Low-quality duplicates | Autocomplete nudges users toward existing tags. |

Reported tags:

- Tags with 3 or more valid reports are hidden pending review.
- Hidden tags are excluded from autocomplete priority and public rankings.
- Moderators can restore, rename, merge, or remove tags in later admin tooling.

### 6.4 Ranking Inclusion Rules

A company tag appears in public company ranking only when:

- The tag has at least 5 participating users.
- The tag is not hidden, blocked, or under severe moderation restriction.
- The ranking period has enough valid game activity to avoid empty leaderboards.

## 7. Anti-Abuse & Limits

### 7.1 Daily Play Limits

| Limit | Value |
| --- | ---: |
| Total rewarded plays per day | 10 |
| Easy difficulty rewarded plays per day | 5 |
| Daily point cap | 500pt |

Players may optionally continue playing after limits, but post-limit sessions should not grant standard points or ranking advantages unless used for special unranked modes.

### 7.2 Difficulty Abuse Prevention

- Easy difficulty has a separate daily rewarded cap.
- Difficulty multipliers must match actual challenge.
- Repeated low-effort clears should be monitored for farming.
- Expert/Hard rewards remain subject to daily point cap.
- Difficulty changes should be logged for abuse analysis.

### 7.3 Point Caps

Point caps apply after reward calculation.

```text
dailyEarnedPoints = min(sum(validRewards), 500pt)
```

If a reward would exceed the cap, grant only the remaining cap amount or mark the session as non-rewarded after cap reached.

### 7.4 Tag Spam Prevention

- Maximum 3 tag creations per user per day.
- Minimum 2 and maximum 30 characters.
- Duplicate or near-duplicate suggestions appear before creation.
- Tags with 3 or more valid reports are hidden.
- Hidden tags do not qualify for ranking.

### 7.5 Session Validity

A rewarded session must include:

- Valid game start and end events.
- Reasonable duration for the selected game/difficulty.
- Non-zero meaningful interaction.
- Performance score within expected bounds.
- No automation, tampering, or duplicate submission flags.

## 8. Data & Analytics

### 8.1 Current Database Baseline

The current MiniGgotchi database has been created on Cloudflare.

| Item | Value |
| --- | --- |
| Provider | Cloudflare database |
| Database ID | `5c560a75-93a5-4414-88fc-0bd8e9ff4e26` |
| Applied schema file | `docs/MiniGgotchi_schema.sql` |
| Status | Baseline tables created by user-provided SQL |

The baseline schema covers users, profiles, pets, game results, point wallets, point ledger, Sudoku puzzles, typing prompts, scenario nodes/buttons, company tags, user-company tag mapping, and event logs.

Implementation note: the applied schema is intentionally documented as-is. Additional constraints, indexes, hidden/report fields for company tags, and stricter foreign keys should be handled as explicit future migrations rather than silently changing the baseline schema document.

### 8.2 DB-Managed Content Policy

Gameplay content should be loaded from the database through an API layer, not hardcoded in JavaScript.

| Content | Source of Truth | Client Responsibility |
| --- | --- | --- |
| Pet conversation messages | `scenario_nodes` | Render active message. |
| Pet conversation buttons | `scenario_buttons` | Render available choices and send selected button ID. |
| Sudoku puzzle bank | `sudoku_puzzles` | Render puzzle returned by API. |
| Typing prompt bank | `typing_prompts` | Render prompt returned by API. |
| Game rewards/history | `game_results`, `point_ledger`, `point_wallets` | Submit result and render returned reward state. |

The frontend may cache the current response for rendering, but it must not be the source of truth for scenario branching, puzzle selection, prompt selection, rewards, or point balance.

Detailed runtime and query policy is documented in `docs/MiniGgotchi_data_access_policy.md`.

### 8.3 Puzzle/Prompt Reuse Priority

Problem-bank content must account for each user's prior exposure.

Required Sudoku selection priority:

1. Puzzles the user has never attempted.
2. Puzzles attempted but not solved.
3. Puzzles solved fewer times.
4. Puzzles least recently played.
5. Random tie-breaker within the same priority bucket.

The current baseline schema can temporarily store `puzzle_id` in `game_results.metadata_json`, but production selection should use a dedicated content-history table for reliable filtering and ranking.

Recommended migration:

- `docs/migrations/001_user_content_history.sql`

This migration adds `user_content_history`, which supports Sudoku puzzles, typing prompts, and future reusable content types.

### 8.4 Logging Structure

Core events:

| Event | Key Fields |
| --- | --- |
| `game_start` | userId, gameType, difficulty, timestamp, sessionId |
| `game_end` | sessionId, rawScore, completion, mistakes, duration, performance |
| `reward_granted` | sessionId, baseReward, difficultyMultiplier, performance, reward, capApplied |
| `pet_fed` | userId, petId, cost, hungerBefore, hungerAfter |
| `pet_growth_updated` | userId, petId, growthStage, growthDelta, source |
| `point_spent` | userId, sinkType, amount, itemId |
| `tag_created` | userId, tagText, normalizedSearchKey, timestamp |
| `tag_selected` | userId, tagId, source |
| `tag_reported` | reporterId, tagId, reason |
| `ranking_updated` | userId, rankingType, score, period |

### 8.5 Performance Tracking

Track performance by:

- Game type.
- Difficulty.
- Raw score distribution.
- Normalized performance distribution.
- Reward distribution.
- Session duration.
- Completion and abandonment rate.

### 8.6 Optimization Hooks

Use analytics to tune:

- Game-specific normalization thresholds.
- Difficulty multipliers.
- Feeding costs.
- Growth pacing.
- Point sink pricing.
- Daily caps and easy-mode limits.
- Tag suggestion quality.
- Ranking eligibility thresholds.

## 9. Future Expansion

### 9.1 PvP

Potential PvP formats:

- Async score challenge.
- Same-seed Sudoku race.
- Typing duel.
- 2048 weekly challenge board.

PvP rewards must be constrained by the same economy and anti-abuse principles.

### 9.2 Company Competitions

Company tags can support lightweight competitions once tag quality and ranking fairness stabilize.

Examples:

- Weekly company average performance.
- Company participation rate.
- Company-vs-company events.
- Seasonal company trophies.

### 9.3 Events

Event types:

- Seasonal skins.
- Limited-time point sinks.
- Bonus missions.
- Streak events.
- Company ranking events.

Events should avoid uncapped point injection. Prefer cosmetics, badges, titles, or capped bonus rewards.

### 9.4 Monetization Opportunities

Potential monetization:

- Cosmetic skins.
- Pet room themes.
- Convenience items with non-competitive effects.
- Event passes focused on cosmetics and missions.
- Random boxes limited to cosmetic or non-ranking-impacting items.

Monetization must not create pay-to-win ranking advantages.

### 9.5 Global Version

A separate global version is planned after KR v1 stabilizes. Requirements:

- All Korean UI text must be externalizable to a locale config object (not necessarily a full i18n lib at first).
- Office-worker disguise concept transfers globally, but specific terminology ("팀장님", "사원증") must be locale-swappable.
- Fake dashboard content (company names, figures, department titles) should be data-driven, not hardcoded in HTML.
- Pet system, game logic, point economy, and ranking logic are locale-neutral and can be shared as-is.
- Company tag system must support non-Korean characters from day one (UTF-8 normalized).
- The KR and global versions may share the same codebase with a locale flag, or be deployed as separate Pages projects — to be decided at v1 stabilization.

## 10. Mobile Platform

### 10.1 Mobile Web Requirements

The app must be usable on mobile browsers (Chrome/Safari on iOS and Android). It does not need to be a native app.

| Area | Requirement |
|---|---|
| Layout | Responsive breakpoint at 768px. Excel shell collapses or adapts gracefully. |
| Readability | Font sizes, KPI cards, ReadMe text must remain legible on small screens. |
| Game - 2048 | Swipe gesture (touchstart/touchend delta) replaces arrow keys on mobile. |
| Game - Sudoku | Tap-to-select cell, on-screen number pad replaces keyboard input. |
| Pet interaction | Buttons must be tappable (min 44×44px touch target). |
| Tab navigation | Sheet tabs must be horizontally scrollable and tappable. |

### 10.2 Mobile Non-Goals (v1)

- Native app packaging (PWA install prompt acceptable but not required).
- Landscape-only layouts.
- Device-specific gestures beyond basic swipe/tap.

## 11. Referral Marketing System

### 11.1 Referral Flow

Goal: viral acquisition where users invite colleagues. Referrer earns bonus points when referree completes onboarding and first valid game.

| Step | Description |
|---|---|
| Invite link | Referrer shares a URL with their user ID encoded: `?ref=<userId>` |
| Onboarding survey | During onboarding (or on login page), ask "누구의 추천을 받고 오셨나요?" with email input field. |
| Attribution | Store referrer ID at signup. Grant bonus points after referree completes first valid session. |
| Referrer reward | +50pt per successful referral (subject to anti-abuse cap: max 10 referrals per month). |
| Referree reward | +30pt first-session bonus if referred. |

### 11.2 Structural Requirements (Pre-Implementation)

Even before the referral reward logic is built, the following must be in place:

- Onboarding step (or login page) includes an optional survey field: email input for referrer.
- `users` table or a new `referrals` table must store `referrer_user_id` and `referral_status`.
- The `?ref=` query param must be preserved through the OAuth redirect flow (pass via `state` param or `return_to`).

### 11.3 Anti-Abuse

- Self-referral is blocked (referrer ID cannot match the new user's own account).
- Referral bonus is only granted after first valid (non-abandoned) game session.
- Maximum 10 rewarded referrals per user per month.

## 12. Monetization Details

### 12.1 Google AdSense

Goal: display ads for unauthenticated or free-tier users.

- Apply for AdSense review when the app has meaningful traffic.
- Policy compliance notes (from AdSense guidelines — informational only, do not restrict features for this):
  - Content must be original, provide user value, and not be primarily ad-serving.
  - Ads must not be placed in a way that invites accidental clicks (e.g., next to game controls).
  - The Excel disguise concept is acceptable as creative content; it does not violate content policies on its own.
- Placement target: `Data_Visual_Widget` area (currently "AD AREA") — already positioned in DOM.
- Do not modify core features to pass AdSense review. Address compliance only if/when review is rejected.

### 12.2 Direct Payment (Cosmetics / Convenience)

Paid items are strictly non-competitive. They must not affect ranking scores or point earning rates.

| Category | Examples | Model |
|---|---|---|
| Pet skins | Seasonal outfits, holiday costumes | One-time purchase or point shop |
| Room themes | Office background variations | One-time purchase |
| Convenience | Play-limit skip (1 extra game/day), hunger recovery item | Consumable purchase |
| Event pass | Access to seasonal events and exclusive cosmetics | Subscription or one-time |
| Random boxes | Cosmetic-only drops | Optional, no P2W items |

Payment infrastructure: to be decided (Stripe, Toss Payments for KR, etc.). DB schema needs a `purchases` table and item catalog when this is implemented.
