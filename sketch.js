/*
  Nuit MMI 2026 — Exergaming Platformer (p5.js + p5play v3+)

  Goals:
  - Simple 2D side-scrolling platformer (Mario-inspired)
  - Exergaming-friendly inputs:
    - Movement: D to move forward in current direction, F to turn around
    - Jump = G key (Makey Makey can map a pad to G), clap (microphone peak), or shake (device motion)
    - Player can only move in one direction at a time (must turn with F to go the other way)

  Notes:
  - p5play v3 uses Planck physics: we set world.gravity and use Sprite/Group.
  - Keep it readable and easy to extend.
  - Code is organized in separate modules for better maintainability.
*/

let characterFrames = [];

function preload() {
  // Character variants (SVG)
  characterFrames = [
    loadImage("assets/character/POS1.svg"),
    loadImage("assets/character/POS2.svg"),
    loadImage("assets/character/POS3.svg"),
  ];
}

function setup() {
  // Fullscreen canvas (fills the browser window)
  new Canvas(windowWidth, windowHeight);

  world.gravity.y = GAME.gravityY;

  // A clean, high-contrast flat palette
  textFont("system-ui");

  // Initialize level groups
  initLevelGroups();

  // Build level and create player
  buildLevel();
  createPlayer();

  // Camera: we'll follow the player horizontally (simple and effective)
  camera.zoom = 1;

  // Initialize body inputs (device motion, microphone)
  initBodyInputs();

  // Camera-based movement (HandPose + webcam)
  initHandPoseInputs();
}

function draw() {
  // Sky background
  background("#60a5fa"); // blue

  // Parallax-ish simple scenery (drawn in screen space, not world space)
  drawBackdrop();

  if (gameState !== "play") {
    drawEndScreen();
    return;
  }

  // --- Controls ---
  updateBodyInputs();
  updateHandPoseInputs();
  const moveAxis = getMoveAxis(); // -1..1 (body-driven)
  const grounded = isGrounded();

  // Update player movement and jump
  updatePlayerMovement(moveAxis, grounded);
  updatePlayerJump(getJumpPressed(), grounded);

  // --- Game logic (collisions, interactions) ---
  updateGameLogic();

  // --- Camera follow ---
  updateCamera();

  // --- UI overlay (drawn in screen space) ---
  drawHUD();
}

// Event handlers
function keyPressed() {
  handleKeyInput();
}

function mousePressed() {
  handleMouseInput();
}

function touchStarted() {
  return handleTouchInput();
}
