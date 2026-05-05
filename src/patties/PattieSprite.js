export class PattieSprite {
    constructor({ loader, characterKey = 'rabbit', itemKeys = [] }) {
        this.loader = loader;
        this.characterKey = characterKey;
        this.itemKeys = itemKeys;
        this.animationKey = 'idle';
        this.animation = null;
        this.frame = 0;
        this.frameTimer = null;
        this.el = document.createElement('div');
        this.el.className = 'pattie-sprite';
        this.el.tabIndex = 0;
        this.el.setAttribute('role', 'button');
        this.el.setAttribute('aria-label', 'Pattie');
        this.baseEl = document.createElement('div');
        this.baseEl.className = 'pattie-sprite-base';
        this.itemLayer = document.createElement('div');
        this.itemLayer.className = 'pattie-item-layer';
        this.el.append(this.baseEl, this.itemLayer);
    }

    async mount(parent) {
        parent.appendChild(this.el);
        await this.setCharacter(this.characterKey, this.itemKeys);
        await this.play('idle');
    }

    async setCharacter(characterKey, itemKeys = this.itemKeys) {
        this.characterKey = characterKey || 'rabbit';
        this.itemKeys = Array.isArray(itemKeys) ? itemKeys : [];
        this.el.dataset.character = this.characterKey;
        await this.renderItems();
        await this.play(this.animationKey || 'idle', { restart: true });
    }

    async renderItems() {
        this.itemLayer.innerHTML = '';
        for (const itemKey of this.itemKeys) {
            const item = await this.loader.getItem(itemKey);
            if (!item?.src) continue;
            const layer = document.createElement('div');
            layer.className = `pattie-equipped-item pattie-equipped-item--${item.type || 'generic'}`;
            layer.style.backgroundImage = `url("${item.src}")`;
            this.itemLayer.appendChild(layer);
        }
    }

    async play(animationKey, { restart = false, once = false, next = 'walk' } = {}) {
        if (!restart && this.animationKey === animationKey && this.animation) return;
        this.animationKey = animationKey;
        this.animation = await this.loader.getAnimation(this.characterKey, animationKey);
        this.frame = 0;
        this.once = once;
        this.nextAnimation = next;
        this.applyFrame();
        this.startFrameTimer();
    }

    startFrameTimer() {
        clearInterval(this.frameTimer);
        const duration = this.animation?.frameDurationMs || 500;
        this.frameTimer = setInterval(() => {
            const count = this.animation?.frameCount || 1;
            this.frame += 1;
            if (this.frame >= count) {
                if (this.once) {
                    this.play(this.nextAnimation || 'walk', { restart: true });
                    return;
                }
                this.frame = 0;
            }
            this.applyFrame();
        }, duration);
    }

    applyFrame() {
        if (!this.animation) return;
        const width = this.animation.frameWidth || 32;
        const height = this.animation.frameHeight || 32;
        this.baseEl.style.width = `${width}px`;
        this.baseEl.style.height = `${height}px`;
        this.baseEl.style.backgroundImage = `url("${this.animation.src}")`;
        this.baseEl.style.backgroundPosition = `-${this.frame * width}px 0`;
        this.baseEl.style.backgroundSize = `${(this.animation.frameCount || 1) * width}px ${height}px`;
    }

    setPosition(x, y, direction = 1) {
        this.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) scaleX(${direction < 0 ? -1 : 1})`;
    }

    destroy() {
        clearInterval(this.frameTimer);
        this.el.remove();
    }
}
