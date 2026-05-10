import { getPattieWorld, initPattieWorld } from '../patties/PattieRoamingController.js';

const SALES_ROWS = [
    ['Strategy', '12,400', '11,200', '14,800', '13,900'],
    ['Online', '38,200', '41,500', '39,800', '44,200'],
    ['Offline', '29,100', '31,400', '28,700', '33,600'],
    ['Marketing', '8,500', '9,200', '11,400', '10,800'],
    ['Product', '5,200', '5,800', '6,100', '6,700'],
    ['Ops', '4,900', '5,100', '5,400', '5,900'],
    ['Design', '3,800', '4,200', '4,100', '4,600'],
    ['HR', '2,100', '2,300', '2,200', '2,400'],
    ['Finance', '1,800', '1,900', '2,100', '2,000'],
    ['Purchase', '6,700', '7,100', '6,800', '7,500'],
    ['Logistics', '9,300', '9,800', '10,200', '11,100'],
];

const PROJECT_ROWS = [
    ['Next-Gen ERP 고도화', '85%', '진행중', '2026-12-31', '임부장'],
    ['Global Cloud Migration', '42%', '진행중', '2027-06-30', '김차장'],
    ['AI 챗봇 고객센터 연동', '100%', '완료', '2026-04-15', '이과장'],
    ['보안 취약점 정기 점검', '10%', '대기', '2026-05-20', '박대리'],
];

const WEEKLY_SALES = [
    { label: 'Mon', online: 48, offline: 34, onlineVal: '4.8', offlineVal: '3.4' },
    { label: 'Tue', online: 62, offline: 42, onlineVal: '6.2', offlineVal: '4.2' },
    { label: 'Wed', online: 54, offline: 58, onlineVal: '5.4', offlineVal: '5.8' },
    { label: 'Thu', online: 76, offline: 51, onlineVal: '7.6', offlineVal: '5.1' },
    { label: 'Fri', online: 88, offline: 64, onlineVal: '8.8', offlineVal: '6.4' },
    { label: 'Sat', online: 68, offline: 71, onlineVal: '6.8', offlineVal: '7.1' },
    { label: 'Sun', online: 57, offline: 46, onlineVal: '5.7', offlineVal: '4.6' },
];

const TREND_TARGET = [72, 75, 78, 80, 83, 86];
const TREND_ACTUAL = [68, 71, 73, 82, 79, 85];

let active = false;
let domBuilt = false;
let externalSpeechBound = false;

export function initMiniPet() {
    buildDOM();
    bindExternalSpeech();

    const sheet = document.getElementById('mini-pet-sheet');
    if (!sheet) return;

    const checkDisplay = () => {
        const shown = sheet.style.display !== 'none';
        if (shown && !active) startScene();
        if (!shown && active) stopScene();
    };

    checkDisplay();
    new MutationObserver(checkDisplay).observe(sheet, { attributes: true, attributeFilter: ['style'] });
}

function startScene() {
    active = true;
    document.querySelectorAll('#mp-bars .mp-bar').forEach((bar, i) => {
        bar.style.height = '0%';
        setTimeout(() => {
            bar.style.transition = 'height .7s ease-out';
            bar.style.height = `${bar.dataset.h}%`;
        }, i * 70);
    });
    const world = getPattieWorld();
    if (world?.sprite) world.start();
}

function stopScene() {
    active = false;
    getPattieWorld()?.stop();
}

function bindExternalSpeech() {
    if (externalSpeechBound) return;
    externalSpeechBound = true;
    document.addEventListener('refresheet:pet-say', event => {
        if (event.detail?.manual) getPattieWorld()?.happy();
    });
}

function buildDOM() {
    if (domBuilt) return;
    const habitat = document.getElementById('mini-pet-habitat');
    if (!habitat) return;
    domBuilt = true;

    const table = buildSalesTable();
    const projectTable = buildProjectTable();
    const trend = buildTrendChart();
    trend.dataset.pattieZone = 'card';
    const analysis = buildAnalysisCard();
    analysis.dataset.pattieZone = 'card';
    const chart = buildWeeklySalesChart();

    habitat.append(table, projectTable, trend, analysis, chart);
    initPattieWorld(chart).then((world) => {
        if (!active) world?.stop();
    });
}

