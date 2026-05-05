# Refresheet Pattie 관리시트 거주/이동 시스템 기획

## 목표

관리시트는 단순 배경이 아니라 rabbit, dog, cat Pattie가 사는 엑셀 공간이다. Pattie는 표, 셀 경계, 그래프, 막대그래프, 카드 UI를 지형처럼 인식하고 천천히 돌아다닌다.

## 캐릭터 기준

- 기준 이미지: `manually_command/character_image.png`
- 32x32 pixel art 기준
- transparent background PNG
- no anti-aliasing, no blur, no gradient
- bold black outline 유지
- rabbit, dog, cat의 실루엣, 색상, 눈, 표정, 검은 외곽선 스타일 유지
- 테스트 asset은 `public/assets/patties/manifest.json`으로만 참조

## Asset 구조

```text
public/assets/patties/
  manifest.json
  _test/README.md
  rabbit/{idle,walk,sleep,happy,jump,climb}.png
  dog/{idle,walk,sleep,happy,jump,climb}.png
  cat/{idle,walk,sleep,happy,jump,climb}.png
  items/{sunglasses,bee_suit}.png
```

현재 프로젝트는 빌드 없이 루트가 그대로 배포되므로 런타임 URL은 `/public/assets/patties/...`를 사용한다. `PattieAssetLoader`는 public manifest를 우선 사용한다. 추후 D1 API manifest나 R2 URL로 바뀌어도 loader의 인터페이스는 유지한다.

## 관리시트 지형

- `sheetZone`: 왼쪽 표/셀 영역. 기본 walk, idle, jump.
- `chartZone`: 오른쪽 상단 그래프/차트 영역. walk, idle, jump, climb.
- `cardZone`: 오른쪽 하단 카드/상태 영역. walk, idle, jump.
- `blockedZone`: 클릭 UI 방해 영역. 이동 금지.

HTML에는 `data-pattie-zone="sheet|chart|card|blocked"`를 붙인다. 막대그래프는 `data-pattie-terrain="chart-bar"`로 climb 후보가 된다.

## 기본 행동

- frameDurationMs: 500
- sheetZone: walk 65%, idle 25%, jump 5%, sleep 5%
- chartZone: walk 45%, idle 20%, jump 15%, climb 15%, sleep 5%
- cardZone: walk 50%, idle 30%, jump 10%, sleep 10%
- 클릭/케어 액션: happy 우선 발동
- chart bar 근처: climb 중 y 좌표를 JS에서 서서히 상승
- jump: JS에서 y 좌표를 잠깐 올렸다가 원래 platform y로 복귀

## 아이템

초기 예시 아이템:

- `sunglasses`: face cosmetic
- `bee_suit`: outfit cosmetic

아이템은 점수/랭킹에 영향을 주지 않는 꾸미기 전용이다. 사용자가 캐릭터에 장착하면 `avatars.equipped_item_keys`에 JSON 배열로 저장하고, 획득 이력은 `user_pattie_items`로 확장한다.

## 사용자 설정

관리시트 진입 시:

- 로그인하지 않았으면 로그인 안내
- 기존 사용자라도 Pattie 설정 값이 없으면 초기 설정 모달 표시
- 설정 버튼으로 언제든 이름, 캐릭터, 아이템을 변경
- character_key는 `rabbit`, `dog`, `cat`

## DB / R2 확장

- D1에는 이미지 바이너리를 저장하지 않는다.
- D1에는 asset src와 metadata만 저장한다.
- 실제 PNG/sprite sheet는 현재 public asset, 추후 R2로 이동 가능.
- 관련 migration: `docs/migrations/005_pattie_assets_items.sql`
