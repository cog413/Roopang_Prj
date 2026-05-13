const TARGETS = [
    { id: 'game2048-ranking', tabSheet: 'game2048' },
    { id: 'sudoku-ranking', tabSheet: 'sudoku' },
];

const PERIODS = [
    ['daily', '오늘'],
    ['weekly', '이번 주'],
];

export function initGameRankingTables() {
    TARGETS.forEach(({ id, tabSheet }) => {
        const root = document.getElementById(id);
        if (!root) return;
        setupRanking(root);

        const tab = document.querySelector(`.tab[data-sheet="${tabSheet}"]`);
        if (tab) tab.addEventListener('click', () => loadRanking(root, getActivePeriod(root)));
    });

    document.addEventListener('refresheet:score-saved', () => {
        TARGETS.forEach(({ id }) => {
            const root = document.getElementById(id);
            if (root) loadRanking(root, getActivePeriod(root));
        });
    });
}

function setupRanking(root) {
    const title = root.dataset.gameTitle || root.dataset.gameType || '';
    root.innerHTML = `
        <div class="tg-ranking-section game-ranking-section">
            <div class="game-ranking-header">
                <span>${esc(title)} 실적 순위</span>
                <span class="tg-ranking-tabs">
                    ${PERIODS.map(([period, label], index) =>
                        `<button type="button" class="tg-rank-tab${index === 0 ? ' active' : ''}" data-period="${period}">${label}</button>`
                    ).join('')}
                </span>
            </div>
            <table class="tg-rank-table">
                <thead><tr><th>순위</th><th>사원 명</th><th>실적</th><th>일시</th></tr></thead>
                <tbody><tr><td colspan="4" class="tg-rank-empty">불러오는 중...</td></tr></tbody>
            </table>
        </div>
    `;

    root.querySelectorAll('.tg-rank-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            root.querySelectorAll('.tg-rank-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadRanking(root, tab.dataset.period || 'daily');
        });
    });

    loadRanking(root, 'daily');
}

async function loadRanking(root, period = 'daily') {
    const body = root.querySelector('tbody');
    const gameType = root.dataset.gameType;
    if (!body || !gameType) return;

    body.innerHTML = '<tr><td colspan="4" class="tg-rank-empty">불러오는 중...</td></tr>';
    try {
        const params = new URLSearchParams({ game_type: gameType, period });
        const res = await fetch(`/api/game-rankings?${params.toString()}`, { credentials: 'include' });
        if (!res.ok) throw new Error('ranking load failed');
        const data = await res.json();
        const rows = data.rows || [];
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="4" class="tg-rank-empty">아직 랭킹 데이터가 없습니다</td></tr>';
            return;
        }
        body.innerHTML = rows.map((row, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${esc(row.employee_name)}</td>
                <td>${Number(row.score || 0).toLocaleString()}</td>
                <td>${fmtDate(row.created_at || row.played_at)}</td>
            </tr>
        `).join('');
    } catch {
        body.innerHTML = '<tr><td colspan="4" class="tg-rank-empty">불러오지 못했습니다.</td></tr>';
    }
}

function getActivePeriod(root) {
    return root.querySelector('.tg-rank-tab.active')?.dataset.period || 'daily';
}

function fmtDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const y = String(d.getFullYear()).slice(-2);
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    const h = d.getHours();
    const ampm = h < 12 ? '오전' : '오후';
    const h12 = String(h % 12 || 12).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${y}.${M}.${D} ${ampm} ${h12}:${m}`;
}

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[ch]));
}
