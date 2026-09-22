/**
 * JUEGO ZAMO - FUGA DEL LABORATORIO: OPERACIÓN COCODRILO
 * Remaster Gráfico de Alta Fidelidad & HUD Táctico Futurista
 * Protagonista: El Sargento Zamo (Cocodrilo Comando Táctico - Renderizado Procedural en 2.5D)
 * Vista superior, iluminación dinámica con linterna volumétrica, suelo metálico texturizado,
 * portal holográfico 3D, arsenal progresivo por oleadas, cambio por rueda de ratón
 * y HUD translúcido con biometría, cartuchos detallados y efectos visuales de partículas.
 */

(function () {
  const canvas = document.querySelector("#unity-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const W = 1024;
  const H = 576;
  canvas.width = W;
  canvas.height = H;

  // Helper de audio sintetizado Web Audio API
  const audio = () => window.ZamoAudio || {};

  // -------------------------------------------------------------
  // ESTADOS DEL JUEGO
  // -------------------------------------------------------------
  let gameState = "STORY"; // STORY, SECTOR_ENTER, PLAYING, PORTAL_WARP, PAUSED, ROUND_OVER, GAME_OVER, VICTORY_TOTAL
  let roundNumber = 1;
  const MAX_ROUNDS = 5;
  let score = 0;
  let zombiesKilledTotal = 0;
  let shotsFired = 0;
  let shotsHit = 0;

  let portalWarpTimer = 0;
  const PORTAL_WARP_DURATION = 75; // ~1.25s
  let sectorEnterTimer = 0;
  const SECTOR_ENTER_DURATION = 80; // ~1.3s

  let lastTime = performance.now();
  let cameraShake = 0;
  let bannerMessage = null; // Banner flotante con onda de audio para transmisiones
  let ecgPhase = 0; // Fase de animación del monitor cardíaco (ECG)
  let gameTime = 0;
  let modalAnim = 20;
  let previousGameState = gameState;

  // -------------------------------------------------------------
  // ARSENAL TÁCTICO & PROGRESIÓN POR OLEADAS
  // -------------------------------------------------------------
  const WEAPONS = [
    {
      id: "shotgun",
      name: "Escopeta Táctica Zamo",
      desc: "Dispersión Pesada • Alta Detención",
      tier: "TIER 1 // ASALTO CERCANO",
      icon: "💥",
      magSize: 8,
      ammo: 8,
      reserves: 40,
      fireRate: 460,
      reloadTime: 1200,
      damage: 30,
      pellets: 6,
      spread: 0.26,
      speed: 17,
      recoil: 6,
      color: "#f59e0b",
      bulletType: "shell",
      unlockedAtRound: 1,
      isUnlocked: true
    },
    {
      id: "rifle",
      name: "Rifle de Asalto Mil-Spec",
      desc: "Automático • Alta Precisión",
      tier: "TIER 2 // CADENCIA MEDIA",
      icon: "⚡",
      magSize: 32,
      ammo: 32,
      reserves: 160,
      fireRate: 110,
      reloadTime: 1400,
      damage: 23,
      pellets: 1,
      spread: 0.065,
      speed: 24,
      recoil: 3,
      color: "#38bdf8",
      bulletType: "rifle",
      unlockedAtRound: 2,
      isUnlocked: false
    },
    {
      id: "smg",
      name: "Subfusil Dual Viper",
      desc: "Ráfagas Ultrarrápidas • Recarga Veloz",
      tier: "TIER 3 // SUPRESIÓN CONTINUA",
      icon: "🔫",
      magSize: 45,
      ammo: 45,
      reserves: 225,
      fireRate: 75,
      reloadTime: 1000,
      damage: 17,
      pellets: 1,
      spread: 0.11,
      speed: 25,
      recoil: 2,
      color: "#c084fc",
      bulletType: "smg",
      unlockedAtRound: 3,
      isUnlocked: false
    },
    {
      id: "plasma",
      name: "Cañón de Plasma Iónico",
      desc: "Orbes Perforantes • Daño de Área",
      tier: "TIER 4 // ENERGÍA EXPERIMENTAL",
      icon: "🌀",
      magSize: 12,
      ammo: 12,
      reserves: 60,
      fireRate: 420,
      reloadTime: 1600,
      damage: 45,
      pellets: 1,
      spread: 0.02,
      speed: 15,
      recoil: 7,
      color: "#22d3ee",
      bulletType: "plasma",
      isPlasma: true,
      unlockedAtRound: 4,
      isUnlocked: false
    },
    {
      id: "launcher",
      name: "Lanzagranadas BFG Devastador",
      desc: "Ojivas Explosivas • Onda Expansiva",
      tier: "TIER 5 // PROTOCOLO ANIQUILACIÓN",
      icon: "🚀",
      magSize: 6,
      ammo: 6,
      reserves: 24,
      fireRate: 650,
      reloadTime: 2000,
      damage: 160,
      pellets: 1,
      spread: 0.02,
      speed: 13,
      recoil: 10,
      color: "#f87171",
      bulletType: "rocket",
      isExplosive: true,
      unlockedAtRound: 5,
      isUnlocked: false
    }
  ];

  // -------------------------------------------------------------
  // CONTROLES: TECLADO, RATÓN Y RUEDA
  // -------------------------------------------------------------
  const keys = {};
  const mouse = { x: W / 2, y: H / 2, downLeft: false, downRight: false };
  let controlMode = "keyboard";
  let gamepadMoveX = 0;
  let gamepadMoveY = 0;
  let gamepadSprint = false;
  let gamepadAutoAim = false;
  let pauseSelectedButton = 0;
  let gameOverSelectedButton = 0;
  let lastPauseAxisY = 0;

  function togglePause() {
    if (gameState === "PLAYING") {
      gameState = "PAUSED";
      pauseSelectedButton = 0;
      if (audio().playAlert) audio().playAlert();
    } else if (gameState === "PAUSED") {
      gameState = "PLAYING";
      lastTime = performance.now();
      if (audio().playAlert) audio().playAlert();
    }
  }

  window.addEventListener("keydown", (e) => {
    controlMode = "keyboard";
    keys[e.code] = true;
    if (e.code === "KeyP" || e.code === "Escape") {
      togglePause();
      e.preventDefault();
      return;
    }

    if (gameState === "STORY") {
      if (e.code === "Space" || e.code === "Enter") {
        startGame();
        e.preventDefault();
      }
      return;
    }

    if (gameState === "ROUND_OVER") {
      if (e.code === "Space" || e.code === "Enter") {
        advanceToNextRound();
        e.preventDefault();
      }
      return;
    }

    if (gameState === "GAME_OVER" || gameState === "VICTORY_TOTAL") {
      if (e.code === "Space" || e.code === "Enter") {
        restartGame();
        e.preventDefault();
      }
      return;
    }

    if (gameState === "PLAYING") {
      if (e.code === "KeyR") player.reload();
      if (e.code === "KeyQ") player.cycleWeapon(1);
      if (e.code === "Digit1") player.selectWeaponByIdx(0);
      if (e.code === "Digit2") player.selectWeaponByIdx(1);
      if (e.code === "Digit3") player.selectWeaponByIdx(2);
      if (e.code === "Digit4") player.selectWeaponByIdx(3);
      if (e.code === "Digit5") player.selectWeaponByIdx(4);
      if (e.code === "Space") {
        player.dash();
        e.preventDefault();
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  // Cambio de armas ultrasuave con la rueda del ratón
  window.addEventListener("wheel", (e) => {
    if (gameState === "PLAYING") {
      if (e.deltaY > 0) {
        player.cycleWeapon(1); // Siguiente arma
      } else if (e.deltaY < 0) {
        player.cycleWeapon(-1); // Arma previa
      }
    }
  }, { passive: true });

  canvas.addEventListener("mousemove", (e) => {
    controlMode = "keyboard";
    touchControls.enabled = false;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouse.x = (e.clientX - rect.left) * scaleX;
    mouse.y = (e.clientY - rect.top) * scaleY;
  });

  canvas.addEventListener("mousedown", (e) => {
    controlMode = "keyboard";
    touchControls.enabled = false;
    if (e.button === 0) {
      mouse.downLeft = true;
      handleCanvasClick(mouse.x, mouse.y);
    }
    if (e.button === 2) mouse.downRight = true;
  });

  canvas.addEventListener("mouseup", (e) => {
    if (e.button === 0) mouse.downLeft = false;
    if (e.button === 2) mouse.downRight = false;
  });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  // -------------------------------------------------------------
  // DETECCIÓN MULTIPLATAFORMA (MÓVIL TÁCTIL, MANDOS Y PC)
  // -------------------------------------------------------------
  let isMobileDevice = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  let gamepadConnected = false;
  let lastGpButtons = [];

  const touchControls = {
    enabled: isMobileDevice,
    autoAim: true, // Activado por defecto en móvil para apuntado automático suave
    currentTarget: null,
    stick: {
      active: false,
      id: null,
      baseX: 105,
      baseY: H - 105,
      currentX: 105,
      currentY: H - 105,
      vx: 0,
      vy: 0,
      baseR: 52,
      handleR: 24
    },
    buttons: [
      { id: "shoot", x: W - 85, y: H - 85, r: 38, icon: "🔥", label: "DISPARO", bg: "#ef4444", pressed: false },
      { id: "aim", x: W - 180, y: H - 65, r: 26, icon: "🎯", label: "AUTO", bg: "#38bdf8", pressed: false },
      { id: "dash", x: W - 85, y: H - 180, r: 28, icon: "⚡", label: "DASH", bg: "#22c55e", pressed: false },
      { id: "sprint", x: W - 175, y: H - 205, r: 26, icon: "🏃", label: "CORRER", bg: "#f97316", pressed: false },
      { id: "reload", x: W - 175, y: H - 130, r: 26, icon: "🔄", label: "RECARGA", bg: "#f59e0b", pressed: false },
      { id: "swap", x: W - 40, y: H - 175, r: 26, icon: "🔫", label: "ARMA", bg: "#c084fc", pressed: false }
    ]
  };

  function getClosestZombie() {
    let closest = null;
    let minDist = Infinity;
    for (const z of zombies) {
      if (z.health <= 0) continue;
      const d = Math.hypot(z.x - player.x, z.y - player.y);
      if (d < minDist) {
        minDist = d;
        closest = z;
      }
    }
    return closest;
  }

  function getCanvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function handleTouchStart(e) {
    controlMode = "touch";
    touchControls.enabled = true;

    if (gameState !== "PLAYING") {
      const t = e.changedTouches[0];
      const point = getCanvasPoint(t.clientX, t.clientY);
      handleCanvasClick(point.x, point.y);
      e.preventDefault();
      return;
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const point = getCanvasPoint(t.clientX, t.clientY);
      const tx = point.x;
      const ty = point.y;

      // Botón de Pausa superior derecho
      if (tx >= W - 110 && tx <= W - 20 && ty >= 10 && ty <= 50) {
        togglePause();
        continue;
      }

      // Botones de acción táctil en la derecha
      let hitBtn = false;
      for (const btn of touchControls.buttons) {
        if (Math.hypot(tx - btn.x, ty - btn.y) < btn.r + 24) {
          btn.pressed = true;
          hitBtn = true;
          if (btn.id === "shoot") player.shoot();
          else if (btn.id === "aim") {
            touchControls.autoAim = !touchControls.autoAim;
            showBanner(touchControls.autoAim ? "🎯 AUTO-APUNTADO ACTIVADO" : "🎯 AUTO-APUNTADO DESACTIVADO", "#38bdf8", 80);
          } else if (btn.id === "dash") player.dash();
          else if (btn.id === "sprint") btn.pressed = true;
          else if (btn.id === "reload") player.reload();
          else if (btn.id === "swap") player.cycleWeapon(1);
          break;
        }
      }

      // Joystick virtual en la mitad izquierda
      if (!hitBtn && tx < W * 0.45 && !touchControls.stick.active) {
        touchControls.stick.active = true;
        touchControls.stick.id = t.identifier;
        touchControls.stick.baseX = tx;
        touchControls.stick.baseY = ty;
        touchControls.stick.currentX = tx;
        touchControls.stick.currentY = ty;
        touchControls.stick.vx = 0;
        touchControls.stick.vy = 0;
      }
    }
    e.preventDefault();
  }

  function handleTouchMove(e) {
    if (gameState !== "PLAYING") return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (touchControls.stick.active && t.identifier === touchControls.stick.id) {
        const point = getCanvasPoint(t.clientX, t.clientY);
        const tx = point.x;
        const ty = point.y;
        const dx = tx - touchControls.stick.baseX;
        const dy = ty - touchControls.stick.baseY;
        const dist = Math.hypot(dx, dy);
        const maxDist = touchControls.stick.baseR;
        const angle = Math.atan2(dy, dx);
        const clampedDist = Math.min(dist, maxDist);

        touchControls.stick.currentX = touchControls.stick.baseX + Math.cos(angle) * clampedDist;
        touchControls.stick.currentY = touchControls.stick.baseY + Math.sin(angle) * clampedDist;
        touchControls.stick.vx = clampedDist > 8 ? (Math.cos(angle) * (clampedDist / maxDist)) : 0;
        touchControls.stick.vy = clampedDist > 8 ? (Math.sin(angle) * (clampedDist / maxDist)) : 0;

        if (!touchControls.autoAim && clampedDist > 12) {
          player.angle = angle;
        }
      }
    }
    e.preventDefault();
  }

  function handleTouchEnd(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (touchControls.stick.active && t.identifier === touchControls.stick.id) {
        touchControls.stick.active = false;
        touchControls.stick.id = null;
        touchControls.stick.vx = 0;
        touchControls.stick.vy = 0;
        touchControls.stick.currentX = touchControls.stick.baseX;
        touchControls.stick.currentY = touchControls.stick.baseY;
      }
      for (const btn of touchControls.buttons) {
        btn.pressed = false;
      }
    }
    e.preventDefault();
  }

  canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
  canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
  canvas.addEventListener("touchend", handleTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", handleTouchEnd, { passive: false });

  // -------------------------------------------------------------
  // GAMEPAD API (SOPORTE NATIVO PARA MANDOS XBOX / PLAYSTATION / BLUETOOTH)
  // -------------------------------------------------------------
  window.addEventListener("gamepadconnected", (e) => {
    gamepadConnected = true;
    showBanner(`🎮 MANDO CONECTADO: ${e.gamepad.id.slice(0, 20).toUpperCase()}`, "#22c55e", 160);
  });

  window.addEventListener("gamepaddisconnected", () => {
    gamepadConnected = false;
    showBanner("🎮 MANDO DESCONECTADO", "#f59e0b", 120);
  });

  function updateGamepad(dt) {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    gamepadMoveX = 0;
    gamepadMoveY = 0;
    gamepadSprint = false;
    gamepadAutoAim = false;
    if (!gamepads) return;
    const gp = gamepads[0] || gamepads[1];
    if (!gp) {
      gamepadConnected = false;
      return;
    }
    gamepadConnected = true;

    const deadzone = 0.18;

    // Stick Izquierdo: Movimiento de Zamo
    const lx = Math.abs(gp.axes[0]) > deadzone ? gp.axes[0] : 0;
    const ly = Math.abs(gp.axes[1]) > deadzone ? gp.axes[1] : 0;
    gamepadMoveX = lx;
    gamepadMoveY = ly;
    gamepadSprint = Boolean(gp.buttons[10] && gp.buttons[10].pressed);

    // Stick Derecho: Apuntado analógico de 360°
    const rx = Math.abs(gp.axes[2]) > deadzone ? gp.axes[2] : 0;
    const ry = Math.abs(gp.axes[3]) > deadzone ? gp.axes[3] : 0;
    if (rx !== 0 || ry !== 0) {
      player.angle = Math.atan2(ry, rx);
    }

    // Gatillo Izquierdo (LT / L2): Auto-apuntado al zombi más cercano
    const isAutoAim = gp.buttons[6] && gp.buttons[6].pressed;
    gamepadAutoAim = isAutoAim;
    if (isAutoAim) {
      const target = getClosestZombie();
      touchControls.currentTarget = target;
      if (target) {
        player.angle = Math.atan2(target.y - player.y, target.x - player.x);
      }
    }

    // Gatillo Derecho (RT / R2) o Botón RB (5): Disparo continuo
    const isShooting = (gp.buttons[7] && gp.buttons[7].pressed) || (gp.buttons[5] && gp.buttons[5].pressed);
    if (isShooting && gameState === "PLAYING") {
      player.shoot();
    }

    const hasGamepadInput = lx !== 0 || ly !== 0 || rx !== 0 || ry !== 0 || isAutoAim || isShooting ||
      gp.buttons.some((button) => button.pressed);
    if (hasGamepadInput) controlMode = "gamepad";

    const pauseAxisY = Math.abs(ly) > deadzone ? ly : 0;
    if (gameState === "PAUSED") {
      if (pauseAxisY !== 0 && lastPauseAxisY === 0) {
        pauseSelectedButton = pauseAxisY > 0 ? 1 : 0;
      }
      if (gp.buttons[12] && gp.buttons[12].pressed && !lastGpButtons[12]) pauseSelectedButton = 0;
      if (gp.buttons[13] && gp.buttons[13].pressed && !lastGpButtons[13]) pauseSelectedButton = 1;
      lastPauseAxisY = pauseAxisY;
    } else if (gameState === "GAME_OVER") {
      if (pauseAxisY !== 0 && lastPauseAxisY === 0) {
        gameOverSelectedButton = pauseAxisY > 0 ? 1 : 0;
      }
      if (gp.buttons[12] && gp.buttons[12].pressed && !lastGpButtons[12]) gameOverSelectedButton = 0;
      if (gp.buttons[13] && gp.buttons[13].pressed && !lastGpButtons[13]) gameOverSelectedButton = 1;
      lastPauseAxisY = pauseAxisY;
    } else {
      lastPauseAxisY = 0;
    }

    // Botón A / Cruz (0): Dash táctico o confirmar la opción seleccionada
    if (gp.buttons[0] && gp.buttons[0].pressed && !lastGpButtons[0]) {
      if (gameState === "PLAYING") player.dash();
      else if (gameState === "PAUSED") activatePauseButton();
      else if (gameState === "STORY") startGame();
      else if (gameState === "ROUND_OVER") advanceToNextRound();
      else if (gameState === "GAME_OVER") {
        activateGameOverButton();
      } else if (gameState === "VICTORY_TOTAL") restartGame();
    }

    if (gameState === "PAUSED" && gp.buttons[1] && gp.buttons[1].pressed && !lastGpButtons[1]) {
      activatePauseButton();
    }

    // Botón X / Cuadrado (2): Recargar
    if (gp.buttons[2] && gp.buttons[2].pressed && !lastGpButtons[2]) {
      if (gameState === "PLAYING") player.reload();
    }

    // Botón Y / Triángulo (3) o LB (4): Cambiar arma
    if ((gp.buttons[3] && gp.buttons[3].pressed && !lastGpButtons[3]) || (gp.buttons[4] && gp.buttons[4].pressed && !lastGpButtons[4])) {
      if (gameState === "PLAYING") player.cycleWeapon(1);
    }

    // Botón Start / Options (9): Alternar pausa
    if (gp.buttons[9] && gp.buttons[9].pressed && !lastGpButtons[9]) {
      togglePause();
    }

    // Botón B / Círculo (1): En Game Over reiniciar desde el sector 1
    if (gp.buttons[1] && gp.buttons[1].pressed && !lastGpButtons[1]) {
      if (gameState === "GAME_OVER") startGame();
    }

    for (let i = 0; i < gp.buttons.length; i++) {
      lastGpButtons[i] = gp.buttons[i].pressed;
    }
  }

  // -------------------------------------------------------------
  // GESTIÓN DE CLICS EN PANTALLA & BOTONES DE MODALES
  // -------------------------------------------------------------
  function handleCanvasClick(x, y) {
    if (gameState === "STORY") {
      startGame();
      return;
    }

    if (gameState === "PAUSED") {
      const pauseMTop = H / 2 - 225;
      const continueY = pauseMTop + 345;
      const restartY = pauseMTop + 396;
      // Botón Continuar
      if (x >= W / 2 - 140 && x <= W / 2 + 140 && y >= continueY && y <= continueY + 42) {
        pauseSelectedButton = 0;
        activatePauseButton();
        return;
      }
      // Botón Reiniciar Sector
      if (x >= W / 2 - 140 && x <= W / 2 + 140 && y >= restartY && y <= restartY + 42) {
        pauseSelectedButton = 1;
        activatePauseButton();
        return;
      }
      return;
    }

    if (gameState === "ROUND_OVER") {
      advanceToNextRound();
      return;
    }

    if (gameState === "GAME_OVER") {
      const btn1Y = H / 2 - 160 + 138;
      const btn2Y = btn1Y + 54;
      // Botón 1: Reintentar sector actual (Checkpoint)
      if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btn1Y && y <= btn1Y + 44) {
        gameOverSelectedButton = 0;
        activateGameOverButton();
        return;
      }
      // Botón 2: Reiniciar desde sector 1
      if (x >= W / 2 - 150 && x <= W / 2 + 150 && y >= btn2Y && y <= btn2Y + 44) {
        gameOverSelectedButton = 1;
        activateGameOverButton();
        return;
      }
      return;
    }

    if (gameState === "VICTORY_TOTAL") {
      restartGame();
      return;
    }

    // Botón de Pausa superior derecho
    if (gameState === "PLAYING") {
      if (x >= W - 110 && x <= W - 20 && y >= 10 && y <= 50) {
        togglePause();
      }
    }
  }

  function activatePauseButton() {
    if (pauseSelectedButton === 0) {
      togglePause();
      return;
    }
    player.health = 100;
    player.stamina = 100;
    startRound(roundNumber);
  }

  function activateGameOverButton() {
    if (gameOverSelectedButton === 0) {
      player.health = 100;
      player.stamina = 100;
      startRound(roundNumber);
    } else {
      startGame();
    }
  }

  // -------------------------------------------------------------
  // PROTAGONISTA: SARGENTO ZAMO (COCODRILO COMANDO TÁCTICO PROCEDURAL)
  // -------------------------------------------------------------
  const player = {
    x: 150,
    y: H / 2,
    radius: 20,
    speed: 3.5,
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    angle: 0,
    weaponIdx: 0,
    lastShotTime: 0,
    reloading: false,
    reloadProgress: 0,
    isDashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    dashVx: 0,
    dashVy: 0,
    walkCycle: 0,
    stepTimer: 0,
    hurtFlash: 0,
    tailWag: 0,
    laserPulse: 0,

    get weapon() {
      return WEAPONS[this.weaponIdx];
    },

    cycleWeapon(dir) {
      if (this.reloading) return;
      const unlocked = WEAPONS.map((w, i) => ({ w, i })).filter((item) => item.w.isUnlocked);
      if (unlocked.length <= 1) return;

      let currentPos = unlocked.findIndex((item) => item.i === this.weaponIdx);
      if (currentPos === -1) currentPos = 0;

      currentPos = (currentPos + dir + unlocked.length) % unlocked.length;
      this.weaponIdx = unlocked[currentPos].i;

      if (audio().playReload) audio().playReload();
      createFloatingText(this.x, this.y - 30, this.weapon.name, this.weapon.color);
    },

    selectWeaponByIdx(idx) {
      if (idx >= 0 && idx < WEAPONS.length && WEAPONS[idx].isUnlocked && idx !== this.weaponIdx) {
        this.weaponIdx = idx;
        if (audio().playReload) audio().playReload();
        createFloatingText(this.x, this.y - 30, this.weapon.name, this.weapon.color);
      }
    },

    reload() {
      const w = this.weapon;
      if (this.reloading || w.ammo === w.magSize || w.reserves <= 0) return;
      this.reloading = true;
      this.reloadProgress = 0;
      if (audio().playReload) audio().playReload();
      createFloatingText(this.x, this.y - 35, "RECARGANDO...", "#fbbf24");
    },

    dash() {
      if (this.dashCooldown > 0 || this.stamina < 30) return;
      this.stamina -= 30;
      this.dashCooldown = 50;
      this.isDashing = true;
      this.dashTimer = 10;
      const keyboardX = (keys["KeyD"] || keys["ArrowRight"] ? 1 : 0) - (keys["KeyA"] || keys["ArrowLeft"] ? 1 : 0);
      const keyboardY = (keys["KeyS"] || keys["ArrowDown"] ? 1 : 0) - (keys["KeyW"] || keys["ArrowUp"] ? 1 : 0);
      let moveX = gamepadMoveX !== 0 || gamepadMoveY !== 0 ? gamepadMoveX : keyboardX;
      let moveY = gamepadMoveX !== 0 || gamepadMoveY !== 0 ? gamepadMoveY : keyboardY;
      if (moveX === 0 && moveY === 0 && controlMode === "gamepad") {
        moveX = Math.cos(this.angle);
        moveY = Math.sin(this.angle);
      }
      const len = Math.hypot(moveX, moveY) || 1;
      this.dashVx = (moveX / len) * 11.5;
      this.dashVy = (moveY / len) * 11.5;
      if (audio().playJump) audio().playJump();

      for (let i = 0; i < 12; i++) {
        particles.push(new Particle(this.x, this.y, (Math.random() - 0.5) * 3.5, (Math.random() - 0.5) * 3.5, "#22c55e", 20, 3.5));
      }
    },

    takeDamage(amount) {
      if (gameState !== "PLAYING") return;
      this.health -= amount;
      this.hurtFlash = 12;
      cameraShake = 7;
      if (audio().playHit) audio().playHit();
      createFloatingText(this.x, this.y - 25, `-${Math.round(amount)}`, "#ef4444");

      for (let i = 0; i < 5; i++) {
        bloodSplats.push(new Decal(this.x, this.y, "blood", 10 + Math.random() * 8));
      }

      if (this.health <= 0) {
        this.health = 0;
        triggerGameOver();
      }
    },

    update(dt) {
      if (controlMode === "keyboard") {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        this.angle = Math.atan2(dy, dx);
        touchControls.currentTarget = null;
      } else if (controlMode === "touch" && touchControls.autoAim) {
        const target = getClosestZombie();
        touchControls.currentTarget = target;
        if (target) {
          this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        }
      }

      this.tailWag += 0.15 * dt;
      this.laserPulse += 0.08 * dt;

      if (this.isDashing) {
        this.x += this.dashVx * dt;
        this.y += this.dashVy * dt;
        this.dashTimer -= dt;
        if (this.dashTimer <= 0) this.isDashing = false;
      } else {
        let vx = 0;
        let vy = 0;
        if (keys["KeyW"] || keys["ArrowUp"]) vy -= 1;
        if (keys["KeyS"] || keys["ArrowDown"]) vy += 1;
        if (keys["KeyA"] || keys["ArrowLeft"]) vx -= 1;
        if (keys["KeyD"] || keys["ArrowRight"]) vx += 1;
        if (gamepadMoveX !== 0 || gamepadMoveY !== 0) {
          vx = gamepadMoveX;
          vy = gamepadMoveY;
        }

        if (vx !== 0 || vy !== 0) {
          const mag = Math.hypot(vx, vy);
          let currentSpd = this.speed;
          const sprinting = keys["ShiftLeft"] || keys["ShiftRight"] || gamepadSprint || touchControls.buttons.some((btn) => btn.id === "sprint" && btn.pressed);
          if (sprinting) {
            if (this.stamina > 2) {
              currentSpd *= 1.45;
              this.stamina -= 0.35 * dt;
            }
          }
          this.x += (vx / mag) * currentSpd * dt;
          this.y += (vy / mag) * currentSpd * dt;

          this.walkCycle += 0.24 * dt;
          this.stepTimer += dt;
          if (this.stepTimer >= 15) {
            this.stepTimer = 0;
            if (audio().playFootstep) audio().playFootstep();
          }
        }

        // Movimiento por joystick táctil
        if (touchControls.stick.active && (touchControls.stick.vx !== 0 || touchControls.stick.vy !== 0)) {
          const touchSprint = touchControls.buttons.some((btn) => btn.id === "sprint" && btn.pressed);
          const touchSpeed = touchSprint && this.stamina > 2 ? this.speed * 1.45 : this.speed;
          this.x += touchControls.stick.vx * touchSpeed * dt;
          this.y += touchControls.stick.vy * touchSpeed * dt;
          if (touchSprint && this.stamina > 2) this.stamina -= 0.35 * dt;
          this.walkCycle += 0.24 * dt;
          this.stepTimer += dt;
          if (this.stepTimer >= 15) {
            this.stepTimer = 0;
            if (audio().playFootstep) audio().playFootstep();
          }
        }
      }

      const sprintingNow = keys["ShiftLeft"] || keys["ShiftRight"] || gamepadSprint || touchControls.buttons.some((btn) => btn.id === "sprint" && btn.pressed);
      if (!sprintingNow && this.stamina < this.maxStamina) {
        this.stamina = Math.min(this.maxStamina, this.stamina + 0.45 * dt);
      }
      if (this.dashCooldown > 0) this.dashCooldown -= dt;
      if (this.hurtFlash > 0) this.hurtFlash -= dt;

      // Límites perimetrales del laboratorio
      this.x = Math.max(38, Math.min(W - 38, this.x));
      this.y = Math.max(38, Math.min(H - 38, this.y));

      // Recarga progresiva
      if (this.reloading) {
        this.reloadProgress += (1000 / (60 * this.weapon.reloadTime)) * dt;
        if (this.reloadProgress >= 1) {
          const needed = this.weapon.magSize - this.weapon.ammo;
          const toAdd = Math.min(needed, this.weapon.reserves);
          this.weapon.ammo += toAdd;
          this.weapon.reserves -= toAdd;
          this.reloading = false;
          this.reloadProgress = 0;
        }
      }

      const isTouchShooting = touchControls.buttons.find(b => b.id === "shoot" && b.pressed);
      const wantsToShoot = gameState === "PLAYING" && (mouse.downLeft || isTouchShooting || (mouse.downRight && (this.weapon.id === "rifle" || this.weapon.id === "smg")));
      if (wantsToShoot) {
        this.shoot();
      }
    },

    shoot() {
      if (gameState !== "PLAYING" || this.reloading) return;
      const now = performance.now();
      const w = this.weapon;

      if (now - this.lastShotTime < w.fireRate) return;

      if (w.ammo <= 0) {
        this.reload();
        return;
      }

      w.ammo--;
      this.lastShotTime = now;
      shotsFired += w.pellets;

      if (w.id === "shotgun") {
        if (audio().playShotgun) audio().playShotgun();
        cameraShake = 5.5;
      } else if (w.id === "plasma") {
        if (audio().playAlert) audio().playAlert();
        cameraShake = 4.5;
      } else if (w.id === "launcher") {
        if (audio().playShotgun) audio().playShotgun();
        cameraShake = 8.5;
      } else {
        if (audio().playMachinegun) audio().playMachinegun();
        cameraShake = 2.2;
      }

      const gunDist = 32;
      const gunAngle = this.angle;
      const muzzleX = this.x + Math.cos(gunAngle) * gunDist + Math.cos(gunAngle + Math.PI / 2) * 5;
      const muzzleY = this.y + Math.sin(gunAngle) * gunDist + Math.sin(gunAngle + Math.PI / 2) * 5;

      // Destello volumétrico en la boca del cañón
      muzzleFlashes.push({ x: muzzleX, y: muzzleY, angle: gunAngle, life: 3, radius: w.id === "shotgun" || w.id === "launcher" ? 18 : 11, color: w.color });
      for (let i = 0; i < 4; i++) {
        particles.push(new Particle(muzzleX, muzzleY, Math.cos(gunAngle) * 2.8 + (Math.random() - 0.5), Math.sin(gunAngle) * 2.8 + (Math.random() - 0.5), "#cbd5e1", 15, 2));
      }

      // Casquillos de bala eyectados con efecto 3D
      const ejectAngle = gunAngle - Math.PI / 2 + (Math.random() - 0.5) * 0.4;
      shellCasings.push(new ShellCasing(muzzleX - Math.cos(gunAngle) * 12, muzzleY - Math.sin(gunAngle) * 12, ejectAngle, w.color));

      // Proyectiles
      for (let i = 0; i < w.pellets; i++) {
        const spreadOffset = (Math.random() - 0.5) * w.spread;
        const bAngle = gunAngle + spreadOffset;
        bullets.push(new Bullet(muzzleX, muzzleY, bAngle, w.speed + Math.random() * 2, w.damage, w.color, false, w.isPlasma, w.isExplosive));
      }

      // Retroceso físico
      this.x -= Math.cos(gunAngle) * (w.recoil * 0.4);
      this.y -= Math.sin(gunAngle) * (w.recoil * 0.4);
    },

    // -------------------------------------------------------------
    // RENDERIZADO PROCEDURAL DEL COCODRILO EN 2.5D
    // -------------------------------------------------------------
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      // 1. Linterna táctica volumétrica proyectada hacia adelante
      const gradLight = ctx.createRadialGradient(0, 0, 18, 0, 0, 280);
      gradLight.addColorStop(0, "rgba(255, 255, 230, 0.32)");
      gradLight.addColorStop(0.4, "rgba(56, 189, 248, 0.15)");
      gradLight.addColorStop(0.85, "rgba(14, 165, 233, 0.05)");
      gradLight.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = gradLight;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 290, -0.42, 0.42);
      ctx.closePath();
      ctx.fill();

      // Motes de polvo iluminados dentro del haz
      for (let i = 0; i < 2; i++) {
        const dustDist = 45 + Math.random() * 210;
        const dustAngle = (Math.random() - 0.5) * 0.7;
        ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
        ctx.beginPath();
        ctx.arc(Math.cos(dustAngle) * dustDist, Math.sin(dustAngle) * dustDist, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Mira láser táctica de precisión con pulsación
      const laserColor = this.weapon.color === "#f87171" ? "rgba(248, 113, 113, 0.65)" : "rgba(56, 189, 248, 0.55)";
      ctx.strokeStyle = laserColor;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.moveTo(28, 4);
      ctx.lineTo(340, 4);
      ctx.stroke();
      ctx.setLineDash([]);

      // Punto del láser al final con retícula
      ctx.fillStyle = this.weapon.color;
      ctx.shadowColor = this.weapon.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(340, 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 3. Sombra volumétrica caída 2.5D debajo del personaje
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.beginPath();
      ctx.ellipse(-3, 6, 21, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4. Patas y garras articuladas con animación de pasos
      const legOffsetLeft = Math.sin(this.walkCycle) * 5.5;
      const legOffsetRight = -Math.sin(this.walkCycle) * 5.5;
      const skinColor = this.hurtFlash > 0 ? "#ef4444" : "#2d5e34";
      const skinDark = this.hurtFlash > 0 ? "#b91c1c" : "#1b3c20";

      // Patas traseras reptilianas
      ctx.fillStyle = skinDark;
      ctx.beginPath();
      ctx.ellipse(-12, -14 + legOffsetLeft, 7.5, 4.5, -0.3, 0, Math.PI * 2);
      ctx.ellipse(-12, 14 + legOffsetRight, 7.5, 4.5, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Garras traseras
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-15, -16 + legOffsetLeft, 2.2, 2);
      ctx.fillRect(-15, 15 + legOffsetRight, 2.2, 2);

      // 5. Cola sinuosa de cocodrilo con escamas dorsales
      const tailWiggle = Math.sin(this.tailWag) * 4.8;
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.moveTo(-10, -6.5);
      ctx.quadraticCurveTo(-20, tailWiggle, -33, tailWiggle * 1.8);
      ctx.quadraticCurveTo(-20, tailWiggle + 4, -10, 6.5);
      ctx.closePath();
      ctx.fill();

      // Crestas / osteodermos triangulares a lo largo de la cola
      ctx.fillStyle = "#142d18";
      for (let i = 0; i < 4; i++) {
        const cx = -14 - i * 4.6;
        const cy = (tailWiggle * (i + 1)) / 3.4;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 2.8);
        ctx.lineTo(cx - 3.5, cy);
        ctx.lineTo(cx, cy + 2.8);
        ctx.closePath();
        ctx.fill();
      }

      // 6. Chaleco táctico militar de camuflaje (Torso)
      ctx.fillStyle = this.hurtFlash > 0 ? "#f87171" : "#243e1d";
      ctx.beginPath();
      ctx.ellipse(0, 0, 16.5, 13.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#162b11";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Correas y arnés de combate cruzado
      ctx.strokeStyle = "#0e1a0b";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      ctx.lineTo(10, 10);
      ctx.moveTo(-10, 10);
      ctx.lineTo(10, -10);
      ctx.stroke();

      // Bolsillos para munición y parches tácticos
      ctx.fillStyle = "#162b11";
      ctx.fillRect(-6, -11, 4.5, 3.2);
      ctx.fillRect(2, -11, 4.5, 3.2);
      ctx.fillRect(-6, 8, 4.5, 3.2);
      ctx.fillRect(2, 8, 4.5, 3.2);

      // Antena de radio táctica en el hombro con LED rojo parpadeante
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.lineTo(-14, -18);
      ctx.stroke();
      ctx.fillStyle = Math.floor(gameTime * 4) % 2 === 0 ? "#ef4444" : "#7f1d1d";
      ctx.beginPath();
      ctx.arc(-14, -18, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Placa / Insignia "ZAMO" en el chaleco
      ctx.fillStyle = "#0a1508";
      ctx.fillRect(-7, -4, 14, 8);
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 6.5px 'Orbitron', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ZAMO", 0, 2);

      // 7. Brazos musculosos y garras delanteras empuñando el arma
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.ellipse(6, -11 - legOffsetRight * 0.5, 9, 5, -0.2, 0, Math.PI * 2);
      ctx.ellipse(8, 11 - legOffsetLeft * 0.5, 9, 5, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Garras delanteras verdes
      ctx.fillStyle = skinDark;
      ctx.beginPath();
      ctx.arc(15, -6, 3.5, 0, Math.PI * 2);
      ctx.arc(24, 4, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 8. MODELO 3D ESPECÍFICO DEL ARMA SELECCIONADA
      const w = this.weapon;
      if (w.id === "shotgun") {
        // Escopeta táctica: doble cañón de acero + guardamanos de madera
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(10, 2, 25, 5.5);
        ctx.fillStyle = "#64748b";
        ctx.fillRect(17, 1, 9, 3);
        ctx.fillStyle = "#854d0e"; // Madera
        ctx.fillRect(5, 3, 7, 4.5);
        ctx.fillRect(20, 4, 7, 3.5);
      } else if (w.id === "rifle") {
        // Rifle de asalto militar: riel Picatinny, cargador curvo y supresor
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(8, 2, 31, 4.8);
        ctx.fillStyle = "#334155";
        ctx.fillRect(14, 0, 13, 2.5);
        ctx.fillStyle = "#38bdf8"; // Led indicador
        ctx.fillRect(12, 6, 6, 8.5);
      } else if (w.id === "smg") {
        // Subfusil dual: doble cañón y tambor
        ctx.fillStyle = "#1e1b4b";
        ctx.fillRect(8, 2, 23, 4.2);
        ctx.fillStyle = "#c084fc";
        ctx.beginPath();
        ctx.arc(14, 6, 4.8, 0, Math.PI * 2);
        ctx.fill();
      } else if (w.id === "plasma") {
        // Cañón de plasma iónico: bobinas con brillo de energía
        ctx.fillStyle = "#0e7490";
        ctx.fillRect(6, 1, 27, 6.5);
        ctx.fillStyle = "#22d3ee";
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 10;
        ctx.fillRect(14, 2, 11, 4.5);
        ctx.shadowBlur = 0;
      } else if (w.id === "launcher") {
        // Lanzagranadas pesado: tubo masivo con franjas amarillas
        ctx.fillStyle = "#1c1917";
        ctx.fillRect(4, 0, 33, 8.5);
        ctx.fillStyle = "#facc15";
        ctx.fillRect(16, 1, 3.2, 6.5);
        ctx.fillRect(22, 1, 3.2, 6.5);
      }

      // 9. HOCICO ALARGADO DE COCODRILO
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.moveTo(3, -9.8);
      ctx.lineTo(27, -4.8);
      ctx.quadraticCurveTo(30, 0, 27, 4.8);
      ctx.lineTo(3, 9.8);
      ctx.closePath();
      ctx.fill();

      // Borde de escamas
      ctx.strokeStyle = skinDark;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Mandíbula inferior visible
      ctx.fillStyle = "#ca8a04";
      ctx.fillRect(11, -2.6, 15, 5.2);

      // Colmillos blancos afilados sobresaliendo a ambos lados
      ctx.fillStyle = "#ffffff";
      for (let t = 0; t < 5; t++) {
        ctx.fillRect(12 + t * 3.2, -5.3, 1.6, 2.3);
        ctx.fillRect(12 + t * 3.2, 3, 1.6, 2.3);
      }

      // Fosas nasales en la punta del hocico
      ctx.fillStyle = "#0a170c";
      ctx.fillRect(25, -2.6, 2.2, 1.6);
      ctx.fillRect(25, 1, 2.2, 1.6);

      // 10. CASCO MILITAR TÁCTICO CON VISOR Y MONTURA NVG
      ctx.fillStyle = "#1b3114";
      ctx.beginPath();
      ctx.arc(-2, 0, 11.2, Math.PI * 0.45, Math.PI * 1.55);
      ctx.fill();
      ctx.strokeStyle = "#0c1808";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Montura frontal de visión nocturna en el casco
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(1, -3, 3.5, 6);
      ctx.fillStyle = "#475569";
      ctx.fillRect(2, -2, 1.5, 4);

      // 11. OJOS REPTILIANOS AMARILLOS FEROCES CON PUPILAS VERTICALES
      ctx.fillStyle = "#facc15";
      ctx.shadowColor = "#eab308";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(6, -5.6, 2.8, 0, Math.PI * 2);
      ctx.arc(6, 5.6, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Pupilas verticales de depredador acechante
      ctx.fillStyle = "#000000";
      ctx.fillRect(6.2, -7.3, 1.2, 3.5);
      ctx.fillRect(6.2, 3.8, 1.2, 3.5);

      ctx.restore();
    }
  };

  // -------------------------------------------------------------
  // CASQUILLOS DE BALAS (EYECCIÓN EN 3D)
  // -------------------------------------------------------------
  class ShellCasing {
    constructor(x, y, angle, color) {
      this.x = x;
      this.y = y;
      this.vx = Math.cos(angle) * (2 + Math.random() * 2);
      this.vy = Math.sin(angle) * (2 + Math.random() * 2);
      this.color = color;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.3;
      this.life = 120;
    }
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= 0.92;
      this.vy *= 0.92;
      this.rotation += this.rotSpeed * dt;
      this.life -= dt;
    }
    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(-1.5, 2, 4.5, 1.5);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(-2, -1, 4.5, 2.2);
      ctx.restore();
    }
  }

  // -------------------------------------------------------------
  // PROYECTILES
  // -------------------------------------------------------------
  class Bullet {
    constructor(x, y, angle, speed, damage, color, isAcid = false, isPlasma = false, isExplosive = false) {
      this.x = x;
      this.y = y;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.radius = isAcid ? 6 : isExplosive ? 7.5 : isPlasma ? 8 : 3;
      this.damage = damage;
      this.color = color;
      this.isAcid = isAcid;
      this.isPlasma = isPlasma;
      this.isExplosive = isExplosive;
      this.hitZombies = new Set();
      this.life = 85;
      this.trail = [];
    }

    update(dt) {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > (this.isPlasma ? 8 : 5)) this.trail.shift();

      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.life -= dt;

      if (this.isAcid && Math.random() < 0.4) {
        particles.push(new Particle(this.x, this.y, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, "#22c55e", 12, 2.5));
      }
      if (this.isPlasma && Math.random() < 0.5) {
        particles.push(new Particle(this.x, this.y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, "#22d3ee", 14, 3));
      }
    }

    draw() {
      if (this.trail.length > 1) {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.radius * 1.35;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for (let i = 1; i < this.trail.length; i++) {
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        ctx.stroke();
      }

      ctx.save();
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.isAcid || this.isPlasma ? 14 : 7;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // Núcleo brillante blanco
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(this.x - 1, this.y - 1, this.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // -------------------------------------------------------------
  // CAJAS DE MUNICIÓN RECOGIBLES ("MUNICIÓN")
  // -------------------------------------------------------------
  class AmmoPickup {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 16;
      this.bob = Math.random() * Math.PI * 2;
      this.life = 1200;
    }

    update(dt) {
      this.bob += 0.06 * dt;
      this.life -= dt;

      const dist = Math.hypot(this.x - player.x, this.y - player.y);
      if (dist < this.radius + player.radius) {
        const w = player.weapon;
        w.reserves += Math.ceil(w.magSize * 0.75);
        if (audio().playPowerup) audio().playPowerup();
        createFloatingText(this.x, this.y - 25, "+MUNICIÓN RECARGADA", "#facc15");

        for (let i = 0; i < 14; i++) {
          particles.push(new Particle(this.x, this.y, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, "#facc15", 22, 3.5));
        }
        return true;
      }
      return false;
    }

    draw() {
      const yOffset = Math.sin(this.bob) * 3;
      const alpha = this.life < 180 ? (Math.floor(this.life / 10) % 2 === 0 ? 0.3 : 1) : 1;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.x, this.y + yOffset);

      // Sombra proyectada
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.ellipse(0, 12 - yOffset, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Caja metálica militar
      ctx.fillStyle = "#1e3a1f";
      ctx.strokeStyle = "#4ade80";
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "#4ade80";
      ctx.shadowBlur = 8;
      ctx.fillRect(-12, -8, 24, 16);
      ctx.strokeRect(-12, -8, 24, 16);
      ctx.shadowBlur = 0;

      // Icono flecha de munición
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(5, 0);
      ctx.lineTo(2, 0);
      ctx.lineTo(2, 5);
      ctx.lineTo(-2, 5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();

      ctx.font = "bold 9px 'Orbitron', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#facc15";
      ctx.fillText("MUNICIÓN", 0, -12);

      ctx.restore();
    }
  }

  // -------------------------------------------------------------
  // BOTIQUÍN TÁCTICO DE SALUD (BIO-GEL & NANITOS MÉDICOS)
  // -------------------------------------------------------------
  class MedkitPickup {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 16;
      this.life = 1600; // ~26 segundos
      this.bob = Math.random() * Math.PI * 2;
    }

    update(dt) {
      this.bob += 0.06 * dt;
      this.life -= dt;
      if (this.life <= 0) return true;

      const dist = Math.hypot(this.x - player.x, this.y - player.y);
      if (dist < this.radius + player.radius) {
        if (player.health < player.maxHealth) {
          const healAmount = 12;
          player.health = Math.min(player.maxHealth, player.health + healAmount);
          if (audio().playPowerup) audio().playPowerup();
          createFloatingText(this.x, this.y - 25, `+${healAmount} SALUD`, "#4ade80");

          for (let i = 0; i < 16; i++) {
            particles.push(new Particle(this.x, this.y, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, "#22c55e", 24, 3.5));
          }
          return true;
        }
      }
      return false;
    }

    draw() {
      const yOffset = Math.sin(this.bob) * 3.5;
      const alpha = this.life < 180 ? (Math.floor(this.life / 10) % 2 === 0 ? 0.3 : 1) : 1;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.x, this.y + yOffset);

      // Sombra
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.ellipse(0, 14 - yOffset, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Botiquín / Estuche médico táctico
      ctx.fillStyle = "#064e3b";
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(-12, -9, 24, 18, 4);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Cruz médica blanca/esmeralda brillante
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-2.5, -6, 5, 12);
      ctx.fillRect(-6, -2.5, 12, 5);

      ctx.font = "bold 9px 'Orbitron', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#4ade80";
      ctx.fillText("+SALUD", 0, -13);

      ctx.restore();
    }
  }

  // -------------------------------------------------------------
  // ZOMBIS MUTANTES (ESPUTO ÁCIDO, CORREDORES, BRUTOS Y TITÁN)
  // -------------------------------------------------------------
  class Zombie {
    constructor(x, y, type = "spitter") {
      this.x = x;
      this.y = y;
      this.type = type;
      this.radius = type === "titan" ? 32 : type === "brute" ? 25 : type === "runner" ? 15 : 18;
      this.speed = type === "runner" ? 2.65 : type === "titan" ? 1.05 : type === "brute" ? 1.3 : 1.5;
      this.health = type === "titan" ? 480 : type === "brute" ? 190 : type === "runner" ? 45 : 75;
      this.maxHealth = this.health;
      this.angle = 0;
      this.wobble = Math.random() * 100;
      this.lastSpitTime = performance.now() + Math.random() * 2000;
      this.spitCooldown = type === "titan" ? 1700 : 2400;
      this.isChargingSpit = false;
      this.chargeTime = 0;
      this.hurtFlash = 0;
    }

    update(dt) {
      this.wobble += 0.08 * dt;
      if (this.hurtFlash > 0) this.hurtFlash -= dt;

      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);
      this.angle = Math.atan2(dy, dx);

      if (this.type === "spitter" || this.type === "titan") {
        const idealDist = this.type === "titan" ? 180 : 240;
        if (dist > idealDist + 20) {
          this.x += (dx / dist) * this.speed * dt;
          this.y += (dy / dist) * this.speed * dt;
        } else if (dist < idealDist - 30) {
          this.x -= (dx / dist) * (this.speed * 0.7) * dt;
          this.y -= (dy / dist) * (this.speed * 0.7) * dt;
        }

        const now = performance.now();
        if (now - this.lastSpitTime > this.spitCooldown && dist < 480) {
          this.isChargingSpit = true;
          this.chargeTime += dt;

          const mouthX = this.x + Math.cos(this.angle) * (this.radius + 6);
          const mouthY = this.y + Math.sin(this.angle) * (this.radius + 6);
          particles.push(new Particle(mouthX, mouthY, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, "#4ade80", 14, 2.5));

          if (this.chargeTime > 30) {
            this.shootAcid(mouthX, mouthY);
            this.isChargingSpit = false;
            this.chargeTime = 0;
            this.lastSpitTime = now;
          }
        }
      } else {
        this.x += (dx / dist) * this.speed * dt;
        this.y += (dy / dist) * this.speed * dt;
      }

      for (const other of zombies) {
        if (other !== this) {
          const sepX = this.x - other.x;
          const sepY = this.y - other.y;
          const sepDist = Math.hypot(sepX, sepY);
          const minDist = this.radius + other.radius;
          if (sepDist < minDist && sepDist > 0) {
            this.x += (sepX / sepDist) * 0.8 * dt;
            this.y += (sepY / sepDist) * 0.8 * dt;
          }
        }
      }

      if (dist < this.radius + player.radius) {
        player.takeDamage((this.type === "titan" ? 1.05 : this.type === "brute" ? 0.8 : this.type === "runner" ? 0.58 : 0.48) * dt);
      }
    }

    shootAcid(mouthX, mouthY) {
      if (audio().playAcidSpit) audio().playAcidSpit();

      const acidAngle = this.angle;
      if (this.type === "titan") {
        [-0.22, 0, 0.22].forEach((spread) => {
          acidBullets.push(new Bullet(mouthX, mouthY, acidAngle + spread, 8.5, 28, "#22c55e", true));
        });
      } else {
        acidBullets.push(new Bullet(mouthX, mouthY, acidAngle + (Math.random() - 0.5) * 0.12, 8, 20, "#22c55e", true));
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle + Math.sin(this.wobble) * 0.12);

      // Sombra volumétrica 2.5D
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.beginPath();
      ctx.ellipse(-2, 3, this.radius, this.radius * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      // Brazos mutilados con garras de ácido
      const armColor = this.hurtFlash > 0 ? "#ef4444" : this.type === "titan" ? "#14532d" : "#374151";
      ctx.fillStyle = armColor;
      ctx.beginPath();
      ctx.ellipse(12, -10 + Math.sin(this.wobble) * 3, 10, 5, 0.4, 0, Math.PI * 2);
      ctx.ellipse(12, 10 - Math.sin(this.wobble) * 3, 10, 5, -0.4, 0, Math.PI * 2);
      ctx.fill();

      // Puntas de garras verdes tóxicas
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(20, -13, 4, 0, Math.PI * 2);
      ctx.arc(20, 13, 4, 0, Math.PI * 2);
      ctx.fill();

      // Cuerpo mutante
      const bodyColor = this.hurtFlash > 0 ? "#fca5a5" : this.type === "titan" ? "#1e293b" : this.type === "brute" ? "#334155" : "#475569";
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 0.85, this.radius * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pústulas y glándulas de ácido brillantes
      const acidGlow = ctx.createRadialGradient(2, 0, 2, 2, 0, this.radius * 0.85);
      acidGlow.addColorStop(0, this.isChargingSpit ? "rgba(134, 239, 172, 0.95)" : "rgba(34, 197, 94, 0.8)");
      acidGlow.addColorStop(1, "rgba(22, 101, 52, 0)");
      ctx.fillStyle = acidGlow;
      ctx.beginPath();
      ctx.arc(2, 0, this.radius * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // Cabeza
      ctx.fillStyle = this.hurtFlash > 0 ? "#ef4444" : "#4b5563";
      ctx.beginPath();
      ctx.arc(4, 0, this.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Ojos amarillos malévolos
      ctx.fillStyle = "#facc15";
      ctx.shadowColor = "#eab308";
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(7, -4, 2.2, 0, Math.PI * 2);
      ctx.arc(7, 4, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Boca babeante de ácido
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(8, -2.5, 3.5, 5);

      ctx.restore();

      // Barra de vida superior
      if (this.health < this.maxHealth) {
        const barW = this.radius * 2;
        const barH = 4.5;
        const barX = this.x - barW / 2;
        const barY = this.y - this.radius - 12;
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        ctx.fillStyle = this.type === "titan" ? "#ef4444" : "#22c55e";
        ctx.fillRect(barX, barY, (this.health / this.maxHealth) * barW, barH);
      }
    }
  }

  // -------------------------------------------------------------
  // CHARCOS DE ÁCIDO, CALCOMANÍAS Y PARTÍCULAS
  // -------------------------------------------------------------
  class AcidPuddle {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 18 + Math.random() * 10;
      this.life = 260;
      this.maxLife = this.life;
      this.bubbleTimer = 0;
    }

    update(dt) {
      this.life -= dt;
      this.bubbleTimer += dt;

      if (this.bubbleTimer >= 14) {
        this.bubbleTimer = 0;
        const bx = this.x + (Math.random() - 0.5) * this.radius * 1.2;
        const by = this.y + (Math.random() - 0.5) * this.radius * 1.2;
        particles.push(new Particle(bx, by, 0, -0.6, "#4ade80", 18, 2.2));
      }

      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist < this.radius + player.radius) {
        player.takeDamage(0.34 * dt);
        if (Math.random() < 0.08 && audio().playAcidSplash) {
          audio().playAcidSplash();
        }
      }
    }

    draw() {
      const alpha = Math.min(1, this.life / 60) * 0.75;
      ctx.save();
      const grad = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, this.radius);
      grad.addColorStop(0, `rgba(34, 197, 94, ${alpha})`);
      grad.addColorStop(0.6, `rgba(22, 163, 74, ${alpha * 0.8})`);
      grad.addColorStop(1, "rgba(20, 83, 45, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(134, 239, 172, ${alpha * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  class Decal {
    constructor(x, y, type, radius) {
      this.x = x;
      this.y = y;
      this.type = type;
      this.radius = radius;
      this.alpha = 0.65;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.type === "blood" ? "#7f1d1d" : "#14532d";
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Particle {
    constructor(x, y, vx, vy, color, life, size) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.life = life;
      this.maxLife = life;
      this.size = size;
    }
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.life -= dt;
    }
    draw() {
      const progress = Math.max(0, this.life / this.maxLife);
      ctx.save();
      ctx.globalAlpha = progress;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * progress, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class FloatingText {
    constructor(x, y, text, color) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.color = color;
      this.life = 50;
      this.vy = -1.2;
    }
    update(dt) {
      this.y += this.vy * dt;
      this.life -= dt;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.life / 15);
      ctx.font = "bold 13px 'Orbitron', 'Rajdhani', sans-serif";
      ctx.fillStyle = this.color;
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 5;
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  function createFloatingText(x, y, text, color = "#fff") {
    floatingTexts.push(new FloatingText(x, y, text, color));
  }

  // -------------------------------------------------------------
  // ZONA DE META / PORTAL HOLOGRÁFICO 3D
  // -------------------------------------------------------------
  const exitPortal = {
    x: W - 120,
    y: H / 2,
    radius: 48,
    active: false,
    rotation: 0,
    pulse: 0,

    update(dt) {
      this.rotation += 0.035 * dt;
      this.pulse += 0.05 * dt;

      if (!this.active && zombies.length === 0 && gameState === "PLAYING") {
        this.activate();
      }

      if (this.active && gameState === "PLAYING") {
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if (dist < this.radius + 10) {
          startPortalWarp();
        }

        if (Math.random() < 0.45) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * this.radius;
          particles.push(new Particle(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, 0, -1.2, "#38bdf8", 30, 2.5));
        }
      }
    },

    activate() {
      this.active = true;
      if (audio().playAlert) audio().playAlert();
      showBanner("¡ZONA DE META ACTIVADA! ¡CORRE A EVACUAR!", "#38bdf8", 220);
    },

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);

      if (this.active) {
        const pulseScale = 1 + Math.sin(this.pulse) * 0.08;
        const grad = ctx.createRadialGradient(0, 0, 8, 0, 0, this.radius * pulseScale);
        grad.addColorStop(0, "rgba(56, 189, 248, 0.95)");
        grad.addColorStop(0.5, "rgba(14, 165, 233, 0.45)");
        grad.addColorStop(1, "rgba(3, 105, 161, 0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * pulseScale, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(this.rotation);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 15;

        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(0, 0, this.radius * 0.72, (i * Math.PI) / 2, (i * Math.PI) / 2 + 0.9);
          ctx.stroke();
        }

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.rotate(-this.rotation);
        ctx.font = "bold 12px 'Orbitron', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 8;
        ctx.fillText("ZONA DE META", 0, -this.radius - 14);
        ctx.font = "bold 10px 'Rajdhani', sans-serif";
        ctx.fillStyle = "#38bdf8";
        ctx.fillText("¡CORRE AQUÍ!", 0, -this.radius - 2);
      } else {
        ctx.strokeStyle = "rgba(100, 116, 139, 0.45)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = "bold 11px 'Orbitron', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("META BLOQUEADA", 0, -this.radius - 8);
        ctx.font = "10px 'Rajdhani', sans-serif";
        ctx.fillText("PURGA EL SECTOR", 0, 4);
      }

      ctx.restore();

      // Flecha guía indicadora si la meta está activa y lejos
      if (this.active) {
        const dx = this.x - player.x;
        const dy = this.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 140) {
          const arrowAngle = Math.atan2(dy, dx);
          const arrowDist = 70;
          const ax = player.x + Math.cos(arrowAngle) * arrowDist;
          const ay = player.y + Math.sin(arrowAngle) * arrowDist;

          ctx.save();
          ctx.translate(ax, ay);
          ctx.rotate(arrowAngle);
          ctx.fillStyle = "#38bdf8";
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(12, 0);
          ctx.lineTo(-7, -8);
          ctx.lineTo(-3, 0);
          ctx.lineTo(-7, 8);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }
  };

  // -------------------------------------------------------------
  // CONTENEDORES Y COLECCIONES
  // -------------------------------------------------------------
  let bullets = [];
  let acidBullets = [];
  let zombies = [];
  let acidPuddles = [];
  let bloodSplats = [];
  let particles = [];
  let muzzleFlashes = [];
  let shellCasings = [];
  let ammoPickups = [];
  let medkitPickups = [];
  let floatingTexts = [];

  function saveCheckpoint(sec) {
    try {
      localStorage.setItem("zamo_checkpoint_sector", String(sec));
    } catch (e) {}
  }

  function getSavedCheckpoint() {
    try {
      const s = parseInt(localStorage.getItem("zamo_checkpoint_sector"), 10);
      return (!isNaN(s) && s >= 1 && s <= MAX_ROUNDS) ? s : 1;
    } catch (e) {
      return 1;
    }
  }

  function showBanner(text, color = "#38bdf8", duration = 180) {
    bannerMessage = { text, color, life: duration, maxLife: duration };
  }

  // -------------------------------------------------------------
  // GESTIÓN DE RONDAS, TRANSICIONES Y PROGRESIÓN DE ARMAS
  // -------------------------------------------------------------
  function startPortalWarp() {
    gameState = "PORTAL_WARP";
    portalWarpTimer = 0;
    cameraShake = 5;
    if (audio().playPowerup) audio().playPowerup();
    showBanner("¡EVACUACIÓN EN CURSO! SALTO HIPERESPACIAL...", "#38bdf8", 80);
    for (let i = 0; i < 20; i++) {
      particles.push(new Particle(player.x, player.y, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, "#38bdf8", 30, 3.5));
    }
  }

  function startRound(rNum) {
    roundNumber = rNum;
    saveCheckpoint(rNum);
    gameState = "SECTOR_ENTER";
    sectorEnterTimer = 0;
    roundStartTime = Date.now();
    exitPortal.active = false;
    player.x = 40;
    player.y = H / 2;
    player.angle = 0;
    player.health = Math.max(player.health, 35);
    cameraShake = 3;

    // Limpiar restos del sector previo
    bloodSplats = [];
    acidPuddles = [];
    particles = [];
    bullets = [];
    acidBullets = [];
    shellCasings = [];
    ammoPickups = [];
    medkitPickups = [];

    // Desbloquear automáticamente y equipar el arma correspondiente
    WEAPONS.forEach((w) => {
      if (w.unlockedAtRound <= roundNumber) {
        w.isUnlocked = true;
      }
    });

    const newWeaponIdx = WEAPONS.findIndex((w) => w.unlockedAtRound === roundNumber);
    if (newWeaponIdx !== -1) {
      player.weaponIdx = newWeaponIdx;
      showBanner(`¡NUEVA ARMA: ${WEAPONS[newWeaponIdx].name.toUpperCase()}!`, WEAPONS[newWeaponIdx].color, 140);
    } else {
      const theme = SECTOR_THEMES[roundNumber] || SECTOR_THEMES[1];
      showBanner(`SECTOR ${roundNumber}: ${theme.name}`, theme.beaconColor, 140);
    }

    zombies = [];
    acidBullets = [];

    // Cajas de munición táctica y botiquines médicos en el sector
    ammoPickups.push(new AmmoPickup(W * 0.58, H * 0.72));
    if (rNum >= 3) medkitPickups.push(new MedkitPickup(W * 0.5, H * 0.72));

    const zombieCount = 6 + rNum * 4;
    for (let i = 0; i < zombieCount; i++) {
      let zx = W - 70 - Math.random() * 280;
      let zy = Math.random() * (H - 130) + 65;

      let type = "spitter";
      if (rNum >= 2 && Math.random() < 0.4) type = "runner";
      if (rNum >= 3 && Math.random() < 0.3) type = "brute";
      if (rNum === 5 && i === 0) type = "titan"; // Jefe final en oleada 5

      zombies.push(new Zombie(zx, zy, type));
      // Partículas de emergencia mutante brotando del suelo
      for (let p = 0; p < 5; p++) {
        particles.push(new Particle(zx, zy, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, "#22c55e", 20, 2.5));
      }
    }

    if (audio().playAlert) audio().playAlert();
  }

  function advanceToNextRound() {
    if (roundNumber >= MAX_ROUNDS) {
      gameState = "VICTORY_TOTAL";
      if (audio().playVictory) audio().playVictory();
    } else {
      startRound(roundNumber + 1);
    }
  }

  function triggerRoundVictory() {
    if (audio().playVictory) audio().playVictory();
    gameState = roundNumber >= MAX_ROUNDS ? "VICTORY_TOTAL" : "ROUND_OVER";
  }

  function triggerGameOver() {
    gameState = "GAME_OVER";
    gameOverSelectedButton = 0;
    if (audio().playHit) audio().playHit();
  }

  function startGame() {
    score = 0;
    zombiesKilledTotal = 0;
    shotsFired = 0;
    shotsHit = 0;
    player.health = 100;
    player.stamina = 100;
    player.x = 40;
    player.y = H / 2;

    WEAPONS.forEach((w) => {
      w.ammo = w.magSize;
      w.isUnlocked = w.unlockedAtRound === 1;
    });
    player.weaponIdx = 0;

    startRound(1);
  }

  function restartGame() {
    startGame();
  }

  // -------------------------------------------------------------
  // SISTEMA DE COLISIONES Y FÍSICA
  // -------------------------------------------------------------
  function updateCollisions(dt) {
    for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
      const b = bullets[bIdx];
      for (let zIdx = zombies.length - 1; zIdx >= 0; zIdx--) {
        const z = zombies[zIdx];
        const dist = Math.hypot(b.x - z.x, b.y - z.y);
        if (dist < b.radius + z.radius) {
          if (b.isPlasma && b.hitZombies.has(z)) continue;
          if (b.isPlasma) b.hitZombies.add(z);
          z.health -= b.damage;
          z.hurtFlash = 7;
          shotsHit++;
          createFloatingText(z.x, z.y - 12, `${Math.round(b.damage)}`, b.color);

          for (let p = 0; p < 4; p++) {
            particles.push(new Particle(b.x, b.y, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, "#22c55e", 16, 2.5));
          }

          // Daño explosivo de área (Lanzagranadas BFG)
          if (b.isExplosive) {
            cameraShake = 9;
            for (let eIdx = zombies.length - 1; eIdx >= 0; eIdx--) {
              const ez = zombies[eIdx];
              const eDist = Math.hypot(b.x - ez.x, b.y - ez.y);
              if (eDist < 80 && ez !== z) {
                ez.health -= b.damage * 0.6;
                ez.hurtFlash = 7;
                createFloatingText(ez.x, ez.y - 12, `${Math.round(b.damage * 0.6)}`, "#ef4444");
              }
            }
            for (let i = 0; i < 20; i++) {
              particles.push(new Particle(b.x, b.y, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 7, "#ef4444", 25, 4));
            }
          }

          if (z.health <= 0) {
            zombiesKilledTotal++;
            score += z.type === "titan" ? 500 : z.type === "brute" ? 250 : z.type === "runner" ? 150 : 100;

            bloodSplats.push(new Decal(z.x, z.y, "blood", z.radius * 1.3));
            acidPuddles.push(new AcidPuddle(z.x, z.y));

            // La munición es limitada y no cae de todos los enemigos.
            if (Math.random() < 0.18 || z.type === "titan") {
              ammoPickups.push(new AmmoPickup(z.x, z.y));
            }

            // Los botiquines son escasos para que el daño tenga consecuencias.
            if (Math.random() < 0.07 || z.type === "titan") {
              medkitPickups.push(new MedkitPickup(z.x + (Math.random() - 0.5) * 16, z.y + (Math.random() - 0.5) * 16));
            }

            createFloatingText(z.x, z.y - 25, z.type === "titan" ? "+500 ¡TITÁN DESTRUIDO!" : "+100", "#4ade80");
            zombies.splice(zIdx, 1);

            if (zombies.length === 0) {
              exitPortal.activate();
            }
          }

          if (!b.isPlasma) {
            bullets.splice(bIdx, 1);
            break;
          }
        }
      }
    }

    // Proyectiles de ácido vs Jugador
    for (let aIdx = acidBullets.length - 1; aIdx >= 0; aIdx--) {
      const ab = acidBullets[aIdx];
      const dist = Math.hypot(ab.x - player.x, ab.y - player.y);
      if (dist < ab.radius + player.radius) {
        player.takeDamage(ab.damage);
        acidPuddles.push(new AcidPuddle(ab.x, ab.y));
        if (audio().playAcidSplash) audio().playAcidSplash();
        acidBullets.splice(aIdx, 1);
        continue;
      }

      if (ab.life <= 0 || ab.x < 30 || ab.x > W - 30 || ab.y < 30 || ab.y > H - 30) {
        acidPuddles.push(new AcidPuddle(ab.x, ab.y));
        acidBullets.splice(aIdx, 1);
      }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      if (b.life <= 0 || b.x < 10 || b.x > W - 10 || b.y < 10 || b.y > H - 10) {
        bullets.splice(i, 1);
      }
    }

    for (let i = ammoPickups.length - 1; i >= 0; i--) {
      if (ammoPickups[i].update(dt)) {
        ammoPickups.splice(i, 1);
      }
    }

    for (let i = medkitPickups.length - 1; i >= 0; i--) {
      if (medkitPickups[i].update(dt)) {
        medkitPickups.splice(i, 1);
      }
    }
  }

  // -------------------------------------------------------------
  // CONFIGURACIÓN DE LOS 5 ESCENARIOS DINÁMICOS POR SECTOR
  // -------------------------------------------------------------
  const SECTOR_THEMES = {
    1: {
      name: "COMPLEJO BIOGÉNICO DELTA",
      floorBase: "#090f18",
      tile1: "#0c1422",
      tile2: "#0e1828",
      gridLine: "rgba(56, 189, 248, 0.12)",
      lineColor: "rgba(14, 165, 233, 0.25)",
      hazardColor: "rgba(234, 179, 8, 0.65)",
      beaconColor: "#38bdf8",
      themeDetail: "lab"
    },
    2: {
      name: "ALCANTARILLADO Y CANAL TÓXICO",
      floorBase: "#07120a",
      tile1: "#0a180e",
      tile2: "#0d2013",
      gridLine: "rgba(34, 197, 94, 0.15)",
      lineColor: "rgba(34, 197, 94, 0.35)",
      hazardColor: "rgba(74, 222, 128, 0.75)",
      beaconColor: "#22c55e",
      themeDetail: "sewer"
    },
    3: {
      name: "BÚNKER DE SERVIDORES Y DEFENSAS",
      floorBase: "#0a0815",
      tile1: "#100d22",
      tile2: "#16112e",
      gridLine: "rgba(168, 85, 247, 0.14)",
      lineColor: "rgba(192, 132, 252, 0.32)",
      hazardColor: "rgba(234, 179, 8, 0.7)",
      beaconColor: "#a855f7",
      themeDetail: "server"
    },
    4: {
      name: "REACTOR TERMONUCLEAR DE FUSIÓN",
      floorBase: "#160905",
      tile1: "#200e08",
      tile2: "#2a130a",
      gridLine: "rgba(249, 115, 22, 0.18)",
      lineColor: "rgba(249, 115, 22, 0.38)",
      hazardColor: "rgba(239, 68, 68, 0.8)",
      beaconColor: "#f97316",
      themeDetail: "reactor"
    },
    5: {
      name: "CÁMARA DEL TITÁN (ZONA CERO)",
      floorBase: "#140513",
      tile1: "#1d081b",
      tile2: "#270b25",
      gridLine: "rgba(236, 72, 153, 0.18)",
      lineColor: "rgba(236, 72, 153, 0.38)",
      hazardColor: "rgba(239, 68, 68, 0.85)",
      beaconColor: "#ec4899",
      themeDetail: "hive"
    }
  };

  function drawLabFloor() {
    const theme = SECTOR_THEMES[roundNumber] || SECTOR_THEMES[1];

    // Fondo base del sector
    ctx.fillStyle = theme.floorBase;
    ctx.fillRect(0, 0, W, H);

    // Rejilla de baldosas
    const tileSize = 64;
    for (let x = 0; x < W; x += tileSize) {
      for (let y = 0; y < H; y += tileSize) {
        const isAlt = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        ctx.fillStyle = isAlt ? theme.tile1 : theme.tile2;
        ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

        // Remaches metálicos en las esquinas
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.fillRect(x + 4, y + 4, 2, 2);
        ctx.fillRect(x + tileSize - 6, y + 4, 2, 2);
        ctx.fillRect(x + 4, y + tileSize - 6, 2, 2);
        ctx.fillRect(x + tileSize - 6, y + tileSize - 6, 2, 2);
      }
    }

    // -------------------------------------------------------------
    // DETALLES ARQUITECTÓNICOS ESPECÍFICOS POR SECTOR
    // -------------------------------------------------------------
    if (theme.themeDetail === "lab") {
      // Rejilla de ventilación central con vapor
      ctx.fillStyle = "#060a12";
      ctx.fillRect(W / 2 - 40, H / 2 - 40, 80, 80);
      ctx.strokeStyle = theme.lineColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(W / 2 - 40, H / 2 - 40, 80, 80);
      for (let i = -30; i <= 30; i += 10) {
        ctx.beginPath();
        ctx.moveTo(W / 2 + i, H / 2 - 35);
        ctx.lineTo(W / 2 + i, H / 2 + 35);
        ctx.stroke();
      }
    } else if (theme.themeDetail === "sewer") {
      // Canal central de residuos tóxicos con limo ácido burbujeante
      ctx.fillStyle = "#051007";
      ctx.fillRect(0, H / 2 - 25, W, 50);
      ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, H / 2 - 25, W, 50);

      // Burbujas de ácido en el canal
      for (let i = 0; i < 6; i++) {
        const bx = (i * 180 + gameTime * 35) % W;
        const by = H / 2 + Math.sin(gameTime * 2 + i) * 12;
        ctx.fillStyle = "rgba(74, 222, 128, 0.6)";
        ctx.beginPath();
        ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (theme.themeDetail === "server") {
      // Racks de servidores militares con LED parpadeantes
      const rackPositions = [
        { x: 70, y: 70 }, { x: 70, y: H - 110 },
        { x: W - 110, y: 70 }
      ];
      rackPositions.forEach((rp) => {
        ctx.fillStyle = "#080612";
        ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.fillRect(rp.x, rp.y, 40, 40);
        ctx.strokeRect(rp.x, rp.y, 40, 40);

        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            const isLit = Math.sin(gameTime * 5 + row * 2 + col) > 0;
            ctx.fillStyle = isLit ? "#c084fc" : "#facc15";
            ctx.fillRect(rp.x + 8 + col * 9, rp.y + 8 + row * 9, 4, 3);
          }
        }
      });
    } else if (theme.themeDetail === "reactor") {
      // Trinchera central de plasma termonuclear ardiente
      const glowGrad = ctx.createLinearGradient(0, H / 2 - 30, 0, H / 2 + 30);
      glowGrad.addColorStop(0, "rgba(234, 88, 12, 0.1)");
      glowGrad.addColorStop(0.5, "rgba(249, 115, 22, 0.35)");
      glowGrad.addColorStop(1, "rgba(234, 88, 12, 0.1)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, H / 2 - 30, W, 60);

      ctx.strokeStyle = "rgba(249, 115, 22, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, H / 2 - 30); ctx.lineTo(W, H / 2 - 30);
      ctx.moveTo(0, H / 2 + 30); ctx.lineTo(W, H / 2 + 30);
      ctx.stroke();
    } else if (theme.themeDetail === "hive") {
      // Raíces y biomasa orgánica que se expande por el suelo del nido
      ctx.strokeStyle = "rgba(236, 72, 153, 0.4)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 + Math.sin(gameTime * 0.5) * 0.1;
        ctx.moveTo(W / 2, H / 2);
        ctx.quadraticCurveTo(W / 2 + Math.cos(angle) * 120, H / 2 + Math.sin(angle) * 120, W / 2 + Math.cos(angle) * 240, H / 2 + Math.sin(angle) * 240);
      }
      ctx.stroke();
    }

    // Líneas guía fluorescentes del sector
    ctx.strokeStyle = theme.lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.28); ctx.lineTo(W, H * 0.28);
    ctx.moveTo(0, H * 0.72); ctx.lineTo(W, H * 0.72);
    ctx.moveTo(W * 0.32, 0); ctx.lineTo(W * 0.32, H);
    ctx.moveTo(W * 0.68, 0); ctx.lineTo(W * 0.68, H);
    ctx.stroke();

    // Muros perimetrales reforzados
    ctx.fillStyle = "#04060b";
    ctx.fillRect(0, 0, W, 22);
    ctx.fillRect(0, H - 22, W, 22);
    ctx.fillRect(0, 0, 22, H);
    ctx.fillRect(W - 22, 0, 22, H);

    // Franja perimetral de advertencia
    ctx.strokeStyle = theme.hazardColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 22, W - 44, H - 44);

    // Balizas de sector en las 4 esquinas
    const cornerLights = [
      { x: 30, y: 30 }, { x: W - 30, y: 30 },
      { x: 30, y: H - 30 }, { x: W - 30, y: H - 30 }
    ];
    cornerLights.forEach((cl) => {
      const lPulse = 0.5 + Math.sin(gameTime * 3.5) * 0.5;
      const lGrad = ctx.createRadialGradient(cl.x, cl.y, 2, cl.x, cl.y, 22);
      lGrad.addColorStop(0, theme.beaconColor);
      lGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.globalAlpha = 0.45 * lPulse;
      ctx.fillStyle = lGrad;
      ctx.beginPath();
      ctx.arc(cl.x, cl.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // -------------------------------------------------------------
  // RENDERIZADO DE CONTROLES TÁCTILES Y RETÍCULA DE AUTO-APUNTADO
  // -------------------------------------------------------------
  function drawTouchControls() {
    // Retícula de auto-apuntado (activa tanto en móvil como con mando/PC)
    const target = touchControls.currentTarget;
    if (target && target.health > 0 && ((controlMode === "touch" && touchControls.autoAim) || (controlMode === "gamepad" && gamepadAutoAim))) {
      ctx.save();
      // Línea láser holográfica guía
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Retícula circular con corchetes en el objetivo fijado
      const reticleR = target.radius + 12 + Math.sin(gameTime * 8) * 2;
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(target.x, target.y, reticleR, 0, Math.PI * 2);
      ctx.stroke();

      // Cruz táctica interna
      ctx.beginPath();
      ctx.moveTo(target.x - reticleR - 4, target.y);
      ctx.lineTo(target.x - reticleR + 4, target.y);
      ctx.moveTo(target.x + reticleR - 4, target.y);
      ctx.lineTo(target.x + reticleR + 4, target.y);
      ctx.moveTo(target.x, target.y - reticleR - 4);
      ctx.lineTo(target.x, target.y - reticleR + 4);
      ctx.moveTo(target.x, target.y + reticleR - 4);
      ctx.lineTo(target.x, target.y + reticleR + 4);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.font = "bold 9px 'Orbitron', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText("[ FIJADO ]", target.x, target.y - reticleR - 6);
      ctx.restore();
    }

    if (!touchControls.enabled) return;

    ctx.save();

    // 1. Joystick virtual izquierdo (Movimiento)
    const st = touchControls.stick;
    const baseCenterX = st.active ? st.baseX : 105;
    const baseCenterY = st.active ? st.baseY : H - 105;

    // Base circular
    ctx.fillStyle = "rgba(8, 14, 25, 0.45)";
    ctx.strokeStyle = st.active ? "rgba(56, 189, 248, 0.8)" : "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(baseCenterX, baseCenterY, st.baseR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cruz direccional guía tenue
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(baseCenterX - st.baseR + 10, baseCenterY);
    ctx.lineTo(baseCenterX + st.baseR - 10, baseCenterY);
    ctx.moveTo(baseCenterX, baseCenterY - st.baseR + 10);
    ctx.lineTo(baseCenterX, baseCenterY + st.baseR - 10);
    ctx.stroke();

    // Stick / Mango interior
    const stickX = st.active ? st.currentX : baseCenterX;
    const stickY = st.active ? st.currentY : baseCenterY;

    const stickGrad = ctx.createRadialGradient(stickX, stickY, 2, stickX, stickY, st.handleR);
    stickGrad.addColorStop(0, "rgba(56, 189, 248, 0.9)");
    stickGrad.addColorStop(1, "rgba(14, 165, 233, 0.65)");
    ctx.fillStyle = stickGrad;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = st.active ? 12 : 6;
    ctx.beginPath();
    ctx.arc(stickX, stickY, st.handleR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 2. Botones de acción virtual táctil (Lado Derecho)
    for (const btn of touchControls.buttons) {
      const isAimBtn = btn.id === "aim";
      const isAimActive = isAimBtn && touchControls.autoAim;

      ctx.save();
      ctx.fillStyle = btn.pressed ? "#ffffff" : isAimActive ? "rgba(6, 182, 212, 0.85)" : "rgba(15, 23, 42, 0.78)";
      ctx.strokeStyle = btn.pressed ? "#ffffff" : isAimActive ? "#38bdf8" : btn.bg;
      ctx.lineWidth = isAimActive ? 2.5 : 2;
      ctx.shadowColor = isAimActive ? "#38bdf8" : btn.bg;
      ctx.shadowBlur = btn.pressed || isAimActive ? 14 : 6;

      ctx.beginPath();
      ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Icono
      ctx.font = `${Math.round(btn.r * 0.75)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(btn.icon, btn.x, btn.y - 4);

      // Etiqueta
      ctx.font = "bold 8px 'Orbitron', sans-serif";
      ctx.fillStyle = btn.pressed ? "#0f172a" : "#f8fafc";
      ctx.fillText(btn.label, btn.x, btn.y + btn.r * 0.55);
      ctx.restore();
    }

    ctx.restore();
  }

  // -------------------------------------------------------------
  // HUD ULTRA-LIMPIO: SIN ESTORBOS ARRIBA, SÓLO ABAJO TRANSLÚCIDO
  // -------------------------------------------------------------
  function drawHUD() {
    ctx.save();

    // -----------------------------------------------------------
    // BARRA SUPERIOR: CÁPSULA MINIMALISTA ULTRA-LIMPIA (NO ESTORBA)
    // -----------------------------------------------------------
    const topBarW = 440;
    const topBarH = 28;
    const topBarX = W / 2 - topBarW / 2;
    const topBarY = 10;

    const theme = SECTOR_THEMES[roundNumber] || SECTOR_THEMES[1];

    ctx.fillStyle = "rgba(8, 13, 23, 0.78)";
    ctx.strokeStyle = exitPortal.active ? "rgba(56, 189, 248, 0.65)" : "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(topBarX, topBarY, topBarW, topBarH, 14);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "bold 13px 'Trebuchet MS', sans-serif";
    if (exitPortal.active) {
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`SECTOR ${roundNumber}/5  •  ${score.toLocaleString()} PTS  |  ¡META ACTIVA! EVACUA ➔`, W / 2, topBarY + 18);
    } else {
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(`SECTOR ${roundNumber}/5: ${theme.name}  •  ${score.toLocaleString()} PTS`, W / 2, topBarY + 18);
    }

    // Botón de Pausa superior derecho discreto (sin etiqueta de tecla [P])
    const pBtnW = 84;
    const pBtnH = 26;
    const pBtnX = W - pBtnW - 20;
    const pBtnY = 11;

    ctx.fillStyle = "rgba(8, 13, 23, 0.75)";
    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(pBtnX, pBtnY, pBtnW, pBtnH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 11px 'Rajdhani', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⏸ PAUSA", pBtnX + pBtnW / 2, pBtnY + 17);

    // Indicador sutil de dispositivo activo en la esquina superior izquierda
    if (gamepadConnected) {
      ctx.fillStyle = "rgba(34, 197, 94, 0.2)";
      ctx.strokeStyle = "rgba(34, 197, 94, 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(20, 11, 135, 26, 6);
      ctx.fill();
      ctx.stroke();
      ctx.font = "bold 10px 'Rajdhani', sans-serif";
      ctx.fillStyle = "#4ade80";
      ctx.textAlign = "center";
      ctx.fillText("🎮 MANDO ACTIVO", 87, 27);
    } else if (touchControls.enabled) {
      ctx.fillStyle = "rgba(56, 189, 248, 0.2)";
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(20, 11, 135, 26, 6);
      ctx.fill();
      ctx.stroke();
      ctx.font = "bold 10px 'Rajdhani', sans-serif";
      ctx.fillStyle = "#38bdf8";
      ctx.textAlign = "center";
      ctx.fillText("📱 MODO TÁCTIL", 87, 27);
    }

    // -----------------------------------------------------------
    // HUD INFERIOR IZQUIERDO: SALUD Y DASH (ESPACIADO PERFECTO)
    // -----------------------------------------------------------
    const leftW = 190;
    const leftH = 56;
    const leftX = 14;
    const leftY = H - leftH - 12;

    ctx.fillStyle = "rgba(8, 13, 23, 0.7)";
    ctx.strokeStyle = player.hurtFlash > 0 ? "#ef4444" : "rgba(34, 197, 94, 0.4)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(leftX, leftY, leftW, leftH, 10);
    ctx.fill();
    ctx.stroke();

    // Línea 1: Salud a la izquierda, Estado Dash a la derecha (sin encimarse)
    ctx.textAlign = "left";
    ctx.font = "bold 11px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = player.health < 30 ? "#ef4444" : "#f1f5f9";
    ctx.fillText(`SALUD: ${Math.round(player.health)}%`, leftX + 14, leftY + 18);

    ctx.textAlign = "right";
    ctx.font = "bold 8px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = player.stamina >= 30 ? "#38bdf8" : "#f59e0b";
    ctx.fillText("ENERGÍA DASH", leftX + leftW - 14, leftY + 18);

    // Línea 2: Barra de salud
    const barX = leftX + 14;
    const barY = leftY + 24;
    const barW = leftW - 28;
    const barH = 6;

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(barX, barY, barW, barH);

    const hpPct = Math.max(0, player.health / player.maxHealth);
    const hpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    hpGrad.addColorStop(0, "#ef4444");
    hpGrad.addColorStop(0.5, "#facc15");
    hpGrad.addColorStop(1, "#22c55e");
    ctx.fillStyle = hpGrad;
    ctx.fillRect(barX, barY, barW * hpPct, barH);

    // Línea 3: Barra de Dash / Estamina
    const staY = barY + 11;
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(barX, staY, barW, 5);
    const staPct = Math.max(0, player.stamina / player.maxStamina);
    ctx.fillStyle = player.stamina >= 30 ? "#38bdf8" : "#f59e0b";
    ctx.fillRect(barX, staY, barW * staPct, 5);

    // -----------------------------------------------------------
    // HUD INFERIOR DERECHO: ARMA Y MUNICIÓN (FILAS DEDICADAS, CERO COLISIONES)
    // -----------------------------------------------------------
    const rightW = 200;
    const rightH = 48;
    const rightX = W - rightW - 14;
    const rightY = H - rightH - 12;

    const w = player.weapon;

    ctx.fillStyle = "rgba(8, 13, 23, 0.72)";
    ctx.strokeStyle = player.reloading ? "#f59e0b" : w.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(rightX, rightY, rightW, rightH, 10);
    ctx.fill();
    ctx.stroke();

    // Fila 1: Nombre del arma completo
    ctx.textAlign = "left";
    ctx.font = "bold 9px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = w.color;
    const weaponLabel = w.name.length > 22 ? `${w.name.slice(0, 20)}...` : w.name;
    ctx.fillText(`${w.icon} ${weaponLabel.toUpperCase()}`, rightX + 12, rightY + 16);

    // Fila 2: Etiqueta y contador numérico de munición + reserva
    ctx.font = "bold 8px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = player.reloading ? "#f59e0b" : "#94a3b8";
    ctx.fillText(player.reloading ? "RECARGANDO..." : "MUNICIÓN", rightX + 12, rightY + 31);

    ctx.textAlign = "right";
    ctx.font = "bold 13px 'Trebuchet MS', monospace";
    ctx.fillStyle = player.reloading ? "#f59e0b" : w.ammo <= w.magSize * 0.25 ? "#ef4444" : "#f8fafc";
    ctx.fillText(`${w.ammo} / ${w.magSize}`, rightX + rightW - 54, rightY + 31);

    ctx.font = "bold 8px 'Trebuchet MS', monospace";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(`+${w.reserves}`, rightX + rightW - 10, rightY + 31);

    // Fila 3: Cartuchos individuales de munición
    const cartX = rightX + 14;
    const cartY = rightY + 35;
    const cartMaxW = rightW - 28;
    const cartCount = Math.min(w.magSize, 28);
    const singleW = Math.max(3, Math.min(7, Math.floor((cartMaxW - cartCount * 2) / cartCount)));
    const singleH = 5;

    for (let c = 0; c < cartCount; c++) {
      const isFilled = c < Math.round((w.ammo / w.magSize) * cartCount);
      const bx = cartX + c * (singleW + 2);
      ctx.fillStyle = isFilled ? w.color : "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(bx, cartY, singleW, singleH);
    }

    ctx.restore();

    // Renderizar controles táctiles y retícula de auto-apuntado
    drawTouchControls();

    // Notificación sutil (Toast) de nueva arma o aviso temporal
    if (bannerMessage && bannerMessage.life > 0) {
      ctx.save();
      const bAlpha = Math.min(1, bannerMessage.life / 20);
      ctx.globalAlpha = bAlpha;

      const bW = 420;
      const bH = 32;
      const bX = W / 2 - bW / 2;
      const bY = 44;

      ctx.fillStyle = "rgba(8, 13, 23, 0.9)";
      ctx.strokeStyle = bannerMessage.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(bX, bY, bW, bH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.font = "bold 11px 'Orbitron', sans-serif";
      ctx.fillStyle = bannerMessage.color;
      ctx.fillText(bannerMessage.text, W / 2, bY + 20);
      ctx.restore();
    }
  }

  // -------------------------------------------------------------
  // REGISTROS NARRATIVOS: HISTORIA PROGRESIVA POR SECTOR
  // -------------------------------------------------------------
  const STORY_LOGS = {
    intro: {
      sector: 1,
      name: "COMPLEJO BIOGÉNICO DELTA",
      freq: "142.85 MHz",
      speaker: "DRA. ELENA VANCE",
      role: "SALA DE CONTROL DELTA // OFICIAL CIENTÍFICA",
      avatar: "vance",
      msg: "¡Sargento Zamo! Logré restablecer tu enlace neural biónico. El Director de la corporación liberó el virus mutagénico Ácido-X para eliminar los registros del Proyecto Quimera y selló el perímetro. Los científicos y guardias han mutado en horrores biológicos. Eres el único bio-comando con conciencia intacta. ¡Debes purgar los 5 sectores y evacuar por la Zona de Meta antes del colapso del domo!",
      zamoReply: "SGT. ZAMO: «Tranquila, doctora. Mi piel escamada resiste el ácido y mi escopeta tiene hambre de plomo. Hora de limpiar este laboratorio.»",
      weapon: "ESCOPETA TÁCTICA ZAMO (DISPERSIÓN PESADA)",
      tip: "Desplázate con el joystick o teclas, apunta y dispara para avanzar hacia la Zona de Meta."
    },
    1: {
      sector: 2,
      name: "ALCANTARILLADO Y CANAL TÓXICO",
      freq: "142.90 MHz",
      speaker: "DRA. ELENA VANCE",
      role: "SALA DE CONTROL DELTA // CANAL SEGURO",
      avatar: "vance",
      msg: "¡Sector 1 purgado, excelente puntería! Pero el ascensor principal colapsó por el peso de la biomasa. Tendrás que atravesar las alcantarillas de drenaje. Cuidado: el contacto con el limo corrosivo aceleró el metabolismo de los infectados: ahora corren al doble de velocidad (Runners). Desbloqueé el Rifle de Asalto Mil-Spec en tu arsenal táctico.",
      zamoReply: "SGT. ZAMO: «Que corran todo lo que quieran... una ráfaga militar calibre 5.56 mm siempre viaja más rápido. Entrando a los canales hediondos.»",
      weapon: "RIFLE DE ASALTO MIL-SPEC (CADENCIA CONTINUA 5.56mm)",
      tip: "Mantén el disparo para fuego continuo y usa el Dash táctico para evadir charcos corrosivos."
    },
    2: {
      sector: 3,
      name: "BÚNKER DE SERVIDORES Y CIBERDEFENSAS",
      freq: "143.15 MHz",
      speaker: "DRA. ELENA VANCE",
      role: "SALA DE CONTROL DELTA // CANAL SEGURO",
      avatar: "vance",
      msg: "¡Canales superados, Sargento! Estás en la bóveda militar del Proyecto Quimera. La IA de defensa activó especímenes con blindaje cibernético (Brutes). Su exoesqueleto repele impactos ligeros. Te transferí los códigos de la Subametralladora Táctica Z-99 con cargador ampliado de 45 proyectiles.",
      zamoReply: "SGT. ZAMO: «Más blindaje solo significa que tendré que dispararles más balas por segundo. Voy a demoler esos servidores.»",
      weapon: "SUBAMETRALLADORA TÁCTICA Z-99 (45 BALAS • HIPERCADENCIA)",
      tip: "Satura a los brutos con ráfagas continuas antes de que te acorralen contra los servidores."
    },
    3: {
      sector: 4,
      name: "REACTOR TERMONUCLEAR DE FUSIÓN",
      freq: "143.50 MHz",
      speaker: "DRA. ELENA VANCE",
      role: "SALA DE CONTROL DELTA // ALERTA CRÍTICA",
      avatar: "vance",
      msg: "¡Zamo, las lecturas térmicas se dispararon! El reactor entró en sobrecarga crítica y hay grietas de plasma ardiente a más de 800°C. La concentración de mutantes es masiva. Para atravesar este infierno liberé el arma experimental de energía: el Cañón de Plasma Iónico. Sus orbes perforan grupos enteros de infectados.",
      zamoReply: "SGT. ZAMO: «Calor, radiación y tecnología experimental... mi clase favorita de fiesta. Mantén el portal listo, doctora.»",
      weapon: "CAÑÓN DE PLASMA IÓNICO (ORBES PERFORANTES ENERGÉTICOS)",
      tip: "Alinea a las hordas para que las esferas de plasma penetren múltiples objetivos a la vez."
    },
    4: {
      sector: 5,
      name: "CÁMARA DEL TITÁN (ZONA CERO)",
      freq: "144.00 MHz",
      speaker: "DRA. ELENA VANCE",
      role: "SALA DE CONTROL DELTA // EMERGENCIA MÁXIMA",
      avatar: "vance",
      msg: "¡ALERTA MÁXIMA! El Sujeto Omega... ¡el Titán Mutante ha tomado la esclusa de evacuación a la superficie! Mide más de cuatro metros, posee coraza hipertrófica y vomita ráfagas pesadas de ácido corrosivo. Desbloqueé el Lanzagranadas BFG con ojivas demoledoras. ¡Destrúyelo o nadie saldrá con vida!",
      zamoReply: "SGT. ZAMO: «Dile al helicóptero que caliente turbinas. Ese monstruo va a aprender lo que muerde un cocodrilo con un lanzamisiles.»",
      weapon: "LANZAGRANADAS BFG DEVASTADOR (OJIVAS EXPLOSIVAS DE ÁREA)",
      tip: "Mantén distancia prudente contra el Titán y destruye los proyectiles de ácido antes de que impacten."
    },
    victory: {
      sector: 5,
      name: "HELIPUERTO EXTERIOR // COMPLEJO DELTA",
      freq: "144.90 MHz",
      speaker: "COMANDO CENTRAL DE RESCATE",
      role: "FUERZAS ESPECIALES // EXTRACCIÓN CONFIRMADA",
      avatar: "zamo",
      msg: "¡El Titán Omega ha caído y la secuencia de autodestrucción fue completada! El Sargento Zamo llega a la pista superior justo cuando el helicóptero de extracción desciende con reflectores de combate. La muestra del Ácido-X ha sido recuperada y la amenaza biológica neutralizada con éxito.",
      zamoReply: "SGT. ZAMO: «Misión cumplida, doctora Vance. Que preparen un filete de res crudo en la base... este cocodrilo comando se va de permiso.»",
      weapon: "ARSENAL COMPLETO DOMINADO CON ÉXITO",
      tip: "¡Has completado todos los 5 sectores y derrotado al jefe final del laboratorio!"
    }
  };

  // -------------------------------------------------------------
  // GENERADORES DE AVATARES PROCEDURALES DE PERSONAJE
  // -------------------------------------------------------------
  function drawVanceAvatar(ctx, ax, ay, size) {
    ctx.save();
    ctx.translate(ax, ay);

    // Marco exterior con brillo cian
    ctx.fillStyle = "#07131e";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Rejilla de fondo radar
    ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
    ctx.lineWidth = 1;
    for (let i = 12; i < size; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, size);
      ctx.moveTo(0, i); ctx.lineTo(size, i);
      ctx.stroke();
    }

    const cx = size / 2;
    const cy = size / 2 + 6;

    // Cabeza y cabello de la Dra. Elena Vance
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.arc(cx, cy - 14, 18, 0, Math.PI * 2);
    ctx.fill();

    // Mechones / flequillo
    ctx.fillStyle = "#475569";
    ctx.beginPath();
    ctx.arc(cx, cy - 16, 17, Math.PI, Math.PI * 2);
    ctx.fill();

    // Cuello y hombros con bata de laboratorio
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy + 28);
    ctx.lineTo(cx - 10, cy + 4);
    ctx.lineTo(cx + 10, cy + 4);
    ctx.lineTo(cx + 18, cy + 28);
    ctx.closePath();
    ctx.fill();

    // Cuello de bata científica blanca
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy + 6);
    ctx.lineTo(cx, cy + 20);
    ctx.lineTo(cx + 12, cy + 6);
    ctx.stroke();

    // Visor holográfico de laboratorio cian brillante
    ctx.fillStyle = "#06b6d4";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(cx - 14, cy - 18, 28, 8, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Auricular de comunicaciones militar con luz LED
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(cx + 14, cy - 14, 3, 0, Math.PI * 2);
    ctx.fill();

    // Línea de barrido holográfico animada
    const scanY = (gameTime * 45) % size;
    ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(size, scanY);
    ctx.stroke();

    ctx.restore();
  }

  function drawZamoAvatar(ctx, ax, ay, size) {
    ctx.save();
    ctx.translate(ax, ay);

    // Marco exterior esmeralda militar
    ctx.fillStyle = "#06130b";
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#22c55e";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Rejilla de telemetría táctica
    ctx.strokeStyle = "rgba(34, 197, 94, 0.12)";
    ctx.lineWidth = 1;
    for (let i = 12; i < size; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, size);
      ctx.moveTo(0, i); ctx.lineTo(size, i);
      ctx.stroke();
    }

    const cx = size / 2;
    const cy = size / 2 + 4;

    // Boina táctica militar verde comando
    ctx.fillStyle = "#1e3a1f";
    ctx.beginPath();
    ctx.ellipse(cx - 4, cy - 20, 22, 9, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#facc15"; // Insignia dorada
    ctx.beginPath();
    ctx.arc(cx + 6, cy - 21, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Cabeza de reptil escamado
    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 8, 16, 0, Math.PI * 2);
    ctx.fill();

    // Hocico largo de cocodrilo con colmillos
    ctx.fillStyle = "#166534";
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 10);
    ctx.lineTo(cx + 26, cy - 4);
    ctx.lineTo(cx + 24, cy + 6);
    ctx.lineTo(cx - 8, cy + 4);
    ctx.closePath();
    ctx.fill();

    // Dientes afilados de combate
    ctx.fillStyle = "#f8fafc";
    for (let d = 0; d < 4; d++) {
      ctx.beginPath();
      ctx.moveTo(cx + 2 + d * 5, cy + 1);
      ctx.lineTo(cx + 4 + d * 5, cy + 4);
      ctx.lineTo(cx + 6 + d * 5, cy + 1);
      ctx.fill();
    }

    // Ojo biónico cibernético rojo carmesí
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx + 2, cy - 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cuello y armadura balística de titanio
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy + 28);
    ctx.lineTo(cx - 12, cy + 8);
    ctx.lineTo(cx + 12, cy + 8);
    ctx.lineTo(cx + 20, cy + 28);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#334155";
    ctx.fillRect(cx - 8, cy + 12, 16, 12);
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 8, cy + 12, 16, 12);

    // Línea de escaneo
    const scanY = (gameTime * 45) % size;
    ctx.strokeStyle = "rgba(34, 197, 94, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(size, scanY);
    ctx.stroke();

    ctx.restore();
  }

  // -------------------------------------------------------------
  // UTILIDAD PARA TEXTO MULTILÍNEA JUSTIFICADO
  // -------------------------------------------------------------
  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, currentY);
        line = words[n] + " ";
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
    return currentY + lineHeight;
  }

  function shortenText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || "";
    const shortened = text.slice(0, maxLength);
    return shortened.slice(0, shortened.lastIndexOf(" ")) + "...";
  }

  // -------------------------------------------------------------
  // TERMINAL DE COMUNICACIONES TÁCTICAS NARRATIVAS (UI PRINCIPAL)
  // -------------------------------------------------------------
  function drawTacticalModal({ tag, title, log, nextWep, buttonText, isIntro, isRoundOver, isVictory, stats }) {
    const entrance = Math.min(1, modalAnim / 16);
    const easedEntrance = 1 - Math.pow(1 - entrance, 3);
    const mW = 780;
    const mH = 460;
    const mX = W / 2 - mW / 2;
    const mY = H / 2 - mH / 2 + (1 - easedEntrance) * 18;

    ctx.save();
    ctx.globalAlpha = easedEntrance;

    // Tarjeta exterior de cristal militar oscuro
    ctx.fillStyle = "rgba(8, 14, 25, 0.96)";
    ctx.strokeStyle = isVictory ? "#facc15" : isRoundOver ? "#4ade80" : "#38bdf8";
    ctx.lineWidth = 1.8;
    ctx.shadowColor = isVictory ? "#facc15" : isRoundOver ? "#4ade80" : "#38bdf8";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.roundRect(mX, mY, mW, mH, 16);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 1. Cabecera con frecuencia y barras de visualizador de audio
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.beginPath();
    ctx.roundRect(mX + 16, mY + 12, mW - 32, 42, 8);
    ctx.fill();

    ctx.textAlign = "left";
    ctx.font = "bold 12px 'Rajdhani', sans-serif";
    ctx.fillStyle = isVictory ? "#facc15" : isRoundOver ? "#4ade80" : "#38bdf8";
    const cleanTag = (tag || "").length > 32 ? (tag || "").slice(0, 30) + "..." : (tag || "");
    ctx.fillText(`🛰️ ENLACE // ${log.freq || "142.85 MHz"} // ${cleanTag}`, mX + 28, mY + 28);

    ctx.font = "bold 18px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title, mX + 28, mY + 46);

    // Barras ecualizadoras de radio en vivo
    for (let b = 0; b < 14; b++) {
      const bh = 5 + Math.abs(Math.sin(gameTime * 7 + b * 0.7)) * 18;
      ctx.fillStyle = isVictory ? "#facc15" : isRoundOver ? "#4ade80" : "#38bdf8";
      ctx.fillRect(mX + mW - 160 + b * 9, mY + 36 - bh / 2, 5, bh);
    }

    // 2. Columna Izquierda: Avatar y datos del transmisor
    const avX = mX + 24;
    const avY = mY + 68;
    const avSize = 114;

    if (log.avatar === "vance") {
      drawVanceAvatar(ctx, avX, avY, avSize);
    } else {
      drawZamoAvatar(ctx, avX, avY, avSize);
    }

    ctx.textAlign = "center";
    ctx.font = "bold 13px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = log.avatar === "vance" ? "#38bdf8" : "#22c55e";
    ctx.fillText(log.speaker, avX + avSize / 2, avY + avSize + 16);

    const roleParts = (log.role || "").split("//").map(s => s.trim());
    if (roleParts.length > 1) {
      ctx.font = "600 10px 'Trebuchet MS', sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(roleParts[0], avX + avSize / 2, avY + avSize + 27);
      ctx.fillText(roleParts[1], avX + avSize / 2, avY + avSize + 37);
    } else {
      ctx.font = "600 10px 'Trebuchet MS', sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(log.role, avX + avSize / 2, avY + avSize + 28);
    }

    // Insignias de bajas y puntos acumulados
    if (stats) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(avX, avY + avSize + 42, avSize, 50, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = "bold 11px 'Rajdhani', sans-serif";
      ctx.fillStyle = "#4ade80";
      ctx.fillText(`${stats.kills} BAJAS`, avX + avSize / 2, avY + avSize + 59);

      ctx.fillStyle = "#facc15";
      ctx.fillText(`${stats.score.toLocaleString()} PTS`, avX + avSize / 2, avY + avSize + 78);
    }

    // 3. Columna Derecha: Tarjetas de diálogo narrativo e inteligencia
    const rcX = mX + 160;
    const rcW = mW - 184;

    // Caja 1: Transmisión de la Dra. Vance
    const b1Y = mY + 68;
    const b1H = 96;
    ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(rcX, b1Y, rcW, b1H, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.font = "bold 12px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(`TRANSMISIÓN ENTRANTE // CANAL SEGURO:`, rcX + 14, b1Y + 18);

    ctx.font = "500 13px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#e2e8f0";
    const message = isRoundOver && !isVictory ? shortenText(log.msg, 210) : log.msg;
    wrapText(ctx, message, rcX + 14, b1Y + 36, rcW - 28, 17);

    // Caja 2: Respuesta táctica del Sargento Zamo
    const b2Y = b1Y + b1H + 10;
    const b2H = 68;
    ctx.fillStyle = "rgba(6, 22, 14, 0.78)";
    ctx.strokeStyle = "rgba(34, 197, 94, 0.4)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(rcX, b2Y, rcW, b2H, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = "bold 11px 'Rajdhani', sans-serif";
    ctx.fillStyle = "#22c55e";
    ctx.fillText(`RESPUESTA DE RADIO // SGT. ZAMO:`, rcX + 14, b2Y + 18);

    ctx.font = "600 13px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#bbf7d0";
    wrapText(ctx, log.zamoReply, rcX + 14, b2Y + 36, rcW - 28, 17);

    // Caja 3: Desbloqueo de Arsenal o Controles
    const b3Y = b2Y + b2H + 10;
    const b3H = 88;
    ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
    ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(rcX, b3Y, rcW, b3H, 8);
    ctx.fill();
    ctx.stroke();

    if (nextWep) {
      ctx.font = "bold 13px 'Trebuchet MS', sans-serif";
      ctx.fillStyle = nextWep.color;
      ctx.fillText(`¡NUEVO ARMA SUMINISTRADA: ${nextWep.name.toUpperCase()}!`, rcX + 14, b3Y + 22);

      ctx.font = "bold 17px 'Trebuchet MS', monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`${nextWep.icon} DAÑO: ${nextWep.damage}  •  CAPACIDAD: ${nextWep.magSize} BALAS`, rcX + 14, b3Y + 46);

      ctx.font = "500 12px 'Trebuchet MS', sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(log.tip, rcX + 14, b3Y + 68);
    } else if (isIntro) {
      ctx.font = "bold 13px 'Trebuchet MS', sans-serif";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText("GUÍA RÁPIDA DE MANDOS DE COMBATE:", rcX + 14, b3Y + 20);

      const controls = [
        { k: "MOVER", d: "Stick / Teclas" },
        { k: "DISPARO", d: "Botón / Click" },
        { k: "ARMAS", d: "Botón / Rueda" },
        { k: "DASH", d: "Esquiva Rápida" }
      ];
      controls.forEach((c, i) => {
        const cx = rcX + 14 + i * 135;
        ctx.fillStyle = "rgba(30, 41, 59, 0.7)";
        ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cx, b3Y + 32, 125, 42, 6);
        ctx.fill();
        ctx.stroke();

        ctx.font = "bold 12px 'Trebuchet MS', sans-serif";
        ctx.fillStyle = "#38bdf8";
        ctx.fillText(c.k, cx + 12, b3Y + 49);
        ctx.font = "600 11px 'Trebuchet MS', sans-serif";
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText(c.d, cx + 12, b3Y + 64);
      });
    } else if (isVictory) {
      ctx.font = "bold 15px 'Trebuchet MS', sans-serif";
      ctx.fillStyle = "#facc15";
      ctx.fillText("🎖️ EVALUACIÓN TÁCTICA DE COMANDO: RANGO S+ (LEYENDA DEL COMPLEJO)", rcX + 14, b3Y + 24);

      ctx.font = "600 12px 'Trebuchet MS', sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText("Puntaje extraordinario • Complejo Delta purgado • El Sargento Zamo evacuó con éxito la isla.", rcX + 14, b3Y + 50);
      ctx.fillText("¡Gracias por jugar! Puedes reiniciar para superar tu récord de bajas y puntuación.", rcX + 14, b3Y + 68);
    }

    // 4. Botón de Acción Principal
    const btnW = 340;
    const btnH = 44;
    const btnX = W / 2 - btnW / 2;
    const btnY = mY + mH - 58;

    ctx.fillStyle = isVictory ? "#facc15" : isRoundOver ? "#38bdf8" : "#22c55e";
    ctx.shadowColor = isVictory ? "#facc15" : isRoundOver ? "#38bdf8" : "#22c55e";
    ctx.shadowBlur = 14 + Math.sin(gameTime * 5) * 3;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.textAlign = "center";
    ctx.font = "bold 17px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = isVictory ? "#422006" : isRoundOver ? "#082f49" : "#022c22";
    ctx.fillText(buttonText, W / 2, btnY + 27);

    ctx.font = "500 11px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Toca la pantalla o haz clic para continuar", W / 2, mY + mH - 6);
    ctx.restore();
  }

  function drawStoryScreen() {
    ctx.fillStyle = "rgba(4, 7, 14, 0.92)";
    ctx.fillRect(0, 0, W, H);

    drawTacticalModal({
      tag: "INFORME DE MISIÓN // INCIDENTE EN LABORATORIO",
      title: "OPERACIÓN FUGA: EL DESPERTAR DEL SARGENTO ZAMO",
      log: STORY_LOGS.intro,
      buttonText: "INICIAR MISIÓN  •  DESPLEGAR A ZAMO",
      isIntro: true
    });
  }

  function drawRoundOverScreen() {
    ctx.fillStyle = "rgba(4, 7, 14, 0.92)";
    ctx.fillRect(0, 0, W, H);

    const log = roundNumber >= MAX_ROUNDS ? STORY_LOGS.victory : (STORY_LOGS[roundNumber] || STORY_LOGS[1]);
    const nextWep = WEAPONS.find((w) => w.unlockedAtRound === roundNumber + 1);
    const isFinalSector = roundNumber >= MAX_ROUNDS;

    drawTacticalModal({
      tag: isFinalSector ? "INFORME FINAL // EVACUACIÓN TOTAL CONFIRMADA" : `SECTOR ${roundNumber} PURGADO // TRANSMISIÓN SEGURA`,
      title: isFinalSector ? "¡FUGA EXITOSA: EL TITÁN HA SIDO DESTRUIDO!" : `¡SECTOR ${roundNumber} COMPLETADO CON ÉXITO!`,
      log: log,
      nextWep: nextWep,
      buttonText: isFinalSector ? "VER INFORME FINAL" : `SIGUIENTE SECTOR  •  SECTOR ${roundNumber + 1}`,
      isRoundOver: true,
      isVictory: isFinalSector,
      stats: {
        kills: zombiesKilledTotal,
        score: score
      }
    });
  }

  function drawVictoryTotalScreen() {
    ctx.fillStyle = "rgba(4, 7, 14, 0.96)";
    ctx.fillRect(0, 0, W, H);

    drawTacticalModal({
      tag: "INFORME FINAL // EVACUACIÓN TOTAL CONFIRMADA",
      title: "🏆 ¡FUGA EXITOSA: EL TITÁN HA SIDO DESTRUIDO!",
      log: STORY_LOGS.victory,
      buttonText: "JUGAR DE NUEVO",
      isVictory: true,
      stats: {
        kills: zombiesKilledTotal,
        score: score
      }
    });
  }

  // -------------------------------------------------------------
  // TRANSICIONES CINEMÁTICAS EN TIEMPO REAL
  // -------------------------------------------------------------
  function drawSectorEnterCinematic() {
    // Barras negras cinematográficas (Letterboxing que se retrae)
    const prog = sectorEnterTimer / SECTOR_ENTER_DURATION;
    const letterboxH = 46 * Math.max(0, 1 - prog * 0.5);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, W, letterboxH);
    ctx.fillRect(0, H - letterboxH, W, letterboxH);

    // Compuerta de esclusa en la pared izquierda sellándose
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, H / 2 - 45, 26, 90);
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, H / 2 - 45, 26, 90);

    for (let sy = H / 2 - 40; sy < H / 2 + 40; sy += 12) {
      ctx.fillStyle = "#eab308";
      ctx.fillRect(4, sy, 18, 6);
    }

    // Banner de telemetría militar flotante
    const theme = SECTOR_THEMES[roundNumber] || SECTOR_THEMES[1];
    const bW = 560;
    const bH = 44;
    const bX = W / 2 - bW / 2;
    const bY = letterboxH + 12;

    ctx.save();
    ctx.fillStyle = "rgba(8, 14, 25, 0.94)";
    ctx.strokeStyle = theme.beaconColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bX, bY, bW, bH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "bold 13px 'Rajdhani', sans-serif";
    ctx.fillStyle = theme.beaconColor;
    ctx.fillText(`>> INSERCIÓN DE COMBATE // SECTOR ${roundNumber}: ${theme.name}`, W / 2, bY + 18);

    ctx.font = "600 11px 'Rajdhani', sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`AMENAZAS DETECTADAS: ${zombies.length} MUTANTES  •  SARGENTO ZAMO EN POSICIÓN TÁCTICA`, W / 2, bY + 33);
    ctx.restore();
  }

  function drawPortalWarpCinematic() {
    // Ondas gravitacionales concéntricas expansivas
    const pulseRatio = portalWarpTimer / PORTAL_WARP_DURATION;
    ctx.save();
    for (let r = 20; r < 140; r += 28) {
      const currentR = (r + portalWarpTimer * 3.2) % 150;
      ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0, 0.7 - currentR / 150)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(exitPortal.x, exitPortal.y, currentR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Destello de energía que transiciona a la pantalla de victoria
    if (pulseRatio > 0.7) {
      const flashAlpha = (pulseRatio - 0.7) / 0.3;
      ctx.fillStyle = `rgba(56, 189, 248, ${flashAlpha * 0.75})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  function drawPauseScreen() {
    ctx.fillStyle = "rgba(6, 10, 18, 0.88)";
    ctx.fillRect(0, 0, W, H);

    const mW = 700;
    const mH = 450;
    const mX = W / 2 - mW / 2;
    const mY = H / 2 - mH / 2;

    ctx.fillStyle = "rgba(10, 16, 28, 0.96)";
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(mX, mY, mW, mH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 24px 'Trebuchet MS', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⏸ JUEGO EN PAUSA // CONTROLES", W / 2, mY + 42);

    ctx.textAlign = "left";
    ctx.font = "bold 14px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#facc15";
    ctx.fillText("TECLADO + MOUSE", mX + 28, mY + 78);
    ctx.fillText("MANDO", mX + 260, mY + 78);
    ctx.fillText("CELULAR", mX + 490, mY + 78);
    ctx.font = "600 12px 'Trebuchet MS', sans-serif";
    ctx.fillStyle = "#cbd5e1";
    const controlRows = [
      ["WASD / Flechas: mover", "Stick izq.: mover", "Joystick izq.: mover"],
      ["Mouse: apuntar", "Stick der.: apuntar", "Autoapuntado / botón AUTO"],
      ["Clic: disparar", "RT/RB: disparar", "Botón DISPARO"],
      ["Shift: correr", "L3: correr", "Botón CORRER"],
      ["Espacio: dash", "A/Cruz: dash", "Botón DASH"],
      ["R: recargar | Q: arma", "X/Cuadrado: recargar", "Botón RECARGA / ARMA"]
    ];
    controlRows.forEach((row, index) => {
      const y = mY + 104 + index * 24;
      ctx.fillText(row[0], mX + 28, y);
      ctx.fillText(row[1], mX + 260, y);
      ctx.fillText(row[2], mX + 490, y);
    });

    // Botón Continuar
    const continueY = mY + mH - 105;
    ctx.fillStyle = pauseSelectedButton === 0 ? "#4ade80" : "#22c55e";
    ctx.strokeStyle = pauseSelectedButton === 0 ? "#f8fafc" : "transparent";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const pauseCenterX = mX + mW / 2;
    ctx.roundRect(pauseCenterX - 140, continueY, 280, 42, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#022c22";
    ctx.font = "bold 16px 'Trebuchet MS', sans-serif";
    ctx.fillText("CONTINUAR", pauseCenterX, continueY + 27);

    // Botón Reiniciar
    const restartY = mY + mH - 54;
    ctx.fillStyle = pauseSelectedButton === 1 ? "#fb7185" : "#ef4444";
    ctx.strokeStyle = pauseSelectedButton === 1 ? "#f8fafc" : "transparent";
    ctx.beginPath();
    ctx.roundRect(pauseCenterX - 140, restartY, 280, 42, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#450a0a";
    ctx.font = "bold 16px 'Trebuchet MS', sans-serif";
    ctx.fillText("REINICIAR SECTOR", pauseCenterX, restartY + 27);
  }

  function drawGameOverScreen() {
    ctx.fillStyle = "rgba(6, 10, 18, 0.94)";
    ctx.fillRect(0, 0, W, H);

    const mW = 480;
    const mH = 320;
    const mX = W / 2 - mW / 2;
    const mY = H / 2 - mH / 2;

    ctx.fillStyle = "rgba(10, 16, 28, 0.96)";
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.roundRect(mX, mY, mW, mH, 16);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 26px 'Rajdhani', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("💀 MISIÓN INTERRUMPIDA", W / 2, mY + 44);

    ctx.font = "600 13px 'Rajdhani', sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText("El Sargento Zamo ha caído bajo las garras de los mutantes.", W / 2, mY + 70);
    ctx.fillText(`Puntuación acumulada: ${score.toLocaleString()} PTS  •  Sector alcanzado: ${roundNumber}/5`, W / 2, mY + 92);

    // Botón 1: Reintentar sector actual (Checkpoint)
    const btn1Y = mY + 118;
    ctx.fillStyle = gameOverSelectedButton === 0 ? "#4ade80" : "#22c55e";
    ctx.strokeStyle = gameOverSelectedButton === 0 ? "#f8fafc" : "transparent";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(W / 2 - 150, btn1Y, 300, 42, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#022c22";
    ctx.font = "bold 14px 'Rajdhani', sans-serif";
    ctx.fillText(`REINTENTAR SECTOR ${roundNumber} (CHECKPOINT)`, W / 2, btn1Y + 26);

    // Botón 2: Reiniciar desde sector 1
    const btn2Y = btn1Y + 54;
    ctx.fillStyle = gameOverSelectedButton === 1 ? "#fb7185" : "#ef4444";
    ctx.strokeStyle = gameOverSelectedButton === 1 ? "#f8fafc" : "transparent";
    ctx.beginPath();
    ctx.roundRect(W / 2 - 150, btn2Y, 300, 42, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#450a0a";
    ctx.font = "bold 14px 'Rajdhani', sans-serif";
    ctx.fillText("REINICIAR DESDE SECTOR 1", W / 2, btn2Y + 26);

    ctx.font = "500 11px 'Rajdhani', sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText("Progreso guardado automáticamente por puntos de control", W / 2, mY + mH - 14);
  }

  // -------------------------------------------------------------
  // BUCLE PRINCIPAL DEL JUEGO (DELTA-TIME NORMALIZADO)
  // -------------------------------------------------------------
  function gameLoop(now) {
    requestAnimationFrame(gameLoop);

    const rawDt = (now - lastTime) / (1000 / 60);
    const dt = Math.min(2.0, Math.max(0.1, isNaN(rawDt) ? 1.0 : rawDt));
    lastTime = now;
    gameTime += dt * 0.016;
    ecgPhase += dt * 0.2;

    if (gameState !== previousGameState) {
      previousGameState = gameState;
      modalAnim = 0;
    } else if (modalAnim < 20) {
      modalAnim += dt;
    }

    // Actualizar lectura de mandos cada frame
    updateGamepad(dt);

    if (gameState === "PLAYING" || gameState === "SECTOR_ENTER" || gameState === "PORTAL_WARP") {
      player.update(dt);
      exitPortal.update(dt);

      for (let i = bullets.length - 1; i >= 0; i--) bullets[i].update(dt);
      for (let i = acidBullets.length - 1; i >= 0; i--) acidBullets[i].update(dt);
      for (let i = zombies.length - 1; i >= 0; i--) zombies[i].update(dt);
      for (let i = acidPuddles.length - 1; i >= 0; i--) {
        acidPuddles[i].update(dt);
        if (acidPuddles[i].life <= 0) acidPuddles.splice(i, 1);
      }
      for (let i = shellCasings.length - 1; i >= 0; i--) {
        shellCasings[i].update(dt);
        if (shellCasings[i].life <= 0) shellCasings.splice(i, 1);
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(dt);
        if (particles[i].life <= 0) particles.splice(i, 1);
      }
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].update(dt);
        if (floatingTexts[i].life <= 0) floatingTexts.splice(i, 1);
      }
      for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
        muzzleFlashes[i].life -= dt;
        if (muzzleFlashes[i].life <= 0) muzzleFlashes.splice(i, 1);
      }

      if (bannerMessage) {
        bannerMessage.life -= dt;
      }

      if (gameState === "PLAYING") {
        updateCollisions(dt);
      } else if (gameState === "PORTAL_WARP") {
        portalWarpTimer += dt;
        player.x += (exitPortal.x - player.x) * 0.09 * dt;
        player.y += (exitPortal.y - player.y) * 0.09 * dt;
        player.angle += 0.22 * dt;
        if (Math.random() < 0.75) {
          const a = Math.random() * Math.PI * 2;
          const r = 15 + Math.random() * 35;
          particles.push(new Particle(exitPortal.x + Math.cos(a) * r, exitPortal.y + Math.sin(a) * r, -Math.cos(a) * 2.5, -Math.sin(a) * 2.5, "#38bdf8", 22, 3));
        }
        if (portalWarpTimer >= PORTAL_WARP_DURATION) {
          triggerRoundVictory();
        }
      } else if (gameState === "SECTOR_ENTER") {
        sectorEnterTimer += dt;
        if (player.x < 150) {
          player.x += 2.0 * dt;
          player.walkCycle += 0.25 * dt;
          if (Math.random() < 0.25) {
            particles.push(new Particle(player.x - 14, player.y + 10, -1, (Math.random() - 0.5) * 2, "#94a3b8", 14, 2));
          }
        }
        player.angle = 0;
        if (sectorEnterTimer >= SECTOR_ENTER_DURATION) {
          gameState = "PLAYING";
        }
      }

      if (cameraShake > 0) cameraShake = Math.max(0, cameraShake - 0.35 * dt);
    }

    // -----------------------------------------------------------
    // RENDERIZADO DEL MUNDO
    // -----------------------------------------------------------
    ctx.save();

    if (cameraShake > 0) {
      const sx = (Math.random() - 0.5) * cameraShake * 2;
      const sy = (Math.random() - 0.5) * cameraShake * 2;
      ctx.translate(sx, sy);
    }

    // 1. Suelo y arquitectura del laboratorio
    drawLabFloor();

    // 2. Calcomanías (manchas de sangre)
    bloodSplats.forEach((b) => b.draw());

    // 3. Charcos de ácido corrosivo
    acidPuddles.forEach((ap) => ap.draw());

    // 4. Casquillos de proyectiles
    shellCasings.forEach((sc) => sc.draw());

    // 5. Cajas de munición táctica
    ammoPickups.forEach((ap) => ap.draw());

    // 6. Portal de evacuación
    exitPortal.draw();

    // 7. Zombis mutantes
    zombies.forEach((z) => z.draw());

    // 8. Sargento Zamo (Cocodrilo Comando)
    player.draw();

    // 9. Destellos de disparo
    muzzleFlashes.forEach((mf) => {
      ctx.save();
      ctx.fillStyle = mf.color || "#fef08a";
      ctx.shadowColor = mf.color || "#facc15";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(mf.x, mf.y, mf.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 10. Proyectiles
    bullets.forEach((b) => b.draw());
    acidBullets.forEach((ab) => ab.draw());

    // 11. Partículas
    particles.forEach((p) => p.draw());

    // 12. Textos flotantes
    floatingTexts.forEach((ft) => ft.draw());

    ctx.restore();

    // -----------------------------------------------------------
    // CAPA DE INTERFAZ Y MODALES
    // -----------------------------------------------------------
    if (gameState === "PLAYING") {
      drawHUD();
    } else if (gameState === "SECTOR_ENTER") {
      drawHUD();
      drawSectorEnterCinematic();
    } else if (gameState === "PORTAL_WARP") {
      drawHUD();
      drawPortalWarpCinematic();
    } else if (gameState === "STORY") {
      drawStoryScreen();
    } else if (gameState === "PAUSED") {
      drawHUD();
      drawPauseScreen();
    } else if (gameState === "ROUND_OVER") {
      drawRoundOverScreen();
    } else if (gameState === "GAME_OVER") {
      drawGameOverScreen();
    } else if (gameState === "VICTORY_TOTAL") {
      drawVictoryTotalScreen();
    }
  }

  // Arrancar el bucle de animación
  requestAnimationFrame(gameLoop);
})();
