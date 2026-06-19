const G_CONSTANT = 300;

function resolveElasticCollision(obj1, obj2) {
  const m1 = obj1.physics?.mass ?? obj1.body.mass;
  const m2 = obj2.physics?.mass ?? obj2.body.mass;
  const v1x = obj1.prevSpeed?.x !== undefined ? obj1.prevSpeed.x : obj1.body.velocity.x;
  const v1y = obj1.prevSpeed?.y !== undefined ? obj1.prevSpeed.y : obj1.body.velocity.y;
  const v2x = obj2.prevSpeed?.x !== undefined ? obj2.prevSpeed.x : obj2.body.velocity.x;
  const v2y = obj2.prevSpeed?.y !== undefined ? obj2.prevSpeed.y : obj2.body.velocity.y;
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
  const newV1x = v1x + ix / m1;
  const newV1y = v1y + iy / m1;
  const newV2x = v2x - ix / m2;
  const newV2y = v2y - iy / m2;

  if (obj1.body) {
    obj1.body.velocity.x = newV1x;
    obj1.body.velocity.y = newV1y;
  }
  if (obj1.physics) {
    obj1.physics.speed.x = newV1x;
    obj1.physics.speed.y = newV1y;
  }

  if (obj2.body) {
    obj2.body.velocity.x = newV2x;
    obj2.body.velocity.y = newV2y;
  }
  if (obj2.physics) {
    obj2.physics.speed.x = newV2x;
    obj2.physics.speed.y = newV2y;
  }
}

function wrapPosition(circle, width, height) {
  if (circle.x < 0) {
    circle.x = width;
  } else if (circle.x > width) {
    circle.x = 0;
  }
  if (circle.y < 0) {
    circle.y = height;
  } else if (circle.y > height) {
    circle.y = 0;
  }
}

function stepPhysics(allEntities, pointer, gravityMass, width = 800, height = 600, delta = 16.666) {
  const dt = Math.max(delta, 1) / 1000;
  allEntities.forEach((entity) => {
    if (!entity.physics) return;
    if (!entity.prevSpeed) entity.prevSpeed = { x: 0, y: 0 };
    entity.prevSpeed.x = entity.physics.speed.x;
    entity.prevSpeed.y = entity.physics.speed.y;
  });

  allEntities.forEach((entity) => {
    if (!entity.physics) return;
    if (entity.physics.immovable) return;

    let netAccelX = 0;
    let netAccelY = 0;

    if (pointer && pointer.leftButtonDown()) {
      const dx = pointer.x - entity.x;
      const dy = pointer.y - entity.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const safeDistance = Math.max(distance, 15);
      const accelMag = gravityMass / (safeDistance * safeDistance);
      if (distance > 0.1) {
        netAccelX += accelMag * (dx / distance);
        netAccelY += accelMag * (dy / distance);
      }
    }

    allEntities.forEach((other) => {
      if (other === entity || !other.physics || !other.physics.attractsOthers) return;

      const dx = other.x - entity.x;
      const dy = other.y - entity.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const safeDistance = Math.max(distance, entity.radius + other.radius);
      const massJ = other.physics.mass;
      const accelMag = (G_CONSTANT * massJ) / (safeDistance * safeDistance);

      if (distance > 0.1) {
        netAccelX += accelMag * (dx / distance);
        netAccelY += accelMag * (dy / distance);
      }
    });

    entity.physics.speed.x += netAccelX * dt;
    entity.physics.speed.y += netAccelY * dt;

    if (entity.body && entity.body.moves) {
      entity.body.setVelocity(entity.physics.speed.x, entity.physics.speed.y);
    } else {
      entity.x += entity.physics.speed.x * dt;
      entity.y += entity.physics.speed.y * dt;
    }

    wrapPosition(entity, width, height);
  });
}

// Expose to global for non-module usage
window.G_CONSTANT = G_CONSTANT;
window.resolveElasticCollision = resolveElasticCollision;
window.stepPhysics = stepPhysics;
