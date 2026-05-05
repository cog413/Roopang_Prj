let currentPeriod = 'daily';

const PERSONAL_LABELS = {
    daily:   '오늘의 실적 (개인)',
    weekly:  '주간 성과 리포트 (개인)',
    monthly: '이달의 사원 (개인)',
};
const COMPANY_LABELS = {
    daily:   '오늘의 실적 (회사별)',
    weekly:  '주간 성과 리포트 (회사별)',
    monthly: '매출 순위 (회사별)',
};

export function initRankingTabs() {
    document.querySelectorAll('.rm-rank-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.rm-rank-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            refreshRankingDisplay(btn.dataset.period);
        });
    });
}

export async function refreshRankingDisplay(period = currentPeriod) {
    currentPeriod = period;
    const auth = window.refresheetAuth;

    if (!auth?.authenticated) {
        setRankNeedLogin();
        return;
    }

    try {
        const res = await fetch(`/api/rankings?period=${period}`, { credentials: 'include' });
        if (!res.ok) { setRankNeedLogin(); return; }
        const data = await res.json();
        renderRanking(data);
    } catch {
        setRankNeedLogin();
    }
}

function renderRanking(data) {
    const p = data.period;

    setText('rank-personal-label', PERSONAL_LABELS[p] || PERSONAL_LABELS.monthly);
    setText('rank-company-label',  COMPANY_LABELS[p]  || COMPANY_LABELS.monthly);

    const myPersonalEl = document.getElementById('rank-personal-my');
    if (myPersonalEl) {
        myPersonalEl.innerHTML = data.personal.my_rank
            ? `<span class="rm-rank-badge">내 순위 <strong>#${data.personal.my_rank}위</strong> &nbsp;·&nbsp; ${fmt(data.personal.my_score)}pt</span>`
            : `<span class="rm-rank-none">기록 없음</span>`;
    }

    const myCompanyEl = document.getElementById('rank-company-my');
    if (myCompanyEl) {
        if (!data.company.my_company) {
            myCompanyEl.innerHTML = `<span class="rm-rank-none">회사 미설정</span>`;
        } else if (data.company.my_rank) {
            myCompanyEl.innerHTML = `<span class="rm-rank-badge">${esc(data.company.my_company)} <strong>#${data.company.my_rank}위</strong></span>`;
        } else {
            myCompanyEl.innerHTML = `<span class="rm-rank-none">기록 없음</span>`;
        }
    }

    renderList('rank-personal-list', data.personal.top, r =>
        `<div class="rm-rank-item${r.is_me ? ' rm-rank-me' : ''}">
            <span class="rm-rank-pos">${medal(r.rank)}</span>
            <span class="rm-rank-name">${esc(r.nickname)}</span>
            <span class="rm-rank-score">${fmt(r.score)}</span>
        </div>`
    );

    renderList('rank-company-list', data.company.top, r =>
        `<div class="rm-rank-item${r.is_mine ? ' rm-rank-me' : ''}">
            <span class="rm-rank-pos">${medal(r.rank)}</span>
            <span class="rm-rank-name">${esc(r.company)}</span>
            <span class="rm-rank-score">${fmt(r.score)}</span>
        </div>`
    );
}

function renderList(id, items, template) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.length
        ? items.map(template).join('')
        : '<div class="rm-rank-empty">집계 중</div>';
}

function setRankNeedLogin() {
    ['rank-personal-my', 'rank-company-my'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<span class="rm-need-login">로그인 필요</span>';
    });
    ['rank-personal-list', 'rank-company-list'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
}

function medal(rank) {
    return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}위`;
}

function fmt(n) { return (n || 0).toLocaleString(); }

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
}
