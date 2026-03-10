// ═══════════════════════════════════════════════════════
// auth.js  —  Authentication (High Cohesion)
// Only handles login / register / logout.
// Multi-page version — uses window.location to navigate.
// ═══════════════════════════════════════════════════════
const Auth = (function () {

  function showError(msg) {
    const el = document.getElementById('auth-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    EventBus.emit('sfx:play', { name: 'error' });
  }

  function clearError() {
    const el = document.getElementById('auth-error');
    if (el) el.style.display = 'none';
  }

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

  async function doLogin() {
    const username = (document.getElementById('login-user')?.value || '').trim();
    const password =  document.getElementById('login-pass')?.value || '';
    if (!username || !password) { showError('Fill in all fields!'); return; }

    EventBus.emit('sfx:play', { name: 'click' });
    const btn = document.querySelector('#form-login .btn');
    if (btn) { btn.textContent = 'LOGGING IN...'; btn.disabled = true; }

    try {
      const r = await API.login(username, password);
      if (!r.ok) { showError(r.data.message || 'Login failed.'); return; }
      State.saveToken(r.data.token);
      State.setUser(r.data.user);
      // Navigate to menu page
      window.location.href = 'menu.html';
    } catch (e) {
      showError('Cannot connect to server. Is npm start running?');
    } finally {
      if (btn) { btn.textContent = 'LOGIN →'; btn.disabled = false; }
    }
  }

  async function doRegister() {
    const username = (document.getElementById('reg-user')?.value  || '').trim();
    const email    = (document.getElementById('reg-email')?.value || '').trim();
    const password =  document.getElementById('reg-pass')?.value  || '';
    if (!username || !email || !password) { showError('Fill in all fields!'); return; }
    if (password.length < 6)              { showError('Password must be 6+ characters!'); return; }
    if (!email.includes('@'))             { showError('Enter a valid email!'); return; }

    EventBus.emit('sfx:play', { name: 'click' });
    const btn = document.querySelector('#form-register .btn');
    if (btn) { btn.textContent = 'CREATING...'; btn.disabled = true; }

    try {
      const r = await API.register(username, email, password);
      if (!r.ok) { showError(r.data.message || 'Registration failed.'); return; }
      State.saveToken(r.data.token);
      State.setUser(r.data.user);
      // Navigate to menu page
      window.location.href = 'menu.html';
    } catch (e) {
      showError('Cannot connect to server. Is npm start running?');
    } finally {
      if (btn) { btn.textContent = 'CREATE ACCOUNT →'; btn.disabled = false; }
    }
  }

  function doLogout() {
    EventBus.emit('sfx:play', { name: 'click' });
    State.clearSession();
    window.location.href = '../index.html';
  }

  return {
    login()        { doLogin(); },
    register()     { doRegister(); },
    logout()       { doLogout(); },
    switchTab(tab) { switchTab(tab); },
  };
})();