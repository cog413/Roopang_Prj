#!/usr/bin/env node

/**
 * Fetch 3,000 Sudoku rows from the public Hugging Face dataset and write
 * a normalized CSV source for scripts/generate_sudoku_bank.mjs.
 *
 * Source dataset:
 *   https://huggingface.co/datasets/Ritvik19/Sudoku-Dataset
 *
 * The dataset card declares Apache-2.0 and exposes puzzle/solution as
 * 81-character strings. This script maps source clue_count to game level 1-5.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SOURCE_URL = 'https://huggingface.co/datasets/Ritvik19/Sudoku-Dataset';
const API_DATASET = 'Ritvik19%2FSudoku-Dataset';
const DEFAULT_OUTPUT = './data/sudoku_bank.csv';
const DEFAULT_LIMIT = 3000;
const PAGE_SIZE = 100;

const args = parseArgs(process.argv.slice(2));
const limit = Number(args.limit || DEFAULT_LIMIT);
const outputPath = path.resolve(args.output || DEFAULT_OUTPUT);

if (!Number.isInteger(limit) || limit <= 0) {
  throw new Error('--limit must be a positive integer.');
}

const rows = ['puzzle,solution,difficulty,original_difficulty,source_url,clue_count,source_row_idx'];

for (let offset = 0; offset < limit; offset += PAGE_SIZE) {
  const length = Math.min(PAGE_SIZE, limit - offset);
  const url =
    `https://datasets-server.huggingface.co/rows?dataset=${API_DATASET}` +
    `&config=default&split=train&offset=${offset}&length=${length}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText} at offset ${offset}`);
  }

  const payload = await response.json();
  for (const item of payload.rows || []) {
    const source = item.row;
    const puzzle = normalizeGrid(source.puzzle);
    const solution = normalizeGrid(source.solution);

    if (!isGrid81(puzzle) || !isGrid81(solution)) {
      throw new Error(`Invalid puzzle/solution at source row ${item.row_idx}`);
    }

    const missing = Number(source.missing ?? countMissing(puzzle));
    const clueCount = 81 - missing;
    const originalDifficulty = Number(source.difficulty ?? 0);
    const level = levelFromClues(clueCount);

    rows.push(
      [
        puzzle,
        solution,
        level,
        originalDifficulty,
        SOURCE_URL,
        clueCount,
        item.row_idx,
      ]
        .map(csv)
        .join(','),
    );
  }
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${rows.join('\n')}\n`, 'utf8');
console.log(`Wrote ${rows.length - 1} rows to ${outputPath}`);

function levelFromClues(clueCount) {
  if (clueCount >= 61) return 1;
  if (clueCount >= 51) return 2;
  if (clueCount >= 41) return 3;
  if (clueCount >= 31) return 4;
  return 5;
}

function normalizeGrid(value) {
  return String(value || '').replace(/\./g, '0').replace(/[^0-9]/g, '');
}

function isGrid81(value) {
  return /^[0-9]{81}$/.test(value);
}

function countMissing(puzzle) {
  return (puzzle.match(/0/g) || []).length;
}

function csv(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--output' || current === '-o') {
      parsed.output = argv[index + 1];
      index += 1;
    } else if (current === '--limit') {
      parsed.limit = argv[index + 1];
      index += 1;
    } else if (current === '--help' || current === '-h') {
      console.log('Usage: node scripts/fetch_sudoku_hf_bank.mjs [--limit 3000] [--output ./data/sudoku_bank.csv]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${current}`);
    }
  }
  return parsed;
}
