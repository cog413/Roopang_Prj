import { showLoginPopup, goToLogin } from '../ui/loginPopup.js';

let setupEl = null;
export let currentAvatar = null;

export async function initMinimeSheet() {
    const sheet = document.getElementById('mini-pet-sheet');
    if (!sheet) return;

    new MutationObserver(async () => {
        if (sheet.style.display !== 'none') await onMinimeSheetShown();
    }).observe(sheet, { attributes: true, attributeFilter: ['style'] });

    if (sheet.style.display !== 'none') await onMinimeSheetShown();
}

async function onMinimeSheetShown() {
    const auth = window.refresheetAuth;

    if (!auth?.authenticated) {
        showLoginPopup({
            message: '미니미 기능은 로그인이 필요합니다.\nGoogle 로그인을 하시겠습니까?',
            onLogin: goToLogin,
            onSkip: () => {},
        });
        return;
    }

    const avatar = await fetchAvatar();
    currentAvatar = avatar;

    if (!avatar) {
        showSetupFlow();
    } else {
        applyAvatarToScene(avatar);
    }
}

async function fetchAvatar() {
    try {
        const res = await fetch('/api/avatar', { credentials: 'include' });
        if (!res.ok) return null;
        const data = await res.json();
        return data.avatar || null;
    } catch { return null; }
}

function showSetupFlow() {
    ensureSetupModal();
    showSetupStep(1);
    setupEl.style.display = 'flex';
}

function ensureSetupModal() {
    if (setupEl) return;
    setupEl = document.getElementById('minime-setup-modal');
    if (!setupEl) {
        setupEl = buildSetupDOM();
        document.body.appendChild(setupEl);
    }
    bindSetupEvents();
}

function buildSetupDOM() {
    const el = document.createElement('div');
    el.id = 'minime-setup-modal';
    el.className = 'modal-overlay';
    el.style.display = 'none';
    el.innerHTML = `
        <div class="excel-modal ms-modal">
            <div class="modal-header">
                <span>미니미 설정</span>
                <span class="modal-close" id="ms-close">✕</span>
            </div>

            <!-- Step 1: 닉네임 -->
            <div id="ms-step1" class="ob-step">
                <div class="ob-step-title">미니미 닉네임을 입력해주세요</div>
                <div class="ob-field">
                    <label class="ob-label">닉네임 (최대 10자)</label>
                    <input id="ms-nickname" class="ob-input" type="text"
                           placeholder="나만의 미니미 이름" maxlength="10">
                </div>
                <div class="ob-hint">미니미가 이 이름으로 불립니다.</div>
                <div class="modal-buttons">
                    <button class="modal-btn retry" id="ms-next">다음(N)</button>
                </div>
            </div>

            <!-- Step 2: 캐릭터 선택 -->
            <div id="ms-step2" class="ob-step" style="display:none;">
                <div class="ob-step-title">캐릭터를 선택해주세요</div>
                <div class="ms-char-row">
                    <div class="ms-char-card" data-type="type_a">
                        <div class="ms-char-preview char-type-a">
                            <div class="ms-body ms-body-a">
                                <div class="ms-eyes"><div class="ms-eye"></div><div class="ms-eye"></div></div>
                                <div class="ms-mouth"></div>
                                <div class="ms-tie"></div>
                            </div>
                            <div class="ms-feet"><div class="ms-foot"></div><div class="ms-foot"></div></div>
                        </div>
                        <div class="ms-char-name">씩씩한 사원</div>
                        <div class="ms-char-desc">열정적이고 도전적</div>
                    </div>
                    <div class="ms-char-card" data-type="type_b">
                        <div class="ms-char-preview char-type-b">
                            <div class="ms-body ms-body-b">
                                <div class="ms-eyes"><div class="ms-eye"></div><div class="ms-eye"></div></div>
                                <div class="ms-mouth"></div>
                                <div class="ms-glasses"></div>
                            </div>
                            <div class="ms-feet"><div class="ms-foot"></div><div class="ms-foot"></div></div>
                        </div>
                        <div class="ms-char-name">꼼꼼한 연구원</div>
                        <div class="ms-char-desc">분석적이고 신중한</div>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button class="modal-btn retry" id="ms-save">저장(S)</button>
                    <button class="modal-btn" id="ms-back">이전(P)</button>
                </div>
            </div>
        </div>`;
    return el;
}

function bindSetupEvents() {
    setupEl.querySelector('#ms-close').addEventListener('click', () => {
        setupEl.style.display = 'none';
    });

    setupEl.querySelector('#ms-next').addEventListener('click', () => {
        const nick = setupEl.querySelector('#ms-nickname').value.trim();
        if (!nick) {
            setupEl.querySelector('#ms-nickname').focus();
            return;
        }
        showSetupStep(2);
    });
    setupEl.querySelector('#ms-back').addEventListener('click', () => showSetupStep(1));
    setupEl.querySelector('#ms-save').addEventListener('click', saveAvatar);

    setupEl.querySelectorAll('.ms-char-card').forEach(card => {
        card.addEventListener('click', () => {
            setupEl.querySelectorAll('.ms-char-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        });
    });
    // default selection
    setupEl.querySelector('[data-type="type_a"]').classList.add('selected');
}

function showSetupStep(n) {
    setupEl.querySelector('#ms-step1').style.display = n === 1 ? '' : 'none';
    setupEl.querySelector('#ms-step2').style.display = n === 2 ? '' : 'none';
}

async function saveAvatar() {
    const nickname = setupEl.querySelector('#ms-nickname').value.trim();
    const selected = setupEl.querySelector('.ms-char-card.selected');
    const characterType = selected?.dataset.type || 'type_a';

    if (!nickname) { showSetupStep(1); return; }

    try {
        const res = await fetch('/api/avatar', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, character_type: characterType }),
        });
        if (res.ok) {
            currentAvatar = { nickname, character_type: characterType };
            applyAvatarToScene(currentAvatar);
        }
    } catch { /* ignore */ }

    setupEl.style.display = 'none';
}

export function applyAvatarToScene(avatar) {
    const sprite = document.getElementById('mp-sprite-0');
    if (!sprite) return;
    sprite.classList.remove('char-type-a', 'char-type-b');
    sprite.classList.add(avatar.character_type === 'type_b' ? 'char-type-b' : 'char-type-a');

    const body = sprite.querySelector('.mps-body');
    if (body) {
        body.classList.remove('mps-body-a', 'mps-body-b');
        body.classList.add(avatar.character_type === 'type_b' ? 'mps-body-b' : 'mps-body-a');

        if (avatar.character_type === 'type_b') {
            if (!body.querySelector('.mps-glasses')) {
                const g = document.createElement('div');
                g.className = 'mps-glasses';
                body.appendChild(g);
            }
            body.querySelector('.mps-tie')?.remove();
        } else {
            if (!body.querySelector('.mps-tie')) {
                const t = document.createElement('div');
                t.className = 'mps-tie';
                body.appendChild(t);
            }
            body.querySelector('.mps-glasses')?.remove();
        }
    }
}
