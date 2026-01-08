// ------------ Decorative elements and backdrop ------------

function drawBackdrop() {
  // Draw simple clouds and distant hills in screen space (cheap + clean)
  camera.off();
  push();
  rectMode(CENTER);

  // Distant hills
  noStroke();
  fill("#1d4ed8"); // darker blue
  rect(width * 0.18, height * 0.86, width * 0.55, height * 0.3, 80);
  rect(width * 0.68, height * 0.88, width * 0.7, height * 0.35, 90);

  // Clouds
  fill(255, 255, 255, 210);
  cloud(140, 120, 1.0);
  cloud(420, 90, 0.8);
  cloud(760, 130, 1.15);

  pop();
  camera.on();
}

function cloud(x, y, s) {
  circle(x, y, 52 * s);
  circle(x + 30 * s, y + 10 * s, 44 * s);
  circle(x - 34 * s, y + 12 * s, 40 * s);
  rect(x, y + 18 * s, 120 * s, 28 * s, 18);
}
