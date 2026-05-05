const SPEECHES   = ['...', '쉿', '천천히 순찰중', '업무중...', '데이터 확인', '휴식 승인'];
const STRAIN_MSG = ['으... 무거워', '낑낑...', '데이터 장벽!', '이쪽은 데이터 지대', '비켜요 비켜'];
import { initPattieWorld } from '../patties/PattieRoamingController.js';

const BOUNDS     = { minX: 50, maxX: 540, minY: 80, maxY: 500 };

const ROWS = [
    ['전략기획팀', '12,400', '11,200', '14,800', '13,900'],
    ['영업1팀',   '38,200', '41,500', '39,800', '44,200'],
    ['영업2팀',   '29,100', '31,400', '28,700', '33,600'],
    ['마케팅팀',  '8,500',  '9,200',  '11,400', '10,800'],
    ['개발1팀',   '5,200',  '5,800',  '6,100',  '6,700'],
    ['개발2팀',   '4,900',  '5,100',  '5,400',  '5,900'],
    ['디자인팀',  '3,800',  '4,200',  '4,100',  '4,600'],
    ['인사팀',    '2,100',  '2,300',  '2,200',  '2,400'],
    ['재무팀',    '1,800',  '1,900',  '2,100',  '2,000'],
    ['구매팀',    '6,700',  '7,100',  '6,800',  '7,500'],
    ['물류팀',    '9,300',  '9,800',  '10,200', '11,100'],
];

const BARS = [
    { label: 'Q1', h: 55, val: '162억', color: '#5b9bd5' },
    { label: 'Q2', h: 68, val: '174억', color: '#5b9bd5' },
    { label: 'Q3', h: 74, val: '183억', color: '#5b9bd5' },
    { label: 'Q4', h: 88, val: '200억', color: '#5b9bd5' },
    { label: '합계', h: 100, val: '720억', color: '#ed7d31' },
];

const PROJECT_ROWS = [
    ['Next-Gen ERP 고도화',    '85%', '진행중', '2026-12-31', '임부장'],
    ['Global Cloud Migration', '42%', '진행중', '2027-06-30', '김차장'],
    ['AI 챗봇 고객센터 연동',  '100%', '완료',  '2026-04-15', '이과장'],
    ['보안 취약점 정기 점검',  '10%', '대기',   '2026-05-20', '박대리'],
];

// Trend data: [목표달성률, 실적달성률] per month (Jan-Jun)
const TREND_TARGET = [72, 75, 78, 80, 83, 86];
const TREND_ACTUAL = [68, 71, 73, 82, 79, 85];

let active    = false;
let domBuilt  = false;
let wanderTimer = null;
let pet       = null;
let externalSpeechBound = false;

const rand = arr => arr[Math.floor(Math.random() * arr.length)];

export function initMiniPet() {
    buildDOM();
    bindExternalSpeech();

    const sheet = document.getElementById('mini-pet-sheet');
    if (!sheet) return;

    const checkDisplay = () => {
        const shown = sheet.style.display !== 'none';
        if (shown && !active) startWander();
        if (!shown && active) stopWander();
    };

    checkDisplay();
    new MutationObserver(checkDisplay).observe(sheet, { attributes: true, attributeFilter: ['style'] });
}

function startWander() {
    active = true;
    document.querySelectorAll('#mp-bars .mp-bar').forEach((bar, i) => {
        bar.style.height = '0%';
        setTimeout(() => {
            bar.style.transition = 'height .7s ease-out';
            bar.style.height = `${bar.dataset.h}%`;
        }, i * 120);
    });

    if (pet) {
        pet.cx = 80;
        pet.cy = 260;
        updatePetPos(pet);
        drawMap(pet.cx, pet.cy);
    }

    wanderTimer = setTimeout(wander, 2500);
}

function stopWander() {
    active = false;
    clearTimeout(wanderTimer);
}

function wander() {
    if (!active || !pet) return;

    const stepX = (Math.random() - 0.5) * 80;
    const stepY = (Math.random() - 0.5) * 60;
    pet.cx = clamp(pet.cx + stepX, BOUNDS.minX, BOUNDS.maxX);
    pet.cy = clamp(pet.cy + stepY, BOUNDS.minY, BOUNDS.maxY);
    updatePetPos(pet);
    drawMap(pet.cx, pet.cy);

    // Check if pet is on top of a data row → strain animation
    if (isPetOverData(pet.cx, pet.cy)) {
        pet.element.classList.add('mps-strain');
        speak(pet, rand(STRAIN_MSG), 2200);
        setTimeout(() => pet.element.classList.remove('mps-strain'), 1200);
    } else if (Math.random() < 0.25) {
        speak(pet, rand(SPEECHES), 2600);
    }

    wanderTimer = setTimeout(wander, 8000 + Math.random() * 5000);
}

