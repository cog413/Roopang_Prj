export function initBossKey() {
    let isSafeMode = false;
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            isSafeMode = !isSafeMode;
            document.body.classList.toggle('safe-mode', isSafeMode);
            
            // Generate dummy grid if not exists
            const dummyGrid = document.getElementById('dummy-grid');
            if (isSafeMode && dummyGrid && dummyGrid.children.length === 0) {
                for (let i = 0; i < 200; i++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    if (Math.random() > 0.8) {
                        cell.textContent = Math.floor(Math.random() * 100000);
                        cell.style.color = '#333';
                    }
                    dummyGrid.appendChild(cell);
                }
            }
        }
    });
}
