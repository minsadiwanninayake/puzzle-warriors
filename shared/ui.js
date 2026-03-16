// ═══════════════════════════════════════════════════════
// ui.js  —  UI Renderer  (High Cohesion)
// Multi-page version — safe to load on every page.
// Only activates battle/page-specific listeners when
// the relevant elements are present.
// ═══════════════════════════════════════════════════════
const UI = (function () {

  function el(id) { return document.getElementById(id); }

  // ── Toast ────────────────────────────────────────────
  var toastTimer = null;
  function showToast(msg) {
    var t = el('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { t.classList.remove('show'); }, 2600);
  }

  // ── Battle log ───────────────────────────────────────
  var logTimer = null;
  function showBattleLog(msg) {
    var t = el('battle-log');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(logTimer);
    logTimer = setTimeout(function() { t.classList.remove('show'); }, 1800);
  }

  // ── Fighter animation ────────────────────────────────
  function animateFighter(who, anim) {
    var sprite = el(who === 'player' ? 'player-sprite' : 'enemy-sprite');
    if (!sprite) return;
    sprite.classList.remove('attacking', 'hurt');
    void sprite.offsetWidth;
    sprite.classList.add(anim);
    setTimeout(function() { sprite.classList.remove(anim); }, 400);
  }

  // ── HP bars ──────────────────────────────────────────
  function updatePlayerHP(hp, maxHP) {
    var pct = Math.max(0, Math.min(100, (hp / maxHP) * 100));
    var bar = el('player-hp-bar');
    var num = el('player-hp-num');
    if (bar) bar.style.width = pct + '%';
    if (num) num.textContent = hp;
  }

  function updateEnemyHP(hp) {
    var MAX_HP = State.getConstants().MAX_HP;
    var pct = Math.max(0, Math.min(100, (hp / MAX_HP) * 100));
    var bar = el('enemy-hp-bar');
    var num = el('enemy-hp-num');
    if (bar) bar.style.width = pct + '%';
    if (num) num.textContent = hp;
  }

  // ── Timer ─────────────────────────────────────────────
  function initTimer(seconds) {
    var bar = el('timer-bar');
    var num = el('timer-num');
    if (!bar || !num) return;
    bar.style.transition = 'none';
    bar.style.width = '100%';
    num.textContent = seconds;
    num.classList.remove('warning');
    setTimeout(function() {
      bar.style.transition = 'width ' + seconds + 's linear';
      bar.style.width = '0%';
    }, 50);
  }

  function tickTimer(seconds) {
    var num = el('timer-num');
    if (!num) return;
    num.textContent = seconds;
    if (seconds <= 5) num.classList.add('warning');
  }

  // ── Digit buttons ────────────────────────────────────
  function renderDigitButtons(disabled) {
    var wrap = el('puzzle-options');
    if (!wrap) return;
    wrap.innerHTML = [0,1,2,3,4,5,6,7,8,9].map(function(n) {
      return '<button class="option-btn" id="opt-' + n + '" onclick="EventBus.emit(\'battle:doAnswer\',{digit:' + n + '})" ' + (disabled ? 'disabled' : '') + '>' + n + '</button>';
    }).join('');
  }

  function highlightAnswer(digit, solution, correct) {
    document.querySelectorAll('.option-btn').forEach(function(b) { b.disabled = true; });
    var solEl = el('opt-' + solution);
    if (solEl) solEl.classList.add('correct');
    if (!correct) {
      var wrongEl = el('opt-' + digit);
      if (wrongEl) wrongEl.classList.add('wrong');
    }
  }

  function highlightTimeout(solution) {
    document.querySelectorAll('.option-btn').forEach(function(b) { b.disabled = true; });
    if (solution !== null && solution !== undefined) {
      var solEl = el('opt-' + solution);
      if (solEl) solEl.classList.add('correct');
    }
  }

  // ── Action badge ──────────────────────────────────────
  function setActionBadge(action) {
    var badge = el('action-badge');
    if (!badge) return;
    badge.className = 'action-type-badge ' + action;
    badge.textContent = action === 'attack' ? '⚔ ATTACK' : '🛡 DEFEND';
  }

  // ── Battle screen setup ───────────────────────────────
  function onBattleStarted(data) {
    var battle  = data.battle;
    var warrior = data.warrior;
    var user    = State.getUser();

    var pName = el('battle-player-name'); if (pName) pName.textContent = (user ? user.username : 'PLAYER').toUpperCase();
    var eName = el('battle-enemy-name');  if (eName) eName.textContent = battle.enemyName.toUpperCase();
    var eSpr  = el('enemy-sprite');       if (eSpr)  eSpr.textContent  = battle.enemySprite;
    var pSpr  = el('player-sprite');      if (pSpr)  pSpr.textContent  = warrior.emoji;
    var pBar  = el('player-hp-bar');      if (pBar)  pBar.style.width  = '100%';
    var eBar  = el('enemy-hp-bar');       if (eBar)  eBar.style.width  = '100%';
    var eNum  = el('enemy-hp-num');       if (eNum)  eNum.textContent  = battle.enemyHP;

    var pHpWrap = document.querySelector('.combatant .hp-text');
    if (pHpWrap) {
      pHpWrap.innerHTML = '<span class="current" id="player-hp-num">' + battle.playerHP + '</span> / ' + battle.maxPlayerHP + ' HP';
    }
    renderDigitButtons(true);
  }

  // ── Puzzle states ─────────────────────────────────────
  function onPuzzleLoading() {
    var img  = el('puzzle-img');
    var load = el('puzzle-loading');
    var err  = el('api-error');
    if (img)  img.style.display  = 'none';
    if (load) { load.style.display = 'block'; load.textContent = 'LOADING PUZZLE...'; }
    if (err)  err.style.display  = 'none';
    renderDigitButtons(true);
  }

  function onPuzzleLoaded(data) {
    var puzzle = data.puzzle;
    var img    = el('puzzle-img');
    var load   = el('puzzle-loading');
    if (!img) return;
    img.onload  = function() { if (load) load.style.display = 'none'; img.style.display = 'block'; };
    img.onerror = function() { if (load) load.textContent = '🖼 Image failed to load'; };
    img.src = puzzle.imageUrl;
    renderDigitButtons(false);
  }

  function onPuzzleError(data) {
    var load = el('puzzle-loading');
    var err  = el('api-error');
    if (load) load.style.display = 'none';
    if (err)  { err.style.display = 'block'; err.textContent = '⚠ API unavailable. Retrying... (' + data.message + ')'; }
  }

  // ── Menu ──────────────────────────────────────────────
  function refreshMenu() {
    var user = State.getUser();
    if (!user) return;
    var nameEl   = el('menu-username');
    var winsEl   = el('stat-wins');
    var lossesEl = el('stat-losses');
    if (nameEl)   nameEl.textContent   = user.username.toUpperCase();
    if (winsEl)   winsEl.textContent   = user.wins   || 0;
    if (lossesEl) lossesEl.textContent = user.losses || 0;
    API.getMe().then(function(r) {
      if (r.ok && r.data.user) {
        State.setUser(r.data.user);
        if (winsEl)   winsEl.textContent   = r.data.user.wins   || 0;
        if (lossesEl) lossesEl.textContent = r.data.user.losses || 0;
      }
    }).catch(function() {});
  }

  // ── Leaderboard ───────────────────────────────────────
  function refreshLeaderboard() {
    var tbody = el('lb-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:30px;">LOADING...</td></tr>';
    API.getLeaderboard().then(function(r) {
      if (!r.ok || !r.data.leaderboard) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--fire);padding:20px;">Could not load leaderboard.</td></tr>';
        return;
      }
      var players = r.data.leaderboard;
      if (!players.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:30px;">No warriors yet. Be the first!</td></tr>';
        return;
      }
      var medals = ['🥇','🥈','🥉'];
      var me = State.getUser();
      tbody.innerHTML = players.map(function(u, i) {
        var rc   = i < 3 ? 'rank-' + (i+1) : '';
        var isMe = me && u.username === me.username;
        var rk   = i < 3 ? medals[i] : '#' + (i+1);
        return '<tr class="' + (isMe ? 'me' : '') + '"><td class="lb-rank ' + rc + '">' + rk + '</td><td>' + u.username + (isMe ? ' <span style="color:var(--gold)">(YOU)</span>' : '') + '</td><td class="lb-wins">' + (u.wins||0) + '</td><td style="color:var(--muted)">' + (u.losses||0) + '</td></tr>';
      }).join('');
    }).catch(function() {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--fire);padding:20px;">Server offline.</td></tr>';
    });
  }

  // ── Warrior select ────────────────────────────────────
  function onWarriorSelected(data) {
    var id = data.id;
    document.querySelectorAll('.warrior-card').forEach(function(c) { c.classList.remove('selected'); });
    var card = el('wcard-' + id);
    if (card) card.classList.add('selected');
    var w = State.getWarrior(id);
    var preview = el('warrior-preview');
    if (preview && w) preview.innerHTML = 'Selected: <span>' + w.emoji + ' ' + w.name + '</span> — ' + w.ability;
    var btn = el('btn-confirm-warrior');
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  }

  // 0-9, a-A, d-D, m-M
  function init() {
    // Toast works on every page
    EventBus.on('ui:toast', function(d) { showToast(d.message); });

    // Menu events
    EventBus.on('menu:refresh', function() { refreshMenu(); });

    // Leaderboard events
    EventBus.on('leaderboard:refresh', function() { refreshLeaderboard(); });

    // Warrior select
    EventBus.on('warrior:selected', onWarriorSelected);

    // Only wire battle events if battle page elements exist
    if (!el('puzzle-options')) return;

    EventBus.on('battle:started',       onBattleStarted);
    EventBus.on('battle:puzzleLoading', onPuzzleLoading);
    EventBus.on('battle:puzzleLoaded',  onPuzzleLoaded);
    EventBus.on('battle:puzzleError',   onPuzzleError);
    EventBus.on('battle:timerStart',    function(d) { initTimer(d.seconds); });
    EventBus.on('battle:timerTick',     function(d) { tickTimer(d.seconds); });
    EventBus.on('battle:answered',      function(d) { highlightAnswer(d.digit, d.solution, d.correct); });
    EventBus.on('battle:timeout',       function(d) { highlightTimeout(d.solution); showBattleLog("⏱ TIME'S UP!"); });
    EventBus.on('battle:actionChange',  function(d) {
      setActionBadge(d.action);
      showToast(d.action === 'attack' ? '⚔ Attack mode' : '🛡 Defend mode');
    });
    EventBus.on('battle:playerHit', function(d) {
      var maxHP = State.getBattle() ? State.getBattle().maxPlayerHP : 25;
      updatePlayerHP(d.hp, maxHP);
      animateFighter('player', 'hurt');
      if (d.fromEnemy) animateFighter('enemy', 'attacking');
    });
    EventBus.on('battle:enemyHit', function(d) {
      updateEnemyHP(d.hp);
      animateFighter('player', 'attacking');
      animateFighter('enemy', 'hurt');
    });
    EventBus.on('battle:dodge', function() { animateFighter('player', 'attacking'); });
    EventBus.on('battle:log',   function(d) { showBattleLog(d.message); });

    // ── Power-up button counts ──────────────────────────
    EventBus.on('battle:powerupsUpdate', function(d) {
      ['shield','rage','heal','freeze'].forEach(function(type) {
        var btn = el('pu-' + type);
        var cnt = el('pu-count-' + type);
        if (!btn || !cnt) return;
        var n = d.powerups[type] || 0;
        cnt.textContent = n;
        cnt.className   = 'pu-count' + (n === 0 ? ' zero' : '');
        btn.disabled    = (n === 0);
      });
    });

    // ── Heal flash on HP bar ────────────────────────────
    EventBus.on('battle:playerHeal', function(d) {
      var maxHP = State.getBattle() ? State.getBattle().maxPlayerHP : 25;
      var bar   = el('player-hp-bar');
      var num   = el('player-hp-num');
      if (bar) {
        bar.style.width = Math.min(100, (d.hp / maxHP) * 100) + '%';
        bar.classList.add('heal-flash');
        setTimeout(function() { bar.classList.remove('heal-flash'); }, 600);
      }
      if (num) num.textContent = d.hp;
    });
  }

  return { init: init, showToast: showToast };
})();