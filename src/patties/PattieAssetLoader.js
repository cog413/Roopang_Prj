const DEFAULT_MANIFEST_URL = '/public/assets/corgi/manifest.json';

export class PattieAssetLoader {
    constructor({ manifestUrl = DEFAULT_MANIFEST_URL } = {}) {
        this.manifestUrl = manifestUrl;
        this.manifest = null;
        this.imageMeta = new Map();
    }

    async loadManifest() {
        if (this.manifest) return this.manifest;
        const res = await fetch(this.manifestUrl, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`Failed to load Pattie manifest: ${res.status}`);
        this.manifest = await res.json();
        return this.manifest;
    }

    async getCharacter(characterKey = 'rabbit') {
        const manifest = await this.loadManifest();
        return manifest.characters?.[characterKey]
            || manifest.characters?.mong
            || manifest.characters?.rabbit
            || Object.values(manifest.characters || {})[0]
            || null;
    }

    async getAnimation(characterKey = 'rabbit', animationKey = 'idle') {
        const manifest = await this.loadManifest();
        const character = await this.getCharacter(characterKey);
        if (!character) return null;
        const aliasKey = character.animationAliases?.[animationKey] || animationKey;
        const animation = character.animations?.[aliasKey]
            || character.animations?.idle
            || null;
        if (!animation) return null;
        return this.resolveSpriteSheetAnimation(animation, manifest.spriteSheet || {});
    }

    async getItem(itemKey) {
        if (!itemKey) return null;
        const manifest = await this.loadManifest();
        return manifest.items?.[itemKey] || null;
    }

    async listCharacters() {
        const manifest = await this.loadManifest();
        return Object.entries(manifest.characters || {}).map(([key, value]) => ({ key, ...value }));
    }

    async listItems() {
        const manifest = await this.loadManifest();
        return Object.entries(manifest.items || {}).map(([key, value]) => ({ key, ...value }));
    }
}

export const pattieAssetLoader = new PattieAssetLoader();

PattieAssetLoader.prototype.resolveSpriteSheetAnimation = async function resolveSpriteSheetAnimation(animation, defaults = {}) {
    const frameWidth = animation.frameWidth || defaults.frameWidth || 32;
    const frameHeight = animation.frameHeight || defaults.frameHeight || 32;
    const renderWidth = animation.renderWidth || defaults.renderWidth || frameWidth;
    const renderHeight = animation.renderHeight || defaults.renderHeight || frameHeight;
    const spacingX = animation.frameSpacingX ?? defaults.frameSpacingX ?? 0;
    const spacingY = animation.frameSpacingY ?? defaults.frameSpacingY ?? 0;
    const declaredPadding = animation.framePaddingPx ?? defaults.framePaddingPx ?? 0;
    const meta = await this.loadImageMeta(animation.src);
    const imageWidth = animation.imageWidth || meta.width;
    const imageHeight = animation.imageHeight || meta.height;
    const frameCount = animation.frameCount || inferFrameCount(imageWidth, frameWidth, spacingX, declaredPadding);
    const leftoverX = imageWidth - frameCount * frameWidth - Math.max(0, frameCount - 1) * spacingX;
    const sourcePaddingX = animation.sourcePaddingX ?? Math.max(0, Math.floor(leftoverX / 2));
    const sourcePaddingY = animation.sourcePaddingY ?? Math.max(0, Math.floor((imageHeight - frameHeight) / 2));

    return {
        ...animation,
        frameWidth,
        frameHeight,
        renderWidth,
        renderHeight,
        frameSpacingX: spacingX,
        frameSpacingY: spacingY,
        sourcePaddingX,
        sourcePaddingY,
        imageWidth,
        imageHeight,
        frameCount,
    };
};

PattieAssetLoader.prototype.loadImageMeta = function loadImageMeta(src) {
    if (this.imageMeta.has(src)) return this.imageMeta.get(src);
    const promise = new Promise((resolve, reject) => {
        if (typeof Image === 'undefined') {
            resolve({ width: 0, height: 0 });
            return;
        }
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
        img.onerror = () => reject(new Error(`Failed to load sprite sheet: ${src}`));
        img.src = src;
    });
    this.imageMeta.set(src, promise);
    return promise;
};

function inferFrameCount(imageWidth, frameWidth, spacingX, paddingX) {
    if (!imageWidth || !frameWidth) return 1;
    const usableWidth = Math.max(frameWidth, imageWidth - paddingX * 2 + spacingX);
    return Math.max(1, Math.round(usableWidth / (frameWidth + spacingX)));
}
