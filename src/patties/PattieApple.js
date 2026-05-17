// PattieApple: 토닥이 맵 간식주기 메커니즘
// 담당: apple 마우스 추적 → 클릭 낙하 → 지형 착지 → 토닥이 이동 → 먹기 연출
// 우선순위: FEEDING이 최상위 액션락

const APPLE_IDLE_SRC = '/public/assets/apple/apple_idle..png';
const APPLE_POP_SRC  = '/public/assets/apple/apple_pop.png';
const APPLE_SIZE     = 24; // px

export class PattieApple {
    constructor({ mapEl, roamingController, onFed }) {
        this.mapEl   = mapEl;       // #mp-chart (토닥이 맵 root)
        this.ctrl    = roamingController;
        this.onFed   = onFed;       // 먹기 완료 콜백 (행복점수 API 호출 등)

        this.feedMode   = false;    // 간식주기 모드 활성화 여부
        this.processing = false;    // apple 처리 중 (착지→이동→먹기)
        this.cursorEl   = null;     // 마우스를 따라다니는 apple 아이콘
        this.landedEl   = null;     // 착지한 apple 아이콘
        this.popEl      = null;     // apple_pop 스프라이트

        this._boundMouseMove  = this._onMouseMove.bind(this);
        this._boundClick      = this._onClick.bind(this);
        this._boundMouseLeave = this._onMouseLeave.bind(this);
    }

    // ── 간식주기 모드 진입 ────────────────────────────────────────────────────

    startFeedMode() {
        if (this.feedMode || this.processing) return;
        this.feedMode = true;
        this._createCursor();
        this.mapEl.addEventListener('mousemove', this._boundMouseMove);
        this.mapEl.addEventListener('click',     this._boundClick);
        this.mapEl.addEventListener('mouseleave', this._boundMouseLeave);
        document.addEventListener('mousemove', this._boundMouseMove);
        this.mapEl.style.cursor = 'none';
    }

    stopFeedMode() {
        this.feedMode = false;
        this._removeCursor();
        this.mapEl.removeEventListener('mousemove', this._boundMouseMove);
        this.mapEl.removeEventListener('click',     this._boundClick);
        this.mapEl.removeEventListener('mouseleave', this._boundMouseLeave);
        document.removeEventListener('mousemove', this._boundMouseMove);
        this.mapEl.style.cursor = '';
    }

    // ── 커서 아이콘 관리 ─────────────────────────────────────────────────────

    _createCursor() {
        if (this.cursorEl) return;
        const el = document.createElement('img');
        el.src = APPLE_IDLE_SRC;
        el.className = 'pattie-apple-cursor';
        el.width  = APPLE_SIZE;
        el.height = APPLE_SIZE;
        this.mapEl.appendChild(el);
        this.cursorEl = el;
    }

    _removeCursor() {
        this.cursorEl?.remove();
        this.cursorEl = null;
    }

    _onMouseMove(e) {
        if (!this.feedMode || !this.cursorEl) return;
        const rect = this.mapEl.getBoundingClientRect();
        const raw = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
        // 맵 가장자리에 clamp
        const x = Math.max(0, Math.min(rect.width  - APPLE_SIZE, raw.x - APPLE_SIZE / 2));
        const y = Math.max(0, Math.min(rect.height - APPLE_SIZE, raw.y - APPLE_SIZE / 2));
        this.cursorEl.style.left = `${x}px`;
        this.cursorEl.style.top  = `${y}px`;
        this._lastMousePos = { x: x + APPLE_SIZE / 2, y: y + APPLE_SIZE / 2 };
    }

    _onMouseLeave(e) {
        // 마우스가 맵 밖으로 나가도 cursorEl은 clamp 상태로 유지됨 (mousemove에서 처리)
    }

    // ── 낙하 / 착지 ──────────────────────────────────────────────────────────

