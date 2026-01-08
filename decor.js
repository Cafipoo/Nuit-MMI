// ------------ Decorative elements and backdrop ------------

function drawBackdrop() {
  // Fond simple avec soleil et background
  camera.off();
  push();
  
  // Background en bas, sans déformation, toute la largeur, mais pas jusqu'en haut
  if (typeof mapAssets !== "undefined" && mapAssets.background && mapAssets.background.width) {
    imageMode(CORNER);
    const bgHeight = height * 0.6; // Prend 60% de la hauteur (ne va pas jusqu'en haut)
    const bgWidth = width; // Toute la largeur de l'écran
    const bgY = height - bgHeight; // Commence à partir du bas
    
    // Calculer la hauteur pour préserver le ratio d'aspect en utilisant toute la largeur
    const aspectRatio = (mapAssets.background.width || 1000) / (mapAssets.background.height || 600);
    const calculatedHeight = bgWidth / aspectRatio;
    
    // Utiliser la hauteur calculée pour préserver le ratio, mais limiter à bgHeight
    const finalHeight = Math.min(calculatedHeight, bgHeight);
    
    // Centrer verticalement dans l'espace disponible
    const finalY = height - finalHeight;
    
    image(mapAssets.background, 0, finalY, bgWidth, finalHeight);
  }
  
  // Soleil statique en haut à gauche
  if (typeof mapAssets !== "undefined" && mapAssets.sun) {
    imageMode(CORNER);
    const sunSize = 120;
    const sunX = 30;
    const sunY = 30;
    image(mapAssets.sun, sunX, sunY, sunSize, sunSize);
  }
  
  pop();
  camera.on();
}

