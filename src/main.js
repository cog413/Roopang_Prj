// Main Entry Point - v1.3.0
import { initExcelLayout } from './layout/excelLayout.js';
import { initBossKey } from './stealth/bossKey.js';
import { petEngine } from './pet/petEngine.js';
import { initSudoku } from './games/sudoku/sudoku.js';
import { initNewGame } from './games/newgame/newGame.js';
import { initGame2048 } from './games/game2048/index.js';
import { initMiniPet } from './pet/miniPet.js';
import { initAuthState } from './auth/authState.js';
import { maybeShowOnboarding } from './onboarding/onboarding.js';
import { initMinimeSheet } from './minime/minimeSetup.js';
import { showLoginPopup, goToLogin, showAlertPopup } from './ui/loginPopup.js';
import { showUserSettings } from './auth/userSettings.js';
import { refreshKpiDisplay, startEnduranceTimer } from './kpi/kpiDisplay.js';
import { initRankingTabs, refreshRankingDisplay } from './ranking/rankingDisplay.js';
import { initReview } from './review/review.js';
import { initTypingGame } from './games/typing/typingGame.js';
import { initGameRankingTables } from './games/gameRankingTable.js';

// Expose popup/settings modules globally for game modules that can't import directly
window.loginPopupModule = { showLoginPopup, goToLogin, showAlertPopup, showUserSettings };

document.addEventListener('DOMContentLoaded', () => {
    console.log('Refresheet Project v1.3.0 Initializing...');

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
    initRankingTabs();
    initReview();

    initAuthState().then(async (authState) => {
        await maybeShowOnboarding(authState);
        await refreshKpiDisplay();
        startEnduranceTimer();
        await refreshRankingDisplay();
    });
    initExcelLayout();
    initBossKey();

    // Initialize Pet Engine (관리시트 대화)
    petEngine.init();

    // Initialize Games (Sheet1, Sheet2 탭)
    initSudoku();
    initNewGame();
    initGame2048();
    initTypingGame();
    initGameRankingTables();

    // Initialize Mini Pet (관리시트: 단일 셀구리 & 실적 장표)
    initMiniPet();

    // Initialize Minime sheet auth/setup flow
    initMinimeSheet();

    // KPI + 랭킹 재갱신: 점수 저장 이벤트 수신
    document.addEventListener('refresheet:score-saved', () => {
        refreshKpiDisplay();
        refreshRankingDisplay();
    });
    document.addEventListener('refresheet:onboarding-done', () => {
        refreshKpiDisplay();
        refreshRankingDisplay();
    });
});

