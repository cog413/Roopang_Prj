const SCORE_MULTIPLIER = 10;
const SKIP_PENALTY_BASE = 3;
const ROUND_SECONDS = 60;

let initialized = false;
let phase = 'idle'; // 'idle' | 'playing' | 'result'
let selectedCategory = 'all';
let sentences = [];
let sentenceQueue = [];
let currentIdx = 0;
let totalScore = 0;
let lastResultText = '';
let timeLeft = ROUND_SECONDS;
let timerHandle = null;
let roundActive = false;

// DOM refs — set once in buildUI()
let elSentence, elInput, elTimeCell, elLastCell, elTotalCell;
let elStatusBar, elInputRow, elMainArea, elMsg;
let elRankingBody, elTicket;
let currentRankPeriod = 'daily';

export function initTypingGame() {
    if (initialized) return;
    initialized = true;
    const grid = document.getElementById('typing-grid');
    if (!grid) return;
    buildUI(grid);
}

// ── DOM construction ────────────────────────────────────────────

function buildUI(grid) {
    // ① Header: category buttons + start button
    const header = el('div', 'tg-header');
    const catRow = el('div', 'tg-cat-row');
    [['all','전체'],['humor','유머'],['healing','힐링'],['quote','명언']].forEach(([cat, label]) => {
        const btn = el('button', `tg-cat-btn${cat === 'all' ? ' active' : ''}`, label);
        btn.dataset.category = cat;
        btn.addEventListener('click', () => selectCategory(cat));
        catRow.appendChild(btn);
    });
    const startBtn = el('button', 'tg-start-btn', '시작');
    startBtn.id = 'tg-start-btn';
    startBtn.addEventListener('click', startRound);
    header.append(catRow, startBtn);

    elMsg = el('div', 'tg-msg');
    header.appendChild(elMsg);

    // ② Status bar (잔여시간 | 직전획득점수 | 총계)
    elStatusBar = el('div', 'tg-status-table');
    [
        ['tg-time-cell',  '잔여시간',    '01:00'],
        ['tg-last-cell',  '직전획득점수', '-'],
        ['tg-total-cell', '총계',        '0점'],
    ].forEach(([id, label, init]) => {
        const cell = el('div', 'tg-status-cell');
        cell.append(el('div', 'tg-status-label', label), el('div', 'tg-status-val', init));
        cell.querySelector('.tg-status-val').id = id;
        elStatusBar.appendChild(cell);
    });
    elTimeCell  = elStatusBar.querySelector('#tg-time-cell');
    elLastCell  = elStatusBar.querySelector('#tg-last-cell');
    elTotalCell = elStatusBar.querySelector('#tg-total-cell');
    elStatusBar.style.display = 'none';

    // ③ Main area — switches between idle / sentence / result
    elMainArea = el('div', 'tg-main-area');
    renderIdle();

    // ④ Input row
    elInputRow = el('div', 'tg-input-row');
    const inputLabel = el('div', 'tg-input-label', 'B1');
    elInput = document.createElement('input');
    elInput.id = 'tg-input';
    elInput.className = 'tg-input';
    elInput.type = 'text';
    elInput.autocomplete = 'off';
    elInput.spellcheck = false;
    elInput.placeholder = '여기에 입력하세요...';
    elInput.addEventListener('keydown', onInputKeydown, true);
    const skipBtn = el('button', 'tg-skip-btn', 'Skip (Tab)');
    skipBtn.addEventListener('click', skipSentence);
    elInputRow.append(inputLabel, elInput, skipBtn);
    elInputRow.style.display = 'none';

    // ⑤ Ranking
    const rankSection = el('div', 'tg-ranking-section');
    const rankTabs = el('div', 'tg-ranking-tabs');
    [['daily','오늘'],['weekly','이번 주']].forEach(([period, label]) => {
        const tab = el('button', `tg-rank-tab${period === 'daily' ? ' active' : ''}`, label);
        tab.dataset.period = period;
        tab.addEventListener('click', () => {
            rankSection.querySelectorAll('.tg-rank-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentRankPeriod = period;
            loadRanking(period);
        });
        rankTabs.appendChild(tab);
    });
    const rankTable = document.createElement('table');
    rankTable.className = 'tg-rank-table';
    rankTable.innerHTML = '<thead><tr><th>순위</th><th>닉네임</th><th>점수</th><th>일시</th></tr></thead>';
    const tbody = document.createElement('tbody');
    tbody.id = 'tg-ranking-body';
    tbody.innerHTML = '<tr><td colspan="4" class="tg-rank-empty">불러오는 중...</td></tr>';
    elRankingBody = tbody;
    rankTable.appendChild(tbody);
    rankSection.append(rankTabs, rankTable);

    grid.append(header, elStatusBar, elMainArea, elInputRow, rankSection);

    const typingTab = document.querySelector('.tab[data-sheet="typing"]');
    if (typingTab) typingTab.addEventListener('click', refreshTicketEl, { once: false });

    loadRanking('daily');
}

// ── Main area renderers ─────────────────────────────────────────

function renderIdle() {
    elMainArea.innerHTML = '';
    elMainArea.className = 'tg-main-area tg-idle';
    const hint = el('div', 'tg-idle-hint', '유형을 선택하고 시작을 누르세요');
    elTicket = el('div', 'tg-ticket-info', '');
    elMainArea.append(hint, elTicket);
    refreshTicketEl();
}

function renderSentenceArea() {
    elMainArea.innerHTML = '';
    elMainArea.className = 'tg-main-area tg-playing';
    const box = el('div', 'tg-sentence-box');
    const label = el('div', 'tg-sentence-label', 'A1');
    elSentence = el('div', 'tg-sentence');
    box.append(label, elSentence);
    elMainArea.appendChild(box);
    updateSentenceText();
}

function renderResultArea(finalScore) {
    elMainArea.innerHTML = '';
    elMainArea.className = 'tg-main-area tg-result';
    const box = el('div', 'tg-result-box');
    box.append(
        el('div', 'tg-result-label', '최종 점수'),
        el('div', 'tg-final-score', `${finalScore}점`),
    );
    const eligEl = el('div', 'tg-eligibility-msg');
    elTicket = el('div', 'tg-ticket-info', '');
    box.append(eligEl, elTicket);
    const btns = el('div', 'tg-result-btns');
    const retry = el('button', 'tg-result-btn primary', '다시하기');
    const back  = el('button', 'tg-result-btn', '유형 선택으로 돌아가기');
    retry.addEventListener('click', goToIdle);
    back.addEventListener('click', goToIdle);
    btns.append(retry, back);
    box.appendChild(btns);
    elMainArea.appendChild(box);
    return eligEl;
}

// ── Game logic ──────────────────────────────────────────────────

function selectCategory(cat) {
    selectedCategory = cat;
    document.querySelectorAll('.tg-cat-btn').forEach(b => b.classList.toggle('active', b.dataset.category === cat));
}

function goToIdle() {
    stopTimer();
    roundActive = false;
    phase = 'idle';
    elStatusBar.style.display = 'none';
    elInputRow.style.display = 'none';
    document.getElementById('tg-start-btn').textContent = '시작';
    renderIdle();
    loadRanking(currentRankPeriod);
}

async function startRound() {
    try {
        const res = await fetch(`/api/games/typing/sentences?category=${selectedCategory}`, { credentials: 'include' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        sentences = data.sentences || [];
    } catch {
        showMsg('문장을 불러오지 못했습니다.');
        return;
    }
    if (!sentences.length) { showMsg('문장이 없습니다.'); return; }

    sentenceQueue = shuffle(Array.from({ length: sentences.length }, (_, i) => i));
    currentIdx = 0;
    totalScore = 0;
    lastResultText = '';
    timeLeft = ROUND_SECONDS;
    roundActive = true;
    phase = 'playing';

    document.getElementById('tg-start-btn').textContent = '진행중...';
    elStatusBar.style.display = '';
    elInputRow.style.display = '';
    renderSentenceArea();
    updateStatus();
    startTimer();
    elInput.disabled = false;
    elInput.value = '';
    elInput.focus();
}

function updateSentenceText() {
    if (!elSentence) return;
    if (currentIdx < sentenceQueue.length) {
        elSentence.textContent = sentences[sentenceQueue[currentIdx]].content;
    }
}

function onInputKeydown(e) {
    if (!roundActive) return;
    if (e.key === 'Enter') { e.preventDefault(); submitCurrent(); }
    else if (e.key === 'Tab') { e.preventDefault(); skipSentence(); }
}

function submitCurrent() {
    if (!roundActive || currentIdx >= sentenceQueue.length) return;
    const typed = elInput.value.trimEnd();
    const s = sentences[sentenceQueue[currentIdx]];
    const base = s.length * SCORE_MULTIPLIER;
    let earned, label;
    if (typed === s.content) {
        earned = base;
        label = `Perfect ${earned}점`;
    } else {
        const dist = levenshtein(typed, s.content);
        earned = Math.max(0, base - dist * SCORE_MULTIPLIER);
        label = `Good ${earned}점`;
    }
    totalScore += earned;
    lastResultText = label;
    currentIdx++;
    elInput.value = '';
    updateStatus();
    if (currentIdx >= sentenceQueue.length) endRound();
    else { updateSentenceText(); elInput.focus(); }
}

function skipSentence() {
    if (!roundActive || currentIdx >= sentenceQueue.length) return;
    const penalty = SKIP_PENALTY_BASE * SCORE_MULTIPLIER;
    totalScore -= penalty;
    lastResultText = `Skip -${penalty}점`;
    currentIdx++;
    elInput.value = '';
    updateStatus();
    if (currentIdx >= sentenceQueue.length) endRound();
    else { updateSentenceText(); elInput.focus(); }
}

function updateStatus() {
    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    if (elTimeCell)  elTimeCell.textContent  = fmt(timeLeft);
    if (elLastCell)  elLastCell.textContent  = lastResultText || '-';
    if (elTotalCell) elTotalCell.textContent = `${totalScore}점`;
}

function startTimer() {
    stopTimer();
    timerHandle = setInterval(() => {
        timeLeft = Math.max(0, timeLeft - 1);
        updateStatus();
        if (timeLeft === 0) endRound();
    }, 1000);
}

function stopTimer() {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
}

async function endRound() {
    if (!roundActive) return;
    roundActive = false;
    stopTimer();
    phase = 'result';

    if (elInput) elInput.disabled = true;
    elInputRow.style.display = 'none';
    document.getElementById('tg-start-btn').textContent = '시작';

    const finalScore = Math.max(0, totalScore);
    const eligEl = renderResultArea(finalScore);

    if (!window.refresheetAuth?.authenticated) {
        eligEl.textContent = '로그인 후 포인트와 랭킹에 반영됩니다.';
        eligEl.className = 'tg-eligibility-msg ineligible';
        refreshTicketEl();
        return;
    }

    try {
        const res = await fetch('/api/games/typing/finish', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: finalScore, duration_seconds: ROUND_SECONDS }),
        });
        const data = await res.json().catch(() => ({}));
        if (data.eligible) {
            eligEl.textContent = '포인트와 랭킹에 반영되었습니다.';
            eligEl.className = 'tg-eligibility-msg eligible';
            document.dispatchEvent(new CustomEvent('refresheet:score-saved'));
            loadRanking(currentRankPeriod);
        } else {
            eligEl.textContent = '시간당 보상 가능 횟수를 초과하여 포인트와 랭킹에 반영되지 않습니다.';
            eligEl.className = 'tg-eligibility-msg ineligible';
        }
    } catch {
        eligEl.textContent = '결과 저장에 실패했습니다.';
        eligEl.className = 'tg-eligibility-msg ineligible';
    }
    refreshTicketEl();
}

