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

const G_CONSTANT = 300; 

const colors = [
  0x00ffff, // Cyan
  0x39ff14, // Neon Green
  0xff00ff, // Magenta
  0xffff00, // Neon Yellow
  0xff7300, // Bright Orange
  0x00e5ff, // Electric Blue
  0xab00ff, // Intense Purple
  0x00ff88  // Mint Green
];

function preload() {}

function createPlanet(scene, x, y, radius, color) {
  const circle = scene.add.circle(x, y, radius, color);
  scene.physics.add.existing(circle);
  
  circle.body.setCircle(radius);
  circle.body.setCollideWorldBounds(true, 1, 1);
  circle.body.setBounce(1, 1);
  circle.body.setDrag(0, 0);
  
  circle.radius = radius;
  circle.body.mass = radius * radius;
  circle.body.setVelocity(
    Phaser.Math.Between(-60, 60),
    Phaser.Math.Between(-60, 60)
  );

  // Attach Trail to Circle
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
  const factor = 8;
  const inc = 10000;

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
  
  player = this.add.circle(400, 300, 20, 0xff0000);
  this.physics.add.existing(player);
  player.body.setCircle(20);
  player.body.setCollideWorldBounds(true, 1, 1);
  player.body.setBounce(1, 1);
  player.body.setDrag(0, 0); 
  player.radius = 20;
  player.body.mass = 20 * 20;

  this.add.particles(0, 0, 'trail_particle', {
    speed: 0,
    lifespan: 300,
    scale: { start: 0.8, end: 0 },
    alpha: { start: 0.4, end: 0 },
    blendMode: 'ADD',
    follow: player,
    tint: 0xff0000
  });

  nonPlayerCircles = this.physics.add.group();
  
  const numCircles = 12;
  for (let i = 0; i < numCircles; i++) {
    const radius = Phaser.Math.Between(10, 30);
    const x = Phaser.Math.Between(radius + 50, 800 - radius - 50);
    const y = Phaser.Math.Between(radius + 50, 600 - radius - 50);
    const color = Phaser.Utils.Array.GetRandom(colors);

    createPlanet(this, x, y, radius, color);
  }

  this.physics.add.collider(player, nonPlayerCircles);
  this.physics.add.collider(nonPlayerCircles, nonPlayerCircles);

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

  this.input.on("wheel", function (pointer, gameObjects, deltaX, deltaY, deltaZ) {
    if (deltaY > 0) {
      gravityMass -= inc * factor;
    } else if (deltaY < 0) {
      gravityMass += inc * factor;
    }
    gravityMass = Phaser.Math.Clamp(gravityMass, -5000000, 5000000);

    massText.setText("Black Hole Mass: " + gravityMass);
    
    if (gravityMass > 0) {
      massText.setFill("#00ffff"); // Attractive (Cyan)
    } else if (gravityMass < 0) {
      massText.setFill("#ff4500"); // Repulsive (Red-Orange)
    } else {
      massText.setFill("#00ff00"); // Neutral (Green)
    }
  });

  blackHoleGraphic = this.add.graphics();

  this.time.addEvent({
    delay: 16000,
    callback: () => {
      const radius = Phaser.Math.Between(10, 30);
      const x = Phaser.Math.Between(radius + 50, 800 - radius - 50);
      const y = Phaser.Math.Between(radius + 50, 600 - radius - 50);
      const color = Phaser.Utils.Array.GetRandom(colors);
      createPlanet(this, x, y, radius, color);
    },
    callbackScope: this,
    loop: true
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
  const allPlanets = [player, ...nonPlayerCircles.getChildren()];

  allPlanets.forEach((circleI) => {
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
}