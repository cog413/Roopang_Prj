const SESSION_COOKIE = 'refresheet_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const MASTER_ADMIN_EMAIL = 'jhchae9080@gmail.com';
const GLOBAL_HOURLY_PLAY_LIMIT = 3;
let reviewSchemaReady = false;

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
            if (url.pathname === '/api/me/employee-name' && request.method === 'POST') {
                return handleSetEmployeeName(request, env);
            }
            if (url.pathname === '/api/avatar' && request.method === 'GET') {
                return handleGetAvatar(request, env);
            }
            if (url.pathname === '/api/avatar' && request.method === 'POST') {
                return handleSaveAvatar(request, env);
            }
            if (url.pathname === '/api/pattie' && request.method === 'GET') {
                return handleGetPattie(request, env);
            }
            if (url.pathname === '/api/pattie' && request.method === 'POST') {
                return handleSavePattie(request, env);
            }
            if (url.pathname === '/api/pattie/items' && request.method === 'GET') {
                return handlePattieItems(request, env);
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
            if (url.pathname === '/api/game-rankings' && request.method === 'GET') {
                return handleGameRankings(request, env);
            }
            if (url.pathname === '/api/review/comments' && request.method === 'GET') {
                return handleGetReviewComments(request, env);
            }
            if (url.pathname === '/api/review/comments' && request.method === 'POST') {
                return handleCreateReviewComment(request, env);
            }
            if (/^\/api\/review\/comments\/\d+$/.test(url.pathname) && request.method === 'PATCH') {
                return handleEditReviewComment(request, env, Number(url.pathname.split('/').pop()));
            }
            if (/^\/api\/review\/comments\/\d+$/.test(url.pathname) && request.method === 'DELETE') {
                return handleDeleteReviewComment(request, env, Number(url.pathname.split('/').pop()));
            }
            if (/^\/api\/review\/comments\/\d+\/like$/.test(url.pathname) && request.method === 'POST') {
                const parts = url.pathname.split('/');
                return handleToggleReviewLike(request, env, Number(parts[parts.length - 2]));
            }
            if (url.pathname === '/api/review/feedback' && request.method === 'POST') {
                return handleSubmitOperatorFeedback(request, env);
            }
            if (url.pathname === '/api/review/nickname' && request.method === 'POST') {
                return handleSaveReviewNickname(request, env);
            }
            if (url.pathname === '/api/unlockables' && request.method === 'GET') {
                return handleGetUnlockables(request, env);
            }
            if (url.pathname === '/api/unlockables/check' && request.method === 'GET') {
                return handleCheckUnlockable(request, env);
            }
            if (url.pathname === '/api/referral' && request.method === 'GET') {
                return handleGetReferral(request, env);
            }
            if (url.pathname === '/api/referral' && request.method === 'POST') {
                return handleSaveReferral(request, env);
            }
            if (url.pathname === '/api/games/typing/sentences' && request.method === 'GET') {
                return handleTypingSentences(request, env);
            }
            if (url.pathname === '/api/games/typing/finish' && request.method === 'POST') {
                return handleTypingFinish(request, env);
            }
            if (url.pathname === '/api/games/typing/ranking' && request.method === 'GET') {
                return handleTypingRanking(request, env);
            }
            if (url.pathname === '/api/dev-login' && request.method === 'POST') {
                return handleDevLogin(request, env);
            }

            // ── Pet Economy API ────────────────────────────────────────────
            if (url.pathname === '/api/pet/economy' && request.method === 'GET') {
                return handleGetPetEconomy(request, env);
            }
            if (url.pathname === '/api/pet/items/purchase' && request.method === 'POST') {
                return handlePurchaseItem(request, env);
            }
            if (url.pathname === '/api/pet/happiness/change' && request.method === 'POST') {
                return handleHappinessChange(request, env);
            }
            if (url.pathname === '/api/pet/happiness/daily-close' && request.method === 'POST') {
                return handleHappinessDailyClose(request, env);
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
            employee_name: session.employee_name || null,
            avatar_url: session.avatar_url,
            last_login_at: session.last_login_at,
            is_new_user: Boolean(session.is_new_user),
            company: session.company || null,
            commute_start: session.commute_start || '09:00',
            commute_end: session.commute_end || '18:00',
            onboarding_done: Boolean(session.onboarding_done),
            marketing_agreed: Boolean(session.marketing_agreed),
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

async function handleSetEmployeeName(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));

    const body = await request.json().catch(() => ({}));
    const raw = typeof body.employee_name === 'string' ? body.employee_name.trim() : '';

    if (!raw) return withCors(json({ error: 'employee_name_required', message: '사원명을 입력해주세요' }, 400));
    if (raw.length > 10) return withCors(json({ error: 'employee_name_too_long', message: '사원명은 최대 10자입니다' }, 400));
    // 허용: 한글(가-힣 ㄱ-ㅎ ㅏ-ㅣ), 영문, 숫자, 공백, !@#$%^&()-_.
    // 불허: < > " ' ; / \ | ` 및 제어문자 (HTML·SQL 시각적 혼동 방지)
    if (!/^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9 !@#$%^&()\-_.]+$/.test(raw)) {
        return withCors(json({
            error: 'employee_name_invalid',
            message: '허용되지 않는 문자입니다. 한글·영문·숫자·공백·!@#$%^&()-_. 만 사용 가능합니다',
        }, 400));
    }

    const db = getDb(env);
    const now = new Date().toISOString();
    await db.prepare(
        `UPDATE users SET employee_name=?, updated_at=? WHERE user_id=?`
    ).bind(raw, now, session.user_id).run();

    return withCors(json({ ok: true, employee_name: raw }));
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

async function handleGetPattie(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ authenticated: false, pattie: null }));

    const avatar = await getDb(env).prepare(
        `SELECT nickname, character_type, character_key, equipped_item_keys, last_minime_at
         FROM avatars WHERE user_id=?`
    ).bind(session.user_id).first();

    return withCors(json({
        authenticated: true,
        pattie: avatar ? normalizePattieRow(avatar) : null,
    }));
}

async function handleSavePattie(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));

    const body = await request.json().catch(() => ({}));
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim().slice(0, 20) : null;
    const characterKey = ['mong', 'rabbit', 'dog', 'cat', 'cabul'].includes(body.character_key) ? body.character_key : 'mong';
    const equippedItems = Array.isArray(body.equipped_item_keys)
        ? body.equipped_item_keys.filter((key) => ['sunglasses', 'bee_suit'].includes(key)).slice(0, 4)
        : [];

    if (!nickname) return withCors(json({ error: 'nickname required' }, 400));

    const db = getDb(env);

    if (characterKey === 'cabul') {
        await ensureUnlockSchema(db);
        const lock = await getUnlockState(db, session, 'character_kitty');
        if (lock.is_locked) {
            return withCors(json({ error: 'locked', message: lock.lock_reason }, 403));
        }
    }
    const now = new Date().toISOString();
    const itemJson = JSON.stringify(equippedItems);
    const characterType = characterKey;
    const stmts = [
        db.prepare(
            `INSERT INTO avatars (user_id, nickname, character_type, character_key, equipped_item_keys, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
               nickname=excluded.nickname,
               character_type=excluded.character_type,
               character_key=excluded.character_key,
               equipped_item_keys=excluded.equipped_item_keys,
               updated_at=excluded.updated_at`
        ).bind(session.user_id, nickname, characterType, characterKey, itemJson, now, now),
    ];

    for (const itemKey of equippedItems) {
        stmts.push(
            db.prepare(
                `INSERT OR IGNORE INTO user_pattie_items (user_id, item_key, acquired_at, source)
                 VALUES (?, ?, ?, 'default')`
            ).bind(session.user_id, itemKey, now)
        );
    }

    await db.batch(stmts);
    return withCors(json({
        ok: true,
        pattie: { nickname, character_type: characterType, character_key: characterKey, equipped_item_keys: equippedItems },
    }));
}

