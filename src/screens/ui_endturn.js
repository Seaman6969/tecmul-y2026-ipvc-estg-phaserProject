(function () {
    const btn = document.createElement('button');
    btn.id = 'end-turn-btn';
    btn.setAttribute('data-min', '1000');
    btn.setAttribute('data-max', '5000');
    btn.textContent = (window.Localization && window.Localization.t) ? window.Localization.t('end-turn-btn') : 'Next Turn';
    Object.assign(btn.style, {
        position: 'absolute',
        right: '16px',
        bottom: '16px',
        zIndex: 9999,
        padding: '10px 14px',
        borderRadius: '8px',
        background: '#10b981',
        color: '#042018',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
        pointerEvents: 'auto'
    });
    // prefer the dedicated player UI layer, fall back to game container or body
    const playerUI = document.getElementById('player-ui');
    const container = playerUI || document.getElementById('game-container') || document.body;
    // keep the player UI non-interactive except for child controls
    if (playerUI) playerUI.style.pointerEvents = 'none';
    btn.style.pointerEvents = 'auto';
    container.appendChild(btn);
    // start hidden; shown when gameplay begins
    btn.style.display = 'none';

    let confirming = false;

    function updateButton() {
        const tm = window.TurnManager;
        const running = tm && typeof tm.isRunning === 'function' && tm.isRunning();
        btn.style.opacity = running ? '0.5' : '1';
        btn.disabled = !!running;
        if (running) btn.textContent = (window.Localization && window.Localization.t) ? window.Localization.t('end-turn-btn-running') : 'Turn Running';
        else btn.textContent = confirming ? ((window.Localization && window.Localization.t) ? window.Localization.t('end-turn-btn-confirm') : 'Confirm') : ((window.Localization && window.Localization.t) ? window.Localization.t('end-turn-btn') : 'Next Turn');
    }

    function cancelConfirm() {
        confirming = false;
        updateButton();
        document.removeEventListener('click', outsideClick);
    }

    function outsideClick(e) {
        if (!btn.contains(e.target)) cancelConfirm();
    }

    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (btn.disabled) return;
        if (!confirming) {
            confirming = true;
            updateButton();
            // listen for clicks outside to cancel
            setTimeout(() => document.addEventListener('click', outsideClick), 0);
        } else {
            // confirmed
            confirming = false;
            document.removeEventListener('click', outsideClick);
            const min = parseInt(btn.getAttribute('data-min')) || 1000;
            const max = parseInt(btn.getAttribute('data-max')) || 5000;
            if (window.TurnManager && typeof window.TurnManager.startTurn === 'function') {
                window.TurnManager.startTurn(min, max);
            }
            updateButton();
        }
    });

    // Hook up TurnManager events (may not exist yet)
    function wireTurnManager() {
        if (!window.TurnManager) return false;
        try {
            if (typeof window.TurnManager.setOnStart === 'function') window.TurnManager.setOnStart(updateButton);
            if (typeof window.TurnManager.setOnEnd === 'function') window.TurnManager.setOnEnd(updateButton);
        } catch (e) { }
        return true;
    }
    if (!wireTurnManager()) {
        const t = setInterval(() => { if (wireTurnManager()) clearInterval(t); }, 200);
    }

    // expose toggler so gameplay can show/hide the button
    function setVisible(v) {
        // only show if player UI is visible
        const playerVisible = !(playerUI && playerUI.style.display === 'none');
        btn.style.display = (v && playerVisible) ? 'block' : 'none';
        updateButton();
    }
    window.showEndTurnButton = setVisible;

    // allow toggling the whole player UI layer (HUD) on/off
    window.togglePlayerUI = function (show) {
        if (!playerUI) return;
        playerUI.style.display = show ? 'block' : 'none';
        // when hiding the layer, also hide interactive controls
        if (!show) btn.style.display = 'none';
    };

    updateButton();
})();
