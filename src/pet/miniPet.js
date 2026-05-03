// =====================================================
//  miniPet.js - 미니미 (셀구리) 등반 애니메이션 엔진
//  서식지: 실적장표(20행×5열) + 막대그래프
//  크기: 엑셀 셀(80×25px) 보다 작게 유지 (20×20px)
// =====================================================

const ROW_H = 25;       // 엑셀 셀 높이 (px)
const COL_W = 80;       // 엑셀 셀 너비 (px)
const TABLE_ROWS = 20;  // 실적장표 데이터 행 수
const CHART_BARS = 6;   // 막대그래프 바 개수

// 실적장표 데이터 (한국 직장인 위장용)
const TABLE_DATA = {
    headers: ['부서명', 'Q1', 'Q2', 'Q3', 'Q4'],
    rows: [
        ['전략기획팀', '12,400', '11,200', '14,800', '13,900'],
        ['영업1팀',    '38,200', '41,500', '39,800', '44,200'],
        ['영업2팀',    '29,100', '31,400', '28,700', '33,600'],
        ['마케팅팀',   '8,500',  '9,200',  '11,400', '10,800'],
        ['개발1팀',    '5,200',  '5,800',  '6,100',  '6,700'],
        ['개발2팀',    '4,900',  '5,100',  '5,400',  '5,900'],
        ['디자인팀',   '3,800',  '4,200',  '4,100',  '4,600'],
        ['인사총무팀', '2,100',  '2,300',  '2,200',  '2,400'],
        ['재무회계팀', '1,800',  '1,900',  '2,100',  '2,000'],
        ['구매팀',     '6,700',  '7,100',  '6,800',  '7,500'],
        ['물류팀',     '9,300',  '9,800',  '10,200', '11,100'],
        ['고객서비스', '4,400',  '4,600',  '4,800',  '5,200'],
        ['법무팀',     '1,200',  '1,300',  '1,400',  '1,300'],
        ['해외영업팀', '22,800', '24,100', '26,300', '28,900'],
        ['기술지원팀', '3,600',  '3,900',  '4,100',  '4,300'],
        ['R&D팀',      '7,200',  '7,800',  '8,100',  '8,700'],
        ['품질관리팀', '2,400',  '2,600',  '2,500',  '2,800'],
        ['안전환경팀', '1,600',  '1,700',  '1,800',  '1,900'],
        ['IT인프라팀', '3,100',  '3,400',  '3,600',  '3,800'],
        ['경영지원팀', '2,900',  '3,100',  '3,300',  '3,500'],
    ]
};

const CHART_DATA = [
    { label: 'Q1', height: 55, value: '162.3억' },
    { label: 'Q2', height: 68, value: '174.1억' },
    { label: 'Q3', height: 74, value: '183.5억' },
    { label: 'Q4', height: 88, value: '200.3억' },
    { label: '목표', height: 95, value: '210억' },
    { label: '합계', height: 100, value: '720.2억' },
];

// 미니미가 할 말 (상황별)
const SPEECHES = {
    idle:    ['...', '(・・ )', '쉿!', '조용히...', '( ˘ ˘ )'],
    climb:   ['낑낑', '영차!', '우웁..', '후우..', '힘들어', '낑!'],
    top:     ['야호!', '정상이다!', '( ˘▽˘)/', '드디어!', '쉬자...'],
    fall:    ['으악!', '미끄러!', '꺄악!', '아이고!', '으아아'],
    celebrate: ['✨', '( ˘▽˘)☆', '최고야!', '성공!'],
};

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function initMiniPet() {
    buildHabitatDOM();
    startClimbLoop();
}

// ── DOM 생성 ──────────────────────────────────────────

function buildHabitatDOM() {
    const habitat = document.getElementById('mini-pet-habitat');
    if (!habitat) return;

    // 실적장표 생성
    const table = buildTable();
    // 막대 그래프 생성
    const chart = buildChart();

    // 미니미 캐릭터
    const pet = document.createElement('div');
    pet.id = 'mini-pet-sprite';
    pet.className = 'mini-pet-sprite';
    pet.innerHTML = `
        <div class="mps-body">
            <div class="mps-antenna"></div>
            <div class="mps-eyes">
                <div class="mps-eye mps-eye-l"></div>
                <div class="mps-eye mps-eye-r"></div>
            </div>
            <div class="mps-cheeks">
                <div class="mps-cheek"></div>
                <div class="mps-cheek"></div>
            </div>
        </div>
        <div class="mps-feet">
            <div class="mps-foot"></div>
            <div class="mps-foot"></div>
        </div>
    `;

    // 말풍선
    const bubble = document.createElement('div');
    bubble.id = 'mini-pet-bubble';
    bubble.className = 'mini-pet-bubble';
    bubble.textContent = '';

    habitat.appendChild(table);
    habitat.appendChild(chart);
    habitat.appendChild(pet);
    habitat.appendChild(bubble);
}

