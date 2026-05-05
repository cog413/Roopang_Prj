const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public', 'assets', 'patties');
const CHARACTER_DIRS = ['rabbit', 'dog', 'cat'];

function safePattiePath(...parts) {
    const resolved = path.resolve(ROOT, ...parts);
    if (!resolved.startsWith(path.resolve(ROOT))) {
        throw new Error(`Refusing to write outside patties root: ${resolved}`);
    }
    return resolved;
}

function removePngs(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
            fs.unlinkSync(full);
        }
    }
}

function main() {
    fs.mkdirSync(ROOT, { recursive: true });
    for (const dir of CHARACTER_DIRS) {
        fs.mkdirSync(safePattiePath(dir), { recursive: true });
        removePngs(safePattiePath(dir));
    }

    const manifestPath = safePattiePath('manifest.json');
    if (fs.existsSync(manifestPath)) {
        const backupDir = safePattiePath('_backup');
        fs.mkdirSync(backupDir, { recursive: true });
        fs.copyFileSync(manifestPath, path.join(backupDir, `manifest-${Date.now()}.json`));
    }

    const manifest = {
        version: 'empty-001',
        source: 'public',
        isTestAsset: true,
        basePath: '/public/assets/patties',
        characters: {
            rabbit: { displayName: 'Rabbit Pattie', animations: {} },
            dog: { displayName: 'Dog Pattie', animations: {} },
            cat: { displayName: 'Cat Pattie', animations: {} },
        },
        items: {},
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    fs.mkdirSync(safePattiePath('_test'), { recursive: true });
    const readme = safePattiePath('_test', 'README.md');
    if (!fs.existsSync(readme)) {
        fs.writeFileSync(readme, '# Pattie Test Assets\n\nThis folder is preserved by cleanup.\n');
    }
}

main();
