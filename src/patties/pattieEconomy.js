// 토닥이 경제 시스템 (포인트 / 인벤토리 / 행복점수 / 일일제한) 프론트엔드 상태 관리
// - 페이지 로드 시 DB에서 불러옴
// - 상호작용 성공 후 optimistic update 또는 refetch
// - 중요 상태는 localStorage 캐시 사용하지 않음 (서버 기준)

const ECONOMY_EVENT = 'refresheet:economy-updated';

let _state = {
    loaded: false,
    authenticated: false,
    points: { current: 0, total_earned: 0, total_spent: 0 },
    inventory: { apple: 0 },
    happiness: { current_score: 40, min: 40, max: 100, last_daily_close_date: null },
    daily_limits: { pet_count_for_score: 0, talk_count_for_score: 0, feed_count_for_score: 0, score_limit_per_day: 3 },
};

export function getEconomyState() {
    return { ..._state };
}

export async function loadEconomy() {
    try {
        const res = await fetch('/api/pet/economy', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.authenticated) return;

        _state = {
            loaded: true,
            authenticated: true,
            points: data.points,
            inventory: data.inventory,
            happiness: data.happiness,
            daily_limits: data.daily_limits,
        };
        _emit();
        _checkDailyClose();
    } catch {
        // 네트워크 오류 시 현재 상태 유지
    }
}

// 행복점수 변경 요청 (PET / FEED / TALK)
export async function changeHappiness(actionType, options = {}) {
    try {
        const res = await fetch('/api/pet/happiness/change', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action_type: actionType, ...options }),
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            return { ok: false, error: data.error || 'server_error', data };
        }
        const data = await res.json();
        // optimistic update
        if (data.ok) {
            _state.happiness.current_score = data.score_after;
            if (data.apple_quantity_after !== null && data.apple_quantity_after !== undefined) {
                _state.inventory.apple = data.apple_quantity_after;
            }
            if (data.daily_limits) {
                _state.daily_limits.pet_count_for_score = data.daily_limits.pet_count_for_score;
                _state.daily_limits.talk_count_for_score = data.daily_limits.talk_count_for_score;
            }
            _emit();
        }
        return { ok: data.ok, data };
    } catch {
        return { ok: false, error: 'network_error' };
    }
}

// 아이템 구매
export async function purchaseItem(itemId, quantity = 1) {
    try {
        const res = await fetch('/api/pet/items/purchase', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item_id: itemId, quantity }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return { ok: false, error: data.error || 'server_error', data };
        }
        if (data.ok) {
            _state.points.current = data.points_after;
            _state.inventory[itemId] = (_state.inventory[itemId] || 0) + quantity;
            _emit();
        }
        return { ok: true, data };
    } catch {
        return { ok: false, error: 'network_error' };
    }
}

// 자정 넘으면 일일 마감 자동 처리
function _checkDailyClose() {
    const today = _kstDateString();
    const last = _state.happiness.last_daily_close_date;
    if (!last || last < today) {
        _triggerDailyClose();
    }
}

async function _triggerDailyClose() {
    try {
        const res = await fetch('/api/pet/happiness/daily-close', {
            method: 'POST',
            credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && !data.skipped) {
            _state.happiness.current_score = data.score_after;
            _state.happiness.last_daily_close_date = data.close_date;
            _emit();
        }
    } catch {
        // 네트워크 오류 시 무시
    }
}

function _emit() {
    document.dispatchEvent(new CustomEvent(ECONOMY_EVENT, { detail: { ..._state } }));
}

function _kstDateString() {
    return new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
}

export { ECONOMY_EVENT };