async function loadRanking(period = 'daily') {
    if (!elRankingBody) return;
    elRankingBody.innerHTML = '<tr><td colspan="4" class="tg-rank-empty">불러오는 중...</td></tr>';
    try {
        const res = await fetch(`/api/games/typing/ranking?period=${period}`, { credentials: 'include' });
        const data = await res.json();
        const rows = data.rows || [];
        if (!rows.length) {
            elRankingBody.innerHTML = '<tr><td colspan="4" class="tg-rank-empty">기록이 없습니다.</td></tr>';
            return;
        }
        elRankingBody.innerHTML = rows.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${esc(r.nickname)}</td>
                <td>${r.score}점</td>
                <td>${fmtDt(r.created_at)}</td>
            </tr>`).join('');
    } catch {
        elRankingBody.innerHTML = '<tr><td colspan="4" class="tg-rank-empty">불러오지 못했습니다.</td></tr>';
    }
}

// ── Utilities ───────────────────────────────────────────────────

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
    );
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return dp[m][n];
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function el(tag, className = '', text = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDt(str) {
    if (!str) return '';
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function showMsg(text) {
    if (!elMsg) return;
    elMsg.textContent = text;
    clearTimeout(showMsg._t);
    showMsg._t = setTimeout(() => { elMsg.textContent = ''; }, 2500);
}

async function refreshTicketEl() {
    if (!elTicket) return;
    if (!window.refresheetAuth?.authenticated) { elTicket.textContent = ''; return; }
    try {
        const res = await fetch('/api/scores/today', { credentials: 'include' });
        const d = await res.json();
        elTicket.textContent = `티켓 ${d.hourly_plays_remaining ?? 0} / 3 · 매 정시 갱신`;
    } catch { elTicket.textContent = ''; }
}
