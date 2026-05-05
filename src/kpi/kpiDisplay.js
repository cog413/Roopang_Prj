let _timerStarted = false;

export function startEnduranceTimer() {
    if (_timerStarted) return;
    _timerStarted = true;
    setInterval(() => {
        const auth = window.refresheetAuth;
        if (!auth?.authenticated) return;
        const idx = calcEnduranceIndex(auth.commute_start || '09:00', auth.commute_end || '18:00');
        setKpiNumber('kpi-endurance-val', `${idx}%`, getColorClass(idx));
    }, 60_000);
}

export async function refreshKpiDisplay() {
    const auth = window.refresheetAuth;

    if (!auth?.authenticated) {
        setNeedLogin('kpi-focus-val');
        setNeedLogin('kpi-endurance-val');
        setNeedLogin('kpi-care-val');
        return;
    }

    try {
        const res = await fetch('/api/scores/today', { credentials: 'include' });
        if (!res.ok) {
            setNeedLogin('kpi-focus-val');
            setNeedLogin('kpi-endurance-val');
            setNeedLogin('kpi-care-val');
            return;
        }
        const data = await res.json();
        renderKpi(auth, data);
    } catch {
        setNeedLogin('kpi-focus-val');
        setNeedLogin('kpi-endurance-val');
        setNeedLogin('kpi-care-val');
    }
}

function renderKpi(auth, data) {
    const scores = data.scores || [];
    const minimeCared = data.minime_cared_today || false;

    // 집중 Index: 당일 게임 완료 판수 × 33%, 최대 100%
    const gameCount = scores.length;
    const focusIndex = Math.min(100, gameCount * 33);

    // 존버 Index: (현재시각 - 출근) / (퇴근 - 출근) × 100%
    const commuteStart = auth.commute_start || '09:00';
    const commuteEnd   = auth.commute_end   || '18:00';
    const enduranceIndex = calcEnduranceIndex(commuteStart, commuteEnd);

    // 케어 Index: 0→0%, 1회 이상→50%, 2종 이상→100%
    // 현재는 단일 활동 타입만 지원 → 1회 이상 시 50%
    const careIndex = minimeCared ? 50 : 0;

    setKpiNumber('kpi-focus-val', `${focusIndex}%`, getColorClass(focusIndex));
    setKpiNumber('kpi-endurance-val', `${enduranceIndex}%`, getColorClass(enduranceIndex));
    setKpiNumber('kpi-care-val', `${careIndex}%`, getColorClass(careIndex));

    const remaining = data.hourly_plays_remaining ?? null;
    if (remaining !== null) {
        const subEl = document.querySelector('#kpi-focus-val')
            ?.closest('.rm-kpi-card')?.querySelector('.rm-kpi-sub');
        if (subEl) subEl.textContent = `이번 시간 ${remaining}판 남음 (매 정시 초기화)`;
    }
}

function calcEnduranceIndex(startStr, endStr) {
    const now = new Date();
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins   = eh * 60 + em;
    const nowMins   = now.getHours() * 60 + now.getMinutes();

    if (nowMins <= startMins) return 0;
    if (nowMins >= endMins)   return 100;
    return Math.round(((nowMins - startMins) / (endMins - startMins)) * 100);
}

function getColorClass(pct) {
    if (pct === 0)   return 'rm-kpi-zero';
    if (pct >= 70)   return 'rm-kpi-good';
    return 'rm-kpi-mid';
}

function setNeedLogin(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<span class="rm-need-login">로그인 필요</span>';
}

function setKpiNumber(id, text, colorClass) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<span class="rm-kpi-number ${colorClass}">${text}</span>`;
}
