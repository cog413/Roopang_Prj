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
        this.mode = 'walk';
        this.jumpMotion = null;
        this.climbTargetY = null;
        this.chartBarIndex = 0;
        this.chartAction = 'jump';
        this.terrainMotion = null;
        this.lastInteractionAt = Date.now();
        this.lastDecisionAt = 0;
        this.raf = null;
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
        this.nameplate = document.createElement('div');
        this.nameplate.className = 'pattie-nameplate';
        this.nameplate.textContent = this.profile.nickname || DEFAULT_PROFILE.nickname;
        this.root.appendChild(this.nameplate);
        this.bindEvents();
        this.placeAtFirstZone();
        this.start();
    }

    attach(root) {
        this.root = root;
        this.root.classList.add('pattie-world');
        if (this.sprite && !this.root.contains(this.sprite.el)) this.root.appendChild(this.sprite.el);
        if (this.nameplate && !this.root.contains(this.nameplate)) this.root.appendChild(this.nameplate);
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
        this.lastDecisionAt = performance.now();
        this.raf = requestAnimationFrame(this.boundTick);
    }

    stop() {
        this.active = false;
        cancelAnimationFrame(this.raf);
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
        if (this.terrainMotion || this.jumpMotion || this.mode === 'climb') return;
        this.zone = this.findCurrentZone() || this.pickNearestZone();
        if (Date.now() - this.lastInteractionAt > this.config.movement.sleepAfterMs && Math.random() < 0.2) {
            this.setMode('sleep');
            return;
        }

        if (this.zone?.id === 'chart-zone') {
            this.startChartTerrainMove();
            return;
        }

        const mode = weightedPick(this.zone?.weights || this.config.zones[0].weights);
        if (mode === 'climb' && this.findTargetBar()) {
            this.startClimb(this.findTargetBar());
        } else if (mode === 'jump') {
            this.startJump(this.zone?.id === 'chart-zone' ? this.findNextBarPlatform() : null);
        } else {
            this.setMode(this.zone?.id === 'chart-zone' && mode === 'walk' ? 'idle' : mode);
            if (this.zone?.id !== 'chart-zone' && Math.random() < 0.35) this.direction *= -1;
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

        const step = this.mode === 'walk'
            ? this.config.movement.stepPx
            : this.mode === 'climb'
                ? this.config.movement.climbStepPx
                : 0;
        if (this.mode === 'walk') this.x += step * this.direction;
        if (this.mode === 'climb') this.y -= step;

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
        if (this.mode === 'climb' && this.climbTargetY !== null && this.y <= this.climbTargetY) {
            this.y = this.climbTargetY;
            this.climbTargetY = null;
            this.setMode('idle');
            return;
        }
        if (this.mode === 'climb' && this.y <= minY + 4) {
            this.setMode('idle');
            this.direction *= -1;
        }
    }

    setMode(mode) {
        this.mode = mode || 'idle';
        this.sprite.play(this.mode);
    }

    startChartTerrainMove() {
        const surfaces = this.getChartSurfaces();
        if (!surfaces.length) {
            this.setMode('idle');
            return;
        }

        // Terrain target selection: floor or one bar top surface, with x constrained to that surface.
        const current = this.findNearestSurface(surfaces);
        const candidates = surfaces.filter((surface) => surface.id !== current?.id);
        const target = randomItem(candidates.length ? candidates : surfaces);
        const targetX = randomBetween(target.minX, target.maxX);
        const targetY = target.y;
        const dy = targetY - this.y;
        const dx = targetX - this.x;
        const distance = Math.hypot(dx, dy);

        // State transition by height delta: flat walk, upward jump/climb, downward hop-down.
        let mode = 'walk';
        if (dy < -18) mode = Math.abs(dx) < 24 ? 'climb' : 'jump';
        else if (dy < -6) mode = 'jump';
        else if (dy > 6) mode = 'hopDown';

        const duration = mode === 'walk'
            ? clamp(distance * 32, 1500, 3200)
            : mode === 'climb'
                ? clamp(Math.abs(dy) * 42 + Math.abs(dx) * 18, 900, 1800)
                : clamp(distance * 18, 760, 1250);

        this.direction = targetX >= this.x ? 1 : -1;
        this.mode = mode;
        this.sprite.play(mode === 'hopDown' ? 'jump' : mode, {
            restart: true,
            once: mode !== 'walk' && mode !== 'climb',
            next: 'idle',
        });
        this.terrainMotion = {
            mode,
            startX: this.x,
            startY: this.y,
            endX: targetX,
            endY: targetY,
            startedAt: performance.now(),
            duration,
            arcPx: mode === 'jump' ? 26 : mode === 'hopDown' ? 14 : 0,
        };
    }

    updateTerrainMotion() {
        const m = this.terrainMotion;
        const elapsed = performance.now() - m.startedAt;
        const t = Math.min(1, elapsed / m.duration);
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        this.x = m.startX + (m.endX - m.startX) * eased;
        this.y = m.startY + (m.endY - m.startY) * eased;
        if (m.mode === 'jump' || m.mode === 'hopDown') {
            this.y -= Math.sin(Math.PI * t) * m.arcPx;
        }

        const chart = this.getZones().find((zone) => zone.id === 'chart-zone');
        if (chart) {
            const root = this.rootRect();
            const size = this.config.movement.spriteSize;
            this.x = clamp(this.x, chart.bounds.left - root.left + 4, chart.bounds.right - root.left - size - 4);
            this.y = clamp(this.y, chart.bounds.top - root.top + 4, chart.bounds.bottom - root.top - size - 6);
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

    startClimb(targetBar = null) {
        const bar = targetBar || this.findNearestBar();
        if (bar) {
            const root = this.rootRect();
            const size = this.config.movement.spriteSize;
            this.x = clamp(bar.left - root.left - size + 10, 0, this.root.scrollWidth - size);
            this.y = clamp(bar.bottom - root.top - size, 0, this.root.scrollHeight - size);
            this.climbTargetY = clamp(bar.top - root.top - size + 4, 0, this.root.scrollHeight - size);
        }
        this.mode = 'climb';
        this.sprite.play('climb', { restart: true });
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
    }

    placeAtFirstZone() {
        const zone = this.pickNearestZone();
        if (!zone) return;
        const root = this.rootRect();
        this.zone = zone;
        const firstSurface = this.getChartSurfaces().find((surface) => surface.kind === 'bar');
        if (zone.id === 'chart-zone' && firstSurface) {
            this.x = (firstSurface.minX + firstSurface.maxX) / 2;
            this.y = firstSurface.y;
        } else {
            this.x = zone.bounds.left - root.left + 40;
            this.y = zone.bounds.top - root.top + 40;
        }
        this.sprite?.setPosition(this.x, this.y, this.direction);
        this.updateNameplate();
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
        const root = this.rootRect();
        const size = this.config.movement.spriteSize;
        const centerX = root.left + this.x + size / 2;
        return bars.sort((a, b) => Math.abs(centerX - (a.left + a.width / 2)) - Math.abs(centerX - (b.left + b.width / 2)))[0];
    }

    getChartSurfaces() {
        const chart = this.getZones().find((zone) => zone.id === 'chart-zone');
        if (!chart) return [];
        const root = this.rootRect();
        const size = this.config.movement.spriteSize;
        const chartLeft = chart.bounds.left - root.left;
        const chartRight = chart.bounds.right - root.left;
        const chartBottom = chart.bounds.bottom - root.top;

        // Terrain calculation: floor plus every visible bar top, all in root-local coordinates.
        const floor = {
            id: 'chart-floor',
            kind: 'floor',
            minX: chartLeft + 10,
            maxX: chartRight - size - 10,
            y: chartBottom - size - 12,
        };
        const bars = this.getSortedBars().map((bar, index) => ({
            id: `bar-${index}`,
            kind: 'bar',
            minX: bar.left - root.left,
            maxX: bar.right - root.left - size,
            y: bar.top - root.top - size,
        })).filter((surface) => surface.maxX >= surface.minX);
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
            .map((bar) => bar.getBoundingClientRect())
            .filter((rect) => rect.width > 0 && rect.height > 0)
            .sort((a, b) => a.left - b.left);
    }

    findNextBarPlatform() {
        const bars = this.getSortedBars();
        if (!bars.length) return null;
        const root = this.rootRect();
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
            x: target.left + target.width / 2 - root.left - size / 2,
            y: target.top - root.top - size + 6,
        };
    }

    nextChartAction() {
        const action = this.chartAction;
        this.chartAction = action === 'jump' ? 'climb' : 'jump';
        return action;
    }

    rootRect() {
        return this.root.getBoundingClientRect();
    }

    updateNameplate() {
        if (!this.nameplate) return;
        this.nameplate.style.left = `${Math.round(this.x)}px`;
        this.nameplate.style.top = `${Math.round(this.y)}px`;
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
