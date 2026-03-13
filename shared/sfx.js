// sfx.js — Sound Effects & Background Music Engine
// Responsibilities: procedural SFX + MP3 background music
// Communicates exclusively via EventBus (event-driven, low coupling)

const SFX = (function () {

  // --- State ---
  let audioCtx    = null;
  let sfxEnabled  = true;
  let initialized = false;
  let bgAudio     = null;
  let bgStarted   = false;

  // ── Web Audio Context (lazy, resumes on use) ──────────

  function ensureCtx() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return true;
    }
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      return true;
    } catch (e) {
      console.warn('[SFX] Web Audio API not supported:', e);
      return false;
    }
  }

  // ── Procedural tone generator ─────────────────────────

  function playTone(freq, type, duration, volume, delay) {
    if (!sfxEnabled || !ensureCtx()) return;
    try {
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const t    = audioCtx.currentTime + (delay || 0);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(volume || 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch (e) {}
  }

  // ── Procedural noise generator ────────────────────────

  function playNoise(duration, volume, delay) {
    if (!sfxEnabled || !ensureCtx()) return;
    try {
      const len    = Math.floor(audioCtx.sampleRate * duration);
      const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data   = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
      const src  = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();
      const t    = audioCtx.currentTime + (delay || 0);
      src.buffer = buffer;
      src.connect(gain);
      gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(volume || 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      src.start(t);
    } catch (e) {}
  }

  // ── Sound effect definitions ──────────────────────────

  const sounds = {
    click:      () => { playTone(800,'square',0.08,0.15); },
    hover:      () => { playTone(600,'sine',0.05,0.06); },
    correct:    () => { playTone(523,'sine',0.12,0.3); playTone(659,'sine',0.12,0.3,0.1); playTone(784,'sine',0.18,0.3,0.2); },
    wrong:      () => { playTone(200,'sawtooth',0.15,0.2); playNoise(0.15,0.15,0.05); },
    error:      () => { playTone(180,'square',0.2,0.25); playNoise(0.2,0.1,0.1); },
    hit:        () => { playTone(150,'sawtooth',0.1,0.3); playNoise(0.1,0.2); },
    playerHit:  () => { playTone(120,'square',0.15,0.35); playNoise(0.15,0.25); },
    dodge:      () => { playTone(900,'sine',0.07,0.15); playTone(1100,'sine',0.07,0.15,0.06); },
    victory:    () => { playTone(523,'sine',0.15,0.4); playTone(659,'sine',0.15,0.4,0.15); playTone(784,'sine',0.15,0.4,0.30); playTone(1047,'sine',0.30,0.4,0.45); },
    defeat:     () => { playTone(392,'sawtooth',0.2,0.3); playTone(330,'sawtooth',0.2,0.3,0.2); playTone(262,'sawtooth',0.35,0.3,0.4); },
    transition: () => { playTone(440,'sine',0.08,0.2); playTone(550,'sine',0.08,0.2,0.06); },
    combo:      () => { playTone(880,'sine',0.08,0.3); playTone(1100,'sine',0.08,0.3,0.07); playTone(1320,'sine',0.12,0.3,0.14); },
    crit:       () => { playTone(1200,'square',0.06,0.4); playTone(1500,'square',0.1,0.4,0.06); playNoise(0.08,0.15,0.05); },
    timeout:    () => { playTone(300,'sawtooth',0.3,0.25); playNoise(0.2,0.1,0.1); },
    preload:    () => { playTone(1,'sine',0.01,0.001); },
  };

  // ── Play a named sound effect ─────────────────────────

  function play(name) {
    if (!sfxEnabled) return;
    const fn = sounds[name];
    if (fn) try { fn(); } catch (e) {}
  }

  // ── Background music — plays shared/battle.mp3 ────────

  function _initBgAudio() {
    if (bgAudio) return;
    bgAudio         = new Audio('shared/battle.mp3');
    bgAudio.loop    = true;
    bgAudio.volume  = 0.5;
    bgAudio.preload = 'auto';
  }

  // Start music — must be called after a user gesture
  function startBackground() {
    _initBgAudio();
    bgStarted = true;
    if (sfxEnabled) {
      bgAudio.play().catch(e => console.warn('[SFX] BGMusic blocked:', e));
    }
  }

  // Stop and reset music
  function stopBackground() {
    if (!bgAudio) return;
    bgAudio.pause();
    bgAudio.currentTime = 0;
    bgStarted = false;
  }

  // ── Toggle all sound on/off ───────────────────────────
  // Emits 'sfx:toggled' so the UI button can update itself

  function toggle() {
    sfxEnabled = !sfxEnabled;
    if (!sfxEnabled) {
      if (bgAudio) bgAudio.pause();
    } else {
      if (bgStarted && bgAudio) bgAudio.play().catch(() => {});
      play('click');
    }
    EventBus.emit('sfx:toggled', { enabled: sfxEnabled });
  }

  // ── Subscribe to EventBus events (called once on boot) ─

  function init() {
    if (initialized) return;
    initialized = true;
    EventBus.on('sfx:play',    d  => play(d.name));
    EventBus.on('sfx:toggle',  () => toggle());
    EventBus.on('sfx:preload', () => play('preload'));
    EventBus.on('sfx:bgStart', () => startBackground());
    EventBus.on('sfx:bgStop',  () => stopBackground());
  }

  // ── Public API ────────────────────────────────────────

  return { init, play, toggle, startBackground, stopBackground };

})();