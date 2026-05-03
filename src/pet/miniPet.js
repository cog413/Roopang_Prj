// miniPet.js v3 - 셀구리 등반 애니메이션
// 핵심: CSS 수치와 JS 상수 완벽 일치, display:none 상태 getBoundingClientRect 금지

// ── CSS와 반드시 일치해야 하는 상수 ──
const ROW_H  = 25;   // .mht-cell height (px)
const N_ROWS = 20;   // 데이터 행 수
const N_BARS = 6;    // 차트 바 수
const PAD_T  = 20;   // .mp-scene padding-top
const PAD_L  = 40;   // .mp-scene padding-left

// 테이블 열 너비 합: 110 + 50*4 = 310px
const TABLE_W  = 310;
const SCENE_GAP = 24; // flex gap

const SPEECHES = {
    idle:      ['...', '쉿!', '( ˘ ˘ )', '조용히...'],
    climb:     ['낑낑', '영차!', '우웁..', '후우..', '힘들어!', '으쌰!'],
    top:       ['야호!', '정상!', '( ˘▽˘)/', '드디어!'],
    fall:      ['으악!', '미끄러!', '꺄악!', '아이고!'],
    celebrate: ['✨', '최고야!', '( ˘▽˘)☆', '성공!'],
};
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const TABLE_DATA = {
    headers: ['부서명', 'Q1', 'Q2', 'Q3', 'Q4'],
    rows: [
        ['전략기획팀','12,400','11,200','14,800','13,900'],
        ['영업1팀',  '38,200','41,500','39,800','44,200'],
        ['영업2팀',  '29,100','31,400','28,700','33,600'],
        ['마케팅팀', '8,500', '9,200', '11,400','10,800'],
        ['개발1팀',  '5,200', '5,800', '6,100', '6,700'],
        ['개발2팀',  '4,900', '5,100', '5,400', '5,900'],
        ['디자인팀', '3,800', '4,200', '4,100', '4,600'],
        ['인사팀',   '2,100', '2,300', '2,200', '2,400'],
        ['재무팀',   '1,800', '1,900', '2,100', '2,000'],
        ['구매팀',   '6,700', '7,100', '6,800', '7,500'],
        ['물류팀',   '9,300', '9,800','10,200','11,100'],
        ['고객서비스','4,400','4,600', '4,800', '5,200'],
        ['법무팀',   '1,200', '1,300', '1,400', '1,300'],
        ['해외영업', '22,800','24,100','26,300','28,900'],
        ['기술지원', '3,600', '3,900', '4,100', '4,300'],
        ['R&D팀',    '7,200', '7,800', '8,100', '8,700'],
        ['품질관리', '2,400', '2,600', '2,500', '2,800'],
        ['안전환경', '1,600', '1,700', '1,800', '1,900'],
        ['IT인프라', '3,100', '3,400', '3,600', '3,800'],
        ['경영지원', '2,900', '3,100', '3,300', '3,500'],
    ]
};

const CHART_DATA = [
    { label:'Q1',  h:55,  val:'162억' },
    { label:'Q2',  h:68,  val:'174억' },
    { label:'Q3',  h:74,  val:'183억' },
    { label:'Q4',  h:88,  val:'200억' },
    { label:'목표', h:95, val:'210억' },
    { label:'합계', h:100, val:'720억' },
];

// ── 상태 ──
let state   = { phase:'table', row:0, barIdx:0, barProg:0 };
let active  = false;
let timer   = null;
let domBuilt = false;

// ── 진입점 ─────────────────────────────────────────────
export function initMiniPet() {
    buildDOM();

    // 탭 클릭 감지
    document.addEventListener('click', e => {
        const tab = e.target.closest('.tab');
        if (!tab) return;
        if (tab.dataset.sheet === 'mini-pet') {
            // 두 프레임 뒤에 시작 (display:block 확정 후)
            requestAnimationFrame(() => requestAnimationFrame(begin));
        } else {
            stop();
        }
    });
}

function begin() {
    if (active) return;
    active = true;
    animateBars();
    state = { phase:'table', row:0, barIdx:0, barProg:0 };
    moveSpriteTo(tablePos(0));
    speak(rand(SPEECHES.idle), 1400);
    timer = setTimeout(tick, 2000);
}

