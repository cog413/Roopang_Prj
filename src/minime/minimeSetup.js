import { showLoginPopup, goToLogin } from '../ui/loginPopup.js';
import { pattieAssetLoader } from '../patties/PattieAssetLoader.js';

let setupEl = null;
let settingsButton = null;
export let currentAvatar = null;
const KITTY_LOCK_MESSAGE = '친구 추천 2회 이상 필요';

const CHARACTER_LABELS = {
    mong: 'Corgi',
    rabbit: '토끼 Pattie',
    dog: '강아지 토닥이',
    cat: '고양이 Pattie',
    cabul: '고양이 카불',
};

const CHARACTER_TOOLTIPS = {
    mong: '늘 해맑은 웰시코기에요.\n토닥여주기, 간식주기, 말걸기 모두 좋아하는 행복 사랑꾼이죠',
    cabul: '매사 무심한 뚱냥이에요.\n토닥여주기, 말걸기도 좋지만 간식을 특히 좋아해요',
};

const CHARACTER_DEFAULT_NAMES = { mong: '몽이', cabul: '까불이' };

const PATTIE_NAME_KEY = key => `rs_pattie_name_${key}`;
function getPattieNameFromStorage(charKey) {
    try { return localStorage.getItem(PATTIE_NAME_KEY(charKey)) || null; } catch { return null; }
}
function setPattieNameToStorage(charKey, name) {
    try { localStorage.setItem(PATTIE_NAME_KEY(charKey), name); } catch {}
}

export async function initMinimeSheet() {
    const sheet = document.getElementById('mini-pet-sheet');
    if (!sheet) return;

    ensureSettingsButton();
    new MutationObserver(async () => {
        if (sheet.style.display !== 'none') await onMinimeSheetShown();
    }).observe(sheet, { attributes: true, attributeFilter: ['style'] });

    if (sheet.style.display !== 'none') await onMinimeSheetShown();
}

async function onMinimeSheetShown() {
    ensureSettingsButton();
    const auth = window.refresheetAuth;

    if (!auth?.authenticated) {
        showLoginPopup({
            message: '관리시트 캐릭터 설정은 로그인이 필요합니다.\nGoogle 로그인으로 토닥이를 저장할까요?',
            onLogin: goToLogin,
            onSkip: () => {},
        });
        return;
    }

    const avatar = await fetchPattie();
    currentAvatar = avatar;
    if (!avatar?.character_key || !avatar?.nickname) showSetupFlow();
    else applyAvatarToScene(avatar);
}

function ensureSettingsButton() {
    const mapActions = document.querySelector('#mp-chart .mp-map-actions');
    const chart = document.getElementById('mp-chart');
    const habitat = document.getElementById('mini-pet-habitat');
    const parent = mapActions || chart || habitat;
    if (!parent) return;
    if (settingsButton) {
        if (!parent.contains(settingsButton)) parent.appendChild(settingsButton);
        return;
    }
    settingsButton = document.createElement('button');
    settingsButton.type = 'button';
    settingsButton.className = 'pattie-settings-button';
    settingsButton.textContent = '토닥이 설정';
    settingsButton.addEventListener('click', async () => {
        const auth = window.refresheetAuth;
        if (!auth?.authenticated) {
            showLoginPopup({
                message: '토닥이 설정은 로그인이 필요합니다.\nGoogle 로그인으로 계속할까요?',
                onLogin: goToLogin,
                onSkip: () => {},
            });
            return;
        }
        const avatar = await fetchPattie();
        currentAvatar = avatar;
        showSetupFlow(avatar);
    });
    parent.appendChild(settingsButton);
}

async function fetchPattie() {
    try {
        const res = await fetch('/api/pattie', { credentials: 'include' });
        if (!res.ok) return null;
        const data = await res.json();
        return data.pattie || null;
    } catch {
        return null;
    }
}

async function showSetupFlow(avatar = currentAvatar) {
    await ensureSetupModal();
    await renderChoices();
    fillForm(avatar);
    setupEl.style.display = 'flex';
}

