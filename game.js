// ------------ Game logic and state management ------------

let score = 0;
let gameState = "play"; // "play" | "win" | "lose"
let playerHealth = GAME.maxHearts * 2; // Vie en demi-cœurs (3 cœurs = 6 demi-cœurs)
let lastDamageTime = 0; // Pour éviter les dégâts multiples trop rapides
const damageCooldown = 1000; // 1 seconde entre chaque dégât
let isInvincible = false; // État d'invincibilité après avoir pris des dégâts
let invincibilityStartTime = 0; // Moment où l'invincibilité a commencé
const invincibilityDuration = 2000; // Durée de l'invincibilité en millisecondes (2 secondes)

// Power-up system
let hasSpeedPowerUp = false;
let powerUpStartTime = 0;
const powerUpDuration = 10000; // 10 secondes

function updateGameLogic() {
  // Mettre à jour l'invincibilité
  updateInvincibility();
  
  // Mettre à jour le power-up
  updatePowerUp();
  
  // Mettre à jour le mouvement des power-ups (roulement sur le sol)
  updatePowerUpsMovement();
  
  // --- Collisions / interactions ---
  player.collide(ground);
  player.collide(platforms);
  player.collide(cubes); // Collision avec les cubes

  player.overlap(coins, collectCoin);
  // Ne pas détecter les spikes si invincible
  if (!isInvincible) {
    player.overlap(spikes, hitSpike);
  }
  player.overlap(finishFlag, reachFinish);
  
  // Détecter les collisions avec les cubes (quand le joueur saute en dessous)
  checkCubeHits();
  
  // Détecter la collecte des power-ups
  player.overlap(powerUps, collectPowerUp);

  // Lose if you fall off the world (retire de la vie)
  if (player.y > GAME.fallY && gameState === "play" && !isInvincible) {
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

function hitSpike() {
  // Ne pas prendre de dégâts si invincible
  if (isInvincible) {
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
  gameState = "win";
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
  // Créer une framboise qui sort du cube
  if (typeof powerUps === "undefined" || !powerUps) return;
  
  const powerUp = new powerUps.Sprite(x, y, 30, 30);
  
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
    if (typeof mapAssets !== "undefined" && mapAssets.framboise && mapAssets.framboise.width) {
      push();
      imageMode(CENTER);
      // Utiliser le ratio d'aspect réel du SVG
      const aspectRatio = (mapAssets.framboise.width || 30) / (mapAssets.framboise.height || 30);
      const powerUpSize = powerUp.w;
      const powerUpWidth = powerUpSize;
      const powerUpHeight = powerUpSize / aspectRatio;
      image(mapAssets.framboise, 0, 0, powerUpWidth, powerUpHeight);
      pop();
    } else {
      // Fallback si l'image n'est pas chargée
      noStroke();
      fill("#ef4444");
      circle(0, 0, powerUp.w);
      fill("#dc2626");
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
  // Activer le power-up de vitesse
  hasSpeedPowerUp = true;
  powerUpStartTime = millis();
  powerUp.remove();
}

function updatePowerUp() {
  if (hasSpeedPowerUp) {
    const now = millis();
    if (now - powerUpStartTime >= powerUpDuration) {
      hasSpeedPowerUp = false;
    }
  }
}

function updatePowerUpsMovement() {
  // Mettre à jour le mouvement des power-ups pour qu'ils continuent de rouler sur le sol
  if (typeof powerUps === "undefined" || !powerUps) return;
  
  for (let powerUp of powerUps) {
    if (!powerUp || !powerUp.exists || !powerUp._direction) continue;
    
    // Vérifier si le power-up est au sol
    const isGrounded = powerUp.colliding(ground) || powerUp.colliding(platforms);
    
    // Vérifier les collisions avec les obstacles pour rebondir
    const hitCube = powerUp.colliding(cubes);
    const hitSpike = powerUp.colliding(spikes);
    
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
  playerDirection = 1; // Reset direction
  playerHealth = GAME.maxHearts * 2; // Réinitialiser la vie
  lastDamageTime = 0; // Réinitialiser le cooldown
  isInvincible = false; // Réinitialiser l'invincibilité
  invincibilityStartTime = 0;
  hasSpeedPowerUp = false; // Réinitialiser le power-up
  powerUpStartTime = 0;

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
