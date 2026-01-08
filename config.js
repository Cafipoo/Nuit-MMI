// ------------ Game configuration (easy to tweak) ------------
const GAME = {
  // Canvas size is fullscreen/responsive (windowWidth/windowHeight).
  // These are "design reference" values used to scale the level layout.
  designW: 960,
  designH: 540,
  gravityY: 22,
  runSpeed: 7.5,
  airControl: 0.65,
  jumpSpeed: 11.5,
  levelLength: 5200, // world X where the finish flag lives
  fallY: 1200, // lose if player falls below this
  maxHearts: 3, // Nombre maximum de cœurs (chaque cœur = 2 demi-cœurs)
  damagePerHit: 0.5, // Dégâts par hit (en demi-cœurs)
};