    _onClick(e) {
        if (!this.feedMode || this.processing) return;
        e.preventDefault();

        const rect = this.mapEl.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const landingY = this._resolveFloor(clickX, clickY);

        this.stopFeedMode();
        this.processing = true;

        // 착지 apple 아이콘 생성
        const el = document.createElement('img');
        el.src = APPLE_IDLE_SRC;
        el.className = 'pattie-apple-landed';
        el.width  = APPLE_SIZE;
        el.height = APPLE_SIZE;
        el.style.left = `${clickX - APPLE_SIZE / 2}px`;
        el.style.top  = `${-APPLE_SIZE}px`;
        this.mapEl.appendChild(el);
        this.landedEl = el;

        // 낙하 애니메이션 (CSS transition)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                el.style.top = `${landingY}px`;
            });
        });

        const fallDuration = Math.max(300, Math.abs(landingY - (-APPLE_SIZE)) * 3);
        setTimeout(() => {
            this._onLanded(clickX - APPLE_SIZE / 2, landingY);
        }, fallDuration + 50);
    }

    // 지형 resolver: clickX/Y 기준으로 아래 첫 번째 지형 Y좌표 반환
    _resolveFloor(clickX, clickY) {
        const mapRect = this.mapEl.getBoundingClientRect();
        const surfaces = this._getSurfaces(mapRect);
        const spriteSize = 32;
        const floorDefault = mapRect.height - APPLE_SIZE - 16;

        // clickY 기준 아래에 있는 surface 중 가장 위에 있는 것
        let best = floorDefault;
        for (const s of surfaces) {
            const surfaceY = s.y - APPLE_SIZE; // apple 착지점 (surface top - apple 높이)
            if (surfaceY < clickY) continue;   // 클릭 위치보다 위에 있는 surface는 스킵
            if (clickX < s.minX || clickX > s.maxX) continue; // x 범위 밖
            if (surfaceY < best) best = surfaceY;
        }
        return Math.max(0, Math.min(best, mapRect.height - APPLE_SIZE));
    }

    // 토닥이 RoamingController의 getChartSurfaces 로직과 동일하게 terrain 재계산
    _getSurfaces(mapRect) {
        if (!this.ctrl) return [];
        try {
            return this.ctrl.getChartSurfaces();
        } catch {
            return [];
        }
    }

    // ── 착지 이후 처리 ───────────────────────────────────────────────────────

    _onLanded(appleX, appleY) {
        if (!this.landedEl) return;
        this.landedEl.classList.add('pattie-apple-landed--settled');

        // 토닥이에게 apple 위치 알리고 이동 요청
        if (this.ctrl) {
            this.ctrl.goEat({ x: appleX, y: appleY, size: APPLE_SIZE, onReach: () => this._playEatSequence() });
        } else {
            this._playEatSequence();
        }
    }

    // ── 먹기 연출 시퀀스 ─────────────────────────────────────────────────────
    // apple_pop → idle → surprise 3초 → happy 2회 → 완료 콜백

    async _playEatSequence() {
        if (!this.landedEl) return;

        // 1) apple_idle 제거, apple_pop 표시
        const popEl = document.createElement('div');
        popEl.className = 'pattie-apple-pop';
        popEl.style.left = this.landedEl.style.left;
        popEl.style.top  = this.landedEl.style.top;
        this.mapEl.appendChild(popEl);
        this.popEl = popEl;
        this.landedEl.remove();
        this.landedEl = null;

        // pop 애니메이션 재생 (CSS animation으로 처리)
        await this._waitMs(600); // apple_pop 재생 시간

        // 2) pop 제거, idle로
        popEl.remove();
        this.popEl = null;
        this.ctrl?.setActionLock(false);
        await this._waitMs(200);

        // 3) surprise 모션 (~3초)
        this.ctrl?.playOnce('surprise', { durationMs: 2800 });
        await this._waitMs(3000);

        // 4) happy 2회
        for (let i = 0; i < 2; i++) {
            this.ctrl?.playOnce('happy', { durationMs: 1500 });
            await this._waitMs(1600);
        }

        // 5) 완료 콜백 (행복점수 증가 + 인벤토리 차감 API 호출)
        this.processing = false;
        this.onFed?.();
    }

    _waitMs(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    destroy() {
        this.stopFeedMode();
        this.landedEl?.remove();
        this.popEl?.remove();
        this.landedEl = null;
        this.popEl = null;
    }
}
