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
            if (url.pathname === '/api/auth/google/debug') {
                return handleGoogleDebug(request, env);
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
            if (url.pathname === '/api/companies' && request.method === 'GET') {
                return handleGetCompanies(request, env);
            }
            if (url.pathname === '/api/onboarding' && request.method === 'POST') {
                return handleOnboarding(request, env);
            }
            if (url.pathname === '/api/avatar' && request.method === 'GET') {
                return handleGetAvatar(request, env);
            }
            if (url.pathname === '/api/avatar' && request.method === 'POST') {
                return handleSaveAvatar(request, env);
            }
            if (url.pathname === '/api/minime/interact' && request.method === 'POST') {
                return handleMinimeInteract(request, env);
            }
            if (url.pathname === '/api/scores' && request.method === 'POST') {
                return handleSaveScore(request, env);
            }
            if (url.pathname === '/api/scores/today' && request.method === 'GET') {
                return handleTodayScores(request, env);
            }
            if (url.pathname === '/api/rankings' && request.method === 'GET') {
                return handleRankings(request, env);
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
    const raw = env[key];
    if (!raw) {
        throw new Error(`Missing environment variable: ${key}`);
    }
    return typeof raw === 'string' ? raw.trim() : raw;
}

function startGoogleLogin(request, env) {
    const missing = getMissingGoogleEnv(env);
    if (missing.length > 0) {
        return json({
            error: 'auth_config_missing',
            message: `Google login is not configured. Missing: ${missing.join(', ')}`,
            missing,
        }, 503);
    }

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
    const missing = getMissingGoogleEnv(env);
    if (missing.length > 0) {
        return json({
            error: 'auth_config_missing',
            message: `Google login is not configured. Missing: ${missing.join(', ')}`,
            missing,
        }, 503);
    }

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

function handleGoogleDebug(request, env) {
    const rawId = env.GOOGLE_CLIENT_ID || '';
    const rawSecret = env.GOOGLE_CLIENT_SECRET || '';
    const trimmedId = rawId.trim();
    const trimmedSecret = rawSecret.trim();
    return withCors(json({
        client_id_set: Boolean(trimmedId),
        client_id_length: trimmedId.length,
        client_id_prefix: trimmedId.slice(0, 12),
        client_id_suffix: trimmedId.slice(-27),
        client_id_has_whitespace: rawId !== trimmedId,
        client_secret_set: Boolean(trimmedSecret),
        client_secret_length: trimmedSecret.length,
        client_secret_has_whitespace: rawSecret !== trimmedSecret,
        redirect_uri: getRedirectUri(request, env),
    }));
}

function getMissingGoogleEnv(env) {
    return ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'].filter((key) => !env[key]);
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
            company: session.company || null,
            commute_start: session.commute_start || '09:00',
            commute_end: session.commute_end || '18:00',
            onboarding_done: Boolean(session.onboarding_done),
        },
    }));
}

async function handleGetCompanies(request, env) {
    const db = getDb(env);
    const rows = await db.prepare(
        `SELECT c.name,
                COUNT(u.user_id) AS user_count
         FROM companies c
         LEFT JOIN users u ON u.company = c.name
         GROUP BY c.name
         ORDER BY user_count DESC, c.name ASC
         LIMIT 50`
    ).all();
    return withCors(json({ companies: rows.results || [] }));
}

async function handleOnboarding(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));

    const body = await request.json().catch(() => ({}));
    const company = typeof body.company === 'string' ? body.company.trim().slice(0, 100) : null;
    const commuteStart = /^\d{2}:\d{2}$/.test(body.commute_start) ? body.commute_start : '09:00';
    const commuteEnd = /^\d{2}:\d{2}$/.test(body.commute_end) ? body.commute_end : '18:00';
    const marketingAgreed = body.marketing_agreed === true ? 1 : 0;

    const db = getDb(env);
    const now = new Date().toISOString();
    const stmts = [
        db.prepare(
            `UPDATE users SET company=?, commute_start=?, commute_end=?, onboarding_done=1,
             marketing_agreed=?, terms_agreed_at=COALESCE(terms_agreed_at, ?), updated_at=? WHERE user_id=?`
        ).bind(company || null, commuteStart, commuteEnd, marketingAgreed, now, now, session.user_id),
    ];

    if (company) {
        stmts.push(
            db.prepare(
                `INSERT OR IGNORE INTO companies (id, name, created_at) VALUES (?, ?, ?)`
            ).bind(makeId('cmp'), company, now)
        );
    }

    await db.batch(stmts);
    return withCors(json({ ok: true, company, commute_start: commuteStart, commute_end: commuteEnd }));
}

async function handleGetAvatar(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ authenticated: false, avatar: null }));

    const avatar = await getDb(env).prepare(
        `SELECT nickname, character_type, last_minime_at FROM avatars WHERE user_id=?`
    ).bind(session.user_id).first();

    return withCors(json({ authenticated: true, avatar: avatar || null }));
}

