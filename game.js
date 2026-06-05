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

// Collision resolution and physics step are in physics.js

// Planet creation moved to planets.js

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
    gravityMass = Phaser.Math.Clamp(gravityMass, -500000000, 500000000);

    massText.setText("Black Hole Mass: " + gravityMass);
    
    if (gravityMass > 0) {
      massText.setFill("#00ffff");
    } else if (gravityMass < 0) {
      massText.setFill("#ff4500");
    } else {
      massText.setFill("#00ff00");
    }
  });

  this.input.keyboard.on('keydown', function(event) {
    if (event.key === 'ArrowUp') {
      gravityMass += G;
    } else if (event.key === 'ArrowDown') {
      gravityMass -= G;
    } else if (event.key === '+' || event.key === '=') {
      gravityMass += G;
    } else if (event.key === '-') {
      gravityMass -= G;
    } else if (event.key === '0') {
      gravityMass = 0;
    } else {
      return;
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
  }, this);

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
  stepPhysics(allPlanets, pointer, gravityMass, this.scale.width, this.scale.height);

  playerText.setPosition(player.x, player.y);
}