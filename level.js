// ------------ Level creation and management ------------

let ground;
let platforms;
let spikes;
let coins;
let finishFlag;
let cubes;
let powerUps;
let decorTrees;
let missiles;
let enemies;

// Cached layout values (set in buildLevel)
let GROUND_TOP_Y = 0;

// Procedural generation state
let GEN_NEXT_X = 0;
let GEN_SEED = 0;
const GEN = {
  viewAhead: 1200, // how far ahead of the player we generate
  cleanupBehind: 1600, // how far behind we remove generated decor/platforms/cubes
  platformStep: 420, // equal spacing between platforms

  // Fixed heights (same Y for all)
  platformYRef: 250, // design-space Y (scaled with sy)
  cubeYFactor: 0.65, // screen-space factor (height * factor)

  // Difficulty: random vertical variation (±px)
  // - platforms: keep variation for difficulty
  // - cubes: fixed height as requested
  platformYJitter: 100,
  cubeYJitter: 0,

  platformW: 200,
  platformH: 28,
};

function initLevelGroups() {
  // Groups
  platforms = new Group();
  platforms.collider = "static";
  platforms.color = color("#2c7a7b"); // teal

  spikes = new Group();
  spikes.collider = "static";
  spikes.color = color("#ef4444"); // red

  coins = new Group();
  coins.collider = "static"; // no physics push; we'll use overlap
  coins.color = color("#fbbf24"); // amber

  cubes = new Group();
  cubes.collider = "static";
  cubes.color = color("#fbbf24"); // amber/yellow

  powerUps = new Group();
  powerUps.collider = "dynamic"; // Les power-ups peuvent bouger
  powerUps.color = color("#ef4444"); // red

  // Decorative trees (no collisions, purely visual)
  decorTrees = new Group();
  decorTrees.collider = "none";
  // Toujours au fond (dessinés derrière le reste)
  // (p5play: plus petit layer = plus arrière)
  decorTrees.layer = -20;

  // Missiles (player projectiles)
  missiles = new Group();
  missiles.collider = "dynamic";
  missiles.color = color("#f97316"); // orange

  // Enemies (burger/pizza)
  enemies = new Group();
  enemies.collider = "dynamic";
  enemies.color = color("#111827");
}

function buildLevel() {
  // Scale Y layout to the current screen height so the level stays readable
  const sy = height / GAME.designH;

  // Ground: utiliser le SVG plateforme au lieu du rectangle vert
  // Créer un sol plus long et plus haut pour la génération continue
  const groundLength = Math.max(GAME.levelLength, 10000); // Au moins 10000 pixels
  const groundHeight = 100; // Hauteur du sol augmentée (au lieu de 70)
  const groundY = height - groundHeight / 2; // Centrer le sol plus haut
  ground = new Sprite(groundLength / 2, groundY, groundLength, groundHeight, "static");
  GROUND_TOP_Y = groundY - groundHeight / 2;
  ground.draw = () => {
    if (typeof mapAssets !== "undefined" && mapAssets.ground && mapAssets.ground.width) {
      // Dessiner le SVG sol en répétition
      push();
      imageMode(CORNER);
      const platformHeight = groundHeight;
      // Utiliser le ratio d'aspect réel du SVG pour éviter la déformation
      const aspectRatio = (mapAssets.ground.width || 200) / (mapAssets.ground.height || 100);
      const platformWidth = platformHeight * aspectRatio; // Préserver le ratio d'aspect
      const overlap = 2; // Chevauchement de 5px pour éviter les espaces
      const numPlatforms = Math.ceil(groundLength / (platformWidth - overlap)) + 3; // +3 pour la marge
      
      // Commencer un peu avant pour le parallaxe
      const parallaxOffset = camera.x % (platformWidth - overlap);
      const startX = -groundLength / 2 - parallaxOffset;
      
      // Dessiner les blocs avec un léger chevauchement horizontal pour éviter les espaces
      for (let i = 0; i < numPlatforms; i++) {
        const x = startX + i * (platformWidth - overlap); // Position avec chevauchement
        const y = -platformHeight / 2;
        // Dessiner le bloc sans déformation (ratio préservé)
        image(mapAssets.ground, x, y, platformWidth, platformHeight);
      }
      pop();
    } else {
      // Fallback si l'image n'est pas chargée
      noStroke();
      fill("#8B7355");
      rect(-groundLength / 2, -groundHeight / 2, groundLength, groundHeight);
    }
  };

  // Spikes (obstacles) - ajustés pour le sol plus haut
  // Keep them mostly on ground so the rule "avoid obstacles" is clear
  const spikeH = 38;
  const spikeY = GROUND_TOP_Y - spikeH / 2; // Base du collider pile sur le sol
  addSpike(680, spikeY, 48, spikeH);
  addSpike(960, spikeY, 48, spikeH);
  addSpike(2050, spikeY, 48, spikeH);
  addSpike(2120, spikeY, 48, spikeH);
  addSpike(3300, spikeY, 48, spikeH);
  addSpike(3365, spikeY, 48, spikeH);
  addSpike(3700, spikeY, 48, spikeH);
  addSpike(4480, spikeY, 48, spikeH);

  // Finish flag - ajusté pour le sol plus haut
  // Poser le drapeau au-dessus du sol (base alignée sur GROUND_TOP_Y)
  const flagH = 160;
  const flagW = 60;
  const flagY = GROUND_TOP_Y - flagH / 2 - 2; // -2: un tout petit espace au-dessus du sol
  finishFlag = new Sprite(GAME.levelLength - 140, flagY, flagW, flagH, "static");
  finishFlag.color = color("#a855f7"); // fallback color
  finishFlag.draw = () => {
    const img = typeof mapAssets !== "undefined" ? mapAssets.drapeau : null;
    if (img && img.width) {
      push();
      imageMode(CENTER);
      noTint();
      const aspect = (img.width || 1) / (img.height || 1);
      const targetH = finishFlag.h * 1.05;
      const targetW = targetH * aspect;
      // Ancrer le bas de l'image sur le bas du sprite
      const yOff = (finishFlag.h - targetH) * 0.5;
      image(img, 0, yOff, targetW, targetH);
      pop();
      return;
    }

    // Fallback si SVG non chargé
    noStroke();
    fill("#f8fafc");
    rect(0, 0, finishFlag.w * 0.18, finishFlag.h, 6);
    fill("#a855f7");
    const poleX = -finishFlag.w * 0.1;
    triangle(
      poleX + finishFlag.w * 0.2,
      -finishFlag.h * 0.28,
      poleX + finishFlag.w * 0.2,
      -finishFlag.h * 0.05,
      poleX + finishFlag.w * 0.95,
      -finishFlag.h * 0.16
    );
  };
}

