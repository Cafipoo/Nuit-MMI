// ------------ Game logic and state management ------------

let score = 0;
let gameState = "play"; // "play" | "win" | "lose"
let playerHealth = GAME.maxHearts * 2; // Vie en demi-cœurs (3 cœurs = 6 demi-cœurs)
let lastDamageTime = 0; // Pour éviter les dégâts multiples trop rapides
const damageCooldown = 1000; // 1 seconde entre chaque dégât
let isInvincible = false; // État d'invincibilité après avoir pris des dégâts
let invincibilityStartTime = 0; // Moment où l'invincibilité a commencé
const invincibilityDuration = 2000; // Durée de l'invincibilité en millisecondes (2 secondes)

function updateGameLogic() {
  // Mettre à jour l'invincibilité
  updateInvincibility();
  
  // --- Collisions / interactions ---
  player.collide(ground);
  player.collide(platforms);

  player.overlap(coins, collectCoin);
  // Ne pas détecter les spikes si invincible
  if (!isInvincible) {
    player.overlap(spikes, hitSpike);
  }
  player.overlap(finishFlag, reachFinish);

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
        player.y = 120; // Remettre le joueur en haut
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

  // Remove everything we made
  player?.remove();
  ground?.remove();
  finishFlag?.remove();
  platforms?.removeAll();
  spikes?.removeAll();
  coins?.removeAll();

  buildLevel();
  createPlayer();
}

function windowResized() {
  // Keep it playable in any screen size (fullscreen or resized browser window)
  resizeCanvas(windowWidth, windowHeight);

  // Rebuild level so ground/platform heights match the new screen height.
  // (Hackathon-friendly: simplest, avoids edge-case physics artifacts.)
  restartGame();
}
