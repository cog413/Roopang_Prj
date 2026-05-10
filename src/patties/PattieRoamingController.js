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
        this.zone = this.findCurrentZone() || this.pickNearestZone();
        if (Date.now() - this.lastInteractionAt > this.config.movement.sleepAfterMs && Math.random() < 0.2) {
            this.setMode('sleep');
            return;
        }

        const mode = weightedPick(this.zone?.weights || this.config.zones[0].weights);
        if (mode === 'climb' && this.findNearestBar()) {
            this.startClimb();
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

    startClimb() {
        const bar = this.findNearestBar();
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
        this.sprite.play('happy', { restart: true, once: true, next: 'walk' });
        this.mode = 'happy';
        document.dispatchEvent(new CustomEvent('refresheet:pattie-happy'));
        fetch('/api/minime/interact', { method: 'POST', credentials: 'include' }).catch(() => {});
        setTimeout(() => {
            if (this.mode === 'happy') this.setMode('walk');
        }, 1300);
    }

    handleSpeech(event) {
        if (event.detail?.manual) this.happy();
    }

    placeAtFirstZone() {
        const zone = this.pickNearestZone();
        if (!zone) return;
        const root = this.rootRect();
        this.x = zone.bounds.left - root.left + 40;
        this.y = zone.bounds.top - root.top + 200;
        this.zone = zone;
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
            return Array.from(this.root.querySelectorAll(zone.selector)).map((el) => ({
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
        const centerX = root.left + this.x + size / 2;
        const forward = this.direction >= 0
            ? bars.find((bar) => bar.left + bar.width / 2 > centerX + 6)
            : [...bars].reverse().find((bar) => bar.left + bar.width / 2 < centerX - 6);
        const target = forward || (this.direction >= 0 ? bars[0] : bars[bars.length - 1]);
        return {
            x: target.left + target.width / 2 - root.left - size / 2,
            y: target.top - root.top - size + 6,
        };
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

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
