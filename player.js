// ------------ Player management ------------

let player;
let playerDirection = 1; // 1 = right, -1 = left
let playerPoseIndex = 1; // 0..2 (POS1, POS2, POS3) — default idle = POS2
let playerPoseLastSwapFrame = 0;

function createPlayer() {
  // Positionner le joueur plus haut, sur le sol (sol maintenant à height - 50)
  const groundTop = height - 100; // Le haut du sol (sol de 100px de haut, centré à height - 50)
  const playerY = groundTop - 22; // Positionner le joueur sur le sol (hauteur du joueur / 2 = 22)
  player = new Sprite(120, playerY, 34, 44);
  player.color = color("#1f2937"); // dark slate
  player.stroke = color("#111827");
  player.strokeWeight = 2;

  // Keep the player from rotating like a physics box
  player.rotationLock = true;

  // Slight friction so it feels platformer-like
  player.friction = 0.06;

  // Custom draw for a friendly minimalist character
  player.draw = () => {
    const frames = typeof characterFrames !== "undefined" ? characterFrames : [];
    const megaActive = typeof activePowerUp !== "undefined" && activePowerUp === "mega";
    const visualScale = megaActive ? 1.25 : 1.0;

    // If SVG frames are loaded, draw them and animate while moving
    if (frames && frames.length >= 3 && frames[0]) {
      const isActiveGame =
        typeof gameState !== "undefined" && (gameState === "play" || gameState === "boss");
      const isMoving = Math.abs(player.vel.x) > 0.35 && isActiveGame;

      if (isMoving) {
        // Swap every ~6 frames for a run-cycle feel
        if (frameCount - playerPoseLastSwapFrame >= 6) {
          playerPoseIndex = (playerPoseIndex + 1) % 3;
          playerPoseLastSwapFrame = frameCount;
        }
      } else {
        // Idle pose
        playerPoseIndex = 1; // POS2
      }

      const img = frames[playerPoseIndex];
      if (!img) {
        // Fallback if image not loaded
        noStroke();
        fill("#111827");
        rect(0, 0, player.w, player.h, 10);
        return;
      }

      push();
      imageMode(CENTER);

      // Effet de clignotement si invincible (style Mario) (mais pas pendant le power-up mega)
      if (!megaActive && typeof isInvincible !== "undefined" && isInvincible) {
        const blinkSpeed = 8; // Vitesse du clignotement (frames)
        const shouldShow = Math.floor(frameCount / blinkSpeed) % 2 === 0;
        if (!shouldShow) {
          pop();
          return; // Ne pas dessiner cette frame (effet de clignotement)
        }
      }

      // Flip horizontally based on facing direction
      if (playerDirection === -1) scale(-1, 1);

      // Préserver le ratio d'aspect original du SVG pour éviter la déformation
      // Dimensions originales des SVG:
      // POS1: 499x268 (ratio ≈ 1.86)
      // POS2: 497x259 (ratio ≈ 1.92)
      // POS3: 497x328 (ratio ≈ 1.52)
      const originalW = img.width || 497; // fallback si width non disponible
      const originalH = img.height || 268;
      const aspectRatio = originalW / originalH;

      // Taille cible en hauteur (basée sur la hauteur du sprite)
      const targetH = player.h * 2.6 * visualScale;
      const targetW = targetH * aspectRatio; // Préserver le ratio

      // Centrer verticalement avec un léger offset vers le haut
      image(img, 0, 6, targetW, targetH);
      pop();
      return;
    }

    // Fallet de clignotement si invincible (style Mario) (mais pas pendant le power-up mega)
    if (!megaActive && typeof isInvincible !== "undefined" && isInvincible) {
      const blinkSpeed = 8; // Vitesse du clignotement (frames)
      const shouldShow = Math.floor(frameCount / blinkSpeed) % 2 === 0;
      if (!shouldShow) {
        return; // Ne pas dessiner cette frame (effet de clignotement)
      }
    }
    
    // Fallback (if images didn't load)
    noStroke();
    fill("#111827");
    rect(0, 0, player.w, player.h, 10);
    fill("#60a5fa");
    rect(0, -player.h * 0.12, player.w * 0.72, player.h * 0.25, 10);
    fill("#0f172a");
    rect(-player.w * 0.18, player.h * 0.36, player.w * 0.38, player.h * 0.18, 6);
    rect(player.w * 0.18, player.h * 0.36, player.w * 0.38, player.h * 0.18, 6);
  };
}

function isGrounded() {
  // Grounded if colliding with ground OR any platform.
  // p5play updates collisions in the collide() calls, so this is stable per frame.
  return player.colliding(ground) || player.colliding(platforms);
}

function updatePlayerMovement(moveAxis, grounded) {
  // Horizontal movement (snappy on ground, slightly softer in air)
  const control = grounded ? 1 : GAME.airControl;
  // Multiplier la vitesse si power-up speed actif
  const speedMultiplier =
    (typeof activePowerUp !== "undefined" && activePowerUp === "speed") ? 1.5 : 1;
  player.vel.x = lerp(player.vel.x, moveAxis * GAME.runSpeed * speedMultiplier, 0.22 * control);
}

function updatePlayerJump(jumpPressed, grounded) {
  // Jump (body trigger only)
  if (jumpPressed && grounded) {
    const jumpMultiplier =
      (typeof activePowerUp !== "undefined" && activePowerUp === "jump") ? 1.65 : 1;
    player.vel.y = -GAME.jumpSpeed * jumpMultiplier;
  }
}

function turnPlayer() {
  playerDirection *= -1; // Flip direction: 1 -> -1, -1 -> 1
}
