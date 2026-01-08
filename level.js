// ------------ Level creation and management ------------

let ground;
let platforms;
let spikes;
let coins;
let finishFlag;
let cubes;
let powerUps;

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
  ground.draw = () => {
    if (typeof mapAssets !== "undefined" && mapAssets.platform && mapAssets.platform.width) {
      // Dessiner le SVG plateforme en répétition
      push();
      imageMode(CORNER);
      const platformHeight = groundHeight;
      // Utiliser le ratio d'aspect réel du SVG pour éviter la déformation
      const aspectRatio = (mapAssets.platform.width || 200) / (mapAssets.platform.height || 100);
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
        image(mapAssets.platform, x, y, platformWidth, platformHeight);
      }
      pop();
    } else {
      // Fallback si l'image n'est pas chargée
      noStroke();
      fill("#8B7355");
      rect(-groundLength / 2, -groundHeight / 2, groundLength, groundHeight);
    }
  };

  // A few floating platforms (simple handcrafted "beats")
  // Toutes les plateformes ont maintenant la même taille
  // Plateformes plus hautes (multiplier par un facteur plus petit pour les monter)
  const platformWidth = 200; // Largeur fixe pour toutes les plateformes
  const platformHeight = 28; // Hauteur fixe pour toutes les plateformes
  addPlatform(450, 350 * sy, platformWidth, platformHeight); // Plus haut (420 -> 350)
  addPlatform(820, 290 * sy, platformWidth, platformHeight); // Plus haut (360 -> 290)
  addPlatform(1180, 230 * sy, platformWidth, platformHeight); // Plus haut (300 -> 230)
  addPlatform(1550, 310 * sy, platformWidth, platformHeight); // Plus haut (380 -> 310)
  addPlatform(1900, 250 * sy, platformWidth, platformHeight); // Plus haut (320 -> 250)
  addPlatform(2250, 190 * sy, platformWidth, platformHeight); // Plus haut (260 -> 190)
  addPlatform(2650, 270 * sy, platformWidth, platformHeight); // Plus haut (340 -> 270)
  addPlatform(3100, 220 * sy, platformWidth, platformHeight); // Plus haut (290 -> 220)
  addPlatform(3520, 290 * sy, platformWidth, platformHeight); // Plus haut (360 -> 290)
  addPlatform(3970, 230 * sy, platformWidth, platformHeight); // Plus haut (300 -> 230)
  addPlatform(4400, 260 * sy, platformWidth, platformHeight); // Plus haut (330 -> 260)
  addPlatform(4800, 210 * sy, platformWidth, platformHeight); // Plus haut (280 -> 210)

  // Spikes (obstacles) - ajustés pour le sol plus haut
  // Keep them mostly on ground so the rule "avoid obstacles" is clear
  const spikeY = groundY - groundHeight / 2 - 15; // Sur le sol, légèrement au-dessus
  addSpike(680, spikeY, 48, 38);
  addSpike(960, spikeY, 48, 38);
  addSpike(2050, spikeY, 48, 38);
  addSpike(2120, spikeY, 48, 38);
  addSpike(3300, spikeY, 48, 38);
  addSpike(3365, spikeY, 48, 38);
  addSpike(3700, spikeY, 48, 38);
  addSpike(4480, spikeY, 48, 38);

  // Coins (collectibles) - place near platforms to encourage jumping/moving
  // Ajustés pour correspondre aux nouvelles positions des plateformes
  addCoin(450, 300 * sy); // Ajusté pour la plateforme à 350
  addCoin(820, 240 * sy); // Ajusté pour la plateforme à 290
  addCoin(1180, 180 * sy); // Ajusté pour la plateforme à 230
  addCoin(1550, 260 * sy); // Ajusté pour la plateforme à 310
  addCoin(1900, 200 * sy); // Ajusté pour la plateforme à 250
  addCoin(2250, 140 * sy); // Ajusté pour la plateforme à 190
  addCoin(2650, 220 * sy); // Ajusté pour la plateforme à 270
  addCoin(3100, 170 * sy); // Ajusté pour la plateforme à 220
  addCoin(3520, 240 * sy); // Ajusté pour la plateforme à 290
  addCoin(3970, 180 * sy); // Ajusté pour la plateforme à 230
  addCoin(4400, 210 * sy); // Ajusté pour la plateforme à 260
  addCoin(4800, 160 * sy); // Ajusté pour la plateforme à 210

  // Cubes (question blocks) - place them lower to avoid platforms
  // Positionner les cubes plus bas, environ aux 2/3 de la hauteur pour éviter les plateformes
  const cubeY = height * 0.65; // Plus bas que la mi-hauteur pour éviter les plateformes
  addCube(600, cubeY);
  addCube(1000, cubeY);
  addCube(1400, cubeY);
  addCube(1800, cubeY);
  addCube(2400, cubeY);
  addCube(2800, cubeY);
  addCube(3200, cubeY);
  addCube(3600, cubeY);
  addCube(4100, cubeY);
  addCube(4600, cubeY);

  // Finish flag - ajusté pour le sol plus haut
  finishFlag = new Sprite(GAME.levelLength - 140, groundY - 70, 26, 140, "static");
  finishFlag.color = color("#a855f7"); // purple
  finishFlag.draw = () => {
    // Pole
    noStroke();
    fill("#f8fafc");
    rect(0, 0, finishFlag.w * 0.25, finishFlag.h, 6);

    // Flag cloth (simple triangle)
    fill("#a855f7");
    const poleX = -finishFlag.w * 0.15;
    triangle(
      poleX + finishFlag.w * 0.22,
      -finishFlag.h * 0.30,
      poleX + finishFlag.w * 0.22,
      -finishFlag.h * 0.05,
      poleX + finishFlag.w * 1.25,
      -finishFlag.h * 0.18
    );
  };
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
    noStroke();
    fill("#ef4444");
    // Triangle spike
    triangle(-s.w * 0.5, s.h * 0.5, s.w * 0.5, s.h * 0.5, 0, -s.h * 0.5);
    // Small base
    fill("#b91c1c");
    rect(0, s.h * 0.35, s.w * 0.9, s.h * 0.3, 4);
  };
  return s;
}

function addCoin(x, y) {
  const c = new coins.Sprite(x, y, 22, 22);
  c.draw = () => {
    noStroke();
    fill("#fbbf24");
    circle(0, 0, 20);
    fill("#fde68a");
    circle(-3, -3, 7);
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
      noStroke();
      fill(100, 100, 100); // Gris
      rect(-cube.w / 2, -cube.h / 2, cube.w, cube.h, 4);
      fill(80, 80, 80);
      rect(-cube.w / 2 + 2, -cube.h / 2 + 2, cube.w - 4, cube.h - 4, 2);
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
