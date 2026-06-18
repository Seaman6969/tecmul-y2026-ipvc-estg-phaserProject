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


const game = new Phaser.Game(config);

let planet;
let cursors;
let cameraKeys;
let gravityMass = 0;
let massText;
let statusText;
let nonPlayerCircles;
let fixedPlanets;
let physicsEntities;
let blackHoleGraphic;
let rd = 150;
let G = 2000;

const N = 0;

function preload() { }

// Collision resolution and physics step are in physics.js

// Planet creation moved to planets.js

function create() {
    const worldWidth = this.scale.width * GameObjects.world.scale;
    const worldHeight = this.scale.height * GameObjects.world.scale;

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
    // Camera setup moved to camera.js

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

    planet = this.add.circle(400, 300, 20, 0xff0000);
    this.physics.add.existing(planet);
    planet.body.setCircle(20);
    planet.body.setCollideWorldBounds(false);
    planet.body.setBounce(0, 0);
    planet.body.setDrag(0, 0);
    planet.radius = 20;
    planet.body.mass = 20 * 20;
    planet.physics = {
        mass: 20 * 20,
        attractsOthers: true,
        speed: {
            x: Phaser.Math.Between(-60, 60),
            y: Phaser.Math.Between(-60, 60)
        }
    };
    planet.body.setVelocity(planet.physics.speed.x, planet.physics.speed.y);

    this.add.particles(0, 0, 'trail_particle', {
        speed: 0,
        lifespan: 300,
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.4, end: 0 },
        blendMode: 'ADD',
        follow: planet,
        tint: 0xff0000
    });

    nonPlayerCircles.add(planet);
    physicsEntities.push(planet);

    this.physics.add.collider(nonPlayerCircles, nonPlayerCircles, resolveElasticCollision);

    massText = this.add.text(20, 20, "Black Hole Mass: " + gravityMass, {
        fontFamily: "'Outfit', 'Courier New', sans-serif",
        fontSize: "18px",
        fill: "#00ff00",
        fontStyle: "bold"
    });

    // Allow clicking the mass text to edit it directly
    massText.setInteractive({ useHandCursor: true });
    const scene = this;
    massText.on('pointerdown', function () {
        // prevent multiple inputs
        if (document.getElementById('mass-input')) return;

        const canvasRect = scene.game.canvas.getBoundingClientRect();
        const input = document.createElement('input');
        input.id = 'mass-input';
        input.type = 'text';
        input.value = gravityMass;
        input.style.position = 'absolute';
        input.style.left = (canvasRect.left + massText.x) + 'px';
        input.style.top = (canvasRect.top + massText.y) + 'px';
        input.style.zIndex = 10000;
        input.style.background = 'rgba(0,0,0,0.8)';
        input.style.color = '#00ff00';
        input.style.border = '1px solid #00ff00';
        input.style.font = '16px "Outfit", "Courier New", sans-serif';
        input.style.padding = '2px 6px';
        input.style.outline = 'none';
        document.body.appendChild(input);
        input.focus();
        input.select();

        function commit() {
            const v = Number(input.value);
            if (!isNaN(v)) {
                gravityMass = v;
            }
            gravityMass = Phaser.Math.Clamp(gravityMass, -500000000, 500000000);
            massText.setText("Black Hole Mass: " + gravityMass);
            if (gravityMass > 0) {
                massText.setFill("#00ffff");
            } else if (gravityMass < 0) {
                massText.setFill("#ff4500");
            } else {
                massText.setFill("#00ff00");
            }
            input.remove();
        }

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                commit();
            } else if (e.key === 'Escape') {
                input.remove();
            }
        });

        input.addEventListener('blur', function () {
            commit();
        });
    });

    statusText = this.add.text(20, 45, "Status: Inactive (Click and hold to activate)", {
        fontFamily: "'Outfit', 'Courier New', sans-serif",
        fontSize: "12px",
        fill: "#8fa0c0"
    });

    // initialize camera controls (center, drag, zoom, keys)
    if (typeof CameraControls !== 'undefined') CameraControls.init(this);
    // optional debug overlay
    if (typeof DebugOverlay !== 'undefined') DebugOverlay.init(this);

    blackHoleGraphic = this.add.graphics();
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

function update() {
    const pointer = this.input.activePointer;
    blackHoleGraphic.clear();

    if (pointer.leftButtonDown()) {
        statusText.setText("Status: ACTIVE (Gravity Source online)");
        statusText.setFill("#00ff88");
        const absMass = Math.abs(gravityMass);
        const baseRadius = Phaser.Math.Clamp(absMass / 40000, 6, 65);
        const pulse = 1 + 0.15 * Math.sin(this.time.now / 120);
        const glowRadius = baseRadius * pulse;

        if (gravityMass >= 0) {
            blackHoleGraphic.fillStyle(0x8a2be2, 0.25);
            blackHoleGraphic.fillCircle(pointer.x, pointer.y, glowRadius * 2.2);
            blackHoleGraphic.fillStyle(0x0000ff, 0.45);
            blackHoleGraphic.fillCircle(pointer.x, pointer.y, glowRadius * 1.4);
            blackHoleGraphic.lineStyle(2, 0x00ffff, 0.85);
            blackHoleGraphic.strokeCircle(pointer.x, pointer.y, glowRadius);
            blackHoleGraphic.fillStyle(0x000000, 1.0);
            blackHoleGraphic.fillCircle(pointer.x, pointer.y, baseRadius * 0.7);
        } else {
            blackHoleGraphic.fillStyle(0xff4500, 0.25);
            blackHoleGraphic.fillCircle(pointer.x, pointer.y, glowRadius * 2.2);
            blackHoleGraphic.fillStyle(0xff8c00, 0.45);
            blackHoleGraphic.fillCircle(pointer.x, pointer.y, glowRadius * 1.4);
            blackHoleGraphic.lineStyle(2, 0xffffff, 0.85);
            blackHoleGraphic.strokeCircle(pointer.x, pointer.y, glowRadius);
            blackHoleGraphic.fillStyle(0xffffff, 1.0);
            blackHoleGraphic.fillCircle(pointer.x, pointer.y, baseRadius * 0.7);
        }
    } else {
        statusText.setText("Status: Inactive (Click and hold to activate)");
        statusText.setFill("#8fa0c0");
    }

    const allPhysicsEntities = physicsEntities.filter(entity => entity && entity.physics);
    updateOrbitingBodies(allPhysicsEntities, this.game.loop.delta);

    // update camera controls
    if (typeof CameraControls !== 'undefined') CameraControls.update(this);

    stepPhysics(allPhysicsEntities, pointer, gravityMass, this.scale.width * GameObjects.world.scale, this.scale.height * GameObjects.world.scale, this.game.loop.delta);

    if (typeof DebugOverlay !== 'undefined') DebugOverlay.update(this);

}
