import { getPattieWorld, initPattieWorld } from '../patties/PattieRoamingController.js';
import { PattieApple } from '../patties/PattieApple.js';
import {
    loadEconomy, getEconomyState, changeHappiness, purchaseItem, ECONOMY_EVENT,
} from '../patties/pattieEconomy.js';

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
    { label: 'W1', online: 30, offline: 22, onlineVal: '3.0', offlineVal: '2.2' },
    { label: 'W2', online: 42, offline: 32, onlineVal: '4.2', offlineVal: '3.2' },
    { label: 'W3', online: 54, offline: 44, onlineVal: '5.4', offlineVal: '4.4' },
    { label: 'W4', online: 64, offline: 52, onlineVal: '6.4', offlineVal: '5.2' },
    { label: 'W5', online: 56, offline: 44, onlineVal: '5.6', offlineVal: '4.4' },
    { label: 'W6', online: 68, offline: 56, onlineVal: '6.8', offlineVal: '5.6' },
    { label: 'W7', online: 55, offline: 42, onlineVal: '5.5', offlineVal: '4.2' },
];

const TREND_TARGET = [72, 75, 78, 80, 83, 86];
const TREND_ACTUAL = [68, 71, 73, 82, 79, 85];

let active = false;
let domBuilt = false;
let externalSpeechBound = false;
let appleController = null; // PattieApple 인스턴스

export function initMiniPet() {
    buildDOM();
    bindExternalSpeech();
    bindEconomyEvents();

    const sheet = document.getElementById('mini-pet-sheet');
    if (!sheet) return;

    const checkDisplay = () => {
        const shown = sheet.style.display !== 'none';
        if (shown && !active) startScene();
        if (!shown && active) stopScene();
    };

    checkDisplay();
    new MutationObserver(checkDisplay).observe(sheet, { attributes: true, attributeFilter: ['style'] });

    // 관리시트 진입 시 economy 로드
    loadEconomy();
}

async function startScene() {
    active = true;
    document.querySelectorAll('#mp-bars .mp-bar').forEach((bar, i) => {
        bar.style.height = '0%';
        setTimeout(() => {
            bar.style.transition = 'height .7s ease-out';
            bar.style.height = `${bar.dataset.h}%`;
        }, i * 70);
    });
    const chart = document.getElementById('mp-chart');
    if (!chart) return;
    await waitForVisibleChart(chart);
    const world = await initPattieWorld(chart);
    if (!active) {
        world?.stop();
        return;
    }
    await waitForVisibleChart(chart);
    updateChartTitle(world.profile.nickname);
    world.placeAtFirstZone();
    world.start();

    // PattieApple 초기화 (토닥이 맵 기준)
    if (!appleController) {
        appleController = new PattieApple({
            mapEl: chart,
            roamingController: world,
            onFed: handleAppleFed,
        });
    }
}

