// ------------ Camera management ------------

function updateCamera() {
  // Keep player slightly left-of-center so they can see ahead
  const targetX = player.x + width * 0.18;
  camera.x = constrain(targetX, width * 0.5, GAME.levelLength - width * 0.5);
  camera.y = height * 0.5;
}
