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

function createFixedPlanet(scene, x, y, radius, color) {
  const circle = scene.add.circle(x, y, radius, color);
  scene.physics.add.existing(circle);

  circle.body.setCircle(radius);
  circle.body.setCollideWorldBounds(false);
  circle.body.setImmovable(true);
  circle.body.moves = false;
  circle.body.setBounce(0, 0);
  circle.body.setDrag(0, 0);

  circle.radius = radius;
  circle.body.mass = radius * radius * 4;

  return circle;
}

// Expose to global for non-module usage
window.createPlanet = createPlanet;
window.createFixedPlanet = createFixedPlanet;
