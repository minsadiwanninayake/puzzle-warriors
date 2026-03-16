// sfx.js — handles all sound effects and background music for the game

const SFX = (function () {

  // current Web Audio context
  let audioCtx    = null;
  // true = sound on, false = muted
  let sfxEnabled  = true;
  // stops init() running more than once
  let initialized = false;
  // HTML Audio element for the background music MP3
  let bgAudio     = null;
  // tracks whether background music has been started
  let bgStarted   = false;

  // prevents the mute button from toggling twice if clicked rapidly
  let _lastToggleTime = 0;
  const TOGGLE_DEBOUNCE_MS = 500;

  // ── Web Audio Context ───────────────────

  // Sound API
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

  // ── Tone generator ────────────────────────────────────

  // plays a musical tone using an oscillator — freq=pitch, type=waveform shape, duration=seconds
  function playTone(freq, type, duration, volume, delay) {
    if (!sfxEnabled || !ensureCtx()) return;
    try {
      const osc  = audioCtx.createOscillator(); // generates the waveform
      const gain = audioCtx.createGain();        // controls volume
      const t    = audioCtx.currentTime + (delay || 0);
      // connect: oscillator → gain → speakers
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      // start at given volume then fade to silence
      gain.gain.setValueAtTime(volume || 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch (e) {}
  }

  // ── Noise generator ───────────────────────────────────

  // plays white noise — used for hit, wrong answer and explosion sounds
  function playNoise(duration, volume, delay) {
    if (!sfxEnabled || !ensureCtx()) return;
    try {
      // fill a buffer with random data to create noise
      const len    = Math.floor(audioCtx.sampleRate * duration);
      const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data   = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
      const src  = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();
      const t    = audioCtx.currentTime + (delay || 0);
      // connect: buffer → gain → speakers
      src.buffer = buffer;
      src.connect(gain);
      gain.connect(audioCtx.destination);
      // fade out over the duration
      gain.gain.setValueAtTime(volume || 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      src.start(t);
    } catch (e) {}
  }

  // ── Sound effect definitions ──────────────────────────

  const sounds = {
    // short click for button presses
    click:      () => { playTone(800,'square',0.08,0.15); },
    // soft hover sound for mouse-over
    hover:      () => { playTone(600,'sine',0.05,0.06); },
    // low buzz for errors and invalid actions
    error:      () => { playTone(180,'square',0.2,0.25); playNoise(0.2,0.1,0.1); },
    // two quick tones for page transitions
    transition: () => { playTone(440,'sine',0.08,0.2); playTone(550,'sine',0.08,0.2,0.06); },
    // silent tone just to warm up the AudioContext
    preload:    () => { playTone(1,'sine',0.01,0.001); },
    // rising 3-note chord for a correct answer (C E G)
    correct:    () => { playTone(523,'sine',0.12,0.3); playTone(659,'sine',0.12,0.3,0.1); playTone(784,'sine',0.18,0.3,0.2); },
    // low sawtooth tone and noise for a wrong answer
    wrong:      () => { playTone(200,'sawtooth',0.15,0.2); playNoise(0.15,0.15,0.05); },
    // low thud for hitting the enemy
    hit:        () => { playTone(150,'sawtooth',0.1,0.3); playNoise(0.1,0.2); },
    // heavier thud for when the player takes damage
    playerHit:  () => { playTone(120,'square',0.15,0.35); playNoise(0.15,0.25); },
    // two quick high tones for the ninja dodge
    dodge:      () => { playTone(900,'sine',0.07,0.15); playTone(1100,'sine',0.07,0.15,0.06); },
    // three rising tones for a combo activation
    combo:      () => { playTone(880,'sine',0.08,0.3); playTone(1100,'sine',0.08,0.3,0.07); playTone(1320,'sine',0.12,0.3,0.14); },
    // sharp high tones and noise for a critical hit
    crit:       () => { playTone(1200,'square',0.06,0.4); playTone(1500,'square',0.1,0.4,0.06); playNoise(0.08,0.15,0.05); },
    // low alarm tone for when the timer runs out
    timeout:    () => { playTone(300,'sawtooth',0.3,0.25); playNoise(0.2,0.1,0.1); },
    // four rising tones for battle victory
    victory:    () => { playTone(523,'sine',0.15,0.4); playTone(659,'sine',0.15,0.4,0.15); playTone(784,'sine',0.15,0.4,0.30); playTone(1047,'sine',0.30,0.4,0.45); },
    // four falling sawtooth tones for battle defeat
    defeat:     () => { playTone(392,'sawtooth',0.2,0.3); playTone(330,'sawtooth',0.2,0.3,0.2); playTone(262,'sawtooth',0.35,0.3,0.4); },
  };

  // ── Play a named sound ────────────────────────────────

  // looks up a sound by name and plays it — does nothing if muted
  function play(name) {
    if (!sfxEnabled) return;
    const fn = sounds[name];
    if (fn) try { fn(); } catch (e) {}
  }

  // ── Background music ──────────────────────────────────

  // creates the HTML Audio element for the MP3 file — only runs once
  function _initBgAudio() {
    if (bgAudio) return;
    bgAudio         = new Audio('shared/battle.mp3');
    bgAudio.loop    = true;   // loop forever
    bgAudio.volume  = 0.5;    // 50% volume so it does not drown out SFX
    bgAudio.preload = 'auto'; // start loading the file immediately
  }

  // starts playing the background music after a user gesture
  function startBackground() {
    _initBgAudio();
    bgStarted = true;
    if (sfxEnabled) {
      bgAudio.play().catch(e => console.warn('[SFX] BGMusic blocked:', e));
    }
  }

  // stops the background music and rewinds it to the beginning
  function stopBackground() {
    if (!bgAudio) return;
    bgAudio.pause();
    bgAudio.currentTime = 0;
    bgStarted = false;
  }

  // ── Mute toggle ───────────────────────────────────────

  // flips sound on or off — debounced to ignore rapid double calls
  function toggle() {
    const now = Date.now();
    // ignore if called again within 500ms of the last toggle
    if (now - _lastToggleTime < TOGGLE_DEBOUNCE_MS) {
      console.warn('[SFX] toggle debounced — ignoring.');
      return;
    }
    _lastToggleTime = now;

    sfxEnabled = !sfxEnabled;

    if (!sfxEnabled) {
      // muting — pause background music
      if (bgAudio) bgAudio.pause();
    } else {
      // unmuting — resume background music and play a click to confirm
      if (bgStarted && bgAudio) bgAudio.play().catch(() => {});
      play('click');
    }

    // notify the rest of the app so the mute button icon updates
    EventBus.emit('sfx:toggled', { enabled: sfxEnabled });
  }

  // returns true if currently muted
  function isMuted() { return !sfxEnabled; }

  // ── Init ──────────────────────────────────────────────

  // registers all EventBus listeners — called once from main.js on page load
  function init() {
    if (initialized) return;
    initialized = true;
    EventBus.on('sfx:play',    d  => play(d.name));      // play a sound by name
    EventBus.on('sfx:toggle',  () => toggle());           // mute or unmute
    EventBus.on('sfx:preload', () => play('preload'));    // warm up AudioContext
    EventBus.on('sfx:bgStart', () => startBackground()); // start background music
    EventBus.on('sfx:bgStop',  () => stopBackground());  // stop background music
  }

  // expose only what other modules need — everything else stays private
  return { init, play, toggle, startBackground, stopBackground, isMuted };

})();