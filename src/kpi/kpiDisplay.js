export async function refreshKpiDisplay() {
    const auth = window.refresheetAuth;

    if (!auth?.authenticated) {
        renderLoggedOutKpi();
        return;
    }

    try {
        const res = await fetch('/api/scores/today', { credentials: 'include' });
        if (!res.ok) { renderLoggedOutKpi(); return; }
        const data = await res.json();
        renderLoggedInKpi(auth, data);
    } catch {
        renderLoggedOutKpi();
    }
}

function renderLoggedOutKpi() {
    const kpiGrid = document.getElementById('kpi-values-row');
    if (kpiGrid) kpiGrid.style.display = 'none';
    const kpiDef = document.getElementById('kpi-def-row');
    if (kpiDef) kpiDef.style.display = '';
}

function renderLoggedInKpi(auth, data) {
    const scores = data.scores || [];
    const minimeCared = data.minime_cared_today || false;

    // 집중 Index: 오늘 게임 완료 수 × 33%, 최대 100%
    const gameCount = scores.length;
    const focusIndex = Math.min(100, gameCount * 33);

    // 존버 Index: 현재 시간 기준 출퇴근 대비 진행률
    const commuteStart = auth.commute_start || '09:00';
    const commuteEnd = auth.commute_end || '18:00';
    const enduranceIndex = calcEnduranceIndex(commuteStart, commuteEnd);

    // 케어 Index: 미니미 오늘 상호작용 여부
    const careIndex = minimeCared ? 100 : 0;

    const kpiDef = document.getElementById('kpi-def-row');
    if (kpiDef) kpiDef.style.display = 'none';

    const kpiValues = document.getElementById('kpi-values-row');
    if (!kpiValues) return;
    kpiValues.style.display = '';

    setKpiValue('kpi-focus-val', `${focusIndex}%`, getFocusStatus(gameCount));
    setKpiValue('kpi-endurance-val', `${enduranceIndex}%`, getEnduranceStatus(enduranceIndex));
    setKpiValue('kpi-care-val', careIndex === 100 ? '완료 ✓' : '미완료', careIndex === 100 ? 'good' : 'pending');

    // 게임 기록 요약
    const gameList = document.getElementById('kpi-game-list');
    if (gameList) {
        if (scores.length === 0) {
            gameList.textContent = '오늘 플레이 기록 없음';
        } else {
            const summary = scores.map(s =>
                `${s.game_type === 'sudoku' ? 'SDK' : '2048'} ${s.score.toLocaleString()}점`
            ).join(' · ');
            gameList.textContent = `오늘: ${summary}`;
        }
    }
}

function calcEnduranceIndex(startStr, endStr) {
    const now = new Date();
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const nowMins = now.getHours() * 60 + now.getMinutes();

    if (nowMins <= startMins) return 0;
    if (nowMins >= endMins) return 100;
    return Math.round(((nowMins - startMins) / (endMins - startMins)) * 100);
}

function getFocusStatus(count) {
    if (count === 0) return 'zero';
    if (count >= 3) return 'good';
    return 'mid';
}

function getEnduranceStatus(pct) {
    if (pct < 30) return 'zero';
    if (pct >= 80) return 'good';
    return 'mid';
}

function setKpiValue(id, text, status) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = `readme-kpi-value kpi-status-${status}`;
}
