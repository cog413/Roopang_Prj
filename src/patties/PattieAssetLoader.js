const DEFAULT_MANIFEST_URL = '/public/assets/patties/manifest.json';

export class PattieAssetLoader {
    constructor({ manifestUrl = DEFAULT_MANIFEST_URL } = {}) {
        this.manifestUrl = manifestUrl;
        this.manifest = null;
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
        return manifest.characters?.[characterKey] || manifest.characters?.rabbit || null;
    }

    async getAnimation(characterKey = 'rabbit', animationKey = 'idle') {
        const character = await this.getCharacter(characterKey);
        if (!character) return null;
        return character.animations?.[animationKey] || character.animations?.idle || null;
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
