# Sudoku Bulk Seed

Use `scripts/fetch_sudoku_hf_bank.mjs` and `scripts/generate_sudoku_bank.mjs` to fetch an open dataset sample and convert it into D1 seed SQL.

The generator reads every valid puzzle in the source file. It does not cap records per difficulty level.

Current source dataset:

```text
https://huggingface.co/datasets/Ritvik19/Sudoku-Dataset
```

The Hugging Face dataset card declares Apache-2.0 and provides 81-character `puzzle` and `solution` fields.

## Input

Supported input formats:

- CSV/TSV with headers containing puzzle + solution and optional difficulty/level.
- JSON array of objects containing puzzle + solution and optional difficulty/level.
- JSONL/NDJSON, one object per line.
- Plain text lines containing puzzle and solution as two 81-character digit strings.

Accepted puzzle columns:

- `puzzle`
- `quiz`
- `question`
- `givens`
- `board`

Accepted solution columns:

- `solution`
- `answer`
- `solved`

Accepted difficulty columns:

- `level`
- `difficulty`
- `rating`
- `rank`

## Output

Default output:

```text
sudoku_bulk_seed.sql
```

Generated IDs use this format:

```text
sudoku_bulk_000001
sudoku_bulk_000002
...
```

The source difficulty is mapped to level `1` through `5`. The current deployed `sudoku_puzzles` table has `difficulty TEXT`, not a separate `level` column, so the script writes the mapped level into `difficulty`.

Current seed columns:

```text
puzzle_id, difficulty, puzzle, solution, is_active
```

The source CSV keeps additional audit fields such as `source_url`, `clue_count`, and source row index, but those are not inserted unless the D1 table is migrated to include matching columns.

Each generated row uses:

```sql
INSERT OR IGNORE INTO sudoku_puzzles (...)
```

## Generate SQL

Fetch the source CSV:

```bash
npm run fetch:sudoku
```

Generate the SQL:

```bash
npm run seed:sudoku
```

Equivalent direct command:

```bash
node scripts/fetch_sudoku_hf_bank.mjs --limit 3000 --output ./data/sudoku_bank.csv
node scripts/generate_sudoku_bank.mjs --input ./data/sudoku_bank.csv --output ./sudoku_bulk_seed.sql
```

## Execute On Cloudflare D1

```bash
npx wrangler d1 execute DB --remote --file=./sudoku_bulk_seed.sql
```

Replace `DB` with the configured D1 binding/database name if needed.

In non-interactive environments, Wrangler requires `CLOUDFLARE_API_TOKEN`:

```bash
$env:CLOUDFLARE_API_TOKEN="..."
npx wrangler d1 execute DB --remote --file=./sudoku_bulk_seed.sql
```
