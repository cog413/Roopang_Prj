export function initExcelLayout() {
    // 1. Generate Column Headers (A to Z, AA, AB...)
    const colHeaders = document.getElementById('col-headers');
    if (colHeaders) {
        for (let i = 0; i < 50; i++) {
            const header = document.createElement('div');
            header.className = 'col-header';
            let name = '';
            let temp = i;
            while (temp >= 0) {
                name = String.fromCharCode(65 + (temp % 26)) + name;
                temp = Math.floor(temp / 26) - 1;
            }
            header.textContent = name;
            colHeaders.appendChild(header);
        }
    }

    // 2. Generate Row Headers (1 to 100)
    const rowHeaders = document.getElementById('row-headers');
    if (rowHeaders) {
        for (let i = 1; i <= 100; i++) {
            const header = document.createElement('div');
            header.className = 'row-header';
            header.textContent = i;
            rowHeaders.appendChild(header);
        }
    }

    // 3. View tab toggles dark mode.
    const fileMenuTab = document.getElementById('file-menu-tab');
    const homeMenuTab = document.getElementById('home-menu-tab');
    const reviewMenuTab = document.getElementById('review-menu-tab');
    const viewMenuTab = document.getElementById('view-menu-tab');
    if (viewMenuTab) {
        viewMenuTab.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            viewMenuTab.classList.toggle('active', document.body.classList.contains('dark-mode'));
        });
    }

    // 4. Tab Switching logic
    const tabs = document.querySelectorAll('.tab:not(.add-tab)');
    const sheetViews = document.querySelectorAll('.sheet-view');
    refreshUnlockableTabs();
    document.addEventListener('refresheet:auth', refreshUnlockableTabs);
    
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            if (tab.dataset.unlockableKey && tab.dataset.locked === 'true') {
                showSheetLockToast(tab.dataset.lockReason || '잠금 해제 조건이 필요합니다');
                return;
            }
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            reviewMenuTab?.classList.remove('active');
            fileMenuTab?.classList.remove('active');
            showAppWorkspace();
            homeMenuTab?.classList.add('active');
            
            const targetSheet = tab.dataset.sheet;
            sheetViews.forEach(sheet => {
                if (sheet.id === `${targetSheet}-sheet`) {
                    sheet.style.display = 'block';
                    sheet.classList.add('active');
                } else {
                    sheet.style.display = 'none';
                    sheet.classList.remove('active');
                }
            });
            updateFormulaBarForSheet(targetSheet);
        });
    });

    if (homeMenuTab) {
        homeMenuTab.addEventListener('click', () => {
            document.querySelectorAll('.menu-tabs .menu-tab').forEach(t => {
                if (t !== viewMenuTab) t.classList.remove('active');
            });
            showAppWorkspace();
            homeMenuTab.classList.add('active');
            const activeTab = document.querySelector('.tab.active:not(.add-tab)');
            const targetSheet = activeTab?.dataset.sheet || 'readme';
            sheetViews.forEach(sheet => {
                const isTarget = sheet.id === `${targetSheet}-sheet`;
                sheet.style.display = isTarget ? 'block' : 'none';
                sheet.classList.toggle('active', isTarget);
            });
            updateFormulaBarForSheet(targetSheet);
            window.dispatchEvent(new Event('resize'));
        });
    }

    if (fileMenuTab) {
        fileMenuTab.addEventListener('click', () => {
            document.querySelectorAll('.menu-tabs .menu-tab').forEach((tab) => {
                if (tab !== viewMenuTab) tab.classList.remove('active');
            });
            fileMenuTab.classList.add('active');
            sheetViews.forEach(sheet => {
                const isFile = sheet.id === 'file-sheet';
                sheet.style.display = isFile ? 'flex' : 'none';
                sheet.classList.toggle('active', isFile);
            });
            updateFormulaBarForSheet('file');
        });
    }

    if (reviewMenuTab) {
        reviewMenuTab.addEventListener('click', () => {
            document.querySelectorAll('.menu-tabs .menu-tab').forEach((tab) => {
                if (tab !== viewMenuTab) tab.classList.remove('active');
            });
            showAppWorkspace();
            reviewMenuTab.classList.add('active');
            sheetViews.forEach(sheet => {
                const isReview = sheet.id === 'review-sheet';
                sheet.style.display = isReview ? 'block' : 'none';
                sheet.classList.toggle('active', isReview);
            });
            document.dispatchEvent(new CustomEvent('refresheet:review-open'));
            updateFormulaBarForSheet('review');
        });
    }

    function updateFormulaBarForSheet(sheetId) {
        const formulaInput = document.getElementById('formula-input');
        const currentCell = document.getElementById('current-cell');
        if (!formulaInput || !currentCell) return;

        if (sheetId === 'readme') {
            formulaInput.value = '=DECLARATION("RIGHT_TO_REST")';
            currentCell.textContent = 'A1';
        } else if (sheetId === 'sudoku') {
            formulaInput.value = '=SUDOKU.INIT(A1:I9)';
            currentCell.textContent = 'A1';
        } else if (sheetId === 'newgame') {
            formulaInput.value = '=NEWGAME.LOCKED("친구추천 2명")';
            currentCell.textContent = 'A1';
        } else if (sheetId === 'game2048') {
            formulaInput.value = '=SUM(A1:D4)*2048';
            currentCell.textContent = 'A1';
        } else if (sheetId === 'mini-pet') {
            formulaInput.value = '=MANAGE.PET.STATUS(B2:F22)';
            currentCell.textContent = 'B2';
        } else if (sheetId === 'review') {
            formulaInput.value = '=REVIEW.COMMENTS(A1:A100)';
            currentCell.textContent = 'R1';
        } else if (sheetId === 'file') {
            formulaInput.value = '=GUIDE.INDEX("서비스_안내")';
            currentCell.textContent = 'A1';
        }
    }

    function showAppWorkspace() {
        // all chrome elements remain visible at all times — no-op
    }

    // Initialize formula bar for first sheet
    updateFormulaBarForSheet('readme');

    async function refreshUnlockableTabs() {
        try {
            const res = await fetch('/api/unlockables?item_type=sheet', { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();
            const items = new Map((data.items || []).map(item => [item.item_key, item]));
            document.querySelectorAll('.tab[data-unlockable-key]').forEach(tab => {
                const item = items.get(tab.dataset.unlockableKey);
                const locked = Boolean(item?.is_locked);
                const reason = item?.lock_reason || tab.title || '';
                tab.dataset.locked = locked ? 'true' : 'false';
                tab.dataset.lockReason = reason;
                tab.classList.toggle('tab-locked', locked);
                tab.title = locked ? reason : '';
                const icon = tab.querySelector('.tab-lock-icon');
                if (icon) icon.style.display = locked ? 'inline' : 'none';
            });
        } catch {
            /* Keep default locked markup when offline. */
        }
    }

    function showSheetLockToast(message) {
        let toast = document.getElementById('sheet-lock-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'sheet-lock-toast';
            toast.className = 'sheet-lock-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('visible');
        clearTimeout(showSheetLockToast.timer);
        showSheetLockToast.timer = setTimeout(() => {
            toast.classList.remove('visible');
        }, 2200);
    }
}