function stop() {
    active = false;
    clearTimeout(timer);
}

// ── DOM 빌드 ───────────────────────────────────────────
function buildDOM() {
    if (domBuilt) return;
    const habitat = document.getElementById('mini-pet-habitat');
    if (!habitat) return;
    domBuilt = true;

    // 실적장표
    const tableWrap = document.createElement('div');
    tableWrap.id = 'mp-table';
    tableWrap.className = 'mp-table';
    buildTableDOM(tableWrap);

    // 차트
    const chartWrap = document.createElement('div');
    chartWrap.id = 'mp-chart';
    chartWrap.className = 'mp-chart';
    buildChartDOM(chartWrap);

    // 서식지 맵
    const mapWrap = document.createElement('div');
    mapWrap.className = 'mp-minimap';
    mapWrap.innerHTML = `
        <div class="mp-minimap-title">📍 서식지 맵</div>
        <canvas id="mp-map-canvas" width="148" height="108"></canvas>
        <div class="mp-minimap-legend">
            <span class="mml-table">■ 실적장표</span>
            <span class="mml-chart">■ 실적그래프</span>
            <span class="mml-pet">● 셀구리</span>
        </div>
    `;

    // 셀구리 스프라이트
    const sprite = document.createElement('div');
    sprite.id = 'mp-sprite';
    sprite.className = 'mp-sprite';
    sprite.innerHTML = `
        <div class="mps-body">
            <div class="mps-antenna"></div>
            <div class="mps-eyes">
                <div class="mps-eye"></div><div class="mps-eye"></div>
            </div>
            <div class="mps-cheeks">
                <div class="mps-cheek"></div><div class="mps-cheek"></div>
            </div>
        </div>
        <div class="mps-feet">
            <div class="mps-foot"></div><div class="mps-foot"></div>
        </div>`;

    // 말풍선
    const bubble = document.createElement('div');
    bubble.id = 'mp-bubble';
    bubble.className = 'mp-bubble';

    habitat.appendChild(tableWrap);
    habitat.appendChild(chartWrap);
    habitat.appendChild(mapWrap);
    habitat.appendChild(sprite);
    habitat.appendChild(bubble);
}

function buildTableDOM(wrap) {
    const hdr = document.createElement('div');
    hdr.className = 'mht-row mht-header';
    TABLE_DATA.headers.forEach(h => {
        const c = document.createElement('div');
        c.className = 'mht-cell';
        c.textContent = h;
        hdr.appendChild(c);
    });
    wrap.appendChild(hdr);

    TABLE_DATA.rows.forEach((row, i) => {
        const r = document.createElement('div');
        r.className = 'mht-row' + (i % 2 === 0 ? ' mht-even' : '');
        row.forEach((cell, j) => {
            const c = document.createElement('div');
            c.className = 'mht-cell' + (j > 0 ? ' mht-num' : '');
            c.textContent = cell;
            r.appendChild(c);
        });
        wrap.appendChild(r);
    });
}

function buildChartDOM(wrap) {
    const title = document.createElement('div');
    title.className = 'mp-chart-title';
    title.textContent = '분기별 실적 현황 (억원)';

    const bars = document.createElement('div');
    bars.id = 'mp-bars';
    bars.className = 'mp-bars';

    CHART_DATA.forEach((d, i) => {
        const col = document.createElement('div');
        col.className = 'mp-col';
        col.dataset.i = i;

        const val = document.createElement('div');
        val.className = 'mp-val';
        val.textContent = d.val;

        const bar = document.createElement('div');
        bar.className = 'mp-bar';
        bar.style.height = '0%';
        bar.dataset.h = d.h;

        const lbl = document.createElement('div');
        lbl.className = 'mp-lbl';
        lbl.textContent = d.label;

        col.appendChild(val);
        col.appendChild(bar);
        col.appendChild(lbl);
        bars.appendChild(col);
    });

    wrap.appendChild(title);
    wrap.appendChild(bars);
}

// ── 위치 계산 (CSS 수치와 정확히 매칭) ─────────────────

