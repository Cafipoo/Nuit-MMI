// ------------ Game logic and state management ------------

// Debug helper: set to 50 if you want to test the teleport quickly
const DEBUG_START_SCORE = 50;

let score = DEBUG_START_SCORE;
let gameState = "play"; // "play" | "boss" | "win" | "lose"
let hasTeleportedToFinish = false;
const SCORE_TELEPORT_THRESHOLD = 50;
let playerHealth = GAME.maxHearts * 2; // Vie en demi-cœurs (3 cœurs = 6 demi-cœurs)
let lastDamageTime = 0; // Pour éviter les dégâts multiples trop rapides
const damageCooldown = 1000; // 1 seconde entre chaque dégât
let isInvincible = false; // État d'invincibilité après avoir pris des dégâts
let invincibilityStartTime = 0; // Moment où l'invincibilité a commencé
const invincibilityDuration = 2000; // Durée de l'invincibilité en millisecondes (2 secondes)

// Power-up system (typed)
const POWER_UPS = {
  speed: { duration: 10000, label: "SPEED UP", color: [239, 68, 68], assetKey: "framboise" },
  mega: { duration: 9000, label: "INVINCIBLE", color: [250, 204, 21], assetKey: "fraise" },
  jump: { duration: 10000, label: "JUMP UP", color: [59, 130, 246], assetKey: "myrtilles" },
};

let activePowerUp = null; // "speed" | "mega" | "jump" | null
let powerUpStartTime = 0;
let powerUpDuration = 0;

// Boss arena state
let bossArena = null; // { active, leftX, rightX, centerX }
let boss = null;
let arenaWalls = null;

function isPlayerInvincible() {
  return isInvincible || activePowerUp === "mega";
}


function updateGameLogic() {
  // Mettre à jour l'invincibilité
  updateInvincibility();
  
  // Mettre à jour le power-up
  updatePowerUp();
  
  // Mettre à jour le mouvement des power-ups (roulement sur le sol)
  updatePowerUpsMovement();

  // Génération procédurale (plateformes + cubes + arbres décor)
  if (gameState === "play" && typeof updateMapGeneration === "function") {
    updateMapGeneration();
  }

  // Téléportation au drapeau à 50 points (une seule fois)
  checkScoreTeleport();

  // Boss arena: clamp + collisions
  if (gameState === "boss") {
    updateBossArena();
  }
  
  // --- Collisions / interactions ---
  player.collide(ground);
  if (gameState === "play") {
    player.collide(platforms);
    player.collide(cubes); // Collision avec les cubes
  }
  if (typeof arenaWalls !== "undefined" && arenaWalls) {
    player.collide(arenaWalls);
  }
  if (typeof boss !== "undefined" && boss) {
    player.collide(boss);
  }


  if (gameState === "play") {
    player.overlap(coins, collectCoin);
  }
  // Ne pas détecter les spikes si invincible
  if (!isInvincible) {
    player.overlap(spikes, hitSpike);
  }
  if (gameState === "play") {
    player.overlap(finishFlag, reachFinish);
  }
  
  // Détecter les collisions avec les cubes (quand le joueur saute en dessous)
  if (gameState === "play") {
    checkCubeHits();
  }
  
  // Détecter la collecte des power-ups
  player.overlap(powerUps, collectPowerUp);

  // Lose if you fall off the world (retire de la vie)
  if (player.y > GAME.fallY && gameState === "play" && !isPlayerInvincible()) {
    const now = millis();
    if (now - lastDamageTime >= damageCooldown) {
      lastDamageTime = now;
      playerHealth -= GAME.damagePerHit * 2; // Retirer 50% d'un cœur
      
      if (playerHealth < 0) {
        playerHealth = 0;
      }
      
      // Activer l'invincibilité et l'effet de knockback
      activateInvincibility();
      
      // Remettre le joueur en haut si il a encore de la vie
      if (playerHealth > 0) {
        // Positionner le joueur sur le sol (sol maintenant à height - 50, haut du sol à height - 100)
        const groundTop = height - 100;
        player.y = groundTop - 22; // Positionner le joueur sur le sol
        player.x = Math.max(120, player.x - 200); // Reculer un peu
        player.vel.y = 0;
        player.vel.x = 0;
      } else {
        setLose("You ran out of health!");
      }
    }
  }
}


