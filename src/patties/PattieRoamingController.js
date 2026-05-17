import { pattieAssetLoader } from './PattieAssetLoader.js';
import { PattieSprite } from './PattieSprite.js';
import { pattieWorldConfig } from './pattieWorldConfig.js';

let controller = null;

const DEFAULT_PROFILE = {
    nickname: 'Mong',
    character_key: 'mong',
    equipped_item_keys: [],
};

export async function initPattieWorld(root) {
    if (!root) return null;
    if (controller) {
        controller.attach(root);
        return controller;
    }
    controller = new PattieRoamingController({ root, loader: pattieAssetLoader, config: pattieWorldConfig });
    await controller.init();
    return controller;
}

export function getPattieWorld() {
    return controller;
}

// 액션 우선순위: FEEDING > CLICK_HAPPY > JUMP > RUN/WALK > IDLE
const ACTION_PRIORITY = { FEEDING: 4, CLICK_HAPPY: 3, JUMP: 2, MOVE: 1, IDLE: 0 };

export class PattieRoamingController {
    constructor({ root, loader, config }) {
        this.root = root;
        this.loader = loader;
        this.config = config;
        this.sprite = null;
        this.nameplate = null;
        this.profile = { ...DEFAULT_PROFILE };
        this.x = 100;
        this.y = 250;
        this.direction = 1;
        this.active = false;
        this.zone = null;
        this.mode = 'idle';
        this.jumpMotion = null;
        this.chartBarIndex = 0;
        this.terrainMotion = null;
        this.lastInteractionAt = Date.now();
        this.lastDecisionAt = 0;
        this.sleepLockCycles = 0;
        this.raf = null;
        this.speechBubble = null;
        this.speechTimer = null;
        this.boundTick = this.tick.bind(this);
        this.boundSpeech = this.handleSpeech.bind(this);

        // 액션 락 (FEEDING 중 AI 이동 차단)
        this.actionLock = false;
        // 클릭 후 점프 착지 대기 (점프 중 클릭 시)
        this.pendingHappy = false;
        // 감속 정지 중
        this.decelerating = false;
        this.decelerateStartedAt = 0;
        this.decelerateDurationMs = 320;
        // 간식 먹기 목표 (goEat)
        this.eatTarget = null;
        this.eatMotion = null;
        this.hasPlaced = false;
    }

    async init() {
        this.root.classList.add('pattie-world');
        this.profile = await this.fetchProfile();
        await this.loader.registerManifest('/public/assets/kitty/manifest.json');
        this.sprite = new PattieSprite({
            loader: this.loader,
            characterKey: this.profile.character_key,
            itemKeys: this.profile.equipped_item_keys,
        });
        await this.sprite.mount(this.root);
        this.speechBubble = document.createElement('div');
        this.speechBubble.className = 'pattie-speech';
        this.root.appendChild(this.speechBubble);
        this.bindEvents();
        this.placeAtFirstZone();
        this.start();
    }

    attach(root) {
        this.root = root;
        this.root.classList.add('pattie-world');
        if (this.sprite && !this.root.contains(this.sprite.el)) this.root.appendChild(this.sprite.el);
        if (this.nameplate && !this.root.contains(this.nameplate)) this.root.appendChild(this.nameplate);
        if (this.speechBubble && !this.root.contains(this.speechBubble)) this.root.appendChild(this.speechBubble);
        this.placeAtFirstZone();
    }

