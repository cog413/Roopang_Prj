// sudoku_puzzles table columns:
//   puzzle_id TEXT PK  — e.g. 'sudoku_bulk_000001'
//   difficulty TEXT    — '1'(easiest) ~ '5'(hardest)
//   puzzle    TEXT     — 81-char string, '0' = empty cell
//   solution  TEXT     — 81-char string, complete answer
//   is_active INTEGER  — 1 = selectable
//
// API (Cloudflare Worker, not yet deployed):
//   GET /api/games/sudoku/next?difficulty=<1-5>
//   → returns one sudoku_puzzles row as JSON

const DIFFICULTY_LABEL = {
    '1': '쉬움',
    '2': '쉬움+',
    '3': '보통',
    '4': '어려움',
    '5': '최고난도',
};

// Offline fallback — identical shape to a sudoku_puzzles DB row
const FALLBACK = {
    puzzle_id: 'fallback_offline',
    difficulty: '3',
    puzzle:   '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
    solution: '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
    is_active: 1,
};

function parsePuzzleStr(str) {
    const board = [];
    for (let r = 0; r < 9; r++) {
        board.push(Array.from({ length: 9 }, (_, c) => parseInt(str[r * 9 + c], 10)));
    }
    return board;
}

// Calls Worker: GET /api/games/sudoku/next?difficulty=<1-5>
// Response is a sudoku_puzzles row: { puzzle_id, difficulty, puzzle, solution, is_active }
async function fetchPuzzle(difficulty) {
    const res = await fetch(`/api/games/sudoku/next?difficulty=${difficulty}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function initSudoku() {
    const container = document.getElementById('sudoku-grid');
    if (!container) return;

    const formulaInput = document.getElementById('formula-input');
    const currentCellBox = document.getElementById('current-cell');

    let selectedCell = null;
    let solutionBoard = null;
    let currentDifficulty = '3';

    // Inject difficulty selector into the left fake-dashboard
    const leftPanel = document.querySelector('#sudoku-sheet .side-left');
    if (leftPanel) leftPanel.appendChild(buildDifficultySelector());

    // Keyboard handler registered once for the lifetime of the sheet
    document.addEventListener('keydown', onKeyDown);

    // Modal close buttons
    const modal = document.getElementById('validation-modal');
    document.querySelectorAll('.modal-close, .modal-btn.cancel, .modal-btn.retry').forEach(btn => {
        btn.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
    });

    await loadPuzzle(currentDifficulty);

    // ── helpers ─────────────────────────────────────────────────────────────

    function buildDifficultySelector() {
        const table = document.createElement('div');
        table.className = 'fake-table';

        const header = document.createElement('div');
        header.className = 'fake-table-header';
        header.textContent = '난이도 선택';
        table.appendChild(header);

        Object.entries(DIFFICULTY_LABEL).forEach(([val, label]) => {
            const labelCell = document.createElement('div');
            labelCell.className = 'fake-table-cell label sudoku-diff-btn';
            labelCell.dataset.diff = val;
            labelCell.textContent = label;
            if (val === currentDifficulty) labelCell.classList.add('active');

            const valueCell = document.createElement('div');
            valueCell.className = 'fake-table-cell value';
            valueCell.textContent = `D${val}`;

            labelCell.addEventListener('click', async () => {
                if (val === currentDifficulty) return;
                currentDifficulty = val;
                table.querySelectorAll('.sudoku-diff-btn').forEach(b =>
                    b.classList.toggle('active', b.dataset.diff === val)
                );
                await loadPuzzle(val);
            });

            table.appendChild(labelCell);
            table.appendChild(valueCell);
        });

        return table;
    }

    async function loadPuzzle(difficulty) {
        container.innerHTML = '';
        selectedCell = null;
        solutionBoard = null;

        // Try DB via Worker; fall back to offline puzzle on any error
        let row = FALLBACK;
        try {
            const data = await fetchPuzzle(difficulty);
            if (data && data.puzzle && data.solution && data.puzzle.length === 81) {
                row = data;
            }
        } catch {
            // Worker not deployed yet — offline fallback in use
        }

        const initialBoard = parsePuzzleStr(row.puzzle);
        solutionBoard = parsePuzzleStr(row.solution);

        if (formulaInput) {
            formulaInput.value = `=SUDOKU.LOAD("${row.puzzle_id}",D=${row.difficulty})`;
        }
        if (currentCellBox) currentCellBox.textContent = 'A1';

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.className = 'excel-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                const val = initialBoard[r][c];
                if (val !== 0) {
                    cell.textContent = val;
                    cell.classList.add('fixed');
                }

                cell.addEventListener('click', () => {
                    if (selectedCell) selectedCell.classList.remove('selected');
                    selectedCell = cell;
                    cell.classList.add('selected');
                    if (currentCellBox) currentCellBox.textContent = getCellRef(r, c);
                    if (formulaInput) formulaInput.value = cell.textContent || '';
                });

                container.appendChild(cell);
            }
        }

        checkProgress();
    }

    function getCellRef(row, col) {
        return String.fromCharCode(65 + col) + (row + 1);
    }

    function onKeyDown(e) {
        if (document.body.classList.contains('safe-mode')) return;
        const sheet = document.getElementById('sudoku-sheet');
        if (!sheet || sheet.style.display === 'none') return;
        if (!selectedCell) return;

        if (/^[1-9]$/.test(e.key)) {
            if (!selectedCell.classList.contains('fixed')) {
                const r = parseInt(selectedCell.dataset.row);
                const c = parseInt(selectedCell.dataset.col);
                if (isValidMove(r, c, e.key)) {
                    selectedCell.textContent = e.key;
                    selectedCell.classList.add('user-input');
                    if (formulaInput) formulaInput.value = e.key;
                    checkProgress();
                } else {
                    if (modal) modal.style.display = 'flex';
                }
            }
        }

        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (!selectedCell.classList.contains('fixed')) {
                selectedCell.textContent = '';
                selectedCell.classList.remove('user-input');
                if (formulaInput) formulaInput.value = '';
            }
        }

        let r = parseInt(selectedCell.dataset.row);
        let c = parseInt(selectedCell.dataset.col);
        if (e.key === 'ArrowUp'    && r > 0) r--;
        if (e.key === 'ArrowDown'  && r < 8) r++;
        if (e.key === 'ArrowLeft'  && c > 0) c--;
        if (e.key === 'ArrowRight' && c < 8) c++;
        if (r !== parseInt(selectedCell.dataset.row) || c !== parseInt(selectedCell.dataset.col)) {
            const next = container.querySelector(`.excel-cell[data-row="${r}"][data-col="${c}"]`);
            if (next) next.click();
        }
    }

    function checkProgress() {
        const cells = container.querySelectorAll('.excel-cell');
        let filled = 0;
        let allCorrect = true;

        cells.forEach(cell => {
            const val = cell.textContent;
            if (val !== '') filled++;
            if (solutionBoard) {
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);
                if (val !== String(solutionBoard[r][c])) allCorrect = false;
            }
        });

        const display = document.getElementById('sudoku-progress-display');
        if (display) display.textContent = `${filled} / 81`;

        if (filled === 81 && allCorrect && formulaInput) {
            formulaInput.value = '=WIN("축하합니다! 스도쿠를 완료했습니다.")';
        }
    }

    function isValidMove(row, col, value) {
        for (const cell of container.querySelectorAll('.excel-cell')) {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            if (r === row && c === col) continue;
            const val = cell.textContent;
            if (val !== value) continue;
            if (r === row || c === col) return false;
            if (Math.floor(r / 3) === Math.floor(row / 3) &&
                Math.floor(c / 3) === Math.floor(col / 3)) return false;
        }
        return true;
    }
}
