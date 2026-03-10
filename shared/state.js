// ═══════════════════════════════════════════════════════
// state.js  —  Virtual Identity & Global State Store
// Uses localStorage and sessionStorage so state
// survives across multiple HTML pages.
// ═══════════════════════════════════════════════════════
const State = (function () {

  const WARRIORS = {
    mage:      { id:'mage',      name:'MAGE',      emoji:'🧙',  hp:25, comboCritMult:3, comboCritAt:3, ability:'Arcane Surge' },
    knight:    { id:'knight',    name:'KNIGHT',    emoji:'🛡️', hp:35, comboCritMult:2, comboCritAt:3, ability:'Iron Will' },
    archer:    { id:'archer',    name:'ARCHER',    emoji:'🏹',  hp:25, comboCritMult:2, comboCritAt:3, timeBonus:5, ability:'Swift Shot' },
    ninja:     { id:'ninja',     name:'NINJA',     emoji:'🥷',  hp:25, comboCritMult:2, comboCritAt:3, dodgeChance:0.30, ability:'Shadow Dodge' },
    berserker: { id:'berserker', name:'BERSERKER', emoji:'🪓',  hp:25, comboCritMult:2, comboCritAt:3, rageMode:true, ability:'Blood Rage' },
  };

  const DIFFICULTY = { easy:30, normal:20, hard:10 };
  const MAX_HP  = 25;
  const DAMAGE  = 5;

  // ── Warrior ───────────────────────────────────────────
  function getWarrior(id)        { return WARRIORS[id] || null; }
  function getAllWarriors()       { return WARRIORS; }
  function setSelectedWarrior(id){ sessionStorage.setItem('pw_warrior', id); }
  function getSelectedWarrior()  {
    const id = sessionStorage.getItem('pw_warrior') || 'mage';
    return WARRIORS[id] || WARRIORS.mage;
  }

  // ── Constants ─────────────────────────────────────────
  function getConstants()        { return { MAX_HP, DAMAGE }; }
  function getDifficulty(d)      { return DIFFICULTY[d] || 20; }

  // ── User / Auth ───────────────────────────────────────
  function getUser() {
    try { return JSON.parse(localStorage.getItem('pw_session')); }
    catch(e) { return null; }
  }
  function setUser(u) {
    if (u) localStorage.setItem('pw_session', JSON.stringify(u));
  }
  function saveToken(t)  { localStorage.setItem('pw_token', t); }
  function getToken()    { return localStorage.getItem('pw_token'); }
  function isLoggedIn()  { return !!(localStorage.getItem('pw_token') && getUser()); }
  function clearSession(){
    localStorage.removeItem('pw_token');
    localStorage.removeItem('pw_session');
    sessionStorage.removeItem('pw_warrior');
    sessionStorage.removeItem('pw_battle');
    sessionStorage.removeItem('pw_difficulty');
  }

  // ── Battle state ──────────────────────────────────────
  function getBattle() {
    try { return JSON.parse(sessionStorage.getItem('pw_battle')); }
    catch(e) { return null; }
  }
  function setBattle(b)      { sessionStorage.setItem('pw_battle', JSON.stringify(b)); }
  function updateBattle(patch) {
    const b = getBattle();
    if (b) setBattle(Object.assign(b, patch));
  }
  function clearBattle()     { sessionStorage.removeItem('pw_battle'); }

  return {
    getWarrior, getAllWarriors, setSelectedWarrior, getSelectedWarrior,
    getConstants, getDifficulty,
    getUser, setUser, saveToken, getToken, isLoggedIn, clearSession,
    getBattle, setBattle, updateBattle, clearBattle,
  };
})();