async function ensureSetupModal() {
    if (setupEl) return;
    setupEl = buildSetupDOM();
    document.body.appendChild(setupEl);
    if (!document.getElementById('ms-char-tooltip-popup')) {
        const tt = document.createElement('div');
        tt.id = 'ms-char-tooltip-popup';
        tt.className = 'ms-char-tooltip-popup';
        tt.style.display = 'none';
        document.body.appendChild(tt);
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
                <span>토닥이 설정</span>
                <span class="modal-close" id="ms-close">×</span>
            </div>
            <div class="ob-step">
                <div class="ob-step-title">관리시트에 같이 살 토닥이를 정해주세요</div>
                <div class="ob-field">
                    <label class="ob-label">이름</label>
                    <input id="ms-nickname" class="ob-input" type="text" placeholder="토닥이 이름" maxlength="20">
                </div>
                <div class="ob-field">
                    <label class="ob-label">캐릭터</label>
                    <div class="ms-char-row" id="ms-character-list"></div>
                </div>
                <div class="ob-field">
                    <label class="ob-label">아이템</label>
                    <div class="pattie-item-choice-row" id="ms-item-list"></div>
                </div>
                <div class="ob-hint">아이템은 꾸미기 용이며 점수와 랭킹에는 영향을 주지 않습니다.<br>(아이템 준비중)</div>
                <div class="modal-buttons">
                    <button class="modal-btn retry" id="ms-save">저장(S)</button>
                    <button class="modal-btn" id="ms-cancel">취소</button>
                </div>
            </div>
        </div>`;
    return el;
}

async function fetchCharacterLockState(itemKey) {
    try {
        const auth = window.refresheetAuth;
        if (!auth?.authenticated) return true;
        const res = await fetch(`/api/unlockables/check?item_key=${itemKey}`, { credentials: 'include' });
        if (!res.ok) return true;
        const data = await res.json();
        return data.is_locked !== false;
    } catch {
        return true;
    }
}

async function renderChoices() {
    await pattieAssetLoader.registerManifest('/public/assets/kitty/manifest.json');
    const characters = await pattieAssetLoader.listCharacters();
    const items = await pattieAssetLoader.listItems();
    const kittyLocked = await fetchCharacterLockState('character_kitty');
    const charList = setupEl.querySelector('#ms-character-list');
    const itemList = setupEl.querySelector('#ms-item-list');

    charList.innerHTML = characters.map(({ key, displayName }) => {
        const isLocked = key === 'cabul' && kittyLocked;
        const label = key === 'cabul' ? 'Kitty' : (CHARACTER_LABELS[key] || displayName || key);
        return `
        <button type="button" class="ms-char-card pattie-char-card${isLocked ? ' is-locked' : ''}" data-type="${key}" data-locked="${isLocked}" data-lock-message="${KITTY_LOCK_MESSAGE}" aria-disabled="${isLocked}" title="${isLocked ? KITTY_LOCK_MESSAGE : ''}">
            <span class="pattie-choice-preview" data-preview="${key}"></span>
            <span class="ms-char-name">${label}</span>
            ${isLocked ? `<span class="ms-char-lock-hint">${KITTY_LOCK_MESSAGE}</span>` : ''}
        </button>`;
    }).join('');

    itemList.innerHTML = items.map(({ key, displayName, type }) => `
        <label class="pattie-item-choice">
            <input type="checkbox" value="${key}" data-item-type="${type || 'generic'}">
            <span>${displayName || key}</span>
        </label>
    `).join('');

    for (const card of charList.querySelectorAll('.pattie-choice-preview')) {
        const key = card.dataset.preview;
        try {
            const anim = await pattieAssetLoader.getAnimation(key, 'idle');
            if (anim) {
                const scaleX = (anim.renderWidth || anim.frameWidth) / anim.frameWidth;
                const scaleY = (anim.renderHeight || anim.frameHeight) / anim.frameHeight;
                card.style.backgroundImage = `url("${anim.src}")`;
                card.style.backgroundPosition = `-${Math.round((anim.sourcePaddingX || 0) * scaleX)}px -${Math.round((anim.sourcePaddingY || 0) * scaleY)}px`;
                card.style.backgroundSize = `${Math.round((anim.imageWidth || anim.frameCount * anim.frameWidth) * scaleX)}px ${Math.round((anim.imageHeight || anim.frameHeight) * scaleY)}px`;
            }
        } catch {
            card.classList.add('pattie-choice-preview--missing');
        }
    }
    bindCharacterChoiceEvents();
}

function bindSetupEvents() {
    const closeModal = () => { hideCharTooltip(); setupEl.style.display = 'none'; };
    setupEl.querySelector('#ms-close').addEventListener('click', closeModal);
    setupEl.querySelector('#ms-cancel').addEventListener('click', closeModal);
    setupEl.querySelector('#ms-save').addEventListener('click', saveAvatar);
    bindCharacterChoiceEvents();
}

function bindCharacterChoiceEvents() {
    setupEl.querySelectorAll('.ms-char-card').forEach(card => {
        if (card.dataset.bound === 'true') return;
        card.dataset.bound = 'true';
        card.addEventListener('click', () => {
            if (card.dataset.locked === 'true') {
                window.alert?.(card.dataset.lockMessage || KITTY_LOCK_MESSAGE);
                return;
            }
            setupEl.querySelectorAll('.ms-char-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const key = card.dataset.type;
            const nicknameInput = setupEl.querySelector('#ms-nickname');
            if (nicknameInput) {
                nicknameInput.value = getPattieNameFromStorage(key) || CHARACTER_DEFAULT_NAMES[key] || '';
            }
        });
        card.addEventListener('mouseenter', () => showCharTooltip(card));
        card.addEventListener('mouseleave', hideCharTooltip);
    });
}

function showCharTooltip(card) {
    const key = card.dataset.type;
    const text = CHARACTER_TOOLTIPS[key];
    if (!text) return;
    const tt = document.getElementById('ms-char-tooltip-popup');
    if (!tt) return;
    tt.innerHTML = '';
    text.split('\n').forEach((line, i) => {
        if (i > 0) tt.appendChild(document.createElement('br'));
        tt.appendChild(document.createTextNode(line));
    });
    tt.style.display = 'block';
    const cardRect = card.getBoundingClientRect();
    const ttRect = tt.getBoundingClientRect();
    let left = cardRect.left + cardRect.width / 2 - ttRect.width / 2;
    let top = cardRect.top - ttRect.height - 10;
    left = Math.max(8, Math.min(window.innerWidth - ttRect.width - 8, left));
    if (top < 8) top = cardRect.bottom + 10;
    tt.style.left = `${Math.round(left)}px`;
    tt.style.top = `${Math.round(top)}px`;
}

function hideCharTooltip() {
    const tt = document.getElementById('ms-char-tooltip-popup');
    if (tt) tt.style.display = 'none';
}

function fillForm(avatar) {
    const characterKey = avatar?.character_key || mapLegacyCharacter(avatar?.character_type) || 'mong';
    // 서버에 저장된 이름을 localStorage에 없을 때 bootstrap
    if (avatar?.nickname && !getPattieNameFromStorage(characterKey)) {
        setPattieNameToStorage(characterKey, avatar.nickname);
    }
    const nameToShow = getPattieNameFromStorage(characterKey) || CHARACTER_DEFAULT_NAMES[characterKey] || '몽이';
    setupEl.querySelector('#ms-nickname').value = nameToShow;

    setupEl.querySelectorAll('.ms-char-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.type === characterKey);
    });
    if (!setupEl.querySelector('.ms-char-card.selected')) {
        setupEl.querySelector('[data-type="mong"]')?.classList.add('selected');
    }
    const equipped = Array.isArray(avatar?.equipped_item_keys) ? avatar.equipped_item_keys : [];
    setupEl.querySelectorAll('#ms-item-list input[type="checkbox"]').forEach(input => {
        input.checked = equipped.includes(input.value);
    });
}

async function saveAvatar() {
    const nickname = setupEl.querySelector('#ms-nickname').value.trim();
    const selected = setupEl.querySelector('.ms-char-card.selected');
    const characterKey = selected?.dataset.type || 'rabbit';
    const equippedItemKeys = Array.from(setupEl.querySelectorAll('#ms-item-list input:checked')).map(input => input.value);

    if (!nickname) {
        setupEl.querySelector('#ms-nickname').focus();
        return;
    }

    // 캐릭터별 이름 localStorage에 저장
    setPattieNameToStorage(characterKey, nickname);

    const res = await fetch('/api/pattie', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nickname,
            character_key: characterKey,
            equipped_item_keys: equippedItemKeys,
        }),
    });
    if (!res.ok) return;
    const data = await res.json();
    currentAvatar = data.pattie;
    applyAvatarToScene(currentAvatar);
    setupEl.style.display = 'none';
}

export function applyAvatarToScene(avatar) {
    document.dispatchEvent(new CustomEvent('refresheet:pattie-profile-updated', {
        detail: avatar,
    }));
}

function mapLegacyCharacter(characterType) {
    if (characterType === 'type_b') return 'dog';
    if (characterType === 'mong' || characterType === 'dog' || characterType === 'cat' || characterType === 'cabul') return characterType;
    return 'mong';
}
