# Stealth Excel Game - 프로젝트 구조 및 코드 내용

본 문서는 `stealth_excel_game` 프로젝트의 전체 디렉토리 구조와 각 파일의 소스 코드를 포함하고 있습니다. AI(제미나이 등)에게 프로젝트의 현재 상태를 파악시키기 위한 컨텍스트(Context) 제공 목적으로 작성되었습니다.

## 📂 디렉토리 구조

```text
stealth_excel_game/
├── CHANGELOG.md    # 버전별 변경 이력
├── index.html      # 엑셀 UI 및 게임 화면을 구성하는 메인 HTML
├── style.css       # 엑셀 스타일 및 게임 UI 테마 (다크모드 포함)
├── main.js         # 엑셀 기본 기능(탭 전환, 보스키, 헤더 등) 제어 스크립트
├── sudoku.js       # 스도쿠 게임 로직 및 엑셀 UI 연동
└── game2048.js     # 2048 게임 로직 및 엑셀 UI 연동
```

---

## 📄 파일 내용

### 1. `CHANGELOG.md`
```markdown
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
```

### 2. `index.html`
```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>업무용 데이터 종합 관리.xlsx - Excel</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="excel-app">
        <!-- 상단 리본 메뉴 -->
        <header class="ribbon">
            <div class="ribbon-top">
                <div class="title-bar">
                    <span class="excel-icon">📗</span>
                    <span class="file-name">업무용 데이터 종합 관리.xlsx - Excel</span>
                </div>
                <div class="window-controls">
                    <div class="theme-toggle" id="theme-toggle" title="계정 설정">JH</div>
                    <span>—</span>
                    <span>□</span>
                    <span>✕</span>
                </div>
            </div>
            <div class="menu-tabs">
                <span class="menu-tab">파일</span>
                <span class="menu-tab active">홈</span>
                <span class="menu-tab">삽입</span>
                <span class="menu-tab">페이지 레이아웃</span>
                <span class="menu-tab">수식</span>
                <span class="menu-tab">데이터</span>
                <span class="menu-tab">검토</span>
                <span class="menu-tab">보기</span>
            </div>
            <div class="toolbar">
                <div class="tool-group">
                    <button class="tool-btn paste-btn">📋 붙여넣기</button>
                    <div class="tool-subgroup">
                        <button class="tool-btn small">✂️ 자르기</button>
                        <button class="tool-btn small">📄 복사</button>
                    </div>
                </div>
                <div class="tool-group font-group">
                    <select class="font-select"><option>맑은 고딕</option></select>
                    <select class="size-select"><option>11</option></select>
                    <div class="font-styles">
                        <button class="tool-btn small bold">가</button>
                        <button class="tool-btn small italic">가</button>
                        <button class="tool-btn small underline">가</button>
                    </div>
                </div>
                <div class="tool-group align-group">
                    <button class="tool-btn small">왼쪽</button>
                    <button class="tool-btn small">가운데</button>
                    <button class="tool-btn small">오른쪽</button>
                </div>
            </div>
        </header>

        <!-- 수식 입력줄 -->
        <div class="formula-bar">
            <div class="name-box" id="current-cell">A1</div>
            <div class="fx-icon">fx</div>
            <input type="text" class="formula-input" id="formula-input" readonly value="">
        </div>

        <!-- 메인 스프레드시트 영역 -->
        <div class="spreadsheet-container">
            <div class="corner-header">◢</div>
            <div class="column-headers" id="col-headers"></div>
            
            <div class="spreadsheet-body">
                <div class="row-headers" id="row-headers"></div>
                
                <div class="grid-content" id="grid-content">
                    <!-- 게임 1: 스도쿠 보드 -->
                    <div id="sudoku-sheet" class="sheet-view active">
                        <div class="sheet-layout">
                            <div class="fake-dashboard side-left">
                                <div class="fake-table">
                                    <div class="fake-table-header">인사 평가 일정</div>
                                    <div class="fake-table-cell label">자기평가 제출</div><div class="fake-table-cell value">10/15</div>
                                    <div class="fake-table-cell label">1차 평가 (팀장)</div><div class="fake-table-cell value">10/25</div>
                                    <div class="fake-table-cell label">2차 평가 (본부)</div><div class="fake-table-cell value">11/05</div>
                                    <div class="fake-table-cell label">최종 결과 통보</div><div class="fake-table-cell value">11/20</div>
                                </div>
                                <div class="fake-table">
                                    <div class="fake-table-header">결재 대기 문서</div>
                                    <div class="fake-table-cell label">소프트웨어 라이선스 구매</div><div class="fake-table-cell value" style="color:red">긴급</div>
                                    <div class="fake-table-cell label">11월 팀 워크샵 기안</div><div class="fake-table-cell value">대기</div>
                                    <div class="fake-table-cell label">신규 입사자 PC 신청</div><div class="fake-table-cell value">진행</div>
                                </div>
                            </div>
                            <div id="sudoku-grid" class="game-grid sudoku"></div>
                            <div class="fake-dashboard side-right">
                                <div class="fake-table">
                                    <div class="fake-table-header">프로젝트 Task 진행 현황</div>
                                    <div class="fake-table-cell label">기획 단계</div><div class="fake-table-cell value">완료 (100%)</div>
                                    <div class="fake-table-cell label">디자인 단계</div><div class="fake-table-cell value">완료 (100%)</div>
                                    <div class="fake-table-cell label">개발 단계</div><div class="fake-table-cell value">진행 중</div>
                                    <div class="fake-table-cell label total">전체 해결된 Task 수</div><div class="fake-table-cell value total" id="sudoku-progress-display">0 / 81</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 게임 2: 2048 보드 -->
                    <div id="game2048-sheet" class="sheet-view" style="display: none;">
                        <div class="sheet-layout">
                            <div class="fake-dashboard side-left">
                                <div class="fake-table">
                                    <div class="fake-table-header">주요 거래처 영업 현황</div>
                                    <div class="fake-table-cell label">(주)알파소프트</div><div class="fake-table-cell value">계약완료</div>
                                    <div class="fake-table-cell label">메타시스템즈</div><div class="fake-table-cell value">검토중</div>
                                    <div class="fake-table-cell label">넥스트로보틱스</div><div class="fake-table-cell value">진행중</div>
                                    <div class="fake-table-cell label">글로벌네트웍스</div><div class="fake-table-cell value">계약보류</div>
                                </div>
                                <div class="fake-table">
                                    <div class="fake-table-header">월별 부서 지출 결의</div>
                                    <div class="fake-table-cell label">사무용품 구매</div><div class="fake-table-cell value">₩1,200,000</div>
                                    <div class="fake-table-cell label">팀 회식비</div><div class="fake-table-cell value">₩450,000</div>
                                    <div class="fake-table-cell label">국내 출장비</div><div class="fake-table-cell value">₩850,000</div>
                                </div>
                            </div>
                            <div id="game2048-grid" class="game-grid g2048"></div>
                            <div class="fake-dashboard side-right">
                                <div class="fake-table">
                                    <div class="fake-table-header">2026년도 부서별 실적 요약</div>
                                    <div class="fake-table-cell label">1분기 매출 (천원)</div><div class="fake-table-cell value">45,210</div>
                                    <div class="fake-table-cell label">2분기 매출 (천원)</div><div class="fake-table-cell value">38,900</div>
                                    <div class="fake-table-cell label">3분기 매출 (천원)</div><div class="fake-table-cell value">51,040</div>
                                    <div class="fake-table-cell label total">총 누적 실적 (목표치 반영)</div><div class="fake-table-cell value total" id="fake-score-display">0</div>
                                </div>
                                <div class="fake-chart">
                                    <div class="chart-title">분기별 달성률 추이</div>
                                    <div class="chart-bars">
                                        <div class="bar-container"><div class="bar" style="height: 60%;"></div><span>1Q</span></div>
                                        <div class="bar-container"><div class="bar" style="height: 45%;"></div><span>2Q</span></div>
                                        <div class="bar-container"><div class="bar" style="height: 75%;"></div><span>3Q</span></div>
                                        <div class="bar-container"><div class="bar" id="fake-score-bar" style="height: 5%;"></div><span>Total</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 더미 데이터 (위장용) -->
                    <div id="dummy-cells" class="dummy-grid"></div>
                </div>
            </div>
        </div>

        <!-- 하단 시트 탭 -->
        <footer class="sheet-tabs">
            <div class="tab-controls">◀ ▶</div>
            <div class="tabs">
                <div class="tab active" data-sheet="sudoku">Sheet1</div>
                <div class="tab" data-sheet="game2048">Sheet2</div>
                <div class="tab add-tab">+</div>
            </div>
            <div class="status-bar">
                <span>준비</span>
                <span class="boss-key-hint" style="margin-left: auto; color: #666; font-size: 11px; margin-right: 20px;">긴급 전환: Esc</span>
                <span class="zoom-slider">- [========|==] + 100%</span>
            </div>
        </footer>
    </div>

    <!-- 엑셀 데이터 유효성 검사 경고창 (모달) -->
    <div id="validation-modal" class="modal-overlay" style="display: none;">
        <div class="excel-modal">
            <div class="modal-header">
                <span>Microsoft Excel</span>
                <span class="modal-close" id="modal-close-btn">✕</span>
            </div>
            <div class="modal-content">
                <div class="modal-icon">🛑</div>
                <div class="modal-text">이 값은 이 셀에 정의된 데이터 유효성 검사 제한에 부합하지 않습니다.</div>
            </div>
            <div class="modal-buttons">
                <button class="modal-btn retry" id="modal-retry-btn">다시 시도(R)</button>
                <button class="modal-btn cancel" id="modal-cancel-btn">취소(C)</button>
                <button class="modal-btn help">도움말(H)</button>
            </div>
        </div>
    </div>

    <!-- 스크립트 로드 -->
    <script src="sudoku.js"></script>
    <script src="game2048.js"></script>
    <script src="main.js"></script>
</body>
</html>
```

