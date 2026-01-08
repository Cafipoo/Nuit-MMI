// ------------ Player management ------------

let player;
let playerDirection = 1; // 1 = right, -1 = left
let playerPoseIndex = 1; // 0..2 (POS1, POS2, POS3) — default idle = POS2
let playerPoseLastSwapFrame = 0;

function createPlayer() {
  player = new Sprite(120, height - 120, 34, 44);
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

    // If SVG frames are loaded, draw them and animate while moving
    if (frames && frames.length >= 3 && frames[0]) {
      const isMoving = Math.abs(player.vel.x) > 0.35 && gameState === "play";

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

      // Effet de clignotement si invincible (style Mario)
      if (typeof isInvincible !== "undefined" && isInvincible) {
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
      const targetH = player.h * 2.6;
      const targetW = targetH * aspectRatio; // Préserver le ratio

      // Centrer verticalement avec un léger offset vers le haut
      image(img, 0, 6, targetW, targetH);
      pop();
      return;
    }

    // Fallet de clignotement si invincible (style Mario)
    if (typeof isInvincible !== "undefined" && isInvincible) {
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
  player.vel.x = lerp(player.vel.x, moveAxis * GAME.runSpeed, 0.22 * control);
}

function updatePlayerJump(jumpPressed, grounded) {
  // Jump (body trigger only)
  if (jumpPressed && grounded) {
    player.vel.y = -GAME.jumpSpeed;
  }
}

function turnPlayer() {
  playerDirection *= -1; // Flip direction: 1 -> -1, -1 -> 1
}