function bindExternalSpeech() {
    if (externalSpeechBound) return;
    externalSpeechBound = true;
    document.addEventListener('refresheet:pet-say', event => {
        if (!pet) return;
        const { text, duration = 5000, manual = false } = event.detail || {};
        if (!text) return;
        speak(pet, text, duration, { manual });
    });
}

function isPetOverData(cx, cy) {
    const habitat = document.getElementById('mini-pet-habitat');
    if (!habitat) return false;
    const habitatRect = habitat.getBoundingClientRect();
    const petX = habitatRect.left + cx;
    const petY = habitatRect.top  + cy;

    for (const row of habitat.querySelectorAll('.mht-row:not(.mht-header)')) {
        const rect = row.getBoundingClientRect();
        if (petX >= rect.left && petX <= rect.right &&
            petY >= rect.top  && petY <= rect.bottom) return true;
    }
    return false;
}

function buildDOM() {
    if (domBuilt) return;
    const habitat = document.getElementById('mini-pet-habitat');
    if (!habitat) return;
    domBuilt = true;
    habitat.classList.add('pattie-world');

    // Main performance table
    const table = el('div', 'mp-table');
    table.id = 'mp-table';
    table.dataset.pattieZone = 'sheet';
    const header = el('div', 'mht-row mht-header');
    ['부서명', 'Q1', 'Q2', 'Q3', 'Q4'].forEach(text => {
        const cell = el('div', 'mht-cell');
        cell.textContent = text;
        header.appendChild(cell);
    });
    table.appendChild(header);
    ROWS.forEach((row, idx) => {
        const tableRow = el('div', `mht-row${idx % 2 === 0 ? ' mht-even' : ''}`);
        row.forEach((value, vi) => {
            const cell = el('div', `mht-cell${vi > 0 ? ' mht-num' : ''}`);
            cell.textContent = value;
            tableRow.appendChild(cell);
        });
        table.appendChild(tableRow);
    });

    // Project table
    const projectTable = el('div', 'mp-table proj-table');
    projectTable.dataset.pattieZone = 'sheet';
    const projectHeader = el('div', 'mht-row mht-header');
    ['주요 프로젝트명', '진척률', '상태', '마감기한', '담당자'].forEach(text => {
        const cell = el('div', 'mht-cell');
        cell.textContent = text;
        projectHeader.appendChild(cell);
    });
    projectTable.appendChild(projectHeader);
    PROJECT_ROWS.forEach((row, idx) => {
        const tableRow = el('div', `mht-row${idx % 2 === 0 ? ' mht-even' : ''}`);
        row.forEach(value => {
            const cell = el('div', 'mht-cell');
            cell.textContent = value;
            if (value === '완료')  cell.style.color = '#217346';
            if (value === '진행중') cell.style.color = '#0052cc';
            tableRow.appendChild(cell);
        });
        projectTable.appendChild(tableRow);
    });

    // Bar chart
    const chart = el('div', 'mp-chart');
    chart.id = 'mp-chart';
    chart.dataset.pattieZone = 'chart';
    const chartTitle = el('div', 'mp-chart-title');
    chartTitle.textContent = '분기별 실적 현황 (억원)';
    const bars = el('div', 'mp-bars');
    bars.id = 'mp-bars';
    BARS.forEach(data => {
        const column = el('div', 'mp-col');
        const value  = el('div', 'mp-val');
        const bar    = el('div', 'mp-bar');
        const label  = el('div', 'mp-lbl');
        value.textContent   = data.val;
        bar.style.height    = '0%';
        bar.style.background = data.color;
        bar.dataset.h       = data.h;
        bar.dataset.pattieTerrain = 'chart-bar';
        label.textContent   = data.label;
        column.append(value, bar, label);
        bars.appendChild(column);
    });
    chart.append(chartTitle, bars);

    // Trend line chart (SVG)
    const trend = buildTrendChart();
    trend.dataset.pattieZone = 'card';

    // Minimap
    const map = el('div', 'mp-minimap');
    map.dataset.pattieZone = 'card';
    map.innerHTML = `
        <div class="mp-minimap-title">실시간 분석 맵</div>
        <canvas id="mp-map-canvas" width="148" height="108"></canvas>
        <div class="mp-map-legend">
            <span style="color:#5b9bd5">■ 실적 데이터</span>
            <span style="color:#ed7d31">■ 요약 그래프</span>
            <span style="color:#111;font-weight:bold">● 분석 포인트</span>
        </div>`;

    habitat.append(table, projectTable, chart, trend, map);
    initPattieWorld(habitat);
}