### 3. `style.css`
```css
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: 'Segoe UI', Calibri, sans-serif;
    user-select: none; /* Prevent text selection to look more like an app */
}

body {
    background-color: #fff;
    color: #333;
    font-size: 14px;
    overflow: hidden;
}

#excel-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
}

/* Ribbon Menu */
.ribbon {
    background-color: #f3f2f1;
    border-bottom: 1px solid #d2d0ce;
}

.ribbon-top {
    display: flex;
    justify-content: space-between;
    background-color: #217346;
    color: white;
    padding: 4px 10px;
    font-size: 12px;
}

.window-controls span {
    margin-left: 15px;
    cursor: pointer;
}

.menu-tabs {
    display: flex;
    padding-top: 5px;
    background-color: #f3f2f1;
}

.menu-tab {
    padding: 4px 15px;
    font-size: 13px;
    cursor: pointer;
    border: 1px solid transparent;
    border-bottom: none;
}

.menu-tab.active {
    background-color: #fff;
    border-color: #d2d0ce;
    color: #217346;
    border-bottom: 1px solid #fff;
    margin-bottom: -1px;
    z-index: 1;
}

.toolbar {
    background-color: #fff;
    padding: 8px 10px;
    display: flex;
    gap: 15px;
    border-bottom: 1px solid #e1dfdd;
    align-items: center;
}

.tool-group {
    display: flex;
    align-items: center;
    gap: 5px;
    border-right: 1px solid #e1dfdd;
    padding-right: 15px;
}

.tool-btn {
    background: transparent;
    border: 1px solid transparent;
    padding: 4px 8px;
    cursor: pointer;
    border-radius: 2px;
}

.tool-btn:hover {
    background-color: #f3f2f1;
    border-color: #c8c6c4;
}

/* Formula Bar */
.formula-bar {
    display: flex;
    align-items: center;
    padding: 4px 10px;
    background-color: #fff;
    border-bottom: 1px solid #d2d0ce;
}

.name-box {
    width: 100px;
    border: 1px solid #c8c6c4;
    padding: 2px 5px;
    text-align: center;
    font-size: 12px;
}

.fx-icon {
    color: #666;
    font-style: italic;
    font-weight: bold;
    margin: 0 10px;
}

.formula-input {
    flex-grow: 1;
    border: 1px solid #c8c6c4;
    padding: 2px 5px;
    outline: none;
    font-size: 13px;
}

/* Spreadsheet Area */
.spreadsheet-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
}

.spreadsheet-body {
    display: flex;
    flex-grow: 1;
    overflow: hidden;
    position: relative;
}

.corner-header {
    position: absolute;
    top: 0;
    left: 0;
    width: 30px;
    height: 25px;
    background-color: #f3f2f1;
    border-right: 1px solid #c8c6c4;
    border-bottom: 1px solid #c8c6c4;
    z-index: 3;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 10px;
    color: #a19f9d;
}

.column-headers {
    display: flex;
    margin-left: 30px;
    background-color: #f3f2f1;
    border-bottom: 1px solid #c8c6c4;
    overflow: hidden;
}

.col-header {
    width: 80px; /* Default cell width */
    height: 25px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-right: 1px solid #c8c6c4;
    font-size: 12px;
    color: #333;
    flex-shrink: 0;
}

.grid-content {
    display: flex;
    flex-grow: 1;
    overflow: auto;
    position: relative;
}

.row-headers {
    display: flex;
    flex-direction: column;
    width: 30px;
    background-color: #f3f2f1;
    border-right: 1px solid #c8c6c4;
    overflow: hidden;
    flex-shrink: 0;
}

.row-header {
    height: 25px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-bottom: 1px solid #c8c6c4;
    font-size: 12px;
    color: #333;
}

/* Game Grids positioned like Excel cells */
.sheet-view {
    position: absolute;
    top: 0;
    left: 0;
    /* We align the games inside the dummy grid by just rendering them as grids */
}

.game-grid {
    display: grid;
    background-color: #fff;
    border-top: 1px solid #e1dfdd;
    border-left: 1px solid #e1dfdd;
}

/* Base cell styling to look like Excel */
.excel-cell {
    width: 80px;
    height: 25px;
    border-right: 1px solid #e1dfdd;
    border-bottom: 1px solid #e1dfdd;
    display: flex;
    align-items: center;
    justify-content: flex-end; /* Numbers right-aligned */
    padding: 0 4px;
    font-size: 14px;
    position: relative;
    cursor: cell;
}

.excel-cell.selected {
    border: 2px solid #217346;
    z-index: 10;
}

/* -------------------
   SUDOKU STYLES
   ------------------- */
.sudoku {
    grid-template-columns: repeat(9, 80px);
    grid-template-rows: repeat(9, 25px);
}

.sudoku .excel-cell {
    justify-content: center; /* Center Sudoku numbers */
    font-weight: normal;
    color: #000;
}

.sudoku .excel-cell.fixed {
    color: #333; /* Darker for fixed numbers */
}

.sudoku .excel-cell.user-input {
    color: #0052cc; /* Blue for user input */
    font-weight: bold;
}

/* Thicker borders for 3x3 blocks */
.sudoku .excel-cell:nth-child(3n) { border-right: 2px solid #a19f9d; }
.sudoku .excel-cell:nth-child(9n) { border-right: 1px solid #e1dfdd; } /* reset last col */
.sudoku .excel-cell:nth-child(n+19):nth-child(-n+27),
.sudoku .excel-cell:nth-child(n+46):nth-child(-n+54),
.sudoku .excel-cell:nth-child(n+73):nth-child(-n+81) {
    border-bottom: 2px solid #a19f9d;
}

/* -------------------
   2048 STYLES
   ------------------- */
.g2048 {
    grid-template-columns: repeat(4, 80px);
    grid-template-rows: repeat(4, 25px);
}

.g2048 .excel-cell {
    justify-content: right; /* Numbers right-aligned like money */
    font-weight: normal;
    transition: all 0.1s;
}

/* 2048 Colors disguised as financial data */
.val-2 { color: #333; }
.val-4 { color: #333; font-weight: bold; }
.val-8 { background-color: #fce4d6; } /* Light orange */
.val-16 { background-color: #f8cbad; }
.val-32 { background-color: #f4b084; color: white;}
.val-64 { background-color: #ed7d31; color: white; font-weight: bold;}
.val-128 { background-color: #fff2cc; } /* Light yellow */
.val-256 { background-color: #ffe699; }
.val-512 { background-color: #ffd966; }
.val-1024 { background-color: #e2efda; } /* Light green */
.val-2048 { background-color: #c6e0b4; font-weight: bold;}


/* Bottom Tabs */
.sheet-tabs {
    display: flex;
    flex-direction: column;
    background-color: #f3f2f1;
    border-top: 1px solid #c8c6c4;
}

.tabs-row {
    display: flex;
    align-items: center;
}

.tab-controls {
    padding: 0 10px;
    color: #666;
    font-size: 10px;
    cursor: pointer;
}

.tabs {
    display: flex;
    overflow-x: auto;
}

.tab {
    padding: 5px 20px;
    font-size: 12px;
    cursor: pointer;
    border-right: 1px solid #c8c6c4;
    background-color: #e1dfdd;
    color: #333;
}

.tab.active {
    background-color: #fff;
    color: #217346;
    font-weight: 500;
    border-bottom: 2px solid #217346;
}

.status-bar {
    display: flex;
    padding: 2px 10px;
    font-size: 11px;
    color: #333;
    background-color: #f3f2f1;
    border-top: 1px solid #e1dfdd;
    align-items: center;
}

/* Boss Key Mode (Safe Mode) */
.safe-mode .game-grid {
    display: none !important;
}
.safe-mode .dummy-grid {
    display: block !important;
}
.safe-mode .sheet-view { display: none !important; }

/* In normal mode, dummy grid is a background */
.dummy-grid {
    position: absolute;
    top: 0;
    left: 0; /* Offset removed since row-headers are outside */
    z-index: -1;
    width: 2000px;
    height: 1000px;
    background-image: 
        linear-gradient(to right, #e1dfdd 1px, transparent 1px),
        linear-gradient(to bottom, #e1dfdd 1px, transparent 1px);
    background-size: 80px 25px; /* Matches col/row size */
}

/* Fake Dashboard & Theme Toggle */
.window-controls { display: flex; align-items: center; }
.theme-toggle {
    display: inline-block;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: #0b5028;
    color: #fff;
    text-align: center;
    line-height: 20px;
    font-size: 10px;
    cursor: pointer;
    margin-left: 15px;
    user-select: none;
    border: 1px solid #114a29;
}
.sheet-layout {
    display: flex;
    gap: 80px; /* Aligns to exactly 1 column width */
    padding: 50px 80px; /* Aligns to exactly 2 rows down, 1 column right */
}
.fake-dashboard {
    display: flex;
    flex-direction: column;
    gap: 25px; /* Aligns to exactly 1 row height */
    width: 320px; /* Aligns to exactly 4 columns (80px * 4) */
    font-family: 'Segoe UI', sans-serif;
}
.fake-table {
    display: grid;
    grid-template-columns: 240px 80px; /* 3 cols + 1 col = 4 cols (320px) */
    background-color: transparent;
    font-size: 13px;
    border-top: 1px solid #e1dfdd;
    border-left: 1px solid #e1dfdd;
}
.fake-table-header {
    background-color: #dbe5f1; /* Pivot table blue */
    padding: 0 4px;
    font-weight: bold;
    grid-column: span 2;
    height: 25px;
    display: flex;
    align-items: center;
    border-right: 1px solid #e1dfdd;
    border-bottom: 1px solid #e1dfdd;
    color: #333;
}
.fake-table-cell {
    height: 25px;
    display: flex;
    align-items: center;
    padding: 0 4px;
    background-color: #fff;
    border-right: 1px solid #e1dfdd;
    border-bottom: 1px solid #e1dfdd;
    color: #333;
}
.fake-table-cell.label {
    background-color: #f2f2f2;
}
.fake-table-cell.value {
    justify-content: flex-end; /* Right-aligned numbers/values like Excel */
}
.fake-table-cell.total {
    font-weight: bold;
    background-color: #dbe5f1;
    border-top: 1px solid #95b3d7;
}

.fake-chart {
    background-color: #fff;
    border: 1px solid #e1dfdd;
    padding: 15px;
    /* Chart doesn't need to be cell-aligned, floating is fine */
}
.chart-title {
    font-size: 13px;
    font-weight: bold;
    margin-bottom: 15px;
}
.chart-bars {
    display: flex;
    justify-content: space-around;
    height: 120px;
    align-items: flex-end;
}
.bar-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    height: 100%;
    justify-content: flex-end;
}
.bar {
    width: 30px;
    background-color: #5b9bd5;
    border-radius: 2px 2px 0 0;
    transition: height 0.3s ease;
}
#fake-score-bar {
    background-color: #ed7d31;
}

/* Excel Data Validation Modal */
.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: transparent; /* No dimming to look like a real OS window */
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}
.excel-modal {
    background-color: #fff;
    border: 1px solid #aaa;
    box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
    width: 350px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    display: flex;
    flex-direction: column;
}
.modal-header {
    background-color: #fff;
    padding: 5px 10px;
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #000;
}
.modal-close {
    cursor: pointer;
    font-size: 10px;
    padding: 2px 5px;
}
.modal-close:hover { background-color: #e81123; color: white; }
.modal-content {
    display: flex;
    padding: 20px;
    gap: 15px;
    align-items: center;
}
.modal-icon {
    font-size: 32px;
}
.modal-text {
    font-size: 13px;
    line-height: 1.4;
    color: #333;
}
.modal-buttons {
    background-color: #f0f0f0;
    padding: 10px 15px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    border-top: 1px solid #dfdfdf;
}
.modal-btn {
    padding: 4px 15px;
    font-size: 12px;
    background-color: #e1e1e1;
    border: 1px solid #adadad;
    cursor: pointer;
}
.modal-btn:hover { background-color: #e5f1fb; border-color: #0078d7; }

/* Dark Mode Overrides */
body.dark-mode {
    background-color: #1e1e1e;
    color: #d4d4d4;
}
body.dark-mode .ribbon, body.dark-mode .menu-tabs, body.dark-mode .toolbar, body.dark-mode .formula-bar,
body.dark-mode .column-headers, body.dark-mode .row-headers, body.dark-mode .corner-header,
body.dark-mode .sheet-tabs, body.dark-mode .status-bar, body.dark-mode .game-grid {
    background-color: #2d2d2d;
    border-color: #444;
    color: #d4d4d4;
}
body.dark-mode .ribbon-top {
    background-color: #114a29;
}
body.dark-mode .menu-tab.active {
    background-color: #1e1e1e;
    color: #4CAF50;
    border-color: #444;
}
body.dark-mode .excel-cell, body.dark-mode .col-header, body.dark-mode .row-header {
    border-color: #444;
    color: #d4d4d4;
}
body.dark-mode .sudoku .excel-cell { color: #d4d4d4; }
body.dark-mode .sudoku .excel-cell.user-input { color: #64b5f6; }
body.dark-mode .tab {
    background-color: #333;
    color: #aaa;
    border-color: #444;
}
body.dark-mode .tab.active {
    background-color: #1e1e1e;
    color: #4CAF50;
}
body.dark-mode .dummy-grid {
    background-image: 
        linear-gradient(to right, #444 1px, transparent 1px),
        linear-gradient(to bottom, #444 1px, transparent 1px);
}
body.dark-mode .fake-table, body.dark-mode .fake-chart { background-color: transparent; border-color: #444; }
body.dark-mode .fake-table-header { background-color: #1a365d; border-color: #444; color: #d4d4d4; }
body.dark-mode .fake-table-cell { border-color: #444; background-color: #2d2d2d; color: #d4d4d4; }
body.dark-mode .fake-table-cell.label { background-color: #333; }
body.dark-mode .fake-table-cell.total { background-color: #1a365d; border-top: 1px solid #2b6cb0; }
body.dark-mode .excel-modal { background-color: #2d2d2d; border-color: #555; }
body.dark-mode .modal-header { background-color: #2d2d2d; color: #d4d4d4; }
body.dark-mode .modal-text { color: #d4d4d4; }
body.dark-mode .modal-buttons { background-color: #333; border-top-color: #555; }
body.dark-mode .modal-btn { background-color: #444; border-color: #666; color: #d4d4d4; }
body.dark-mode .modal-btn:hover { background-color: #555; border-color: #888; }
```

