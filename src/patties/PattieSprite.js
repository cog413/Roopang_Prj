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

    async play(animationKey, { restart = false, once = false, next = 'walk', frameDurationMs = null } = {}) {
        if (!restart && this.animationKey === animationKey && this.animation) return;
        this.animationKey = animationKey;
        this.animation = await this.loader.getAnimation(this.characterKey, animationKey);
        this.frame = 0;
        this.once = once;
        this.nextAnimation = next;
        this.frameDurationOverride = frameDurationMs;
        this.applyFrame();
        this.startFrameTimer();
    }

    startFrameTimer() {
        clearInterval(this.frameTimer);
        const duration = this.frameDurationOverride || this.animation?.frameDurationMs || 500;
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
        const renderWidth = this.animation.renderWidth || width;
        const renderHeight = this.animation.renderHeight || height;
        const imageWidth = this.animation.imageWidth || (this.animation.frameCount || 1) * width;
        const imageHeight = this.animation.imageHeight || height;
        const spacingX = this.animation.frameSpacingX || 0;
        const spacingY = this.animation.frameSpacingY || 0;
        const sourceX = (this.animation.sourcePaddingX || 0) + this.frame * (width + spacingX);
        const sourceY = (this.animation.sourcePaddingY || 0) + this.frame * spacingY;
        // Outer element: collision/layout box stays at renderWidth × renderHeight
        this.el.style.width = `${renderWidth}px`;
        this.el.style.height = `${renderHeight}px`;
        // Inner layer: renders at native frame size (no backgroundSize scaling).
        // CSS transform: scale() downscales via GPU compositor — avoids sub-pixel math artifacts.
        this.baseEl.style.width = `${width}px`;
        this.baseEl.style.height = `${height}px`;
        this.baseEl.style.transform = `scale(${renderWidth / width})`;
        this.baseEl.style.backgroundImage = `url("${this.animation.src}")`;
        this.baseEl.style.backgroundPosition = `-${sourceX}px -${sourceY}px`;
        this.baseEl.style.backgroundSize = `${imageWidth}px ${imageHeight}px`;
        this.itemLayer.style.width = `${renderWidth}px`;
        this.itemLayer.style.height = `${renderHeight}px`;
    }

    setPosition(x, y, direction = 1) {
        this.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) scaleX(${direction < 0 ? -1 : 1})`;
    }

    destroy() {
        clearInterval(this.frameTimer);
        this.el.remove();
    }
}