// 테이블 위치: getBoundingClientRect 없이 순수 수학
// rowFromBottom: 0=맨 아래 데이터 행, N_ROWS-1=맨 위 데이터 행
function tablePos(rowFromBottom) {
    // .mp-scene: padding-top=PAD_T, gap=SCENE_GAP
    // 헤더 1행 + 데이터 N_ROWS행
    // rowFromBottom=0 → 맨 아래 행 (행 인덱스 N_ROWS)
    const rowIdxFromTop = N_ROWS - rowFromBottom; // 1..N_ROWS
    return {
        top:  PAD_T + rowIdxFromTop * ROW_H + 2,
        left: PAD_L + 2,
    };
}

// 차트 위치: 탭이 보이는 상태에서만 호출되므로 getBoundingClientRect OK
function chartPos(barIdx, progressPct) {
    const scene = document.getElementById('mini-pet-habitat');
    const bar   = document.querySelectorAll('#mp-bars .mp-bar')[barIdx];
    if (!scene || !bar) return null;

    const sr = scene.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    return {
        top:  br.bottom - sr.top - (br.height * progressPct / 100) - 20,
        left: br.left   - sr.left + br.width / 2 - 9,
    };
}

// ── 스프라이트 이동 ─────────────────────────────────────
function moveSpriteTo(pos) {
    if (!pos) return;
    const sprite = document.getElementById('mp-sprite');
    const bubble = document.getElementById('mp-bubble');
    if (!sprite) return;
    sprite.style.top  = pos.top  + 'px';
    sprite.style.left = pos.left + 'px';
    if (bubble) {
        bubble.style.top  = (pos.top  - 26) + 'px';
        bubble.style.left = (pos.left - 8)  + 'px';
    }
    drawMinimap(pos);
}

// ── 말풍선 ─────────────────────────────────────────────
function speak(text, dur = 1100) {
    const b = document.getElementById('mp-bubble');
    if (!b) return;
    b.textContent = text;
    b.classList.add('visible');
    clearTimeout(b._t);
    b._t = setTimeout(() => b.classList.remove('visible'), dur);
}

// ── 차트 바 등장 애니메이션 ────────────────────────────
function animateBars() {
    document.querySelectorAll('#mp-bars .mp-bar').forEach((bar, i) => {
        bar.style.height = '0%';
        setTimeout(() => {
            bar.style.transition = 'height 0.7s ease-out';
            bar.style.height = bar.dataset.h + '%';
        }, i * 120);
    });
}

