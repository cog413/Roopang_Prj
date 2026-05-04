// Main Entry Point - v1.2.5
import { initExcelLayout } from './layout/excelLayout.js';
import { initBossKey } from './stealth/bossKey.js';
import { petEngine } from './pet/petEngine.js';
import { initSudoku } from './games/sudoku/sudoku.js';
import { initGame2048 } from './games/game2048/index.js';
import { initMiniPet } from './pet/miniPet.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('Refresheet Project v1.2.5 Initializing...');

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
    
    // Initialize Pet Engine (관리시트 대화)
    petEngine.init();

    // Initialize Games (Sheet1, Sheet2 탭)
    initSudoku();
    initGame2048();

    // Initialize Mini Pet (관리시트: 단일 셀구리 & 실적 장표)
    initMiniPet();
});

