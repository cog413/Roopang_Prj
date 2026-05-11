// Temporary copied Sudoku placeholder for the future NewGame.
// Keep this file separate from src/games/sudoku/sudoku.js; replace this copy later.
// It intentionally reuses Sudoku puzzle data/logic while NewGame is still a placeholder.
//
// sudoku_puzzles table (Cloudflare D1, db_game_info):
//   puzzle_id TEXT PK  — 'sudoku_bulk_NNNNNN'
//   difficulty TEXT    — '1'(easiest) ~ '5'(hardest) | counts: 1→375, 2→243, 3→792, 4→1546, 5→44
//   puzzle    TEXT     — 81-char string, '0' = empty
//   solution  TEXT     — 81-char string, all filled
//   is_active INTEGER  — 1 = selectable
//
// Worker endpoint (not yet deployed): GET /api/games/sudoku/next?difficulty=<1-5>&exclude=<ids>
// Response shape mirrors a sudoku_puzzles row.

const DIFFICULTY_LABEL = { '1': '쉬움', '2': '쉬움+', '3': '보통', '4': '어려움', '5': '최고난도' };

const DIFFICULTY_MULT = { '1': 0.85, '2': 1.0, '3': 1.15, '4': 1.32, '5': 1.55 };
const EXPECTED_SECONDS = { '1': 240, '2': 360, '3': 480, '4': 660, '5': 840 };

// Offline fallback — same shape as a sudoku_puzzles row
const FALLBACK = {
    puzzle_id: 'fallback_offline',
    difficulty: '2',
    puzzle:   '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
    solution: '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
    is_active: 1,
};

// localStorage stub — stores played puzzle IDs for future deduplication
// When Worker is deployed, pass these IDs via ?exclude=... query param
const PLAYED_KEY = 'newgame_sudoku_placeholder_played';
function getPlayedIds() {
    try { return JSON.parse(localStorage.getItem(PLAYED_KEY) || '[]'); } catch { return []; }
}
function recordPlayed(puzzleId) {
    if (!puzzleId || puzzleId === 'fallback_offline') return;
    try {
        const ids = new Set(getPlayedIds());
        ids.add(puzzleId);
        // Keep last 200 to avoid URL length issues when passing to API
        const trimmed = [...ids].slice(-200);
        localStorage.setItem(PLAYED_KEY, JSON.stringify(trimmed));
    } catch { /* storage unavailable */ }
}

function parsePuzzleStr(str) {
    const board = [];
    for (let r = 0; r < 9; r++) {
        board.push(Array.from({ length: 9 }, (_, c) => parseInt(str[r * 9 + c], 10)));
    }
    return board;
}

async function checkNewGameUnlocked() {
    try {
        const res = await fetch('/api/unlockables/check?item_key=new_game', { credentials: 'include' });
        if (!res.ok) return { is_locked: true, lock_reason: '친구추천 2명 달성 시 이용할 수 있습니다' };
        return res.json();
    } catch {
        return { is_locked: true, lock_reason: '친구추천 2명 달성 시 이용할 수 있습니다' };
    }
}

function renderLockedPlaceholder(container, reason) {
    container.innerHTML = '';
    container.classList.add('newgame-locked-grid');
    const notice = document.createElement('div');
    notice.className = 'newgame-locked-notice';
    notice.innerHTML = `<strong>🔒 NewGame</strong><span>${reason || '잠금 해제 조건이 필요합니다'}</span>`;
    container.appendChild(notice);
}

