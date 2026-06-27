const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#030308",
    physics: {
        default: "arcade",
        arcade: {
            gravity: { y: 0 },
        },
    },
    scene: {
        preload: preload,
        create: create,
        update: update,
    },
};

// Defer creating the Phaser.Game until the user presses Play from the HTML start menu.
let game = null;
function startGame() {
    if (game) return game;
    game = new Phaser.Game(config);
    return game;
}
window.startGame = startGame;
function stopGame() {
    try {
        if (window.__phaserScene && window.__phaserScene.scene) {
            try { window.__phaserScene.scene.stop(); } catch (e) {}
        }
        if (game) {
            try { game.destroy(true); } catch (e) { }
        }
    } finally {
        game = null;
        window.__phaserScene = null;
        try { if (window.showEndTurnButton) window.showEndTurnButton(false); } catch (e) { }
    }
}
window.stopGame = stopGame;

let cursors;
let cameraKeys;
let gravityMass = 0;
let nonPlayerCircles;
let fixedPlanets;
let physicsEntities;
let rd = 150;
let G = 2000;
let starfieldTiles = [];
let starfieldCols = 0;
let starfieldRows = 0;
let starfieldTileSize = 1024;

function preload() { }

function updateStarfieldRender(scene) {
    if (!scene || !Array.isArray(starfieldTiles) || starfieldTiles.length === 0) return;
    const cam = scene.cameras && scene.cameras.main;
    if (!cam || !cam.worldView) return;

    const view = cam.worldView;
    const tileSize = starfieldTileSize;
    const visibleX0 = Math.max(0, Math.floor(view.x / tileSize));
    const visibleY0 = Math.max(0, Math.floor(view.y / tileSize));
    const visibleX1 = Math.min(starfieldCols - 1, Math.floor((view.right - 1) / tileSize));
    const visibleY1 = Math.min(starfieldRows - 1, Math.floor((view.bottom - 1) / tileSize));

    starfieldTiles.forEach((tile) => {
        const xIndex = tile.starfieldX;
        const yIndex = tile.starfieldY;
        tile.visible = xIndex >= visibleX0 && xIndex <= visibleX1 && yIndex >= visibleY0 && yIndex <= visibleY1;
    });
}

function createStarfieldTiles(scene, worldWidth, worldHeight) {
    const tileSize = (GameObjects.stars && GameObjects.stars.tileSize) ? GameObjects.stars.tileSize : 1024;
    starfieldTileSize = tileSize;
    const starsPerTile = (GameObjects.stars && GameObjects.stars.starsPerTile) ? GameObjects.stars.starsPerTile : 800;
    const key = 'stars_tile';

    if (!scene.textures.exists(key)) {
        const tile = scene.textures.createCanvas(key, tileSize, tileSize);
        const ctx = tile.context;
        ctx.clearRect(0, 0, tileSize, tileSize);
        for (let i = 0; i < starsPerTile; i++) {
            const sx = Math.random() * tileSize;
            const sy = Math.random() * tileSize;
            const r = Phaser.Math.FloatBetween(GameObjects.stars.minRadius, GameObjects.stars.maxRadius);
            const a = Phaser.Math.FloatBetween(GameObjects.stars.minAlpha, GameObjects.stars.maxAlpha);
            ctx.beginPath();
            ctx.fillStyle = `rgba(255,255,255,${a})`;
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fill();
        }
        tile.refresh();
    }

    starfieldTiles.forEach(tile => tile.destroy());
    starfieldTiles = [];

    starfieldCols = Math.ceil(worldWidth / tileSize);
    starfieldRows = Math.ceil(worldHeight / tileSize);

    for (let ty = 0; ty < starfieldRows; ty++) {
        for (let tx = 0; tx < starfieldCols; tx++) {
            const tileX = tx * tileSize;
            const tileY = ty * tileSize;
            const tileW = Math.min(tileSize, worldWidth - tileX);
            const tileH = Math.min(tileSize, worldHeight - tileY);
            const tileSprite = scene.add.image(tileX, tileY, key).setOrigin(0, 0);
            tileSprite.setDisplaySize(tileW, tileH);
            tileSprite.setDepth(-1000);
            tileSprite.starfieldX = tx;
            tileSprite.starfieldY = ty;
            starfieldTiles.push(tileSprite);
        }
    }
}

