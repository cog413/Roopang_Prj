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

    // 3. Theme Toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
    }

    // 4. Tab Switching logic
    const tabs = document.querySelectorAll('.tab:not(.add-tab)');
    const sheetViews = document.querySelectorAll('.sheet-view');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
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
        } else if (sheetId === 'game2048') {
            formulaInput.value = '=SUM(A1:D4)*2048';
            currentCell.textContent = 'A1';
        } else if (sheetId === 'mini-pet') {
            formulaInput.value = '=MANAGE.PET.STATUS(B2:F22)';
            currentCell.textContent = 'B2';
        }
    }

    // Initialize formula bar for first sheet
    updateFormulaBarForSheet('readme');
}
