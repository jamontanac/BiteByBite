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

// ── Boot sequence ──────────────────────────────────────
async function bootApp() {
  const cached = getLocalJournal();
  if (cached) journal = cached;
  normalizeJournal();

  show('s-app');
  initLogTab();
  refreshViews();

  try {
    await pullFromGitHub();
  } catch(e) {
    setSyncState('error');
    toast('Could not reach GitHub. Working offline.', true);
  }
}

// Pulls the latest journal from GitHub, caches it, and refreshes the views.
// Throws on failure so each caller can show its own message.
async function pullFromGitHub() {
  journal = await loadFromGitHub();
  normalizeJournal();
  cacheJournal();
  refreshViews();
  setSyncState('synced');
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
  clearStored();
  CFG = {}; journal = []; ghSha = null; journalBranchReady = false;
  show('s-login');
  document.getElementById('gh-user').value = '';
  document.getElementById('gh-repo').value = '';
  document.getElementById('gh-token').value = '';
}

async function manualSync() {
  try {
    await pullFromGitHub();
    toast('Synced with GitHub');
  } catch(e) {
    setSyncState('error');
    toast('Sync failed — check connection', true);
  }
}
