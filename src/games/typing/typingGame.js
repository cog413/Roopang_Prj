import { showLoginPopup, goToLogin } from '../../ui/loginPopup.js';

const SCORE_MULTIPLIER = 10;
const SKIP_PENALTY_BASE = 3;
const ROUND_SECONDS = 60;

let initialized = false;
let phase = 'select'; // 'select' | 'playing' | 'result'
let selectedCategory = 'all';
let sentences = [];
let sentenceQueue = [];
let currentIdx = 0;
let totalScore = 0;
let lastResultText = '';
let timeLeft = ROUND_SECONDS;
let timerHandle = null;
let roundActive = false;

export function initTypingGame() {
    if (initialized) return;
    initialized = true;

    document.querySelectorAll('.tg-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => selectCategory(btn.dataset.category));
    });

    document.getElementById('tg-start-btn')?.addEventListener('click', startRound);
    document.getElementById('tg-skip-btn')?.addEventListener('click', skipSentence);
    document.getElementById('tg-retry-btn')?.addEventListener('click', () => goToSelect());
    document.getElementById('tg-back-btn')?.addEventListener('click', () => goToSelect());

    document.getElementById('tg-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); submitCurrent(); }
        else if (e.key === 'Escape') { e.preventDefault(); skipSentence(); }
    });

    document.querySelectorAll('.tg-rank-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tg-rank-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadRanking(tab.dataset.period);
        });
    });

    selectCategory('all');
    goToSelect();
}

function selectCategory(cat) {
    selectedCategory = cat;
    document.querySelectorAll('.tg-cat-btn').forEach(b => b.classList.toggle('active', b.dataset.category === cat));
}

function goToSelect() {
    stopTimer();
    roundActive = false;
    showPhase('select');
    loadRanking('daily');
}

function showPhase(p) {
    phase = p;
    ['select', 'playing', 'result'].forEach(name => {
        const el = document.getElementById(`tg-phase-${name}`);
        if (el) el.style.display = name === p ? '' : 'none';
    });
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

    showPhase('playing');
    renderSentence();
    updateStatus();
    startTimer();
    focusInput();
}

function renderSentence() {
    const el = document.getElementById('tg-sentence');
    if (!el) return;
    if (currentIdx >= sentenceQueue.length) { endRound(); return; }
    el.textContent = sentences[sentenceQueue[currentIdx]].content;
    clearInput();
}

function clearInput() {
    const inp = document.getElementById('tg-input');
    if (inp) { inp.value = ''; inp.disabled = false; }
}

function focusInput() {
    document.getElementById('tg-input')?.focus();
}

function submitCurrent() {
    if (!roundActive || currentIdx >= sentenceQueue.length) return;
    const inp = document.getElementById('tg-input');
    if (!inp) return;
    const typed = inp.value.trimEnd();
    const s = sentences[sentenceQueue[currentIdx]];
    const target = s.content;
    const base = s.length * SCORE_MULTIPLIER;

    let earned, label;
    if (typed === target) {
        earned = base;
        label = `Perfect ${earned}점`;
    } else {
        const dist = levenshtein(typed, target);
        earned = Math.max(0, base - dist * SCORE_MULTIPLIER);
        label = `Good ${earned}점`;
    }

    totalScore += earned;
    lastResultText = label;
    currentIdx++;
    updateStatus();

    if (currentIdx >= sentenceQueue.length) endRound();
    else { renderSentence(); focusInput(); }
}

function skipSentence() {
    if (!roundActive || currentIdx >= sentenceQueue.length) return;
    const penalty = SKIP_PENALTY_BASE * SCORE_MULTIPLIER;
    totalScore -= penalty;
    lastResultText = `Skip -${penalty}점`;
    currentIdx++;
    updateStatus();

    if (currentIdx >= sentenceQueue.length) endRound();
    else { renderSentence(); focusInput(); }
}

function updateStatus() {
    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const timeEl = document.getElementById('tg-time-cell');
    const lastEl = document.getElementById('tg-last-score-cell');
    const totalEl = document.getElementById('tg-total-score-cell');
    if (timeEl) timeEl.textContent = fmt(timeLeft);
    if (lastEl) lastEl.textContent = lastResultText || '-';
    if (totalEl) totalEl.textContent = `${totalScore}점`;
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

    const inp = document.getElementById('tg-input');
    if (inp) inp.disabled = true;

    const finalScore = Math.max(0, totalScore);

    // Show result phase immediately, then update eligibility after API call
    const scoreEl = document.getElementById('tg-final-score');
    if (scoreEl) scoreEl.textContent = `${finalScore}점`;
    const eligEl = document.getElementById('tg-eligibility-msg');
    if (eligEl) { eligEl.textContent = ''; eligEl.className = 'tg-eligibility-msg'; }
    showPhase('result');

    if (!window.refresheetAuth?.authenticated) {
        if (eligEl) { eligEl.textContent = '로그인 후 포인트와 랭킹에 반영됩니다.'; eligEl.className = 'tg-eligibility-msg ineligible'; }
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
        if (eligEl) {
            if (data.eligible) {
                eligEl.textContent = '포인트와 랭킹에 반영되었습니다.';
                eligEl.className = 'tg-eligibility-msg eligible';
                document.dispatchEvent(new CustomEvent('refresheet:score-saved'));
            } else {
                eligEl.textContent = '연습 플레이입니다. 시간당 보상 가능 횟수를 초과하여 포인트와 랭킹에 반영되지 않습니다.';
                eligEl.className = 'tg-eligibility-msg ineligible';
            }
        }
    } catch {
        if (eligEl) { eligEl.textContent = '결과 저장에 실패했습니다.'; eligEl.className = 'tg-eligibility-msg ineligible'; }
    }
}

async function loadRanking(period = 'daily') {
    const tbody = document.getElementById('tg-ranking-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" class="tg-rank-empty">불러오는 중...</td></tr>';
    try {
        const res = await fetch(`/api/games/typing/ranking?period=${period}`, { credentials: 'include' });
        const data = await res.json();
        const rows = data.rows || [];
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="tg-rank-empty">기록이 없습니다.</td></tr>';
            return;
        }
        tbody.innerHTML = rows.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${esc(r.nickname)}</td>
                <td>${r.score}점</td>
                <td>${fmtDt(r.created_at)}</td>
            </tr>`).join('');
    } catch {
        tbody.innerHTML = '<tr><td colspan="4" class="tg-rank-empty">불러오지 못했습니다.</td></tr>';
    }
}

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

function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDt(str) {
    if (!str) return '';
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function showMsg(text) {
    const el = document.getElementById('tg-msg');
    if (!el) return;
    el.textContent = text;
    clearTimeout(showMsg._t);
    showMsg._t = setTimeout(() => { el.textContent = ''; }, 2500);
}