async function handlePattieItems(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ authenticated: false, items: [] }));

    const rows = await getDb(env).prepare(
        `SELECT item_key, display_name, item_type, src, is_test_asset
         FROM pattie_items
         WHERE is_active=1
         ORDER BY item_key ASC`
    ).all();

    return withCors(json({ authenticated: true, items: rows.results || [] }));
}

function normalizePattieRow(row) {
    let equipped = [];
    try {
        equipped = row.equipped_item_keys ? JSON.parse(row.equipped_item_keys) : [];
    } catch {
        equipped = [];
    }
    const legacy = row.character_type === 'type_b' ? 'dog' : row.character_type;
    const characterKey = ['mong', 'rabbit', 'dog', 'cat', 'cabul'].includes(row.character_key)
        ? row.character_key
        : ['mong', 'rabbit', 'dog', 'cat', 'cabul'].includes(legacy)
            ? legacy
            : 'mong';
    return {
        nickname: row.nickname,
        character_type: row.character_type,
        character_key: characterKey,
        equipped_item_keys: Array.isArray(equipped) ? equipped : [],
        last_minime_at: row.last_minime_at || null,
    };
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
    const gameType = ['sudoku', '2048', 'new_game', 'typing_game'].includes(body.game_type) ? body.game_type : null;
    const score = Number.isInteger(body.score) ? body.score : 0;
    const durationSeconds = Number.isInteger(body.duration_seconds) ? body.duration_seconds : null;

    if (!gameType) return withCors(json({ error: 'invalid game_type' }, 400));

    if (!session.employee_name) {
        return withCors(json({ error: 'employee_name_required', message: '사원명을 설정해야 실적이 반영됩니다' }, 403));
    }

    const db = getDb(env);
    if (gameType === 'new_game') {
        await ensureUnlockSchema(db);
        const lock = await getUnlockState(db, session, 'new_game');
        if (lock.is_locked) {
            return withCors(json({ error: 'locked', message: lock.lock_reason }, 403));
        }
    }

    const { start, end, nextHourKST } = kstHourBounds();
    // Global hourly ticket pool shared by every game.
    const hourlyRow = await db.prepare(
        `SELECT COUNT(*) as cnt FROM game_scores
         WHERE user_id = ? AND played_at >= ? AND played_at < ?`
    ).bind(session.user_id, start, end).first();

    if ((hourlyRow?.cnt ?? 0) >= GLOBAL_HOURLY_PLAY_LIMIT) {
        return withCors(json({
            error: 'hourly_limit_reached',
            plays_this_hour: hourlyRow.cnt,
            resets_at_kst: nextHourKST,
        }, 429));
    }

    const now = new Date().toISOString();
    const scoreId = makeId('gsc');
    await db.prepare(
        `INSERT INTO game_scores (id, user_id, game_type, score, played_at, duration_seconds, extra_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        scoreId,
        session.user_id,
        gameType,
        score,
        now,
        durationSeconds,
        body.extra ? JSON.stringify(body.extra) : null
    ).run();

    // score 1/10 포인트 적립 (중복 방지: source_id = score row id)
    const earnedPoints = Math.floor(score / 10);
    if (earnedPoints > 0) {
        await earnPoints(db, session.user_id, earnedPoints, scoreId, now);
    }

    return withCors(json({ ok: true, earned_points: earnedPoints }));
}

async function handleTodayScores(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ authenticated: false, scores: [] }));

    const { start: todayStart } = kstPeriodBounds('daily');

    const db = getDb(env);
    const { start: hourStart, end: hourEnd } = kstHourBounds();

    // Ticket availability is global, even if callers pass a game_type.
    const hourlyStmt = db.prepare(
        `SELECT COUNT(*) as cnt FROM game_scores
         WHERE user_id = ? AND played_at >= ? AND played_at < ?`
    ).bind(session.user_id, hourStart, hourEnd);

    const [rows, avatar, hourlyRow] = await Promise.all([
        db.prepare(
            `SELECT game_type, score, played_at, duration_seconds
             FROM game_scores
             WHERE user_id=? AND played_at >= ?
             ORDER BY played_at ASC`
        ).bind(session.user_id, todayStart).all(),
        db.prepare(`SELECT last_minime_at FROM avatars WHERE user_id=?`)
            .bind(session.user_id).first(),
        hourlyStmt.first(),
    ]);

    const lastMinimeAt = avatar?.last_minime_at || null;
    const minimeCaredToday = lastMinimeAt && lastMinimeAt >= todayStart;
    const hourlyPlaysUsed = hourlyRow?.cnt ?? 0;

    return withCors(json({
        authenticated: true,
        scores: rows.results || [],
        minime_cared_today: Boolean(minimeCaredToday),
        hourly_plays_used: hourlyPlaysUsed,
        hourly_plays_remaining: Math.max(0, GLOBAL_HOURLY_PLAY_LIMIT - hourlyPlaysUsed),
        hourly_plays_limit: GLOBAL_HOURLY_PLAY_LIMIT,
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
                u.marketing_agreed, u.employee_name,
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
        // 사원명 설정 유저만 랭킹에 노출
        db.prepare(`
            SELECT u.user_id,
                   u.employee_name AS nickname,
                   SUM(gs.score) AS total_score
            FROM game_scores gs
            JOIN users u ON u.user_id = gs.user_id
            WHERE gs.played_at >= ?
              AND u.employee_name IS NOT NULL
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
              AND u.employee_name IS NOT NULL
              AND gs.played_at >= ?
            GROUP BY u.company
            ORDER BY total_score DESC
            LIMIT 5`).bind(start).all(),
        db.prepare(`
            SELECT COUNT(DISTINCT gs.user_id) AS cnt
            FROM game_scores gs JOIN users u ON u.user_id = gs.user_id
            WHERE gs.played_at >= ? AND u.employee_name IS NOT NULL`)
            .bind(start).first(),
        db.prepare(`SELECT COUNT(DISTINCT u.company) AS cnt
            FROM game_scores gs JOIN users u ON u.user_id = gs.user_id
            WHERE u.company IS NOT NULL AND u.company != ''
              AND u.employee_name IS NOT NULL AND gs.played_at >= ?`)
            .bind(start).first(),
    ]);

    let myPersonalRank = null, myPersonalScore = 0;
    let myCompanyRank = null, myCompanyScore = 0;

    if (session) {
        const [myScoreRow, myCompanyRow] = await Promise.all([
            // 본인도 사원명 있어야 랭킹 점수 집계
            session.employee_name
                ? db.prepare(`SELECT COALESCE(SUM(score),0) AS s FROM game_scores WHERE user_id=? AND played_at>=?`)
                    .bind(session.user_id, start).first()
                : Promise.resolve({ s: 0 }),
            session.company && session.employee_name
                ? db.prepare(`SELECT COALESCE(SUM(gs.score),0) AS s FROM game_scores gs JOIN users u ON u.user_id=gs.user_id WHERE u.company=? AND gs.played_at>=? AND u.employee_name IS NOT NULL`)
                    .bind(session.company, start).first()
                : Promise.resolve(null),
        ]);

        myPersonalScore = myScoreRow?.s ?? 0;
        myCompanyScore  = myCompanyRow?.s ?? 0;

        const [pRankRow, cRankRow] = await Promise.all([
            myPersonalScore > 0
                ? db.prepare(`SELECT COUNT(*)+1 AS r FROM (SELECT u.user_id,SUM(gs.score) AS s FROM game_scores gs JOIN users u ON u.user_id=gs.user_id WHERE gs.played_at>=? AND u.employee_name IS NOT NULL GROUP BY u.user_id) WHERE s>?`)
                    .bind(start, myPersonalScore).first()
                : Promise.resolve(null),
            myCompanyScore > 0 && session.company
                ? db.prepare(`SELECT COUNT(*)+1 AS r FROM (SELECT u.company,SUM(gs.score) AS s FROM game_scores gs JOIN users u ON u.user_id=gs.user_id WHERE u.company IS NOT NULL AND u.employee_name IS NOT NULL AND gs.played_at>=? GROUP BY u.company) WHERE s>?`)
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

async function handleGameRankings(request, env) {
    const url = new URL(request.url);
    const requestedType = url.searchParams.get('game_type');
    const gameTypeAliases = {
        '2048': '2048',
        sudoku: 'sudoku',
        sdk: 'sudoku',
        typing_game: 'typing_game',
        reference: 'typing_game',
    };
    const gameType = gameTypeAliases[requestedType] || null;
    const period = url.searchParams.get('period') === 'weekly' ? 'weekly' : 'daily';

    if (!gameType) return withCors(json({ error: 'invalid game_type' }, 400));

    const { start } = kstPeriodBounds(period);
    const db = getDb(env);
    const rows = await db.prepare(`
        SELECT gs.score,
               gs.played_at,
               gs.played_at AS created_at,
               u.employee_name,
               u.company
        FROM game_scores gs
        JOIN users u ON u.user_id = gs.user_id
        WHERE gs.game_type = ?
          AND gs.played_at >= ?
        ORDER BY gs.score DESC, gs.played_at ASC
        LIMIT 20
    `).bind(gameType, start).all();

    return withCors(json({
        game_type: gameType,
        period,
        rows: rows.results || [],
    }));
}

async function handleGetReviewComments(request, env) {
    const db = getDb(env);
    await ensureReviewSchema(db);
    const session = await getSessionUser(db, request);
    const userId = session?.user_id || null;
    const isAdmin = isMasterAdmin(session);

    // inactive 유저(is_active=0)의 댓글은 JOIN 조건으로 제거.
    // 부모가 inactive 유저인 대댓글은 parent_comment_id가 결과에 없으므로 프론트에서 자동 무시.
    const rows = await db.prepare(`
        SELECT c.id, c.parent_comment_id, c.body, c.is_deleted, c.created_at, c.updated_at,
               c.user_id,
               u.employee_name,
               u.company,
               COUNT(cl.id) AS like_count,
               MAX(CASE WHEN cl.user_id = ? THEN 1 ELSE 0 END) AS liked_by_me
        FROM comments c
        JOIN users u ON u.user_id = c.user_id
                    AND (u.is_active IS NULL OR u.is_active = 1)
        LEFT JOIN comment_likes cl ON cl.comment_id = c.id
        GROUP BY c.id
        ORDER BY COALESCE(c.parent_comment_id, c.id) ASC,
                 CASE WHEN c.parent_comment_id IS NULL THEN 0 ELSE 1 END ASC,
                 c.created_at ASC,
                 c.id ASC`
    ).bind(userId || '').all();

    return withCors(json({
        authenticated: Boolean(session),
        employee_name_required: Boolean(session && !session.employee_name),
        comments: (rows.results || []).map((row) => ({
            id: row.id,
            parent_comment_id: row.parent_comment_id,
            body: row.is_deleted ? '삭제된 댓글입니다' : row.body,
            is_deleted: Boolean(row.is_deleted),
            created_at: row.created_at,
            updated_at: row.updated_at,
            employee_name: row.is_deleted ? null : (row.employee_name || null),
            company: row.is_deleted ? null : (row.company || null),
            like_count: row.like_count || 0,
            liked_by_me: Boolean(row.liked_by_me),
            can_edit: Boolean(session && !row.is_deleted && row.user_id === session.user_id),
            can_delete: Boolean(session && !row.is_deleted && (row.user_id === session.user_id || isAdmin)),
        })),
    }));
}

async function handleCreateReviewComment(request, env) {
    const db = getDb(env);
    await ensureReviewSchema(db);
    const session = await getSessionUser(db, request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));
    if (!session.employee_name) return withCors(json({ error: 'employee_name_required', message: '댓글을 작성하려면 사원명을 먼저 설정해주세요' }, 409));

    const data = await request.json().catch(() => ({}));
    const body = normalizeText(data.body, 100);
    const parentId = data.parent_comment_id ? Number(data.parent_comment_id) : null;
    if (!body) return withCors(json({ error: 'invalid_body', message: '댓글을 입력해주세요' }, 400));
    if (parentId && !Number.isInteger(parentId)) return withCors(json({ error: 'invalid_parent' }, 400));

    if (parentId) {
        const parent = await db.prepare('SELECT id FROM comments WHERE id=? AND is_deleted=0')
            .bind(parentId).first();
        if (!parent) return withCors(json({ error: 'parent_not_found' }, 404));
    }

    const limit = await dailyCount(db, 'comments', session.user_id);
    if (limit >= 3) {
        return withCors(json({ error: 'daily_limit', message: '하루 등록 가능 댓글은 3개입니다' }, 429));
    }

    const result = await db.prepare(
        `INSERT INTO comments (user_id, parent_comment_id, body, created_at, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(session.user_id, parentId, body).run();

    return withCors(json({ ok: true, id: result.meta?.last_row_id || null }));
}

async function handleEditReviewComment(request, env, commentId) {
    const db = getDb(env);
    await ensureReviewSchema(db);
    const session = await getSessionUser(db, request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));

    const data = await request.json().catch(() => ({}));
    const body = normalizeText(data.body, 100);
    if (!body) return withCors(json({ error: 'invalid_body', message: '댓글을 입력해주세요' }, 400));

    const comment = await db.prepare('SELECT user_id, is_deleted FROM comments WHERE id=?')
        .bind(commentId).first();
    if (!comment) return withCors(json({ error: 'not_found' }, 404));
    if (comment.is_deleted) return withCors(json({ error: 'deleted_comment' }, 400));
    if (comment.user_id !== session.user_id) return withCors(json({ error: 'forbidden' }, 403));

    await db.prepare(
        `UPDATE comments SET body=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).bind(body, commentId).run();

    return withCors(json({ ok: true }));
}

async function handleDeleteReviewComment(request, env, commentId) {
    const db = getDb(env);
    await ensureReviewSchema(db);
    const session = await getSessionUser(db, request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));

    const comment = await db.prepare('SELECT user_id, is_deleted FROM comments WHERE id=?')
        .bind(commentId).first();
    if (!comment) return withCors(json({ error: 'not_found' }, 404));
    if (comment.is_deleted) return withCors(json({ ok: true }));
    if (comment.user_id !== session.user_id && !isMasterAdmin(session)) {
        return withCors(json({ error: 'forbidden' }, 403));
    }

    await db.prepare(
        `UPDATE comments SET is_deleted=1, body='', deleted_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).bind(commentId).run();

    return withCors(json({ ok: true }));
}

async function handleToggleReviewLike(request, env, commentId) {
    const db = getDb(env);
    await ensureReviewSchema(db);
    const session = await getSessionUser(db, request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));

    const comment = await db.prepare('SELECT id, is_deleted FROM comments WHERE id=?')
        .bind(commentId).first();
    if (!comment || comment.is_deleted) return withCors(json({ error: 'not_found' }, 404));

    const existing = await db.prepare('SELECT id FROM comment_likes WHERE comment_id=? AND user_id=?')
        .bind(commentId, session.user_id).first();
    if (existing) {
        await db.prepare('DELETE FROM comment_likes WHERE comment_id=? AND user_id=?')
            .bind(commentId, session.user_id).run();
    } else {
        await db.prepare('INSERT OR IGNORE INTO comment_likes (comment_id, user_id) VALUES (?, ?)')
            .bind(commentId, session.user_id).run();
    }

    const row = await db.prepare('SELECT COUNT(*) AS cnt FROM comment_likes WHERE comment_id=?')
        .bind(commentId).first();
    return withCors(json({ ok: true, liked: !existing, like_count: row?.cnt || 0 }));
}

