# 변경 이력 (Changelog)

이 프로젝트의 모든 주요 변경 사항은 이 파일에 기록됩니다.

## [v1.2.0] - 2026-05-02
### 추가됨 (Added)
- 스도쿠 게임 중복 입력(가로/세로/3x3 블록) 검증 로직 구현
- 스도쿠 규칙 위반 시 엑셀의 "데이터 유효성 검사" 경고창을 완벽히 위장한 모달 팝업 추가

### 변경됨 (Changed)
- 기존 Flexbox 위장 장표(실적표 등)를 엑셀 피벗 테이블 스타일(Grid)로 전면 개편하여 픽셀 단위로 셀 격자에 완벽히 동기화되도록 수정

## [v1.1.1] - 2026-05-02
### 수정됨 (Fixed)
- 스도쿠 및 2048 게임 보드가 엑셀의 가짜 배경 그리드 선과 정확히 일치하지 않던 정렬 문제 수정 (padding 및 gap 값 조정)
- 게임 보드 주변(좌/우측)에 결재 대기 문서, 영업 현황 등 더 다양한 눈속임용(위장) 실적 장표 추가 배치

## [v1.1.0] - 2026-05-02
### 추가됨 (Added)
- 우상단 리본 메뉴에 은밀한 다크/라이트 모드 설정 버튼 추가 (JH 아이콘)
- 2048 게임 시트에 '연간 부서 실적 요약' 위장용 데이터 표 및 차트 추가
- 스도쿠 시트에 '프로젝트 Task 진행 현황' 위장용 데이터 표 추가

### 변경됨 (Changed)
- 2048 게임의 실제 점수가 위장용 표의 '총 누적 실적'과 차트에 연동되어 은밀히 반영되도록 수정
- 스도쿠 게임 진행률이 위장용 표의 '해결된 Task 수'에 연동되어 반영되도록 수정
- UI 전반에 걸쳐 CSS Variables를 활용한 다크 테마 지원 추가

## [v1.0.0] - 2026-05-02
### 추가됨 (Added)
- 엑셀 UI 위장 껍데기 구현 (리본 메뉴, 수식 입력줄, 그리드 등)
- 스도쿠 및 2048 게임 기본 로직 구현
- 긴급 전환 키(Esc)를 통한 보스 키(Boss Key) 기능 적용
## [Unreleased] - 2026-05-10
### Changed
- Switched Mong/Corgi runtime assets from temporary generated sheets to production Aseprite sprite sheets copied from `manually_command/export` into `public/assets/corgi/`.
- Updated `PattieAssetLoader` to infer animation frame counts from actual sprite sheet dimensions instead of relying on shared hardcoded frame counts.
- Updated `PattieSprite` frame slicing to account for sprite sheet padding/spacing so 1px-padded Aseprite exports do not bleed adjacent frames.

### Removed
- Removed the temporary generated Mong sprite asset folder and generator flow from runtime asset loading.