function buildTable() {
    const wrapper = document.createElement('div');
    wrapper.className = 'mini-habitat-table';

    // 헤더
    const headerRow = document.createElement('div');
    headerRow.className = 'mht-row mht-header';
    TABLE_DATA.headers.forEach(h => {
        const cell = document.createElement('div');
        cell.className = 'mht-cell';
        cell.textContent = h;
        headerRow.appendChild(cell);
    });
    wrapper.appendChild(headerRow);

    // 데이터 행
    TABLE_DATA.rows.forEach((row, i) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'mht-row' + (i % 2 === 0 ? ' mht-even' : '');
        rowEl.dataset.rowIndex = i;
        row.forEach((cell, j) => {
            const cellEl = document.createElement('div');
            cellEl.className = 'mht-cell' + (j > 0 ? ' mht-num' : '');
            cellEl.textContent = cell;
            rowEl.appendChild(cellEl);
        });
        wrapper.appendChild(rowEl);
    });

    return wrapper;
}

function buildChart() {
    const wrapper = document.createElement('div');
    wrapper.className = 'mini-habitat-chart';

    const title = document.createElement('div');
    title.className = 'mhc-title';
    title.textContent = '분기별 실적 현황 (억원)';
    wrapper.appendChild(title);

    const barsContainer = document.createElement('div');
    barsContainer.className = 'mhc-bars';

    CHART_DATA.forEach((d, i) => {
        const col = document.createElement('div');
        col.className = 'mhc-col';
        col.dataset.barIndex = i;

        const bar = document.createElement('div');
        bar.className = 'mhc-bar';
        bar.style.height = '0%'; // 처음엔 0, 애니메이션으로
        bar.dataset.targetHeight = d.height;

        const val = document.createElement('div');
        val.className = 'mhc-val';
        val.textContent = d.value;

        const label = document.createElement('div');
        label.className = 'mhc-label';
        label.textContent = d.label;

        col.appendChild(val);
        col.appendChild(bar);
        col.appendChild(label);
        barsContainer.appendChild(col);
    });

    wrapper.appendChild(barsContainer);
    return wrapper;
}

// ── 등반 루프 ─────────────────────────────────────────

let climbState = {
    phase: 'table',   // 'table' | 'chart' | 'fall' | 'celebrate'
    row: TABLE_ROWS,  // 시작 위치: 맨 아래 (TABLE_ROWS = 맨 밑)
    barIndex: 0,
    barProgress: 0,   // 0~100
};

function getPet()    { return document.getElementById('mini-pet-sprite'); }
function getBubble() { return document.getElementById('mini-pet-bubble'); }

function showSpeech(text, duration = 1200) {
    const bubble = getBubble();
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add('visible');
    clearTimeout(bubble._timer);
    bubble._timer = setTimeout(() => bubble.classList.remove('visible'), duration);
}

function setTablePosition(rowFromBottom) {
    // rowFromBottom: 0 = 맨 아래, TABLE_ROWS = 맨 위
    const pet = getPet();
    if (!pet) return;
    const habitat = document.getElementById('mini-pet-habitat');
    const table   = habitat?.querySelector('.mini-habitat-table');
    if (!table) return;

    const tableRect  = table.getBoundingClientRect();
    const habitatRect = habitat.getBoundingClientRect();
    // 테이블 맨 아래 = 헤더(1행) + 20행 데이터
    const tableBottom = tableRect.bottom - habitatRect.top;
    const tableTop    = tableRect.top    - habitatRect.top;
    const totalH      = tableBottom - tableTop - ROW_H; // 헤더 제외

    const bottom = tableBottom - habitatRect.top
        - (rowFromBottom * ROW_H)
        - 20; // creature 높이 보정

    pet.style.bottom = '';
    pet.style.top = (tableTop + totalH - rowFromBottom * ROW_H) + 'px';
    pet.style.left = (tableRect.left - habitatRect.left + 4) + 'px';
}

