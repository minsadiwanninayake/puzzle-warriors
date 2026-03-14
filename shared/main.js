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

  btn.addEventListener('mouseenter', () => EventBus.emit('sfx:play', { name: 'hover' }));
  btn.addEventListener('click', () => EventBus.emit('sfx:toggle'));

  document.body.appendChild(btn);

  EventBus.on('sfx:toggled', ({ enabled }) => {
    btn.innerHTML     = enabled ? '🔊' : '🔇';
    btn.style.opacity = enabled ? '1'  : '0.4';
  });
})();

// ── M key shortcut to mute/unmute ────────────────────
// ✅ FIX: Skip when user is typing in any input/textarea/select
//    — otherwise typing "m" or "M" in a form field mutes the BGM.
document.addEventListener('keydown', e => {
  if (e.key !== 'm' && e.key !== 'M') return;
  const tag = document.activeElement && document.activeElement.tagName;
  const isEditable = document.activeElement && document.activeElement.isContentEditable;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) return;
  EventBus.emit('sfx:toggle');
});

// ── First user click: unlock Web Audio + start BGM ───
// Pages that self-manage BGM set window.PW_SELF_BGM = true
// before main.js loads to opt out of the global bgStart.
document.addEventListener('click', function _unlockAudio() {
  EventBus.emit('sfx:preload');
  if (!window.PW_SELF_BGM) {
    EventBus.emit('sfx:bgStart');
  }
  document.removeEventListener('click', _unlockAudio);
}, { once: true });

console.log('%c⚔ Puzzle Warriors ready!', 'color:#00d4ff;font-weight:bold;font-size:14px');