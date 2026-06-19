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
  // mass proportional to volume ~ radius^3 so larger planets have stronger gravity
  circle.body.mass = Math.pow(radius, 3);
  circle.physics = {
    mass: Math.pow(radius, 3),
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
  // mass proportional to volume ~ radius^3
  circle.body.mass = Math.pow(radius, 3);
  circle.physics = {
    mass: Math.pow(radius, 3),
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
  // helper: compute angular speed based on orbit radius so more distant planets orbit slower
  function angularSpeedForRadius(orbitRadius, baseAngular) {
    // reference radius used to normalize speeds (tweakable)
    const REF = 1000;
    // min/max angular speeds (radians per second)
    const MIN = 0.01;
    const MAX = 0.12;
    // scale factor: sqrt(reference / orbitRadius) -> farther -> smaller
    const scale = Math.sqrt(Math.max(1, REF) / Math.max(1, orbitRadius));
    if (baseAngular === undefined || baseAngular === null) {
      // compute default within min/max
      const val = MAX * scale;
      return Math.max(MIN, Math.min(MAX, val));
    }
    // scale provided angular speed so it respects distance
    return Math.max(MIN, Math.min(MAX, baseAngular * scale));
  }
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
  // mass proportional to volume ~ radius^3
  circle.body.mass = Math.pow(radius, 3);
  // compute angular speed based on radius (scales provided value if present)
  const computedAngular = angularSpeedForRadius(orbitRadius, angularSpeed);
  circle.physics = {
    mass: Math.pow(radius, 3),
    attractsOthers: true,
    speed: { x: 0, y: 0 },
    immovable: true,
    orbit: {
      center: centerPlanet,
      radius: orbitRadius,
      angle: startAngle,
      angularSpeed: computedAngular
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

