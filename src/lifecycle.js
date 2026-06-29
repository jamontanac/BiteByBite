// ── Boot ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await loadConfigs();

  const cfg = loadCfg();
  if (cfg) {
    CFG = cfg;
    await bootApp();
  } else {
    if (JCFG.github.username) document.getElementById('gh-user').value = JCFG.github.username;
    if (JCFG.github.reponame) document.getElementById('gh-repo').value = JCFG.github.reponame;
    show('s-login');
  }
  document.getElementById('loading').style.display = 'none';
});

function loadCfg() {
  try {
    const s = localStorage.getItem('diario_cfg');
    if (!s) return null;
    const c = JSON.parse(s);
    if (c.user && c.repo && c.token) return c;
  } catch(e) {}
  return null;
}

function saveCfg() {
  localStorage.setItem('diario_cfg', JSON.stringify(CFG));
}

// ── Boot sequence ──────────────────────────────────────
async function bootApp() {
  const local = localStorage.getItem('diario_local');
  if (local) { try { journal = JSON.parse(local); } catch(e) {} }
  normalizeJournal();

  show('s-app');
  initLogTab();
  renderHistory();
  renderPatterns();
  updateSettingsDisplay();

  try {
    journal = await loadFromGitHub();
    normalizeJournal();
    localStorage.setItem('diario_local', JSON.stringify(journal));
    renderHistory();
    renderPatterns();
    updateSettingsDisplay();
    setSyncState('synced');
  } catch(e) {
    setSyncState('error');
    toast('Could not reach GitHub. Working offline.', true);
  }
}

// ── Login ──────────────────────────────────────────────
async function doLogin() {
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-err');
  errEl.style.display = 'none';

  const user  = document.getElementById('gh-user').value.trim();
  const repo  = document.getElementById('gh-repo').value.trim();
  const token = document.getElementById('gh-token').value.trim();

  if (!user || !repo || !token) {
    showErr('Please fill in all fields.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Connecting…';

  CFG = { user, repo, token };

  try {
    await ghGet(`/repos/${user}/${repo}`);
    saveCfg();
    await bootApp();
  } catch(e) {
    showErr('Could not connect. Check your username, repo name, and token permissions (needs "repo" scope).');
    btn.disabled = false;
    btn.textContent = 'Connect & open journal';
  }

  function showErr(msg) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Connect & open journal';
  }
}

function doLogout() {
  if (!confirm('Sign out? Your data stays on GitHub. Local cache will be cleared.')) return;
  localStorage.removeItem('diario_cfg');
  localStorage.removeItem('diario_local');
  localStorage.removeItem('diario_last_sync');
  CFG = {}; journal = []; ghSha = null; journalBranchReady = false;
  show('s-login');
  document.getElementById('gh-user').value = '';
  document.getElementById('gh-repo').value = '';
  document.getElementById('gh-token').value = '';
}

async function manualSync() {
  try {
    journal = await loadFromGitHub();
    normalizeJournal();
    localStorage.setItem('diario_local', JSON.stringify(journal));
    renderHistory(); renderPatterns(); updateSettingsDisplay();
    setSyncState('synced');
    toast('Synced with GitHub');
  } catch(e) {
    setSyncState('error');
    toast('Sync failed — check connection', true);
  }
}
