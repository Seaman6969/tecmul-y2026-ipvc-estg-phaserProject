const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#000000",
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

function preload() {}

function create() {
  // Define factor and inc FIRST
  const factor = 8;
  const inc = 10000;

  player = this.add.circle(400, 300, 20, 0xff0000);
  this.physics.add.existing(player);
  player.body.setCollideWorldBounds(true,1,1);
  player.body.setDrag(0, 0); // No drag = Newton's 1st law obeyed

  cursors = this.input.keyboard.createCursorKeys();

  // Display the actual gravityMass value (not divided)
  massText = this.add.text(16, 16, "Black Hole Mass: " + gravityMass, {
    fontSize: "20px",
    fill: "#00ff00",
  });

  this.input.on("wheel", function (pointer, gameObjects, deltaX, deltaY, deltaZ) {
    if (deltaY > 0) {
      gravityMass -= inc * factor; // Decrease mass
    } else if (deltaY < 0) {
      gravityMass += inc * factor; // Increase mass
    }

    // Allow negative mass, clamp within reasonable range
    gravityMass = Phaser.Math.Clamp(gravityMass, -5000000, 5000000);

    massText.setText("Black Hole Mass: " + gravityMass);
  });
}

function update() {
  const pointer = this.input.activePointer;

  if (pointer.leftButtonDown()) {
    const dx = pointer.x - player.x;
    const dy = pointer.y - player.y;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const safeDistance = Math.max(distance, 10);

    const accelMag = gravityMass / (safeDistance * safeDistance);
    const accelX = accelMag * (dx / distance);
    const accelY = accelMag * (dy / distance);

    player.body.setAcceleration(accelX, accelY);
  } else {
    player.body.setAcceleration(0, 0);
  }
}