function create() {
    let sceneWidth = (this.scale && this.scale.width) ? this.scale.width : (this.sys && this.sys.game && this.sys.game.config && this.sys.game.config.width) || window.innerWidth,
        sceneHeight = (this.scale && this.scale.height) ? this.scale.height : (this.sys && this.sys.game && this.sys.game.config && this.sys.game.config.height) || window.innerHeight,
        worldWidth = sceneWidth * GameObjects.world.scale,
        worldHeight = sceneHeight * GameObjects.world.scale;

    // Create static starfield tiles for the entire world once up front.
    try {
        createStarfieldTiles(this, worldWidth, worldHeight);
        updateStarfieldRender(this);
        try {
            this.events.on('postupdate', () => updateStarfieldRender(this));
        } catch (e) { }
        // debug: log texture and starfield state
        try { console.log('Starfield sources created:', this.textures.exists('stars_tile'), 'cols:', starfieldCols, 'rows:', starfieldRows); } catch (e) { }
    } catch (e) { console.warn('Starfield generation failed', e); }

    const particleCanvas = this.textures.createCanvas('trail_particle', 16, 16);
    const ctx = particleCanvas.context;
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, Math.PI * 2);
    ctx.fill();
    particleCanvas.refresh();

    nonPlayerCircles = this.physics.add.group();
    fixedPlanets = [];
    physicsEntities = [];

    const centerPlanet = createFixedPlanet(
        this,
        worldWidth * 0.5,
        worldHeight * 0.5,
        GameObjects.orbitalSystem.centerPlanet.radius,
        GameObjects.orbitalSystem.centerPlanet.color
    );
    fixedPlanets.push(centerPlanet);

    GameObjects.orbitalSystem.orbiters.forEach(data => {
        createOrbitingPlanet(this, centerPlanet, data.orbitRadius, data.radius, data.color, data.angularSpeed, data.startAngle);
    });

    // initialize the optional debug overlay from debug_overlay.js
    try {
        if (typeof initDebugOverlay === 'function') initDebugOverlay(this, { nonPlayerCircles, physicsEntities });
    } catch (e) { /* ignore */ }

    // init TurnManager if available
    try { if (window.TurnManager && typeof window.TurnManager.init === 'function') window.TurnManager.init(this); } catch (e) { /* ignore */ }

    this.physics.add.collider(nonPlayerCircles, nonPlayerCircles, resolveElasticCollision);

    const scene = this;

    // initialize camera controls (center, drag, zoom, keys)
    if (typeof CameraControls !== 'undefined') CameraControls.init(this);
    // optional debug overlay (library-style)
    if (typeof DebugOverlay !== 'undefined') DebugOverlay.init(this);

    // Responsive resize: adapt canvas, scale and camera to window size changes
    const onResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (this.scale && this.scale.resize) this.scale.resize(w, h);
        if (this.game && this.game.canvas) {
            this.game.canvas.style.width = w + 'px';
            this.game.canvas.style.height = h + 'px';
        }
        if (this.cameras && this.cameras.main) {
            try { this.cameras.main.setViewport(0, 0, w, h); } catch (e) { }
            try { this.cameras.main.setSize(w, h); } catch (e) { }
        }
        if (typeof CameraControls !== 'undefined' && CameraControls.state && CameraControls.state.updateLetterbox) {
            CameraControls.state.updateLetterbox();
        }
        if (typeof DebugOverlay !== 'undefined') DebugOverlay.update(this);
        updateStarfieldRender(this);
    };
    window.addEventListener('resize', onResize, { passive: true });
    this.events.once('shutdown', () => window.removeEventListener('resize', onResize));

    // initialize HTML menu handlers (for pause / main menu)
    if (typeof initHtmlMenu === 'function') initHtmlMenu(this);
}

function updateOrbitingBodies(allPhysicsEntities, delta) {
    const dt = Math.max(delta, 1) / 1000;
    allPhysicsEntities.forEach((entity) => {
        if (!entity.physics || !entity.physics.orbit) return;

        const orbit = entity.physics.orbit;
        orbit.angle += orbit.angularSpeed * dt;
        const center = orbit.center;
        entity.x = center.x + Math.cos(orbit.angle) * orbit.radius;
        entity.y = center.y + Math.sin(orbit.angle) * orbit.radius;

        if (entity.body) {
            entity.body.x = entity.x - entity.radius;
            entity.body.y = entity.y - entity.radius;
        }
    });
}

