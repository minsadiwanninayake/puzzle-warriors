// ═══════════════════════════════════════════════════════
// navigation.js  —  Multi-Page Router
// Uses window.location instead of showing/hiding screens
// ═══════════════════════════════════════════════════════
const Navigation = (function () {

  // Map screen names to actual HTML file paths
  const PAGES = {
    splash:      '../index.html',
    auth:        'auth.html',
    menu:        'menu.html',
    warrior:     'warrior-select.html',
    difficulty:  'difficulty.html',
    battle:      'battle.html',
    result:      'result.html',
    leaderboard: 'leaderboard.html',
    howto:       'howto.html',
  };

  function goto(screen) {
    const path = PAGES[screen];
    if (!path) { console.warn('[Nav] Unknown screen:', screen); return; }
    window.location.href = path;
  }

  function back() {
    window.history.back();
  }

  return { goto, back };
})();