async function handleSubmitOperatorFeedback(request, env) {
    const db = getDb(env);
    await ensureReviewSchema(db);
    const session = await getSessionUser(db, request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));
    if (!session.employee_name) return withCors(json({ error: 'employee_name_required', message: '사원명을 설정해야 의견을 접수할 수 있습니다' }, 409));

    const data = await request.json().catch(() => ({}));
    const body = normalizeText(data.body, 200);
    if (!body) return withCors(json({ error: 'invalid_body', message: '의견을 입력해주세요' }, 400));

    const limit = await dailyCount(db, 'operator_feedback', session.user_id);
    if (limit >= 3) {
        return withCors(json({ error: 'daily_limit', message: '하루 등록 가능 의견은 3개입니다' }, 429));
    }

    await db.prepare(
        `INSERT INTO operator_feedback (user_id, body, created_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)`
    ).bind(session.user_id, body).run();

    return withCors(json({ ok: true, message: '정상 접수되었습니다. 감사합니다' }));
}

async function handleSaveReviewNickname(request, env) {
    const db = getDb(env);
    await ensureReviewSchema(db);
    const session = await getSessionUser(db, request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));

    const data = await request.json().catch(() => ({}));
    const nickname = normalizeText(data.nickname, 20);
    if (!nickname) return withCors(json({ error: 'invalid_nickname', message: '닉네임을 입력해주세요' }, 400));

    const duplicate = await db.prepare(
        `SELECT user_id FROM user_profiles WHERE nickname = ? AND user_id != ? LIMIT 1`
    ).bind(nickname, session.user_id).first();
    if (duplicate) {
        return withCors(json({ error: 'duplicate_nickname', message: '이미 사용 중인 닉네임입니다' }, 409));
    }

    const now = new Date().toISOString();
    try {
        await db.prepare(
            `INSERT INTO user_profiles (user_id, nickname, created_at, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
               nickname=excluded.nickname,
               updated_at=excluded.updated_at`
        ).bind(session.user_id, nickname, now, now).run();
    } catch (error) {
        if (String(error?.message || error).toLowerCase().includes('unique')) {
            return withCors(json({ error: 'duplicate_nickname', message: '이미 사용 중인 닉네임입니다' }, 409));
        }
        throw error;
    }

    return withCors(json({ ok: true, nickname }));
}

