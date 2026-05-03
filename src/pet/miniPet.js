// miniPet.js v4 - 랜덤 배회 + 서식지 맵

const SPEECHES = ['...', '쉿!', '( ˘ ˘ )', '낑낑', '영차!', '조용히', '냠냠', '( ˘▽˘)', '구경중', '*..*'];

// 배회 범위 (mp-scene 기준 px) - 테이블+차트 영역
const BOUNDS = { minX: 44, maxX: 560, minY: 22, maxY: 510 };

const TABLE_DATA = {
    headers: ['부서명','Q1','Q2','Q3','Q4'],
    rows: [
        ['전략기획팀','12,400','11,200','14,800','13,900'],
        ['영업1팀',  '38,200','41,500','39,800','44,200'],
        ['영업2팀',  '29,100','31,400','28,700','33,600'],
        ['마케팅팀', '8,500', '9,200','11,400','10,800'],
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
    { label:'Q1',   h:55,  val:'162억' },
    { label:'Q2',   h:68,  val:'174억' },
    { label:'Q3',   h:74,  val:'183억' },
    { label:'Q4',   h:88,  val:'200억' },
    { label:'목표', h:95,  val:'210억' },
    { label:'합계', h:100, val:'720억' },
];

let active   = false;
let domBuilt = false;
let timer    = null;
let curX = 100, curY = 200;

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── 진입점 ──────────────────────────────────────────────
export function initMiniPet() {
    buildDOM();
    document.addEventListener('click', e => {
        const tab = e.target.closest('.tab');
        if (!tab) return;
        if (tab.dataset.sheet === 'mini-pet') {
            requestAnimationFrame(() => requestAnimationFrame(start));
        } else {
            active = false;
            clearTimeout(timer);
        }
    });
}

function start() {
    if (active) return;
    active = true;
    animateBars();
    // 초기 위치: 테이블 왼쪽 아래
    curX = 60; curY = 480;
    moveTo(curX, curY);
    timer = setTimeout(wander, 1000);
}

// ── 배회 루프 ────────────────────────────────────────────
function wander() {
    if (!active) return;
    curX = BOUNDS.minX + Math.random() * (BOUNDS.maxX - BOUNDS.minX);
    curY = BOUNDS.minY + Math.random() * (BOUNDS.maxY - BOUNDS.minY);
    moveTo(curX, curY);
    if (Math.random() < 0.55) speak(rand(SPEECHES), 900);
    drawMinimap(curX, curY);
    timer = setTimeout(wander, 1200 + Math.random() * 1800);
}

// ── DOM 구성 ─────────────────────────────────────────────
function buildDOM() {
    if (domBuilt) return;
    const habitat = document.getElementById('mini-pet-habitat');
    if (!habitat) return;
    domBuilt = true;

    // 실적장표
    const tbl = document.createElement('div');
    tbl.id = 'mp-table'; tbl.className = 'mp-table';
    const hdr = document.createElement('div');
    hdr.className = 'mht-row mht-header';
    TABLE_DATA.headers.forEach(h => {
        const c = document.createElement('div');
        c.className = 'mht-cell'; c.textContent = h; hdr.appendChild(c);
    });
    tbl.appendChild(hdr);
    TABLE_DATA.rows.forEach((row, i) => {
        const r = document.createElement('div');
        r.className = 'mht-row' + (i % 2 === 0 ? ' mht-even' : '');
        row.forEach((cell, j) => {
            const c = document.createElement('div');
            c.className = 'mht-cell' + (j > 0 ? ' mht-num' : '');
            c.textContent = cell; r.appendChild(c);
        });
        tbl.appendChild(r);
    });

    // 차트
    const cht = document.createElement('div');
    cht.id = 'mp-chart'; cht.className = 'mp-chart';
    const ct = document.createElement('div');
    ct.className = 'mp-chart-title'; ct.textContent = '분기별 실적 현황 (억원)';
    const bars = document.createElement('div');
    bars.id = 'mp-bars'; bars.className = 'mp-bars';
    CHART_DATA.forEach((d, i) => {
        const col = document.createElement('div');
        col.className = 'mp-col'; col.dataset.i = i;
        const val = document.createElement('div');
        val.className = 'mp-val'; val.textContent = d.val;
        const bar = document.createElement('div');
        bar.className = 'mp-bar'; bar.style.height = '0%'; bar.dataset.h = d.h;
        const lbl = document.createElement('div');
        lbl.className = 'mp-lbl'; lbl.textContent = d.label;
        col.append(val, bar, lbl); bars.appendChild(col);
    });
    cht.append(ct, bars);

    // 서식지 맵
    const map = document.createElement('div');
    map.className = 'mp-minimap';
    map.innerHTML = `
        <div class="mp-minimap-title">📍 서식지 맵</div>
        <canvas id="mp-map-canvas" width="148" height="108"></canvas>
        <div class="mp-minimap-legend">
            <span style="color:#5b9bd5">■ 실적장표</span>
            <span style="color:#ed7d31">■ 실적그래프</span>
            <span style="color:#217346;font-weight:bold">● 셀구리</span>
        </div>`;

    // 스프라이트
    const sprite = document.createElement('div');
    sprite.id = 'mp-sprite'; sprite.className = 'mp-sprite';
    sprite.innerHTML = `
        <div class="mps-body">
            <div class="mps-antenna"></div>
            <div class="mps-eyes"><div class="mps-eye"></div><div class="mps-eye"></div></div>
            <div class="mps-cheeks"><div class="mps-cheek"></div><div class="mps-cheek"></div></div>
        </div>
        <div class="mps-feet"><div class="mps-foot"></div><div class="mps-foot"></div></div>`;

    // 말풍선
    const bubble = document.createElement('div');
    bubble.id = 'mp-bubble'; bubble.className = 'mp-bubble';

    habitat.append(tbl, cht, map, sprite, bubble);
}

// ── 이동 ────────────────────────────────────────────────
function moveTo(x, y) {
    const s = document.getElementById('mp-sprite');
    const b = document.getElementById('mp-bubble');
    if (!s) return;
    s.style.left = x + 'px';
    s.style.top  = y + 'px';
    if (b) { b.style.left = (x - 8) + 'px'; b.style.top = (y - 26) + 'px'; }
}

// ── 말풍선 ───────────────────────────────────────────────
function speak(text, dur = 1000) {
    const b = document.getElementById('mp-bubble');
    if (!b) return;
    b.textContent = text;
    b.classList.add('visible');
    clearTimeout(b._t);
    b._t = setTimeout(() => b.classList.remove('visible'), dur);
}

// ── 차트 바 등장 ─────────────────────────────────────────
function animateBars() {
    document.querySelectorAll('#mp-bars .mp-bar').forEach((bar, i) => {
        bar.style.height = '0%';
        setTimeout(() => {
            bar.style.transition = 'height 0.7s ease-out';
            bar.style.height = bar.dataset.h + '%';
        }, i * 120);
    });
}

// ── 서식지 맵 캔버스 ─────────────────────────────────────
// 실제 화면 좌표 → 캔버스 좌표 스케일
// 배회 범위: x 44~560(516px), y 22~510(488px)
// 캔버스: 148×108px
const MAP_W = 148, MAP_H = 108;
const SCALE_X = MAP_W / (BOUNDS.maxX - BOUNDS.minX + 80);
const SCALE_Y = MAP_H / (BOUNDS.maxY - BOUNDS.minY + 40);

// 실적장표 캔버스 위치 (실제 px 기준 변환)
// Table: x=44, y=22, w=310, h=525 (25px × 21행)
const TL = (44  - BOUNDS.minX + 40) * SCALE_X;
const TT = (22  - BOUNDS.minY + 20) * SCALE_Y;
const TW = 310 * SCALE_X;
const TH = 525 * SCALE_Y;

// Chart: x=378(44+310+24), y=22, w=220
const CL = (378 - BOUNDS.minX + 40) * SCALE_X;
const CT_ = TT;
const CW = 220 * SCALE_X;
const CH_ = TH;

function drawMinimap(px, py) {
    const canvas = document.getElementById('mp-map-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, MAP_W, MAP_H);

    // 배경
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // ── 실적장표 ──────────────────────────────────
    // 배경
    ctx.fillStyle = '#fff';
    ctx.fillRect(TL, TT, TW, TH);
    // 헤더
    const hH = 25 * SCALE_Y;
    ctx.fillStyle = '#dbe5f1';
    ctx.fillRect(TL, TT, TW, hH);
    // 열 구분
    const colW = [110, 50, 50, 50].map(w => w * SCALE_X);
    let cx = TL;
    colW.forEach(w => {
        cx += w;
        ctx.strokeStyle = '#c8c6c4'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(cx, TT); ctx.lineTo(cx, TT + TH); ctx.stroke();
    });
    // 행 구분
    for (let i = 0; i <= 20; i++) {
        const ry = TT + hH + i * 25 * SCALE_Y;
        ctx.fillStyle = i % 2 === 0 ? '#f9f9f9' : '#fff';
        ctx.fillRect(TL + 0.5, ry, TW - 1, 25 * SCALE_Y);
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 0.3;
        ctx.beginPath(); ctx.moveTo(TL, ry); ctx.lineTo(TL + TW, ry); ctx.stroke();
    }
    // 테두리
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1;
    ctx.strokeRect(TL, TT, TW, TH);

    // 라벨
    ctx.fillStyle = '#1f3864'; ctx.font = 'bold 7px sans-serif';
    ctx.fillText('실적장표', TL + 2, TT + hH - 2);

    // ── 실적그래프 ─────────────────────────────────
    ctx.fillStyle = '#fff';
    ctx.fillRect(CL, CT_, CW, CH_);
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1;
    ctx.strokeRect(CL, CT_, CW, CH_);

    // 타이틀 배경
    const ctH = 28 * SCALE_Y;
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(CL, CT_, CW, ctH);
    ctx.fillStyle = '#1f3864'; ctx.font = 'bold 6px sans-serif';
    ctx.fillText('분기별 실적', CL + 2, CT_ + ctH - 2);

    // 바
    const barAreaTop = CT_ + ctH + 8 * SCALE_Y;
    const barAreaH   = CH_ - ctH - 16 * SCALE_Y;
    const bW = (CW - 10 * SCALE_X) / 6 - 1;
    const bColors = ['#5b9bd5','#5b9bd5','#5b9bd5','#5b9bd5','#70ad47','#ed7d31'];
    CHART_DATA.forEach((d, i) => {
        const bX = CL + 5 * SCALE_X + i * (bW + 1);
        const bH2 = barAreaH * d.h / 100;
        const bY = barAreaTop + barAreaH - bH2;
        ctx.fillStyle = bColors[i];
        ctx.fillRect(bX, bY, bW, bH2);
    });

    // ── 셀구리 위치 ──────────────────────────────────
    const dotX = (px - BOUNDS.minX + 40) * SCALE_X;
    const dotY = (py - BOUNDS.minY + 20) * SCALE_Y;

    // 발광
    const grd = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 7);
    grd.addColorStop(0, 'rgba(107,197,160,0.9)');
    grd.addColorStop(1, 'rgba(107,197,160,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(dotX, dotY, 7, 0, Math.PI * 2); ctx.fill();

    // 점
    ctx.fillStyle = '#217346';
    ctx.beginPath(); ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.stroke();
}
