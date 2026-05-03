document.addEventListener('DOMContentLoaded', () => {
    // 0. Loading Screen Logic
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        const excelApp = document.getElementById('excel-app');
        if (loadingScreen && excelApp) {
            loadingScreen.style.display = 'none';
            excelApp.style.display = 'flex';
        }
    }, 2500);

    // 1. Generate Column Headers (A to Z, AA, AB...)
    const colHeaders = document.getElementById('col-headers');
    for (let i = 0; i < 50; i++) {
        const div = document.createElement('div');
        div.className = 'col-header';
        div.textContent = getColumnLabel(i);
        colHeaders.appendChild(div);
    }

    // 2. Generate Row Headers (1 to 100)
    const rowHeaders = document.getElementById('row-headers');
    for (let i = 1; i <= 100; i++) {
        const div = document.createElement('div');
        div.className = 'row-header';
        div.textContent = i;
        rowHeaders.appendChild(div);
    }

    // Helper: Number to Excel Column Letter
    function getColumnLabel(index) {
        let label = '';
        while (index >= 0) {
            label = String.fromCharCode((index % 26) + 65) + label;
            index = Math.floor(index / 26) - 1;
        }
        return label;
    }

    // 3. Tab Switching Logic
    const tabs = document.querySelectorAll('.tab[data-sheet]');
    const sheets = document.querySelectorAll('.sheet-view');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all
            tabs.forEach(t => t.classList.remove('active'));
            sheets.forEach(s => s.style.display = 'none');

            // Activate clicked
            tab.classList.add('active');
            const sheetId = tab.getAttribute('data-sheet');
            document.getElementById(`${sheetId}-sheet`).style.display = 'block';

            // Also update formula bar to look like something changed
            updateFormulaBarForSheet(sheetId);
        });
    });

    function updateFormulaBarForSheet(sheetId) {
        const formulaInput = document.getElementById('formula-input');
        if (sheetId === 'readme') {
            formulaInput.value = '=DECLARATION("RIGHT_TO_REST")';
            document.getElementById('current-cell').textContent = 'A1';
        } else if (sheetId === 'pet') {
            formulaInput.value = '=PET.INIT()';
            document.getElementById('current-cell').textContent = 'A1';
        } else if (sheetId === 'sudoku') {
            formulaInput.value = '=SUDOKU.INIT(A1:I9)';
            document.getElementById('current-cell').textContent = 'A1';
        } else if (sheetId === 'game2048') {
            formulaInput.value = '=SUM(A1:D4)*2048';
            document.getElementById('current-cell').textContent = 'A1';
        }
    }

    // Initialize formula bar for first sheet
    updateFormulaBarForSheet('readme');

    // 4. Boss Key (Esc) Implementation
    let isSafeMode = false;
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            isSafeMode = !isSafeMode;
            if (isSafeMode) {
                document.body.classList.add('safe-mode');
                document.title = '업무용 데이터 종합 관리.xlsx - Excel';
                document.getElementById('formula-input').value = '=VLOOKUP(C4, Data!A2:D100, 3, FALSE)';
            } else {
                document.body.classList.remove('safe-mode');
                // Restore formula bar based on active tab
                const activeTab = document.querySelector('.tab.active');
                if (activeTab) {
                    updateFormulaBarForSheet(activeTab.getAttribute('data-sheet'));
                }
            }
        }
    });

    // 5. Sync scrolling for headers
    const gridContent = document.getElementById('grid-content');
    const rowHeadersBox = document.getElementById('row-headers');
    gridContent.addEventListener('scroll', () => {
        colHeaders.scrollLeft = gridContent.scrollLeft;
        rowHeadersBox.scrollTop = gridContent.scrollTop;
    });

    // 6. Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
    }
});
