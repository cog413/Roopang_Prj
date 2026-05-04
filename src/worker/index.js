const SESSION_COOKIE = 'refresheet_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (request.method === 'OPTIONS') {
            return withCors(new Response(null, { status: 204 }));
        }

        try {
            if (url.pathname === '/api/auth/google/start') {
                return startGoogleLogin(request, env);
            }
            if (url.pathname === '/api/auth/google/callback') {
                return handleGoogleCallback(request, env);
            }
            if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
                return handleLogout(request, env);
            }
            if (url.pathname === '/api/me' && request.method === 'GET') {
                return handleMe(request, env);
            }

            return withCors(json({ error: 'not_found' }, 404));
        } catch (error) {
            return withCors(json({
                error: 'internal_error',
                message: error instanceof Error ? error.message : String(error),
            }, 500));
        }
    },
};

function getDb(env) {
    const db = env.DB || env.db_game_info;
    if (!db) {
        throw new Error('Missing D1 binding. Expected env.DB or env.db_game_info.');
    }
    return db;
}

function getRequiredEnv(env, key) {
    if (!env[key]) {
        throw new Error(`Missing environment variable: ${key}`);
    }
    return env[key];
}

function startGoogleLogin(request, env) {
    const url = new URL(request.url);
    const redirectUri = getRedirectUri(request, env);
    const state = crypto.randomUUID();
    const params = new URLSearchParams({
        client_id: getRequiredEnv(env, 'GOOGLE_CLIENT_ID'),
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        prompt: 'select_account',
    });

    const headers = new Headers({
        Location: `${GOOGLE_AUTH_URL}?${params.toString()}`,
    });
    headers.append('Set-Cookie', makeCookie('oauth_state', state, {
        maxAge: 600,
        httpOnly: true,
        sameSite: 'Lax',
        path: '/api/auth/google',
    }));

    if (url.searchParams.get('return_to')) {
        headers.append('Set-Cookie', makeCookie('oauth_return_to', url.searchParams.get('return_to'), {
            maxAge: 600,
            httpOnly: true,
            sameSite: 'Lax',
            path: '/api/auth/google',
        }));
    }

    return new Response(null, { status: 302, headers });
}

async function handleGoogleCallback(request, env) {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const cookies = parseCookies(request.headers.get('Cookie') || '');
    const expectedState = cookies.oauth_state;

    if (!code || !state || !expectedState || state !== expectedState) {
        return json({ error: 'invalid_oauth_state' }, 400);
    }

    const redirectUri = getRedirectUri(request, env);
    const token = await exchangeGoogleCode(env, code, redirectUri);
    const googleUser = await fetchGoogleUserInfo(token.access_token);
    const authResult = await upsertGoogleUser(getDb(env), googleUser, request);
    const sessionId = await createSession(getDb(env), authResult.user.user_id, authResult.is_new_user, request);

    const returnTo = safeReturnTo(cookies.oauth_return_to) || '/';
    const headers = new Headers({ Location: returnTo });
    headers.append('Set-Cookie', makeCookie(SESSION_COOKIE, sessionId, {
        maxAge: SESSION_TTL_SECONDS,
        httpOnly: true,
        sameSite: 'Lax',
        path: '/',
    }));
    headers.append('Set-Cookie', expireCookie('oauth_state', '/api/auth/google'));
    headers.append('Set-Cookie', expireCookie('oauth_return_to', '/api/auth/google'));

    return new Response(null, { status: 302, headers });
}

async function handleMe(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) {
        return withCors(json({ authenticated: false, user: null }, 200));
    }

    return withCors(json({
        authenticated: true,
        user: {
            user_id: session.user_id,
            email: session.email,
            nickname: session.nickname,
            avatar_url: session.avatar_url,
            last_login_at: session.last_login_at,
            is_new_user: Boolean(session.is_new_user),
        },
    }));
}

async function handleLogout(request, env) {
    const db = getDb(env);
    const cookies = parseCookies(request.headers.get('Cookie') || '');
    const sessionId = cookies[SESSION_COOKIE];

    if (sessionId) {
        const session = await db.prepare(
            `SELECT s.session_id, s.user_id, u.email
             FROM auth_sessions s
             JOIN users u ON u.user_id = s.user_id
             WHERE s.session_id = ? AND s.revoked_at IS NULL`
        ).bind(sessionId).first();

        if (session) {
            await db.batch([
                db.prepare('UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE session_id = ?')
                    .bind(sessionId),
                db.prepare(
                    `INSERT INTO auth_events (event_id, user_id, event_type, provider, email, metadata_json)
                     VALUES (?, ?, 'logout', 'google', ?, ?)`
                ).bind(makeId('auth_evt'), session.user_id, session.email, JSON.stringify(makeRequestMetadata(request))),
            ]);
        }
    }

    const response = json({ authenticated: false, user: null });
    response.headers.append('Set-Cookie', expireCookie(SESSION_COOKIE, '/'));
    return withCors(response);
}

async function exchangeGoogleCode(env, code, redirectUri) {
    const body = new URLSearchParams({
        client_id: getRequiredEnv(env, 'GOOGLE_CLIENT_ID'),
        client_secret: getRequiredEnv(env, 'GOOGLE_CLIENT_SECRET'),
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
    });

    const res = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (!res.ok) {
        throw new Error(`Google token exchange failed: ${res.status}`);
    }
    return res.json();
}

async function fetchGoogleUserInfo(accessToken) {
    const res = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
        throw new Error(`Google userinfo failed: ${res.status}`);
    }

    const user = await res.json();
    if (!user.sub || !user.email) {
        throw new Error('Google userinfo missing sub or email.');
    }
    return user;
}

