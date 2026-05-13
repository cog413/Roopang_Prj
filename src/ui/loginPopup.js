let popupEl = null;

export function showLoginPopup({ message, onLogin, onSkip }) {
    ensurePopup();
    popupEl.querySelector('#lp-message').textContent = message;

    const yesBtn = popupEl.querySelector('#lp-yes');
    const noBtn = popupEl.querySelector('#lp-no');
    const closeBtn = popupEl.querySelector('#lp-close');

    const cleanup = () => { popupEl.style.display = 'none'; };

    const cloneYes = yesBtn.cloneNode(true);
    const cloneNo = noBtn.cloneNode(true);
    const cloneClose = closeBtn.cloneNode(true);
    yesBtn.replaceWith(cloneYes);
    noBtn.replaceWith(cloneNo);
    closeBtn.replaceWith(cloneClose);

    cloneYes.addEventListener('click', () => { cleanup(); onLogin?.(); });
    cloneNo.addEventListener('click', () => { cleanup(); onSkip?.(); });
    cloneClose.addEventListener('click', () => { cleanup(); onSkip?.(); });

    popupEl.style.display = 'flex';
}

function ensurePopup() {
    if (popupEl) return;
    popupEl = document.getElementById('login-required-modal');
    if (!popupEl) {
        popupEl = createPopupDOM();
        document.body.appendChild(popupEl);
    }
}

function createPopupDOM() {
    const overlay = document.createElement('div');
    overlay.id = 'login-required-modal';
    overlay.className = 'modal-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `
        <div class="excel-modal">
            <div class="modal-header">
                <span>Refresheet</span>
                <span class="modal-close" id="lp-close">✕</span>
            </div>
            <div class="modal-content">
                <div class="modal-icon">ℹ️</div>
                <div class="modal-text" id="lp-message"></div>
            </div>
            <div class="modal-buttons">
                <button class="modal-btn retry" id="lp-yes">예(Y)</button>
                <button class="modal-btn cancel" id="lp-no">아니오(N)</button>
            </div>
        </div>`;
    return overlay;
}

export function goToLogin() {
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.href = `/api/auth/google/start?return_to=${encodeURIComponent(returnTo || '/')}`;
}

// 단순 확인 팝업 (사원명 미설정 안내 등)
export function showAlertPopup(message, onClose) {
    let alertEl = document.getElementById('alert-popup-modal');
    if (!alertEl) {
        alertEl = document.createElement('div');
        alertEl.id = 'alert-popup-modal';
        alertEl.className = 'modal-overlay';
        alertEl.style.display = 'none';
        alertEl.innerHTML = `
            <div class="excel-modal">
                <div class="modal-header">
                    <span>알림</span>
                    <span class="modal-close" id="ap-close">✕</span>
                </div>
                <div class="modal-content">
                    <div class="modal-text" id="ap-message"></div>
                </div>
                <div class="modal-buttons">
                    <button class="modal-btn retry" id="ap-ok">확인</button>
                </div>
            </div>`;
        document.body.appendChild(alertEl);
    }

    alertEl.querySelector('#ap-message').textContent = message;
    alertEl.style.display = 'flex';

    const close = () => {
        alertEl.style.display = 'none';
        onClose?.();
    };

    const okBtn = alertEl.querySelector('#ap-ok');
    const closeBtn = alertEl.querySelector('#ap-close');
    const cloneOk = okBtn.cloneNode(true);
    const cloneClose = closeBtn.cloneNode(true);
    okBtn.replaceWith(cloneOk);
    closeBtn.replaceWith(cloneClose);
    cloneOk.addEventListener('click', close);
    cloneClose.addEventListener('click', close);
}
