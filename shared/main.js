// ═══════════════════════════════════════════════════════
// main.js  —  Application Bootstrap
// Runs on every page. Inits shared modules.
// ═══════════════════════════════════════════════════════

// ── Starfield ─────────────────────────────────────────
(function() {
  var c = document.getElementById('stars');
  if (!c) return;
  for (var i = 0; i < 80; i++) {
    var s = document.createElement('div');
    s.className = 'star';
    s.style.cssText = 'left:' + (Math.random()*100) + '%;top:' + (Math.random()*100) + '%;--d:' + (2+Math.random()*4) + 's;opacity:' + (0.2+Math.random()*0.7);
    c.appendChild(s);
  }
})();

// ── Init shared modules ────────────────────────────────
SFX.init();            // sound engine (always)
UI.init();             // wire UI events

// BattleEngine is only needed on battle page
if (typeof BattleEngine !== 'undefined') {
  BattleEngine.init();
}

// ── Mute button (every page) ───────────────────────────
(function() {
  var btn = document.createElement('button');
  btn.id = 'mute-btn';
  btn.innerHTML = '🔊';
  btn.title = 'Toggle Sound (M)';
  btn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:9999;background:#12121c;border:2px solid #ffd60a44;color:#ffd60a;font-size:18px;width:44px;height:44px;border-radius:50%;cursor:pointer;transition:all .2s;';
  btn.onmouseenter = function() { EventBus.emit('sfx:play', { name: 'hover' }); };
  btn.onclick      = function() { EventBus.emit('sfx:toggle'); };
  document.body.appendChild(btn);
  EventBus.on('sfx:toggled', function(d) {
    btn.innerHTML    = d.enabled ? '🔊' : '🔇';
    btn.style.opacity = d.enabled ? '1' : '0.4';
  });
})();

// ── M key to mute ─────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (e.key === 'm' || e.key === 'M') EventBus.emit('sfx:toggle');
});

// ── First click unlocks Web Audio on iOS/Safari ───────
document.addEventListener('click', function handler() {
  EventBus.emit('sfx:preload');
  document.removeEventListener('click', handler);
}, { once: true });

console.log('%c⚔ Puzzle Warriors ready!', 'color:#00d4ff;font-weight:bold;font-size:14px');