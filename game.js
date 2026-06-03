const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
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

let player;
let cursors;
let gravityMass = 0;
let massText;
let statusText;
let nonPlayerCircles;
let blackHoleGraphic;
let rd = 150;
let G = 2000;
const N = 5;
let p_name = "jackass";
let playerText;

const G_CONSTANT = 300;

const colors = [
  0x00ffff,
  0x39ff14,
  0xff00ff,
  0xffff00,
  0xff7300,
  0x00e5ff,
  0xab00ff,
  0x00ff88
];

function preload() {}

function resolveElasticCollision(obj1, obj2) {
  const m1 = obj1.body.mass;
  const m2 = obj2.body.mass;
  const v1x = obj1.prevVx !== undefined ? obj1.prevVx : obj1.body.velocity.x;
  const v1y = obj1.prevVy !== undefined ? obj1.prevVy : obj1.body.velocity.y;
  const v2x = obj2.prevVx !== undefined ? obj2.prevVx : obj2.body.velocity.x;
  const v2y = obj2.prevVy !== undefined ? obj2.prevVy : obj2.body.velocity.y;
  const dx = obj2.x - obj1.x;
  const dy = obj2.y - obj1.y;
  const distSq = dx * dx + dy * dy;
  if (distSq === 0) return;
  const rvx = v1x - v2x;
  const rvy = v1y - v2y;
  const velAlongNormal = rvx * (dx / Math.sqrt(distSq)) + rvy * (dy / Math.sqrt(distSq));
  if (velAlongNormal < 0) return;
  const impulseScalar = -2 * velAlongNormal / (1 / m1 + 1 / m2);
  const ix = impulseScalar * (dx / Math.sqrt(distSq));
  const iy = impulseScalar * (dy / Math.sqrt(distSq));
  obj1.body.velocity.x = v1x + ix / m1;
  obj1.body.velocity.y = v1y + iy / m1;
  obj2.body.velocity.x = v2x - ix / m2;
  obj2.body.velocity.y = v2y - iy / m2;
}

function createPlanet(scene, x, y, radius, color) {
  const circle = scene.add.circle(x, y, radius, color);
  scene.physics.add.existing(circle);
  
  circle.body.setCircle(radius);
  circle.body.setCollideWorldBounds(false);
  circle.body.setBounce(0, 0);
  circle.body.setDrag(0, 0);
  
  circle.radius = radius;
  circle.body.mass = radius * radius;

  circle.body.setVelocity(
    Phaser.Math.Between(-60, 60),
    Phaser.Math.Between(-60, 60)
  );

  scene.add.particles(0, 0, 'trail_particle', {
    speed: 0,
    lifespan: 300,
    scale: { start: radius / 20 * 0.8, end: 0 },
    alpha: { start: 0.4, end: 0 },
    blendMode: 'ADD',
    follow: circle,
    tint: color
  });

  nonPlayerCircles.add(circle);
  return circle;
}

