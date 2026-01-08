// ------------ Level creation and management ------------

let ground;
let platforms;
let spikes;
let coins;
let finishFlag;

function initLevelGroups() {
  // Groups
  platforms = new Group();
  platforms.collider = "static";
  platforms.color = color("#2c7a7b"); // teal

  spikes = new Group();
  spikes.collider = "static";
  spikes.color = color("#ef4444"); // red

  coins = new Group();
  coins.collider = "static"; // no physics push; we'll use overlap
  coins.color = color("#fbbf24"); // amber
}

function buildLevel() {
  // Scale Y layout to the current screen height so the level stays readable
  const sy = height / GAME.designH;

  // Ground: long static platform
  ground = new Sprite(GAME.levelLength / 2, height - 20, GAME.levelLength, 40, "static");
  ground.color = color("#22c55e"); // green

  // A few floating platforms (simple handcrafted "beats")
  addPlatform(450, 420 * sy, 220, 28);
  addPlatform(820, 360 * sy, 180, 28);
  addPlatform(1180, 300 * sy, 170, 28);
  addPlatform(1550, 380 * sy, 220, 28);
  addPlatform(1900, 320 * sy, 180, 28);
  addPlatform(2250, 260 * sy, 170, 28);
  addPlatform(2650, 340 * sy, 240, 28);
  addPlatform(3100, 290 * sy, 200, 28);
  addPlatform(3520, 360 * sy, 260, 28);
  addPlatform(3970, 300 * sy, 200, 28);
  addPlatform(4400, 330 * sy, 240, 28);
  addPlatform(4800, 280 * sy, 200, 28);

  // Spikes (obstacles)
  // Keep them mostly on ground so the rule "avoid obstacles" is clear
  addSpike(680, height - 55, 48, 38);
  addSpike(960, height - 55, 48, 38);
  addSpike(2050, height - 55, 48, 38);
  addSpike(2120, height - 55, 48, 38);
  addSpike(3300, height - 55, 48, 38);
  addSpike(3365, height - 55, 48, 38);
  addSpike(3700, height - 55, 48, 38);
  addSpike(4480, height - 55, 48, 38);

  // Coins (collectibles) - place near platforms to encourage jumping/moving
  addCoin(450, 370 * sy);
  addCoin(820, 310 * sy);
  addCoin(1180, 250 * sy);
  addCoin(1550, 330 * sy);
  addCoin(1900, 270 * sy);
  addCoin(2250, 210 * sy);
  addCoin(2650, 290 * sy);
  addCoin(3100, 240 * sy);
  addCoin(3520, 310 * sy);
  addCoin(3970, 250 * sy);
  addCoin(4400, 280 * sy);
  addCoin(4800, 230 * sy);

  // Finish flag
  finishFlag = new Sprite(GAME.levelLength - 140, height - 110, 26, 140, "static");
  finishFlag.color = color("#a855f7"); // purple
  finishFlag.draw = () => {
    // Pole
    noStroke();
    fill("#f8fafc");
    rect(0, 0, finishFlag.w * 0.25, finishFlag.h, 6);

    // Flag cloth (simple triangle)
    fill("#a855f7");
    const poleX = -finishFlag.w * 0.15;
    triangle(
      poleX + finishFlag.w * 0.22,
      -finishFlag.h * 0.30,
      poleX + finishFlag.w * 0.22,
      -finishFlag.h * 0.05,
      poleX + finishFlag.w * 1.25,
      -finishFlag.h * 0.18
    );
  };
}

function addPlatform(x, y, w, h) {
  const p = new platforms.Sprite(x, y, w, h);
  p.stroke = color(0, 0, 0, 0);
  return p;
}

function addSpike(x, y, w, h) {
  const s = new spikes.Sprite(x, y, w, h);
  s.draw = () => {
    noStroke();
    fill("#ef4444");
    // Triangle spike
    triangle(-s.w * 0.5, s.h * 0.5, s.w * 0.5, s.h * 0.5, 0, -s.h * 0.5);
    // Small base
    fill("#b91c1c");
    rect(0, s.h * 0.35, s.w * 0.9, s.h * 0.3, 4);
  };
  return s;
}

function addCoin(x, y) {
  const c = new coins.Sprite(x, y, 22, 22);
  c.draw = () => {
    noStroke();
    fill("#fbbf24");
    circle(0, 0, 20);
    fill("#fde68a");
    circle(-3, -3, 7);
  };
  return c;
}
