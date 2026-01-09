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
let heartImages = [];
let winCharacter = null;
let defeatCharacter = null;
let losingTheme = null;
let mapAssets = {
  sun: null,
  ground: null,
  platform: null,
  cube: null,
  framboise: null,
  fraise: null,
  myrtilles: null,
  cactus: null,
  monstre: null,
  drapeau: null,
  burger: null,
  pizza: null,
  piece: null,
  trees: null
};

function preload() {
  // Character variants (SVG)
  characterFrames = [
    loadImage("assets/character/POS1.svg"),
    loadImage("assets/character/POS2.svg"),
    loadImage("assets/character/POS3.svg"),
  ];
  
  // Heart health assets (SVG)
  heartImages = [
    loadImage("assets/health/Coeur100.svg"),
    loadImage("assets/health/Coeur50.svg"),
    loadImage("assets/health/Coeur0.svg"),
  ];
  
  // Map decorative assets (SVG)
  mapAssets.sun = loadImage("assets/map/sun.svg");
  // Separate ground tile vs floating platform
  mapAssets.ground = loadImage("assets/map/sol.svg");
  mapAssets.platform = loadImage("assets/map/plateforme.svg");
  mapAssets.cube = loadImage("assets/map/cube.svg");
  mapAssets.framboise = loadImage("assets/map/framboise.svg");
  mapAssets.fraise = loadImage("assets/map/fraise.svg");
  mapAssets.myrtilles = loadImage("assets/map/myrtilles.svg");
  mapAssets.cactus = loadImage("assets/map/cactus.svg");
  mapAssets.monstre = loadImage("assets/map/monstre.svg");
  mapAssets.drapeau = loadImage("assets/map/drapeau.svg");
  mapAssets.burger = loadImage("assets/map/burger.svg");
  mapAssets.pizza = loadImage("assets/map/pizza.svg");
  mapAssets.piece = loadImage("assets/map/Pièce.svg");
  mapAssets.trees = [
    loadImage("assets/map/arbre1.svg"),
    loadImage("assets/map/arbre2.svg"),
    loadImage("assets/map/arbre3.svg"),
  ];
  
  // Win character for victory screen
  winCharacter = loadImage("assets/character/win.svg");
  // Lose character for defeat screen
  defeatCharacter = loadImage("assets/map/defeat.svg");
  mapAssets.background = loadImage("assets/map/background.svg");
  
  // Sound for defeat screen
  losingTheme = loadSound("assets/son/losingtheme.mp3");
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

  // Procedural map generation (platforms + cubes + decor trees)
  if (typeof initMapGeneration === "function") {
    initMapGeneration();
  }

  // Camera: we'll follow the player horizontally (simple and effective)
  camera.zoom = 1;

  // Initialize body inputs (device motion, microphone)
  initBodyInputs();

  // Camera-based movement (HandPose + webcam)
  initHandPoseInputs();
}

function draw() {
  // Écran de démarrage (menu)
  if (gameState === "menu") {
    // Cacher tous les sprites du terrain
    if (typeof allSprites !== "undefined") {
      allSprites.visible = false;
    }
    background("#FFF5BE");
    drawStartScreen();
    return;
  }

  // Si on a gagné, cacher tous les sprites et afficher l'écran de victoire
  if (gameState === "win") {
    // Cacher tous les sprites du monde
    if (typeof allSprites !== "undefined") {
      allSprites.visible = false;
    }
    // Fond noir complet
    background(0);
    drawEndScreen();
    return;
  }

  // Si on a perdu, cacher tous les sprites et afficher l'écran de défaite (style win)
  if (gameState === "lose") {
    if (typeof allSprites !== "undefined") {
      allSprites.visible = false;
    }
    background(0);
    drawEndScreen();
    return;
  }

  // Réafficher les sprites si on n'est pas en mode win
  if (typeof allSprites !== "undefined") {
    allSprites.visible = true;
  }

  // Fond jaune clair
  background("#FFF5BE");

  // Parallax-ish simple scenery (drawn in screen space, not world space)
  drawBackdrop();

  // lose est géré plus haut (fond noir + sprites cachés)

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
  // Si on est sur l'écran de démarrage, cliquer pour commencer
  if (gameState === "menu") {
    gameState = "play";
    return;
  }

  // Si on est sur l'écran de victoire/défaite, vérifier le clic sur le bouton
  if ((gameState === "win" || gameState === "lose") && typeof restartButton !== "undefined") {
    const mouseOverButton = 
      mouseX >= restartButton.x - restartButton.w / 2 &&
      mouseX <= restartButton.x + restartButton.w / 2 &&
      mouseY >= restartButton.y - restartButton.h / 2 &&
      mouseY <= restartButton.y + restartButton.h / 2;
    
    if (mouseOverButton && typeof restartGame === "function") {
      restartGame();
      return;
    }
  }
  
  handleMouseInput();
}

function touchStarted() {
  // Si on est sur l'écran de démarrage, toucher pour commencer
  if (gameState === "menu") {
    gameState = "play";
    return false;
  }

  // Si on est sur l'écran de victoire/défaite, vérifier le touch sur le bouton
  if ((gameState === "win" || gameState === "lose") && typeof restartButton !== "undefined") {
    const touchOverButton = 
      mouseX >= restartButton.x - restartButton.w / 2 &&
      mouseX <= restartButton.x + restartButton.w / 2 &&
      mouseY >= restartButton.y - restartButton.h / 2 &&
      mouseY <= restartButton.y + restartButton.h / 2;
    
    if (touchOverButton && typeof restartGame === "function") {
      restartGame();
      return false;
    }
  }
  
  return handleTouchInput();
}