function create() {
  for (let i = 0; i < 120; i++) {
    const x = Phaser.Math.Between(0, 800);
    const y = Phaser.Math.Between(0, 600);
    const radius = Phaser.Math.FloatBetween(0.5, 2);
    const alpha = Phaser.Math.FloatBetween(0.15, 0.75);
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
  
  player = this.add.circle(400, 300, 20, 0xff0000);
  this.physics.add.existing(player);
  player.body.setCircle(20);
  player.body.setCollideWorldBounds(false);
  player.body.setBounce(0, 0);
  player.body.setDrag(0, 0); 
  player.radius = 20;
  player.body.mass = 20 * 20;
  player.body.setVelocity(
    Phaser.Math.Between(-60, 60),
    Phaser.Math.Between(-60, 60)
  );

  this.add.particles(0, 0, 'trail_particle', {
    speed: 0,
    lifespan: 300,
    scale: { start: 0.8, end: 0 },
    alpha: { start: 0.4, end: 0 },
    blendMode: 'ADD',
    follow: player,
    tint: 0xff0000
  });

  nonPlayerCircles.add(player);
  
  const numCircles = N - 1;
  for (let i = 0; i < numCircles; i++) {
    const radius = Phaser.Math.Between(10, 30);
    let x, y, dist;
    do {
      x = Phaser.Math.Between(radius + 50, 800 - radius - 50);
      y = Phaser.Math.Between(radius + 50, 600 - radius - 50);
      dist = Phaser.Math.Distance.Between(x, y, player.x, player.y);
    } while (dist < rd);
    const color = Phaser.Utils.Array.GetRandom(colors);

    createPlanet(this, x, y, radius, color);
  }

  this.physics.add.collider(nonPlayerCircles, nonPlayerCircles, resolveElasticCollision);

  cursors = this.input.keyboard.createCursorKeys();

  massText = this.add.text(20, 20, "Black Hole Mass: " + gravityMass, {
    fontFamily: "'Outfit', 'Courier New', sans-serif",
    fontSize: "18px",
    fill: "#00ff00",
    fontStyle: "bold"
  });

  statusText = this.add.text(20, 45, "Status: Inactive (Click and hold to activate)", {
    fontFamily: "'Outfit', 'Courier New', sans-serif",
    fontSize: "12px",
    fill: "#8fa0c0"
  });

  playerText = this.add.text(player.x, player.y, p_name, {
    fontFamily: "'Outfit', 'Courier New', sans-serif",
    fontSize: "12px",
    fill: "#ffffff",
    fontStyle: "bold"
  }).setOrigin(0.5);

  this.input.on("wheel", function (pointer, gameObjects, deltaX, deltaY, deltaZ) {
    if (deltaY > 0) {
      gravityMass -= G;
    } else if (deltaY < 0) {
      gravityMass += G;
    }
    gravityMass = Phaser.Math.Clamp(gravityMass, -5000000, 5000000);

    massText.setText("Black Hole Mass: " + gravityMass);
    
    if (gravityMass > 0) {
      massText.setFill("#00ffff");
    } else if (gravityMass < 0) {
      massText.setFill("#ff4500");
    } else {
      massText.setFill("#00ff00");
    }
  });

  blackHoleGraphic = this.add.graphics();
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

  const allPlanets = nonPlayerCircles.getChildren();

  allPlanets.forEach((circle) => {
    circle.prevVx = circle.body.velocity.x;
    circle.prevVy = circle.body.velocity.y;
  });

  allPlanets.forEach((circleI) => {
    if (circleI.x < 0) {
      circleI.x = 800;
    } else if (circleI.x > 800) {
      circleI.x = 0;
    }
    if (circleI.y < 0) {
      circleI.y = 600;
    } else if (circleI.y > 600) {
      circleI.y = 0;
    }

    let netAccelX = 0;
    let netAccelY = 0;

    if (pointer.leftButtonDown()) {
      const dx = pointer.x - circleI.x;
      const dy = pointer.y - circleI.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const safeDistance = Math.max(distance, 15);
      
      const accelMag = gravityMass / (safeDistance * safeDistance);
      if (distance > 0.1) {
        netAccelX += accelMag * (dx / distance);
        netAccelY += accelMag * (dy / distance);
      }
    }

    allPlanets.forEach((circleJ) => {
      if (circleI === circleJ) return;

      const dx = circleJ.x - circleI.x;
      const dy = circleJ.y - circleI.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const safeDistance = Math.max(distance, circleI.radius + circleJ.radius);
      const massJ = circleJ.body.mass;
      const accelMag = (G_CONSTANT * massJ) / (safeDistance * safeDistance);

      if (distance > 0.1) {
        netAccelX += accelMag * (dx / distance);
        netAccelY += accelMag * (dy / distance);
      }
    });

    circleI.body.setAcceleration(netAccelX, netAccelY);
  });

  playerText.setPosition(player.x, player.y);
}