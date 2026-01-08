// ------------ HandPose (camera) movement control ------------

// Variable pour stocker le modèle HandPose
let handPose;

// Variable pour stocker la vidéo de la webcam
let video;

// Variable pour stocker les mains détectées
let hands = [];

// Variable pour stocker les connexions squelettiques
let connections = [];

// Variables pour suivre les positions précédentes des poignets
let previousPositions = {
  left: [],
  right: []
};

// Paramètres de détection du mouvement
let movementThreshold = 15; // Distance minimale pour considérer un mouvement (réduit pour plus de tolérance)
let historyLength = 10; // Nombre de frames à garder en mémoire
let bothHandsMoving = false;
let movementCount = 0; // Compteur de mouvements détectés
let movementMomentum = 0; // Momentum pour continuer le mouvement même si la détection est intermittente
let lastMovementTime = 0; // Temps du dernier mouvement détecté
let currentMovementSpeed = 0; // Vitesse actuelle du mouvement (pixels par frame)
let previousFrameTime = 0; // Temps de la frame précédente pour calculer la vitesse

// Variables pour suivre l'historique des mouvements de chaque main (pour gérer la désynchronisation)
let leftHandMovementHistory = []; // Historique des frames où la main gauche a bougé
let rightHandMovementHistory = []; // Historique des frames où la main droite a bougé
let movementWindow = 15; // Fenêtre temporelle pour accepter la désynchronisation (en frames)

// Variables pour détecter le mouvement "67" (désynchronisé)
let leftHandDirection = []; // Historique des directions de mouvement de la main gauche (1 = monte, -1 = descend)
let rightHandDirection = []; // Historique des directions de mouvement de la main droite

let handPoseReady = false;
let handPoseEnabled = true;

function initHandPoseInputs() {
  if (typeof ml5 === "undefined" || !ml5 || typeof ml5.handPose !== "function") {
    handPoseEnabled = false;
    return;
  }

  try {
    // Créer la vidéo et la cacher
    video = createCapture(VIDEO);
    if (!video) {
      handPoseEnabled = false;
      return;
    }
    
    video.size(640, 480);
    video.hide();
    
    // Charger le modèle HandPose avec callback
    handPose = ml5.handPose(() => {
      if (!handPose) {
        handPoseEnabled = false;
        return;
      }
      
      try {
        // Obtenir les connexions squelettiques
        connections = handPose.getConnections();
        if (!connections) {
          connections = [];
        }
        
        // Démarrer la détection des mains depuis la vidéo de la webcam
        if (video && typeof handPose.detectStart === "function") {
          handPose.detectStart(video, gotHands);
        }
        
        handPoseReady = true;
      } catch (e) {
        handPoseEnabled = false;
        handPoseReady = false;
      }
    });
  } catch (e) {
    handPoseEnabled = false;
    handPoseReady = false;
  }
}

// Fonction callback appelée quand handPose détecte des mains
function gotHands(results) {
  // Sauvegarder les résultats dans la variable hands avec vérification de sécurité
  if (!results || !Array.isArray(results)) {
    hands = [];
    return;
  }
  
  hands = results;
  
  // Mettre à jour les positions précédentes et détecter les mouvements
  if (handPoseEnabled && handPoseReady) {
    updateHandPositions();
    detectMovement();
  }
}

function updateHandPoseInputs() {
  // Nothing needed per-frame: ml5 calls gotHands continuously.
}

function getHandPoseMoveAxis() {
  if (!handPoseEnabled || !handPoseReady) return 0;

  // Map camera motion speed to a normalized axis strength (0..1)
  let strength = constrain(currentMovementSpeed / 12, 0, 1);

  const shouldMove = bothHandsMoving || movementMomentum > 0;
  if (!shouldMove) return 0;

  // Keep a small "coast" while momentum is active
  if (movementMomentum > 0) {
    strength = Math.max(strength, 0.12 + (movementMomentum / 15) * 0.18);
  }

  // Player moves forward in their current facing direction
  return (typeof playerDirection === "number" ? playerDirection : 1) * strength;
}

function getHandPoseDebug() {
  return {
    enabled: handPoseEnabled && handPoseReady,
    hands: hands.length,
    bothHandsMoving,
    momentum: movementMomentum,
    speed: currentMovementSpeed,
  };
}

