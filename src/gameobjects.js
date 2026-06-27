// gameobjects.js
// This file contains reusable data, variables, and object definitions
// that are used by the main game creation flow.

// --- World settings ---
window.GameObjects = {
  world: {
    // World is scaled larger than the viewport so the camera can pan.
    scale: 16,
    // The number of background stars in the scene.
    starCount: 100,
    // The virtual world size will be computed from the viewport size.
  },

  // --- Camera settings ---
  camera: {
    speed: 4000,
  },

  // --- Starfield settings ---
  stars: {
    minRadius: 0.5,
    maxRadius: 1.5,
    minAlpha: 0.2,
    maxAlpha: 0.65,
    // size of the generated tile texture (kept modest to avoid huge allocations)
    tileSize: 1024,
    // how many stars to paint into each tile (more = denser sky when tiled)
    starsPerTile: 12000,
  },

  // --- Planet color palette ---
  colors: [
    0x00ffff,
    0x39ff14,
    0xff00ff,
    0xffff00,
    0xff7300,
    0x00e5ff,
    0xab00ff,
    0x00ff88,
  ],

  // --- Fixed planet setup ---
  fixedPlanetLayout: [
    { xFactor: 0.18, yFactor: 0.18, radius: 40, color: 0x3399ff },
    { xFactor: 0.83, yFactor: 0.20, radius: 35, color: 0xffaa00 },
    { xFactor: 0.18, yFactor: 0.83, radius: 45, color: 0x8a2be2 },
    { xFactor: 0.80, yFactor: 0.78, radius: 30, color: 0x22ff88 },
  ],

  // --- Orbital system definitions ---
  orbitalSystem: {
    centerPlanet: {
      radius: 200,
      color: 0x00ffff,
    },
    orbiters: [
      { orbitRadius: 950, radius: 50, color: 0xffcc33, angularSpeed: 0.1, startAngle: 0 },
      { orbitRadius: 1400, radius: 60, color: 0x33ffcc, angularSpeed: 0.09, startAngle: Math.PI * 0.4 },
      { orbitRadius: 2800, radius: 80, color: 0xff33bb, angularSpeed: 0.06, startAngle: Math.PI * 0.8 },
    ],
  },
};
