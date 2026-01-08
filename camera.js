// ------------ Camera management ------------

function updateCamera() {
  // Keep player slightly left-of-center so they can see ahead
  const targetX = player.x + width * 0.18;
  // Ne plus limiter à GAME.levelLength pour permettre la génération continue
  camera.x = Math.max(width * 0.5, targetX);
  camera.y = height * 0.5;
}