// Fonction pour mettre à jour les positions précédentes des poignets
function updateHandPositions() {
  // Vérification de sécurité
  if (!hands || !Array.isArray(hands)) {
    return;
  }
  
  // Trouver les poignets (keypoint "wrist")
  let leftWrist = null;
  let rightWrist = null;
  
  for (let i = 0; i < hands.length; i++) {
    let hand = hands[i];
    if (!hand || !hand.keypoints || !Array.isArray(hand.keypoints)) {
      continue;
    }
    
    for (let j = 0; j < hand.keypoints.length; j++) {
      let keypoint = hand.keypoints[j];
      if (!keypoint || !keypoint.name || keypoint.x === undefined || keypoint.y === undefined) {
        continue;
      }
      
      if (keypoint.name === "wrist") {
        if (hand.handedness === "Left") {
          leftWrist = { x: keypoint.x, y: keypoint.y };
        } else if (hand.handedness === "Right") {
          rightWrist = { x: keypoint.x, y: keypoint.y };
        }
      }
    }
  }
  
  // Ajouter les positions à l'historique
  if (leftWrist) {
    previousPositions.left.push({ x: leftWrist.x, y: leftWrist.y });
    if (previousPositions.left.length > historyLength) {
      previousPositions.left.shift(); // Garder seulement les dernières positions
    }
  } else {
    // Ne pas réinitialiser complètement, garder quelques frames pour plus de tolérance
    // Réduire progressivement l'historique au lieu de le vider
    if (previousPositions.left.length > 0) {
      previousPositions.left.shift();
    }
  }
  
  if (rightWrist) {
    previousPositions.right.push({ x: rightWrist.x, y: rightWrist.y });
    if (previousPositions.right.length > historyLength) {
      previousPositions.right.shift();
    }
  } else {
    // Ne pas réinitialiser complètement, garder quelques frames pour plus de tolérance
    if (previousPositions.right.length > 0) {
      previousPositions.right.shift();
    }
  }
}