async function ensureReviewSchema(db) {
    if (reviewSchemaReady) return;

    const profileColumns = await db.prepare('PRAGMA table_info(user_profiles)').all();
    const hasNickname = (profileColumns.results || []).some((column) => column.name === 'nickname');
    if (!hasNickname) {
        await db.prepare('ALTER TABLE user_profiles ADD COLUMN nickname TEXT').run();
    }

    // users.is_active — invalid/deleted user 필터링 (migration 011)
    const userColumns = await db.prepare('PRAGMA table_info(users)').all();
    const hasIsActive = (userColumns.results || []).some(c => c.name === 'is_active');
    if (!hasIsActive) {
        await db.prepare('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1').run();
        await db.prepare('CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE is_active = 0').run();
    }

    await db.batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            parent_comment_id INTEGER,
            body TEXT NOT NULL,
            is_deleted INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            deleted_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (parent_comment_id) REFERENCES comments(id)
        )`),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments(user_id, created_at)'),
        db.prepare(`CREATE TABLE IF NOT EXISTS comment_likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            comment_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (comment_id) REFERENCES comments(id),
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            UNIQUE(comment_id, user_id)
        )`),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id)'),
        db.prepare(`CREATE TABLE IF NOT EXISTS operator_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            body TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )`),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_operator_feedback_user_created ON operator_feedback(user_id, created_at)'),
    ]);

    try {
        await db.prepare(
            `CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_nickname_unique
             ON user_profiles(nickname)
             WHERE nickname IS NOT NULL AND nickname != ''`
        ).run();
    } catch (error) {
        console.warn('Nickname unique index was not created:', error?.message || error);
    }

    reviewSchemaReady = true;
}

async function dailyCount(db, table, userId) {
    const row = await db.prepare(
        `SELECT COUNT(*) AS cnt FROM ${table}
         WHERE user_id = ? AND date(created_at) = date('now')`
    ).bind(userId).first();
    return row?.cnt || 0;
}

function normalizeText(value, maxLength) {
    if (typeof value !== 'string') return '';
    const text = value.trim();
    return text.length <= maxLength ? text : '';
}

function isMasterAdmin(session) {
    return Boolean(session?.email && session.email.toLowerCase() === MASTER_ADMIN_EMAIL);
}

async function handleGetUnlockables(request, env) {
    const db = getDb(env);
    await ensureUnlockSchema(db);
    const session = await getSessionUser(db, request);
    const rows = await db.prepare(
        `SELECT item_key, item_type, display_name, lock_type, lock_value, lock_reason
         FROM unlockable_items
         WHERE is_active=1
         ORDER BY id ASC`
    ).all();
    const items = [];
    for (const row of rows.results || []) {
        items.push(await getUnlockState(db, session, row.item_key, row));
    }
    return withCors(json({ authenticated: Boolean(session), items }));
}

async function handleCheckUnlockable(request, env) {
    const db = getDb(env);
    await ensureUnlockSchema(db);
    const session = await getSessionUser(db, request);
    const itemKey = new URL(request.url).searchParams.get('item_key') || '';
    if (!itemKey) return withCors(json({ error: 'item_key_required' }, 400));
    return withCors(json(await getUnlockState(db, session, itemKey)));
}

async function handleGetReferral(request, env) {
    const db = getDb(env);
    await ensureUnlockSchema(db);
    const session = await getSessionUser(db, request);
    if (!session) return withCors(json({ authenticated: false, referral: null }));

    const row = await db.prepare(
        `SELECT referrer_email, created_at, reward_status
         FROM user_referrals
         WHERE user_id=?`
    ).bind(session.user_id).first();
    return withCors(json({
        authenticated: true,
        referral: row ? {
            referrer_email: row.referrer_email,
            created_at: row.created_at,
            reward_status: row.reward_status,
            editable: false,
            reason: '추천계정 입력 후에는 수정할 수 없습니다.',
        } : {
            referrer_email: null,
            editable: true,
            reason: '추천계정은 기존에 가입된 계정이어야 합니다.',
        },
    }));
}

async function handleSaveReferral(request, env) {
    const db = getDb(env);
    await ensureUnlockSchema(db);
    const session = await getSessionUser(db, request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));

    const existing = await db.prepare('SELECT id FROM user_referrals WHERE user_id=?')
        .bind(session.user_id).first();
    if (existing) {
        return withCors(json({ error: 'immutable_referral', message: '추천계정 입력 후에는 수정할 수 없습니다.' }, 409));
    }

    const data = await request.json().catch(() => ({}));
    const referrerEmail = typeof data.referrer_email === 'string'
        ? data.referrer_email.trim().toLowerCase()
        : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(referrerEmail)) {
        return withCors(json({ error: 'invalid_email', message: '올바른 이메일을 입력해주세요.' }, 400));
    }
    if (session.email && referrerEmail === session.email.toLowerCase()) {
        return withCors(json({ error: 'self_referral', message: '본인 계정은 추천계정으로 입력할 수 없습니다.' }, 400));
    }

    const referrer = await db.prepare('SELECT user_id, email FROM users WHERE lower(email)=?')
        .bind(referrerEmail).first();
    if (!referrer) {
        return withCors(json({ error: 'referrer_not_found', message: '추천계정은 기존에 가입된 계정이어야 합니다.' }, 404));
    }

    await db.prepare(
        `INSERT INTO user_referrals (user_id, referrer_user_id, referrer_email, created_at, reward_status)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'pending')`
    ).bind(session.user_id, referrer.user_id, referrerEmail).run();

    return withCors(json({ ok: true, referrer_email: referrerEmail, editable: false }));
}

async function ensureUnlockSchema(db) {
    await db.batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS unlockable_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_key TEXT NOT NULL UNIQUE,
            item_type TEXT NOT NULL,
            display_name TEXT NOT NULL,
            lock_type TEXT NOT NULL DEFAULT 'none',
            lock_value TEXT,
            lock_reason TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_unlockable_items_type ON unlockable_items(item_type)'),
        db.prepare(`CREATE TABLE IF NOT EXISTS user_unlocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            item_key TEXT NOT NULL,
            unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            unlock_source TEXT,
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            UNIQUE(user_id, item_key)
        )`),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_user_unlocks_user ON user_unlocks(user_id)'),
        db.prepare(`CREATE TABLE IF NOT EXISTS user_referrals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL UNIQUE,
            referrer_user_id TEXT NOT NULL,
            referrer_email TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reward_status TEXT NOT NULL DEFAULT 'pending',
            reward_granted_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (referrer_user_id) REFERENCES users(user_id)
        )`),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer ON user_referrals(referrer_user_id)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_user_referrals_email ON user_referrals(referrer_email)'),
        db.prepare(`INSERT INTO unlockable_items (
            item_key, item_type, display_name, lock_type, lock_value, lock_reason, is_active
        ) VALUES (
            'new_game', 'sheet', 'NewGame', 'referral', '2', '친구추천 2명 달성 시 이용할 수 있습니다', 1
        )
        ON CONFLICT(item_key) DO UPDATE SET
            item_type=excluded.item_type,
            display_name=excluded.display_name,
            lock_type=excluded.lock_type,
            lock_value=excluded.lock_value,
            lock_reason=excluded.lock_reason,
            is_active=excluded.is_active,
            updated_at=CURRENT_TIMESTAMP`),
        db.prepare(`INSERT INTO unlockable_items (
            item_key, item_type, display_name, lock_type, lock_value, lock_reason, is_active
        ) VALUES (
            'character_kitty', 'character', 'Kitty', 'referral', '2', '친구 추천 2회 이상 필요', 1
        )
        ON CONFLICT(item_key) DO UPDATE SET
            item_type=excluded.item_type,
            display_name=excluded.display_name,
            lock_type=excluded.lock_type,
            lock_value=excluded.lock_value,
            lock_reason=excluded.lock_reason,
            is_active=excluded.is_active,
            updated_at=CURRENT_TIMESTAMP`),
    ]);
}

async function getUnlockState(db, session, itemKey, item = null) {
    const row = item || await db.prepare(
        `SELECT item_key, item_type, display_name, lock_type, lock_value, lock_reason
         FROM unlockable_items
         WHERE item_key=? AND is_active=1`
    ).bind(itemKey).first();
    if (!row) {
        return { item_key: itemKey, is_locked: true, lock_reason: '잠금 정보를 찾을 수 없습니다.' };
    }
    if (row.lock_type === 'none') return { ...row, is_locked: false, lock_reason: null };
    if (!session) return { ...row, is_locked: true };
    if (isMasterAdmin(session)) return { ...row, is_locked: false, lock_reason: null };

    const manual = await db.prepare('SELECT id FROM user_unlocks WHERE user_id=? AND item_key=?')
        .bind(session.user_id, row.item_key).first();
    if (manual) return { ...row, is_locked: false, lock_reason: null };

    if (row.lock_type === 'referral') {
        const required = Number.parseInt(row.lock_value || '0', 10);
        const countRow = await db.prepare(
            `SELECT COUNT(*) AS cnt
             FROM user_referrals
             WHERE referrer_user_id=?
               AND reward_status IN ('pending', 'granted')`
        ).bind(session.user_id).first();
        if ((countRow?.cnt || 0) >= required) {
            return { ...row, is_locked: false, lock_reason: null, referral_count: countRow?.cnt || 0 };
        }
        return { ...row, is_locked: true, referral_count: countRow?.cnt || 0 };
    }

    return { ...row, is_locked: true };
}

// --- Dev-login: preview-only QA session endpoint ---
// Blocked on all production hosts. Requires DEV_LOGIN_ENABLED=true and Bearer token.
async function handleDevLogin(request, env) {
    const url = new URL(request.url);
    // Host-level block: only sub.refresheet-prj.pages.dev is allowed.
    // Any other hostname (including production) returns 404 — not 403 — to avoid fingerprinting.
    if (url.hostname !== 'sub.refresheet-prj.pages.dev') {
        return json({ error: 'not_found' }, 404);
    }
    if (env.DEV_LOGIN_ENABLED !== 'true') {
        return json({ error: 'not_found' }, 404);
    }
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const expected = typeof env.DEV_LOGIN_TOKEN === 'string' ? env.DEV_LOGIN_TOKEN.trim() : '';
    if (!token || !expected || token !== expected) {
        return json({ error: 'forbidden' }, 403);
    }
    const db = getDb(env);
    const user = await db.prepare(
        `SELECT user_id FROM users WHERE email = ?`
    ).bind('qa_jhchae908p@refresheet.test').first();
    if (!user) {
        return json({ error: 'qa_user_not_found', hint: 'Apply docs/migrations/006_qa_seed.sql to DB' }, 503);
    }
    // Reuse exact same createSession() as Google OAuth — no duplicate session logic.
    const sessionId = await createSession(db, user.user_id, false, request);
    const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
    headers.append('Set-Cookie', makeCookie(SESSION_COOKIE, sessionId, {
        maxAge: SESSION_TTL_SECONDS,
        httpOnly: true,
        sameSite: 'Lax',
        path: '/',
    }));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
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

// ── Pet Economy: shared helpers ──────────────────────────────────────────────

const PET_ID = 'primary';
const HAPPINESS_MIN = 40;
const HAPPINESS_MAX = 100;
const HAPPINESS_INITIAL = 40;
const PET_DAILY_SCORE_LIMIT = 3;    // 토닥여주기 / 말걸기 점수 증가 일일 최대
const APPLE_PRICE = 300;
const VALID_ITEM_IDS = ['apple'];

// 캐릭터별 행복 증가량 config
const HAPPINESS_CONFIG = {
    mong:   { pet: [5, 8],   feed: [10, 15], talk: [3, 5] },
    corgi:  { pet: [5, 8],   feed: [10, 15], talk: [3, 5] },
    cabul:  { pet: [2, 5],   feed: [15, 20], talk: [1, 3] },
    kitty:  { pet: [2, 5],   feed: [15, 20], talk: [1, 3] },
    rabbit: { pet: [5, 8],   feed: [10, 15], talk: [3, 5] },
    dog:    { pet: [5, 8],   feed: [10, 15], talk: [3, 5] },
    cat:    { pet: [2, 5],   feed: [15, 20], talk: [1, 3] },
};

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function kstDateString() {
    const kstOffsetMs = 9 * 3_600_000;
    return new Date(Date.now() + kstOffsetMs).toISOString().slice(0, 10);
}

// 포인트 적립 (중복 방지: source_id 고유 인덱스)
async function earnPoints(db, userId, amount, sourceId, now) {
    try {
        const cur = await db.prepare(
            `SELECT current_points, total_earned_points FROM user_points WHERE user_id=?`
        ).bind(userId).first();

        const prev = cur?.current_points ?? 0;
        const totalEarned = (cur?.total_earned_points ?? 0) + amount;
        const after = prev + amount;

        const stmts = [
            db.prepare(
                `INSERT INTO user_points (user_id, current_points, total_earned_points, total_spent_points, created_at, updated_at)
                 VALUES (?, ?, ?, 0, ?, ?)
                 ON CONFLICT(user_id) DO UPDATE SET
                   current_points=excluded.current_points,
                   total_earned_points=excluded.total_earned_points,
                   updated_at=excluded.updated_at`
            ).bind(userId, after, totalEarned, now, now),
            db.prepare(
                `INSERT INTO point_transactions (user_id, type, amount, source_type, source_id, balance_after, created_at)
                 VALUES (?, 'EARN', ?, 'GAME_SCORE', ?, ?, ?)`
            ).bind(userId, amount, sourceId, after, now),
        ];
        await db.batch(stmts);
        return { ok: true, balance_after: after };
    } catch (err) {
        // UNIQUE 위반 = 이미 적립된 source_id → 중복 무시
        if (String(err?.message || err).toLowerCase().includes('unique')) {
            return { ok: false, reason: 'duplicate' };
        }
        throw err;
    }
}

// 행복점수 조회 (없으면 초기 row 생성)
async function getOrInitHappiness(db, userId, now) {
    const row = await db.prepare(
        `SELECT current_score, last_daily_close_date FROM pet_happiness_state WHERE user_id=? AND pet_id=?`
    ).bind(userId, PET_ID).first();
    if (row) return row;

    await db.prepare(
        `INSERT INTO pet_happiness_state (user_id, pet_id, current_score, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
    ).bind(userId, PET_ID, HAPPINESS_INITIAL, now, now).run();
    return { current_score: HAPPINESS_INITIAL, last_daily_close_date: null };
}

