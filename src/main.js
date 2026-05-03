import { initExcelLayout } from './layout/excelLayout.js';
import { initBossKey } from './stealth/bossKey.js';
import { petEngine } from './pet/petEngine.js';
import { initSudoku } from './games/sudoku/sudoku.js';
import { initGame2048 } from './games/game2048/index.js';

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

    // Initialize Layout and Stealth Modules
    initExcelLayout();
    initBossKey();
    
    // Initialize Pet Engine
    petEngine.init();

    // Initialize Games
    initSudoku();
    initGame2048();
});
