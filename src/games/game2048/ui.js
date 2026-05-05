import { operate, addRandomTile, isGameOver } from './logic.js';

const SIZE_OPTIONS = [4, 5];
const SCORE_MULTIPLIER = { 4: 1.15, 5: 0.68 };

export function initGame2048UI() {
    const grid = document.getElementById('game2048-grid');
    if (!grid) return;

    const formulaInput = document.getElementById('formula-input');
    const currentCellBox = document.getElementById('current-cell');

    let boardSize = 4;
    let board = [];
    let score = 0;
    let gameOver = false;
    let gameStartTime = null;
    let loginPopupShown = false;

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

    // Show login popup when 2048 tab is first visited
    const tab2048 = document.querySelector('.tab[data-sheet="game2048"]');
    if (tab2048) {
        tab2048.addEventListener('click', () => {
            if (loginPopupShown) return;
            loginPopupShown = true;
            setTimeout(() => {
                if (!window.refresheetAuth?.authenticated) {
                    const { showLoginPopup, goToLogin } = window.loginPopupModule || {};
                    if (showLoginPopup) {
                        showLoginPopup({
                            message: '로그인해야 게임 기록이 저장됩니다.\nGoogle 로그인을 하시겠습니까?',
                            onLogin: goToLogin,
                            onSkip: () => {},
                        });
                    }
                }
            }, 300);
        }, { once: false });
    }

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

        appendNote(table, '그리드 크기(4x4 / 5x5)는 선택할 수 있습니다.');
        appendNote(table, '같은 매출을 달성해도 4x4가 더 높은 점수를 받습니다.');

        return table;
    }

    function appendNote(table, text) {
        const note = document.createElement('div');
        note.className = 'fake-table-cell note';
        note.textContent = text;
        table.appendChild(note);
    }

    function initBoard() {
        score = 0;
        gameOver = false;
        gameStartTime = Date.now();
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
        const adjustedScore = getAdjustedScore();
        const sheet = document.getElementById('game2048-sheet');
        if (sheet && sheet.style.display !== 'none' && formulaInput) {
            formulaInput.value = `=SCORE.NORMALIZE(${score},GRID=${boardSize})=${adjustedScore}`;
        }

        const scoreDisplay = document.getElementById('fake-score-display');
        const scoreBar     = document.getElementById('fake-score-bar');
        if (scoreDisplay) scoreDisplay.textContent = adjustedScore.toLocaleString();
        if (scoreBar) {
            const maxRef = 18000;
            scoreBar.style.height = `${Math.min(100, Math.max(5, (adjustedScore / maxRef) * 100))}%`;
        }
    }

    function getAdjustedScore() {
        return Math.max(0, Math.round(score * (SCORE_MULTIPLIER[boardSize] || 1)));
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
                if (window.refresheetAuth?.authenticated) {
                    const elapsed = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : null;
                    fetch('/api/scores', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            game_type: '2048',
                            score: getAdjustedScore(),
                            duration_seconds: elapsed,
                            extra: { board_size: boardSize, raw_score: score },
                        }),
                    }).then(async (res) => {
                        if (res.status === 429) {
                            const d = await res.json().catch(() => ({}));
                            if (formulaInput) formulaInput.value = `=LIMIT.REACHED("이번 시간 3판 완료 · ${d.resets_at_kst || '다음 정시'} 초기화")`;
                            return;
                        }
                        document.dispatchEvent(new CustomEvent('refresheet:score-saved'));
                    }).catch(() => {});
                }
            }
        }
    }
}
