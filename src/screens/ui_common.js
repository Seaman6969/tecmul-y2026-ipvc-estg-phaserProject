// Common UI helpers and translation wiring
window.GAME_SETTINGS = window.GAME_SETTINGS || {
    realPlayers: Number(localStorage.getItem('realPlayers') || 1),
    planets: Number(localStorage.getItem('planets') || 3)
};
// translations are applied automatically by `localize.js` using element ids