// 일일 제한 row 조회 (없으면 초기화)
async function getOrInitDailyLimits(db, userId, actionDate, now) {
    const row = await db.prepare(
        `SELECT pet_count_for_score, talk_count_for_score, feed_count_for_score
         FROM pet_daily_interaction_limits
         WHERE user_id=? AND pet_id=? AND action_date=?`
    ).bind(userId, PET_ID, actionDate).first();
    if (row) return row;

    await db.prepare(
        `INSERT INTO pet_daily_interaction_limits (user_id, pet_id, action_date, pet_count_for_score, talk_count_for_score, created_at, updated_at)
         VALUES (?, ?, ?, 0, 0, ?, ?)`
    ).bind(userId, PET_ID, actionDate, now, now).run();
    return { pet_count_for_score: 0, talk_count_for_score: 0, feed_count_for_score: null };
}

// ── Pet Economy: API handlers ────────────────────────────────────────────────

async function handleGetPetEconomy(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ authenticated: false }));

    const db = getDb(env);
    const now = new Date().toISOString();
    const todayKst = kstDateString();

    const [points, inventory, happiness, dailyLimits] = await Promise.all([
        db.prepare(`SELECT current_points, total_earned_points, total_spent_points FROM user_points WHERE user_id=?`)
            .bind(session.user_id).first(),
        db.prepare(`SELECT item_id, quantity FROM user_item_inventory WHERE user_id=?`)
            .bind(session.user_id).all(),
        getOrInitHappiness(db, session.user_id, now),
        getOrInitDailyLimits(db, session.user_id, todayKst, now),
    ]);

    return withCors(json({
        authenticated: true,
        points: {
            current: points?.current_points ?? 0,
            total_earned: points?.total_earned_points ?? 0,
            total_spent: points?.total_spent_points ?? 0,
        },
        inventory: (inventory.results || []).reduce((acc, row) => {
            acc[row.item_id] = row.quantity;
            return acc;
        }, {}),
        happiness: {
            current_score: happiness.current_score,
            last_daily_close_date: happiness.last_daily_close_date || null,
            min: HAPPINESS_MIN,
            max: HAPPINESS_MAX,
        },
        daily_limits: {
            pet_count_for_score: dailyLimits.pet_count_for_score,
            talk_count_for_score: dailyLimits.talk_count_for_score,
            feed_count_for_score: dailyLimits.feed_count_for_score ?? 0,
            score_limit_per_day: PET_DAILY_SCORE_LIMIT,
            today: todayKst,
        },
    }));
}

