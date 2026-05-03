import { operate, addRandomTile } from './logic.js';

export function initGame2048UI() {
    const grid = document.getElementById('game2048-grid');
    if (!grid) return;

    const formulaInput = document.getElementById('formula-input');
    const currentCellBox = document.getElementById('current-cell');
    
    let board = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];
    let score = 0;

    function getCellRef(row, col) {
        return String.fromCharCode(65 + col) + (row + 1);
    }

    const cells = [];
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const cell = document.createElement('div');
            cell.className = 'excel-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            cell.addEventListener('click', () => {
                document.querySelectorAll('.g2048 .excel-cell').forEach(c => c.classList.remove('selected'));
                cell.classList.add('selected');
                
                if (currentCellBox) currentCellBox.textContent = getCellRef(row, col);
                if (formulaInput) formulaInput.value = cell.textContent || '';
            });

            grid.appendChild(cell);
            cells.push({ row, col, element: cell });
        }
    }

    function updateBoard() {
        cells.forEach(cellObj => {
            const val = board[cellObj.row][cellObj.col];
            const el = cellObj.element;
            
            el.className = 'excel-cell';
            if (el.classList.contains('selected')) el.classList.add('selected');

            if (val !== 0) {
                el.textContent = val;
                el.classList.add(`val-${val}`);
            } else {
                el.textContent = '';
            }
        });

        const sheet = document.getElementById('game2048-sheet');
        if (sheet && sheet.style.display !== 'none' && formulaInput) {
            formulaInput.value = `=SUM(A1:D4)*${score}`;
        }

        const fakeScoreDisplay = document.getElementById('fake-score-display');
        const fakeScoreBar = document.getElementById('fake-score-bar');
        if (fakeScoreDisplay) {
            fakeScoreDisplay.textContent = score.toLocaleString();
        }
        if (fakeScoreBar) {
            let maxTile = Math.max(...board.flat());
            let percent = Math.min(100, Math.max(5, (maxTile / 2048) * 100));
            fakeScoreBar.style.height = `${percent}%`;
        }
    }

    function onScore(addedScore) {
        score += addedScore;
    }

    document.addEventListener('keydown', (e) => {
        if (document.body.classList.contains('safe-mode')) return;
        const sheet = document.getElementById('game2048-sheet');
        if (!sheet || sheet.style.display === 'none') return;
        
        let moved = false;

        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
        }

        if (e.key === 'ArrowLeft') {
            for (let r = 0; r < 4; r++) {
                let row = board[r];
                let newRow = operate(row, onScore);
                if (row.toString() !== newRow.toString()) moved = true;
                board[r] = newRow;
            }
        } else if (e.key === 'ArrowRight') {
            for (let r = 0; r < 4; r++) {
                let row = board[r].slice().reverse();
                let newRow = operate(row, onScore);
                newRow.reverse();
                if (board[r].toString() !== newRow.toString()) moved = true;
                board[r] = newRow;
            }
        } else if (e.key === 'ArrowUp') {
            for (let c = 0; c < 4; c++) {
                let col = [board[0][c], board[1][c], board[2][c], board[3][c]];
                let newCol = operate(col, onScore);
                if (col.toString() !== newCol.toString()) moved = true;
                for (let r = 0; r < 4; r++) board[r][c] = newCol[r];
            }
        } else if (e.key === 'ArrowDown') {
            for (let c = 0; c < 4; c++) {
                let col = [board[0][c], board[1][c], board[2][c], board[3][c]].reverse();
                let newCol = operate(col, onScore);
                newCol.reverse();
                let oldCol = [board[0][c], board[1][c], board[2][c], board[3][c]];
                if (oldCol.toString() !== newCol.toString()) moved = true;
                for (let r = 0; r < 4; r++) board[r][c] = newCol[r];
            }
        }

        if (moved) {
            addRandomTile(board);
            updateBoard();
        }
    });

    addRandomTile(board);
    addRandomTile(board);
    updateBoard();
}
