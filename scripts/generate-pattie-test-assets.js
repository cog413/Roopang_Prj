const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'public', 'assets', 'patties');
const ANIMS = {
    idle: 3,
    walk: 4,
    sleep: 2,
    happy: 2,
    jump: 3,
    climb: 4,
};

const CHARACTERS = {
    rabbit: { displayName: 'Rabbit Pattie', primary: '#ffffff', secondary: '#ffb6c8', eye: '#111111' },
    dog: { displayName: 'Dog Pattie', primary: '#f6a94b', secondary: '#ffffff', eye: '#111111' },
    cat: { displayName: 'Cat Pattie', primary: '#3f454d', secondary: '#ff40ff', eye: '#ff40ff' },
};

const ITEMS = {
    sunglasses: { displayName: 'Sunglasses', type: 'face', src: '/public/assets/patties/items/sunglasses.png' },
    bee_suit: { displayName: 'Bee Suit', type: 'outfit', src: '/public/assets/patties/items/bee_suit.png' },
};

function crcTable() {
    const table = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        table[n] = c >>> 0;
    }
    return table;
}
const CRC = crcTable();

function crc32(buf) {
    let c = 0xffffffff;
    for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const name = Buffer.from(type);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
    return Buffer.concat([len, name, data, crc]);
}

function png(width, height, pixels) {
    const stride = width * 4;
    const rows = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        rows[y * (stride + 1)] = 0;
        pixels.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

function color(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

function set(px, width, x, y, c) {
    if (x < 0 || y < 0 || x >= width || y >= 32) return;
    const i = (y * width + x) * 4;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3];
}

function rect(px, width, x, y, w, h, c) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(px, width, xx, yy, c);
}

function drawRabbit(px, sheetW, ox, palette, frame, anim) {
    const black = color('#000000'), main = color(palette.primary), pink = color(palette.secondary), eye = color(palette.eye);
    const bob = anim === 'idle' ? frame % 2 : 0;
    const step = anim === 'walk' ? (frame % 2) : 0;
    rect(px, sheetW, ox + 9, 4 + bob, 4, 11, black); rect(px, sheetW, ox + 10, 5 + bob, 2, 9, main);
    rect(px, sheetW, ox + 20, 4 + bob, 4, 11, black); rect(px, sheetW, ox + 21, 5 + bob, 2, 9, main);
    rect(px, sheetW, ox + 10, 14 + bob, 14, 12, black); rect(px, sheetW, ox + 11, 15 + bob, 12, 10, main);
    rect(px, sheetW, ox + 15, 24 + step, 3, 3, black); rect(px, sheetW, ox + 21, 24 - step, 3, 3, black);
    rect(px, sheetW, ox + 13, 17 + bob, 2, 2, eye); rect(px, sheetW, ox + 20, 17 + bob, 2, 2, eye);
    rect(px, sheetW, ox + 17, 20 + bob, 2, 2, pink);
}

function drawDog(px, sheetW, ox, palette, frame, anim) {
    const black = color('#000000'), tan = color(palette.primary), white = color(palette.secondary), eye = color(palette.eye);
    const step = anim === 'walk' || anim === 'climb' ? frame % 2 : 0;
    rect(px, sheetW, ox + 7, 11, 18, 11, black); rect(px, sheetW, ox + 8, 12, 16, 9, tan);
    rect(px, sheetW, ox + 5, 9, 9, 10, black); rect(px, sheetW, ox + 6, 10, 8, 8, white);
    rect(px, sheetW, ox + 4, 6, 5, 6, black); rect(px, sheetW, ox + 23, 7, 4, 8, black);
    rect(px, sheetW, ox + 6, 15, 2, 2, eye); rect(px, sheetW, ox + 10, 17, 2, 2, black);
    rect(px, sheetW, ox + 9, 21 + step, 4, 4, black); rect(px, sheetW, ox + 20, 21 - step, 4, 4, black);
    rect(px, sheetW, ox + 25, 12, 3, 6, black); rect(px, sheetW, ox + 24, 13, 3, 4, white);
}

function drawCat(px, sheetW, ox, palette, frame, anim) {
    const black = color('#000000'), main = color(palette.primary), eye = color(palette.eye);
    const bob = anim === 'idle' ? frame % 2 : 0;
    const step = anim === 'walk' || anim === 'climb' ? frame % 2 : 0;
    rect(px, sheetW, ox + 8, 8 + bob, 16, 16, black); rect(px, sheetW, ox + 9, 9 + bob, 14, 14, main);
    rect(px, sheetW, ox + 7, 5 + bob, 5, 6, black); rect(px, sheetW, ox + 20, 5 + bob, 5, 6, black);
    rect(px, sheetW, ox + 12, 14 + bob, 2, 2, eye); rect(px, sheetW, ox + 20, 14 + bob, 2, 2, eye);
    rect(px, sheetW, ox + 16, 17 + bob, 2, 2, black);
    rect(px, sheetW, ox + 23, 15, 5, 9, black); rect(px, sheetW, ox + 25, 14, 3, 3, main);
    rect(px, sheetW, ox + 10, 23 + step, 4, 4, black); rect(px, sheetW, ox + 20, 23 - step, 4, 4, black);
}