async function handlePurchaseItem(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));

    const body = await request.json().catch(() => ({}));
    const itemId = typeof body.item_id === 'string' ? body.item_id.trim() : '';
    const quantity = Number.isInteger(body.quantity) && body.quantity >= 1 ? body.quantity : 1;

    if (!VALID_ITEM_IDS.includes(itemId)) {
        return withCors(json({ error: 'invalid_item', message: '잘못된 아이템입니다' }, 400));
    }

    const unitPrice = itemId === 'apple' ? APPLE_PRICE : 0;
    const totalPrice = unitPrice * quantity;

    const db = getDb(env);
    const pointRow = await db.prepare(
        `SELECT current_points, total_spent_points FROM user_points WHERE user_id=?`
    ).bind(session.user_id).first();
    const currentPoints = pointRow?.current_points ?? 0;

    if (currentPoints < totalPrice) {
        return withCors(json({
            error: 'insufficient_points',
            message: `포인트가 부족합니다. 현재 ${currentPoints}p, 필요 ${totalPrice}p`,
            current_points: currentPoints,
            required: totalPrice,
        }, 402));
    }

    const now = new Date().toISOString();
    const afterPoints = currentPoints - totalPrice;
    const totalSpent = (pointRow?.total_spent_points ?? 0) + totalPrice;

    // 원자적 처리: 포인트 차감 + 트랜잭션 기록 + 인벤토리 증가 + 구매이력
    const stmts = [
        db.prepare(
            `UPDATE user_points SET current_points=?, total_spent_points=?, updated_at=? WHERE user_id=?`
        ).bind(afterPoints, totalSpent, now, session.user_id),
        db.prepare(
            `INSERT INTO point_transactions (user_id, type, amount, source_type, balance_after, metadata_json, created_at)
             VALUES (?, 'SPEND', ?, 'ITEM_PURCHASE', ?, ?, ?)`
        ).bind(session.user_id, totalPrice, afterPoints, JSON.stringify({ item_id: itemId, quantity }), now),
        db.prepare(
            `INSERT INTO user_item_inventory (user_id, item_id, quantity, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(user_id, item_id) DO UPDATE SET
               quantity=quantity + excluded.quantity,
               updated_at=excluded.updated_at`
        ).bind(session.user_id, itemId, quantity, now, now),
    ];
    const results = await db.batch(stmts);

    // 구매이력 (트랜잭션 id는 lastRowId로 추출)
    const txId = results[1]?.meta?.last_row_id ?? null;
    await db.prepare(
        `INSERT INTO item_purchase_history (user_id, item_id, quantity, unit_price, total_price, point_transaction_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(session.user_id, itemId, quantity, unitPrice, totalPrice, txId, now).run();

    return withCors(json({
        ok: true,
        item_id: itemId,
        quantity_purchased: quantity,
        total_price: totalPrice,
        points_after: afterPoints,
        apple_quantity: await db.prepare(
            `SELECT quantity FROM user_item_inventory WHERE user_id=? AND item_id='apple'`
        ).bind(session.user_id).first().then(r => r?.quantity ?? quantity),
    }));
}

async function handleHappinessChange(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));

    const body = await request.json().catch(() => ({}));
    const actionType = ['PET', 'FEED', 'TALK', 'SYSTEM'].includes(body.action_type) ? body.action_type : null;
    if (!actionType) return withCors(json({ error: 'invalid_action_type' }, 400));

    const db = getDb(env);
    const now = new Date().toISOString();
    const todayKst = kstDateString();

    // 캐릭터 key 조회
    const avatar = await db.prepare(`SELECT character_key FROM avatars WHERE user_id=?`)
        .bind(session.user_id).first();
    const charKey = avatar?.character_key || 'mong';
    const cfg = HAPPINESS_CONFIG[charKey] || HAPPINESS_CONFIG['mong'];

    const happiness = await getOrInitHappiness(db, session.user_id, now);
    const limits = await getOrInitDailyLimits(db, session.user_id, todayKst, now);

    let delta = 0;
    let scored = false;

    if (actionType === 'PET') {
        const canScore = limits.pet_count_for_score < PET_DAILY_SCORE_LIMIT;
        if (canScore) {
            delta = randomInt(cfg.pet[0], cfg.pet[1]);
            scored = true;
        }
    } else if (actionType === 'TALK') {
        const canScore = limits.talk_count_for_score < PET_DAILY_SCORE_LIMIT;
        if (canScore) {
            delta = randomInt(cfg.talk[0], cfg.talk[1]);
            scored = true;
        }
    } else if (actionType === 'FEED') {
        // 간식: 보유 수량 차감 + 행복 증가 (수량 체크는 클라이언트에서 선행, 여기서도 방어)
        const invRow = await db.prepare(
            `SELECT quantity FROM user_item_inventory WHERE user_id=? AND item_id='apple'`
        ).bind(session.user_id).first();
        if (!invRow || invRow.quantity < 1) {
            return withCors(json({ error: 'no_apple', message: '사과가 없습니다' }, 400));
        }
        delta = randomInt(cfg.feed[0], cfg.feed[1]);
        scored = true;

        // 인벤토리 차감
        await db.prepare(
            `UPDATE user_item_inventory SET quantity=quantity-1, updated_at=? WHERE user_id=? AND item_id='apple'`
        ).bind(now, session.user_id).run();
    } else if (actionType === 'SYSTEM') {
        delta = typeof body.delta === 'number' ? Math.round(body.delta) : 0;
        scored = true;
    }

    const before = happiness.current_score;
    const after = Math.min(HAPPINESS_MAX, Math.max(HAPPINESS_MIN, before + delta));

    if (delta !== 0 || scored) {
        const stmts = [
            db.prepare(
                `INSERT INTO pet_happiness_state (user_id, pet_id, current_score, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(user_id, pet_id) DO UPDATE SET
                   current_score=excluded.current_score, updated_at=excluded.updated_at`
            ).bind(session.user_id, PET_ID, after, now, now),
            db.prepare(
                `INSERT INTO pet_happiness_history (user_id, pet_id, action_type, delta, score_before, score_after, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(session.user_id, PET_ID, actionType, delta, before, after, now),
        ];

        // 일일 카운터 갱신
        if (actionType === 'PET' && scored) {
            stmts.push(db.prepare(
                `INSERT INTO pet_daily_interaction_limits (user_id, pet_id, action_date, pet_count_for_score, talk_count_for_score, created_at, updated_at)
                 VALUES (?, ?, ?, 1, 0, ?, ?)
                 ON CONFLICT(user_id, pet_id, action_date) DO UPDATE SET
                   pet_count_for_score=pet_count_for_score+1, updated_at=excluded.updated_at`
            ).bind(session.user_id, PET_ID, todayKst, now, now));
        } else if (actionType === 'TALK' && scored) {
            stmts.push(db.prepare(
                `INSERT INTO pet_daily_interaction_limits (user_id, pet_id, action_date, pet_count_for_score, talk_count_for_score, created_at, updated_at)
                 VALUES (?, ?, ?, 0, 1, ?, ?)
                 ON CONFLICT(user_id, pet_id, action_date) DO UPDATE SET
                   talk_count_for_score=talk_count_for_score+1, updated_at=excluded.updated_at`
            ).bind(session.user_id, PET_ID, todayKst, now, now));
        } else if (actionType === 'FEED' && scored) {
            stmts.push(db.prepare(
                `INSERT INTO pet_daily_interaction_limits (user_id, pet_id, action_date, pet_count_for_score, talk_count_for_score, feed_count_for_score, created_at, updated_at)
                 VALUES (?, ?, ?, 0, 0, 1, ?, ?)
                 ON CONFLICT(user_id, pet_id, action_date) DO UPDATE SET
                   feed_count_for_score=COALESCE(feed_count_for_score,0)+1, updated_at=excluded.updated_at`
            ).bind(session.user_id, PET_ID, todayKst, now, now));
        }

        await db.batch(stmts);
    }

    // 잔여 인벤토리 반환 (FEED 시 차감 후 값)
    let appleQuantity = null;
    if (actionType === 'FEED') {
        const inv = await db.prepare(
            `SELECT quantity FROM user_item_inventory WHERE user_id=? AND item_id='apple'`
        ).bind(session.user_id).first();
        appleQuantity = inv?.quantity ?? 0;
    }

    return withCors(json({
        ok: true,
        scored,
        delta,
        score_before: before,
        score_after: after,
        apple_quantity_after: appleQuantity,
        daily_limits: {
            pet_count_for_score: actionType === 'PET' && scored
                ? limits.pet_count_for_score + 1
                : limits.pet_count_for_score,
            talk_count_for_score: actionType === 'TALK' && scored
                ? limits.talk_count_for_score + 1
                : limits.talk_count_for_score,
        },
    }));
}

