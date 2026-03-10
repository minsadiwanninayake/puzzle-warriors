// ═══════════════════════════════════════════════════════
// battle.js  —  Battle Engine (Game Logic)
// Handles all game state: rounds, HP, combos, timers.
// Communicates only via EventBus.
// ═══════════════════════════════════════════════════════
const BattleEngine = (function () {

  var battle   = null;
  var timer    = null;
  var running  = false;

  var ENEMIES = [
    { name:'DARK MAGE',   sprite:'👹', hp:25 },
    { name:'CYBER ORC',   sprite:'👾', hp:25 },
    { name:'VOID KNIGHT', sprite:'🤖', hp:25 },
    { name:'NEON WITCH',  sprite:'🧟', hp:25 },
    { name:'GLITCH BOSS', sprite:'💀', hp:30 },
  ];

  // ── Start a new battle ────────────────────────────────
  function start(data) {
    var difficulty = (data && data.difficulty) || sessionStorage.getItem('pw_difficulty') || 'normal';
    var warrior    = State.getSelectedWarrior();
    var enemy      = ENEMIES[Math.floor(Math.random() * ENEMIES.length)];
    var timeLimit  = State.getDifficulty(difficulty);
    var maxHP      = warrior.hp || 25;

    battle = {
      difficulty:  difficulty,
      warrior:     warrior,
      enemyName:   enemy.name,
      enemySprite: enemy.sprite,
      playerHP:    maxHP,
      maxPlayerHP: maxHP,
      enemyHP:     enemy.hp,
      maxEnemyHP:  enemy.hp,
      action:      'attack',
      combo:       0,
      correct:     0,
      wrong:       0,
      round:       0,
      timeLimit:   timeLimit,
      puzzle:      null,
      startTime:   Date.now(),
    };

    State.setBattle(battle);
    running = true;

    EventBus.emit('battle:started', { battle: battle, warrior: warrior });
    EventBus.emit('sfx:play', { name: 'transition' });

    loadNextPuzzle();
  }

  // ── Load puzzle from API ──────────────────────────────
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

  // ── Round timer ───────────────────────────────────────
  function startRoundTimer() {
    clearInterval(timer);
    var seconds = battle.timeLimit;
    EventBus.emit('battle:timerStart', { seconds: seconds });

    timer = setInterval(function() {
      if (!running) { clearInterval(timer); return; }
      seconds--;
      EventBus.emit('battle:timerTick', { seconds: seconds });
      if (seconds <= 0) {
        clearInterval(timer);
        handleTimeout();
      }
    }, 1000);
  }

  // ── Timeout: enemy attacks ────────────────────────────
  function handleTimeout() {
    if (!running) return;
    battle.combo = 0;
    var solution = battle.puzzle ? battle.puzzle.solution : null;
    EventBus.emit('battle:timeout', { solution: solution });
    EventBus.emit('sfx:play', { name: 'timeout' });

    // Enemy deals damage
    var dmg = State.getConstants().DAMAGE;
    if (battle.action === 'defend') dmg = Math.floor(dmg / 2);

    // Ninja dodge on timeout (30% chance)
    if (battle.warrior.dodgeChance && Math.random() < battle.warrior.dodgeChance) {
      EventBus.emit('battle:dodge');
      EventBus.emit('sfx:play', { name: 'dodge' });
      EventBus.emit('battle:log', { message: '🥷 SHADOW DODGE! Attack evaded!' });
    } else {
      battle.playerHP = Math.max(0, battle.playerHP - dmg);
      State.updateBattle({ playerHP: battle.playerHP, combo: 0 });
      EventBus.emit('battle:playerHit', { hp: battle.playerHP, damage: dmg, fromEnemy: true });
      EventBus.emit('sfx:play', { name: 'playerHit' });
      EventBus.emit('battle:log', { message: '⏱ TIME UP! Enemy attacks for ' + dmg + ' damage!' });
    }

    if (battle.playerHP <= 0) {
      endBattle(false);
      return;
    }

    setTimeout(loadNextPuzzle, 1200);
  }

  // ── Player answers ────────────────────────────────────
  function doAnswer(data) {
    if (!running || !battle.puzzle) return;
    clearInterval(timer);

    var digit    = data.digit;
    var solution = battle.puzzle.solution;
    var correct  = (digit === solution);

    EventBus.emit('battle:answered', { digit: digit, solution: solution, correct: correct });

    if (correct) {
      battle.correct++;
      battle.combo++;
      EventBus.emit('sfx:play', { name: 'correct' });
      handleCorrectAnswer();
    } else {
      battle.wrong++;
      battle.combo = 0;
      EventBus.emit('sfx:play', { name: 'wrong' });
      handleWrongAnswer();
    }

    State.updateBattle({ correct: battle.correct, wrong: battle.wrong, combo: battle.combo });
  }

  // ── Correct answer logic ──────────────────────────────
  function handleCorrectAnswer() {
    var dmg     = State.getConstants().DAMAGE;
    var warrior = battle.warrior;
    var combo   = battle.combo;
    var isCrit  = false;

    if (battle.action === 'attack') {
      // Berserker rage: double damage at low HP
      if (warrior.rageMode && battle.playerHP <= 10) {
        dmg *= 2;
        EventBus.emit('battle:log', { message: '🪓 BLOOD RAGE! Double damage!' });
        EventBus.emit('sfx:play', { name: 'crit' });
        isCrit = true;
      }
      // Archer time bonus
      if (warrior.timeBonus) {
        EventBus.emit('battle:log', { message: '🏹 SWIFT SHOT! +' + warrior.timeBonus + 's bonus!' });
      }
      // Combo crit
      if (!isCrit && combo > 0 && combo % (warrior.comboCritAt || 3) === 0) {
        dmg *= (warrior.comboCritMult || 2);
        EventBus.emit('sfx:play', { name: 'crit' });
        EventBus.emit('battle:log', { message: '⚡ COMBO x' + combo + '! CRITICAL HIT! ×' + (warrior.comboCritMult || 2) + ' damage!' });
        isCrit = true;
      }

      if (!isCrit && combo > 1) {
        EventBus.emit('sfx:play', { name: 'combo' });
        EventBus.emit('battle:log', { message: '🔥 Combo x' + combo + '! Keep going!' });
      }

      battle.enemyHP = Math.max(0, battle.enemyHP - dmg);
      State.updateBattle({ enemyHP: battle.enemyHP });
      EventBus.emit('battle:enemyHit', { hp: battle.enemyHP, damage: dmg });

      if (!isCrit && combo <= 1) {
        EventBus.emit('battle:log', { message: '⚔ Direct hit! -' + dmg + ' HP to enemy!' });
      }

      if (battle.enemyHP <= 0) {
        endBattle(true);
        return;
      }
    } else {
      // Defend: block next incoming damage (just notify)
      EventBus.emit('battle:log', { message: '🛡 Guard up! Damage blocked!' });
    }

    setTimeout(loadNextPuzzle, 1000);
  }

  // ── Wrong answer logic ────────────────────────────────
  function handleWrongAnswer() {
    if (battle.action === 'attack') {
      // Missed attack — enemy counter-attacks
      var dmg = State.getConstants().DAMAGE;

      // Ninja dodge on wrong answer
      if (battle.warrior.dodgeChance && Math.random() < battle.warrior.dodgeChance) {
        EventBus.emit('battle:dodge');
        EventBus.emit('sfx:play', { name: 'dodge' });
        EventBus.emit('battle:log', { message: '🥷 SHADOW DODGE! Counter evaded!' });
      } else {
        battle.playerHP = Math.max(0, battle.playerHP - dmg);
        State.updateBattle({ playerHP: battle.playerHP });
        EventBus.emit('battle:playerHit', { hp: battle.playerHP, damage: dmg, fromEnemy: true });
        EventBus.emit('sfx:play', { name: 'playerHit' });
        EventBus.emit('battle:log', { message: '❌ Miss! Counter-attack! -' + dmg + ' HP!' });
      }
    } else {
      // Failed defend — full damage
      var defDmg = State.getConstants().DAMAGE;
      battle.playerHP = Math.max(0, battle.playerHP - defDmg);
      State.updateBattle({ playerHP: battle.playerHP });
      EventBus.emit('battle:playerHit', { hp: battle.playerHP, damage: defDmg, fromEnemy: true });
      EventBus.emit('sfx:play', { name: 'playerHit' });
      EventBus.emit('battle:log', { message: '❌ Guard broken! -' + defDmg + ' HP!' });
    }

    if (battle.playerHP <= 0) {
      endBattle(false);
      return;
    }

    setTimeout(loadNextPuzzle, 1000);
  }

  // ── Set action (attack/defend) ────────────────────────
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

    var stats = {
      won:      won,
      correct:  battle.correct,
      wrong:    battle.wrong,
      playerHP: battle.playerHP,
      enemyHP:  battle.enemyHP,
      rounds:   battle.round,
      duration: Math.floor((Date.now() - battle.startTime) / 1000),
      difficulty: battle.difficulty,
      enemyName:  battle.enemyName,
    };

    // Save result to backend
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

    EventBus.emit('sfx:play', { name: won ? 'victory' : 'defeat' });
    EventBus.emit('battle:end', { won: won, stats: stats });

    State.clearBattle();
  }

  // ── Wire EventBus ─────────────────────────────────────
  function init() {
    EventBus.on('battle:start',     function(d) { start(d); });
    EventBus.on('battle:doAnswer',  function(d) { doAnswer(d); });
    EventBus.on('battle:doSetAction', function(d) { setAction(d); });
  }

  return { init: init };
})();