    bindEvents() {
        this.sprite.el.addEventListener('click', () => this.handleClick());
        this.sprite.el.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.handleClick();
            }
        });
        document.addEventListener('refresheet:pet-say', this.boundSpeech);
        document.addEventListener('refresheet:pattie-profile-updated', (event) => {
            this.applyProfile(event.detail || DEFAULT_PROFILE);
        });
    }

    // 클릭 우선순위 처리
    // - FEEDING 중: 무시
    // - 점프 중: pendingHappy 세트, 착지 후 happy
    // - 걷기/달리기 중: 감속 정지 후 happy
    // - 그 외: 즉시 happy
    handleClick() {
        if (this.actionLock) return;

        if (this.jumpMotion) {
            this.pendingHappy = true;
            return;
        }

        if ((this.mode === 'walk' || this.mode === 'run') && !this.decelerating) {
            this.decelerating = true;
            this.decelerateStartedAt = performance.now();
            this.terrainMotion = null;
            this.pendingHappy = true;
            return;
        }

        this.pendingHappy = false;
        this.happy();
    }

    // 외부에서 액션락 설정 (FEEDING 용)
    setActionLock(lock) {
        this.actionLock = lock;
        if (!lock) {
            this.pendingHappy = false;
            this.decelerating = false;
        }
    }

    // 단일 재생 애니메이션 (PattieApple 등에서 호출)
    playOnce(animName, { durationMs = 1000 } = {}) {
        if (!this.sprite) return;
        try {
            this.sprite.play(animName, { restart: true, once: true, next: 'idle' });
        } catch {
            // 애니메이션이 없으면 idle 유지
        }
    }

    async fetchProfile() {
        try {
            const res = await fetch('/api/pattie', { credentials: 'include' });
            if (!res.ok) return { ...DEFAULT_PROFILE };
            const data = await res.json();
            return normalizeProfile(data.pattie || DEFAULT_PROFILE);
        } catch {
            return { ...DEFAULT_PROFILE };
        }
    }

    async applyProfile(profile) {
        this.profile = normalizeProfile(profile);
        await this.loader.registerManifest('/public/assets/kitty/manifest.json');
        await this.sprite.setCharacter(this.profile.character_key, this.profile.equipped_item_keys);
        this.sprite.el.setAttribute('aria-label', this.profile.nickname || 'Pattie');
        if (this.nameplate) this.nameplate.textContent = this.profile.nickname || DEFAULT_PROFILE.nickname;
    }

    start() {
        if (this.active) return;
        this.active = true;
        this.lastDecisionAt = performance.now() + this.config.movement.initialIdleMs;
        this.raf = requestAnimationFrame(this.boundTick);
    }

    stop() {
        this.active = false;
        cancelAnimationFrame(this.raf);
        clearTimeout(this.speechTimer);
        if (this.speechBubble) this.speechBubble.classList.remove('visible');
    }

    tick(now) {
        if (!this.active) return;
        if (now - this.lastDecisionAt > this.config.movement.decisionMs) {
            this.decide();
            this.lastDecisionAt = now;
        }
        this.move();
        this.sprite.setPosition(this.x, this.y, this.direction);
        this.updateNameplate();
        this.raf = requestAnimationFrame(this.boundTick);
    }

    decide() {
        if (this.actionLock || this.decelerating || this.pendingHappy) return;
        if (this.terrainMotion || this.jumpMotion) return;
        // Sleep remains locked for two decision cycles before any re-pick.
        if (this.sleepLockCycles > 0) {
            this.sleepLockCycles -= 1;
            return;
        }
        this.zone = this.findCurrentZone() || this.pickNearestZone();
        if (Date.now() - this.lastInteractionAt > this.config.movement.sleepAfterMs && Math.random() < 0.3) {
            this.setMode('sleep');
            return;
        }

        if (this.zone?.id === 'chart-zone') {
            this.startChartTerrainMove();
            return;
        }

        const mode = weightedPick(this.zone?.weights || this.config.zones[0].weights);
        if (mode === 'jump') {
            this.startJump(null);
        } else {
            this.setMode(mode);
            if (Math.random() < 0.35) this.direction *= -1;
        }
    }

    move() {
        // 감속 정지 처리
        if (this.decelerating) {
            const elapsed = performance.now() - this.decelerateStartedAt;
            const t = Math.min(1, elapsed / this.decelerateDurationMs);
            const step = this.config.movement.stepPx * (1 - t);
            this.x += step * this.direction;
            if (t >= 1) {
                this.decelerating = false;
                if (this.pendingHappy) {
                    this.pendingHappy = false;
                    this.happy();
                } else {
                    this.setMode('idle');
                }
            }
            return;
        }

        // 간식 먹기 이동 처리
        if (this.eatMotion) {
            this.updateEatMotion();
            return;
        }

        const zone = this.zone || this.pickNearestZone();
        if (!zone) return;
        if (this.terrainMotion) {
            this.updateTerrainMotion();
            return;
        }
        if (this.mode === 'jump' && this.jumpMotion) {
            this.updateJumpMotion();
            return;
        }

        const step = this.mode === 'walk' ? this.config.movement.stepPx : 0;
        if (this.mode === 'walk') this.x += step * this.direction;

        const size = this.config.movement.spriteSize;
        const bounds = zone.bounds;
        const minX = Math.max(0, bounds.left + 3);
        const maxX = Math.max(minX, bounds.right - size);
        const minY = Math.max(0, bounds.top + 4);
        const maxY = Math.max(minY, bounds.bottom - size);

        if (this.x <= minX || this.x >= maxX) this.direction *= -1;
        this.x = clamp(this.x, minX, maxX);
        this.y = clamp(this.y, minY, maxY);
    }

    setMode(mode) {
        if (mode === 'sleep') this.sleepLockCycles = 2; // decisionMs 3600ms => about 7.2s minimum.
        this.mode = mode || 'idle';
        this.sprite.play(this.mode);
    }

    startChartTerrainMove() {
        const surfaces = this.getChartSurfaces();
        if (!surfaces.length) {
            this.setMode('idle');
            return;
        }

        const current = this.findNearestSurface(surfaces);
        const maxRadius = 80; // euclidean radius for cross-surface target selection

        // Other surfaces within 80px radius and within height delta.
        const candidates = surfaces.filter((surface) => {
            if (surface.id === current?.id) return false;
            if (Math.abs(surface.y - this.y) > this.config.movement.maxTerrainDeltaPx) return false;
            const nearestX = clamp(this.x, surface.minX, surface.maxX);
            return Math.hypot(this.x - nearestX, this.y - surface.y) <= maxRadius;
        });

        // Walk stays on the same surface; cross-surface uses jump/hopDown only (no climb).
        const canWander = current && current.maxX > current.minX + 4;
        const stayOnCurrent = canWander && (candidates.length === 0 || Math.random() < 0.72);

        let target, targetX, targetY;
        if (stayOnCurrent) {
            target = current;
            const mid = (target.minX + target.maxX) / 2;
            // Wander toward opposite half to create back-and-forth motion.
            if (this.x <= mid) {
                targetX = randomBetween(Math.max(mid, target.minX + 2), target.maxX);
            } else {
                targetX = randomBetween(target.minX, Math.min(mid, target.maxX - 2));
            }
            targetY = target.y;
        } else {
            target = randomItem(candidates.length ? candidates : [current ?? surfaces[0]]);
            targetX = randomBetween(target.minX, target.maxX);
            targetY = target.y;
        }

        const dy = targetY - this.y;
        const dx = targetX - this.x;
        const distance = Math.hypot(dx, dy);

        // Same surface → walk/run. Cross surface → jump (up) or hopDown (down/level). No climb.
        let mode;
        if (stayOnCurrent) {
            mode = distance > 120 ? 'run' : 'walk';
        } else if (dy < 0) {
            mode = 'jump';
        } else {
            mode = 'hopDown';
        }

        const duration = mode === 'walk'
            ? clamp(distance * this.config.movement.walkDurationPerPx, 4200, 14000)
            : mode === 'run'
                ? clamp(distance * this.config.movement.runDurationPerPx, 3000, 9000)
                : clamp(distance * 34, 1400, 2600);

        // Arc scales with distance: near hops stay flat, far jumps rise proportionally.
        const arcPx = (mode === 'jump' || mode === 'hopDown')
            ? clamp(distance * 0.12, 2, 10)
            : 0;

        this.direction = targetX >= this.x ? 1 : -1;
        this.mode = mode;
        this.sprite.play(mode === 'hopDown' ? 'jump' : mode, {
            restart: true,
            once: !['walk', 'run'].includes(mode),
            next: 'idle',
            frameDurationMs: mode === 'walk'
                ? this.config.movement.walkFrameDurationMs
                : mode === 'run'
                    ? this.config.movement.runFrameDurationMs
                    : null,
        });
        this.terrainMotion = {
            mode,
            startX: this.x,
            startY: this.y,
            endX: targetX,
            endY: targetY,
            startedAt: performance.now(),
            duration,
            arcPx,
            surfaces,
            surfaceId: stayOnCurrent ? target.id : null,
        };
    }

    updateTerrainMotion() {
        const m = this.terrainMotion;
        const elapsed = performance.now() - m.startedAt;
        const t = Math.min(1, elapsed / m.duration);
        // walk/run: linear so legs match movement; jump/hopDown: ease-in-out
        const eased = (m.mode === 'walk' || m.mode === 'run')
            ? t
            : t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        this.x = m.startX + (m.endX - m.startX) * eased;
        this.y = m.startY + (m.endY - m.startY) * eased;
        if (m.mode === 'jump' || m.mode === 'hopDown') {
            this.y -= Math.sin(Math.PI * t) * m.arcPx;
        }

        // Cliff edge safety: lock Y to the surface the walk started on; stop if character leaves it.
        // Uses surfaceId to avoid matching the floor (which spans full chart width) when walking on a bar.
        if ((m.mode === 'walk' || m.mode === 'run') && t < 0.98 && m.surfaceId) {
            const src = (m.surfaces || []).find(s => s.id === m.surfaceId);
            if (src && this.x >= src.minX - 3 && this.x <= src.maxX + 3) {
                this.y = src.y;
            } else {
                this.terrainMotion = null;
                this.direction *= -1;
                this.setMode('idle');
                return;
            }
        }

        const chart = this.getZones().find((zone) => zone.id === 'chart-zone');
        if (chart) {
            const size = this.config.movement.spriteSize;
            const bounds = this.getLocalChartBounds();
            this.x = clamp(this.x, bounds.left + 4, bounds.right - size - 4);
            this.y = clamp(this.y, bounds.top + 4, bounds.bottom - size - 6);
        }

        if (t >= 1) {
            this.x = m.endX;
            this.y = m.endY;
            this.terrainMotion = null;
            this.setMode('idle');
        }
    }

    startJump(target = null) {
        const size = this.config.movement.spriteSize;
        const bounds = this.getLocalChartBounds();
        const fallback = {
            x: this.x + this.direction * 34,
            y: this.y,
        };
        const end = target || fallback;
        this.direction = end.x >= this.x ? 1 : -1;
        this.mode = 'jump';
        this.sprite.play('jump', { restart: true, once: true, next: 'walk' });
        this.jumpMotion = {
            startX: this.x,
            startY: this.y,
            endX: clamp(end.x, bounds.left, Math.max(bounds.left, bounds.right - size)),
            endY: clamp(end.y, bounds.top, Math.max(bounds.top, bounds.bottom - size)),
            startedAt: performance.now(),
            duration: this.config.movement.jumpDurationMs,
        };
    }

    updateJumpMotion() {
        const m = this.jumpMotion;
        const elapsed = performance.now() - m.startedAt;
        const t = Math.min(1, elapsed / m.duration);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const arc = Math.sin(Math.PI * t) * this.config.movement.jumpArcPx;
        this.x = m.startX + (m.endX - m.startX) * eased;
        this.y = m.startY + (m.endY - m.startY) * eased - arc;
        if (t >= 1) {
            this.x = m.endX;
            this.y = m.endY;
            this.jumpMotion = null;
            if (this.pendingHappy) {
                this.pendingHappy = false;
                this.happy();
            } else {
                this.setMode(this.zone?.id === 'chart-zone' ? 'idle' : 'walk');
            }
        }
    }

    async happy() {
        if (this.actionLock) return;

        this.lastInteractionAt = Date.now();
        this.terrainMotion = null;
        this.eatMotion = null;
        this.decelerating = false;
        this.pendingHappy = false;

        await this.sprite.play('happy', { restart: true, once: true, next: this.zone?.id === 'chart-zone' ? 'idle' : 'walk' });
        this.mode = 'happy';
        const frameCount = this.sprite.animation?.frameCount || 1;
        const frameDuration = this.sprite.animation?.frameDurationMs || this.config.movement.frameDurationMs || 500;
        document.dispatchEvent(new CustomEvent('refresheet:pattie-happy'));
        fetch('/api/minime/interact', { method: 'POST', credentials: 'include' }).catch(() => {});
        setTimeout(() => {
            if (this.mode === 'happy') this.setMode(this.zone?.id === 'chart-zone' ? 'idle' : 'walk');
        }, frameCount * frameDuration + 50);
    }

    // 간식 먹기: apple 위치로 이동 후 onReach 콜백
    goEat({ x: targetX, y: targetY, size = 24, onReach }) {
        if (this.actionLock) return;
        this.actionLock = true;
        this.terrainMotion = null;
        this.jumpMotion = null;
        this.decelerating = false;
        this.pendingHappy = false;

        const spriteSize = this.config.movement.spriteSize;
        const destX = targetX; // apple 좌측 기준 (apple 왼쪽에 토닥이 얼굴이 닿도록)
        const destY = targetY;
        const dx = destX - this.x;
        const distance = Math.abs(dx);
        this.direction = dx >= 0 ? 1 : -1;

        const speed = distance > 80 ? 'run' : 'walk';
        const durationPerPx = speed === 'run'
            ? this.config.movement.runDurationPerPx
            : this.config.movement.walkDurationPerPx;
        const duration = clamp(distance * durationPerPx, 500, 8000);

        this.mode = speed;
        this.sprite.play(speed, {
            restart: true,
            frameDurationMs: speed === 'run'
                ? this.config.movement.runFrameDurationMs
                : this.config.movement.walkFrameDurationMs,
        });

        this.eatMotion = {
            startX: this.x, startY: this.y,
            endX: destX, endY: destY,
            startedAt: performance.now(),
            duration,
            onReach,
        };
    }

    updateEatMotion() {
        const m = this.eatMotion;
        if (!m) return;

        const elapsed = performance.now() - m.startedAt;
        const t = Math.min(1, elapsed / m.duration);
        this.x = m.startX + (m.endX - m.startX) * t;
        this.y = m.startY + (m.endY - m.startY) * t;

        if (t >= 1) {
            this.x = m.endX;
            this.y = m.endY;
            this.eatMotion = null;
            this.setMode('idle');
            m.onReach?.();
        }
    }

    handleSpeech(event) {
        if (event.detail?.manual) this.happy();
        if (event.detail?.text) {
            this.showSpeech(event.detail.text, event.detail.duration || 4200);
        }
    }

    showSpeech(text, duration) {
        if (!this.speechBubble) return;
        this.speechBubble.textContent = text;
        this.speechBubble.classList.add('visible');
        clearTimeout(this.speechTimer);
        this.speechTimer = setTimeout(() => {
            this.speechBubble?.classList.remove('visible');
        }, duration);
    }

    placeAtFirstZone() {
        if (this.hasPlaced) {
            this.sprite?.setPosition(this.x, this.y, this.direction);
            this.updateNameplate();
            return;
        }
        if (this.root.matches?.("[data-pattie-zone='chart']")) {
            this.placeOnChartFloor();
            return;
        }
        const zone = this.pickNearestZone();
        if (!zone) return;
        this.zone = zone;
        const floor = this.getChartSurfaces().find((surface) => surface.kind === 'floor');
        if (zone.id === 'chart-zone' && floor) {
            this.x = randomBetween(floor.minX + 20, floor.maxX - 20);
            this.y = floor.y;
            this.setMode('idle');
        } else {
            this.x = zone.bounds.left + 40;
            this.y = zone.bounds.top + 40;
        }
        this.hasPlaced = true;
        this.sprite?.setPosition(this.x, this.y, this.direction);
        this.updateNameplate();
    }

    placeOnChartFloor() {
        const size = this.config.movement.spriteSize;
        const width = this.root.clientWidth || this.root.getBoundingClientRect().width;
        const height = this.root.clientHeight || this.root.getBoundingClientRect().height;
        const minX = 34;
        const maxX = Math.max(minX, width - size - 34);
        this.x = randomBetween(minX, maxX);
        this.y = Math.max(0, height - size - 16);
        this.direction = Math.random() < 0.5 ? -1 : 1;
        this.terrainMotion = null;
        this.jumpMotion = null;
        this.setMode('idle');
        this.hasPlaced = true;
        this.sprite?.setPosition(this.x, this.y, this.direction);
        this.updateNameplate();
        this.lastDecisionAt = performance.now() + this.config.movement.initialIdleMs;
    }

    findCurrentZone() {
        const size = this.config.movement.spriteSize;
        const px = this.x + size / 2;
        const py = this.y + size / 2;
        return this.getZones().find((zone) => {
            const b = zone.bounds;
            return zone.type !== 'blocked' && px >= b.left && px <= b.right && py >= b.top && py <= b.bottom;
        });
    }

    pickNearestZone() {
        const zones = this.getZones().filter((zone) => zone.type !== 'blocked');
        return zones.find((zone) => zone.id === 'chart-zone') || zones[0] || null;
    }

    getZones() {
        return this.config.zones.flatMap((zone) => {
            const elements = Array.from(this.root.querySelectorAll(zone.selector));
            if (this.root.matches?.(zone.selector)) elements.unshift(this.root);
            return elements.map((el) => ({
                ...zone,
                el,
                bounds: this.getLocalRect(el),
            }));
        });
    }

    findNearestBar() {
        const bars = this.getSortedBars();
        if (!bars.length) return null;
        const size = this.config.movement.spriteSize;
        const centerX = this.x + size / 2;
        return bars.sort((a, b) => Math.abs(centerX - (a.left + a.width / 2)) - Math.abs(centerX - (b.left + b.width / 2)))[0];
    }

    getChartSurfaces() {
        if (!this.getZones().find((zone) => zone.id === 'chart-zone')) return [];
        const size = this.config.movement.spriteSize;
        const bounds = this.getLocalChartBounds();

        // Terrain calculation uses chart-local coordinates so page/excel scrolling cannot shift the pet.
        const floor = {
            id: 'chart-floor',
            kind: 'floor',
            minX: bounds.left + 14,
            maxX: bounds.right - size - 14,
            y: bounds.bottom - size - 16,
        };
        const floorY = floor.y;
        const bars = this.getSortedBars().map((bar, index) => ({
            id: `bar-${index}`,
            kind: 'bar',
            minX: bar.pairLeft + 1,
            maxX: bar.pairLeft + bar.pairWidth - size - 1,
            y: bar.top - size + 6, // Sprite has transparent foot padding; bar surfaces only.
        })).filter((surface) => {
            const heightFromFloor = Math.abs(surface.y - floorY);
            return surface.maxX >= surface.minX && heightFromFloor <= this.config.movement.maxBarHeightFromFloorPx;
        });
        return [floor, ...bars];
    }

    findNearestSurface(surfaces) {
        return [...surfaces].sort((a, b) => {
            const ax = clamp(this.x, a.minX, a.maxX);
            const bx = clamp(this.x, b.minX, b.maxX);
            return Math.hypot(this.x - ax, this.y - a.y) - Math.hypot(this.x - bx, this.y - b.y);
        })[0] || null;
    }

    findTargetBar() {
        const bars = this.getSortedBars();
        if (!bars.length) return null;
        this.chartBarIndex = clamp(this.chartBarIndex, 0, bars.length - 1);
        return bars[this.chartBarIndex];
    }

    getSortedBars() {
        return Array.from(this.root.querySelectorAll(this.config.terrainRules.chartBar.selector))
            .map((bar) => {
                const rect = this.getLocalRect(bar);
                const pair = bar.parentElement;
                const pairRect = pair ? this.getLocalRect(pair) : rect;
                return { ...rect, pairLeft: pairRect.left, pairWidth: pairRect.width };
            })
            .filter((rect) => rect.width > 0 && rect.height > 0)
            .sort((a, b) => a.left - b.left);
    }

    findNextBarPlatform() {
        const bars = this.getSortedBars();
        if (!bars.length) return null;
        const size = this.config.movement.spriteSize;
        this.chartBarIndex += this.direction;
        if (this.chartBarIndex >= bars.length) {
            this.chartBarIndex = bars.length - 2;
            this.direction = -1;
        } else if (this.chartBarIndex < 0) {
            this.chartBarIndex = 1;
            this.direction = 1;
        }
        this.chartBarIndex = clamp(this.chartBarIndex, 0, bars.length - 1);
        const target = bars[this.chartBarIndex];
        return {
            x: target.left + target.width / 2 - size / 2,
            y: target.top - size + 6,
        };
    }

    rootRect() {
        return this.root.getBoundingClientRect();
    }

    getLocalChartBounds() {
        return {
            left: 0,
            top: 0,
            right: this.root.clientWidth,
            bottom: this.root.clientHeight,
            width: this.root.clientWidth,
            height: this.root.clientHeight,
        };
    }

    getLocalRect(el) {
        let left = 0;
        let top = 0;
        let node = el;
        while (node && node !== this.root) {
            left += node.offsetLeft || 0;
            top += node.offsetTop || 0;
            node = node.offsetParent;
        }
        return {
            left,
            top,
            right: left + el.offsetWidth,
            bottom: top + el.offsetHeight,
            width: el.offsetWidth,
            height: el.offsetHeight,
        };
    }

    updateNameplate() {
        const size = this.config.movement.spriteSize;
        if (this.nameplate) {
            this.nameplate.style.left = `${Math.round(this.x)}px`;
            this.nameplate.style.top = `${Math.round(this.y)}px`;
        }
        if (this.speechBubble) {
            this.speechBubble.style.left = `${Math.round(this.x + size / 2)}px`;
            this.speechBubble.style.top = `${Math.round(this.y - 18)}px`;
        }
    }
}

function normalizeProfile(profile) {
    const character = ['mong', 'rabbit', 'dog', 'cat', 'cabul'].includes(profile.character_key)
        ? profile.character_key
        : mapLegacyCharacter(profile.character_type);
    const items = Array.isArray(profile.equipped_item_keys)
        ? profile.equipped_item_keys
        : typeof profile.equipped_item_keys === 'string'
            ? profile.equipped_item_keys.split(',').map((v) => v.trim()).filter(Boolean)
            : [];
    return {
        nickname: profile.nickname || DEFAULT_PROFILE.nickname,
        character_key: character,
        character_type: profile.character_type || character,
        equipped_item_keys: items,
    };
}

function mapLegacyCharacter(characterType) {
    if (characterType === 'mong') return 'mong';
    if (characterType === 'type_b') return 'dog';
    if (characterType === 'cat') return 'cat';
    if (characterType === 'dog') return 'dog';
    if (characterType === 'cabul') return 'cabul';
    return 'mong';
}

function weightedPick(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    let point = Math.random() * total;
    for (const [key, value] of entries) {
        point -= value;
        if (point <= 0) return key;
    }
    return entries[0]?.[0] || 'idle';
}

function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function randomBetween(min, max) {
    if (max <= min) return min;
    return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