// ------------ Procedural generation (platforms + cubes + decor trees) ------------

function initMapGeneration() {
  // New seed each run for "random" layouts
  GEN_SEED = Math.floor(Math.random() * 1_000_000_000);
  randomSeed(GEN_SEED);

  // Clear any previously generated elements (safe even if already cleared)
  platforms?.removeAll();
  cubes?.removeAll();
  decorTrees?.removeAll();
  enemies?.removeAll();

  // Start a bit ahead of the player
  const startX = (typeof player !== "undefined" && player) ? player.x + 300 : 300;
  GEN_NEXT_X = Math.max(300, startX);

  // Generate an initial buffer so it's visible immediately
  updateMapGeneration(true);
}

function updateMapGeneration(force = false) {
  if (typeof player === "undefined" || !player) return;
  if (typeof gameState !== "undefined" && gameState === "boss") return;

  // Fixed heights (+ optional jitter)
  const sy = height / GAME.designH;
  const basePlatformY = GEN.platformYRef * sy;
  const baseCubeY = height * GEN.cubeYFactor;

  // Clamp so nothing spawns inside the ground or off-screen
  const platformMinY = 90;
  const platformMaxY = Math.max(90, GROUND_TOP_Y - 170);
  const cubeMinY = 70;
  const cubeMaxY = Math.max(70, GROUND_TOP_Y - 120);

  // Do not generate anything past the finish flag
  const stopX =
    typeof finishFlag !== "undefined" && finishFlag ? finishFlag.x - 220 : Infinity;
  const targetX = Math.min(player.x + GEN.viewAhead, stopX);
  if (!force && GEN_NEXT_X > targetX) {
    cleanupGenerated();
    return;
  }

  while (GEN_NEXT_X <= targetX) {
    const step = GEN.platformStep;

    // Always spawn a platform at equal spacing
    const platformY = constrain(
      basePlatformY + random(-GEN.platformYJitter, GEN.platformYJitter),
      platformMinY,
      platformMaxY
    );
    addPlatform(GEN_NEXT_X, platformY, GEN.platformW, GEN.platformH);

    // Always spawn a coin above each platform
    addCoin(GEN_NEXT_X, platformY - 60);

    // Spawn cubes between platforms (random), but at an equal/fixed height
    if (random() < 0.55) {
      const cubeX = GEN_NEXT_X + step * random(0.35, 0.75);
      const cubeY = constrain(
        baseCubeY + random(-GEN.cubeYJitter, GEN.cubeYJitter),
        cubeMinY,
        cubeMaxY
      );
      addCube(cubeX, cubeY);
    }

    // Decorative tree on/near the ground (random spacing and random type)
    // Désactivé : arbres retirés
    // if (random() < 0.8) {
    //   addDecorTree(GEN_NEXT_X + random(-120, 120));
    // }

    // Enemy on the ground (rare)
    if (random() < 0.35) {
      const enemyX = GEN_NEXT_X + step * random(0.25, 0.9);
      addEnemy(enemyX);
    }

    GEN_NEXT_X += step;
  }

  cleanupGenerated();
}

