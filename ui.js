// ------------ User Interface (HUD and screens) ------------

function drawHUD() {
  // HUD is screen-space, so we reset the camera transform
  camera.off();
  push();
  rectMode(CENTER);

  // Top bar
  noStroke();
  fill(15, 23, 42, 180);
  rect(width / 2, 26, width, 52);

  fill("#f8fafc");
  textSize(16);
  textAlign(LEFT, CENTER);
  text(`Score: ${score}`, 16, 26);
  
  // Barre de vie (cœurs) - à gauche sous le score
  drawHealthBar();
  
  // Barre de durée du power-up - à droite sous le score
  drawPowerUpBar();


  textAlign(CENTER, CENTER);
  text("Move: gesture '67' (webcam) | Turn: F | Jump: G (Makey Makey) | Fullscreen: P", width / 2, 26);

  textAlign(RIGHT, CENTER);
  text("Restart: R | Mic: click/tap to enable", width - 16, 26);

  // Webcam preview (top-right)
  if (typeof video !== "undefined" && video) {
    const padding = 14;
    const previewW = 220;
    const aspect = (video.height || 480) / (video.width || 640);
    const previewH = Math.round(previewW * aspect);

    const x = width - padding - previewW;
    const y = padding + 52 + 10; // below top bar

    // Frame
    noStroke();
    fill(15, 23, 42, 200);
    rectMode(CORNER);
    rect(x - 6, y - 6, previewW + 12, previewH + 12, 12);

    // Video
    push();
    imageMode(CORNER);
    // Mirror so it feels natural
    translate(x + previewW, y);
    scale(-1, 1);
    image(video, 0, 0, previewW, previewH);
    
    // Dessiner les mains détectées sur la preview
    if (typeof hands !== "undefined" && hands && Array.isArray(hands) && hands.length > 0) {
      const scaleX = previewW / (video.width || 640);
      const scaleY = previewH / (video.height || 480);
      
      for (let i = 0; i < hands.length; i++) {
        let hand = hands[i];
        if (!hand || !hand.keypoints || !Array.isArray(hand.keypoints)) {
          continue;
        }
        
        // Dessiner les connexions squelettiques (lignes vertes)
        if (typeof connections !== "undefined" && connections && Array.isArray(connections)) {
          stroke(0, 255, 0, 200);
          strokeWeight(2.5);
          for (let j = 0; j < connections.length; j++) {
            let connection = connections[j];
            if (!connection || !Array.isArray(connection) || connection.length < 2) {
              continue;
            }
            
            let startIndex = connection[0];
            let endIndex = connection[1];
            
            if (startIndex >= 0 && endIndex >= 0 && 
                startIndex < hand.keypoints.length && endIndex < hand.keypoints.length) {
              let startPoint = hand.keypoints[startIndex];
              let endPoint = hand.keypoints[endIndex];
              
              if (!startPoint || !endPoint || 
                  startPoint.x === undefined || startPoint.y === undefined ||
                  endPoint.x === undefined || endPoint.y === undefined) {
                continue;
              }
              
              // Adapter les coordonnées à la preview (inversées horizontalement)
              let sx = startPoint.x * scaleX;
              let sy = startPoint.y * scaleY;
              let ex = endPoint.x * scaleX;
              let ey = endPoint.y * scaleY;
              
              line(sx, sy, ex, ey);
            }
          }
        }
        
        // Dessiner les keypoints (points verts)
        for (let j = 0; j < hand.keypoints.length; j++) {
          let keypoint = hand.keypoints[j];
          if (!keypoint || keypoint.x === undefined || keypoint.y === undefined) {
            continue;
          }
          
          // Adapter les coordonnées à la preview (inversées horizontalement)
          let kx = keypoint.x * scaleX;
          let ky = keypoint.y * scaleY;
          
          // Couleur spéciale pour le poignet (point important)
          if (keypoint.name === "wrist") {
            // Poignet en vert clair
            fill(0, 255, 100);
            noStroke();
            circle(kx, ky, 10);
            // Contour blanc pour le rendre plus visible
            noFill();
            stroke(255, 255, 255, 200);
            strokeWeight(2);
            circle(kx, ky, 10);
          } else {
            // Autres points (doigts) en vert
            fill(0, 255, 0);
            stroke(50, 50, 50, 150);
            strokeWeight(1);
            circle(kx, ky, 7);
          }
        }
      }
    }
    
    pop();

    // Label avec info de détection
    fill("#f8fafc");
    textSize(12);
    textAlign(RIGHT, TOP);
    let handsInfo = "";
    if (typeof hands !== "undefined" && hands) {
      handsInfo = ` (${hands.length} ${hands.length === 1 ? 'main' : 'mains'})`;
    }
    text("CAM" + handsInfo, x + previewW, y + previewH + 6);
    
    // Afficher l'état du mouvement "67"
    if (typeof bothHandsMoving !== "undefined" && bothHandsMoving) {
      fill(0, 255, 0);
      textAlign(RIGHT, TOP);
      textSize(14);
      text("✓ Mouvement 67 détecté!", x + previewW, y + previewH + 24);
    } else if (typeof hands !== "undefined" && hands && hands.length === 2) {
      fill(255, 200, 0);
      textAlign(RIGHT, TOP);
      textSize(12);
      text("Faites le mouvement alterné haut-bas", x + previewW, y + previewH + 24);
    } else if (typeof hands !== "undefined" && hands && hands.length === 1) {
      fill(255, 150, 0);
      textAlign(RIGHT, TOP);
      textSize(12);
      text("Montrez vos 2 mains à la caméra", x + previewW, y + previewH + 24);
    }
  }

  pop();
  camera.on();
}


