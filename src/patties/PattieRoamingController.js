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
    }

    async init() {
        this.root.classList.add('pattie-world');
        this.profile = await this.fetchProfile();
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
        this.sprite.el.addEventListener('click', () => this.happy());
        this.sprite.el.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.happy();
            }
        });
        document.addEventListener('refresheet:pet-say', this.boundSpeech);
        document.addEventListener('refresheet:pattie-profile-updated', (event) => {
            this.applyProfile(event.detail || DEFAULT_PROFILE);
        });
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
        const root = this.rootRect();
        const bounds = zone.bounds;
        const minX = Math.max(0, bounds.left - root.left + 3);
        const maxX = Math.max(minX, bounds.right - root.left - size);
        const minY = Math.max(0, bounds.top - root.top + 4);
        const maxY = Math.max(minY, bounds.bottom - root.top - size);

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
            endX: clamp(end.x, 0, Math.max(0, this.root.scrollWidth - size)),
            endY: clamp(end.y, 0, Math.max(0, this.root.scrollHeight - size)),
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
            this.setMode(this.zone?.id === 'chart-zone' ? 'idle' : 'walk');
        }
    }

    happy() {
        this.lastInteractionAt = Date.now();
        this.sprite.play('happy', { restart: true, once: true, next: this.zone?.id === 'chart-zone' ? 'idle' : 'walk' });
        this.mode = 'happy';
        document.dispatchEvent(new CustomEvent('refresheet:pattie-happy'));
        fetch('/api/minime/interact', { method: 'POST', credentials: 'include' }).catch(() => {});
        setTimeout(() => {
            if (this.mode === 'happy') this.setMode(this.zone?.id === 'chart-zone' ? 'idle' : 'walk');
        }, 1300);
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
        if (this.root.matches?.("[data-pattie-zone='chart']")) {
            this.placeOnChartFloor();
            return;
        }
        const zone = this.pickNearestZone();
        if (!zone) return;
        const root = this.rootRect();
        this.zone = zone;
        const floor = this.getChartSurfaces().find((surface) => surface.kind === 'floor');
        if (zone.id === 'chart-zone' && floor) {
            this.x = randomBetween(floor.minX + 20, floor.maxX - 20);
            this.y = floor.y;
            this.setMode('idle');
        } else {
            this.x = zone.bounds.left - root.left + 40;
            this.y = zone.bounds.top - root.top + 40;
        }
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
        this.sprite?.setPosition(this.x, this.y, this.direction);
        this.updateNameplate();
        this.lastDecisionAt = performance.now() + this.config.movement.initialIdleMs;
    }

    findCurrentZone() {
        const root = this.rootRect();
        const size = this.config.movement.spriteSize;
        const px = root.left + this.x + size / 2;
        const py = root.top + this.y + size / 2;
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
                bounds: el.getBoundingClientRect(),
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
    const character = ['mong', 'rabbit', 'dog', 'cat'].includes(profile.character_key)
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