async function handleHappinessDailyClose(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));

    const db = getDb(env);
    const now = new Date().toISOString();
    const todayKst = kstDateString();

    const happiness = await getOrInitHappiness(db, session.user_id, now);

    // 이미 오늘 마감했으면 스킵
    if (happiness.last_daily_close_date === todayKst) {
        return withCors(json({ ok: true, skipped: true, reason: 'already_closed_today' }));
    }

    const before = happiness.current_score;
    const factor = 0.8 + Math.random() * 0.1; // 0.80~0.90
    const next = Math.max(HAPPINESS_MIN, Math.floor(before * factor));
    const achieved = before >= 80;

    await db.batch([
        db.prepare(
            `INSERT INTO pet_happiness_state (user_id, pet_id, current_score, last_daily_close_date, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id, pet_id) DO UPDATE SET
               current_score=excluded.current_score,
               last_daily_close_date=excluded.last_daily_close_date,
               updated_at=excluded.updated_at`
        ).bind(session.user_id, PET_ID, next, todayKst, now, now),
        db.prepare(
            `INSERT INTO pet_happiness_history (user_id, pet_id, action_type, delta, score_before, score_after, metadata_json, created_at)
             VALUES (?, ?, 'DAILY_CLOSE', ?, ?, ?, ?, ?)`
        ).bind(
            session.user_id, PET_ID,
            next - before, before, next,
            JSON.stringify({ close_date: todayKst, factor: factor.toFixed(3), achieved }),
            now
        ),
    ]);

    return withCors(json({
        ok: true,
        close_date: todayKst,
        score_before: before,
        score_after: next,
        achieved_daily_goal: achieved,
        message: achieved ? '토닥이 아껴주기 달성!' : '내일도 토닥이와 함께해요',
    }));
}