function collectCoin(p, c) {
  score += 10;
  c.remove();
}

function checkScoreTeleport() {
  if (gameState !== "play") return;
  if (hasTeleportedToFinish) return;
  if (score < SCORE_TELEPORT_THRESHOLD) return;
  if (typeof finishFlag === "undefined" || !finishFlag) return;
  if (typeof player === "undefined" || !player) return;

  hasTeleportedToFinish = true;

  // Se placer juste avant le drapeau (pour éviter de gagner instantanément)
  const targetX = finishFlag.x - 140;
  const groundTop = height - 100; // cohérent avec createPlayer() / fall reset
  const targetY = groundTop - 22;

  player.x = targetX;
  player.y = targetY;
  player.vel.x = 0;
  player.vel.y = 0;
  player.sleeping = false;
}

function hitSpike() {
  // Ne pas prendre de dégâts si invincible
  if (isPlayerInvincible()) {
    return;
  }
  
  // Vérifier le cooldown pour éviter les dégâts multiples trop rapides
  const now = millis();
  if (now - lastDamageTime < damageCooldown) {
    return; // Trop tôt, ignorer le dégât
  }
  lastDamageTime = now;
  
  // Retirer de la vie (50% d'un cœur = 1 demi-cœur)
  playerHealth -= GAME.damagePerHit * 2; // Convertir en demi-cœurs
  
  // S'assurer que la vie ne devient pas négative
  if (playerHealth < 0) {
    playerHealth = 0;
  }
  
  // Activer l'invincibilité et l'effet de knockback
  activateInvincibility();
  applyKnockback();
  
  // Si la vie atteint 0, le joueur perd
  if (playerHealth <= 0) {
    setLose("You ran out of health!");
  }
}

function updateInvincibility() {
  if (isInvincible) {
    const now = millis();
    if (now - invincibilityStartTime >= invincibilityDuration) {
      isInvincible = false;
    }
  }
}

function activateInvincibility() {
  isInvincible = true;
  invincibilityStartTime = millis();
}

function applyKnockback() {
  // Effet de recul style Mario : reculer dans la direction opposée
  const knockbackForce = 8; // Force du recul
  const knockbackUp = -6; // Légère impulsion vers le haut
  
  // Reculer dans la direction opposée à celle où le joueur regarde
  player.vel.x = -playerDirection * knockbackForce;
  player.vel.y = knockbackUp;
}

function reachFinish() {
  // Enter boss fight arena instead of immediate win
  if (gameState !== "play") return;
  gameState = "boss";
  initBossArena();
}

function initBossArena() {
  // Stop showing/using the procedural level beyond the flag
  platforms?.removeAll();
  cubes?.removeAll();
  coins?.removeAll();
  spikes?.removeAll();
  decorTrees?.removeAll();
  powerUps?.removeAll();

  // Remove the flag so it can't be triggered again
  finishFlag?.remove();

  // Create arena bounds right after the old flag position.
  // Arena width matches the screen width so the screen borders are the limits.
  const baseX = (typeof finishFlag !== "undefined" && finishFlag) ? finishFlag.x : player.x;
  const leftX = baseX + 220;
  const rightX = leftX + width;
  const centerX = leftX + width / 2;

  bossArena = { active: true, leftX, rightX, centerX };

  // No physical walls: we use screen edges as invisible limits via clamping.
  arenaWalls?.removeAll?.();
  arenaWalls = null;

  // Teleport player to left side of arena
  const groundTop = height - 100;
  player.x = leftX + 140;
  player.y = groundTop - 22;
  player.vel.x = 0;
  player.vel.y = 0;
  player.sleeping = false;

  // Spawn boss on the right side (simple white circle)
  boss?.remove?.();
  boss = new Sprite(rightX - 160, groundTop - 28, 70, 70, "static");
  boss.rotationLock = true;
  boss.draw = () => {
    const img = typeof mapAssets !== "undefined" ? mapAssets.monstre : null;
    if (img && img.width) {
      push();
      imageMode(CENTER);
      const aspectRatio = (img.width || 1) / (img.height || 1);
      const targetH = boss.h * 2.2;
      const targetW = targetH * aspectRatio;
      image(img, 0, -6, targetW, targetH);
      pop();
      return;
    }

    // Fallback if SVG not loaded
    noStroke();
    fill(255);
    circle(0, 0, 68);
  };
}