// --- HTML menu / pause helpers ---
function initHtmlMenu(scene) {
    try {
        window.__phaserScene = scene;

        if (window.__menuHandlers) {
            const prev = window.__menuHandlers;
            try {
                if (prev.key) window.removeEventListener('keydown', prev.key);
                if (prev.resume && document.getElementById('menu-resume')) document.getElementById('menu-resume').removeEventListener('click', prev.resume);
                if (prev.restart && document.getElementById('menu-restart')) document.getElementById('menu-restart').removeEventListener('click', prev.restart);
                if (prev.settings && document.getElementById('menu-settings')) document.getElementById('menu-settings').removeEventListener('click', prev.settings);
                if (prev.exit && document.getElementById('menu-exit')) document.getElementById('menu-exit').removeEventListener('click', prev.exit);
            } catch (e) { }
        }

        const init = () => {
            const menu = document.getElementById('main-menu');
            if (!menu) return;

            const resumeBtn = document.getElementById('menu-resume');
            const restartBtn = document.getElementById('menu-restart');
            const settingsBtn = document.getElementById('menu-settings');
            const exitBtn = document.getElementById('menu-exit');

            const onResume = () => closeMenu();
            const onRestart = () => {
                if (window.showConfirm) {
                    window.showConfirm('Are you sure you want to restart the game?', () => {
                        closeMenu();
                        try { window.stopGame(); } catch (e) {}
                        setTimeout(() => { if (window.startGame) window.startGame(); if (window.showEndTurnButton) window.showEndTurnButton(true); }, 50);
                    });
                } else {
                    closeMenu();
                    try { window.location.reload(); } catch (e) {}
                }
            };
            const onSettings = () => { alert('No settings available yet.'); };
            const onExit = () => {
                if (window.showConfirm) {
                    window.showConfirm('Return to the main menu? Unsaved progress will be lost.', () => {
                        closeMenu();
                        try { window.stopGame(); } catch (e) {}
                        const sm = document.getElementById('start-menu');
                        if (sm) sm.style.display = 'flex';
                    });
                } else {
                    closeMenu();
                    try { window.stopGame(); } catch (e) {}
                    const sm = document.getElementById('start-menu');
                    if (sm) sm.style.display = 'flex';
                }
            };

            if (resumeBtn) resumeBtn.addEventListener('click', onResume);
            if (restartBtn) restartBtn.addEventListener('click', onRestart);
            if (settingsBtn) settingsBtn.addEventListener('click', onSettings);
            if (exitBtn) exitBtn.addEventListener('click', onExit);

            const onKey = (e) => { if (e.key === 'Escape') toggleMenu(); };
            window.addEventListener('keydown', onKey);

            window.__menuHandlers = { key: onKey, resume: onResume, restart: onRestart, settings: onSettings, exit: onExit };
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    } catch (err) {
        console.warn('initHtmlMenu failed', err);
    }
}

function openMenu() {
    const menu = document.getElementById('main-menu');
    if (!menu) return;
    menu.style.display = 'flex';
    menu.setAttribute('aria-hidden', 'false');
    try {
        if (window.__phaserScene && window.__phaserScene.scene && window.__phaserScene.scene.pause) window.__phaserScene.scene.pause();
        if (window.__phaserScene && window.__phaserScene.sound && window.__phaserScene.sound.pauseAll) window.__phaserScene.sound.pauseAll();
        const canvas = document.querySelector('canvas');
        if (canvas) canvas.style.pointerEvents = 'none';
    } catch (e) { }
}

function closeMenu() {
    const menu = document.getElementById('main-menu');
    if (!menu) return;
    menu.style.display = 'none';
    menu.setAttribute('aria-hidden', 'true');
    try {
        if (window.__phaserScene && window.__phaserScene.scene && window.__phaserScene.scene.resume) window.__phaserScene.scene.resume();
        if (window.__phaserScene && window.__phaserScene.sound && window.__phaserScene.sound.resumeAll) window.__phaserScene.sound.resumeAll();
        const canvas = document.querySelector('canvas');
        if (canvas) canvas.style.pointerEvents = '';
    } catch (e) { }
}

function toggleMenu() {
    const menu = document.getElementById('main-menu');
    if (!menu) return;
    if (menu.style.display === 'flex') closeMenu(); else openMenu();
}

function update() {
    updateStarfieldRender(this);

    const pointer = this.input.activePointer;
    // gravity UI removed; pointer-driven temporary gravity is disabled by default

    const allPhysicsEntities = physicsEntities.filter(entity => entity && entity.physics);
    // Only advance orbital motion and physics while a turn is running (if TurnManager is present)
    const allowSim = !(window.TurnManager && typeof window.TurnManager.isRunning === 'function') || window.TurnManager.isRunning();
    if (allowSim) updateOrbitingBodies(allPhysicsEntities, this.game.loop.delta);

    if (typeof CameraControls !== 'undefined') CameraControls.update(this);

    const sceneW = (this.scale && this.scale.width) ? this.scale.width : (this.sys && this.sys.game && this.sys.game.config && this.sys.game.config.width) || window.innerWidth;
    const sceneH = (this.scale && this.scale.height) ? this.scale.height : (this.sys && this.sys.game && this.sys.game.config && this.sys.game.config.height) || window.innerHeight;
    if (allowSim) stepPhysics(allPhysicsEntities, pointer, gravityMass, sceneW * GameObjects.world.scale, sceneH * GameObjects.world.scale, this.game.loop.delta);

    // let TurnManager progress and decide if it should end
    try { if (window.TurnManager && typeof window.TurnManager.update === 'function') window.TurnManager.update(); } catch (e) { /* ignore */ }

    // update debug overlay (movable test planet)
    if (typeof updateDebugOverlay === 'function') updateDebugOverlay(this, this.game.loop.delta);

    if (typeof DebugOverlay !== 'undefined') DebugOverlay.update(this);

}
