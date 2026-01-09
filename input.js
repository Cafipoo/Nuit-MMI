// ------------ Input management (Exergaming hooks) ------------

let mic;
let micEnabled = false;
let tiltGamma = 0; // device tilt left/right in degrees (approx -90..90)
let lastJumpTriggerMs = 0;
let jumpQueued = false; // set by body triggers, consumed once per frame

function getMoveAxis() {
  // Camera-based movement (HandPose)
  if (typeof getHandPoseMoveAxis === "function") {
    const axis = getHandPoseMoveAxis(); // already aligned with playerDirection
    if (axis !== 0) return axis;
  }

  // Keyboard fallback (kept for debugging / when webcam isn't available)
  if (kb.pressing("d") || kb.pressing("D")) return playerDirection;
  return 0;
}

function getJumpPressed() {
  // "Press" style trigger with cooldown.
  // We use a time-based gate so clap/shake doesn't multi-trigger.
  if (!jumpQueued) return false;
  jumpQueued = false;
  return true;
}

// We implement jump triggers by setting lastJumpTriggerMs when a jump is detected.
// Then getJumpPressed() returns true for a single frame when cooldown allows.
function triggerJumpIfReady() {
  const now = millis();
  const cooldownMs = 280;
  if (now - lastJumpTriggerMs < cooldownMs) return false;
  lastJumpTriggerMs = now;
  jumpQueued = true;
  return true;
}

function initBodyInputs() {
  // Device tilt (phone/tablet): no external libs needed.
  // Note: on iOS, motion/orientation requires a permission request via user gesture.
  window.addEventListener("deviceorientation", (e) => {
    if (typeof e.gamma === "number") tiltGamma = e.gamma;
  });

  // Device shake jump (optional)
  window.addEventListener("devicemotion", (e) => {
    const a = e.accelerationIncludingGravity;
    if (!a) return;
    const ax = a.x || 0;
    const ay = a.y || 0;
    const az = a.z || 0;
    const mag = sqrt(ax * ax + ay * ay + az * az);
    // Quick spike threshold (tweak for comfort)
    if (mag > 22) triggerJumpIfReady();
  });
}

function enableMicrophone() {
  // This must be called from a user gesture in most browsers.
  if (micEnabled) return;
  userStartAudio();
  mic = new p5.AudioIn();
  mic.start(
    () => {
      micEnabled = true;
    },
    () => {
      micEnabled = false;
    }
  );
}

function updateBodyInputs() {
  // Microphone clap jump (works well on laptops/desktops too).
  if (micEnabled && mic) {
    const level = mic.getLevel(); // 0..~1
    // Threshold tuned for claps/strong voice (adjust for your room)
    if (level > 0.18) triggerJumpIfReady();
  }
}

function handleKeyInput() {
  // Jump with G (Makey Makey can map a pad to G key, so it works automatically)
  if (key === "g" || key === "G") {
    triggerJumpIfReady();
  }
  // Turn around (change direction) with F
  if (key === "f" || key === "F") {
    turnPlayer();
  }
  // Shoot missile with M
  if (key === "m" || key === "M") {
    if (typeof tryFireMissile === "function") {
      tryFireMissile();
    }
  }
  // Fullscreen toggle with P
  if (key === "p" || key === "P") {
    fullscreen(!fullscreen());
  }
  if (key === "r" || key === "R") {
    restartGame();
  }
}

function handleMouseInput() {
  // Not a movement control: only used to unlock mic permissions.
  enableMicrophone();
}

function handleTouchInput() {
  // Mobile-friendly: tap to unlock mic permissions.
  enableMicrophone();
  return false;
}
