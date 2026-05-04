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
                <span>Microsoft Excel</span>
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
