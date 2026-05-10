const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'manually_command', 'export');
const OUT = path.join(ROOT, 'public', 'assets', 'patties_mong_test');
const OUT_CHAR = path.join(OUT, 'mong');

const FRAME = 64;
const VERSION = 'mong-test-001';

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

function readPng(file) {
    const buf = fs.readFileSync(file);
    let pos = 8;
    let width = 0, height = 0, colorType = 6;
    const idat = [];
    while (pos < buf.length) {
        const len = buf.readUInt32BE(pos); pos += 4;
        const type = buf.slice(pos, pos + 4).toString('ascii'); pos += 4;
        const data = buf.slice(pos, pos + len); pos += len;
        pos += 4;
        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            colorType = data[9];
        }
        if (type === 'IDAT') idat.push(data);
        if (type === 'IEND') break;
    }
    if (colorType !== 6) throw new Error(`Only RGBA PNG is supported: ${file}`);
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const bpp = 4;
    const stride = width * bpp;
    const pixels = Buffer.alloc(width * height * 4);
    let srcPos = 0;
    let prev = Buffer.alloc(stride);
    for (let y = 0; y < height; y++) {
        const filter = raw[srcPos++];
        const row = Buffer.from(raw.slice(srcPos, srcPos + stride));
        srcPos += stride;
        unfilter(row, prev, filter, bpp);
        row.copy(pixels, y * stride);
        prev = row;
    }
    return { width, height, pixels };
}

function unfilter(row, prev, filter, bpp) {
    for (let i = 0; i < row.length; i++) {
        const left = i >= bpp ? row[i - bpp] : 0;
        const up = prev[i] || 0;
        const ul = i >= bpp ? prev[i - bpp] || 0 : 0;
        if (filter === 1) row[i] = (row[i] + left) & 255;
        else if (filter === 2) row[i] = (row[i] + up) & 255;
        else if (filter === 3) row[i] = (row[i] + Math.floor((left + up) / 2)) & 255;
        else if (filter === 4) row[i] = (row[i] + paeth(left, up, ul)) & 255;
    }
}

function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

function writePng(width, height, pixels, file) {
    const stride = width * 4;
    const rows = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        rows[y * (stride + 1)] = 0;
        pixels.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; ihdr[9] = 6;
    const out = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, out);
}

function loadFrames(dir, pattern) {
    const folder = path.join(SRC, dir);
    return fs.readdirSync(folder)
        .filter((name) => pattern.test(name))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((name) => readPng(path.join(folder, name)));
}

function blank(width = FRAME, height = FRAME) {
    return { width, height, pixels: Buffer.alloc(width * height * 4) };
}

function get(src, x, y) {
    if (x < 0 || y < 0 || x >= src.width || y >= src.height) return [0, 0, 0, 0];
    const i = (y * src.width + x) * 4;
    return [src.pixels[i], src.pixels[i + 1], src.pixels[i + 2], src.pixels[i + 3]];
}

function set(dst, x, y, rgba) {
    if (x < 0 || y < 0 || x >= dst.width || y >= dst.height || rgba[3] === 0) return;
    const i = (y * dst.width + x) * 4;
    dst.pixels[i] = rgba[0]; dst.pixels[i + 1] = rgba[1]; dst.pixels[i + 2] = rgba[2]; dst.pixels[i + 3] = rgba[3];
}

function drawFrame(base, opts = {}) {
    const dst = blank();
    const {
        dx = 0, dy = 0, squash = 1, cropTop = 0, rotateLean = 0, darkenEyes = false,
    } = opts;
    const cx = FRAME / 2;
    const cy = FRAME / 2;
    for (let y = 0; y < FRAME; y++) {
        for (let x = 0; x < FRAME; x++) {
            const yy = Math.round((y - cy) / squash + cy - dy);
            const xx = Math.round(x - dx - rotateLean * ((y - cy) / FRAME));
            if (yy < cropTop) continue;
            const c = get(base, xx, yy);
            set(dst, x, y, c);
        }
    }
    if (darkenEyes) {
        rect(dst, 35, 32, 8, 2, [38, 31, 25, 255]);
    }
    return dst;
}

function rect(dst, x, y, w, h, c) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(dst, xx, yy, c);
}

function dot(dst, x, y, c) {
    set(dst, x, y, c);
}

function drawZ(dst, ox, oy) {
    const blue = [93, 142, 215, 255];
    rect(dst, ox, oy, 8, 2, blue);
    rect(dst, ox + 5, oy + 2, 2, 2, blue);
    rect(dst, ox + 3, oy + 4, 2, 2, blue);
    rect(dst, ox, oy + 6, 8, 2, blue);
}