function buildSalesTable() {
    const table = el('div', 'mp-table');
    table.id = 'mp-table';
    table.dataset.pattieZone = 'sheet';
    table.append(row(['부서명', 'Q1', 'Q2', 'Q3', 'Q4'], 'mht-row mht-header'));
    SALES_ROWS.forEach((values, idx) => table.append(row(values, `mht-row${idx % 2 === 0 ? ' mht-even' : ''}`)));
    return table;
}

function buildProjectTable() {
    const table = el('div', 'mp-table proj-table');
    table.dataset.pattieZone = 'sheet';
    table.append(row(['주요 프로젝트명', '진척률', '상태', '마감기한', '담당자'], 'mht-row mht-header'));
    PROJECT_ROWS.forEach((values, idx) => {
        const tr = row(values, `mht-row${idx % 2 === 0 ? ' mht-even' : ''}`);
        table.append(tr);
    });
    return table;
}

function buildWeeklySalesChart() {
    const chart = el('div', 'mp-chart');
    chart.id = 'mp-chart';
    chart.dataset.pattieZone = 'chart';

    const title = el('div', 'mp-chart-title');
    title.textContent = '주간 매출 추이';
    const legend = el('div', 'mp-chart-legend');
    legend.innerHTML = `
        <span><i class="mp-dot mp-dot-online"></i>온라인</span>
        <span><i class="mp-dot mp-dot-offline"></i>오프라인</span>`;
    const bars = el('div', 'mp-bars');
    bars.id = 'mp-bars';

    WEEKLY_SALES.forEach(data => {
        const column = el('div', 'mp-col');
        const pair = el('div', 'mp-bar-pair');
        const online = el('div', 'mp-bar mp-bar-online');
        const offline = el('div', 'mp-bar mp-bar-offline');
        const label = el('div', 'mp-lbl');
        online.dataset.h = data.online;
        offline.dataset.h = data.offline;
        online.dataset.value = data.onlineVal;
        offline.dataset.value = data.offlineVal;
        online.dataset.pattieTerrain = 'chart-bar';
        offline.dataset.pattieTerrain = 'chart-bar';
        online.style.height = '0%';
        offline.style.height = '0%';
        label.textContent = data.label;
        pair.append(online, offline);
        column.append(pair, label);
        bars.append(column);
    });

    chart.append(title, legend, bars);
    return chart;
}

function buildTrendChart() {
    const w = 148;
    const h = 60;
    const padX = 10;
    const padY = 6;
    const innerW = w - padX * 2;
    const innerH = h - padY * 2;
    const n = TREND_TARGET.length;
    const points = data => data.map((v, i) => {
        const x = padX + (i / (n - 1)) * innerW;
        const y = padY + (1 - (v - 60) / 40) * innerH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const wrap = el('div', 'mp-trend');
    wrap.innerHTML = `
        <div class="mp-minimap-title">월별 성과 트렌드</div>
        <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="mp-trend-svg">
            <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${h - padY}" stroke="#e0e0e0" stroke-width="1"/>
            <line x1="${padX}" y1="${h - padY}" x2="${w - padX}" y2="${h - padY}" stroke="#e0e0e0" stroke-width="1"/>
            <polyline points="${points(TREND_TARGET)}" fill="none" stroke="#5b9bd5" stroke-width="1.8"/>
            <polyline points="${points(TREND_ACTUAL)}" fill="none" stroke="#ed7d31" stroke-width="1.5" stroke-dasharray="3,2"/>
        </svg>
        <div class="mp-map-legend">
            <span style="color:#5b9bd5">목표</span>
            <span style="color:#ed7d31">실적</span>
        </div>`;
    return wrap;
}

function buildAnalysisCard() {
    const card = el('div', 'mp-minimap');
    card.innerHTML = `
        <div class="mp-minimap-title">실시간 분석 맵</div>
        <canvas id="mp-map-canvas" width="148" height="108"></canvas>
        <div class="mp-map-legend">
            <span style="color:#5b9bd5">실적 데이터</span>
            <span style="color:#ed7d31">요약 그래프</span>
            <span style="color:#111;font-weight:bold">분석 포인트</span>
        </div>`;
    return card;
}

function row(values, className) {
    const tr = el('div', className);
    values.forEach((value, index) => {
        const cell = el('div', `mht-cell${index > 0 ? ' mht-num' : ''}`);
        cell.textContent = value;
        tr.append(cell);
    });
    return tr;
}

function el(tag, className) {
    const node = document.createElement(tag);
    node.className = className;
    return node;
}