async function handleSaveAvatar(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));

    const body = await request.json().catch(() => ({}));
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim().slice(0, 20) : null;
    const characterType = ['type_a', 'type_b'].includes(body.character_type) ? body.character_type : 'type_a';

    if (!nickname) return withCors(json({ error: 'nickname required' }, 400));

    const now = new Date().toISOString();
    await getDb(env).prepare(
        `INSERT INTO avatars (user_id, nickname, character_type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           nickname=excluded.nickname,
           character_type=excluded.character_type,
           updated_at=excluded.updated_at`
    ).bind(session.user_id, nickname, characterType, now, now).run();

    return withCors(json({ ok: true, nickname, character_type: characterType }));
}

async function handleMinimeInteract(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));

    const now = new Date().toISOString();
    await getDb(env).prepare(
        `UPDATE avatars SET last_minime_at=?, updated_at=? WHERE user_id=?`
    ).bind(now, now, session.user_id).run();

    return withCors(json({ ok: true }));
}

async function handleSaveScore(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));

    const body = await request.json().catch(() => ({}));
    const gameType = ['sudoku', '2048'].includes(body.game_type) ? body.game_type : null;
    const score = Number.isInteger(body.score) ? body.score : 0;
    const durationSeconds = Number.isInteger(body.duration_seconds) ? body.duration_seconds : null;

    if (!gameType) return withCors(json({ error: 'invalid game_type' }, 400));

    const db = getDb(env);
    const { start, end, nextHourKST } = kstHourBounds();
    const hourlyRow = await db.prepare(
        `SELECT COUNT(*) as cnt FROM game_scores
         WHERE user_id = ? AND played_at >= ? AND played_at < ?`
    ).bind(session.user_id, start, end).first();

    if ((hourlyRow?.cnt ?? 0) >= 3) {
        return withCors(json({
            error: 'hourly_limit_reached',
            plays_this_hour: hourlyRow.cnt,
            resets_at_kst: nextHourKST,
        }, 429));
    }

    const now = new Date().toISOString();
    await db.prepare(
        `INSERT INTO game_scores (id, user_id, game_type, score, played_at, duration_seconds, extra_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        makeId('gsc'),
        session.user_id,
        gameType,
        score,
        now,
        durationSeconds,
        body.extra ? JSON.stringify(body.extra) : null
    ).run();

    return withCors(json({ ok: true }));
}

async function handleTodayScores(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ authenticated: false, scores: [] }));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const db = getDb(env);
    const { start: hourStart, end: hourEnd } = kstHourBounds();

    const [rows, avatar, hourlyRow] = await Promise.all([
        db.prepare(
            `SELECT game_type, score, played_at, duration_seconds
             FROM game_scores
             WHERE user_id=? AND played_at >= ?
             ORDER BY played_at ASC`
        ).bind(session.user_id, todayStart.toISOString()).all(),
        db.prepare(`SELECT last_minime_at FROM avatars WHERE user_id=?`)
            .bind(session.user_id).first(),
        db.prepare(
            `SELECT COUNT(*) as cnt FROM game_scores
             WHERE user_id = ? AND played_at >= ? AND played_at < ?`
        ).bind(session.user_id, hourStart, hourEnd).first(),
    ]);

    const lastMinimeAt = avatar?.last_minime_at || null;
    const minimeCaredToday = lastMinimeAt && lastMinimeAt >= todayStart.toISOString();
    const hourlyPlaysUsed = hourlyRow?.cnt ?? 0;

    return withCors(json({
        authenticated: true,
        scores: rows.results || [],
        minime_cared_today: Boolean(minimeCaredToday),
        hourly_plays_used: hourlyPlaysUsed,
        hourly_plays_remaining: Math.max(0, 3 - hourlyPlaysUsed),
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
        `SELECT u.user_id, u.email, u.company, u.commute_start, u.commute_end, u.onboarding_done,
                p.nickname, p.avatar_url, p.last_login_at, s.is_new_user
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

async function handleRankings(request, env) {
    const session = await getSessionUser(getDb(env), request);
    const url = new URL(request.url);
    const period = ['daily', 'weekly', 'monthly'].includes(url.searchParams.get('period'))
        ? url.searchParams.get('period') : 'daily';

    const { start } = kstPeriodBounds(period);
    const db = getDb(env);

    const [personalTop, companyTop, personalTotalRow, companyTotalRow] = await Promise.all([
        db.prepare(`
            SELECT u.user_id,
                   COALESCE(a.nickname, p.nickname, u.email) AS nickname,
                   SUM(gs.score) AS total_score
            FROM game_scores gs
            JOIN users u ON u.user_id = gs.user_id
            LEFT JOIN avatars a ON a.user_id = u.user_id
            LEFT JOIN user_profiles p ON p.user_id = u.user_id
            WHERE gs.played_at >= ?
            GROUP BY u.user_id
            ORDER BY total_score DESC
            LIMIT 5`).bind(start).all(),
        db.prepare(`
            SELECT u.company,
                   SUM(gs.score) AS total_score,
                   COUNT(DISTINCT gs.user_id) AS player_count
            FROM game_scores gs
            JOIN users u ON u.user_id = gs.user_id
            WHERE u.company IS NOT NULL AND u.company != ''
              AND gs.played_at >= ?
            GROUP BY u.company
            ORDER BY total_score DESC
            LIMIT 5`).bind(start).all(),
        db.prepare(`SELECT COUNT(DISTINCT user_id) AS cnt FROM game_scores WHERE played_at >= ?`)
            .bind(start).first(),
        db.prepare(`SELECT COUNT(DISTINCT u.company) AS cnt
            FROM game_scores gs JOIN users u ON u.user_id = gs.user_id
            WHERE u.company IS NOT NULL AND u.company != '' AND gs.played_at >= ?`)
            .bind(start).first(),
    ]);

    let myPersonalRank = null, myPersonalScore = 0;
    let myCompanyRank = null, myCompanyScore = 0;

    if (session) {
        const [myScoreRow, myCompanyRow] = await Promise.all([
            db.prepare(`SELECT COALESCE(SUM(score),0) AS s FROM game_scores WHERE user_id=? AND played_at>=?`)
                .bind(session.user_id, start).first(),
            session.company
                ? db.prepare(`SELECT COALESCE(SUM(gs.score),0) AS s FROM game_scores gs JOIN users u ON u.user_id=gs.user_id WHERE u.company=? AND gs.played_at>=?`)
                    .bind(session.company, start).first()
                : Promise.resolve(null),
        ]);

        myPersonalScore = myScoreRow?.s ?? 0;
        myCompanyScore  = myCompanyRow?.s ?? 0;

        const [pRankRow, cRankRow] = await Promise.all([
            myPersonalScore > 0
                ? db.prepare(`SELECT COUNT(*)+1 AS r FROM (SELECT user_id,SUM(score) AS s FROM game_scores WHERE played_at>=? GROUP BY user_id) WHERE s>?`)
                    .bind(start, myPersonalScore).first()
                : Promise.resolve(null),
            myCompanyScore > 0 && session.company
                ? db.prepare(`SELECT COUNT(*)+1 AS r FROM (SELECT u.company,SUM(gs.score) AS s FROM game_scores gs JOIN users u ON u.user_id=gs.user_id WHERE u.company IS NOT NULL AND gs.played_at>=? GROUP BY u.company) WHERE s>?`)
                    .bind(start, myCompanyScore).first()
                : Promise.resolve(null),
        ]);

        myPersonalRank = pRankRow?.r ?? (myPersonalScore > 0 ? 1 : null);
        myCompanyRank  = cRankRow?.r ?? (myCompanyScore > 0 ? 1 : null);
    }

    const PERIOD_LABELS = { daily: '오늘', weekly: '이번 주', monthly: '이번 달' };
    const pResults = personalTop.results || [];
    const cResults = companyTop.results || [];

    return withCors(json({
        period,
        period_label: PERIOD_LABELS[period],
        personal: {
            my_rank:  myPersonalRank,
            my_score: myPersonalScore,
            total:    personalTotalRow?.cnt ?? 0,
            top: pResults.map((r, i) => ({
                rank: i + 1,
                nickname: r.nickname,
                score: r.total_score,
                is_me: session ? r.user_id === session.user_id : false,
            })),
        },
        company: {
            my_company: session?.company || null,
            my_rank:    myCompanyRank,
            my_score:   myCompanyScore,
            total:      companyTotalRow?.cnt ?? 0,
            top: cResults.map((r, i) => ({
                rank: i + 1,
                company: r.company,
                score: r.total_score,
                players: r.player_count,
                is_mine: session?.company ? r.company === session.company : false,
            })),
        },
    }));
}

function kstPeriodBounds(period) {
    const kstOffsetMs = 9 * 3_600_000;
    const kstNow = new Date(Date.now() + kstOffsetMs);
    const start = new Date(kstNow);
    if (period === 'daily') {
        start.setUTCHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
        const day = kstNow.getUTCDay();
        start.setUTCHours(0, 0, 0, 0);
        start.setUTCDate(start.getUTCDate() - (day === 0 ? 6 : day - 1));
    } else {
        start.setUTCDate(1);
        start.setUTCHours(0, 0, 0, 0);
    }
    return { start: new Date(start.getTime() - kstOffsetMs).toISOString() };
}

function kstHourBounds() {
    const kstOffsetMs = 9 * 3_600_000;
    const kstNow = new Date(Date.now() + kstOffsetMs);
    kstNow.setUTCMinutes(0, 0, 0);
    const hourStartUtc = new Date(kstNow.getTime() - kstOffsetMs);
    const hourEndUtc   = new Date(hourStartUtc.getTime() + 3_600_000);
    const nextHour     = (kstNow.getUTCHours() + 1) % 24;
    return {
        start: hourStartUtc.toISOString(),
        end:   hourEndUtc.toISOString(),
        nextHourKST: `${String(nextHour).padStart(2, '0')}:00`,
    };
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
