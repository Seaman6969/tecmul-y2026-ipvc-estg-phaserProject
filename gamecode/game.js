const config = {
    type: Phaser.AUTO,
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

// Provide a fallback `add.circle` factory when the Phaser build doesn't include it.
if (typeof Phaser !== 'undefined' && Phaser.GameObjects && Phaser.GameObjects.GameObjectFactory && !Phaser.GameObjects.GameObjectFactory.prototype.circle) {
    Phaser.GameObjects.GameObjectFactory.prototype.circle = function (x, y, radius, color, alpha) {
        const scene = this.scene;
        const colStr = (typeof color === 'number') ? ('#' + ('000000' + color.toString(16)).slice(-6)) : (color || '#ffffff');
        const texKey = '__circle_' + radius + '_' + colStr.replace('#', '');

        if (!scene.textures.exists(texKey)) {
            const size = Math.max(2, Math.ceil(radius * 2));
            const canvas = scene.textures.createCanvas(texKey, size, size);
            const ctx = canvas.context;
            ctx.clearRect(0, 0, size, size);
            ctx.fillStyle = colStr;
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
            ctx.fill();
            canvas.refresh();
        }

        const img = this.image(x, y, texKey);
        if (alpha !== undefined) img.setAlpha(alpha);
        return img;
    };
}

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

function preload() { }

function create() {
    let sceneWidth = (this.scale && this.scale.width) ? this.scale.width : (this.sys && this.sys.game && this.sys.game.config && this.sys.game.config.width) || window.innerWidth,
        sceneHeight = (this.scale && this.scale.height) ? this.scale.height : (this.sys && this.sys.game && this.sys.game.config && this.sys.game.config.height) || window.innerHeight,
        worldWidth = sceneWidth * GameObjects.world.scale,
        worldHeight = sceneHeight * GameObjects.world.scale;

    for (let i = 0; i < GameObjects.world.starCount; i++) {
        const x = Phaser.Math.Between(0, worldWidth);
        const y = Phaser.Math.Between(0, worldHeight);
        const radius = Phaser.Math.FloatBetween(GameObjects.stars.minRadius, GameObjects.stars.maxRadius);
        const alpha = Phaser.Math.FloatBetween(GameObjects.stars.minAlpha, GameObjects.stars.maxAlpha);
        const star = this.add.circle(x, y, radius, 0xffffff, alpha);

        this.tweens.add({
            targets: star,
            alpha: 0.1,
            duration: Phaser.Math.Between(1500, 4000),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

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
                        setTimeout(() => { if (window.startGame) window.startGame(); }, 50);
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
    const pointer = this.input.activePointer;
    // gravity UI removed; pointer-driven temporary gravity is disabled by default

    const allPhysicsEntities = physicsEntities.filter(entity => entity && entity.physics);
    updateOrbitingBodies(allPhysicsEntities, this.game.loop.delta);

    if (typeof CameraControls !== 'undefined') CameraControls.update(this);

    const sceneW = (this.scale && this.scale.width) ? this.scale.width : (this.sys && this.sys.game && this.sys.game.config && this.sys.game.config.width) || window.innerWidth;
    const sceneH = (this.scale && this.scale.height) ? this.scale.height : (this.sys && this.sys.game && this.sys.game.config && this.sys.game.config.height) || window.innerHeight;
    stepPhysics(allPhysicsEntities, pointer, gravityMass, sceneW * GameObjects.world.scale, sceneH * GameObjects.world.scale, this.game.loop.delta);

    // update debug overlay (movable test planet)
    if (typeof updateDebugOverlay === 'function') updateDebugOverlay(this, this.game.loop.delta);

    if (typeof DebugOverlay !== 'undefined') DebugOverlay.update(this);

}
