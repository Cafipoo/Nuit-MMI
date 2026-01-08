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

function drawEndScreen() {
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
  if (gameState === "win") text("You Win!", width / 2, height / 2 - 60);
  else text("Game Over", width / 2, height / 2 - 60);

  textSize(18);
  if (gameState === "lose") {
    text(player._loseReason || "Try again!", width / 2, height / 2 - 22);
  } else {
    text("Nice run — keep moving!", width / 2, height / 2 - 22);
  }

  textSize(16);
  text(`Final score: ${score}`, width / 2, height / 2 + 16);
  text("Press R to restart", width / 2, height / 2 + 52);

  pop();
  camera.on();
}