### 4. `main.js`
```javascript
document.addEventListener('DOMContentLoaded', () => {
    // 1. Generate Column Headers (A to Z, AA, AB...)
    const colHeaders = document.getElementById('col-headers');
    for (let i = 0; i < 50; i++) {
        const div = document.createElement('div');
        div.className = 'col-header';
        div.textContent = getColumnLabel(i);
        colHeaders.appendChild(div);
    }

    // 2. Generate Row Headers (1 to 100)
    const rowHeaders = document.getElementById('row-headers');
    for (let i = 1; i <= 100; i++) {
        const div = document.createElement('div');
        div.className = 'row-header';
        div.textContent = i;
        rowHeaders.appendChild(div);
    }

    // Helper: Number to Excel Column Letter
    function getColumnLabel(index) {
        let label = '';
        while (index >= 0) {
            label = String.fromCharCode((index % 26) + 65) + label;
            index = Math.floor(index / 26) - 1;
        }
        return label;
    }

    // 3. Tab Switching Logic
    const tabs = document.querySelectorAll('.tab[data-sheet]');
    const sheets = document.querySelectorAll('.sheet-view');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all
            tabs.forEach(t => t.classList.remove('active'));
            sheets.forEach(s => s.style.display = 'none');

            // Activate clicked
            tab.classList.add('active');
            const sheetId = tab.getAttribute('data-sheet');
            document.getElementById(`${sheetId}-sheet`).style.display = 'block';

            // Also update formula bar to look like something changed
            updateFormulaBarForSheet(sheetId);
        });
    });

    function updateFormulaBarForSheet(sheetId) {
        const formulaInput = document.getElementById('formula-input');
        if (sheetId === 'sudoku') {
            formulaInput.value = '=SUDOKU.INIT(A1:I9)';
            document.getElementById('current-cell').textContent = 'A1';
        } else if (sheetId === 'game2048') {
            formulaInput.value = '=SUM(A1:D4)*2048';
            document.getElementById('current-cell').textContent = 'A1';
        }
    }

    // Initialize formula bar for first sheet
    updateFormulaBarForSheet('sudoku');

    // 4. Boss Key (Esc) Implementation
    let isSafeMode = false;
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            isSafeMode = !isSafeMode;
            if (isSafeMode) {
                document.body.classList.add('safe-mode');
                document.title = '업무용 데이터 종합 관리.xlsx - Excel';
                document.getElementById('formula-input').value = '=VLOOKUP(C4, Data!A2:D100, 3, FALSE)';
            } else {
                document.body.classList.remove('safe-mode');
                // Restore formula bar based on active tab
                const activeTab = document.querySelector('.tab.active');
                if (activeTab) {
                    updateFormulaBarForSheet(activeTab.getAttribute('data-sheet'));
                }
            }
        }
    });

    // 5. Sync scrolling for headers
    const gridContent = document.getElementById('grid-content');
    const rowHeadersBox = document.getElementById('row-headers');
    gridContent.addEventListener('scroll', () => {
        colHeaders.scrollLeft = gridContent.scrollLeft;
        rowHeadersBox.scrollTop = gridContent.scrollTop;
    });

    // 6. Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
    }
});
```

