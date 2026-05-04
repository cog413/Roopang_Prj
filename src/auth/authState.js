export async function initAuthState() {
    const authState = await fetchAuthState();
    window.refresheetAuth = authState;
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
            avatar_url: data.user.avatar_url,
            last_login_at: data.user.last_login_at,
            is_new_user: Boolean(data.user.is_new_user),
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
    document.dispatchEvent(new CustomEvent('refresheet:auth', { detail: window.refresheetAuth }));
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
