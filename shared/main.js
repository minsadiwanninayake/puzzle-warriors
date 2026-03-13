// main.js — Application Bootstrap
// Runs on every page. Initialises shared modules and
// wires the global mute button + keyboard shortcut.
// Follows event-driven pattern: uses EventBus only,
// never reaches into other modules directly.

// ── Starfield (only on pages that have #stars) ────────
(function () {
  const container = document.getElementById('stars');
  if (!container) return;
  for (let i = 0; i < 80; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.cssText = [
      `left:${Math.random() * 100}%`,
      `top:${Math.random() * 100}%`,
      `--d:${2 + Math.random() * 4}s`,
      `opacity:${0.2 + Math.random() * 0.7}`
    ].join(';');
    container.appendChild(star);
  }
})();

// ── Initialise shared modules ─────────────────────────
SFX.init();
UI.init();

if (typeof BattleEngine !== 'undefined') BattleEngine.init();

// ── Global mute button (injected on every page) ───────
(function () {
  const btn = document.createElement('button');
  btn.id    = 'mute-btn';
  btn.title = 'Toggle Sound  [M]';
  btn.innerHTML = '🔊';
  btn.style.cssText = [
    'position:fixed', 'bottom:16px', 'right:16px', 'z-index:9999',
    'background:#12121c', 'border:2px solid #ffd60a44',
    'color:#ffd60a', 'font-size:18px',
    'width:44px', 'height:44px', 'border-radius:50%',
    'cursor:pointer', 'transition:all .2s'
  ].join(';');

  // Hover plays a subtle SFX
  btn.addEventListener('mouseenter', () => EventBus.emit('sfx:play', { name: 'hover' }));

  // Click toggles sound via EventBus (low coupling — button never calls SFX directly)
  btn.addEventListener('click', () => EventBus.emit('sfx:toggle'));

  document.body.appendChild(btn);

  // React to sfx:toggled event emitted by SFX module
  EventBus.on('sfx:toggled', ({ enabled }) => {
    btn.innerHTML     = enabled ? '🔊' : '🔇';
    btn.style.opacity = enabled ? '1'  : '0.4';
  });
})();

// ── M key shortcut to mute/unmute ────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'm' || e.key === 'M') EventBus.emit('sfx:toggle');
});

// ── First user click: unlock Web Audio + start BGM ───
// Browsers block audio until a user gesture has occurred.
// We listen for the very first click, start the music,
// then remove the listener so it never fires again.
document.addEventListener('click', function _unlockAudio() {
  EventBus.emit('sfx:preload');   // warms up the AudioContext
  EventBus.emit('sfx:bgStart');   // starts battle.mp3
  document.removeEventListener('click', _unlockAudio);
}, { once: true });

console.log('%c⚔ Puzzle Warriors ready!', 'color:#00d4ff;font-weight:bold;font-size:14px');