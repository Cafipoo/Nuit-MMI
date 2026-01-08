// ------------ Game logic and state management ------------

let score = 0;
let gameState = "play"; // "play" | "win" | "lose"

function updateGameLogic() {
  // --- Collisions / interactions ---
  player.collide(ground);
  player.collide(platforms);

  player.overlap(coins, collectCoin);
  player.overlap(spikes, hitSpike);
  player.overlap(finishFlag, reachFinish);

  // Lose if you fall off the world
  if (player.y > GAME.fallY) {
    setLose("You fell!");
  }
}

function collectCoin(p, c) {
  score += 10;
  c.remove();
}

function hitSpike() {
  setLose("You hit spikes!");
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
