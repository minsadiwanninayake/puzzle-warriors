// ═══════════════════════════════════════════════════════
// auth.js  —  Authentication (High Cohesion)
// Only handles login / register / logout.
// Multi-page version — uses window.location to navigate.
// ═══════════════════════════════════════════════════════
const Auth = (function () {

  // ── Error / Success display ───────────────────────────
  function showError(msg) {
    const el = document.getElementById('auth-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.background = 'rgba(120,0,0,.25)';
    el.style.borderColor = 'rgba(255,50,50,.3)';
    el.style.color = '#ff9999';
    EventBus.emit('sfx:play', { name: 'error' });
  }

  function showSuccess(msg) {
    const el = document.getElementById('auth-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.background = 'rgba(0,80,30,.25)';
    el.style.borderColor = 'rgba(0,200,80,.3)';
    el.style.color = '#aaffcc';
  }

  function clearError() {
    const el = document.getElementById('auth-error');
    if (el) el.style.display = 'none';
  }

  // ── Tab switcher ──────────────────────────────────────
  function switchTab(tab) {
    const login = document.getElementById('form-login');
    const reg   = document.getElementById('form-register');
    const tl    = document.getElementById('tab-login');
    const tr    = document.getElementById('tab-register');
    if (login) login.style.display = tab === 'login'    ? 'block' : 'none';
    if (reg)   reg.style.display   = tab === 'register' ? 'block' : 'none';
    if (tl)    tl.classList.toggle('active',  tab === 'login');
    if (tr)    tr.classList.toggle('active',  tab === 'register');
    clearError();
  }

  // ── Validation helpers ────────────────────────────────

  // Full RFC-style email check (not just @)
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  // Password: min 6 chars, at least 1 uppercase, 1 number, 1 special char
  function validatePassword(password) {
    if (password.length < 6)            return 'Password must be at least 6 characters.';
    if (!/[A-Z]/.test(password))        return 'Password must contain at least one uppercase letter.';
    if (!/[0-9]/.test(password))        return 'Password must contain at least one number.';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character (!@#$% etc).';
    return null; // valid
  }

  // Username: 3–20 chars, letters/numbers/underscores only
  function validateUsername(username) {
    if (username.length < 3)             return 'Username must be at least 3 characters.';
    if (username.length > 20)            return 'Username must be 20 characters or fewer.';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores.';
    return null; // valid
  }

  // Live password strength indicator
  function updateStrengthBar(password) {
    const bar   = document.getElementById('pass-strength-bar');
    const label = document.getElementById('pass-strength-label');
    if (!bar || !label) return;

    let score = 0;
    if (password.length >= 6)            score++;
    if (password.length >= 10)           score++;
    if (/[A-Z]/.test(password))          score++;
    if (/[0-9]/.test(password))          score++;
    if (/[^A-Za-z0-9]/.test(password))  score++;

    const levels = [
      { pct: '0%',   color: 'transparent',       text: '' },
      { pct: '20%',  color: '#ff2200',            text: 'Very Weak' },
      { pct: '40%',  color: '#ff7700',            text: 'Weak' },
      { pct: '60%',  color: '#ffcc00',            text: 'Fair' },
      { pct: '80%',  color: '#88ff44',            text: 'Strong' },
      { pct: '100%', color: '#00ffaa',            text: 'Very Strong' },
    ];
    const lvl = levels[score];
    bar.style.width      = lvl.pct;
    bar.style.background = lvl.color;
    bar.style.boxShadow  = score > 0 ? `0 0 8px ${lvl.color}` : 'none';
    label.textContent    = lvl.text;
    label.style.color    = lvl.color;
  }

  // ── LOGIN ─────────────────────────────────────────────
  async function doLogin() {
    const username = (document.getElementById('login-user')?.value || '').trim();
    const password =  document.getElementById('login-pass')?.value || '';

    if (!username || !password) { showError('Please fill in all fields.'); return; }
    if (username.length < 3)    { showError('Username must be at least 3 characters.'); return; }

    EventBus.emit('sfx:play', { name: 'click' });
    const btn = document.querySelector('#form-login .btn-submit');
    if (btn) { btn.textContent = 'LOGGING IN...'; btn.disabled = true; }

    try {
      const r = await API.login(username, password);
      if (!r.ok) { showError(r.data.message || 'Login failed.'); return; }
      State.saveToken(r.data.token);
      State.setUser(r.data.user);
      showSuccess(`⚔ Welcome back, ${r.data.user.username}! Redirecting...`);
      setTimeout(() => { window.location.href = 'menu.html'; }, 800);
    } catch (e) {
      showError('Cannot connect to server. Is npm start running?');
    } finally {
      if (btn) { btn.textContent = 'LOGIN →'; btn.disabled = false; }
    }
  }

  // ── REGISTER ──────────────────────────────────────────
  async function doRegister() {
    const username  = (document.getElementById('reg-user')?.value     || '').trim();
    const email     = (document.getElementById('reg-email')?.value    || '').trim();
    const password  =  document.getElementById('reg-pass')?.value     || '';
    const confirm   =  document.getElementById('reg-confirm')?.value  || '';

    // ── Field presence ──
    if (!username || !email || !password || !confirm) {
      showError('Please fill in all fields.'); return;
    }

    // ── Username validation ──
    const usernameErr = validateUsername(username);
    if (usernameErr) { showError(usernameErr); return; }

    // ── Email validation ──
    if (!isValidEmail(email)) {
      showError('Please enter a valid email address (e.g. name@domain.com).'); return;
    }

    // ── Password validation ──
    const passwordErr = validatePassword(password);
    if (passwordErr) { showError(passwordErr); return; }

    // ── Confirm password ──
    if (password !== confirm) {
      showError('Passwords do not match.'); return;
    }

    // ── Country validation ──
    const country     = document.getElementById('reg-country')?.value.trim()      || '';
    const countryCode = document.getElementById('reg-country-code')?.value.trim() || '';
    const region      = document.getElementById('reg-region')?.value.trim()       || '';
    if (!country) {
      showError('Please select your country.'); return;
    }

    EventBus.emit('sfx:play', { name: 'click' });
    const btn = document.getElementById('btn-register');
    if (btn) {
      btn.querySelector('span').textContent = 'CREATING...';
      btn.disabled = true;
    }

    try {
      const r = await API.register(username, email, password, country, countryCode, region);
      if (!r.ok) { showError(r.data.message || 'Registration failed.'); return; }
      State.saveToken(r.data.token);
      State.setUser(r.data.user);
      sessionStorage.removeItem('pw_reg_country');
      sessionStorage.removeItem('pw_reg_country_code');
      sessionStorage.removeItem('pw_reg_region');
      showSuccess('⚔ Account created! A welcome email has been sent. Redirecting...');
      setTimeout(() => { window.location.href = 'menu.html'; }, 1200);
    } catch (e) {
      showError('Cannot connect to server. Is npm start running?');
    } finally {
      if (btn) {
        btn.querySelector('span').textContent = 'CREATE ACCOUNT →';
        btn.disabled = false;
      }
    }
  }

  // ── LOGOUT ────────────────────────────────────────────
  function doLogout() {
    EventBus.emit('sfx:play', { name: 'click' });
    State.clearSession();
    window.location.href = '../index.html';
  }

  // ── Public API ────────────────────────────────────────
  return {
    login()             { doLogin(); },
    register()          { doRegister(); },
    logout()            { doLogout(); },
    switchTab(tab)      { switchTab(tab); },
    updateStrengthBar,  // called live from auth.html input handler
  };
})();