function updateBossArena() {
  if (!bossArena?.active) return;

  // Keep player inside the visible screen bounds (so borders are the limits)
  const pad = 24;
  const leftBound = camera.x - width / 2 + pad;
  const rightBound = camera.x + width / 2 - pad;
  player.x = constrain(player.x, leftBound, rightBound);
}

function setLose(reason) {
  // Prevent multiple triggers
  if (gameState !== "play") return;
  gameState = "lose";
  player.vel.x = 0;
  player.vel.y = 0;
  player.sleeping = true;
  player._loseReason = reason;
}

function checkCubeHits() {
  // Vérifier si le joueur entre en contact avec un cube
  if (typeof cubes === "undefined" || !cubes) return;
  
  for (let cube of cubes) {
    if (!cube || cube.hit) continue; // Ignorer les cubes déjà frappés
    
      // Dès que le joueur entre en contact avec le cube, faire sortir le fruit
      if (player.colliding(cube)) {
        cube.hit = true;
        // Positionner le fruit un peu plus haut et avec un léger décalage horizontal pour éviter qu'il reste bloqué
        const offsetX = random(-10, 10); // Petit décalage horizontal aléatoire
        spawnPowerUp(cube.x + offsetX, cube.y - cube.h / 2 - 30);
      }
  }
}

function spawnPowerUp(x, y) {
  // Créer un power-up qui sort du cube (framboise/fraise/myrtilles)
  if (typeof powerUps === "undefined" || !powerUps) return;
  
  const powerUp = new powerUps.Sprite(x, y, 30, 30);

  // Choisir le type (pondéré)
  // - speed un peu plus fréquent
  const r = random();
  powerUp._type = r < 0.5 ? "speed" : r < 0.75 ? "jump" : "mega";
  
  // Lancer la framboise vers le haut avec une vitesse horizontale aléatoire (comme dans Mario)
  powerUp.vel.y = -5; // Lancer vers le haut
  // Direction aléatoire : gauche ou droite avec une vitesse variable
  const randomDirection = random() < 0.5 ? -1 : 1; // -1 = gauche, 1 = droite
  const randomSpeed = random(2, 4); // Vitesse horizontale entre 2 et 4
  powerUp.vel.x = randomDirection * randomSpeed;
  
  // Stocker la direction initiale et la vitesse de base pour le roulement continu
  powerUp._baseSpeed = Math.abs(randomSpeed);
  powerUp._direction = randomDirection;
  powerUp._isGrounded = false;
  
  // Permettre la rotation pour un effet plus naturel
  powerUp.rotationLock = false;
  
  // Réduire la friction pour qu'il continue de rouler indéfiniment
  powerUp.friction = 0.02;
  
  // S'assurer que la gravité s'applique
  powerUp.gravity = 1;
  
  powerUp.draw = () => {
    const type = powerUp._type || "speed";
    const def = POWER_UPS[type] || POWER_UPS.speed;
    const key = def.assetKey;
    const img = typeof mapAssets !== "undefined" ? mapAssets[key] : null;

    if (img && img.width) {
      push();
      imageMode(CENTER);
      // Utiliser le ratio d'aspect réel du SVG
      const aspectRatio = (img.width || 30) / (img.height || 30);
      const powerUpSize = powerUp.w;
      const powerUpWidth = powerUpSize;
      const powerUpHeight = powerUpSize / aspectRatio;
      image(img, 0, 0, powerUpWidth, powerUpHeight);
      pop();
    } else {
      // Fallback si l'image n'est pas chargée
      noStroke();
      const [cr, cg, cb] = (POWER_UPS[powerUp._type] || POWER_UPS.speed).color;
      fill(cr, cg, cb);
      circle(0, 0, powerUp.w);
      fill(0, 0, 0, 60);
      circle(0, 0, powerUp.w * 0.7);
    }
  };
  
  // Faire collider avec le sol et les plateformes
  powerUp.collide(ground);
  powerUp.collide(platforms);
  
  // Collision avec les cubes et spikes pour détecter les obstacles
  powerUp.collide(cubes);
  powerUp.collide(spikes);
  
  // Faire disparaître le power-up après un certain temps s'il n'est pas collecté
  setTimeout(() => {
    if (powerUp && powerUp.exists) {
      powerUp.remove();
    }
  }, 5000); // Disparaît après 5 secondes
  
  return powerUp;
}