async function fetchPuzzle(difficulty) {
    const exclude = getPlayedIds().slice(-50).join(',');
    const params = new URLSearchParams({ difficulty });
    if (exclude) params.set('exclude', exclude);
    const res = await fetch(`/api/games/sudoku/next?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function initNewGame() {
    const container = document.getElementById('newgame-grid');
    if (!container) return;

    const lock = await checkNewGameUnlocked();
    if (lock?.is_locked) {
        renderLockedPlaceholder(container, lock.lock_reason);
        return;
    }

    const formulaInput = document.getElementById('formula-input');
    const currentCellBox = document.getElementById('current-cell');
    const modal = document.getElementById('validation-modal');

    let selectedCell = null;
    let solutionBoard = null;
    let currentDifficulty = '2';  // default: 쉬움+
    let startTime = null;
    let mistakeCount = 0;
    let currentPuzzleId = null;
    let loginPopupShown = false;

    // Inject difficulty selector at top of left panel
    const leftPanel = document.querySelector('#newgame-sheet .side-left');
    if (leftPanel) leftPanel.prepend(buildDifficultySelector());

    // Inject score bar into right panel
    buildScorePanel();

    // Keyboard (registered once)
    document.addEventListener('keydown', onKeyDown);

    // Mobile numpad — injected once, visible via CSS on small screens
    container.insertAdjacentElement('afterend', buildMobileNumpad());

    // Show login popup when NewGame tab is first visited
    const newGameTab = document.querySelector('.tab[data-sheet="newgame"]');
    if (newGameTab) {
        newGameTab.addEventListener('click', () => {
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

    // Validation modal close: click buttons or press Enter/Escape
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
            labelCell.className = 'fake-table-cell label newgame-diff-btn';
            labelCell.dataset.diff = val;
            labelCell.textContent = label;
            if (val === currentDifficulty) labelCell.classList.add('active');

            const valueCell = document.createElement('div');
            valueCell.className = 'fake-table-cell value';
            valueCell.textContent = `D${val}`;

            labelCell.addEventListener('click', async () => {
                if (val === currentDifficulty) return;
                currentDifficulty = val;
                table.querySelectorAll('.newgame-diff-btn').forEach(b =>
                    b.classList.toggle('active', b.dataset.diff === val)
                );
                await loadPuzzle(val);
            });

            table.appendChild(labelCell);
            table.appendChild(valueCell);
        });

        appendNote(table, '난이도를 선택할 수 있습니다.');
        appendNote(table, '더 높은 난이도의 문제를 풀면 더 높은 점수를 받을 수 있어요.');
        appendNote(table, '더 빠른 시간 안에 정확히 풀면 더 높은 점수를 받을 수 있어요.');

        const ticketCell = document.createElement('div');
        ticketCell.className = 'fake-table-cell note';
        ticketCell.id = 'newgame-ticket-cell';
        table.appendChild(ticketCell);

        return table;
    }

    function appendNote(table, text) {
        const note = document.createElement('div');
        note.className = 'fake-table-cell note';
        note.textContent = text;
        table.appendChild(note);
    }

    function buildScorePanel() {
        const rightPanel = document.querySelector('#newgame-sheet .side-right');
        if (!rightPanel) return;

        // Score row inside the existing fake-table (append after progress row)
        const progressTable = rightPanel.querySelector('.fake-table');
        if (progressTable) {
            const scoreLabel = document.createElement('div');
            scoreLabel.className = 'fake-table-cell label';
            scoreLabel.textContent = '처리 점수 (추진력)';
            const scoreValue = document.createElement('div');
            scoreValue.className = 'fake-table-cell value total';
            scoreValue.id = 'newgame-score-display';
            scoreValue.textContent = '-';
            progressTable.appendChild(scoreLabel);
            progressTable.appendChild(scoreValue);
        }

        // Score chart bar
        const chart = document.createElement('div');
        chart.className = 'fake-chart';
        chart.innerHTML = `
            <div class="chart-title">추진력 달성률</div>
            <div class="chart-bars">
                <div class="bar-container"><div class="bar" style="height:0%"></div><span>난이도</span></div>
                <div class="bar-container"><div class="bar" style="height:0%"></div><span>속도</span></div>
                <div class="bar-container"><div class="bar" style="height:0%"></div><span>정확도</span></div>
                <div class="bar-container"><div class="bar" id="newgame-score-bar" style="height:5%"></div><span>Total</span></div>
            </div>`;
        rightPanel.appendChild(chart);
    }

    async function loadPuzzle(difficulty) {
        container.innerHTML = '';
        selectedCell = null;
        solutionBoard = null;
        mistakeCount = 0;
        startTime = null;

        resetScoreUI();

        let row = FALLBACK;
        try {
            const data = await fetchPuzzle(difficulty);
            if (data && data.puzzle && data.solution && data.puzzle.length === 81) row = data;
        } catch {
            // Worker not deployed — offline fallback
        }

        currentPuzzleId = row.puzzle_id;
        const initialBoard = parsePuzzleStr(row.puzzle);
        solutionBoard = parsePuzzleStr(row.solution);

        if (formulaInput) formulaInput.value = `=NEWGAME.LOAD("${row.puzzle_id}",D=${row.difficulty})`;
        if (currentCellBox) currentCellBox.textContent = 'A1';

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.className = 'excel-cell';
                cell.dataset.row = r;
                cell.dataset.col = c;

                const val = initialBoard[r][c];
                if (val !== 0) {
                    cell.textContent = String(val);
                    cell.classList.add('fixed');
                }

                cell.addEventListener('click', () => {
                    selectCell(cell);
                });

                container.appendChild(cell);
            }
        }

        checkProgress();
        // Start timer on first interaction, not on load
        startTime = null;
    }

    function selectCell(cell) {
        if (selectedCell) selectedCell.classList.remove('selected');
        selectedCell = cell;
        cell.classList.add('selected');

        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        if (currentCellBox) currentCellBox.textContent = getCellRef(r, c);
        if (formulaInput) formulaInput.value = cell.textContent || '';

        // Highlight all cells with the same value
        const val = cell.textContent;
        container.querySelectorAll('.excel-cell').forEach(c => {
            c.classList.toggle('same-number', val !== '' && c.textContent === val && c !== cell);
        });
    }

    function getCellRef(row, col) {
        return String.fromCharCode(65 + col) + (row + 1);
    }

    function onKeyDown(e) {
        // Close validation modal on Enter or Escape
        if (modal && modal.style.display !== 'none') {
            if (e.key === 'Enter' || e.key === 'Escape') {
                modal.style.display = 'none';
            }
            return;
        }

        if (document.body.classList.contains('safe-mode')) return;
        const sheet = document.getElementById('newgame-sheet');
        if (!sheet || sheet.style.display === 'none') return;
        if (!selectedCell) return;

        // Start timer on first keystroke
        if (!startTime) startTime = Date.now();

        if (/^[1-9]$/.test(e.key)) {
            if (!selectedCell.classList.contains('fixed')) {
                const r = parseInt(selectedCell.dataset.row);
                const c = parseInt(selectedCell.dataset.col);
                if (isValidMove(r, c, e.key)) {
                    selectedCell.textContent = e.key;
                    selectedCell.classList.add('user-input');
                    // Re-highlight same numbers after entry
                    selectCell(selectedCell);
                    checkProgress();
                } else {
                    mistakeCount++;
                    if (modal) modal.style.display = 'flex';
                }
            }
        }

        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (!selectedCell.classList.contains('fixed')) {
                selectedCell.textContent = '';
                selectedCell.classList.remove('user-input', 'same-number');
                container.querySelectorAll('.same-number').forEach(c => c.classList.remove('same-number'));
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
            if (next) selectCell(next);
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

        const progressDisplay = document.getElementById('newgame-progress-display');
        if (progressDisplay) progressDisplay.textContent = `${filled} / 81`;

        if (filled === 81 && allCorrect) onWin();
    }

    function onWin() {
        const finalScore = calculateScore();
        recordPlayed(currentPuzzleId);

        if (formulaInput) formulaInput.value = `=WIN.SCORE(${finalScore.toLocaleString()})`;
        updateScoreUI(finalScore);

        if (window.refresheetAuth?.authenticated) {
            const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : null;
            fetch('/api/scores', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game_type: 'new_game',
                    score: finalScore,
                    duration_seconds: elapsed,
                    extra: { difficulty: currentDifficulty, puzzle_id: currentPuzzleId, mistakes: mistakeCount },
                }),
            }).then(async (res) => {
                if (res.status === 429) {
                    const d = await res.json().catch(() => ({}));
                    if (formulaInput) formulaInput.value = `=LIMIT.REACHED("이번 시간 3판 완료 · ${d.resets_at_kst || '다음 정시'} 초기화")`;
                    refreshTicketDisplay();
                    return;
                }
                document.dispatchEvent(new CustomEvent('refresheet:score-saved'));
                refreshTicketDisplay();
            }).catch(() => {});
        }
    }

    function calculateScore() {
        const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        const base = 11000;
        const expected = EXPECTED_SECONDS[currentDifficulty] || 360;
        const timeRatio = Math.max(-0.12, Math.min(0.12, (expected - elapsed) / expected));
        const timeAdjustment = Math.round(base * timeRatio);
        const mistakePenalty = mistakeCount * 80;
        const mult = DIFFICULTY_MULT[currentDifficulty] || 1.0;
        return Math.max(1000, Math.round((base + timeAdjustment - mistakePenalty) * mult));
    }

    function resetScoreUI() {
        const scoreDisplay = document.getElementById('newgame-score-display');
        if (scoreDisplay) scoreDisplay.textContent = '-';
        const scoreBar = document.getElementById('newgame-score-bar');
        if (scoreBar) scoreBar.style.height = '5%';

        // Reset sub bars
        const bars = document.querySelectorAll('#newgame-sheet .fake-chart .bar:not(#newgame-score-bar)');
        bars.forEach(b => { b.style.height = '0%'; });
    }

    function updateScoreUI(finalScore) {
        const MAX_SCORE = 18000;
        const scoreDisplay = document.getElementById('newgame-score-display');
        if (scoreDisplay) scoreDisplay.textContent = finalScore.toLocaleString();

        const scoreBar = document.getElementById('newgame-score-bar');
        if (scoreBar) scoreBar.style.height = `${Math.min(100, Math.max(5, (finalScore / MAX_SCORE) * 100))}%`;

        // Sub bars: difficulty, speed, accuracy
        const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 600;
        const bars = document.querySelectorAll('#newgame-sheet .fake-chart .bar:not(#newgame-score-bar)');
        if (bars[0]) bars[0].style.height = `${(DIFFICULTY_MULT[currentDifficulty] || 1) / 2.0 * 100}%`;
        if (bars[1]) bars[1].style.height = `${Math.max(5, 100 - Math.min(100, elapsed / 6))}%`;
        if (bars[2]) bars[2].style.height = `${Math.max(5, 100 - mistakeCount * 15)}%`;
    }

    async function refreshTicketDisplay() {
        const ticketEl = document.getElementById('newgame-ticket-cell');
        if (!ticketEl || !window.refresheetAuth?.authenticated) {
            if (ticketEl) ticketEl.textContent = '';
            return;
        }
        try {
            const res = await fetch('/api/scores/today', { credentials: 'include' });
            const d = await res.json();
            ticketEl.textContent = `티켓 ${d.hourly_plays_remaining ?? 0} / 3 · 매 정시 갱신`;
        } catch { ticketEl.textContent = ''; }
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

    function buildMobileNumpad() {
        const pad = document.createElement('div');
        pad.className = 'mobile-numpad';

        for (let n = 1; n <= 9; n++) {
            const btn = document.createElement('button');
            btn.className = 'mobile-numpad-btn';
            btn.textContent = String(n);
            btn.type = 'button';
            btn.addEventListener('click', () => {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: String(n), bubbles: true }));
            });
            pad.appendChild(btn);
        }

        const del = document.createElement('button');
        del.className = 'mobile-numpad-btn del-btn';
        del.textContent = '⌫ 지우기';
        del.type = 'button';
        del.addEventListener('click', () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
        });
        pad.appendChild(del);

        return pad;
    }
}