### 5. `sudoku.js`
```javascript
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('sudoku-grid');
    const formulaInput = document.getElementById('formula-input');
    const currentCellBox = document.getElementById('current-cell');
    
    // Simple hardcoded Sudoku puzzle for V1 (0 is empty)
    const initialBoard = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ];

    let selectedCell = null;

    // Helper to convert row/col to Excel ref (e.g., 0,0 -> A1)
    function getCellRef(row, col) {
        return String.fromCharCode(65 + col) + (row + 1);
    }

    // Render Board
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'excel-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const val = initialBoard[row][col];
            if (val !== 0) {
                cell.textContent = val;
                cell.classList.add('fixed');
            }

            // Click to select
            cell.addEventListener('click', () => {
                if (selectedCell) selectedCell.classList.remove('selected');
                selectedCell = cell;
                cell.classList.add('selected');
                
                // Update formula bar
                currentCellBox.textContent = getCellRef(row, col);
                formulaInput.value = cell.textContent || '';
            });

            grid.appendChild(cell);
        }
    }

    // Handle Keyboard Input
    document.addEventListener('keydown', (e) => {
        // Only process if Sudoku is active and a cell is selected, and we are not in safe mode
        if (document.body.classList.contains('safe-mode')) return;
        if (document.getElementById('sudoku-sheet').style.display === 'none') return;
        if (!selectedCell) return;

        // Number input (1-9)
        if (/^[1-9]$/.test(e.key)) {
            if (!selectedCell.classList.contains('fixed')) {
                const r = parseInt(selectedCell.dataset.row);
                const c = parseInt(selectedCell.dataset.col);
                
                if (isValidSudokuMove(r, c, e.key)) {
                    selectedCell.textContent = e.key;
                    selectedCell.classList.add('user-input');
                    formulaInput.value = e.key;
                    checkWin();
                } else {
                    // Show validation error modal
                    const modal = document.getElementById('validation-modal');
                    if (modal) modal.style.display = 'flex';
                }
            }
        }
        
        // Delete/Backspace
        if (e.key === 'Backspace' || e.key === 'Delete') {
             if (!selectedCell.classList.contains('fixed')) {
                selectedCell.textContent = '';
                selectedCell.classList.remove('user-input');
                formulaInput.value = '';
            }
        }

        // Arrow keys navigation
        let r = parseInt(selectedCell.dataset.row);
        let c = parseInt(selectedCell.dataset.col);
        
        if (e.key === 'ArrowUp' && r > 0) r--;
        if (e.key === 'ArrowDown' && r < 8) r++;
        if (e.key === 'ArrowLeft' && c > 0) c--;
        if (e.key === 'ArrowRight' && c < 8) c++;

        if (r !== parseInt(selectedCell.dataset.row) || c !== parseInt(selectedCell.dataset.col)) {
            const nextCell = document.querySelector(`.sudoku .excel-cell[data-row="${r}"][data-col="${c}"]`);
            if (nextCell) nextCell.click();
        }
    });

    function checkWin() {
        const cells = document.querySelectorAll('.sudoku .excel-cell');
        let filledCount = 0;
        cells.forEach(c => {
            if (c.textContent !== '') filledCount++;
        });

        // Update fake dashboard
        const progressDisplay = document.getElementById('sudoku-progress-display');
        if (progressDisplay) {
            progressDisplay.textContent = `${filledCount} / 81`;
        }

        if (filledCount === 81) {
            formulaInput.value = '=WIN("축하합니다! 스도쿠를 완료했습니다.")';
        }
    }
    
    function isValidSudokuMove(row, col, value) {
        const cells = document.querySelectorAll('.sudoku .excel-cell');
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            const val = cell.textContent;

            if (r === row && c === col) continue;
            if (val === '') continue;

            if (val === value) {
                if (r === row) return false;
                if (c === col) return false;
                if (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3)) {
                    return false;
                }
            }
        }
        return true;
    }

    // Initial progress update
    checkWin();

    // Modal controls
    const modal = document.getElementById('validation-modal');
    const closeBtns = document.querySelectorAll('.modal-close, .modal-btn.cancel, .modal-btn.retry');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });
    });
});
```

