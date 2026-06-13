const G_CONSTANT = 300;

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

function stepPhysics(allPlanets, fixedPlanets = [], pointer, gravityMass, width = 800, height = 600) {
  allPlanets.forEach((circle) => {
    circle.prevVx = circle.body.velocity.x;
    circle.prevVy = circle.body.velocity.y;
  });

  allPlanets.forEach((circleI) => {
    wrapPosition(circleI, width, height);

    let netAccelX = 0;
    let netAccelY = 0;

    if (pointer && pointer.leftButtonDown()) {
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

    fixedPlanets.forEach((fixedPlanet) => {
      const dx = fixedPlanet.x - circleI.x;
      const dy = fixedPlanet.y - circleI.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const safeDistance = Math.max(distance, circleI.radius + fixedPlanet.radius);
      const massJ = fixedPlanet.body.mass;
      const accelMag = (G_CONSTANT * massJ) / (safeDistance * safeDistance);

      if (distance > 0.1) {
        netAccelX += accelMag * (dx / distance);
        netAccelY += accelMag * (dy / distance);
      }
    });

    circleI.body.setAcceleration(netAccelX, netAccelY);
  });
}

// Expose to global for non-module usage
window.G_CONSTANT = G_CONSTANT;
window.resolveElasticCollision = resolveElasticCollision;
window.stepPhysics = stepPhysics;