function drawHealthBar() {
  if (typeof heartImages === "undefined" || !heartImages || heartImages.length < 3) {
    return; // Images pas encore chargées
  }
  
  const heartHeight = 40; // Hauteur de référence pour un cœur
  const heartSpacing = 8; // Espacement entre les cœurs
  const startX = 16;
  const startY = 50; // Sous le score
  
  // Calculer le nombre de demi-cœurs
  const totalHalfHearts = GAME.maxHearts * 2;
  const currentHalfHearts = Math.max(0, Math.floor(playerHealth));
  
  // Dessiner chaque cœur
  for (let i = 0; i < GAME.maxHearts; i++) {
    // Calculer l'état de ce cœur (0 = vide, 1 = demi, 2 = plein)
    const heartIndex = i * 2; // Index du premier demi-cœur de ce cœur
    let heartState = 0; // 0 = vide, 1 = demi, 2 = plein
    
    if (currentHalfHearts > heartIndex + 1) {
      heartState = 2; // Plein
    } else if (currentHalfHearts > heartIndex) {
      heartState = 1; // Demi
    } else {
      heartState = 0; // Vide
    }
    
    // Sélectionner l'image appropriée
    let heartImg = null;
    if (heartState === 2) {
      heartImg = heartImages[0]; // 100%
    } else if (heartState === 1) {
      heartImg = heartImages[1]; // 50%
    } else {
      heartImg = heartImages[2]; // 0%
    }
    
    // Dessiner le cœur en préservant le ratio d'aspect
    if (heartImg) {
      // Obtenir les dimensions originales du SVG
      const originalW = heartImg.width || 561; // Dimensions par défaut du SVG
      const originalH = heartImg.height || 516;
      const aspectRatio = originalW / originalH;
      
      // Calculer la largeur en préservant le ratio
      const heartWidth = heartHeight * aspectRatio;
      
      // Position X en tenant compte de la largeur réelle
      const heartX = startX + i * (heartWidth + heartSpacing);
      const heartY = startY;
      
      imageMode(CORNER);
      image(heartImg, heartX, heartY, heartWidth, heartHeight);
    }
  }
}

function drawPowerUpBar() {
  // Afficher la barre de durée du power-up seulement si un power-up est actif
  if (typeof activePowerUp === "undefined" || !activePowerUp) {
    return;
  }
  
  const barWidth = 200;
  const barHeight = 20;
  const startX = width - 16 - barWidth; // À droite, aligné avec le texte "Restart: R"
  const startY = 50; // Sous le score, même hauteur que les cœurs
  
  // Calculer le temps restant
  const now = millis();
  const elapsed = now - (typeof powerUpStartTime !== "undefined" ? powerUpStartTime : 0);
  const duration = typeof powerUpDuration !== "undefined" && powerUpDuration > 0 ? powerUpDuration : 10000;
  const remaining = Math.max(0, duration - elapsed);
  const progress = remaining / duration;

  // Style selon le type
  const type = activePowerUp;
  const def = (typeof POWER_UPS !== "undefined" && POWER_UPS[type]) ? POWER_UPS[type] : null;
  const label = def?.label || "POWER UP";
  const colorArr = def?.color || [239, 68, 68];
  const assetKey = def?.assetKey || "framboise";
  
  // Fond de la barre (gris foncé)
  push();
  rectMode(CORNER);
  noStroke();
  fill(15, 23, 42, 200);
  rect(startX, startY, barWidth, barHeight, 4);
  
  // Barre de progression (couleur selon le power-up)
  fill(colorArr[0], colorArr[1], colorArr[2]);
  rect(startX, startY, barWidth * progress, barHeight, 4);
  
  // Bordure
  stroke(255, 255, 255, 150);
  strokeWeight(2);
  noFill();
  rect(startX, startY, barWidth, barHeight, 4);
  
  // Texte (selon le power-up)
  fill(255, 255, 255);
  textSize(12);
  textAlign(CENTER, CENTER);
  text(label, startX + barWidth / 2, startY + barHeight / 2);
  
  // Afficher l'icône du power-up si disponible
  const iconImg = typeof mapAssets !== "undefined" ? mapAssets[assetKey] : null;
  if (iconImg && iconImg.width) {
    push();
    imageMode(CORNER);
    const iconSize = barHeight - 4;
    const aspectRatio = (iconImg.width || 30) / (iconImg.height || 30);
    const iconWidth = iconSize * aspectRatio;
    image(iconImg, startX + 4, startY + 2, iconWidth, iconSize);
    pop();
  }
  
  pop();
}

