import { operate, addRandomTile, isGameOver } from './logic.js';

const SCORE_MULTIPLIER = 1.15;

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
    let roundFinalized = false;
    let submitInProgress = false;

    // Inject description panel (desktop) and mobile action bar
    const leftPanel = document.querySelector('#game2048-sheet .side-left');
    if (leftPanel) leftPanel.prepend(buildDescPanel());
    const mainCol = document.querySelector('#game2048-sheet .game-main-column');
    if (mainCol) mainCol.prepend(buildMobileBar());

    initBoard();

    document.addEventListener('keydown', onKeyDown);

    // Touch swipe — covers entire sheet area, prevents iOS back-swipe on horizontal
    let _tx = 0, _ty = 0, _moved = false;
    const swipeTarget = document.getElementById('game2048-sheet') || grid;
    swipeTarget.addEventListener('touchstart', e => {
        _tx = e.changedTouches[0].clientX;
        _ty = e.changedTouches[0].clientY;
        _moved = false;
    }, { passive: true });
    swipeTarget.addEventListener('touchmove', e => {
        const dx = e.changedTouches[0].clientX - _tx;
        const dy = e.changedTouches[0].clientY - _ty;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
            e.preventDefault(); // prevents scroll AND iOS swipe-back navigation
            _moved = true;
        }
    }, { passive: false });
    swipeTarget.addEventListener('touchend', e => {
        if (gameOver || !_moved) return;
        const sheet = document.getElementById('game2048-sheet');
        if (!sheet || sheet.style.display === 'none') return;
        const dx = e.changedTouches[0].clientX - _tx;
        const dy = e.changedTouches[0].clientY - _ty;
        if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
        const key = Math.abs(dx) > Math.abs(dy)
            ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
            : (dy > 0 ? 'ArrowDown'  : 'ArrowUp');
        document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }, { passive: true });

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
            refreshTicketDisplay();
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

    function buildDescPanel() {
        const table = document.createElement('div');
        table.className = 'fake-table';

        const header = document.createElement('div');
        header.className = 'fake-table-header';
        header.textContent = '게임 안내';
        table.appendChild(header);

        [
            '같은 숫자를 합쳐 2048 이상 고득점을 노리는 게임입니다.',
            '상하좌우로 타일을 움직여 숫자를 합치며 진행합니다.',
            '더 이상 움직일 수 없으면 게임이 종료됩니다.',
            '언제든 작업종료를 눌러 현재 점수로 마무리할 수 있습니다.',
        ].forEach(text => {
            const note = document.createElement('div');
            note.className = 'fake-table-cell note';
            note.textContent = text;
            table.appendChild(note);
        });

        const footer = document.createElement('div');
        footer.className = 'fake-table-cell note game-desc-footer';

        const ticketSpan = document.createElement('span');
        ticketSpan.className = 'g2048-ticket-cell';
        footer.appendChild(ticketSpan);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'game-finish-btn';
        btn.textContent = '작업 종료';
        btn.addEventListener('click', confirmFinishRound);
        footer.appendChild(btn);

        table.appendChild(footer);
        return table;
    }

    function buildMobileBar() {
        const bar = document.createElement('div');
        bar.className = 'game-mobile-bar';

        const ticketSpan = document.createElement('span');
        ticketSpan.className = 'g2048-ticket-cell';
        bar.appendChild(ticketSpan);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'game-finish-btn';
        btn.textContent = '작업 종료';
        btn.addEventListener('click', confirmFinishRound);
        bar.appendChild(btn);

        return bar;
    }

    function setFinishButtons(disabled, text) {
        document.querySelectorAll('#game2048-sheet .game-finish-btn').forEach(b => {
            b.disabled = disabled;
            b.textContent = text;
        });
    }

    function initBoard() {
        score = 0;
        gameOver = false;
        roundFinalized = false;
        submitInProgress = false;
        gameStartTime = Date.now();
        setFinishButtons(false, '작업 종료');
        board = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
        addRandomTile(board);
        addRandomTile(board);

        const isMobile = window.innerWidth <= 768;
        const cellSize = isMobile
            ? Math.min(80, Math.floor((window.innerWidth - 16) / boardSize))
            : 80;
        const cellH = isMobile ? cellSize : 25;

        grid.style.gridTemplateColumns = `repeat(${boardSize}, ${cellSize}px)`;
        grid.style.gridTemplateRows    = `repeat(${boardSize}, ${cellH}px)`;

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
            formulaInput.value = `=SCORE.NORMALIZE(${score})=${adjustedScore}`;
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
        return Math.max(0, Math.round(score * SCORE_MULTIPLIER));
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
                finalizeRound('game_over');
            }
        }
    }

    async function confirmFinishRound() {
        if (gameOver || roundFinalized || submitInProgress) return;
        const confirmed = await showFinishConfirm();
        if (!confirmed) return;
        gameOver = true;
        finalizeRound('manual_finish');
    }

    function showFinishConfirm() {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay game-finish-modal';
            overlay.innerHTML = `
                <div class="excel-modal">
                    <div class="modal-header">
                        <span>Microsoft Excel</span>
                        <span class="modal-close" data-action="cancel">✕</span>
                    </div>
                    <div class="modal-content">
                        <div class="modal-icon">⚠️</div>
                        <div class="modal-text">현재까지의 점수가 실적으로 반영됩니다.<br>정말 작업을 종료하시겠습니까?</div>
                    </div>
                    <div class="modal-buttons">
                        <button class="modal-btn retry" data-action="finish">실적 반영 후 종료</button>
                        <button class="modal-btn cancel" data-action="cancel">계속 진행</button>
                    </div>
                </div>`;
            const close = (value) => {
                overlay.remove();
                resolve(value);
            };
            overlay.addEventListener('click', (event) => {
                const action = event.target?.dataset?.action;
                if (action === 'finish') close(true);
                if (action === 'cancel') close(false);
            });
            document.body.appendChild(overlay);
        });
    }

    async function finalizeRound(finishType) {
        if (roundFinalized || submitInProgress) return;
        roundFinalized = true;
        submitInProgress = true;
        setFinishButtons(true, '종료됨');

        const finalScore = getAdjustedScore();
        if (formulaInput) formulaInput.value = `=FINISH.SCORE(${finalScore.toLocaleString()})`;

        if (!window.refresheetAuth?.authenticated) {
            submitInProgress = false;
            return;
        }

        const elapsed = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : null;
        try {
            const res = await fetch('/api/scores', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game_type: '2048',
                    score: finalScore,
                    duration_seconds: elapsed,
                    extra: { board_size: boardSize, raw_score: score, finish_type: finishType },
                }),
            });
            if (res.status === 403) {
                const d = await res.json().catch(() => ({}));
                if (d.error === 'employee_name_required') {
                    const { showAlertPopup, showUserSettings } = window.loginPopupModule || {};
                    if (showAlertPopup) {
                        showAlertPopup('사원명을 설정해야 실적 및 순위가 반영됩니다.', () => {
                            if (showUserSettings) showUserSettings();
                        });
                    }
                }
                refreshTicketDisplay();
                return;
            }
            if (res.status === 429) {
                const d = await res.json().catch(() => ({}));
                if (formulaInput) formulaInput.value = `=LIMIT.REACHED("이번 시간 3판 완료 · ${d.resets_at_kst || '다음 정시'} 초기화")`;
                refreshTicketDisplay();
                return;
            }
            if (res.ok) document.dispatchEvent(new CustomEvent('refresheet:score-saved'));
            refreshTicketDisplay();
        } finally {
            submitInProgress = false;
        }
    }

    async function refreshTicketDisplay() {
        const els = document.querySelectorAll('.g2048-ticket-cell');
        if (!window.refresheetAuth?.authenticated) {
            els.forEach(el => { el.textContent = ''; });
            return;
        }
        try {
            const res = await fetch('/api/scores/today?game_type=2048', { credentials: 'include' });
            const d = await res.json();
            const text = `티켓 ${d.hourly_plays_remaining ?? 0} / 3 · 매 정시 갱신`;
            els.forEach(el => { el.textContent = text; });
        } catch { els.forEach(el => { el.textContent = ''; }); }
    }
}
