// ------------ Game logic and state management ------------

// Debug helper: set to 50 if you want to test the teleport quickly
const DEBUG_START_SCORE = 50;

let score = DEBUG_START_SCORE;
let gameState = "menu"; // "menu" | "play" | "boss" | "win" | "lose"
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
let bossLasers = null;

// Missiles (projectiles)
let lastMissileFireMs = -Infinity;
const MISSILE_COOLDOWN_MS = 260;
const MISSILE_SPEED = 70;
const MISSILE_LIFETIME_MS = 500; // 2 secondes
const MISSILE_EXPLOSION_MS = 220;
const BOSS_MAX_HP = 10;

// Boss laser attack (telegraphed)
const BOSS_LASER = {
  warnMs: 900,
  fireMs: 520,
  cooldownMs: 650,
  width: 56,
};

function isPlayerInvincible() {
  return isInvincible || activePowerUp === "mega";
}

function tryFireMissile() {
  // allow in play/boss; block on end screens
  if (typeof player === "undefined" || !player) return;
  if (gameState === "win" || gameState === "lose") return;
  if (typeof missiles === "undefined" || !missiles) return;

  const now = millis();
  if (now - lastMissileFireMs < MISSILE_COOLDOWN_MS) return;
  lastMissileFireMs = now;

  const dir = typeof playerDirection === "number" ? playerDirection : 1;
  const spawnX = player.x + dir * 34;
  const spawnY = player.y - 6;
  spawnMissile(spawnX, spawnY, dir);
}

function spawnMissile(x, y, dir) {
  if (typeof missiles === "undefined" || !missiles) return null;

  const m = new missiles.Sprite(x, y, 18, 10);
  m.rotationLock = true;
  m.friction = 0;
  m.bounciness = 0;
  m.gravity = 0; // no drop

  m._state = "fly"; // "fly" | "explode"
  m._spawnMs = millis();
  m._explodeMs = 0;
  m._damage = 1;

  m.vel.x = dir * MISSILE_SPEED;
  m.vel.y = 0;

  m.draw = () => {
    if (m._state === "explode") {
      const t = (millis() - (m._explodeMs || millis())) / MISSILE_EXPLOSION_MS;
      const p = constrain(t, 0, 1);
      const r1 = lerp(6, 42, p);
      const r2 = lerp(10, 64, p);
      noStroke();
      fill(255, 140, 0, 180 * (1 - p));
      circle(0, 0, r2);
      fill(255, 220, 120, 220 * (1 - p));
      circle(0, 0, r1);
      return;
    }

    // flying missile (simple rocket)
    push();
    rectMode(CENTER);
    noStroke();
    fill(17, 24, 39);
    rect(0, 0, m.w, m.h, 4);
    fill(249, 115, 22);
    rect(-m.w * 0.42, 0, 6, m.h * 0.7, 3);
    fill(255, 220, 120, 200);
    circle(m.w * 0.46, 0, 5);
    pop();
  };

  return m;
}

function explodeMissile(m) {
  // Some p5play builds don't expose a stable `.exists` flag in callbacks,
  // so we only guard against null/undefined here.
  if (!m) return;
  if (m._state === "explode") return;
  m._state = "explode";
  m._explodeMs = millis();
  m.vel.x = 0;
  m.vel.y = 0;
  m.collider = "none"; // prevent multiple hits while exploding
}

function updateMissiles() {
  if (typeof missiles === "undefined" || !missiles) return;
  const now = millis();
  for (const m of missiles) {
    if (!m) continue;
    if (m._state === "fly") {
      if (now - (m._spawnMs || now) > MISSILE_LIFETIME_MS) {
        m.remove();
      }
    } else if (m._state === "explode") {
      if (!m._explodeMs) m._explodeMs = now;
      if (now - (m._explodeMs || now) > MISSILE_EXPLOSION_MS) {
        m.remove();
      }
    }
  }
}

function onMissileHitsBoss(m, b) {
  if (!m || !b) return;
  if (m._state !== "fly") return;

  explodeMissile(m);

  const dmg = typeof m._damage === "number" ? m._damage : 1;
  if (typeof b._hp !== "number") b._hp = BOSS_MAX_HP;
  b._hp = Math.max(0, b._hp - dmg);

  if (b._hp <= 0) {
    // Boss defeated -> win
    b.remove?.();
    boss = null;
    gameState = "win";
  }
}