function collectPowerUp(p, powerUp) {
  // Activer le power-up
  const type = powerUp?._type || "speed";
  activatePowerUp(type);
  powerUp.remove();
}

function updatePowerUp() {
  if (!activePowerUp) return;
  const now = millis();
  if (now - powerUpStartTime >= powerUpDuration) {
    deactivatePowerUp();
  }
}

function activatePowerUp(type) {
  const def = POWER_UPS[type] || POWER_UPS.speed;
  activePowerUp = type;
  powerUpStartTime = millis();
  powerUpDuration = def.duration;
}

function deactivatePowerUp() {
  activePowerUp = null;
  powerUpStartTime = 0;
  powerUpDuration = 0;
}

function updatePowerUpsMovement() {
  // Mettre à jour le mouvement des power-ups pour qu'ils continuent de rouler sur le sol
  if (typeof powerUps === "undefined" || !powerUps) return;
  
  for (let powerUp of powerUps) {
    if (!powerUp || !powerUp.exists || !powerUp._direction) continue;
    
    // Vérifier si le power-up est au sol
    const isGrounded = powerUp.colliding(ground) || powerUp.colliding(platforms);
    
    // Vérifier les collisions avec les obstacles pour rebondir
    const hitCube = (typeof cubes !== "undefined" && cubes) ? powerUp.colliding(cubes) : false;
    const hitSpike = (typeof spikes !== "undefined" && spikes) ? powerUp.colliding(spikes) : false;
    
    if (hitCube || hitSpike) {
      // Inverser la direction quand on touche un obstacle
      powerUp._direction *= -1;
      powerUp.vel.x = powerUp._direction * powerUp._baseSpeed;
    }
    
    if (isGrounded) {
      // Maintenir la vitesse horizontale constante pour qu'il continue de rouler indéfiniment
      powerUp.vel.x = powerUp._direction * powerUp._baseSpeed;
      powerUp._isGrounded = true;
    } else {
      powerUp._isGrounded = false;
    }
  }
}

function restartGame() {
  // Simplest reset: clear sprites/groups and rebuild.
  // This avoids subtle physics state bugs in a hackathon setting.
  score = 0;
  gameState = "play";
  hasTeleportedToFinish = false;
  playerDirection = 1; // Reset direction
  playerHealth = GAME.maxHearts * 2; // Réinitialiser la vie
  lastDamageTime = 0; // Réinitialiser le cooldown
  isInvincible = false; // Réinitialiser l'invincibilité
  invincibilityStartTime = 0;
  activePowerUp = null;
  powerUpStartTime = 0;
  powerUpDuration = 0;

  bossArena = null;
  boss?.remove?.();
  boss = null;
  arenaWalls?.removeAll?.();
  arenaWalls = null;

  // Réafficher tous les sprites
  if (typeof allSprites !== "undefined") {
    allSprites.visible = true;
  }

  // Remove everything we made
  player?.remove();
  ground?.remove();
  finishFlag?.remove();
  platforms?.removeAll();
  spikes?.removeAll();
  coins?.removeAll();
  cubes?.removeAll();
  decorTrees?.removeAll();
  powerUps?.removeAll();

  buildLevel();
  createPlayer();
  
  // Réinitialiser la génération de la carte
  if (typeof initMapGeneration === "function") {
    initMapGeneration();
  }
}

function windowResized() {
  // Keep it playable in any screen size (fullscreen or resized browser window)
  resizeCanvas(windowWidth, windowHeight);

  // Rebuild level so ground/platform heights match the new screen height.
  // (Hackathon-friendly: simplest, avoids edge-case physics artifacts.)
  restartGame();
}
