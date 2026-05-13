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
let referralStatus = null;

export async function showUserSettings() {
    ensureModal();
    await loadCompanySuggestions();
    await loadReferralStatus();
    prefillValues();
    modalEl.style.display = 'flex';
}

function ensureModal() {
    if (modalEl) return;
    modalEl = document.createElement('div');
    modalEl.id = 'user-settings-modal';
    modalEl.className = 'modal-overlay ob-overlay';
    modalEl.style.display = 'none';
    modalEl.innerHTML = `
        <div class="excel-modal ob-modal">
            <div class="modal-header">
                <span>내 설정</span>
                <span class="modal-close" id="us-close">✕</span>
            </div>
            <div class="ob-step">
                <div class="ob-field">
                    <label class="ob-label">사원명</label>
                    <input id="us-employee-name" class="ob-input" type="text"
                           placeholder="게임 랭킹에 표시될 이름 (최대 10자)" autocomplete="off" maxlength="10">
                    <div class="ob-hint" style="font-size:11px;color:#888;">한글·영문·숫자·공백·!@#$%^&amp;()-_. 허용</div>
                    <div id="us-employee-error" class="ob-consent-error" style="display:none;"></div>
                </div>
                <div class="ob-field">
                    <label class="ob-label">회사명</label>
                    <div class="ob-input-wrap">
                        <input id="us-company-input" class="ob-input" type="text"
                               placeholder="회사명 입력 (선택사항)" autocomplete="off" maxlength="100">
                        <div id="us-suggestions" class="ob-suggestions" style="display:none;"></div>
                    </div>
                </div>
                <div id="us-company-tags" class="ob-tags"></div>
                <div class="ob-commute-row" style="margin-top:14px;">
                    <div class="ob-commute-col">
                        <label class="ob-label">출근 시간</label>
                        <select id="us-commute-start" class="ob-select"></select>
                    </div>
                    <div class="ob-commute-sep">~</div>
                    <div class="ob-commute-col">
                        <label class="ob-label">퇴근 시간</label>
                        <select id="us-commute-end" class="ob-select"></select>
                    </div>
                </div>
                <div class="ob-consent" style="margin-top:16px;">
                    <label class="ob-consent-row">
                        <input type="checkbox" id="us-marketing-check">
                        <span>[선택] 서비스 업데이트 등 마케팅 정보 수신에 동의합니다</span>
                    </label>
                </div>
                <div class="ob-field us-referral-field">
                    <label class="ob-label">추천계정</label>
                    <input id="us-referrer-email" class="ob-input" type="email"
                           placeholder="추천인 이메일" maxlength="120">
                    <div class="us-referral-help">추천계정 입력 후에는 수정할 수 없습니다.</div>
                    <div class="us-referral-help">추천계정은 기존에 가입된 계정이어야 합니다.</div>
                    <div class="us-referral-message" id="us-referral-message"></div>
                    <button type="button" class="modal-btn" id="us-referral-save">추천계정 저장</button>
                </div>
                <div class="modal-buttons" style="margin-top:18px;">
                    <button class="modal-btn retry" id="us-save">저장(S)</button>
                    <button class="modal-btn cancel" id="us-cancel">취소</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modalEl);
    bindEvents();
}

function bindEvents() {
    modalEl.querySelector('#us-close').addEventListener('click', close);
    modalEl.querySelector('#us-cancel').addEventListener('click', close);
    modalEl.querySelector('#us-save').addEventListener('click', saveSettings);
    modalEl.querySelector('#us-referral-save').addEventListener('click', saveReferral);

    const input = modalEl.querySelector('#us-company-input');
    input.addEventListener('input', onCompanyInput);
    input.addEventListener('blur', () => {
        setTimeout(() => {
            const sug = modalEl.querySelector('#us-suggestions');
            if (sug) sug.style.display = 'none';
        }, 150);
    });

    populateTimePickers();
}

function populateTimePickers() {
    const startSel = modalEl.querySelector('#us-commute-start');
    const endSel = modalEl.querySelector('#us-commute-end');
    TIMES.forEach(t => {
        startSel.appendChild(new Option(t, t));
        endSel.appendChild(new Option(t, t));
    });
}

function prefillValues() {
    const auth = window.refresheetAuth;
    if (!auth?.authenticated) return;

    modalEl.querySelector('#us-employee-name').value = auth.employee_name || '';
    modalEl.querySelector('#us-company-input').value = auth.company || '';
    modalEl.querySelector('#us-commute-start').value = auth.commute_start || '09:00';
    modalEl.querySelector('#us-commute-end').value = auth.commute_end || '18:00';
    modalEl.querySelector('#us-marketing-check').checked = Boolean(auth.marketing_agreed);
    renderReferralStatus();
}

function close() {
    if (modalEl) modalEl.style.display = 'none';
}

function onCompanyInput(e) {
    const val = e.target.value.trim().toLowerCase();
    const sug = modalEl.querySelector('#us-suggestions');
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
            modalEl.querySelector('#us-company-input').value = c.name;
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

async function loadReferralStatus() {
    referralStatus = null;
    try {
        const res = await fetch('/api/referral', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        referralStatus = data.referral || null;
    } catch { /* ignore */ }
}

function renderReferralStatus() {
    const input = modalEl.querySelector('#us-referrer-email');
    const save = modalEl.querySelector('#us-referral-save');
    const message = modalEl.querySelector('#us-referral-message');
    if (!input || !save || !message) return;

    const saved = referralStatus?.referrer_email;
    input.value = saved || '';
    input.disabled = Boolean(saved);
    save.style.display = saved ? 'none' : 'inline-flex';
    message.textContent = saved ? '추천계정이 저장되어 수정할 수 없습니다.' : '';
}

async function saveReferral() {
    const input = modalEl.querySelector('#us-referrer-email');
    const message = modalEl.querySelector('#us-referral-message');
    const referrerEmail = input.value.trim();
    if (!referrerEmail) {
        message.textContent = '추천계정 이메일을 입력해주세요.';
        return;
    }

    const btn = modalEl.querySelector('#us-referral-save');
    btn.disabled = true;
    btn.textContent = '저장 중...';
    try {
        const res = await fetch('/api/referral', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referrer_email: referrerEmail }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            message.textContent = data.message || '추천계정을 저장하지 못했습니다.';
            return;
        }
        referralStatus = {
            referrer_email: data.referrer_email,
            editable: false,
        };
        renderReferralStatus();
    } catch {
        message.textContent = '추천계정을 저장하지 못했습니다.';
    } finally {
        btn.disabled = false;
        btn.textContent = '추천계정 저장';
    }
}

function renderCompanyTags() {
    const container = modalEl.querySelector('#us-company-tags');
    container.innerHTML = '';
    companySuggestions.slice(0, 10).forEach(c => {
        const tag = document.createElement('button');
        tag.className = 'ob-tag';
        tag.innerHTML = `${c.name} <span class="ob-tag-count">${c.user_count}</span>`;
        tag.addEventListener('click', () => {
            modalEl.querySelector('#us-company-input').value = c.name;
            container.querySelectorAll('.ob-tag').forEach(t => t.classList.remove('selected'));
            tag.classList.add('selected');
        });
        container.appendChild(tag);
    });
}

async function saveSettings() {
    const employeeNameRaw = modalEl.querySelector('#us-employee-name').value.trim();
    const employeeErrEl = modalEl.querySelector('#us-employee-error');
    const company = modalEl.querySelector('#us-company-input').value.trim();
    const commuteStart = modalEl.querySelector('#us-commute-start').value;
    const commuteEnd = modalEl.querySelector('#us-commute-end').value;
    const marketingAgreed = modalEl.querySelector('#us-marketing-check').checked;

    // 사원명 유효성 검사
    if (employeeNameRaw) {
        if (employeeNameRaw.length > 10) {
            if (employeeErrEl) { employeeErrEl.textContent = '사원명은 최대 10자입니다'; employeeErrEl.style.display = 'block'; }
            return;
        }
        if (!/^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9 !@#$%^&()\-_.]+$/.test(employeeNameRaw)) {
            if (employeeErrEl) { employeeErrEl.textContent = '허용되지 않는 문자입니다 (한글·영문·숫자·공백·!@#$%^&()-_.)'; employeeErrEl.style.display = 'block'; }
            return;
        }
    }
    if (employeeErrEl) employeeErrEl.style.display = 'none';

    const btn = modalEl.querySelector('#us-save');
    btn.disabled = true;
    btn.textContent = '저장 중...';

    try {
        const promises = [
            fetch('/api/onboarding', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    company: company || null,
                    commute_start: commuteStart,
                    commute_end: commuteEnd,
                    marketing_agreed: marketingAgreed,
                }),
            }),
        ];

        // 사원명이 있으면 별도 API 저장
        if (employeeNameRaw) {
            promises.push(
                fetch('/api/me/employee-name', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ employee_name: employeeNameRaw }),
                })
            );
        }

        const [res, enRes] = await Promise.all(promises);

        if (enRes && !enRes.ok) {
            const d = await enRes.json().catch(() => ({}));
            if (employeeErrEl) { employeeErrEl.textContent = d.message || '사원명 저장에 실패했습니다'; employeeErrEl.style.display = 'block'; }
            return;
        }

        if (res.ok) {
            if (window.refresheetAuth) {
                window.refresheetAuth.company = company || null;
                window.refresheetAuth.commute_start = commuteStart;
                window.refresheetAuth.commute_end = commuteEnd;
                window.refresheetAuth.marketing_agreed = marketingAgreed;
                window.refresheetAuth.onboarding_done = true;
                if (employeeNameRaw) window.refresheetAuth.employee_name = employeeNameRaw;
            }
            document.dispatchEvent(new CustomEvent('refresheet:auth', { detail: window.refresheetAuth }));
            close();
        }
    } catch { /* ignore */ } finally {
        btn.disabled = false;
        btn.textContent = '저장(S)';
    }
}
