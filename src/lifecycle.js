// ── Boot ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  applyTheme(loadTheme());
  LANG = loadLang();
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
  applyI18n(document);
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
    toast(t('toast.offline'), true);
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
    showErr(t('login.errFields'));
    return;
  }

  btn.disabled = true;
  btn.textContent = t('login.connecting');

  CFG = { user, repo, token };

  try {
    await ghGet(`/repos/${user}/${repo}`);
    saveCfg();
    await bootApp();
  } catch(e) {
    showErr(t('login.errConnect'));
    btn.disabled = false;
    btn.textContent = t('login.button');
  }

  function showErr(msg) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = t('login.button');
  }
}

function doLogout() {
  if (!confirm(t('logout.confirm'))) return;
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
    toast(t('toast.synced'));
  } catch(e) {
    setSyncState('error');
    toast(t('toast.syncFailed'), true);
  }
}
