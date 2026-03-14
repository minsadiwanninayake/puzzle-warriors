// ═══════════════════════════════════════════════════════
// api.js  —  Interoperability Layer (all HTTP calls here)
// No other module ever touches fetch() or tokens.
// ═══════════════════════════════════════════════════════
const API = (function () {
  const BASE = 'http://localhost:5000';

  async function req(method, path, body) {
    const token = State.getToken();
    const opts  = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body)  opts.body = JSON.stringify(body);
    const res  = await fetch(BASE + path, opts);
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  }

  return {
    login(u, p)              { return req('POST', '/api/auth/login',    { username:u, password:p }); },
    register(u, e, p, country, countryCode, region) {
      return req('POST', '/api/auth/register', {
        username: u, email: e, password: p,
        country:     country     || '',
        countryCode: countryCode || '',
        region:      region      || '',
      });
    },
    getMe()             { return req('GET',  '/api/auth/me'); },
    getPuzzle()         { return req('GET',  '/api/game/puzzle'); },
    postResult(payload) { return req('POST', '/api/game/result', payload); },
    getLeaderboard()    { return req('GET',  '/api/game/leaderboard'); },
  };
})();