// ═══════════════════════════════════════════════════════
// eventBus.js  —  Central Event Bus (Event-Driven Core)
// Modules never call each other — they only emit/listen.
// ═══════════════════════════════════════════════════════
const EventBus = (function () {
  const _map = {};
  return {
    on(ev, fn)   { (_map[ev] || (_map[ev] = [])).push(fn); },
    off(ev, fn)  { if (_map[ev]) _map[ev] = _map[ev].filter(f => f !== fn); },
    emit(ev, d)  { (_map[ev] || []).forEach(fn => { try { fn(d || {}); } catch(e) { console.error('[Bus]', ev, e); } }); },
    debug()      { console.log(_map); }
  };
})();