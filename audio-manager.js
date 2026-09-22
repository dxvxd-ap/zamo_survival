/**
 * Audio System para "Juego Zamo - Fuga del Laboratorio / Cocodrilo de Sistemas"
 * Implementado 100% con Web Audio API (procedural, sin dependencias externas, cero latencia).
 */

(function () {
  let audioCtx = null;
  let masterGain = null;
  let sfxGain = null;
  let bgmGain = null;

  let isMuted = false;
  let sfxEnabled = true;
  let bgmEnabled = true;
  let currentVolume = 0.7;

  let bgmInterval = null;
  let isBgmPlaying = false;
  let bgmStep = 0;
  let lastStepTime = 0;

  // Inicializar contexto de audio al primer clic/tecla
  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      sfxGain = audioCtx.createGain();
      sfxGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
      sfxGain.connect(masterGain);

      bgmGain = audioCtx.createGain();
      bgmGain.gain.setValueAtTime(0.35, audioCtx.currentTime);
      bgmGain.connect(masterGain);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Desbloqueo por interacción del usuario
  function unlockAudio() {
    initAudio();
    if (bgmEnabled && !isBgmPlaying) {
      startBGM();
    }
  }

  window.addEventListener('click', unlockAudio, { once: false });
  window.addEventListener('keydown', unlockAudio, { once: false });

  // -------------------------------------------------------------
  // EFECTOS DE SONIDO (SFX) SINTETIZADOS
  // -------------------------------------------------------------

  function createNoiseBuffer(duration = 0.5) {
    if (!audioCtx) return null;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // 1. Disparo de Escopeta potente
  function playShotgun() {
    if (!sfxEnabled) return;
    initAudio();
    const t = audioCtx.currentTime;

    // Cuerpo de impacto grave (Low punch)
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.28);
    oscGain.gain.setValueAtTime(1.2, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(oscGain);
    oscGain.connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.32);

    // Explosión de ruido (Blast)
    const noiseBuffer = createNoiseBuffer(0.4);
    if (noiseBuffer) {
      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, t);
      filter.frequency.exponentialRampToValueAtTime(120, t + 0.38);

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(1.0, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(sfxGain);
      noise.start(t);
      noise.stop(t + 0.4);
    }
  }

  // 2. Ametralladora / Ráfaga
  function playMachinegun() {
    if (!sfxEnabled) return;
    initAudio();
    const t = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.09);
    oscGain.gain.setValueAtTime(0.8, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
    osc.connect(oscGain);
    oscGain.connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);

    const noiseBuffer = createNoiseBuffer(0.08);
    if (noiseBuffer) {
      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.7, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      noise.connect(noiseGain);
      noiseGain.connect(sfxGain);
      noise.start(t);
      noise.stop(t + 0.09);
    }
  }

  // 3. Salto retro energético
  function playJump() {
    if (!sfxEnabled) return;
    initAudio();
    const t = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(460, t + 0.16);

    oscGain.gain.setValueAtTime(0.35, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(oscGain);
    oscGain.connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // 4. Recoger arma / Regalo del Cocodrilo (Campanillas arpegiadas)
  function playPowerup() {
    if (!sfxEnabled) return;
    initAudio();
    const t = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const noteTime = t + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.4, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.25);

      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(noteTime);
      osc.stop(noteTime + 0.28);
    });
  }

  // 5. Recarga mecánica de arma (Clic-clac)
  function playReload() {
    if (!sfxEnabled) return;
    initAudio();
    const t = audioCtx.currentTime;

    [0, 0.12].forEach((offset, idx) => {
      const noiseBuffer = createNoiseBuffer(0.05);
      if (noiseBuffer) {
        const noise = audioCtx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(idx === 0 ? 3200 : 4400, t + offset);
        filter.Q.setValueAtTime(5, t + offset);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.6, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.06);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(sfxGain);
        noise.start(t + offset);
        noise.stop(t + offset + 0.07);
      }
    });
  }

  // 6. Alarma de Laboratorio / Escape
  function playAlert() {
    if (!sfxEnabled) return;
    initAudio();
    const t = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.linearRampToValueAtTime(950, t + 0.2);
    osc.frequency.linearRampToValueAtTime(700, t + 0.4);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);

    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  // 7. Victoria / Nivel Completado (Fanfarria triunfal)
  function playVictory() {
    if (!sfxEnabled) return;
    initAudio();
    const t = audioCtx.currentTime;
    // C5, G4, C5, E5, G5, C6 (sostenido)
    const melody = [
      { f: 523.25, d: 0.12, t: 0 },
      { f: 392.00, d: 0.12, t: 0.14 },
      { f: 523.25, d: 0.12, t: 0.28 },
      { f: 659.25, d: 0.15, t: 0.42 },
      { f: 783.99, d: 0.25, t: 0.60 },
      { f: 1046.5, d: 0.80, t: 0.88 }
    ];

    melody.forEach((note) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const startTime = t + note.t;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, startTime);

      gain.gain.setValueAtTime(0.5, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d);

      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(startTime);
      osc.stop(startTime + note.d + 0.05);
    });
  }

  // 8. Pasos sutiles (Footsteps)
  function playFootstep() {
    if (!sfxEnabled) return;
    initAudio();
    const now = performance.now();
    if (now - lastStepTime < 240) return; // Throttle para realismo
    lastStepTime = now;

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110 + Math.random() * 20, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.07);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // 9. Golpe / Impacto
  function playHit() {
    if (!sfxEnabled) return;
    initAudio();
    const t = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.18);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  // 10. Escupitajo de Ácido Zombi (Siseo cáustico y burbujeante)
  function playAcidSpit() {
    if (!sfxEnabled) return;
    initAudio();
    const t = audioCtx.currentTime;

    // Pop inicial
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
    osc.connect(oscGain);
    oscGain.connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);

    // Siseo tóxico de ruido
    const noiseBuffer = createNoiseBuffer(0.25);
    if (noiseBuffer) {
      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2800, t);
      filter.frequency.exponentialRampToValueAtTime(900, t + 0.22);
      filter.Q.setValueAtTime(6, t);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.24);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(sfxGain);
      noise.start(t);
      noise.stop(t + 0.25);
    }
  }

  // 11. Gruñido Zombi Mutante
  function playZombieGroan() {
    if (!sfxEnabled) return;
    initAudio();
    const t = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, t);
    osc.frequency.linearRampToValueAtTime(55, t + 0.35);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  // 12. Salpicadura de Ácido en Suelo
  function playAcidSplash() {
    if (!sfxEnabled) return;
    initAudio();
    const t = audioCtx.currentTime;

    const noiseBuffer = createNoiseBuffer(0.2);
    if (noiseBuffer) {
      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, t);
      filter.Q.setValueAtTime(4, t);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(sfxGain);
      noise.start(t);
      noise.stop(t + 0.22);
    }
  }

  // -------------------------------------------------------------
  // MÚSICA DE FONDO (BGM) SYNTHWAVE / RETRO ACTION PROCEDURAL
  // -------------------------------------------------------------

  function playSynthKick(t) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(bgmGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  function playSynthSnare(t) {
    const noiseBuffer = createNoiseBuffer(0.15);
    if (noiseBuffer) {
      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, t);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(bgmGain);
      noise.start(t);
      noise.stop(t + 0.16);
    }
  }

  function playSynthHiHat(t) {
    const noiseBuffer = createNoiseBuffer(0.05);
    if (noiseBuffer) {
      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, t);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(bgmGain);
      noise.start(t);
      noise.stop(t + 0.06);
    }
  }

  function playSynthBass(t, freq) {
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.12);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(bgmGain);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  function playSynthArp(t, freq) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(bgmGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  // 16 pasos por compás, 125 BPM -> cada paso = (60 / 125) / 4 = 0.12 segundos
  const STEP_TIME = 0.12;
  const bassNotes = [
    // Compás 1 & 2: Mi menor (E1 = 41.2Hz)
    41.2, 41.2, 82.4, 41.2, 41.2, 41.2, 82.4, 41.2,
    41.2, 41.2, 82.4, 41.2, 41.2, 41.2, 98.0, 82.4,
    // Compás 3: Do (C1 = 32.7Hz)
    32.7, 32.7, 65.4, 32.7, 32.7, 32.7, 65.4, 32.7,
    // Compás 4: Re (D1 = 36.7Hz)
    36.7, 36.7, 73.4, 36.7, 36.7, 36.7, 73.4, 82.4
  ];

  const arpNotes = [
    164.8, 196.0, 246.9, 329.6, 246.9, 196.0, 329.6, 392.0,
    164.8, 196.0, 246.9, 329.6, 392.0, 493.8, 392.0, 329.6,
    130.8, 164.8, 196.0, 261.6, 196.0, 164.8, 261.6, 329.6,
    146.8, 185.0, 220.0, 293.6, 220.0, 185.0, 293.6, 329.6
  ];

  function tickBGM() {
    if (!isBgmPlaying || !bgmEnabled || !audioCtx) return;
    const t = audioCtx.currentTime + 0.05;

    const totalSteps = bassNotes.length;
    const stepInPattern = bgmStep % totalSteps;
    const beat16 = bgmStep % 16;

    // Batería
    if (beat16 === 0 || beat16 === 8) {
      playSynthKick(t);
    }
    if (beat16 === 4 || beat16 === 12) {
      playSynthSnare(t);
    }
    if (beat16 % 2 === 1) {
      playSynthHiHat(t);
    }

    // Bajo
    playSynthBass(t, bassNotes[stepInPattern]);

    // Arpegio sci-fi
    playSynthArp(t, arpNotes[stepInPattern]);

    bgmStep++;
  }

  function startBGM() {
    if (isBgmPlaying) return;
    initAudio();
    isBgmPlaying = true;
    bgmStep = 0;
    bgmInterval = setInterval(tickBGM, STEP_TIME * 1000);
    updateUI();
  }

  function stopBGM() {
    if (!isBgmPlaying) return;
    isBgmPlaying = false;
    if (bgmInterval) {
      clearInterval(bgmInterval);
      bgmInterval = null;
    }
    updateUI();
  }

  // -------------------------------------------------------------
  // ESCUCHA DE TECLADO, RATÓN Y CONSOLA UNITY
  // -------------------------------------------------------------

  function setupInputListeners() {
    const canvas = document.querySelector("#unity-canvas");

    if (canvas) {
      // Prevenir menú contextual en clic derecho para disparo secundario
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Teclado
    window.addEventListener('keydown', (e) => {
      // Ignorar si el usuario está escribiendo en un input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      const code = e.code;
      if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
        playJump();
      } else if (['KeyA', 'KeyD', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(code)) {
        playFootstep();
      } else if (code === 'KeyR') {
        playReload();
      } else if (code === 'KeyE') {
        playPowerup();
      } else if (code === 'KeyF') {
        playAlert();
      }
    });

    // Interceptar mensajes de consola de Unity para reaccionar a eventos del juego
    const origLog = console.log;
    console.log = function (...args) {
      origLog.apply(console, args);
      try {
        const text = args.join(' ').toLowerCase();
        if (text.includes('cocodrilo') || text.includes('escopeta') || text.includes('arma')) {
          playPowerup();
        } else if (text.includes('escape') || text.includes('laboratorio') || text.includes('alerta')) {
          playAlert();
        } else if (text.includes('completado') || text.includes('victoria') || text.includes('ganaste')) {
          playVictory();
        } else if (text.includes('muerte') || text.includes('daño') || text.includes('damage') || text.includes('game over')) {
          playHit();
        }
      } catch (err) {}
    };
  }

  // -------------------------------------------------------------
  // PANEL DE CONTROL FLOTANTE (AUDIO HUD)
  // -------------------------------------------------------------

  function buildAudioHUD() {
    const hud = document.createElement('div');
    hud.id = 'zamo-audio-hud';
    hud.innerHTML = `
      <style>
        #zamo-audio-hud {
          position: fixed;
          bottom: 14px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 99999;
          background: rgba(18, 22, 34, 0.88);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(0, 230, 255, 0.35);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 230, 255, 0.2);
          border-radius: 12px;
          padding: 8px 16px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #e2e8f0;
          display: flex;
          align-items: center;
          gap: 12px;
          user-select: none;
          transition: all 0.3s ease;
        }
        #zamo-audio-hud.minimized .hud-content {
          display: none;
        }
        .hud-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          font-size: 13px;
          color: #38bdf8;
          text-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
        }
        .hud-badge span.pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px #22c55e;
          display: inline-block;
          animation: hudPulse 1.5s infinite;
        }
        @keyframes hudPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        .hud-content {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .hud-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #f1f5f9;
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .hud-btn:hover {
          background: rgba(0, 230, 255, 0.25);
          border-color: #38bdf8;
          color: #fff;
          transform: translateY(-1px);
        }
        .hud-btn.active {
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.4), rgba(59, 130, 246, 0.5));
          border-color: #38bdf8;
          color: #fff;
        }
        .hud-volume {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }
        .hud-volume input[type="range"] {
          width: 70px;
          accent-color: #38bdf8;
          cursor: pointer;
        }
        .hud-test-popup {
          position: absolute;
          bottom: 50px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid #38bdf8;
          border-radius: 10px;
          padding: 10px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.7);
          display: none;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          width: 320px;
        }
        .hud-test-popup.visible {
          display: grid;
        }
        .hud-test-btn {
          font-size: 11px;
          padding: 6px 4px;
          text-align: center;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          color: #e2e8f0;
          cursor: pointer;
        }
        .hud-test-btn:hover {
          background: rgba(56, 189, 248, 0.3);
          border-color: #38bdf8;
        }
      </style>

      <div class="hud-badge">
        <span class="pulse-dot"></span>
        <span>SOUND FX</span>
      </div>

      <div class="hud-content">
        <button id="btn-toggle-bgm" class="hud-btn active" title="Activar/Desactivar Música de fondo">
          🎵 Música: ON
        </button>
        <button id="btn-toggle-sfx" class="hud-btn active" title="Activar/Desactivar Efectos de sonido">
          💥 SFX: ON
        </button>

        <div class="hud-volume">
          <span>🔊</span>
          <input type="range" id="vol-slider" min="0" max="1" step="0.05" value="${currentVolume}">
        </div>

        <button id="btn-sound-test" class="hud-btn" title="Probar cada sonido individual">
          🧪 Probar Sonidos
        </button>
      </div>

      <div id="test-popup" class="hud-test-popup">
        <button class="hud-test-btn" data-sound="shotgun">🔫 Escopeta</button>
        <button class="hud-test-btn" data-sound="machinegun">⚡ Ametralladora</button>
        <button class="hud-test-btn" data-sound="jump">🦘 Salto</button>
        <button class="hud-test-btn" data-sound="reload">⚙️ Recarga</button>
        <button class="hud-test-btn" data-sound="powerup">🐊 Cocodrilo</button>
        <button class="hud-test-btn" data-sound="alert">🚨 Alarma Escape</button>
        <button class="hud-test-btn" data-sound="victory">🏆 Victoria</button>
        <button class="hud-test-btn" data-sound="hit">💥 Daño</button>
        <button class="hud-test-btn" data-sound="footstep">👟 Paso</button>
      </div>
    `;

    document.body.appendChild(hud);

    // Eventos UI
    const btnBgm = document.querySelector('#btn-toggle-bgm');
    const btnSfx = document.querySelector('#btn-toggle-sfx');
    const volSlider = document.querySelector('#vol-slider');
    const btnTest = document.querySelector('#btn-sound-test');
    const testPopup = document.querySelector('#test-popup');

    btnBgm.onclick = () => {
      bgmEnabled = !bgmEnabled;
      if (bgmEnabled) {
        startBGM();
      } else {
        stopBGM();
      }
      btnBgm.textContent = bgmEnabled ? '🎵 Música: ON' : '🎵 Música: OFF';
      btnBgm.classList.toggle('active', bgmEnabled);
    };

    btnSfx.onclick = () => {
      sfxEnabled = !sfxEnabled;
      btnSfx.textContent = sfxEnabled ? '💥 SFX: ON' : '💥 SFX: OFF';
      btnSfx.classList.toggle('active', sfxEnabled);
    };

    volSlider.oninput = (e) => {
      currentVolume = parseFloat(e.target.value);
      if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
      }
    };

    btnTest.onclick = (e) => {
      e.stopPropagation();
      testPopup.classList.toggle('visible');
    };

    document.addEventListener('click', (e) => {
      if (!testPopup.contains(e.target) && e.target !== btnTest) {
        testPopup.classList.remove('visible');
      }
    });

    testPopup.querySelectorAll('.hud-test-btn').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const snd = btn.getAttribute('data-sound');
        if (snd === 'shotgun') playShotgun();
        else if (snd === 'machinegun') playMachinegun();
        else if (snd === 'jump') playJump();
        else if (snd === 'reload') playReload();
        else if (snd === 'powerup') playPowerup();
        else if (snd === 'alert') playAlert();
        else if (snd === 'victory') playVictory();
        else if (snd === 'hit') playHit();
        else if (snd === 'footstep') playFootstep();
      };
    });
  }

  function updateUI() {
    const btnBgm = document.querySelector('#btn-toggle-bgm');
    if (btnBgm) {
      btnBgm.textContent = bgmEnabled ? '🎵 Música: ON' : '🎵 Música: OFF';
      btnBgm.classList.toggle('active', bgmEnabled);
    }
  }

  // Iniciar al cargar el DOM
  window.addEventListener('DOMContentLoaded', () => {
    buildAudioHUD();
    setupInputListeners();
  });

  // Exponer API globalmente por si Unity o scripts externos quieren invocar sonidos
  window.ZamoAudio = {
    playShotgun,
    playMachinegun,
    playJump,
    playPowerup,
    playReload,
    playAlert,
    playVictory,
    playHit,
    playFootstep,
    playAcidSpit,
    playZombieGroan,
    playAcidSplash,
    startBGM,
    stopBGM,
    setVolume: (v) => {
      currentVolume = v;
      if (masterGain && audioCtx) masterGain.gain.setValueAtTime(v, audioCtx.currentTime);
    }
  };
})();
