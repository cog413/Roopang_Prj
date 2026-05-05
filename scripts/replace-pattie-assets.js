const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public', 'assets', 'patties');
const REQUIRED_CHARS = ['rabbit', 'dog', 'cat'];
const REQUIRED_ANIMS = ['idle', 'walk', 'sleep', 'happy', 'jump', 'climb'];

function usage() {
    console.log('Usage: node scripts/replace-pattie-assets.js <source-folder> [--version v] [--production]');
}

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const from = path.join(src, entry.name);
        const to = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(from, to);
        else fs.copyFileSync(from, to);
    }
}

function nextVersion(current, explicit) {
    if (explicit) return explicit;
    const match = /^test-(\d+)$/.exec(current || '');
    if (!match) return `test-${Date.now()}`;
    return `test-${String(Number(match[1]) + 1).padStart(3, '0')}`;
}

function main() {
    const args = process.argv.slice(2);
    const srcArg = args[0];
    if (!srcArg) {
        usage();
        process.exit(1);
    }

    const source = path.resolve(srcArg);
    if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
        throw new Error(`Source folder not found: ${source}`);
    }

    fs.mkdirSync(ROOT, { recursive: true });
    const backupRoot = path.join(ROOT, '_backup', String(Date.now()));
    fs.mkdirSync(backupRoot, { recursive: true });

    for (const name of fs.readdirSync(ROOT)) {
        if (name === '_backup' || name === '_test') continue;
        const from = path.join(ROOT, name);
        if (fs.existsSync(from)) copyDir(from, path.join(backupRoot, name));
    }
    const manifestPath = path.join(ROOT, 'manifest.json');
    if (fs.existsSync(manifestPath)) fs.copyFileSync(manifestPath, path.join(backupRoot, 'manifest.json'));

    copyDir(source, ROOT);

    const manifest = fs.existsSync(manifestPath)
        ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
        : { source: 'public', basePath: '/public/assets/patties', characters: {}, items: {} };

    const explicitVersionIndex = args.indexOf('--version');
    manifest.version = nextVersion(manifest.version, explicitVersionIndex >= 0 ? args[explicitVersionIndex + 1] : null);
    manifest.source = manifest.source || 'public';
    manifest.basePath = manifest.basePath || '/public/assets/patties';
    manifest.isTestAsset = !args.includes('--production');
    manifest.characters = manifest.characters || {};

    for (const char of REQUIRED_CHARS) {
        manifest.characters[char] = manifest.characters[char] || { displayName: `${char} Pattie`, animations: {} };
        manifest.characters[char].animations = manifest.characters[char].animations || {};
        for (const anim of REQUIRED_ANIMS) {
            const file = path.join(ROOT, char, `${anim}.png`);
            if (!fs.existsSync(file)) continue;
            manifest.characters[char].animations[anim] = {
                src: `/public/assets/patties/${char}/${anim}.png`,
                frameCount: manifest.characters[char].animations[anim]?.frameCount || (anim === 'walk' || anim === 'climb' ? 4 : anim === 'idle' || anim === 'jump' ? 3 : 2),
                frameWidth: 32,
                frameHeight: 32,
                fps: 2,
                frameDurationMs: 500,
            };
        }
    }

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

main();