function drawEndScreen() {
  if (gameState === "win") {
    // Écran de victoire style Absolute Cinema
    drawWinScreen();
  } else {
    // Écran de défaite (Game Over)
    drawLoseScreen();
  }
}

// Variables pour le bouton de rejouer
let restartButton = {
  x: 0,
  y: 0,
  w: 250,
  h: 60
};

function drawWinScreen() {
  // Fond noir style Absolute Cinema
  camera.off();
  push();
  
  // Dessiner le personnage Win au centre (légèrement décalé vers le haut) - taille réduite
  if (typeof winCharacter !== "undefined" && winCharacter && winCharacter.width) {
    push();
    imageMode(CENTER);
    // Taille réduite
    const winSize = min(width * 0.4, height * 0.5);
    const aspectRatio = winCharacter.width / winCharacter.height;
    const winWidth = winSize;
    const winHeight = winSize / aspectRatio;
    
    // Positionner le personnage au centre, légèrement vers le haut
    image(winCharacter, width / 2, height / 2 - 100, winWidth, winHeight);
    pop();
  }
  
  // Texte "ABSOLUTE 67" en bas, style cinéma dramatique
  push();
  textAlign(CENTER);
  textFont("system-ui");
  
  // Texte principal "ABSOLUTE 67" - style bold, blanc, grande taille
  textSize(80);
  textStyle(BOLD);
  fill(255, 255, 255);
  // Légère ombre pour l'effet dramatique
  fill(0, 0, 0, 150);
  text("ABSOLUTE 67", width / 2 + 3, height - 150 + 3);
  fill(255, 255, 255);
  text("ABSOLUTE 67", width / 2, height - 150);
  pop();
  
  // Bouton pour rejouer
  restartButton.x = width / 2;
  restartButton.y = height - 60;
  
  // Détecter si la souris est sur le bouton
  const mouseOverButton = 
    mouseX >= restartButton.x - restartButton.w / 2 &&
    mouseX <= restartButton.x + restartButton.w / 2 &&
    mouseY >= restartButton.y - restartButton.h / 2 &&
    mouseY <= restartButton.y + restartButton.h / 2;
  
  // Dessiner le bouton
  push();
  rectMode(CENTER);
  noStroke();
  fill(mouseOverButton ? 255 : 200, mouseOverButton ? 255 : 200, mouseOverButton ? 255 : 200);
  rect(restartButton.x, restartButton.y, restartButton.w, restartButton.h, 8);
  
  // Texte du bouton
  fill(0, 0, 0);
  textSize(24);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text("REJOUER", restartButton.x, restartButton.y);
  pop();
  
  pop();
  camera.on();
}

function drawLoseScreen() {
  // Keep the world visible, but overlay a centered card
  drawHUD();
  camera.off();
  push();
  rectMode(CENTER);

  noStroke();
  fill(15, 23, 42, 220);
  rect(width / 2, height / 2, min(720, width - 40), 220, 18);

  fill("#f8fafc");
  textAlign(CENTER, CENTER);

  textSize(34);
  text("Game Over", width / 2, height / 2 - 60);

  textSize(18);
  text(player._loseReason || "Try again!", width / 2, height / 2 - 22);

  textSize(16);
  text(`Final score: ${score}`, width / 2, height / 2 + 16);
  text("Press R to restart", width / 2, height / 2 + 52);

  pop();
  camera.on();
}