// ── 미니맵 캔버스 그리기 ───────────────────────────────
function drawMinimap(spritePos) {
    const canvas = document.getElementById('mp-map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;   // 148
    const H = canvas.height;  // 108

    ctx.clearRect(0, 0, W, H);

    // 배경
    ctx.fillStyle = '#f9f9f9';
    ctx.fillRect(0, 0, W, H);

    // ─ 테이블 영역 (왼쪽) ─
    const tLeft = 4, tTop = 4, tW = 42, tH = H - 8;
    // 배경
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#c8c6c4';
    ctx.lineWidth = 0.5;
    ctx.fillRect(tLeft, tTop, tW, tH);
    ctx.strokeRect(tLeft, tTop, tW, tH);
    // 헤더
    ctx.fillStyle = '#dbe5f1';
    ctx.fillRect(tLeft, tTop, tW, 5);
    // 행 구분선
    const rowScale = (tH - 5) / N_ROWS;
    for (let i = 0; i <= N_ROWS; i++) {
        const y = tTop + 5 + i * rowScale;
        ctx.beginPath();
        ctx.moveTo(tLeft, y); ctx.lineTo(tLeft + tW, y);
        ctx.strokeStyle = i % 2 === 0 ? '#e8e8e8' : '#f0f0f0';
        ctx.stroke();
        if (i % 2 === 0) {
            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(tLeft + 0.5, y, tW - 1, rowScale);
        }
    }

    // ─ 차트 영역 (오른쪽) ─
    const cLeft = tLeft + tW + 8, cTop = 4, cW = W - cLeft - 4, cH = H - 8;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#c8c6c4';
    ctx.lineWidth = 0.5;
    ctx.fillRect(cLeft, cTop, cW, cH);
    ctx.strokeRect(cLeft, cTop, cW, cH);
    // 차트 바
    const barW  = (cW - 8) / N_BARS - 2;
    const barAreaH = cH - 16;
    CHART_DATA.forEach((d, i) => {
        const bx = cLeft + 4 + i * (barW + 2);
        const bh = barAreaH * d.h / 100;
        const by = cTop + cH - 8 - bh;
        const colors = ['#5b9bd5','#5b9bd5','#5b9bd5','#5b9bd5','#70ad47','#ed7d31'];
        ctx.fillStyle = colors[i];
        ctx.fillRect(bx, by, barW, bh);
    });

    // ─ 셀구리 위치 ─
    // 테이블 위치 변환
    const tblTotalH = N_ROWS * ROW_H; // 500px
    const tblTotalW = TABLE_W;        // 310px
    let dotX, dotY;

    if (state.phase === 'table' || state.phase === 'fall') {
        const relY = (spritePos.top - PAD_T) / (tblTotalH + ROW_H); // 0~1
        const relX = (spritePos.left - PAD_L) / tblTotalW;
        dotX = tLeft + relX * tW;
        dotY = tTop + 5 + relY * (tH - 5);
    } else {
        // 차트 위치
        const relX = state.barIdx / N_BARS;
        const relY = 1 - state.barProg / 100;
        dotX = cLeft + 4 + relX * (cW - 8);
        dotY = cTop + cH - 8 - relY * barAreaH;
    }

    // 발광 효과
    const grd = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 5);
    grd.addColorStop(0, 'rgba(107, 197, 160, 1)');
    grd.addColorStop(1, 'rgba(107, 197, 160, 0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
    ctx.fill();
    // 셀구리 점
    ctx.fillStyle = '#217346';
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
}

// ── 등반 루프 ──────────────────────────────────────────
function tick() {
    if (!active) return;
    const sprite = document.getElementById('mp-sprite');
    if (!sprite) return;

    if (state.phase === 'table') {
        state.row++;
        sprite.classList.add('mps-struggle');
        speak(rand(SPEECHES.climb), 650);
        setTimeout(() => {
            if (!active) return;
            moveSpriteTo(tablePos(state.row));
            sprite.classList.remove('mps-struggle');
            if (state.row >= N_ROWS) {
                sprite.classList.add('mps-celebrate');
                speak(rand(SPEECHES.top), 1200);
                setTimeout(() => {
                    if (!active) return;
                    sprite.classList.remove('mps-celebrate');
                    state.phase = 'chart'; state.barIdx = 0; state.barProg = 0;
                    timer = setTimeout(tick, 1000);
                }, 1500);
                return;
            }
            timer = setTimeout(tick, 550 + Math.random() * 300);
        }, 300);

    } else if (state.phase === 'chart') {
        state.barProg += 22 + Math.random() * 14;
        sprite.classList.add('mps-struggle');
        speak(rand(SPEECHES.climb), 600);
        setTimeout(() => {
            if (!active) return;
            const pos = chartPos(state.barIdx, Math.min(state.barProg, 98));
            if (pos) moveSpriteTo(pos);
            sprite.classList.remove('mps-struggle');
            if (state.barProg >= 100) {
                if (state.barIdx < N_BARS - 1) {
                    speak(rand(SPEECHES.top), 700);
                    state.barIdx++; state.barProg = 0;
                    timer = setTimeout(tick, 900);
                } else {
                    sprite.classList.add('mps-celebrate');
                    speak(rand(SPEECHES.celebrate), 1500);
                    setTimeout(() => {
                        if (!active) return;
                        sprite.classList.remove('mps-celebrate');
                        fallDown();
                    }, 1800);
                }
                return;
            }
            timer = setTimeout(tick, 480 + Math.random() * 400);
        }, 300);
    }
}

function fallDown() {
    const sprite = document.getElementById('mp-sprite');
    if (!sprite) return;
    sprite.classList.add('mps-fall');
    speak(rand(SPEECHES.fall), 1000);
    setTimeout(() => moveSpriteTo(tablePos(0)), 80);
    setTimeout(() => {
        if (!active) return;
        sprite.classList.remove('mps-fall');
        speak(rand(SPEECHES.idle), 1200);
        state = { phase:'table', row:0, barIdx:0, barProg:0 };
        timer = setTimeout(tick, 2000);
    }, 1200);
}