function cleanupGenerated() {
  if (typeof player === "undefined" || !player) return;
  const minX = player.x - GEN.cleanupBehind;

  for (const p of platforms) {
    if (p && p.x < minX) p.remove();
  }
  for (const c of cubes) {
    if (c && c.x < minX) c.remove();
  }
  for (const t of decorTrees) {
    if (t && t.x < minX) t.remove();
  }
  for (const e of enemies) {
    if (e && e.x < minX) e.remove();
  }
  for (const coin of coins) {
    // Only cleanup coins that were generated procedurally (keep things bounded)
    if (coin && coin.x < minX) coin.remove();
  }
}

function addEnemy(x) {
  if (typeof enemies === "undefined" || !enemies) return null;

  const w = 80;
  const h = 70;
  const y = GROUND_TOP_Y - h / 2;

  const e = new enemies.Sprite(x, y, w, h);
  e.rotationLock = true;
  e.friction = 0.0;
  e.bounciness = 0;
  e._hp = 1;
  e._type = random() < 0.5 ? "burger" : "pizza";
  e._dir = random() < 0.5 ? -1 : 1;
  e._speed = random(1.6, 2.6);
  e._lastTurnFrame = 0;

  e.draw = () => {
    const img =
      typeof mapAssets !== "undefined" && mapAssets ? mapAssets[e._type] : null;
    if (img && img.width) {
      push();
      imageMode(CENTER);
      noTint();
      const aspect = (img.width || 1) / (img.height || 1);
      const targetH = e.h * 1.4;
      const targetW = targetH * aspect;
      // Ancrer bas image sur bas collider
      const yOff = (e.h - targetH) * 0.5 + 1;
      image(img, 0, yOff, targetW, targetH);
      pop();
      return;
    }
    // fallback
    noStroke();
    fill(17, 24, 39);
    rect(0, 0, e.w, e.h, 10);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(12);
    text(e._type === "pizza" ? "PIZZA" : "BURGER", 0, 0);
  };

  return e;
}

function addDecorTree(x) {
  if (typeof decorTrees === "undefined" || !decorTrees) return null;

  const treeH = 190;
  const treeW = 150;
  // Placer le bas du sprite pile sur le sol
  const y = GROUND_TOP_Y - treeH / 2;

  const t = new decorTrees.Sprite(x, y, treeW, treeH);
  t.collider = "none";
  t.rotationLock = true;
  t._treeIndex = Math.floor(random(0, 3));
  t._parallax = random(0.78, 0.9); // slower than world to feel "in the back"
  t.layer = -20;

  t.draw = () => {
    const imgs = typeof mapAssets !== "undefined" ? mapAssets.trees : null;
    const img = imgs && Array.isArray(imgs) ? imgs[t._treeIndex] : null;

    if (img && img.width) {
      push();
      imageMode(CENTER);
      // Arbres au fond mais OPAQUES
      noTint();
      const parallaxOffsetX =
        typeof camera !== "undefined" ? -camera.x * (1 - t._parallax) : 0;
      translate(parallaxOffsetX, 0);
      const aspect = (img.width || 100) / (img.height || 100);
      const h = treeH * 0.9; // légèrement plus petit pour le "fond"
      const w = h * aspect;
      // Ancrer le bas de l'image sur le bas du sprite (sinon ça "flotte")
      const yOff = (treeH - h) * 0.5;
      image(img, 0, yOff, w, h);
      pop();
    } else {
      // Visible fallback if image didn't load
      noStroke();
      fill(34, 197, 94, 140);
      rect(0, 0, treeW * 0.55, treeH, 16);
      fill(120, 53, 15, 160);
      rect(0, treeH * 0.25, treeW * 0.18, treeH * 0.45, 8);
    }
  };

  return t;
}