function updateGameLogic() {
  // Mettre à jour l'invincibilité
  updateInvincibility();
  
  // Mettre à jour le power-up
  updatePowerUp();
  
  // Mettre à jour le mouvement des power-ups (roulement sur le sol)
  updatePowerUpsMovement();

  // Enemies: collisions + mouvement linéaire
  updateEnemies();

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

  // Missiles update + collision against boss
  updateMissiles();
  if (typeof boss !== "undefined" && boss && typeof missiles !== "undefined" && missiles) {
    missiles.overlap(boss, onMissileHitsBoss);
  }

  // Missiles vs enemies
  if (typeof enemies !== "undefined" && enemies && typeof missiles !== "undefined" && missiles) {
    missiles.overlap(enemies, onMissileHitsEnemy);
  }


  if (gameState === "play") {
    player.overlap(coins, collectCoin);
  }
  // Ne pas détecter les spikes si invincible
  if (!isInvincible) {
    player.overlap(spikes, hitSpike);
  }
  // Enemy contact damages player (respect invincibility)
  if (typeof enemies !== "undefined" && enemies) {
    player.overlap(enemies, hitEnemy);
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
      playerHealth -= GAME.damagePerHit * 4; // Retirer 1 cœur complet
      
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

function updateEnemies() {
  if (typeof enemies === "undefined" || !enemies) return;

  // Keep enemies standing on the world
  enemies.collide(ground);
  if (typeof platforms !== "undefined" && platforms) enemies.collide(platforms);
  if (typeof cubes !== "undefined" && cubes) enemies.collide(cubes);
  if (typeof spikes !== "undefined" && spikes) enemies.collide(spikes);
  enemies.collide(enemies); // bounce off each other and allow direction changes

  for (const e of enemies) {
    if (!e) continue;
    const dir = typeof e._dir === "number" ? e._dir : 1;
    const speed = typeof e._speed === "number" ? e._speed : 2;
    e.vel.x = dir * speed;

    // Reverse direction only when touching another object (not the ground).
    const touchingObstacle =
      (typeof cubes !== "undefined" && cubes && e.colliding(cubes)) ||
      (typeof spikes !== "undefined" && spikes && e.colliding(spikes)) ||
      (typeof platforms !== "undefined" && platforms && e.colliding(platforms)) ||
      e.colliding(enemies);

    if (touchingObstacle) {
      if (!e._lastTurnFrame) e._lastTurnFrame = 0;
      if (frameCount - e._lastTurnFrame > 10) {
        e._dir = -dir;
        e._lastTurnFrame = frameCount;
        // small nudge to avoid sticking
        e.x += e._dir * 2;
      }
    }
  }
}

function onMissileHitsEnemy(m, e) {
  if (!m || !e) return;
  if (m._state !== "fly") return;
  if (e._dead) return;

  explodeMissile(m);

  const dmg = typeof m._damage === "number" ? m._damage : 1;
  if (typeof e._hp !== "number") e._hp = 1;
  e._hp = Math.max(0, e._hp - dmg);
  if (e._hp <= 0) {
    e._dead = true;
    // +10 points par monstre tué
    if (typeof score === "number") score += 10;
    e.remove?.();
  }
}

function hitEnemy(p, e) {
  if (!p || !e) return;
  if (isPlayerInvincible()) return;

  const now = millis();
  if (now - lastDamageTime < damageCooldown) return;
  lastDamageTime = now;

  playerHealth -= GAME.damagePerHit * 4; // 1 cœur complet
  if (playerHealth < 0) playerHealth = 0;

  activateInvincibility();

  // Knockback away from the enemy (augmenté pour ralentir plus)
  const knockbackForce = 14;
  const knockbackUp = -8;
  const pushDir = p.x < e.x ? -1 : 1;
  p.vel.x = pushDir * knockbackForce;
  p.vel.y = knockbackUp;

  if (playerHealth <= 0) {
    setLose("You ran out of health!");
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
  
  // Retirer de la vie (1 cœur complet = 2 demi-cœurs)
  playerHealth -= GAME.damagePerHit * 4; // 1 cœur complet
  
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
  const knockbackForce = 14; // Force du recul (augmentée pour ralentir plus)
  const knockbackUp = -8; // Impulsion vers le haut (augmentée)
  
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
  enemies?.removeAll();
  powerUps?.removeAll();

  // Remove the flag so it can't be triggered again
  finishFlag?.remove();
  missiles?.removeAll?.();

  // Boss lasers (telegraphed ground strikes)
  bossLasers?.removeAll?.();
  bossLasers = new Group();
  bossLasers.collider = "none";
  bossLasers.layer = 10;

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
  boss._hp = BOSS_MAX_HP;
  boss._maxHp = BOSS_MAX_HP;
  boss._nextLaserMs = millis() + 900;
  boss.draw = () => {
    // --- Boss sprite ---
    const img = typeof mapAssets !== "undefined" ? mapAssets.monstre : null;
    if (img && img.width) {
      push();
      imageMode(CENTER);
      const aspectRatio = (img.width || 1) / (img.height || 1);
      const targetH = boss.h * 2.2;
      const targetW = targetH * aspectRatio;
      image(img, 0, -6, targetW, targetH);
      pop();
    } else {
      // Fallback if SVG not loaded
      noStroke();
      fill(255);
      circle(0, 0, 68);
    }

    // --- Boss HP bar (above) ---
    const maxHp = typeof boss._maxHp === "number" ? boss._maxHp : BOSS_MAX_HP;
    const hp = typeof boss._hp === "number" ? boss._hp : maxHp;
    const p = maxHp > 0 ? constrain(hp / maxHp, 0, 1) : 0;

    const barW = 78;
    const barH = 10;
    const y = -boss.h * 0.85 - 16;

    push();
    rectMode(CENTER);
    noStroke();
    // Background
    fill(15, 23, 42, 220);
    rect(0, y, barW, barH, 6);
    // Fill
    fill(239, 68, 68, 240);
    rect(-barW * 0.5 + (barW * p) * 0.5, y, barW * p, barH, 6);
    // Border
    noFill();
    stroke(255, 255, 255, 180);
    strokeWeight(2);
    rect(0, y, barW, barH, 6);
    pop();
  };
}

function updateBossArena() {
  if (!bossArena?.active) return;

  // Keep player inside the visible screen bounds (so borders are the limits)
  const pad = 24;
  const leftBound = camera.x - width / 2 + pad;
  const rightBound = camera.x + width / 2 - pad;
  player.x = constrain(player.x, leftBound, rightBound);

  updateBossLasers();
}

function getGroundTopY() {
  // Prefer the real ground top from level.js when available.
  if (typeof GROUND_TOP_Y === "number" && GROUND_TOP_Y > 0) return GROUND_TOP_Y;
  // Fallback (matches older logic)
  return height - 100;
}

function spawnBossLaser(targetX) {
  if (!bossLasers) return null;
  const groundTop = getGroundTopY();

  // Beam anchored to the ground: bottom = groundTop, top = groundTop - height
  const h = height;
  const y = groundTop - h / 2;
  const w = BOSS_LASER.width;

  const l = new bossLasers.Sprite(targetX, y, w, h);
  l.rotationLock = true;
  l._state = "warn"; // "warn" | "fire"
  l._t0 = millis();
  l._didDamage = false;

  l.draw = () => {
    const groundMarkerH = 14;
    const markerY = l.h * 0.5 - groundMarkerH * 0.5; // near the bottom (ground)

    if (l._state === "warn") {
      // Ground telegraph (no damage)
      const blink = Math.floor(frameCount / 10) % 2;
      noStroke();
      // Rose
      fill(255, 20, 147, blink ? 140 : 80);
      rectMode(CENTER);
      rect(0, markerY, l.w * 1.15, groundMarkerH, 6);
      fill(255, 255, 255, 120);
      rect(0, markerY, l.w * 0.45, 4, 3);
      return;
    }

    // Fire phase: vertical beam
    push();
    rectMode(CENTER);
    noStroke();
    // outer glow
    fill(255, 20, 147, 70);
    rect(0, 0, l.w * 2.4, l.h, 18);
    // core
    fill(255, 20, 147, 165);
    rect(0, 0, l.w, l.h, 10);
    // ground impact
    fill(255, 105, 180, 200);
    rect(0, markerY, l.w * 1.25, groundMarkerH, 7);
    pop();
  };

  return l;
}

function bossLaserHitsPlayer(l) {
  if (!l || l._state !== "fire") return false;
  if (typeof player === "undefined" || !player) return false;

  // Beam AABB: [x-w/2, x+w/2] × [top, groundTop]
  const groundTop = getGroundTopY();
  const beamLeft = l.x - l.w / 2;
  const beamRight = l.x + l.w / 2;
  const beamTop = groundTop - l.h;
  const beamBottom = groundTop;

  const pLeft = player.x - player.w / 2;
  const pRight = player.x + player.w / 2;
  const pTop = player.y - player.h / 2;
  const pBottom = player.y + player.h / 2;

  const overlapX = pRight >= beamLeft && pLeft <= beamRight;
  const overlapY = pBottom >= beamTop && pTop <= beamBottom;
  return overlapX && overlapY;
}

function damagePlayerBossLaser() {
  if (isPlayerInvincible()) return;

  const now = millis();
  if (now - lastDamageTime < damageCooldown) return;
  lastDamageTime = now;

  // 1.5 hearts = 3 demi-cœurs (playerHealth est en demi-cœurs)
  playerHealth -= 3;
  if (playerHealth < 0) playerHealth = 0;

  activateInvincibility();
  applyKnockback();

  if (playerHealth <= 0) {
    setLose("You were hit by the boss laser!");
  }
}

function updateBossLasers() {
  if (typeof gameState === "undefined" || gameState !== "boss") return;
  if (!boss || !bossLasers) return;

  const now = millis();

  // Update existing lasers
  for (const l of bossLasers) {
    if (!l) continue;

    if (l._state === "warn") {
      if (now - (l._t0 || now) >= BOSS_LASER.warnMs) {
        l._state = "fire";
        l._tFire = now;
        l._didDamage = false;
      }
    } else if (l._state === "fire") {
      if (!l._didDamage && bossLaserHitsPlayer(l)) {
        damagePlayerBossLaser();
        l._didDamage = true;
      }
      if (now - (l._tFire || now) >= BOSS_LASER.fireMs) {
        l.remove?.();
      }
    }
  }

  // Spawn a new telegraphed strike if none active and cooldown elapsed
  const anyActive = bossLasers.length > 0;
  if (!anyActive && now >= (boss._nextLaserMs || 0)) {
    const pad = 80;
    const left = bossArena?.leftX ? bossArena.leftX + pad : camera.x - width / 2 + pad;
    const right = bossArena?.rightX ? bossArena.rightX - pad : camera.x + width / 2 - pad;
    // 2 lasers per wave
    const t1 = constrain(player.x + random(-160, 160), left, right);
    // second target must be separated to read clearly
    const minSep = BOSS_LASER.width * 1.6;
    let t2 = constrain(player.x + random(-220, 220), left, right);
    if (Math.abs(t2 - t1) < minSep) {
      t2 = constrain(t1 + (random() < 0.5 ? -1 : 1) * minSep, left, right);
    }
    spawnBossLaser(t1);
    spawnBossLaser(t2);
    boss._nextLaserMs =
      now + BOSS_LASER.warnMs + BOSS_LASER.fireMs + BOSS_LASER.cooldownMs + random(150, 450);
  }
}

function setLose(reason) {
  // Prevent multiple triggers
  if (gameState === "win" || gameState === "lose") return;
  gameState = "lose";
  player.vel.x = 0;
  player.vel.y = 0;
  player.sleeping = true;
  player._loseReason = reason;
  
  // Jouer le son de défaite (volume à 50%)
  if (typeof losingTheme !== "undefined" && losingTheme) {
    losingTheme.stop(); // Arrêter si déjà en cours
    losingTheme.setVolume(0.5); // Volume à 50%
    losingTheme.play();
  }
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
  gameState = "menu";
  hasTeleportedToFinish = false;
  playerDirection = 1; // Reset direction
  playerHealth = GAME.maxHearts * 2; // Réinitialiser la vie
  lastDamageTime = 0; // Réinitialiser le cooldown
  isInvincible = false; // Réinitialiser l'invincibilité
  invincibilityStartTime = 0;
  activePowerUp = null;
  powerUpStartTime = 0;
  powerUpDuration = 0;
  
  // Arrêter le son de défaite si en cours
  if (typeof losingTheme !== "undefined" && losingTheme) {
    losingTheme.stop();
  }

  bossArena = null;
  boss?.remove?.();
  boss = null;
  bossLasers?.removeAll?.();
  bossLasers = null;
  arenaWalls?.removeAll?.();
  arenaWalls = null;
  missiles?.removeAll?.();
  lastMissileFireMs = -Infinity;

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
  enemies?.removeAll();
  powerUps?.removeAll();
  missiles?.removeAll();

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
