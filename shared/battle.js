// ═══════════════════════════════════════════════════════
// battle.js  —  Battle Engine + Coin Rewards  (FIXED v2)
// FIX: Inventory is READ not wiped. Items consumed on use.
// ═══════════════════════════════════════════════════════
const BattleEngine = (function () {

  var battle  = null;
  var timer   = null;
  var running = false;

  var ENEMIES = [
    { name:'DARK MAGE',   sprite:'👹', hp:25 },
    { name:'CYBER ORC',   sprite:'👾', hp:25 },
    { name:'VOID KNIGHT', sprite:'🤖', hp:25 },
    { name:'NEON WITCH',  sprite:'🧟', hp:25 },
    { name:'GLITCH BOSS', sprite:'💀', hp:30 },
  ];

  var COINS = {
    correctAnswer: 5,
    comboBonus:    10,
    winBase:       50,
    winEasy:       0,
    winNormal:     20,
    winHard:       50,
  };

  // ── Read inventory (DO NOT wipe it) ──────────────────
  function readInv() {
    try {
      var stored = JSON.parse(localStorage.getItem('pw_inventory') || '{}');
      return {
        shield: stored.shield || 0,
        rage:   stored.rage   || 0,
        heal:   stored.heal   || 0,
        freeze: stored.freeze || 0,
      };
    } catch(e) {
      return { shield:0, rage:0, heal:0, freeze:0 };
    }
  }

  // ── Write inventory back after consuming ─────────────
  function writeInv(inv) {
    localStorage.setItem('pw_inventory', JSON.stringify(inv));
  }

  // ── Start ─────────────────────────────────────────────
  function start(data) {
    var difficulty = (data && data.difficulty) || sessionStorage.getItem('pw_difficulty') || 'normal';
    var warrior    = State.getSelectedWarrior();
    var enemy      = ENEMIES[Math.floor(Math.random() * ENEMIES.length)];
    var timeLimit  = State.getDifficulty(difficulty);
    var maxHP      = warrior.hp || 25;

    // READ inventory — do NOT wipe it here
    var inv = readInv();

    battle = {
      difficulty, warrior,
      enemyName:    enemy.name,
      enemySprite:  enemy.sprite,
      playerHP:     maxHP,
      maxPlayerHP:  maxHP,
      enemyHP:      enemy.hp,
      maxEnemyHP:   enemy.hp,
      action:       'attack',
      combo:        0,
      maxCombo:     0,
      correct:      0,
      wrong:        0,
      round:        0,
      timeLimit,
      puzzle:       null,
      startTime:    Date.now(),
      coinsEarned:  0,
      // Copy inventory into battle state
      powerups:     { shield: inv.shield, rage: inv.rage, heal: inv.heal, freeze: inv.freeze },
      shieldActive: false,
      rageActive:   false,
      freezeActive: false,
    };

    State.setBattle(battle);
    running = true;

    EventBus.emit('battle:started',        { battle, warrior });
    EventBus.emit('battle:powerupsUpdate', { powerups: battle.powerups });
    EventBus.emit('sfx:play', { name: 'transition' });
    loadNextPuzzle();
  }

  // ── Load puzzle ───────────────────────────────────────
  function loadNextPuzzle() {
    if (!running) return;
    battle.puzzle = null;
    battle.round++;
    EventBus.emit('battle:puzzleLoading');

    API.getPuzzle()
      .then(function(r) {
        if (!running) return;
        if (!r.ok || !r.data || r.data.question === undefined) {
          EventBus.emit('battle:puzzleError', { message: r.data ? r.data.message : 'Unknown error' });
          setTimeout(loadNextPuzzle, 3000);
          return;
        }
        battle.puzzle = { imageUrl: r.data.question, solution: r.data.solution };
        State.updateBattle({ puzzle: battle.puzzle, round: battle.round });
        EventBus.emit('battle:puzzleLoaded', { puzzle: battle.puzzle });
        startRoundTimer();
      })
      .catch(function(e) {
        if (!running) return;
        EventBus.emit('battle:puzzleError', { message: e.message });
        setTimeout(loadNextPuzzle, 3000);
      });
  }

  // ── Timer ─────────────────────────────────────────────
  function startRoundTimer() {
    clearInterval(timer);
    var seconds = battle.timeLimit;
    EventBus.emit('battle:timerStart', { seconds });
    timer = setInterval(function() {
      if (!running) { clearInterval(timer); return; }
      seconds--;
      EventBus.emit('battle:timerTick', { seconds });
      if (seconds <= 0) { clearInterval(timer); handleTimeout(); }
    }, 1000);
  }

  // ── Timeout ───────────────────────────────────────────
  function handleTimeout() {
    if (!running) return;
    battle.combo = 0;
    var solution = battle.puzzle ? battle.puzzle.solution : null;
    EventBus.emit('battle:timeout', { solution });
    EventBus.emit('sfx:play', { name: 'timeout' });

    if (battle.shieldActive) {
      battle.shieldActive = false;
      EventBus.emit('battle:log', { message: '🛡 IRON SHIELD blocked the timeout hit!' });
      setTimeout(loadNextPuzzle, 1200);
      return;
    }

    var dmg = State.getConstants().DAMAGE;
    if (battle.action === 'defend') dmg = Math.floor(dmg / 2);

    if (battle.warrior.dodgeChance && Math.random() < battle.warrior.dodgeChance) {
      EventBus.emit('battle:dodge');
      EventBus.emit('sfx:play', { name: 'dodge' });
      EventBus.emit('battle:log', { message: '🥷 SHADOW DODGE! Timeout evaded!' });
    } else {
      battle.playerHP = Math.max(0, battle.playerHP - dmg);
      State.updateBattle({ playerHP: battle.playerHP, combo: 0 });
      EventBus.emit('battle:playerHit', { hp: battle.playerHP, damage: dmg, fromEnemy: true });
      EventBus.emit('sfx:play', { name: 'playerHit' });
      EventBus.emit('battle:log', { message: '⏱ TIME UP! Enemy attacks for ' + dmg + ' damage!' });
    }

    if (battle.playerHP <= 0) { endBattle(false); return; }
    setTimeout(loadNextPuzzle, 1200);
  }

  // ── Answer ────────────────────────────────────────────
  function doAnswer(data) {
    if (!running || !battle.puzzle) return;
    clearInterval(timer);
    var correct = (data.digit === battle.puzzle.solution);
    EventBus.emit('battle:answered', { digit: data.digit, solution: battle.puzzle.solution, correct });

    if (correct) {
      battle.correct++; battle.combo++;
      if (battle.combo > battle.maxCombo) battle.maxCombo = battle.combo;
      EventBus.emit('sfx:play', { name: 'correct' });
      earnCoins(COINS.correctAnswer, '+' + COINS.correctAnswer + ' 🪙');
      if (battle.combo >= 3) earnCoins(COINS.comboBonus, 'COMBO BONUS +' + COINS.comboBonus + ' 🪙');
      handleCorrectAnswer();
    } else {
      battle.wrong++; battle.combo = 0;
      EventBus.emit('sfx:play', { name: 'wrong' });
      handleWrongAnswer();
    }
    State.updateBattle({ correct: battle.correct, wrong: battle.wrong, combo: battle.combo });
  }

  // ── Earn coins ────────────────────────────────────────
  function earnCoins(amount, msg) {
    battle.coinsEarned += amount;
    var current  = parseInt(localStorage.getItem('pw_coins') || '0', 10);
    var newTotal = current + amount;
    localStorage.setItem('pw_coins', newTotal.toString());
    EventBus.emit('battle:coinsEarned', { amount, total: newTotal, msg });
  }

  // ── Correct answer ────────────────────────────────────
  function handleCorrectAnswer() {
    var dmg     = State.getConstants().DAMAGE;
    var warrior = battle.warrior;
    var combo   = battle.combo;
    var isCrit  = false;

    if (battle.action === 'attack') {
      if (warrior.rageMode && battle.playerHP <= 10) {
        dmg *= 2; isCrit = true;
        EventBus.emit('battle:log', { message: '🪓 BLOOD RAGE! Double damage!' });
        EventBus.emit('sfx:play',   { name: 'crit' });
      }
      if (battle.rageActive) {
        dmg *= 3; isCrit = true;
        battle.rageActive = false;
        EventBus.emit('battle:log',            { message: '🔥 FURY BOOST! Triple damage!' });
        EventBus.emit('sfx:play',              { name: 'crit' });
        EventBus.emit('battle:powerupsUpdate', { powerups: battle.powerups });
      }
      if (!isCrit && combo > 0 && combo % (warrior.comboCritAt || 3) === 0) {
        dmg *= (warrior.comboCritMult || 2); isCrit = true;
        EventBus.emit('sfx:play',   { name: 'crit' });
        EventBus.emit('battle:log', { message: '⚡ COMBO x' + combo + '! CRITICAL HIT! ×' + (warrior.comboCritMult||2) + '!' });
      }
      if (!isCrit && combo > 1) {
        EventBus.emit('sfx:play',   { name: 'combo' });
        EventBus.emit('battle:log', { message: '🔥 Combo x' + combo + '! Keep going!' });
      }

      battle.enemyHP = Math.max(0, battle.enemyHP - dmg);
      State.updateBattle({ enemyHP: battle.enemyHP });
      EventBus.emit('battle:enemyHit', { hp: battle.enemyHP, damage: dmg });
      if (!isCrit && combo <= 1) EventBus.emit('battle:log', { message: '⚔ Direct hit! -' + dmg + ' HP!' });
      if (battle.enemyHP <= 0) { endBattle(true); return; }
    } else {
      EventBus.emit('battle:log', { message: '🛡 Guard up! Damage blocked!' });
    }
    setTimeout(loadNextPuzzle, 1000);
  }

  // ── Wrong answer ──────────────────────────────────────
  function handleWrongAnswer() {
    var dmg = State.getConstants().DAMAGE;

    if (battle.shieldActive) {
      battle.shieldActive = false;
      EventBus.emit('battle:log', { message: '🛡 IRON SHIELD absorbed the hit!' });
      setTimeout(loadNextPuzzle, 1000);
      return;
    }

    if (battle.action === 'attack') {
      if (battle.freezeActive) {
        battle.freezeActive = false;
        EventBus.emit('battle:log', { message: '❄️ Enemy is FROZEN — no counter-attack!' });
        setTimeout(loadNextPuzzle, 1000);
        return;
      }
      if (battle.warrior.dodgeChance && Math.random() < battle.warrior.dodgeChance) {
        EventBus.emit('battle:dodge');
        EventBus.emit('sfx:play',   { name: 'dodge' });
        EventBus.emit('battle:log', { message: '🥷 SHADOW DODGE! Counter evaded!' });
        setTimeout(loadNextPuzzle, 1000);
        return;
      }
      battle.playerHP = Math.max(0, battle.playerHP - dmg);
      State.updateBattle({ playerHP: battle.playerHP });
      EventBus.emit('battle:playerHit', { hp: battle.playerHP, damage: dmg, fromEnemy: true });
      EventBus.emit('sfx:play',   { name: 'playerHit' });
      EventBus.emit('battle:log', { message: '❌ Miss! Counter-attack for ' + dmg + ' damage!' });
    } else {
      battle.playerHP = Math.max(0, battle.playerHP - dmg);
      State.updateBattle({ playerHP: battle.playerHP });
      EventBus.emit('battle:playerHit', { hp: battle.playerHP, damage: dmg, fromEnemy: true });
      EventBus.emit('sfx:play',   { name: 'playerHit' });
      EventBus.emit('battle:log', { message: '❌ Guard broken! -' + dmg + ' HP!' });
    }
    if (battle.playerHP <= 0) { endBattle(false); return; }
    setTimeout(loadNextPuzzle, 1000);
  }

  // ── Use power-up (consumes from localStorage too) ────
  function usePowerup(data) {
    var type = data.type;
    if (!battle) return;

    // Check battle state count
    if (!battle.powerups[type] || battle.powerups[type] <= 0) {
      EventBus.emit('ui:toast', { message: '❌ No ' + type + ' left! Buy more from shop.' });
      return;
    }

    // Consume from battle state AND localStorage
    battle.powerups[type]--;
    var inv = readInv();
    inv[type] = Math.max(0, (inv[type] || 0) - 1);
    writeInv(inv);

    EventBus.emit('sfx:play', { name: 'powerUp' });
    
    //new features
    if (type === 'shield') {
      battle.shieldActive = true;
      EventBus.emit('battle:log', { message: '🛡 IRON SHIELD activated! Next hit blocked!' });
      EventBus.emit('ui:toast',   { message: '🛡 Shield active!' });
    } else if (type === 'rage') {
      battle.rageActive = true;
      EventBus.emit('battle:log', { message: '🔥 FURY BOOST! Next correct attack = 3×!' });
      EventBus.emit('ui:toast',   { message: '🔥 Fury Boost ready!' });
    } else if (type === 'heal') {
      var healed = Math.min(8, battle.maxPlayerHP - battle.playerHP);
      battle.playerHP = Math.min(battle.maxPlayerHP, battle.playerHP + 8);
      State.updateBattle({ playerHP: battle.playerHP });
      EventBus.emit('battle:playerHeal', { hp: battle.playerHP, healed });
      EventBus.emit('battle:log', { message: '💚 HEALED for ' + healed + ' HP!' });
      EventBus.emit('ui:toast',   { message: '💚 +' + healed + ' HP!' });
    } else if (type === 'freeze') {
      battle.freezeActive = true;
      EventBus.emit('battle:log', { message: '❄️ ICE BLAST! Enemy frozen next wrong answer!' });
      EventBus.emit('ui:toast',   { message: '❄️ Enemy frozen!' });
    }

    State.updateBattle({ powerups: battle.powerups });
    EventBus.emit('battle:powerupsUpdate', { powerups: battle.powerups });
  }

  // ── Set action ────────────────────────────────────────
  function setAction(data) {
    if (!battle) return;
    battle.action = data.action;
    State.updateBattle({ action: data.action });
    EventBus.emit('battle:actionChange', { action: data.action });
    EventBus.emit('sfx:play', { name: 'click' });
  }

  // ── End battle ────────────────────────────────────────
  function endBattle(won) {
    running = false;
    clearInterval(timer);

    if (won) {
      var bonus = COINS.winBase;
      if      (battle.difficulty === 'hard')   bonus += COINS.winHard;
      else if (battle.difficulty === 'normal') bonus += COINS.winNormal;
      earnCoins(bonus, 'VICTORY BONUS +' + bonus + ' 🪙');
    }

    var stats = {
      won,
      correct:     battle.correct,
      wrong:       battle.wrong,
      maxCombo:    battle.maxCombo,
      playerHP:    battle.playerHP,
      enemyHP:     battle.enemyHP,
      rounds:      battle.round,
      duration:    Math.floor((Date.now() - battle.startTime) / 1000),
      difficulty:  battle.difficulty,
      enemyName:   battle.enemyName,
      coinsEarned: battle.coinsEarned,
      totalCoins:  parseInt(localStorage.getItem('pw_coins') || '0', 10),
    };

    API.postResult({
      result:     won ? 'win' : 'loss',
      difficulty: stats.difficulty,
      playerHP:   stats.playerHP,
      enemyHP:    stats.enemyHP,
      correct:    stats.correct,
      wrong:      stats.wrong,
      enemyName:  stats.enemyName,
      duration:   stats.duration,
    }).catch(function() {});

    EventBus.emit('sfx:play',   { name: won ? 'victory' : 'defeat' });
    EventBus.emit('battle:end', { won, stats });
    State.clearBattle();
  }

  // ── Init ──────────────────────────────────────────────
  function init() {
    EventBus.on('battle:start',       function(d) { start(d); });
    EventBus.on('battle:doAnswer',    function(d) { doAnswer(d); });
    EventBus.on('battle:doSetAction', function(d) { setAction(d); });
    EventBus.on('battle:usePowerup',  function(d) { usePowerup(d); });
  }

  return { init };
})();