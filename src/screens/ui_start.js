// Start menu interactions
const EXIT_URL = 'https://ballsfactory.net';

document.getElementById('start-settings-btn').addEventListener('click', function () {
    const s = document.getElementById('settings-ui');
    if (!s) return;
    // let settings module populate inputs if available
    if (typeof window.populateSettingsUI === 'function') window.populateSettingsUI();
    s.style.display = 'flex';
    s.setAttribute('aria-hidden', 'false');
});

document.getElementById('start-play').addEventListener('click', function () {
    // hide start menu, start the Phaser game
    document.getElementById('start-menu').style.display = 'none';
    // call startGame exposed by game.js
    if (window.startGame) {
        window.startGame();
        if (window.showEndTurnButton) window.showEndTurnButton(true);
        // focus the canvas if present
        setTimeout(() => { const c = document.querySelector('canvas'); if (c) c.focus(); }, 200);
    } else {
        console.warn('startGame() not found');
    }
});

document.getElementById('start-exit').addEventListener('click', function () {
    window.location.href = EXIT_URL;
});
