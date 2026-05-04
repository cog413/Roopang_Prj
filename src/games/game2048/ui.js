import { operate, addRandomTile, isGameOver } from './logic.js';

const SIZE_OPTIONS = [4, 5];

export function initGame2048UI() {
    const grid = document.getElementById('game2048-grid');
    if (!grid) return;

    const formulaInput = document.getElementById('formula-input');
    const currentCellBox = document.getElementById('current-cell');

    let boardSize = 4;
    let board = [];
    let score = 0;
    let gameOver = false;

    // Inject board size selector at top of left panel
    const leftPanel = document.querySelector('#game2048-sheet .side-left');
    if (leftPanel) leftPanel.prepend(buildSizeSelector());

    initBoard();

    document.addEventListener('keydown', onKeyDown);

    const gameOverModal = document.getElementById('game-over-modal');
    document.getElementById('game-over-retry')?.addEventListener('click', () => {
        if (gameOverModal) gameOverModal.style.display = 'none';
        initBoard();
    });
    document.getElementById('game-over-cancel')?.addEventListener('click', () => {
        if (gameOverModal) gameOverModal.style.display = 'none';
    });

    // ── helpers ──────────────────────────────────────────────────────────────

    function buildSizeSelector() {
        const table = document.createElement('div');
        table.className = 'fake-table';

        const header = document.createElement('div');
        header.className = 'fake-table-header';
        header.textContent = '그리드 크기';
        table.appendChild(header);

        SIZE_OPTIONS.forEach(size => {
            const labelCell = document.createElement('div');
            labelCell.className = 'fake-table-cell label g2048-size-btn';
            labelCell.dataset.size = size;
            labelCell.textContent = `${size}×${size}`;
            if (size === boardSize) labelCell.classList.add('active');

            const valueCell = document.createElement('div');
            valueCell.className = 'fake-table-cell value';
            valueCell.textContent = size === 4 ? '기본' : '확장';

            labelCell.addEventListener('click', () => {
                if (size === boardSize) return;
                boardSize = size;
                table.querySelectorAll('.g2048-size-btn').forEach(b =>
                    b.classList.toggle('active', parseInt(b.dataset.size) === size)
                );
                initBoard();
            });

            table.appendChild(labelCell);
            table.appendChild(valueCell);
        });

        return table;
    }

    function initBoard() {
        score = 0;
        gameOver = false;
        board = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
        addRandomTile(board);
        addRandomTile(board);

        // Set grid CSS to match board size
        grid.style.gridTemplateColumns = `repeat(${boardSize}, 80px)`;
        grid.style.gridTemplateRows    = `repeat(${boardSize}, 25px)`;

        renderBoard();
    }

    function getCellRef(row, col) {
        return String.fromCharCode(65 + col) + (row + 1);
    }

    function renderBoard() {
        grid.innerHTML = '';

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                const cell = document.createElement('div');
                cell.className = 'excel-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                const val = board[r][c];
                if (val !== 0) {
                    cell.textContent = val;
                    cell.classList.add(`val-${val}`);
                }

                cell.addEventListener('click', () => {
                    grid.querySelectorAll('.excel-cell').forEach(c => c.classList.remove('selected'));
                    cell.classList.add('selected');
                    if (currentCellBox) currentCellBox.textContent = getCellRef(r, c);
                    if (formulaInput) formulaInput.value = cell.textContent || '';
                });

                grid.appendChild(cell);
            }
        }

        updateScoreUI();
    }

    function updateScoreUI() {
        const sheet = document.getElementById('game2048-sheet');
        if (sheet && sheet.style.display !== 'none' && formulaInput) {
            formulaInput.value = `=SUM(A1:${String.fromCharCode(64 + boardSize)}${boardSize})*${score}`;
        }

        const scoreDisplay = document.getElementById('fake-score-display');
        const scoreBar     = document.getElementById('fake-score-bar');
        if (scoreDisplay) scoreDisplay.textContent = score.toLocaleString();
        if (scoreBar) {
            const maxRef = boardSize === 5 ? 40000 : 20000;
            scoreBar.style.height = `${Math.min(100, Math.max(5, (score / maxRef) * 100))}%`;
        }
    }

    function onKeyDown(e) {
        if (document.body.classList.contains('safe-mode')) return;
        const sheet = document.getElementById('game2048-sheet');
        if (!sheet || sheet.style.display === 'none') return;
        if (gameOver) return;

        const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        if (!arrows.includes(e.key)) return;
        e.preventDefault();

        const prevState = board.map(r => [...r]);
        let moved = false;

        if (e.key === 'ArrowLeft') {
            for (let r = 0; r < boardSize; r++) {
                const newRow = operate(board[r], v => { score += v; });
                if (board[r].toString() !== newRow.toString()) moved = true;
                board[r] = newRow;
            }
        } else if (e.key === 'ArrowRight') {
            for (let r = 0; r < boardSize; r++) {
                const rev = board[r].slice().reverse();
                const newRow = operate(rev, v => { score += v; }).reverse();
                if (board[r].toString() !== newRow.toString()) moved = true;
                board[r] = newRow;
            }
        } else if (e.key === 'ArrowUp') {
            for (let c = 0; c < boardSize; c++) {
                const col = board.map(row => row[c]);
                const newCol = operate(col, v => { score += v; });
                if (col.toString() !== newCol.toString()) moved = true;
                newCol.forEach((v, r) => { board[r][c] = v; });
            }
        } else if (e.key === 'ArrowDown') {
            for (let c = 0; c < boardSize; c++) {
                const col = board.map(row => row[c]).reverse();
                const newCol = operate(col, v => { score += v; }).reverse();
                const origCol = board.map(row => row[c]);
                if (origCol.toString() !== newCol.toString()) moved = true;
                newCol.forEach((v, r) => { board[r][c] = v; });
            }
        }

        if (moved) {
            addRandomTile(board);
            renderBoard();

            if (isGameOver(board)) {
                gameOver = true;
                const modal = document.getElementById('game-over-modal');
                if (modal) modal.style.display = 'flex';
            }
        }
    }
}
