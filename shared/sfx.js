// ═══════════════════════════════════════════════════════
// sfx.js  —  Sound Effects Engine (Web Audio API)
// Generates all sounds procedurally — no audio files needed.
// ═══════════════════════════════════════════════════════
const SFX = (function () {

  let ctx = null;
  let enabled = true;
  let initialized = false;

  function ensureCtx() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      return true;
    } catch (e) {
      console.warn('[SFX] Web Audio not supported:', e);
      return false;
    }
  }

  function playTone(freq, type, duration, volume, delay) {
    if (!enabled || !ensureCtx()) return;
    try {
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + (delay || 0));
      gain.gain.setValueAtTime(volume || 0.3, ctx.currentTime + (delay || 0));
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (delay || 0) + duration);
      osc.start(ctx.currentTime + (delay || 0));
      osc.stop(ctx.currentTime  + (delay || 0) + duration + 0.05);
    } catch(e) {}
  }

  function playNoise(duration, volume, delay) {
    if (!enabled || !ensureCtx()) return;
    try {
      var bufLen  = Math.floor(ctx.sampleRate * duration);
      var buffer  = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      var data    = buffer.getChannelData(0);
      for (var i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
      var src  = ctx.createBufferSource();
      var gain = ctx.createGain();
      src.buffer = buffer;
      src.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(volume || 0.2, ctx.currentTime + (delay || 0));
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (delay || 0) + duration);
      src.start(ctx.currentTime + (delay || 0));
    } catch(e) {}
  }

  var sounds = {
    click:      function() { playTone(800, 'square', 0.08, 0.15); },
    hover:      function() { playTone(600, 'sine',   0.05, 0.06); },
    correct:    function() { playTone(523,'sine',0.12,0.3); playTone(659,'sine',0.12,0.3,0.1); playTone(784,'sine',0.18,0.3,0.2); },
    wrong:      function() { playTone(200,'sawtooth',0.15,0.2); playNoise(0.15,0.15,0.05); },
    error:      function() { playTone(180,'square',0.2,0.25); playNoise(0.2,0.1,0.1); },
    hit:        function() { playTone(150,'sawtooth',0.1,0.3); playNoise(0.1,0.2); },
    playerHit:  function() { playTone(120,'square',0.15,0.35); playNoise(0.15,0.25); },
    dodge:      function() { playTone(900,'sine',0.07,0.15); playTone(1100,'sine',0.07,0.15,0.06); },
    victory:    function() { playTone(523,'sine',0.15,0.4); playTone(659,'sine',0.15,0.4,0.15); playTone(784,'sine',0.15,0.4,0.30); playTone(1047,'sine',0.30,0.4,0.45); },
    defeat:     function() { playTone(392,'sawtooth',0.2,0.3); playTone(330,'sawtooth',0.2,0.3,0.2); playTone(262,'sawtooth',0.35,0.3,0.4); },
    transition: function() { playTone(440,'sine',0.08,0.2); playTone(550,'sine',0.08,0.2,0.06); },
    combo:      function() { playTone(880,'sine',0.08,0.3); playTone(1100,'sine',0.08,0.3,0.07); playTone(1320,'sine',0.12,0.3,0.14); },
    crit:       function() { playTone(1200,'square',0.06,0.4); playTone(1500,'square',0.1,0.4,0.06); playNoise(0.08,0.15,0.05); },
    timeout:    function() { playTone(300,'sawtooth',0.3,0.25); playNoise(0.2,0.1,0.1); },
    preload:    function() { playTone(1,'sine',0.01,0.001); }
  };

  function play(name) {
    if (!enabled) return;
    var fn = sounds[name];
    if (fn) { try { fn(); } catch(e) {} }
  }

  function toggle() {
    enabled = !enabled;
    EventBus.emit('sfx:toggled', { enabled: enabled });
    if (enabled) play('click');
  }

  function init() {
    if (initialized) return;
    initialized = true;
    EventBus.on('sfx:play',    function(d) { play(d.name); });
    EventBus.on('sfx:toggle',  function()  { toggle(); });
    EventBus.on('sfx:preload', function()  { play('preload'); });
  }

  return { init: init, play: play, toggle: toggle };
})();