function waitForVisibleChart(chart) {
    return new Promise(resolve => {
        let tries = 0;
        const check = () => {
            tries += 1;
            if (chart.clientWidth > 0 && chart.clientHeight > 0) {
                resolve();
                return;
            }
            if (tries > 20) {
                resolve();
                return;
            }
            requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
    });
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
    document.addEventListener('refresheet:pattie-profile-updated', event => {
        updateChartTitle(event.detail?.nickname);
    });
    // 토닥여주기: happy 이벤트 → 행복점수 증가 (일일 3회 제한은 서버에서 처리)
    document.addEventListener('refresheet:pattie-happy', () => {
        if (window.refresheetAuth?.authenticated) {
            changeHappiness('PET').catch(() => {});
        }
    });
}

function updateChartTitle(nickname) {
    const titleEl = document.getElementById('mp-chart-title');
    if (!titleEl) return;
    const name = truncateName(nickname || 'Mong');
    titleEl.textContent = `주간 매출 추이  ·  프로덕트명 : ${name}`;
}

function truncateName(name) {
    if (!name) return '';
    const hasKorean = /[가-힣]/.test(name);
    const maxLen = hasKorean ? 10 : 20;
    return name.length > maxLen ? name.slice(0, maxLen) : name;
}

function buildDOM() {
    if (domBuilt) return;
    const habitat = document.getElementById('mini-pet-habitat');
    if (!habitat) return;
    domBuilt = true;

    const table = buildSalesTable();
    const projectTable = buildProjectTable();
    const dashboardMain = el('div', 'mp-dashboard-main-section');
    const analysisRow = el('div', 'mp-analysis-row');
    const trend = buildTrendChart();
    trend.dataset.pattieZone = 'card';
    const analysis = buildAnalysisCard();
    analysis.dataset.pattieZone = 'card';
    const chart = buildWeeklySalesChart();
    // 토닥이 관리박스 (좌측 하단)
    const manageBox = buildManageBox();

    analysisRow.append(trend, analysis);
    dashboardMain.append(projectTable, analysisRow);
    habitat.append(table, dashboardMain, manageBox, chart);
    requestAnimationFrame(renderRealtimeAnalysis);
    observeRealtimeAnalysis();
}

// ── 토닥이 관리박스 (좌측 하단) ──────────────────────────────────────────────

function buildManageBox() {
    const box = el('div', 'mp-manage-box');
    box.id = 'mp-manage-box';

    // 1) 현재 보유 포인트
    const pointsRow = el('div', 'mp-manage-row mp-manage-points');
    pointsRow.innerHTML = `
        <span class="mp-coin-icon" aria-hidden="true">🪙</span>
        <span class="mp-manage-label">현재 보유 포인트</span>
        <span class="mp-points-value" id="mp-points-value">0p</span>`;

    // 2) 행복점수
    const happySection = el('div', 'mp-manage-row mp-manage-happy');
    happySection.innerHTML = `
        <div class="mp-happy-header">
            <span class="mp-manage-label">토닥이 행복점수</span>
            <span class="mp-happy-score" id="mp-happy-score">40점</span>
        </div>
        <div class="mp-happy-bar-wrap">
            <div class="mp-happy-bar" id="mp-happy-bar" style="width:40%"></div>
            <div class="mp-happy-marker" id="mp-happy-marker" style="left:40%"></div>
        </div>`;

    // 3) 토닥여주기 설명
    const petDesc = el('div', 'mp-manage-row mp-manage-desc');
    petDesc.innerHTML = `<p class="mp-desc-text"><strong>토닥여주기</strong> : 토닥이를 마우스로 클릭해보세요. 토닥이가 행복해져요. 단, 행복점수가 오르는 것은 1일 3회</p>`;

    // 4) 간식주기 설명 + 구매 버튼
    const feedDesc = el('div', 'mp-manage-row mp-manage-desc');
    feedDesc.innerHTML = `
        <p class="mp-desc-text"><strong>간식주기</strong> : 토닥이 맵에는 토닥이 간식주기 옵션이 있어요. 간식주기를 누르고 맵 원하는 곳에 떨어뜨려보세요. 토닥이는 간식을 먹으면 행복점수가 많이 올라요.</p>
        <button class="mp-buy-btn" id="mp-buy-apple-btn">먹이 구매하기</button>`;

    // 5) 말걸기 설명
    const talkDesc = el('div', 'mp-manage-row mp-manage-desc');
    talkDesc.innerHTML = `<p class="mp-desc-text"><strong>말 걸기</strong> : 토닥이에게 말을 걸어보세요. 선택한 기분에 맞춰 토닥이가 반응해요.</p>`;

    // 6) 말걸기 nested box (기존 버튼 6개)
    const talkBox = buildTalkBox();

    box.append(pointsRow, happySection, petDesc, feedDesc, talkDesc, talkBox);

    // 구매 팝업 연결
    box.addEventListener('click', e => {
        if (e.target.id === 'mp-buy-apple-btn') openPurchaseModal();
    });

    return box;
}

function buildTalkBox() {
    const box = el('div', 'mp-talk-box');
    box.innerHTML = `
        <div class="mp-talk-buttons">
            <button class="mp-talk-btn" id="btn-pet-stress">스트레스</button>
            <button class="mp-talk-btn" id="btn-pet-manager">팀장</button>
            <button class="mp-talk-btn" id="btn-pet-tired">피곤함</button>
            <button class="mp-talk-btn" id="btn-pet-hard">힘든 날</button>
            <button class="mp-talk-btn" id="btn-pet-encourage">응원</button>
            <button class="mp-talk-btn" id="btn-pet-secret">비밀작전</button>
        </div>`;
    return box;
}

// ── 구매 모달 ─────────────────────────────────────────────────────────────────

function openPurchaseModal() {
    const existing = document.getElementById('mp-purchase-modal');
    if (existing) { existing.remove(); return; }

    const state = getEconomyState();
    const modal = el('div', 'mp-purchase-modal');
    modal.id = 'mp-purchase-modal';
    modal.innerHTML = `
        <div class="mp-purchase-inner">
            <button class="mp-purchase-close" id="mp-purchase-close" aria-label="닫기">✕</button>
            <div class="mp-purchase-header">
                <img src="/public/assets/apple/apple_idle..png" class="mp-purchase-icon" width="32" height="32" alt="사과">
                <span class="mp-purchase-title">사과 구매</span>
                <span class="mp-purchase-price">300p / 개</span>
            </div>
            <div class="mp-purchase-qty-row">
                <button class="mp-qty-btn" id="mp-qty-minus">-</button>
                <span class="mp-qty-val" id="mp-qty-val">1</span>
                <button class="mp-qty-btn" id="mp-qty-plus">+</button>
            </div>
            <div class="mp-purchase-total">합계: <span id="mp-purchase-total-val">300p</span></div>
            <div class="mp-purchase-balance">보유: ${state.points.current}p</div>
            <button class="mp-purchase-confirm" id="mp-purchase-confirm">구매하기</button>
            <div class="mp-purchase-msg" id="mp-purchase-msg"></div>
        </div>`;

    document.body.appendChild(modal);

    let qty = 1;
    const updateDisplay = () => {
        document.getElementById('mp-qty-val').textContent = qty;
        document.getElementById('mp-purchase-total-val').textContent = `${300 * qty}p`;
    };

    modal.addEventListener('click', async e => {
        if (e.target.id === 'mp-purchase-close') { modal.remove(); return; }
        if (e.target.id === 'mp-qty-minus') { qty = Math.max(1, qty - 1); updateDisplay(); return; }
        if (e.target.id === 'mp-qty-plus') { qty = Math.min(99, qty + 1); updateDisplay(); return; }
        if (e.target.id === 'mp-purchase-confirm') {
            const btn = e.target;
            btn.disabled = true;
            const msgEl = document.getElementById('mp-purchase-msg');
            const result = await purchaseItem('apple', qty);
            if (result.ok) {
                msgEl.textContent = `구매 완료! 사과 ${qty}개 추가`;
                msgEl.style.color = '#217346';
                updateAppleHUD();
                updatePointsDisplay();
                setTimeout(() => modal.remove(), 1200);
            } else {
                const msg = result.data?.message || '구매에 실패했습니다';
                msgEl.textContent = msg;
                msgEl.style.color = '#c0392b';
                btn.disabled = false;
            }
        }
    });

    // 모달 바깥 클릭 시 닫기
    setTimeout(() => {
        document.addEventListener('click', function outsideClose(e) {
            if (!modal.contains(e.target) && e.target.id !== 'mp-buy-apple-btn') {
                modal.remove();
                document.removeEventListener('click', outsideClose);
            }
        });
    }, 50);
}

// ── Economy UI 갱신 함수들 ───────────────────────────────────────────────────

function updatePointsDisplay() {
    const state = getEconomyState();
    const el = document.getElementById('mp-points-value');
    if (el) el.textContent = `${state.points.current}p`;
}

function updateHappinessDisplay() {
    const state = getEconomyState();
    const score = state.happiness.current_score;
    const scoreEl = document.getElementById('mp-happy-score');
    const barEl   = document.getElementById('mp-happy-bar');
    const markerEl = document.getElementById('mp-happy-marker');
    if (scoreEl) scoreEl.textContent = `${score}점`;
    const pct = Math.round(score); // 0~100 기준
    if (barEl) barEl.style.width = `${pct}%`;
    if (markerEl) markerEl.style.left = `${pct}%`;
}

function updateAppleHUD() {
    const state = getEconomyState();
    const qty = state.inventory.apple || 0;
    const el = document.getElementById('mp-apple-hud-count');
    if (el) el.textContent = `× ${qty}`;
    // 간식주기 버튼 활성/비활성
    const feedBtn = document.getElementById('mp-feed-btn');
    if (feedBtn) feedBtn.disabled = qty <= 0;
}

function bindEconomyEvents() {
    document.addEventListener(ECONOMY_EVENT, () => {
        updatePointsDisplay();
        updateHappinessDisplay();
        updateAppleHUD();
    });
}

// ── 간식 먹기 완료 콜백 ──────────────────────────────────────────────────────

async function handleAppleFed() {
    const result = await changeHappiness('FEED');
    if (result.ok) {
        updateHappinessDisplay();
        updateAppleHUD();
    } else {
        // no_apple 에러 등 UI에 안내
        console.warn('[MiniPet] FEED 행복 변경 실패:', result.error);
    }
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
    title.id = 'mp-chart-title';
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

    // 토닥이 맵 우상단 버튼 영역
    const mapActions = el('div', 'mp-map-actions');
    mapActions.innerHTML = `
        <div class="mp-apple-hud">
            <img src="/public/assets/apple/apple_idle..png" class="mp-apple-hud-icon" width="18" height="18" alt="사과">
            <span class="mp-apple-hud-count" id="mp-apple-hud-count">× 0</span>
        </div>
        <button class="mp-feed-btn" id="mp-feed-btn" disabled>간식주기</button>`;

    mapActions.addEventListener('click', e => {
        if (e.target.id === 'mp-feed-btn' || e.target.closest('#mp-feed-btn')) {
            const state = getEconomyState();
            if ((state.inventory.apple || 0) <= 0) {
                alert('사과가 없어요. 먼저 간식을 구매해주세요!');
                return;
            }
            if (appleController && !appleController.processing) {
                appleController.startFeedMode();
                const btn = document.getElementById('mp-feed-btn');
                if (btn) { btn.textContent = '취소'; btn.classList.add('mp-feed-btn--active'); }
            } else if (appleController?.feedMode) {
                appleController.stopFeedMode();
                const btn = document.getElementById('mp-feed-btn');
                if (btn) { btn.textContent = '간식주기'; btn.classList.remove('mp-feed-btn--active'); }
            }
        }
    });

    chart.append(title, legend, mapActions, bars);
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
        <div class="mp-minimap-body">
            <div class="mp-minimap-col mp-minimap-col--data">
                <div class="mp-minimap-col-hd" style="color:#5b9bd5">실적 데이터</div>
                <div class="mp-minimap-kpis">
                    <div class="mp-minimap-kpi">
                        <span class="mp-mk-label">온라인</span>
                        <span class="mp-mk-val" style="color:#5b9bd5">+14%</span>
                    </div>
                    <div class="mp-minimap-kpi">
                        <span class="mp-mk-label">오프라인</span>
                        <span class="mp-mk-val" style="color:#ed7d31">+9%</span>
                    </div>
                    <div class="mp-minimap-kpi">
                        <span class="mp-mk-label">목표달성</span>
                        <span class="mp-mk-val" style="color:#217346">82%</span>
                    </div>
                </div>
            </div>
            <div class="mp-minimap-col mp-minimap-col--chart">
                <div class="mp-minimap-col-hd" style="color:#ed7d31">요약 그래프</div>
                <canvas id="mp-map-canvas"></canvas>
            </div>
            <div class="mp-minimap-col mp-minimap-col--points">
                <div class="mp-minimap-col-hd" style="color:#333;font-weight:bold">분석 포인트</div>
                <ul class="mp-minimap-pts">
                    <li>Q1 대비 +12%</li>
                    <li>피크 W4</li>
                    <li>추세 상승</li>
                    <li>W6 최고치</li>
                </ul>
            </div>
        </div>`;
    return card;
}

let analysisObserver = null;

function observeRealtimeAnalysis() {
    if (analysisObserver || !window.ResizeObserver) return;
    const canvas = document.getElementById('mp-map-canvas');
    if (!canvas?.parentElement) return;
    analysisObserver = new ResizeObserver(() => renderRealtimeAnalysis());
    analysisObserver.observe(canvas.parentElement);
}

function renderRealtimeAnalysis() {
    const canvas = document.getElementById('mp-map-canvas');
    if (!canvas?.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = Math.max(40, rect.width - 4);
    const height = Math.max(40, rect.height - 16);
    if (width <= 0 || height <= 0) {
        requestAnimationFrame(renderRealtimeAnalysis);
        return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = { left: 24, right: 10, top: 12, bottom: 22 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const values = [28, 44, 38, 58, 52, 69, 63];
    const max = 80;

    ctx.strokeStyle = '#d9e2ec';
    ctx.lineWidth = 1;
    ctx.font = '9px Segoe UI, sans-serif';
    for (let i = 0; i <= 3; i += 1) {
        const y = pad.top + (innerH / 3) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
    }

    ctx.strokeStyle = '#5b9bd5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((value, index) => {
        const x = pad.left + (innerW / (values.length - 1)) * index;
        const y = pad.top + innerH * (1 - value / max);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = '#ed7d31';
    values.forEach((value, index) => {
        const x = pad.left + (innerW / (values.length - 1)) * index;
        const y = pad.top + innerH * (1 - value / max);
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = '#44546a';
    ['W1', 'W3', 'W5', 'W7'].forEach((label, index) => {
        const x = pad.left + (innerW / 3) * index;
        ctx.fillText(label, x - 6, height - 7);
    });
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