// Fonction pour détecter le mouvement vertical (haut-bas) des deux mains
function detectMovement() {
  let leftMoving = false;
  let rightMoving = false;
  let leftSpeed = 0;
  let rightSpeed = 0;
  
  // Analyser le mouvement de la main gauche (avec moins de frames nécessaires)
  if (previousPositions.left.length >= 3) {
    let leftResult = isVerticalMovement(previousPositions.left);
    leftMoving = leftResult.moving;
    leftSpeed = leftResult.speed;
  }
  
  // Analyser le mouvement de la main droite (avec moins de frames nécessaires)
  if (previousPositions.right.length >= 3) {
    let rightResult = isVerticalMovement(previousPositions.right);
    rightMoving = rightResult.moving;
    rightSpeed = rightResult.speed;
  }
  
  // Mettre à jour l'historique des mouvements de chaque main
  if (leftMoving) {
    leftHandMovementHistory.push(frameCount);
    // Garder seulement les dernières frames
    if (leftHandMovementHistory.length > movementWindow) {
      leftHandMovementHistory.shift();
    }
  }
  
  if (rightMoving) {
    rightHandMovementHistory.push(frameCount);
    // Garder seulement les dernières frames
    if (rightHandMovementHistory.length > movementWindow) {
      rightHandMovementHistory.shift();
    }
  }
  
  // Nettoyer l'historique des frames trop anciennes
  let currentFrame = frameCount;
  leftHandMovementHistory = leftHandMovementHistory.filter(f => currentFrame - f <= movementWindow);
  rightHandMovementHistory = rightHandMovementHistory.filter(f => currentFrame - f <= movementWindow);
  
  // Vérifier que les deux mains sont détectées
  let bothHandsDetected = previousPositions.left.length > 0 && previousPositions.right.length > 0;
  
  if (bothHandsDetected) {
    // Vérifier si les deux mains ont bougé récemment (dans la fenêtre temporelle)
    let leftHasMovedRecently = leftHandMovementHistory.length > 0;
    let rightHasMovedRecently = rightHandMovementHistory.length > 0;
    
    // Calculer les directions de mouvement pour détecter le pattern "67"
    let leftDir = getMovementDirection(previousPositions.left);
    let rightDir = getMovementDirection(previousPositions.right);
    
    // Ajouter les directions à l'historique
    if (leftDir !== 0) {
      leftHandDirection.push(leftDir);
      if (leftHandDirection.length > 10) leftHandDirection.shift();
    }
    if (rightDir !== 0) {
      rightHandDirection.push(rightDir);
      if (rightHandDirection.length > 10) rightHandDirection.shift();
    }
    
    // Vérifier que c'est bien le mouvement "67" (désynchronisé) et pas un mouvement synchronisé
    let is67Movement = check67Movement(leftHasMovedRecently, rightHasMovedRecently, leftMoving, rightMoving);
    
    // Les deux mains doivent avoir bougé récemment ET faire le mouvement "67"
    bothHandsMoving = leftHasMovedRecently && rightHasMovedRecently && is67Movement;
    
    // Calculer la vitesse moyenne des deux mains
    if (bothHandsMoving) {
      // Si les deux mains bougent actuellement, utiliser la moyenne
      if (leftMoving && rightMoving) {
        currentMovementSpeed = (leftSpeed + rightSpeed) / 2;
      } 
      // Si une seule bouge actuellement mais l'autre a bougé récemment, utiliser celle qui bouge
      else if (leftMoving) {
        currentMovementSpeed = leftSpeed;
      } 
      else if (rightMoving) {
        currentMovementSpeed = rightSpeed;
      }
      // Si aucune ne bouge actuellement mais les deux ont bougé récemment, utiliser la dernière vitesse
      else {
        // Garder la vitesse actuelle ou la réduire légèrement
        currentMovementSpeed *= 0.95;
      }
    } else {
      // Si les deux mains ne bougent pas toutes les deux, arrêter
      bothHandsMoving = false;
      currentMovementSpeed = 0;
    }
  } else {
    // Si les deux mains ne sont pas détectées, ne pas avancer
    bothHandsMoving = false;
    currentMovementSpeed = 0;
  }
  
  // Si un mouvement est détecté, mettre à jour le momentum
  if (bothHandsMoving) {
    movementMomentum = 15; // Momentum augmenté pour gérer la désynchronisation
    lastMovementTime = millis();
    movementCount++;
  } else {
    // Continuer le mouvement avec le momentum même si la détection est intermittente
    if (movementMomentum > 0) {
      movementMomentum--;
      // Réduire progressivement la vitesse avec le momentum
      currentMovementSpeed *= 0.85; // Décélération progressive
      // Considérer qu'on bouge toujours pour l'affichage
      if (millis() - lastMovementTime < 300) { // 300ms de grâce
        bothHandsMoving = true;
      }
    } else {
      currentMovementSpeed = 0;
    }
  }
}

// Fonction pour obtenir la direction du mouvement vertical (-1 = descend, 1 = monte, 0 = pas de mouvement)
function getMovementDirection(positions) {
  if (positions.length < 3) return 0;
  
  let recentPositions = positions.slice(-5);
  if (recentPositions.length < 2) return 0;
  
  // Comparer la position la plus récente avec une position plus ancienne
  let oldY = recentPositions[0].y;
  let newY = recentPositions[recentPositions.length - 1].y;
  
  let deltaY = newY - oldY;
  
  // Seuil pour considérer un mouvement significatif
  if (Math.abs(deltaY) < 10) return 0;
  
  return deltaY > 0 ? -1 : 1; // -1 = descend, 1 = monte
}

