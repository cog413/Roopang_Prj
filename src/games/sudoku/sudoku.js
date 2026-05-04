// Fallback puzzle used when the API is unavailable (Worker not yet deployed)
const FALLBACK_BOARD = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9]
];

function parsePuzzleStr(str) {
    const board = [];
    for (let r = 0; r < 9; r++) {
        board.push(Array.from({ length: 9 }, (_, c) => parseInt(str[r * 9 + c], 10)));
    }
    return board;
}

async function fetchNextPuzzle() {
    const res = await fetch('/api/games/sudoku/next?difficulty=normal');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function initSudoku() {
    const grid = document.getElementById('sudoku-grid');
    if (!grid) return;

    const formulaInput = document.getElementById('formula-input');
    const currentCellBox = document.getElementById('current-cell');

    let initialBoard = FALLBACK_BOARD;
    let solutionBoard = null;

    try {
        const data = await fetchNextPuzzle();
        if (data.puzzle && data.solution) {
            initialBoard = parsePuzzleStr(data.puzzle);
            solutionBoard = parsePuzzleStr(data.solution);
        }
    } catch {
        // Worker not deployed yet — using offline fallback puzzle
    }

    let selectedCell = null;

    function getCellRef(row, col) {
        return String.fromCharCode(65 + col) + (row + 1);
    }

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'excel-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            const val = initialBoard[row][col];
            if (val !== 0) {
                cell.textContent = val;
                cell.classList.add('fixed');
            }

            cell.addEventListener('click', () => {
                if (selectedCell) selectedCell.classList.remove('selected');
                selectedCell = cell;
                cell.classList.add('selected');
                if (currentCellBox) currentCellBox.textContent = getCellRef(row, col);
                if (formulaInput) formulaInput.value = cell.textContent || '';
            });

            grid.appendChild(cell);
        }
    }

    document.addEventListener('keydown', (e) => {
        if (document.body.classList.contains('safe-mode')) return;
        const sheet = document.getElementById('sudoku-sheet');
        if (!sheet || sheet.style.display === 'none') return;
        if (!selectedCell) return;

        if (/^[1-9]$/.test(e.key)) {
            if (!selectedCell.classList.contains('fixed')) {
                const r = parseInt(selectedCell.dataset.row);
                const c = parseInt(selectedCell.dataset.col);
                if (isValidSudokuMove(r, c, e.key)) {
                    selectedCell.textContent = e.key;
                    selectedCell.classList.add('user-input');
                    if (formulaInput) formulaInput.value = e.key;
                    checkWin();
                } else {
                    const modal = document.getElementById('validation-modal');
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
        if (e.key === 'ArrowUp' && r > 0) r--;
        if (e.key === 'ArrowDown' && r < 8) r++;
        if (e.key === 'ArrowLeft' && c > 0) c--;
        if (e.key === 'ArrowRight' && c < 8) c++;
        if (r !== parseInt(selectedCell.dataset.row) || c !== parseInt(selectedCell.dataset.col)) {
            const nextCell = document.querySelector(`.sudoku .excel-cell[data-row="${r}"][data-col="${c}"]`);
            if (nextCell) nextCell.click();
        }
    });

    function checkWin() {
        const cells = document.querySelectorAll('.sudoku .excel-cell');
        let filledCount = 0;
        let allCorrect = true;

        cells.forEach(cell => {
            const val = cell.textContent;
            if (val !== '') filledCount++;
            if (solutionBoard) {
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);
                if (val !== String(solutionBoard[r][c])) allCorrect = false;
            }
        });

        const progressDisplay = document.getElementById('sudoku-progress-display');
        if (progressDisplay) progressDisplay.textContent = `${filledCount} / 81`;

        const won = filledCount === 81 && (solutionBoard ? allCorrect : true);
        if (won && formulaInput) {
            formulaInput.value = '=WIN("축하합니다! 스도쿠를 완료했습니다.")';
        }
    }

    function isValidSudokuMove(row, col, value) {
        const cells = document.querySelectorAll('.sudoku .excel-cell');
        for (const cell of cells) {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            if (r === row && c === col) continue;
            const val = cell.textContent;
            if (val === '') continue;
            if (val === value) {
                if (r === row || c === col) return false;
                if (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3)) return false;
            }
        }
        return true;
    }

    checkWin();

    const modal = document.getElementById('validation-modal');
    const closeBtns = document.querySelectorAll('.modal-close, .modal-btn.cancel, .modal-btn.retry');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });
    });
}