function addPlatform(x, y, w, h) {
  const p = new platforms.Sprite(x, y, w, h);
  p.stroke = color(0, 0, 0, 0);
  
  // Utiliser le SVG plateforme au lieu de la couleur bleue
  // Un seul SVG par plateforme, centré
  p.draw = () => {
    if (typeof mapAssets !== "undefined" && mapAssets.platform && mapAssets.platform.width) {
      push();
      imageMode(CENTER);
      // Utiliser la hauteur de la plateforme pour déterminer la taille du SVG
      const svgHeight = p.h;
      // Utiliser le ratio d'aspect réel du SVG
      const aspectRatio = (mapAssets.platform.width || 200) / (mapAssets.platform.height || 100);
      const svgWidth = svgHeight * aspectRatio;
      
      // Dessiner un seul SVG centré (pas de répétition)
      image(mapAssets.platform, 0, 0, svgWidth, svgHeight);
      pop();
    } else {
      // Fallback si l'image n'est pas chargée
      noStroke();
      fill("#2c7a7b"); // teal
      rect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
  };
  
  return p;
}

function addSpike(x, y, w, h) {
  const s = new spikes.Sprite(x, y, w, h);
  s.draw = () => {
    const img = typeof mapAssets !== "undefined" ? mapAssets.cactus : null;
    if (img && img.width) {
      push();
      imageMode(CENTER);
      const aspect = (img.width || 1) / (img.height || 1);
      // Un cactus est naturellement plus haut qu'un pic: on le dessine un peu plus grand
      const drawH = s.h * 2.2;
      const drawW = drawH * aspect;
      // Ancrer la base du cactus sur le bas du collider (posé sur le sol)
      const yOff = (s.h - drawH) * 0.5 + 1;
      image(img, 0, yOff, drawW, drawH);
      pop();
    } else {
      // Fallback si l'image n'est pas chargée
      noStroke();
      fill("#ef4444");
      // Triangle spike
      triangle(-s.w * 0.5, s.h * 0.5, s.w * 0.5, s.h * 0.5, 0, -s.h * 0.5);
      // Small base
      fill("#b91c1c");
      rect(0, s.h * 0.35, s.w * 0.9, s.h * 0.3, 4);
    }
  };
  return s;
}

function addCoin(x, y) {
  const c = new coins.Sprite(x, y, 22, 22);
  c.draw = () => {
    const img = typeof mapAssets !== "undefined" && mapAssets.piece ? mapAssets.piece : null;
    if (img && img.width) {
      push();
      imageMode(CENTER);
      noTint();
      const aspect = (img.width || 1) / (img.height || 1);
      const targetH = c.h * 1.2;
      const targetW = targetH * aspect;
      image(img, 0, 0, targetW, targetH);
      pop();
    } else {
      // Fallback si l'image n'est pas chargée
      noStroke();
      fill("#fbbf24");
      circle(0, 0, 20);
      fill("#fde68a");
      circle(-3, -3, 7);
    }
  };
  return c;
}

function addCube(x, y) {
  const cube = new cubes.Sprite(x, y, 60, 60); // Taille augmentée pour plus de visibilité
  cube.hit = false; // Pour savoir si le cube a déjà été frappé
  cube.color = color("#fbbf24"); // Couleur de fond par défaut (jaune)
  cube.stroke = color(0, 0, 0, 0); // Pas de bordure
  
  cube.draw = () => {
    // Toujours dessiner le cube, même si l'image n'est pas chargée
    if (cube.hit) {
      // Cube frappé : afficher un bloc vide/gris (comme dans Mario)
      push();
      rectMode(CENTER);
      noStroke();
      fill(100, 100, 100); // Gris
      rect(0, 0, cube.w, cube.h, 4);
      fill(80, 80, 80);
      rect(0, 0, cube.w - 4, cube.h - 4, 2);
      pop();
    } else {
      // Vérifier si l'image est chargée
      const cubeImageLoaded = typeof mapAssets !== "undefined" && mapAssets.cube && mapAssets.cube.width && mapAssets.cube.width > 0;
      
      if (cubeImageLoaded) {
        push();
        imageMode(CENTER);
        // Utiliser le ratio d'aspect réel du SVG
        const aspectRatio = (mapAssets.cube.width || 60) / (mapAssets.cube.height || 60);
        const cubeSize = cube.w;
        const cubeWidth = cubeSize;
        const cubeHeight = cubeSize / aspectRatio;
        image(mapAssets.cube, 0, 0, cubeWidth, cubeHeight);
        pop();
      } else {
        // Fallback TRÈS visible si l'image n'est pas chargée
        push();
        rectMode(CENTER);
        noStroke();
        fill(255, 200, 0); // Jaune très vif
        rect(0, 0, cube.w, cube.h, 6);
        fill(255, 150, 0); // Orange
        rect(0, 0, cube.w - 4, cube.h - 4, 4);
        fill(0, 0, 0); // Noir pour le texte
        textSize(32);
        textAlign(CENTER, CENTER);
        textStyle(BOLD);
        text("?", 0, 0);
        // Contour très épais pour le rendre ultra visible
        stroke(255, 100, 0);
        strokeWeight(4);
        noFill();
        rect(0, 0, cube.w, cube.h, 6);
        pop();
      }
    }
  };
  
  return cube;
}