// Fonction pour vérifier si c'est le mouvement "67" (désynchronisé) et pas un mouvement synchronisé
function check67Movement(leftHasMovedRecently, rightHasMovedRecently, leftMoving, rightMoving) {
  // Si les deux mains bougent exactement en même temps, ce n'est PAS le mouvement "67"
  if (leftMoving && rightMoving) {
    // Vérifier si elles bougent dans la même direction (mouvement synchronisé)
    if (leftHandDirection.length > 0 && rightHandDirection.length > 0) {
      let leftLastDir = leftHandDirection[leftHandDirection.length - 1];
      let rightLastDir = rightHandDirection[rightHandDirection.length - 1];
      
      // Si elles bougent dans la même direction en même temps, c'est synchronisé (pas "67")
      if (leftLastDir === rightLastDir && leftLastDir !== 0) {
        return false;
      }
    }
  }
  
  // Le mouvement "67" nécessite que les deux mains aient bougé récemment
  // mais pas nécessairement en même temps (désynchronisation)
  if (!leftHasMovedRecently || !rightHasMovedRecently) {
    return false;
  }
  
  // Vérifier qu'il y a un pattern alterné dans l'historique
  // Les deux mains doivent avoir des directions différentes à certains moments
  if (leftHandDirection.length >= 3 && rightHandDirection.length >= 3) {
    // Vérifier qu'il y a de la variation (les mains ne bougent pas toujours dans la même direction)
    let leftHasVariation = false;
    let rightHasVariation = false;
    
    for (let i = 1; i < leftHandDirection.length; i++) {
      if (leftHandDirection[i] !== leftHandDirection[i-1] && leftHandDirection[i] !== 0) {
        leftHasVariation = true;
        break;
      }
    }
    
    for (let i = 1; i < rightHandDirection.length; i++) {
      if (rightHandDirection[i] !== rightHandDirection[i-1] && rightHandDirection[i] !== 0) {
        rightHasVariation = true;
        break;
      }
    }
    
    // Les deux mains doivent avoir de la variation (mouvement haut-bas)
    if (!leftHasVariation || !rightHasVariation) {
      return false;
    }
    
    // Vérifier qu'elles ne sont pas toujours synchronisées
    let synchronizedCount = 0;
    let minLength = Math.min(leftHandDirection.length, rightHandDirection.length);
    for (let i = 0; i < minLength; i++) {
      if (leftHandDirection[i] === rightHandDirection[i] && leftHandDirection[i] !== 0) {
        synchronizedCount++;
      }
    }
    
    // Si plus de 70% des mouvements sont synchronisés, ce n'est pas le mouvement "67"
    if (synchronizedCount / minLength > 0.7) {
      return false;
    }
  }
  
  return true;
}

// Fonction pour vérifier si une main fait un mouvement vertical et calculer sa vitesse
function isVerticalMovement(positions) {
  if (positions.length < 3) {
    return { moving: false, speed: 0 };
  }
  
  // Calculer la variation verticale (Y) - utiliser les dernières positions
  let recentPositions = positions.slice(-5); // Utiliser seulement les 5 dernières positions
  let minY = recentPositions[0].y;
  let maxY = recentPositions[0].y;
  
  for (let i = 1; i < recentPositions.length; i++) {
    if (recentPositions[i].y < minY) minY = recentPositions[i].y;
    if (recentPositions[i].y > maxY) maxY = recentPositions[i].y;
  }
  
  let verticalRange = maxY - minY;
  
  // Calculer la variation horizontale (X)
  let minX = recentPositions[0].x;
  let maxX = recentPositions[0].x;
  
  for (let i = 1; i < recentPositions.length; i++) {
    if (recentPositions[i].x < minX) minX = recentPositions[i].x;
    if (recentPositions[i].x > maxX) maxX = recentPositions[i].x;
  }
  
  let horizontalRange = maxX - minX;
  
  // Calculer la vitesse du mouvement vertical
  // Vitesse = distance parcourue verticalement / nombre de frames
  let speed = 0;
  if (recentPositions.length >= 2) {
    // Calculer la distance totale parcourue verticalement
    let totalVerticalDistance = 0;
    for (let i = 1; i < recentPositions.length; i++) {
      let deltaY = Math.abs(recentPositions[i].y - recentPositions[i-1].y);
      totalVerticalDistance += deltaY;
    }
    // Vitesse moyenne en pixels par frame
    speed = totalVerticalDistance / (recentPositions.length - 1);
  }
  
  // Plus tolérant : mouvement vertical si :
  // 1. La variation verticale est significative (seuil réduit)
  // 2. La variation verticale est au moins égale à la variation horizontale (ratio réduit)
  // 3. OU si la variation verticale est simplement supérieure au seuil (même avec mouvement horizontal)
  let isMoving = verticalRange > movementThreshold && (verticalRange >= horizontalRange || verticalRange > movementThreshold * 1.5);
  
  return { 
    moving: isMoving, 
    speed: isMoving ? speed : 0 
  };
}
