// Generates import_typing_contents_260511.sql from 한글타자_문제은행_260511.csv
// Usage: node manually_command/generate_typing_import_sql.js

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const CSV_PATH = path.join(DIR, '한글타자_문제은행_260511.csv');
const OUT_PATH = path.join(DIR, 'import_typing_contents_260511.sql');

const CATEGORY_MAP = { '유머': 'humor', '힐링': 'healing', '명언': 'quote' };

function escapeSql(str) {
    return str.replace(/'/g, "''");
}

const text = fs.readFileSync(CSV_PATH, 'utf8').replace(/^﻿/, ''); // strip BOM
const lines = text.split(/\r?\n/);

const inserts = [];
let skipped = 0;

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // category is before first comma; length (number or empty) is after last comma;
    // content is everything in between (handles commas inside content safely)
    const firstComma = line.indexOf(',');
    if (firstComma === -1) { skipped++; continue; }
    const lastComma = line.lastIndexOf(',');

    const category = line.slice(0, firstComma).trim();
    const mappedCat = CATEGORY_MAP[category];
    if (!mappedCat) { skipped++; continue; }

    const content = line.slice(firstComma + 1, lastComma).trim();
    if (!content) { skipped++; continue; }

    const lengthStr = line.slice(lastComma + 1).trim();
    const length = (lengthStr && /^\d+$/.test(lengthStr))
        ? parseInt(lengthStr, 10)
        : [...content].length;

    inserts.push(
        `INSERT INTO typing_contents (category, content, length, is_active) VALUES ('${escapeSql(mappedCat)}', '${escapeSql(content)}', ${length}, 1);`
    );
}

const sql = ['DELETE FROM typing_contents;', ...inserts, ''].join('\n');
fs.writeFileSync(OUT_PATH, sql, 'utf8');
console.log(`Imported : ${inserts.length} rows`);
console.log(`Skipped  : ${skipped} rows`);
console.log(`Output   : ${OUT_PATH}`);
