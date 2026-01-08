// ------------ Camera management ------------

function updateCamera() {
  // Boss arena: fixed camera centered in the arena (screen fixed like Mario boss fights)
  if (typeof bossArena !== "undefined" && bossArena && bossArena.active && typeof gameState !== "undefined" && gameState === "boss") {
    camera.x = bossArena.centerX;
    camera.y = height * 0.5;
    return;
  }

  // Normal play: keep player slightly left-of-center so they can see ahead
  const targetX = player.x + width * 0.18;
  // Ne plus limiter à GAME.levelLength pour permettre la génération continue
  camera.x = Math.max(width * 0.5, targetX);
  camera.y = height * 0.5;
}
