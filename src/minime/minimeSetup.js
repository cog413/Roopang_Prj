import { showLoginPopup, goToLogin } from '../ui/loginPopup.js';
import { pattieAssetLoader } from '../patties/PattieAssetLoader.js';

let setupEl = null;
let settingsButton = null;
export let currentAvatar = null;

const CHARACTER_LABELS = {
    mong: 'Mong 테스트',
    rabbit: '토끼 Pattie',
    dog: '강아지 토닥이',
    cat: '고양이 Pattie',
};

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
    const habitat = document.getElementById('mini-pet-habitat');
    if (!habitat || settingsButton) return;
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
    habitat.appendChild(settingsButton);
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
    fillForm(avatar);
    setupEl.style.display = 'flex';
}

async function ensureSetupModal() {
    if (setupEl) return;
    setupEl = buildSetupDOM();
    document.body.appendChild(setupEl);
    await renderChoices();
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
                <div class="ob-hint">아이템은 꾸미기용이며 점수와 랭킹에는 영향을 주지 않습니다.</div>
                <div class="modal-buttons">
                    <button class="modal-btn retry" id="ms-save">저장(S)</button>
                    <button class="modal-btn" id="ms-cancel">취소</button>
                </div>
            </div>
        </div>`;
    return el;
}

async function renderChoices() {
    const characters = await pattieAssetLoader.listCharacters();
    const items = await pattieAssetLoader.listItems();
    const charList = setupEl.querySelector('#ms-character-list');
    const itemList = setupEl.querySelector('#ms-item-list');

    charList.innerHTML = characters.map(({ key, displayName }) => `
        <button type="button" class="ms-char-card pattie-char-card" data-type="${key}">
            <span class="pattie-choice-preview" data-preview="${key}"></span>
            <span class="ms-char-name">${CHARACTER_LABELS[key] || displayName || key}</span>
        </button>
    `).join('');

    itemList.innerHTML = items.map(({ key, displayName, type }) => `
        <label class="pattie-item-choice">
            <input type="checkbox" value="${key}" data-item-type="${type || 'generic'}">
            <span>${displayName || key}</span>
        </label>
    `).join('');

    for (const card of charList.querySelectorAll('.pattie-choice-preview')) {
        const key = card.dataset.preview;
        const anim = await pattieAssetLoader.getAnimation(key, 'idle');
        if (anim) {
            const scaleX = (anim.renderWidth || anim.frameWidth) / anim.frameWidth;
            const scaleY = (anim.renderHeight || anim.frameHeight) / anim.frameHeight;
            card.style.backgroundImage = `url("${anim.src}")`;
            card.style.backgroundPosition = `-${(anim.sourcePaddingX || 0) * scaleX}px -${(anim.sourcePaddingY || 0) * scaleY}px`;
            card.style.backgroundSize = `${(anim.imageWidth || anim.frameCount * anim.frameWidth) * scaleX}px ${(anim.imageHeight || anim.frameHeight) * scaleY}px`;
        }
    }
}

function bindSetupEvents() {
    setupEl.querySelector('#ms-close').addEventListener('click', () => {
        setupEl.style.display = 'none';
    });
    setupEl.querySelector('#ms-cancel').addEventListener('click', () => {
        setupEl.style.display = 'none';
    });
    setupEl.querySelector('#ms-save').addEventListener('click', saveAvatar);
    setupEl.querySelectorAll('.ms-char-card').forEach(card => {
        card.addEventListener('click', () => {
            setupEl.querySelectorAll('.ms-char-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        });
    });
}

function fillForm(avatar) {
    setupEl.querySelector('#ms-nickname').value = avatar?.nickname || '토닥이';
    const characterKey = avatar?.character_key || mapLegacyCharacter(avatar?.character_type);
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
    if (characterType === 'mong' || characterType === 'dog' || characterType === 'cat') return characterType;
    return 'mong';
}
