export function initSudoku() {
    const grid = document.getElementById('sudoku-grid');
    if (!grid) return;

    const formulaInput = document.getElementById('formula-input');
    const currentCellBox = document.getElementById('current-cell');
    
    // Simple hardcoded Sudoku puzzle for V1 (0 is empty)
    const initialBoard = [
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

    let selectedCell = null;

    // Helper to convert row/col to Excel ref (e.g., 0,0 -> A1)
    function getCellRef(row, col) {
        return String.fromCharCode(65 + col) + (row + 1);
    }

    // Render Board
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

            // Click to select
            cell.addEventListener('click', () => {
                if (selectedCell) selectedCell.classList.remove('selected');
                selectedCell = cell;
                cell.classList.add('selected');
                
                // Update formula bar
                if (currentCellBox) currentCellBox.textContent = getCellRef(row, col);
                if (formulaInput) formulaInput.value = cell.textContent || '';
            });

            grid.appendChild(cell);
        }
    }

    // Handle Keyboard Input
    document.addEventListener('keydown', (e) => {
        // Only process if Sudoku is active and a cell is selected, and we are not in safe mode
        if (document.body.classList.contains('safe-mode')) return;
        const sheet = document.getElementById('sudoku-sheet');
        if (!sheet || sheet.style.display === 'none') return;
        if (!selectedCell) return;

        // Number input (1-9)
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
                    // Show validation error modal
                    const modal = document.getElementById('validation-modal');
                    if (modal) modal.style.display = 'flex';
                }
            }
        }
        
        // Delete/Backspace
        if (e.key === 'Backspace' || e.key === 'Delete') {
             if (!selectedCell.classList.contains('fixed')) {
                selectedCell.textContent = '';
                selectedCell.classList.remove('user-input');
                if (formulaInput) formulaInput.value = '';
            }
        }

        // Arrow keys navigation
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
        cells.forEach(c => {
            if (c.textContent !== '') filledCount++;
        });

        // Update fake dashboard
        const progressDisplay = document.getElementById('sudoku-progress-display');
        if (progressDisplay) {
            progressDisplay.textContent = `${filledCount} / 81`;
        }

        if (filledCount === 81) {
            if (formulaInput) formulaInput.value = '=WIN("축하합니다! 스도쿠를 완료했습니다.")';
        }
    }
    
    function isValidSudokuMove(row, col, value) {
        const cells = document.querySelectorAll('.sudoku .excel-cell');
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            const val = cell.textContent;

            if (r === row && c === col) continue;
            if (val === '') continue;

            if (val === value) {
                if (r === row) return false;
                if (c === col) return false;
                if (Math.floor(r / 3) === Math.floor(row / 3) && Math.floor(c / 3) === Math.floor(col / 3)) {
                    return false;
                }
            }
        }
        return true;
    }

    // Initial progress update
    checkWin();

    // Modal controls
    const modal = document.getElementById('validation-modal');
    const closeBtns = document.querySelectorAll('.modal-close, .modal-btn.cancel, .modal-btn.retry');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });
    });
}
