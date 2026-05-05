const TIMES = (() => {
    const list = [];
    for (let h = 5; h <= 23; h++) {
        for (let m = 0; m < 60; m += 10) {
            list.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }
    return list;
})();

let modalEl = null;
let companySuggestions = [];

export async function maybeShowOnboarding(authState) {
    if (!authState.authenticated) return;
    if (authState.onboarding_done) return;
    await showOnboarding();
}

export async function showOnboarding() {
    ensureModal();
    await loadCompanySuggestions();
    showStep(1);
    modalEl.style.display = 'flex';
}

function ensureModal() {
    if (modalEl) return;
    modalEl = document.getElementById('onboarding-modal');
    if (!modalEl) {
        modalEl = buildModalDOM();
        document.body.appendChild(modalEl);
    }
    bindEvents();
}

function buildModalDOM() {
    const el = document.createElement('div');
    el.id = 'onboarding-modal';
    el.className = 'modal-overlay ob-overlay';
    el.style.display = 'none';
    el.innerHTML = `
        <div class="excel-modal ob-modal">
            <div class="modal-header">
                <span>Refresheet 설정</span>
                <span class="modal-close" id="ob-close">✕</span>
            </div>

            <!-- Step 1: 회사 입력 -->
            <div id="ob-step1" class="ob-step">
                <div class="ob-step-title">회사 정보를 알려주세요</div>
                <div class="ob-field">
                    <label class="ob-label">회사명</label>
                    <div class="ob-input-wrap">
                        <input id="ob-company-input" class="ob-input" type="text"
                               placeholder="회사명 입력 또는 선택 (선택사항)" autocomplete="off" maxlength="100">
                        <div id="ob-suggestions" class="ob-suggestions" style="display:none;"></div>
                    </div>
                </div>
                <div id="ob-company-tags" class="ob-tags"></div>
                <div class="ob-hint">동일 회사 유저 수가 표시됩니다. 입력하지 않아도 됩니다.</div>
                <div class="ob-consent">
                    <label class="ob-consent-row">
                        <input type="checkbox" id="ob-terms-check">
                        <span>[필수] <a href="/terms.html" target="_blank">이용약관</a> 및 <a href="/privacy.html" target="_blank">개인정보처리방침</a>에 동의합니다</span>
                    </label>
                    <label class="ob-consent-row">
                        <input type="checkbox" id="ob-marketing-check">
                        <span>[선택] 서비스 업데이트 등 마케팅 정보 수신에 동의합니다</span>
                    </label>
                </div>
                <div id="ob-terms-error" class="ob-consent-error" style="display:none;">이용약관 동의는 필수입니다.</div>
                <div class="modal-buttons">
                    <button class="modal-btn retry" id="ob-next">다음(N)</button>
                    <button class="modal-btn cancel" id="ob-skip1">건너뛰기(S)</button>
                </div>
            </div>

            <!-- Step 2: 출퇴근 시간 -->
            <div id="ob-step2" class="ob-step" style="display:none;">
                <div class="ob-step-title">출퇴근 시간을 입력해주세요</div>
                <div class="ob-commute-hint">이 시간 기준으로 KPI가 계산됩니다</div>
                <div class="ob-commute-row">
                    <div class="ob-commute-col">
                        <label class="ob-label">출근 시간</label>
                        <select id="ob-commute-start" class="ob-select"></select>
                    </div>
                    <div class="ob-commute-sep">~</div>
                    <div class="ob-commute-col">
                        <label class="ob-label">퇴근 시간</label>
                        <select id="ob-commute-end" class="ob-select"></select>
                    </div>
                </div>
                <div class="ob-hint">불규칙하다면 일반적인 시간을 적어주세요</div>
                <div class="modal-buttons">
                    <button class="modal-btn retry" id="ob-save">저장(S)</button>
                    <button class="modal-btn" id="ob-back">이전(P)</button>
                </div>
            </div>
        </div>`;
    return el;
}

function bindEvents() {
    modalEl.querySelector('#ob-close').addEventListener('click', () => {
        modalEl.style.display = 'none';
    });

    modalEl.querySelector('#ob-next').addEventListener('click', () => {
        if (!modalEl.querySelector('#ob-terms-check').checked) {
            modalEl.querySelector('#ob-terms-error').style.display = 'block';
            return;
        }
        modalEl.querySelector('#ob-terms-error').style.display = 'none';
        showStep(2);
    });
    modalEl.querySelector('#ob-skip1').addEventListener('click', () => {
        if (!modalEl.querySelector('#ob-terms-check').checked) {
            modalEl.querySelector('#ob-terms-error').style.display = 'block';
            return;
        }
        modalEl.querySelector('#ob-terms-error').style.display = 'none';
        showStep(2);
    });
    modalEl.querySelector('#ob-back').addEventListener('click', () => showStep(1));
    modalEl.querySelector('#ob-save').addEventListener('click', saveOnboarding);

    const input = modalEl.querySelector('#ob-company-input');
    input.addEventListener('input', onCompanyInput);
    input.addEventListener('blur', () => {
        setTimeout(() => {
            const sug = modalEl.querySelector('#ob-suggestions');
            if (sug) sug.style.display = 'none';
        }, 150);
    });

    populateTimePickers();
}

function populateTimePickers() {
    const startSel = modalEl.querySelector('#ob-commute-start');
    const endSel = modalEl.querySelector('#ob-commute-end');
    TIMES.forEach(t => {
        startSel.appendChild(new Option(t, t));
        endSel.appendChild(new Option(t, t));
    });
    startSel.value = '09:00';
    endSel.value = '18:00';
}

function showStep(n) {
    modalEl.querySelector('#ob-step1').style.display = n === 1 ? '' : 'none';
    modalEl.querySelector('#ob-step2').style.display = n === 2 ? '' : 'none';
}

function onCompanyInput(e) {
    const val = e.target.value.trim().toLowerCase();
    const sug = modalEl.querySelector('#ob-suggestions');
    if (!val) { sug.style.display = 'none'; return; }

    const filtered = companySuggestions.filter(c =>
        c.name.toLowerCase().includes(val)
    ).slice(0, 8);

    if (!filtered.length) { sug.style.display = 'none'; return; }

    sug.innerHTML = '';
    filtered.forEach(c => {
        const item = document.createElement('div');
        item.className = 'ob-suggestion-item';
        item.innerHTML = `<span class="ob-sug-name">${c.name}</span>
                          <span class="ob-sug-count">${c.user_count}명</span>`;
        item.addEventListener('mousedown', () => {
            modalEl.querySelector('#ob-company-input').value = c.name;
            sug.style.display = 'none';
        });
        sug.appendChild(item);
    });
    sug.style.display = 'block';
}

async function loadCompanySuggestions() {
    try {
        const res = await fetch('/api/companies', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        companySuggestions = data.companies || [];
        renderCompanyTags();
    } catch { /* ignore */ }
}

function renderCompanyTags() {
    const container = modalEl.querySelector('#ob-company-tags');
    container.innerHTML = '';
    companySuggestions.slice(0, 10).forEach(c => {
        const tag = document.createElement('button');
        tag.className = 'ob-tag';
        tag.innerHTML = `${c.name} <span class="ob-tag-count">${c.user_count}</span>`;
        tag.addEventListener('click', () => {
            modalEl.querySelector('#ob-company-input').value = c.name;
            container.querySelectorAll('.ob-tag').forEach(t => t.classList.remove('selected'));
            tag.classList.add('selected');
        });
        container.appendChild(tag);
    });
}

async function saveOnboarding() {
    const company = modalEl.querySelector('#ob-company-input').value.trim();
    const commuteStart = modalEl.querySelector('#ob-commute-start').value;
    const commuteEnd = modalEl.querySelector('#ob-commute-end').value;
    const marketingAgreed = modalEl.querySelector('#ob-marketing-check')?.checked ?? false;

    try {
        const res = await fetch('/api/onboarding', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                company: company || null,
                commute_start: commuteStart,
                commute_end: commuteEnd,
                marketing_agreed: marketingAgreed,
            }),
        });
        if (res.ok) {
            if (window.refresheetAuth) {
                window.refresheetAuth.company = company || null;
                window.refresheetAuth.commute_start = commuteStart;
                window.refresheetAuth.commute_end = commuteEnd;
                window.refresheetAuth.onboarding_done = true;
            }
            document.dispatchEvent(new CustomEvent('refresheet:onboarding-done'));
        }
    } catch { /* ignore */ }

    modalEl.style.display = 'none';
}