function buildTrendChart() {
    const W = 148, H = 60;
    const padX = 10, padY = 6;
    const innerW = W - padX * 2;
    const innerH = H - padY * 2;
    const n = TREND_TARGET.length;

    function toSVGPoints(data) {
        return data.map((v, i) => {
            const x = padX + (i / (n - 1)) * innerW;
            const y = padY + (1 - (v - 60) / 40) * innerH;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
    }

    const wrap = el('div', 'mp-trend');
    wrap.innerHTML = `
        <div class="mp-minimap-title">월별 성과 트렌드</div>
        <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="mp-trend-svg">
            <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${H - padY}" stroke="#e0e0e0" stroke-width="1"/>
            <line x1="${padX}" y1="${H - padY}" x2="${W - padX}" y2="${H - padY}" stroke="#e0e0e0" stroke-width="1"/>
            <polyline points="${toSVGPoints(TREND_TARGET)}" fill="none" stroke="#5b9bd5" stroke-width="1.8"/>
            <polyline points="${toSVGPoints(TREND_ACTUAL)}" fill="none" stroke="#ed7d31" stroke-width="1.5" stroke-dasharray="3,2"/>
            ${TREND_ACTUAL.map((v, i) => {
                const x = padX + (i / (n - 1)) * innerW;
                const y = padY + (1 - (v - 60) / 40) * innerH;
                return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2" fill="#ed7d31"/>`;
            }).join('')}
        </svg>
        <div class="mp-map-legend">
            <span style="color:#5b9bd5">■ 목표</span>
            <span style="color:#ed7d31">■ 실적</span>
        </div>`;
    return wrap;
}

function createPet(parent) {
    const sprite = el('div', 'mp-sprite');
    sprite.id = 'mp-sprite-0';
    sprite.innerHTML = `
        <div class="mps-body">
            <div class="mps-eyes"><div class="mps-eye"></div><div class="mps-eye"></div></div>
            <div class="mps-mouth"></div>
        </div>
        <div class="mps-feet"><div class="mps-foot"></div><div class="mps-foot"></div></div>`;

    const bubble = el('div', 'mp-bubble');
    bubble.id = 'mp-bubble-0';
    parent.append(sprite, bubble);

    pet = { element: sprite, bubble, cx: 100, cy: 300, _t: null };
}

function updatePetPos(p) {
    p.element.style.left = `${p.cx}px`;
    p.element.style.top  = `${p.cy}px`;
    p.bubble.style.left  = `${p.cx - 8}px`;
    p.bubble.style.top   = `${p.cy - 30}px`;
}

function speak(p, text, duration = 1800, options = {}) {
    const manualSpeechUntil = window.refresheetManualPetSpeechUntil || 0;
    if (!options.manual && Date.now() < manualSpeechUntil) return;

    clearTimeout(p._t);
    p.bubble.classList.remove('visible');
    p.bubble.textContent = text;
    requestAnimationFrame(() => p.bubble.classList.add('visible'));
    p._t = setTimeout(() => p.bubble.classList.remove('visible'), duration);
}

function drawMap(px, py) {
    const canvas = document.getElementById('mp-map-canvas');
    if (!canvas) return;
    const W = 148, H = 108;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f7f7f7'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#d0d0d0';
    ctx.fillRect(10, 10, 60, 80); ctx.strokeRect(10, 10, 60, 80);
    ctx.fillRect(80, 10, 50, 40); ctx.strokeRect(80, 10, 50, 40);
    const dotX = px * (W / 800) + 10;
    const dotY = py * (H / 600) + 10;
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(dotX, dotY, 3, 0, Math.PI * 2); ctx.fill();
}

function el(tag, className) {
    const e = document.createElement(tag);
    e.className = className;
    return e;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
