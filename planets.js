function createPlanet(scene, x, y, radius, color) {
  const circle = scene.add.circle(x, y, radius, color);
  scene.physics.add.existing(circle);
  
  circle.body.setCircle(radius);
  circle.body.setCollideWorldBounds(false);
  circle.body.setImmovable(true);
  circle.body.moves = false;
  circle.body.allowGravity = false;
  circle.body.setBounce(0, 0);
  circle.body.setDrag(0, 0);
  
  circle.radius = radius;
  circle.body.mass = radius * radius * 4;
  circle.physics = {
    mass: radius * radius * 4,
    attractsOthers: true,
    speed: { x: 0, y: 0 },
    immovable: true
  };

  scene.add.particles(0, 0, 'trail_particle', {
    speed: 0,
    lifespan: 300,
    scale: { start: radius / 20 * 0.8, end: 0 },
    alpha: { start: 0.4, end: 0 },
    blendMode: 'ADD',
    follow: circle,
    tint: color
  });

  if (nonPlayerCircles) {
    nonPlayerCircles.add(circle);
  }

  if (fixedPlanets) {
    fixedPlanets.push(circle);
  }

  if (physicsEntities) {
    physicsEntities.push(circle);
  }

  return circle;
}

function createFixedPlanet(scene, x, y, radius, color) {
  const circle = scene.add.circle(x, y, radius, color);
  scene.physics.add.existing(circle);

  circle.body.setCircle(radius);
  circle.body.setCollideWorldBounds(false);
  circle.body.setImmovable(true);
  circle.body.moves = false;
  circle.body.allowGravity = false;
  circle.body.setBounce(0, 0);
  circle.body.setDrag(0, 0);

  circle.radius = radius;
  circle.body.mass = radius * radius * 4;
  circle.physics = {
    mass: radius * radius * 4,
    attractsOthers: true,
    speed: { x: 0, y: 0 },
    immovable: true
  };

  if (nonPlayerCircles) {
    nonPlayerCircles.add(circle);
  }

  if (physicsEntities) {
    physicsEntities.push(circle);
  }

  return circle;
}

function createOrbitingPlanet(scene, centerPlanet, orbitRadius, radius, color, angularSpeed, startAngle = 0) {
  const x = centerPlanet.x + Math.cos(startAngle) * orbitRadius;
  const y = centerPlanet.y + Math.sin(startAngle) * orbitRadius;
  const circle = scene.add.circle(x, y, radius, color);
  scene.physics.add.existing(circle);

  circle.body.setCircle(radius);
  circle.body.setCollideWorldBounds(false);
  circle.body.setImmovable(true);
  circle.body.moves = false;
  circle.body.allowGravity = false;
  circle.body.setBounce(0, 0);
  circle.body.setDrag(0, 0);

  circle.radius = radius;
  circle.body.mass = radius * radius * 2;
  circle.physics = {
    mass: radius * radius * 2,
    attractsOthers: true,
    speed: { x: 0, y: 0 },
    immovable: true,
    orbit: {
      center: centerPlanet,
      radius: orbitRadius,
      angle: startAngle,
      angularSpeed: angularSpeed
    }
  };

  if (nonPlayerCircles) {
    nonPlayerCircles.add(circle);
  }

  if (physicsEntities) {
    physicsEntities.push(circle);
  }

  return circle;
}

// Expose to global for non-module usage
window.createPlanet = createPlanet;
window.createFixedPlanet = createFixedPlanet;
window.createOrbitingPlanet = createOrbitingPlanet;