function drawEffect(px, sheetW, ox, frame, anim) {
    if (anim === 'sleep') {
        const blue = color('#5b9bd5');
        rect(px, sheetW, ox + 24, 5 + frame, 2, 1, blue); rect(px, sheetW, ox + 26, 4 + frame, 2, 1, blue);
        rect(px, sheetW, ox + 24, 8 + frame, 4, 1, blue);
    }
    if (anim === 'happy') {
        const red = color('#ff4d68');
        rect(px, sheetW, ox + 24, 5 - frame, 2, 2, red); rect(px, sheetW, ox + 27, 5 - frame, 2, 2, red);
        rect(px, sheetW, ox + 25, 7 - frame, 3, 2, red); set(px, sheetW, ox + 26, 9 - frame, red);
    }
}

function drawSpriteSheet(key, anim) {
    const frames = ANIMS[anim];
    const width = frames * 32;
    const px = Buffer.alloc(width * 32 * 4);
    for (let f = 0; f < frames; f++) {
        const ox = f * 32;
        const yShift = anim === 'jump' ? [2, -4, 1][f] : 0;
        const shifted = {
            primary: CHARACTERS[key].primary,
            secondary: CHARACTERS[key].secondary,
            eye: CHARACTERS[key].eye,
        };
        const proxy = { set yShift(v) {} };
        if (yShift) {
            const tmp = Buffer.alloc(32 * 32 * 4);
            if (key === 'rabbit') drawRabbit(tmp, 32, 0, shifted, f, anim);
            if (key === 'dog') drawDog(tmp, 32, 0, shifted, f, anim);
            if (key === 'cat') drawCat(tmp, 32, 0, shifted, f, anim);
            for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
                const si = (y * 32 + x) * 4;
                if (tmp[si + 3]) set(px, width, ox + x, y + yShift, [tmp[si], tmp[si + 1], tmp[si + 2], tmp[si + 3]]);
            }
        } else {
            if (key === 'rabbit') drawRabbit(px, width, ox, shifted, f, anim);
            if (key === 'dog') drawDog(px, width, ox, shifted, f, anim);
            if (key === 'cat') drawCat(px, width, ox, shifted, f, anim);
        }
        drawEffect(px, width, ox, f, anim);
    }
    return png(width, 32, px);
}

function drawItem(key) {
    const px = Buffer.alloc(32 * 32 * 4);
    const black = color('#000000');
    const yellow = color('#ffd966');
    if (key === 'sunglasses') {
        rect(px, 32, 9, 13, 5, 3, black); rect(px, 32, 18, 13, 5, 3, black); rect(px, 32, 14, 14, 4, 1, black);
    }
    if (key === 'bee_suit') {
        rect(px, 32, 8, 17, 16, 5, yellow); rect(px, 32, 11, 17, 2, 5, black); rect(px, 32, 18, 17, 2, 5, black);
    }
    return png(32, 32, px);
}

function main() {
    fs.mkdirSync(OUT, { recursive: true });
    fs.mkdirSync(path.join(OUT, '_test'), { recursive: true });
    fs.writeFileSync(path.join(OUT, '_test', 'README.md'), [
        '# Pattie Test Assets',
        '',
        'Generated test sprite sheets based on `manually_command/character_image.png`.',
        'These are replaceable placeholders managed by `manifest.json`.',
    ].join('\n'));

    const manifest = {
        version: 'test-001',
        source: 'public',
        isTestAsset: true,
        basePath: '/public/assets/patties',
        characters: {},
        items: {},
    };

    for (const [key, meta] of Object.entries(CHARACTERS)) {
        fs.mkdirSync(path.join(OUT, key), { recursive: true });
        manifest.characters[key] = { displayName: meta.displayName, animations: {} };
        for (const [anim, frames] of Object.entries(ANIMS)) {
            const rel = `/public/assets/patties/${key}/${anim}.png`;
            fs.writeFileSync(path.join(OUT, key, `${anim}.png`), drawSpriteSheet(key, anim));
            manifest.characters[key].animations[anim] = {
                src: rel,
                frameCount: frames,
                frameWidth: 32,
                frameHeight: 32,
                fps: 2,
                frameDurationMs: 500,
            };
        }
    }

    fs.mkdirSync(path.join(OUT, 'items'), { recursive: true });
    for (const [key, item] of Object.entries(ITEMS)) {
        fs.writeFileSync(path.join(OUT, 'items', `${key}.png`), drawItem(key));
        manifest.items[key] = { ...item, frameWidth: 32, frameHeight: 32, isTestAsset: true };
    }

    fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

main();
