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
// NEW: Global variables so we can change the mass and update the UI
let gravityMass = 1000000;
let massText;

function preload() {}

function create() {
  // 1. CREATE THE DRONE
  player = this.add.circle(400, 300, 20, 0xff0000);
  this.physics.add.existing(player);
  player.body.setCollideWorldBounds(true);
  player.body.setMaxVelocity(800);
  player.body.setDrag(100, 100); // Lowered drag slightly so it orbits better

  cursors = this.input.keyboard.createCursorKeys();

  // 2. CREATE THE UI TEXT
  // Print the starting mass in the top left corner
  massText = this.add.text(16, 16, "Black Hole Mass: " + gravityMass, {
    fontSize: "20px",
    fill: "#00ff00",
  });

  // 3. LISTEN FOR THE SCROLL WHEEL
  // Phaser's built-in event for the mouse wheel
  this.input.on(
    "wheel",
    function (pointer, gameObjects, deltaX, deltaY, deltaZ) {
      // deltaY tells us which way the wheel scrolled
      if (deltaY > 0) {
        gravityMass -= 17; // Scrolled DOWN: Decrease mass
      } else if (deltaY < 0) {
        gravityMass += 17; // Scrolled UP: Increase mass
      }

      // Clamp the mass so it doesn't go below zero or get ridiculously high
      gravityMass = Phaser.Math.Clamp(gravityMass, 0, 5000000);

      // Update the text on the screen
      massText.setText("Black Hole Mass: " + gravityMass);
    },
  );
}

function update() {
  const pointer = this.input.activePointer;

  if (pointer.leftButtonDown()) {
    const dx = pointer.x - player.x;
    const dy = pointer.y - player.y;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const safeDistance = Math.max(distance, 10);

    // 4. APPLY THE DYNAMIC MASS
    // We removed the 'const' here so it uses the global variable we are changing with the wheel!
    const accelMag = gravityMass / (safeDistance * safeDistance);

    const accelX = accelMag * (dx / distance);
    const accelY = accelMag * (dy / distance);

    player.body.setAcceleration(accelX, accelY);
  } else {
    player.body.setAcceleration(0, 0);
  }
}