function setChartPosition(barIndex, progressPct) {
    const pet = getPet();
    if (!pet) return;
    const habitat = document.getElementById('mini-pet-habitat');
    const chart   = habitat?.querySelector('.mini-habitat-chart');
    if (!chart) return;

    const cols = chart.querySelectorAll('.mhc-col');
    if (!cols[barIndex]) return;

    const col         = cols[barIndex];
    const barEl       = col.querySelector('.mhc-bar');
    const habitatRect = habitat.getBoundingClientRect();
    const colRect     = col.getBoundingClientRect();
    const barRect     = barEl.getBoundingClientRect();

    // 막대 하단에서 progressPct만큼 올라간 위치
    const barBottom = barRect.bottom - habitatRect.top;
    const barHeight = barRect.height;
    const targetTop = barBottom - (barHeight * progressPct / 100) - 20;

    pet.style.top  = targetTop + 'px';
    pet.style.left = (colRect.left - habitatRect.left + colRect.width / 2 - 10) + 'px';
}

function animateBarsIn() {
    const bars = document.querySelectorAll('.mhc-bar');
    bars.forEach((bar, i) => {
        const target = bar.dataset.targetHeight;
        setTimeout(() => {
            bar.style.transition = 'height 0.8s ease-out';
            bar.style.height = target + '%';
        }, i * 120);
    });
}

function startClimbLoop() {
    // 막대 입장 애니메이션
    setTimeout(animateBarsIn, 600);

    // 초기 위치: 테이블 맨 아래
    setTimeout(() => {
        setTablePosition(0);
        showSpeech(getRandom(SPEECHES.idle), 1500);
        climbState.row = 0;

        // 등반 시작
        setTimeout(tickClimb, 1800);
    }, 500);
}

let tickTimer = null;

function tickClimb() {
    const pet = getPet();
    if (!pet) return;

    if (climbState.phase === 'table') {
        // 테이블 한 행 올라감
        climbState.row++;

        // struggle 클래스 적용
        pet.classList.add('mps-struggle');
        showSpeech(getRandom(SPEECHES.climb), 700);

        setTimeout(() => {
            setTablePosition(climbState.row);
            pet.classList.remove('mps-struggle');

            if (climbState.row >= TABLE_ROWS) {
                // 테이블 정상!
                pet.classList.add('mps-celebrate');
                showSpeech(getRandom(SPEECHES.top), 1200);
                setTimeout(() => {
                    pet.classList.remove('mps-celebrate');
                    climbState.phase = 'chart';
                    climbState.barIndex = 0;
                    climbState.barProgress = 0;
                    tickTimer = setTimeout(tickClimb, 1000);
                }, 1400);
                return;
            }
            tickTimer = setTimeout(tickClimb, 600 + Math.random() * 300);
        }, 300);

    } else if (climbState.phase === 'chart') {
        // 막대 그래프 등반
        climbState.barProgress += 20 + Math.random() * 15;
        pet.classList.add('mps-struggle');
        showSpeech(getRandom(SPEECHES.climb), 600);

        setTimeout(() => {
            setChartPosition(climbState.barIndex, Math.min(climbState.barProgress, 98));
            pet.classList.remove('mps-struggle');

            if (climbState.barProgress >= 100) {
                // 이 막대 정상
                if (climbState.barIndex < CHART_BARS - 1) {
                    showSpeech(getRandom(SPEECHES.top), 700);
                    climbState.barIndex++;
                    climbState.barProgress = 0;
                    tickTimer = setTimeout(tickClimb, 900);
                } else {
                    // 전체 정상! 축하
                    pet.classList.add('mps-celebrate');
                    showSpeech(getRandom(SPEECHES.celebrate), 1500);
                    setTimeout(() => {
                        pet.classList.remove('mps-celebrate');
                        fallDown();
                    }, 1800);
                }
                return;
            }
            tickTimer = setTimeout(tickClimb, 500 + Math.random() * 400);
        }, 300);

    }
}

function fallDown() {
    const pet = getPet();
    if (!pet) return;

    pet.classList.add('mps-fall');
    showSpeech(getRandom(SPEECHES.fall), 1000);

    // 테이블 맨 아래로 빠르게 이동
    setTimeout(() => {
        setTablePosition(0);
    }, 100);

    setTimeout(() => {
        pet.classList.remove('mps-fall');
        showSpeech(getRandom(SPEECHES.idle), 1200);
        // 다시 등반
        climbState.phase = 'table';
        climbState.row = 0;
        tickTimer = setTimeout(tickClimb, 2000);
    }, 1200);
}