### 6. `game2048.js`
```javascript
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('game2048-grid');
    const formulaInput = document.getElementById('formula-input');
    const currentCellBox = document.getElementById('current-cell');
    
    let board = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];
    let score = 0;

    // Helper to convert row/col to Excel ref
    function getCellRef(row, col) {
        return String.fromCharCode(65 + col) + (row + 1);
    }

    // Initialize DOM cells
    const cells = [];
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const cell = document.createElement('div');
            cell.className = 'excel-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            // Click to select
            cell.addEventListener('click', () => {
                document.querySelectorAll('.g2048 .excel-cell').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
                
                currentCellBox.textContent = getCellRef(row, col);
                formulaInput.value = cell.textContent || '';
            });

            grid.appendChild(cell);
            cells.push({ row, col, element: cell });
        }
    }

    function addRandomTile() {
        let emptyCells = [];
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (board[r][c] === 0) emptyCells.push({r, c});
            }
        }
        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            board[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    function updateBoard() {
        cells.forEach(cellObj => {
            const val = board[cellObj.row][cellObj.col];
            const el = cellObj.element;
            
            // Clear old classes
            el.className = 'excel-cell';
            if (el.classList.contains('selected')) el.classList.add('selected');

            if (val !== 0) {
                el.textContent = val;
                el.classList.add(`val-${val}`);
            } else {
                el.textContent = '';
            }
        });

        // Update formula bar to show score masquerading as a formula
        if (document.getElementById('game2048-sheet').style.display !== 'none') {
            formulaInput.value = `=SUM(A1:D4)*${score}`;
        }

        // Update fake dashboard elements
        const fakeScoreDisplay = document.getElementById('fake-score-display');
        const fakeScoreBar = document.getElementById('fake-score-bar');
        if (fakeScoreDisplay) {
            fakeScoreDisplay.textContent = score.toLocaleString();
        }
        if (fakeScoreBar) {
            let maxTile = Math.max(...board.flat());
            let percent = Math.min(100, Math.max(5, (maxTile / 2048) * 100));
            fakeScoreBar.style.height = `${percent}%`;
        }
    }

    // Logic for sliding and merging
    function slide(row) {
        let arr = row.filter(val => val);
        let missing = 4 - arr.length;
        let zeros = Array(missing).fill(0);
        return arr.concat(zeros);
    }

    function combine(row) {
        for (let i = 0; i < 3; i++) {
            if (row[i] !== 0 && row[i] === row[i + 1]) {
                row[i] *= 2;
                score += row[i];
                row[i + 1] = 0;
            }
        }
        return row;
    }

    function operate(row) {
        row = slide(row);
        row = combine(row);
        row = slide(row);
        return row;
    }

    // Keydown for 2048
    document.addEventListener('keydown', (e) => {
        if (document.body.classList.contains('safe-mode')) return;
        if (document.getElementById('game2048-sheet').style.display === 'none') return;
        
        let moved = false;

        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault(); // Prevent scrolling
        }

        if (e.key === 'ArrowLeft') {
            for (let r = 0; r < 4; r++) {
                let row = board[r];
                let newRow = operate(row);
                if (row.toString() !== newRow.toString()) moved = true;
                board[r] = newRow;
            }
        } else if (e.key === 'ArrowRight') {
            for (let r = 0; r < 4; r++) {
                let row = board[r].slice().reverse();
                let newRow = operate(row);
                newRow.reverse();
                if (board[r].toString() !== newRow.toString()) moved = true;
                board[r] = newRow;
            }
        } else if (e.key === 'ArrowUp') {
            for (let c = 0; c < 4; c++) {
                let col = [board[0][c], board[1][c], board[2][c], board[3][c]];
                let newCol = operate(col);
                if (col.toString() !== newCol.toString()) moved = true;
                for (let r = 0; r < 4; r++) board[r][c] = newCol[r];
            }
        } else if (e.key === 'ArrowDown') {
            for (let c = 0; c < 4; c++) {
                let col = [board[0][c], board[1][c], board[2][c], board[3][c]].reverse();
                let newCol = operate(col);
                newCol.reverse();
                let oldCol = [board[0][c], board[1][c], board[2][c], board[3][c]];
                if (oldCol.toString() !== newCol.toString()) moved = true;
                for (let r = 0; r < 4; r++) board[r][c] = newCol[r];
            }
        }

        if (moved) {
            addRandomTile();
            updateBoard();
        }
    });

    // Start game
    addRandomTile();
    addRandomTile();
    updateBoard();
});
```