function drawHeart(dst, ox, oy) {
    const red = [255, 91, 122, 255];
    rect(dst, ox + 1, oy, 3, 3, red);
    rect(dst, ox + 6, oy, 3, 3, red);
    rect(dst, ox, oy + 2, 10, 4, red);
    rect(dst, ox + 2, oy + 6, 6, 2, red);
    rect(dst, ox + 4, oy + 8, 2, 2, red);
}

function drawClimbGrip(dst, frame) {
    const paw = [255, 244, 224, 255];
    const outline = [80, 54, 31, 255];
    const y1 = 22 + (frame % 2) * 3;
    rect(dst, 42, y1, 5, 3, outline);
    rect(dst, 43, y1, 3, 2, paw);
    rect(dst, 24, y1 + 7, 5, 3, outline);
    rect(dst, 25, y1 + 7, 3, 2, paw);
}

function sheet(frames) {
    const out = blank(frames.length * FRAME, FRAME);
    frames.forEach((frame, idx) => {
        for (let y = 0; y < FRAME; y++) {
            for (let x = 0; x < FRAME; x++) {
                set(out, idx * FRAME + x, y, get(frame, x, y));
            }
        }
    });
    return out;
}

function copyAnimation(name, frames, frameDurationMs) {
    const out = sheet(frames);
    writePng(out.width, out.height, out.pixels, path.join(OUT_CHAR, `${name}.png`));
    return meta(name, frames.length, frameDurationMs);
}

function meta(name, frameCount, frameDurationMs) {
    return {
        src: `/public/assets/patties_mong_test/mong/${name}.png`,
        frameCount,
        frameWidth: FRAME,
        frameHeight: FRAME,
        renderWidth: 25,
        renderHeight: 25,
        fps: Math.round(1000 / frameDurationMs),
        frameDurationMs,
    };
}

function main() {
    fs.mkdirSync(OUT_CHAR, { recursive: true });
    fs.mkdirSync(path.join(OUT, '_test'), { recursive: true });
    fs.writeFileSync(path.join(OUT, '_test', 'README.md'), [
        '# Mong Test Assets',
        '',
        'Temporary 64x64 Mong sprite sheets generated from `manually_command/export`.',
        'Keep this separate from final Pattie assets for easy deletion/replacement.',
    ].join('\n'));

    const idle = loadFrames('idle', /\.png$/i);
    const walk = loadFrames('walk', /\.png$/i);
    const run = loadFrames('run', /\.png$/i);
    const base = idle[0] || walk[0] || run[0];

    const sleepBase = run[Math.floor(run.length / 2)] || walk[0] || base;
    const sleep = [0, 1, 2, 1, 0].map((_, i) => {
        const f = drawFrame(sleepBase, {
            dx: i % 2 === 0 ? 0 : 1,
            dy: 7 + (i === 2 ? 1 : 0),
            squash: 0.96,
            darkenEyes: true,
        });
        drawZ(f, 45 + i, 9 - Math.floor(i / 2) * 2);
        return f;
    });

    const happy = [0, 1, 2, 3, 2, 1].map((_, i) => {
        const f = drawFrame(base, { dy: i % 2 === 0 ? -2 : -5, squash: i % 2 === 0 ? 1 : 1.05 });
        drawHeart(f, 45, 8 - Math.min(i, 3));
        return f;
    });

    const jumpOffsets = [7, 2, -8, -13, -7, 0, 5];
    const jump = jumpOffsets.map((dy, i) => drawFrame(i < 2 ? walk[0] || base : run[Math.min(i, run.length - 1)] || base, {
        dy,
        squash: i === 0 || i === jumpOffsets.length - 1 ? 0.9 : 1.02,
        rotateLean: i < 3 ? 2 : -1,
    }));

    const climb = [0, 1, 2, 3, 4, 5].map((_, i) => {
        const f = drawFrame(run[i % run.length] || base, {
            dx: i % 2 === 0 ? -1 : 2,
            dy: -i,
            rotateLean: i % 2 === 0 ? -3 : 3,
        });
        drawClimbGrip(f, i);
        return f;
    });

    const manifest = {
        version: VERSION,
        source: 'public',
        isTestAsset: true,
        basePath: '/public/assets/patties_mong_test',
        characters: {
            mong: {
                displayName: 'Mong Test',
                animations: {
                    idle: copyAnimation('idle', idle, 360),
                    walk: copyAnimation('walk', walk, 320),
                    run: copyAnimation('run', run, 260),
                    sleep: copyAnimation('sleep', sleep, 420),
                    happy: copyAnimation('happy', happy, 300),
                    jump: copyAnimation('jump', jump, 280),
                    climb: copyAnimation('climb', climb, 300),
                },
            },
        },
        items: {},
    };
    fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

main();
