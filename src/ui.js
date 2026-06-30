// ── UI helpers ─────────────────────────────────────────
function show(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.toggle('active', s.id === id);
  });
}

function switchTab(name) {
  document.querySelectorAll('.scroll-area').forEach(el => {
    el.classList.toggle('active', el.id === 'tab-' + name);
  });
  document.querySelectorAll('.tab-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === name);
  });
  if (name === 'history') renderHistory();
  if (name === 'patterns') renderPatterns();
}

function toast(msg, isErr = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (isErr ? ' error' : '');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => { el.className = ''; }, 2800);
}

function setSyncState(state) {
  const dot = document.getElementById('sync-dot');
  const lbl = document.getElementById('sync-label');
  dot.className = 'sync-dot ' + state;
  lbl.textContent = state === 'syncing' ? 'Saving…' : state === 'error' ? 'Offline' : 'Saved';
}

// Re-renders every data-driven view after the journal changes.
function refreshViews() {
  renderHistory();
  renderPatterns();
  updateSettingsDisplay();
}

// ── Settings helpers ────────────────────────────────────
function updateSettingsDisplay() {
  document.getElementById('cfg-repo-display').textContent =
    CFG.user ? `${CFG.user}/${CFG.repo}` : '—';
  document.getElementById('cfg-count-display').textContent =
    `${journal.length} entr${journal.length === 1 ? 'y' : 'ies'}`;

  const raw = localStorage.getItem(LS_SYNC);
  if (raw) {
    const d       = new Date(Number(raw));
    const today   = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time    = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const label   = isToday
      ? `Today at ${time}`
      : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ` at ${time}`;
    document.getElementById('cfg-sync-display').textContent = label;
  } else {
    document.getElementById('cfg-sync-display').textContent = 'Never';
  }
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(journal, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bitebybite-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Export downloaded');
}

// ── Theme ───────────────────────────────────────────────
// 'auto' follows the OS (CSS color-scheme + light-dark() do the work);
// 'light'/'dark' force a scheme by setting [data-theme] on <html>.
const THEME_ICONS = { auto: '◐', light: '☀', dark: '☾' };

function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);

  const btn = document.getElementById('theme-btn');
  if (btn) {
    btn.textContent = THEME_ICONS[mode] || THEME_ICONS.auto;
    btn.title = 'Theme: ' + mode;
  }

  // Keep the mobile status-bar colour in step with the resolved scheme.
  const dark = mode === 'dark' ||
    (mode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.getElementById('theme-color-meta');
  if (meta) meta.setAttribute('content', dark ? '#16130F' : '#F7F4EF');
}

// Cycles auto → light → dark → auto and persists the choice.
function cycleTheme() {
  const order = ['auto', 'light', 'dark'];
  const next  = order[(order.indexOf(loadTheme()) + 1) % order.length];
  saveTheme(next);
  applyTheme(next);
}
