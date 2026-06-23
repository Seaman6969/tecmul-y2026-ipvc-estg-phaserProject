// Settings UI: populate and save handlers

// expose a helper so other modules can open the settings UI pre-populated
window.populateSettingsUI = function () {
    try {
        document.getElementById('settings-planets').value = window.GAME_SETTINGS.planets;
        document.getElementById('settings-realplayers').value = window.GAME_SETTINGS.realPlayers;
        if (window.Localization && document.getElementById('settings-language')) {
            const sel = document.getElementById('settings-language');
            sel.value = window.Localization.getLang ? window.Localization.getLang() : (localStorage.getItem('lang') || 'en');
        }
    } catch (e) { console.warn(e); }
};

// initialize fields on load
try { if (document.getElementById('settings-planets')) document.getElementById('settings-planets').value = window.GAME_SETTINGS.planets; } catch (e) {}
try { if (document.getElementById('settings-realplayers')) document.getElementById('settings-realplayers').value = window.GAME_SETTINGS.realPlayers; } catch (e) {}

// Hook settings UI buttons
try {
    document.getElementById('settings-back').addEventListener('click', function () {
        const s = document.getElementById('settings-ui');
        if (!s) return;
        s.style.display = 'none';
        s.setAttribute('aria-hidden', 'true');
    });
} catch (e) {}

try {
    document.getElementById('settings-save').addEventListener('click', function () {
        const planets = Number(document.getElementById('settings-planets').value) || 0;
        const players = Number(document.getElementById('settings-realplayers').value) || 1;
        window.GAME_SETTINGS.planets = Math.max(0, Math.min(12, planets));
        window.GAME_SETTINGS.realPlayers = Math.max(1, Math.min(16, players));
        localStorage.setItem('planets', window.GAME_SETTINGS.planets);
        localStorage.setItem('realPlayers', window.GAME_SETTINGS.realPlayers);
        // save language selection
        const langSel = document.getElementById('settings-language');
        if (langSel) {
            const lang = langSel.value || 'en';
            localStorage.setItem('lang', lang);
            if (window.Localization && typeof window.Localization.setLang === 'function') window.Localization.setLang(lang);
        }
        // apply planet count into GameObjects if available
        try {
            if (window.GameObjects && window.GameObjects.orbitalSystem) {
                const count = window.GAME_SETTINGS.planets;
                // rebuild orbiters using first `count` colors/definitions
                const baseOrbiters = [
                    { orbitRadius: 950, radius: 50, color: 0xffcc33, angularSpeed: 0.1, startAngle: 0 },
                    { orbitRadius: 1400, radius: 60, color: 0x33ffcc, angularSpeed: 0.09, startAngle: Math.PI * 0.4 },
                    { orbitRadius: 2800, radius: 80, color: 0xff33bb, angularSpeed: 0.06, startAngle: Math.PI * 0.8 },
                    { orbitRadius: 3600, radius: 42, color: 0x7fff00, angularSpeed: 0.05, startAngle: Math.PI * 0.2 },
                    { orbitRadius: 4200, radius: 36, color: 0xff8800, angularSpeed: 0.04, startAngle: Math.PI * 0.6 },
                    { orbitRadius: 4800, radius: 28, color: 0x00aaff, angularSpeed: 0.03, startAngle: Math.PI * 0.1 }
                ];
                window.GameObjects.orbitalSystem.orbiters = baseOrbiters.slice(0, Math.max(0, Math.min(baseOrbiters.length, window.GAME_SETTINGS.planets)));
            }
        } catch (e) { console.warn(e); }
        // close settings UI and return to start menu
        const s = document.getElementById('settings-ui');
        if (s) { s.style.display = 'none'; s.setAttribute('aria-hidden', 'true'); }
    });
} catch (e) {}