// ── Typing game handlers ────────────────────────────────────────────────────

async function handleTypingSentences(request, env) {
    const url = new URL(request.url);
    const rawCat = url.searchParams.get('category') || 'all';
    const allowed = ['humor', 'healing', 'quote', 'all'];
    const category = allowed.includes(rawCat) ? rawCat : 'all';

    const db = getDb(env);
    const rows = category === 'all'
        ? await db.prepare(`SELECT id, category, content, length FROM typing_contents WHERE is_active=1 ORDER BY RANDOM() LIMIT 200`).all()
        : await db.prepare(`SELECT id, category, content, length FROM typing_contents WHERE is_active=1 AND category=? ORDER BY RANDOM() LIMIT 200`).bind(category).all();

    return withCors(json({ sentences: rows.results || [] }));
}

async function handleTypingFinish(request, env) {
    const session = await getSessionUser(getDb(env), request);
    if (!session) return withCors(json({ error: 'unauthenticated' }, 401));

    if (!session.employee_name) {
        return withCors(json({ error: 'employee_name_required', message: '사원명을 설정해야 실적이 반영됩니다' }, 403));
    }

    const body = await request.json().catch(() => ({}));
    const score = Number.isInteger(body.score) ? Math.max(0, body.score) : 0;
    const durationSeconds = Number.isInteger(body.duration_seconds) ? body.duration_seconds : 60;

    const db = getDb(env);
    const { start, end, nextHourKST } = kstHourBounds();

    // Global hourly ticket pool shared by every game.
    const hourlyRow = await db.prepare(
        `SELECT COUNT(*) as cnt FROM game_scores WHERE user_id=? AND played_at>=? AND played_at<?`
    ).bind(session.user_id, start, end).first();

    const playsThisHour = hourlyRow?.cnt ?? 0;
    const eligible = playsThisHour < GLOBAL_HOURLY_PLAY_LIMIT;
    const now = new Date().toISOString();

    let typingScoreId = null;
    if (eligible) {
        typingScoreId = makeId('gsc');
        await db.prepare(
            `INSERT INTO game_scores (id, user_id, game_type, score, played_at, duration_seconds) VALUES (?,?,?,?,?,?)`
        ).bind(typingScoreId, session.user_id, 'typing_game', score, now, durationSeconds).run();
    }

    await db.prepare(
        `INSERT INTO game_round_results (user_id, game_key, score, duration_seconds, is_point_eligible, is_ranking_eligible, created_at) VALUES (?,?,?,?,?,?,?)`
    ).bind(session.user_id, 'typing_game', score, durationSeconds, eligible ? 1 : 0, eligible ? 1 : 0, now).run();

    // 랭킹 등록된 경우에만 포인트 적립
    let earnedPoints = 0;
    if (eligible && typingScoreId) {
        earnedPoints = Math.floor(score / 10);
        if (earnedPoints > 0) {
            await earnPoints(db, session.user_id, earnedPoints, typingScoreId, now);
        }
    }

    return withCors(json({
        ok: true,
        eligible,
        earned_points: earnedPoints,
        plays_this_hour: playsThisHour + (eligible ? 1 : 0),
        resets_at_kst: nextHourKST,
    }));
}

async function handleTypingRanking(request, env) {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') === 'weekly' ? 'weekly' : 'daily';
    const { start } = kstPeriodBounds(period === 'daily' ? 'daily' : 'weekly');

    const db = getDb(env);
    const rows = await db.prepare(`
        SELECT grr.score,
               grr.created_at,
               u.employee_name
        FROM game_round_results grr
        JOIN users u ON u.user_id = grr.user_id
        WHERE grr.game_key='typing_game'
          AND grr.is_ranking_eligible=1
          AND grr.created_at >= ?
        ORDER BY grr.score DESC
        LIMIT 20
    `).bind(start).all();

    return withCors(json({ rows: rows.results || [] }));
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
