// ── Local storage ──────────────────────────────────────
// Every localStorage access lives here. These key strings are the persisted
// contract — do NOT rename their values (older installs and the test suite
// depend on them).
const LS_CFG   = 'diario_cfg';
const LS_LOCAL = 'diario_local';
const LS_SYNC  = 'diario_last_sync';
const LS_THEME = 'diario_theme';
const LS_LANG  = 'diario_lang';

// Returns the saved {user, repo, token}, or null if absent/incomplete.
function loadCfg() {
  try {
    const s = localStorage.getItem(LS_CFG);
    if (!s) return null;
    const c = JSON.parse(s);
    if (c.user && c.repo && c.token) return c;
  } catch(e) {}
  return null;
}

function saveCfg() {
  localStorage.setItem(LS_CFG, JSON.stringify(CFG));
}

// Returns the cached journal array, or null if absent/corrupt.
function getLocalJournal() {
  const raw = localStorage.getItem(LS_LOCAL);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch(e) { return null; }
}

// Mirrors the in-memory journal to localStorage for offline use.
function cacheJournal() {
  localStorage.setItem(LS_LOCAL, JSON.stringify(journal));
}

// Records the time of the last successful GitHub sync.
function markSynced() {
  localStorage.setItem(LS_SYNC, Date.now());
}

// Theme preference: 'auto' | 'light' | 'dark' (defaults to 'auto').
function loadTheme() {
  return localStorage.getItem(LS_THEME) || 'auto';
}
function saveTheme(mode) {
  localStorage.setItem(LS_THEME, mode);
}

// Language preference: 'en' | 'es' (defaults to 'en').
function loadLang() {
  return localStorage.getItem(LS_LANG) || 'en';
}
function saveLang(lang) {
  localStorage.setItem(LS_LANG, lang);
}

// Clears all locally-cached data (used on sign-out).
function clearStored() {
  localStorage.removeItem(LS_CFG);
  localStorage.removeItem(LS_LOCAL);
  localStorage.removeItem(LS_SYNC);
}