async function upsertGoogleUser(db, googleUser, request) {
    const now = new Date().toISOString();
    const existing = await db.prepare(
        `SELECT u.user_id, u.email, p.nickname, p.avatar_url, p.last_login_at
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.user_id
         WHERE u.google_sub = ?
            OR (u.google_sub IS NULL AND u.email = ?)
         ORDER BY CASE WHEN u.google_sub = ? THEN 0 ELSE 1 END
         LIMIT 1`
    ).bind(googleUser.sub, googleUser.email, googleUser.sub).first();

    if (!existing) {
        const userId = makeId('usr');
        const nickname = pickNickname(googleUser);
        const metadata = JSON.stringify({
            google_sub: googleUser.sub,
            email_verified: googleUser.email_verified ?? null,
            ...makeRequestMetadata(request),
        });

        await db.batch([
            db.prepare(
                `INSERT INTO users (user_id, google_sub, email, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?)`
            ).bind(userId, googleUser.sub, googleUser.email, now, now),
            db.prepare(
                `INSERT INTO user_profiles (user_id, nickname, avatar_url, last_login_at, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?)`
            ).bind(userId, nickname, googleUser.picture || null, now, now, now),
            db.prepare(
                `INSERT INTO auth_events (event_id, user_id, event_type, provider, email, created_at, metadata_json)
                 VALUES (?, ?, 'signup', 'google', ?, ?, ?)`
            ).bind(makeId('auth_evt'), userId, googleUser.email, now, metadata),
        ]);

        return {
            is_new_user: true,
            user: {
                user_id: userId,
                email: googleUser.email,
                nickname,
                avatar_url: googleUser.picture || null,
                last_login_at: now,
            },
        };
    }

    const nickname = existing.nickname || pickNickname(googleUser);
    const avatarUrl = googleUser.picture || existing.avatar_url || null;
    const metadata = JSON.stringify({
        google_sub: googleUser.sub,
        email_verified: googleUser.email_verified ?? null,
        ...makeRequestMetadata(request),
    });

    await db.batch([
        db.prepare(
            `UPDATE users
             SET google_sub = COALESCE(google_sub, ?),
                 email = ?,
                 updated_at = ?
             WHERE user_id = ?`
        ).bind(googleUser.sub, googleUser.email, now, existing.user_id),
        db.prepare(
            `INSERT INTO user_profiles (user_id, nickname, avatar_url, last_login_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
               nickname = COALESCE(user_profiles.nickname, excluded.nickname),
               avatar_url = excluded.avatar_url,
               last_login_at = excluded.last_login_at,
               updated_at = excluded.updated_at`
        ).bind(existing.user_id, nickname, avatarUrl, now, now, now),
        db.prepare(
            `INSERT INTO auth_events (event_id, user_id, event_type, provider, email, created_at, metadata_json)
             VALUES (?, ?, 'login', 'google', ?, ?, ?)`
        ).bind(makeId('auth_evt'), existing.user_id, googleUser.email, now, metadata),
    ]);

    return {
        is_new_user: false,
        user: {
            user_id: existing.user_id,
            email: googleUser.email,
            nickname,
            avatar_url: avatarUrl,
            last_login_at: now,
        },
    };
}

async function createSession(db, userId, isNewUser, request) {
    const sessionId = makeId('sess');
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
    await db.prepare(
        `INSERT INTO auth_sessions (session_id, user_id, is_new_user, expires_at, metadata_json)
         VALUES (?, ?, ?, ?, ?)`
    ).bind(sessionId, userId, isNewUser ? 1 : 0, expiresAt, JSON.stringify(makeRequestMetadata(request))).run();
    return sessionId;
}

async function getSessionUser(db, request) {
    const cookies = parseCookies(request.headers.get('Cookie') || '');
    const sessionId = cookies[SESSION_COOKIE];
    if (!sessionId) return null;

    return db.prepare(
        `SELECT u.user_id, u.email, p.nickname, p.avatar_url, p.last_login_at, s.is_new_user
         FROM auth_sessions s
         JOIN users u ON u.user_id = s.user_id
         LEFT JOIN user_profiles p ON p.user_id = u.user_id
         WHERE s.session_id = ?
           AND s.revoked_at IS NULL
           AND (s.expires_at IS NULL OR unixepoch(s.expires_at) > unixepoch('now'))`
    ).bind(sessionId).first();
}

function getRedirectUri(request, env) {
    if (env.GOOGLE_REDIRECT_URI) return env.GOOGLE_REDIRECT_URI;
    const url = new URL(request.url);
    return `${url.origin}/api/auth/google/callback`;
}

function pickNickname(googleUser) {
    const name = typeof googleUser.name === 'string' ? googleUser.name.trim() : '';
    if (name) return name;
    return googleUser.email.split('@')[0];
}

function makeId(prefix) {
    return `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`;
}

function makeRequestMetadata(request) {
    return {
        ip: request.headers.get('CF-Connecting-IP'),
        user_agent: request.headers.get('User-Agent'),
    };
}

function parseCookies(cookieHeader) {
    return Object.fromEntries(cookieHeader.split(';').map((part) => {
        const index = part.indexOf('=');
        if (index === -1) return null;
        return [
            decodeURIComponent(part.slice(0, index).trim()),
            decodeURIComponent(part.slice(index + 1).trim()),
        ];
    }).filter(Boolean));
}

function makeCookie(name, value, options = {}) {
    const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
    if (options.path) parts.push(`Path=${options.path}`);
    if (options.httpOnly) parts.push('HttpOnly');
    if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
    parts.push('Secure');
    return parts.join('; ');
}

function expireCookie(name, path) {
    return makeCookie(name, '', { maxAge: 0, httpOnly: true, sameSite: 'Lax', path });
}

function safeReturnTo(value) {
    if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
    return value;
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
}

function withCors(response) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
}
