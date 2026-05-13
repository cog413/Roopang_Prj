import { showUserSettings } from './userSettings.js';

export async function initAuthState() {
    const authState = await fetchAuthState();
    window.refresheetAuth = authState;
    bindLoginButton(authState);
    document.dispatchEvent(new CustomEvent('refresheet:auth', { detail: authState }));
    return authState;
}

export async function refreshAuthState() {
    const authState = await fetchAuthState();
    window.refresheetAuth = authState;
    bindLoginButton(authState);
    document.dispatchEvent(new CustomEvent('refresheet:auth', { detail: authState }));
    return authState;
}

export async function fetchAuthState() {
    try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (!res.ok) return anonymousState();

        const data = await res.json();
        if (!data.authenticated || !data.user) return anonymousState();

        return {
            authenticated: true,
            user_id: data.user.user_id,
            email: data.user.email,
            nickname: data.user.nickname,
            employee_name: data.user.employee_name || null,
            avatar_url: data.user.avatar_url,
            last_login_at: data.user.last_login_at,
            is_new_user: Boolean(data.user.is_new_user),
            company: data.user.company || null,
            commute_start: data.user.commute_start || '09:00',
            commute_end: data.user.commute_end || '18:00',
            onboarding_done: Boolean(data.user.onboarding_done),
            marketing_agreed: Boolean(data.user.marketing_agreed),
        };
    } catch {
        return anonymousState();
    }
}

export async function logout() {
    await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
    });
    window.refresheetAuth = anonymousState();
    const button = document.getElementById('login-button');
    if (button) updateLoginButton(button, window.refresheetAuth);
    document.dispatchEvent(new CustomEvent('refresheet:auth', { detail: window.refresheetAuth }));
}

let dropdownEl = null;

function bindLoginButton(authState) {
    const button = document.getElementById('login-button');
    if (!button) return;

    updateLoginButton(button, authState);

    button.removeEventListener('click', button._clickHandler);
    button._clickHandler = () => {
        if (!window.refresheetAuth?.authenticated) {
            const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            window.location.href = `/api/auth/google/start?return_to=${encodeURIComponent(returnTo || '/')}`;
            return;
        }
        toggleDropdown(button);
    };
    button.addEventListener('click', button._clickHandler);
}

function toggleDropdown(anchor) {
    if (dropdownEl && document.body.contains(dropdownEl)) {
        dropdownEl.remove();
        dropdownEl = null;
        return;
    }

    dropdownEl = document.createElement('div');
    dropdownEl.className = 'account-dropdown';
    dropdownEl.innerHTML = `
        <div class="account-dropdown-item" id="dd-settings">내 설정</div>
        <div class="account-dropdown-item account-dropdown-item--logout" id="dd-logout">로그아웃</div>`;
    document.body.appendChild(dropdownEl);

    const rect = anchor.getBoundingClientRect();
    dropdownEl.style.top = `${rect.bottom + 4}px`;
    dropdownEl.style.right = `${document.documentElement.clientWidth - rect.right}px`;

    dropdownEl.querySelector('#dd-settings').addEventListener('click', () => {
        dropdownEl.remove();
        dropdownEl = null;
        showUserSettings();
    });
    dropdownEl.querySelector('#dd-logout').addEventListener('click', () => {
        dropdownEl.remove();
        dropdownEl = null;
        logout();
    });

    setTimeout(() => {
        document.addEventListener('click', closeDropdownOutside, { once: true });
    }, 0);
}

function closeDropdownOutside(e) {
    if (dropdownEl && !dropdownEl.contains(e.target)) {
        dropdownEl.remove();
        dropdownEl = null;
    }
}

function updateLoginButton(button, authState) {
    if (authState.authenticated) {
        button.textContent = getInitials(authState.nickname || authState.email || '');
        button.classList.add('authenticated');
        button.title = `${authState.nickname || authState.email} 로그인됨`;
        return;
    }

    button.textContent = '로그인';
    button.classList.remove('authenticated');
    button.title = 'Google 로그인';
}

function getInitials(value) {
    const source = value.trim();
    if (!source) return 'U';

    const koreanInitials = Array.from(source)
        .filter((char) => /[가-힣]/.test(char))
        .map(getKoreanInitial)
        .filter(Boolean)
        .slice(0, 2)
        .join('');

    if (koreanInitials) return koreanInitials;

    const asciiInitials = source
        .split(/[\s@._-]+/)
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return asciiInitials || 'U';
}

function getKoreanInitial(char) {
    const initials = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    const code = char.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) return '';
    return initials[Math.floor(code / 588)] || '';
}

function anonymousState() {
    return {
        authenticated: false,
        user_id: null,
        email: null,
        nickname: null,
        avatar_url: null,
        last_login_at: null,
        is_new_user: false,
    };
}
