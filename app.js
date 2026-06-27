// ── State ──────────────────────────────────────────────
let CFG = {};         // {user, repo, token}
let journal = [];     // array of day entries
let ghSha = null;     // SHA of journal.json in GitHub (needed for updates)
let mealCount = 0;
let reactionCount = 0;
let editIndex = -1;
let activeSymptoms = new Set();
let activeSev = '';
let syncTimer = null;

const API = 'https://api.github.com';
const FILE = 'journal.json';

// ── Config ─────────────────────────────────────────────
async function loadAppConfig() {
  try {
    const res = await fetch('config.json');
    if (res.ok) return res.json();
  } catch(e) {}
  return {};
}

// ── Boot ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const appCfg = await loadAppConfig();
  const github = appCfg.github || {};

  const cfg = loadCfg();
  if (cfg) {
    CFG = cfg;
    await bootApp();
  } else {
    if (github.username) document.getElementById('gh-user').value = github.username;
    if (github.reponame) document.getElementById('gh-repo').value = github.reponame;
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

// ── GitHub API ─────────────────────────────────────────
async function ghGet(path) {
  const r = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${CFG.token}`, Accept: 'application/vnd.github+json' }
  });
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${r.statusText}`);
  return r.json();
}

async function ghPut(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${CFG.token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || `GitHub ${r.status}`);
  }
  return r.json();
}

async function loadFromGitHub() {
  try {
    const data = await ghGet(`/repos/${CFG.user}/${CFG.repo}/contents/${FILE}`);
    ghSha = data.sha;
    const decoded = atob(data.content.replace(/\n/g, ''));
    return JSON.parse(decoded);
  } catch(e) {
    if (e.message.includes('404')) return [];
    throw e;
  }
}

async function saveToGitHub() {
  setSyncState('syncing');
  try {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(journal, null, 2))));
    const body = {
      message: `Update journal ${new Date().toISOString().slice(0,10)}`,
      content,
      ...(ghSha ? { sha: ghSha } : {})
    };
    const res = await ghPut(`/repos/${CFG.user}/${CFG.repo}/contents/${FILE}`, body);
    ghSha = res.content.sha;
    setSyncState('synced');
    localStorage.setItem('diario_last_sync', Date.now());
    localStorage.setItem('diario_local', JSON.stringify(journal));
  } catch(e) {
    setSyncState('error');
    throw e;
  }
}

// ── Boot sequence ──────────────────────────────────────
async function bootApp() {
  const local = localStorage.getItem('diario_local');
  if (local) { try { journal = JSON.parse(local); } catch(e) {} }

  show('s-app');
  initLogTab();
  renderHistory();
  renderPatterns();
  updateSettingsDisplay();

  try {
    journal = await loadFromGitHub();
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
  CFG = {}; journal = []; ghSha = null;
  show('s-login');
  document.getElementById('gh-user').value = '';
  document.getElementById('gh-repo').value = '';
  document.getElementById('gh-token').value = '';
}

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

async function manualSync() {
  try {
    journal = await loadFromGitHub();
    localStorage.setItem('diario_local', JSON.stringify(journal));
    renderHistory(); renderPatterns(); updateSettingsDisplay();
    setSyncState('synced');
    toast('Synced with GitHub');
  } catch(e) {
    setSyncState('error');
    toast('Sync failed — check connection', true);
  }
}

// ── Edit mode ──────────────────────────────────────────
function enterEditMode(index) {
  editIndex = index;
  const entry = journal[index];

  resetLogForm();
  loadEntryIntoForm(entry);

  document.getElementById('edit-banner').style.display = 'flex';
  document.getElementById('edit-banner-date').textContent = fmtDate(entry.date);

  const dateEl = document.getElementById('e-date');
  dateEl.readOnly = true;
  dateEl.style.opacity = '0.6';
  dateEl.style.cursor  = 'default';

  document.querySelector('#save-btn span').textContent = 'Update entry';
  switchTab('log');
  document.getElementById('tab-log').scrollTop = 0;
}

function exitEditMode() {
  editIndex = -1;
  document.getElementById('edit-banner').style.display = 'none';
  const dateEl = document.getElementById('e-date');
  dateEl.readOnly = false;
  dateEl.style.opacity = '';
  dateEl.style.cursor  = '';
  document.querySelector('#save-btn span').textContent = 'Save entry';
}

function cancelEdit() {
  exitEditMode();
  resetLogForm();
  switchTab('history');
}

function loadMealIntoCard(card, meal) {
  card.querySelector('.meal-type-sel').value = meal.type    || 'breakfast';
  card.querySelector('.ml-time').value       = meal.time    || '';
  card.querySelector('.ml-source').value     = meal.source  || 'homemade';
  card.querySelector('.ml-foods').value      = meal.foods   || '';
  card.querySelector('.ml-heavy').value      = meal.heavy   || 'light';
  card.querySelector('.ml-amount').value     = meal.amount  || 'all';

  const freshCb = card.querySelector('.ml-fresh');
  freshCb.checked = meal.freshFood !== false;
  if (!freshCb.checked) {
    card.querySelector('.ml-cooked-when-row').style.display = 'block';
    card.querySelector('.ml-cooked-when').value = meal.cookedWhen || '';
  }

  const newCb = card.querySelector('.ml-new');
  newCb.checked = !!meal.newFood;
  if (newCb.checked) {
    card.querySelector('.ml-new-food-row').style.display = 'block';
    card.querySelector('.ml-new-food-name').value = meal.newFoodName || '';
  }

  card.querySelector('.ml-gluten').checked = !!meal.gluten;
  card.querySelector('.ml-dairy').checked  = !!meal.dairy;
  card.querySelector('.ml-egg').checked    = !!meal.egg;
}

function loadEntryIntoForm(entry) {
  document.getElementById('e-date').value      = entry.date;
  document.getElementById('e-sleep').value     = entry.sleep    || '';
  document.getElementById('e-mood').value      = entry.mood     || '';
  document.getElementById('e-activity').value  = entry.activity || '';
  document.getElementById('e-stool').value     = entry.stool    || '';
  document.getElementById('e-hydration').value = entry.hydration|| '';

  document.getElementById('e-newenv').checked = !!entry.newEnv;
  document.getElementById('e-sick').checked   = !!entry.sick;
  document.getElementById('e-meds').checked   = !!entry.meds;
  if (entry.meds && entry.medName) {
    document.getElementById('e-med-name').value          = entry.medName;
    document.getElementById('med-name-row').style.display = 'block';
  }

  // Meals
  document.getElementById('meals-container').innerHTML = '';
  mealCount = 0;
  (entry.meals || []).forEach(meal => {
    addMeal();
    const cards = document.querySelectorAll('#meals-container .meal-card');
    loadMealIntoCard(cards[cards.length - 1], meal);
  });

  // Reactions (build dropdowns first so we can match meal labels)
  document.getElementById('reactions-container').innerHTML = '';
  reactionCount = 0;
  updateMealSelect();
  (entry.reactions || []).forEach(reaction => {
    addReactionEpisode();
    const cards = document.querySelectorAll('#reactions-container .meal-card');
    const card  = cards[cards.length - 1];
    const epSel = card.querySelector('.ep-meal');
    // Match saved meal label text to option
    for (const opt of epSel.options) {
      if (opt.text.trim() === (reaction.meal || '').trim()) { epSel.value = opt.value; break; }
    }
    card.querySelector('.ep-count').value   = reaction.count   || '1';
    card.querySelector('.ep-delay').value   = reaction.delay   || '';
    card.querySelector('.ep-content').value = reaction.content || '';
  });

  // Symptoms
  activeSymptoms = new Set();
  document.querySelectorAll('#symptom-chips .chip').forEach(c => c.classList.remove('active'));
  const predefined = ['bloating','gas','cramps','rash','itching','swelling','reflux','crying','constipation'];
  (entry.symptoms || []).forEach(s => {
    if (predefined.includes(s)) {
      const chip = document.querySelector(`#symptom-chips .chip[data-v="${s}"]`);
      if (chip) { chip.classList.add('active'); activeSymptoms.add(s); }
    } else {
      const chip = document.querySelector('#symptom-chips .chip[data-v="other"]');
      if (chip) {
        chip.classList.add('active');
        activeSymptoms.add('other');
        document.getElementById('e-symptom-other').value          = s;
        document.getElementById('other-symptom-row').style.display = 'block';
      }
    }
  });

  // Severity
  activeSev = '';
  document.querySelectorAll('.sev-btn').forEach(b => b.classList.remove('active'));
  if (entry.severity) {
    const btn = document.querySelector(`.sev-btn[data-s="${entry.severity}"]`);
    if (btn) selectSev(btn);
  }

  document.getElementById('e-notes').value = entry.notes || '';
}

// ── Log tab ─────────────────────────────────────────────
function initLogTab() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('e-date').value = today;

  document.querySelectorAll('#symptom-chips .chip').forEach(c => {
    c.addEventListener('click', () => {
      c.classList.toggle('active');
      const v = c.dataset.v;
      if (activeSymptoms.has(v)) activeSymptoms.delete(v);
      else activeSymptoms.add(v);
      if (v === 'other') {
        const row = document.getElementById('other-symptom-row');
        const active = c.classList.contains('active');
        row.style.display = active ? 'block' : 'none';
        if (!active) document.getElementById('e-symptom-other').value = '';
      }
    });
  });

  document.getElementById('e-date').addEventListener('change', updateMealSelect);

  if (document.getElementById('meals-container').children.length === 0) addMeal();
}

function addMeal() {
  const id = 'ml-' + (mealCount++);
  const div = document.createElement('div');
  div.className = 'meal-card';
  div.id = id;

  const now = new Date();
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');

  div.innerHTML = `
    <div class="meal-card-head">
      <select class="meal-type-sel" style="font-size:.8rem;padding:.3rem .6rem;border:1px solid var(--border);border-radius:20px;background:var(--bg)" onchange="updateMealSelect()">
        <option value="breakfast">Breakfast</option>
        <option value="snack">Morning snack</option>
        <option value="lunch">Lunch</option>
        <option value="snack2">Afternoon snack</option>
        <option value="dinner">Dinner</option>
        <option value="other">Other</option>
      </select>
      <button class="meal-remove" onclick="document.getElementById('${id}').remove(); updateMealSelect()">Remove</button>
    </div>
    <div class="f-row">
      <div class="f-group"><label>Time given</label><input type="time" class="ml-time" value="${hh}:${mm}"></div>
      <div class="f-group"><label>Source</label>
        <select class="ml-source">
          <option value="homemade">Homemade</option>
          <option value="packaged">Packaged / commercial</option>
          <option value="restaurant">Restaurant / outside</option>
          <option value="formula">Formula / breast milk</option>
        </select>
      </div>
    </div>
    <div class="f-row full">
      <div class="f-group"><label>Foods eaten</label>
        <textarea class="ml-foods" placeholder="e.g. oatmeal, banana, apple juice…" rows="2"></textarea>
      </div>
    </div>
    <div class="f-row">
      <div class="f-group"><label>Meal heaviness</label>
        <select class="ml-heavy">
          <option value="light">Light</option>
          <option value="moderate">Moderate</option>
          <option value="heavy">Heavy / rich / fatty</option>
        </select>
      </div>
      <div class="f-group"><label>Amount eaten</label>
        <select class="ml-amount">
          <option value="all">All / almost all</option>
          <option value="half">About half</option>
          <option value="little">Just a little</option>
          <option value="refused">Refused</option>
        </select>
      </div>
    </div>
    <div style="margin-top:.25rem">
      <div class="toggle-row">
        <label class="tog"><input type="checkbox" class="ml-new" onchange="toggleNewFoodInput(this)"><span class="tog-track"></span></label>
        <div class="toggle-label">New food
          <small>Ingredient rarely or never eaten before</small>
        </div>
      </div>
      <div class="ml-new-food-row" style="display:none;padding:.375rem 0 .25rem">
        <div class="f-group">
          <label>New ingredient</label>
          <input type="text" class="ml-new-food-name" placeholder="e.g. mango, wheat bread…" autocomplete="off">
        </div>
      </div>
      <div class="toggle-row">
        <label class="tog"><input type="checkbox" class="ml-fresh" checked onchange="toggleFreshFoodInput(this)"><span class="tog-track"></span></label>
        <div class="toggle-label">Fresh food
          <small>Cooked today, not a leftover</small>
        </div>
      </div>
      <div class="ml-cooked-when-row" style="display:none;padding:.375rem 0 .25rem">
        <div class="f-group">
          <label>When was it cooked?</label>
          <input type="text" class="ml-cooked-when" placeholder="e.g. yesterday evening, 2 days ago…" autocomplete="off">
        </div>
      </div>
      <div class="toggle-row">
        <label class="tog"><input type="checkbox" class="ml-gluten"><span class="tog-track"></span></label>
        <div class="toggle-label">Contains gluten
          <small>Wheat, barley, rye, spelt, or oats</small>
        </div>
      </div>
      <div class="toggle-row">
        <label class="tog"><input type="checkbox" class="ml-dairy"><span class="tog-track"></span></label>
        <div class="toggle-label">Contains dairy</div>
      </div>
      <div class="toggle-row">
        <label class="tog"><input type="checkbox" class="ml-egg"><span class="tog-track"></span></label>
        <div class="toggle-label">Contains egg</div>
      </div>
    </div>
  `;
  document.getElementById('meals-container').appendChild(div);
  updateMealSelect();
}

function updateMealSelect() {
  const opts = ['<option value="">— select meal —</option>'];

  if (editIndex >= 0) {
    // Edit mode: form cards ARE the full day's meals — no separate saved-entry group
    document.querySelectorAll('#meals-container .meal-card').forEach(card => {
      const type = card.querySelector('.meal-type-sel').value;
      const time = card.querySelector('.ml-time').value;
      opts.push(`<option value="${card.id}">${typeName(type)}${time ? ' · ' + fmtTime(time) : ''}</option>`);
    });
  } else {
  // Meals already saved for this date (from a previous save earlier in the day)
  const date = document.getElementById('e-date') ? document.getElementById('e-date').value : '';
  const savedEntry = date ? journal.find(e => e.date === date) : null;
  if (savedEntry && savedEntry.meals && savedEntry.meals.length) {
    opts.push('<optgroup label="Already logged today">');
    savedEntry.meals.forEach((m, i) => {
      opts.push(`<option value="saved:${i}">${typeName(m.type)}${m.time ? ' · ' + fmtTime(m.time) : ''}</option>`);
    });
    opts.push('</optgroup>');
  }

  // Meals being added right now in the form
  const formMeals = document.querySelectorAll('#meals-container .meal-card');
  if (formMeals.length) {
    if (savedEntry && savedEntry.meals && savedEntry.meals.length) {
      opts.push('<optgroup label="Adding now">');
    }
    formMeals.forEach(card => {
      const type = card.querySelector('.meal-type-sel').value;
      const time = card.querySelector('.ml-time').value;
      opts.push(`<option value="${card.id}">${typeName(type)}${time ? ' · ' + fmtTime(time) : ''}</option>`);
    });
    if (savedEntry && savedEntry.meals && savedEntry.meals.length) {
      opts.push('</optgroup>');
    }
  }
  } // end else (non-edit mode)

  document.querySelectorAll('#reactions-container .ep-meal').forEach(sel => {
    const prev = sel.value;
    sel.innerHTML = opts.join('');
    sel.value = prev;
  });
}

function addReactionEpisode() {
  const id = 're-' + (reactionCount++);
  const div = document.createElement('div');
  div.className = 'meal-card';
  div.id = id;
  div.innerHTML = `
    <div class="meal-card-head">
      <span style="font-size:.8rem;color:var(--ink2);font-weight:500">Vomiting episode</span>
      <button class="meal-remove" onclick="document.getElementById('${id}').remove()">Remove</button>
    </div>
    <div class="f-row">
      <div class="f-group"><label>Meal that triggered it</label>
        <select class="ep-meal"><option value="">— select meal —</option></select>
      </div>
      <div class="f-group"><label>Times vomited</label>
        <select class="ep-count">
          <option value="1">Once</option>
          <option value="2">Twice</option>
          <option value="3+">3 or more</option>
        </select>
      </div>
    </div>
    <div class="f-row">
      <div class="f-group"><label>Delay after meal</label>
        <select class="ep-delay">
          <option value="">Not applicable</option>
          <option value="<30m">Under 30 min</option>
          <option value="30-60m">30 – 60 min</option>
          <option value="1-2h">1 – 2 hours</option>
          <option value="2-3h">2 – 3 hours</option>
          <option value="3-4h">3 – 4 hours</option>
          <option value=">4h">Over 4 hours</option>
        </select>
      </div>
      <div class="f-group"><label>What was vomited</label>
        <input type="text" class="ep-content" placeholder="e.g. breakfast residue, mucus">
      </div>
    </div>
  `;
  document.getElementById('reactions-container').appendChild(div);
  updateMealSelect();
}

function toggleFreshFoodInput(checkbox) {
  const card = checkbox.closest('.meal-card');
  const row  = card.querySelector('.ml-cooked-when-row');
  row.style.display = checkbox.checked ? 'none' : 'block';
  if (checkbox.checked) card.querySelector('.ml-cooked-when').value = '';
}

function toggleNewFoodInput(checkbox) {
  const card = checkbox.closest('.meal-card');
  const row  = card.querySelector('.ml-new-food-row');
  row.style.display = checkbox.checked ? 'block' : 'none';
  if (!checkbox.checked) card.querySelector('.ml-new-food-name').value = '';
}

function toggleMedInput(checkbox) {
  document.getElementById('med-name-row').style.display = checkbox.checked ? 'block' : 'none';
  if (!checkbox.checked) document.getElementById('e-med-name').value = '';
}

function selectSev(btn) {
  document.querySelectorAll('.sev-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeSev = btn.dataset.s;
}

// ── Save entry ──────────────────────────────────────────
async function saveEntry() {
  const date = document.getElementById('e-date').value;
  if (!date) { toast('Please pick a date', true); return; }

  const mealCards = document.querySelectorAll('#meals-container .meal-card');
  if (mealCards.length === 0) { toast('Add at least one meal', true); return; }

  const meals = [];
  mealCards.forEach(card => {
    meals.push({
      type:    card.querySelector('.meal-type-sel').value,
      time:    card.querySelector('.ml-time').value,
      source:  card.querySelector('.ml-source').value,
      foods:   card.querySelector('.ml-foods').value.trim(),
      heavy:   card.querySelector('.ml-heavy').value,
      amount:  card.querySelector('.ml-amount').value,
      freshFood:  card.querySelector('.ml-fresh').checked,
      cookedWhen: !card.querySelector('.ml-fresh').checked ? card.querySelector('.ml-cooked-when').value.trim() : '',
      newFood:     card.querySelector('.ml-new').checked,
      newFoodName: card.querySelector('.ml-new').checked ? card.querySelector('.ml-new-food-name').value.trim() : '',
      gluten:  card.querySelector('.ml-gluten').checked,
      dairy:   card.querySelector('.ml-dairy').checked,
      egg:     card.querySelector('.ml-egg').checked,
    });
  });

  const savedEntry = journal.find(e => e.date === date);
  const reactions = [];
  document.querySelectorAll('#reactions-container .meal-card').forEach(card => {
    const mealId = card.querySelector('.ep-meal').value;
    let mealLabel = '';
    if (mealId.startsWith('saved:')) {
      const idx = parseInt(mealId.slice(6));
      if (savedEntry && savedEntry.meals && savedEntry.meals[idx]) {
        const m = savedEntry.meals[idx];
        mealLabel = typeName(m.type) + (m.time ? ' · ' + fmtTime(m.time) : '');
      }
    } else if (mealId) {
      const mealCard = document.getElementById(mealId);
      if (mealCard) {
        const mt = mealCard.querySelector('.ml-time').value;
        mealLabel = typeName(mealCard.querySelector('.meal-type-sel').value) + (mt ? ' · ' + fmtTime(mt) : '');
      }
    }
    reactions.push({
      meal:    mealLabel,
      count:   card.querySelector('.ep-count').value,
      delay:   card.querySelector('.ep-delay').value,
      content: card.querySelector('.ep-content').value.trim(),
    });
  });

  const medsChecked = document.getElementById('e-meds').checked;
  const entry = {
    date,
    sleep:    document.getElementById('e-sleep').value,
    mood:     document.getElementById('e-mood').value,
    activity: document.getElementById('e-activity').value,
    stool:    document.getElementById('e-stool').value,
    hydration:document.getElementById('e-hydration').value,
    newEnv:   document.getElementById('e-newenv').checked,
    sick:     document.getElementById('e-sick').checked,
    meds:     medsChecked,
    medName:  medsChecked ? document.getElementById('e-med-name').value.trim() : '',
    meals,
    reactions,
    symptoms: (otherText => [...activeSymptoms].map(s => s === 'other' ? (otherText || 'other') : s))(document.getElementById('e-symptom-other').value.trim()),
    severity: activeSev,
    notes:    document.getElementById('e-notes').value.trim(),
    ts:       Date.now()
  };

  const isEdit = editIndex >= 0;
  let isMerge  = false;

  if (isEdit) {
    journal[editIndex] = entry;
  } else {
    const existIdx = journal.findIndex(e => e.date === date);
    if (existIdx >= 0) {
      const ex = journal[existIdx];
      ex.meals = [...(ex.meals || []), ...entry.meals];
      if (entry.sleep)     ex.sleep     = entry.sleep;
      if (entry.mood)      ex.mood      = entry.mood;
      if (entry.activity)  ex.activity  = entry.activity;
      if (entry.stool)     ex.stool     = entry.stool;
      if (entry.hydration) ex.hydration = entry.hydration;
      if (entry.newEnv)    ex.newEnv    = true;
      if (entry.sick)      ex.sick      = true;
      if (entry.meds)      { ex.meds = true; if (entry.medName) ex.medName = entry.medName; }
      ex.reactions = [...(ex.reactions || []), ...(entry.reactions || [])];
      ex.symptoms = [...new Set([...(ex.symptoms || []), ...entry.symptoms])];
      if (entry.severity && (!ex.severity || Number(entry.severity) > Number(ex.severity))) {
        ex.severity = entry.severity;
      }
      if (entry.notes) ex.notes = ex.notes ? ex.notes + '\n' + entry.notes : entry.notes;
      ex.ts = entry.ts;
      journal[existIdx] = ex;
      isMerge = true;
    } else {
      journal.unshift(entry);
    }
  }

  journal.sort((a, b) => b.date.localeCompare(a.date));

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Saving to GitHub…';

  try {
    await saveToGitHub();
    updateSettingsDisplay();
    if (isEdit) {
      toast('Entry updated ✓');
      exitEditMode();
      resetLogForm();
      switchTab('history');
    } else {
      toast(isMerge ? 'Merged into existing day ✓' : 'Entry saved ✓');
      resetLogForm();
    }
  } catch(e) {
    toast('Save failed: ' + e.message, true);
  } finally {
    btn.disabled = false;
    btn.querySelector('span').textContent = isEdit ? 'Update entry' : 'Save entry';
  }
}

function resetLogForm() {
  document.getElementById('e-date').value = new Date().toISOString().slice(0,10);
  ['e-sleep','e-mood','e-activity','e-stool','e-hydration'].forEach(id => {
    document.getElementById(id).value = '';
  });
  ['e-newenv','e-sick','e-meds'].forEach(id => {
    document.getElementById(id).checked = false;
  });
  document.getElementById('reactions-container').innerHTML = '';
  reactionCount = 0;
  document.getElementById('e-med-name').value = '';
  document.getElementById('med-name-row').style.display = 'none';
  document.getElementById('e-notes').value = '';
  document.getElementById('meals-container').innerHTML = '';
  mealCount = 0;
  document.querySelectorAll('#symptom-chips .chip').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.sev-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('e-symptom-other').value = '';
  document.getElementById('other-symptom-row').style.display = 'none';
  activeSymptoms.clear();
  activeSev = '';
  addMeal();
}

// ── History tab ─────────────────────────────────────────
function renderHistory() {
  const el = document.getElementById('history-list');
  if (!journal.length) {
    el.innerHTML = `<div class="empty">
      <div class="empty-icon">📖</div>
      <p>No entries yet.<br>Log your first day using the ✏️ tab.</p>
    </div>`;
    return;
  }

  el.innerHTML = journal.map((e, i) => {
    const hasReactions = e.reactions && e.reactions.length > 0;
    const hadVomit    = hasReactions || (e.vomit && e.vomit !== 'none');
    const hasNew      = e.meals && e.meals.some(m => m.newFood);
    const hasGluten   = e.meals && e.meals.some(m => m.gluten);
    const hasDairy    = e.meals && e.meals.some(m => m.dairy);
    const hasLeftover = e.meals && e.meals.some(m => m.freshFood === false);

    const tags = [
      hadVomit
        ? `<span class="tag bad">🤢 Vomited (${
            hasReactions
              ? e.reactions.length + (e.reactions.length === 1 ? ' episode' : ' episodes')
              : e.vomit + '×'
          })</span>`
        : `<span class="tag ok">✓ No vomiting</span>`,
      e.severity === '3' ? `<span class="tag bad">Severe day</span>` :
      e.severity === '2' ? `<span class="tag warn">Moderate day</span>` :
      e.severity === '1' ? `<span class="tag ok">Mild day</span>` : '',
      hasNew      ? `<span class="tag warn">New food</span>` : '',
      hasLeftover ? `<span class="tag neutral">Leftover food</span>` : '',
      hasGluten ? `<span class="tag gluten">Gluten</span>` : '',
      hasDairy  ? `<span class="tag neutral">Dairy</span>` : '',
      e.newEnv  ? `<span class="tag neutral">Away from home</span>` : '',
      e.sick    ? `<span class="tag warn">Illness signs</span>` : '',
      e.meds    ? `<span class="tag neutral">💊 ${e.medName || 'Medication'}</span>` : '',
      e.sleep   ? `<span class="tag neutral">Sleep: ${e.sleep}</span>` : '',
    ].filter(Boolean).join('');

    const mealRows = (e.meals || []).map(m => `
      <div class="meal-row">
        <span class="meal-time">${m.time ? fmtTime(m.time) : '—'}</span>
        <span class="meal-foods-text">
          <strong>${typeName(m.type)}</strong> · ${m.foods || '(no detail)'}
          ${m.freshFood === false ? ` · <em style="color:var(--ink3)">leftover${m.cookedWhen ? ' (' + m.cookedWhen + ')' : ''}</em>` : ''}
          ${m.newFood ? ` · <em style="color:var(--amber)">${m.newFoodName || 'new food'}</em>` : ''}
          ${m.gluten  ? ' · <em style="color:var(--purple)">gluten</em>' : ''}
        </span>
      </div>`).join('');

    let reactionHtml = '';
    if (hasReactions) {
      reactionHtml = e.reactions.map(r =>
        `<div class="reaction-bar ${e.severity === '3' ? 'severe' : ''}">
          ${r.count}× &nbsp;·&nbsp; ${r.delay || '—'} after ${r.meal ? `<strong>${r.meal}</strong>` : 'last meal'}
          ${r.content ? ` — <em>${r.content}</em>` : ''}
        </div>`
      ).join('');
    } else if (e.vomit && e.vomit !== 'none' && e.delay) {
      reactionHtml = `<div class="reaction-bar ${e.severity === '3' ? 'severe' : ''}">
        Reaction ${e.delay} after ${e.mealVomited ? `<strong>${e.mealVomited}</strong>` : 'last meal'}
        ${e.vomitContent ? ` — <em>${e.vomitContent}</em>` : ''}
        ${e.symptoms && e.symptoms.length ? ' · ' + e.symptoms.join(', ') : ''}
      </div>`;
    }

    return `<div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.375rem">
        <div class="entry-date-head" style="margin-bottom:0">${fmtDate(e.date)}</div>
        <button onclick="enterEditMode(${i})" style="font-size:.75rem;color:var(--ink3);border:none;background:none;padding:.2rem .5rem;border-radius:var(--r);cursor:pointer;flex-shrink:0" aria-label="Edit entry">Edit</button>
      </div>
      <div class="tag-row">${tags}</div>
      <div>${mealRows}</div>
      ${reactionHtml}
      ${e.symptoms && e.symptoms.length ? `<div class="reaction-bar" style="border-left-color:var(--ink3);background:var(--bg)">${e.symptoms.join(', ')}</div>` : ''}
      ${e.notes ? `<div class="entry-note">${e.notes}</div>` : ''}
    </div>`;
  }).join('');
}

// ── Patterns tab ────────────────────────────────────────
function renderPatterns() {
  const el = document.getElementById('patterns-content');
  if (journal.length < 2) {
    el.innerHTML = `<div class="empty">
      <div class="empty-icon">📊</div>
      <p>Log at least 2 days to start<br>seeing patterns.</p>
    </div>`;
    return;
  }

  const hadReaction = e => (e.reactions && e.reactions.length > 0) || (e.vomit && e.vomit !== 'none');

  const n = journal.length;
  const vomitDays = journal.filter(hadReaction).length;

  const pct = (a, b) => b === 0 ? '—' : Math.round(a / b * 100) + '%';
  const pctClass = (a, b) => {
    if (b === 0) return 'low';
    const r = a / b;
    return r > .6 ? 'high' : r > .3 ? 'mid' : 'low';
  };

  const correlations = [
    {
      name: 'Gluten days with vomiting',
      filter: e => e.meals && e.meals.some(m => m.gluten),
      react:  hadReaction
    },
    {
      name: 'Dairy days with vomiting',
      filter: e => e.meals && e.meals.some(m => m.dairy),
      react:  hadReaction
    },
    {
      name: 'Egg days with vomiting',
      filter: e => e.meals && e.meals.some(m => m.egg),
      react:  hadReaction
    },
    {
      name: 'New food days with vomiting',
      filter: e => e.meals && e.meals.some(m => m.newFood),
      react:  hadReaction
    },
    {
      name: 'Leftover food days with vomiting',
      filter: e => e.meals && e.meals.some(m => m.freshFood === false),
      react:  hadReaction
    },
    {
      name: 'Poor-sleep days with vomiting',
      filter: e => e.sleep === 'poor' || e.sleep === 'very-poor',
      react:  hadReaction
    },
    {
      name: 'Away-from-home days with vomiting',
      filter: e => e.newEnv,
      react:  hadReaction
    },
    {
      name: 'Illness-sign days with vomiting',
      filter: e => e.sick,
      react:  hadReaction
    },
    {
      name: 'Heavy-meal days with vomiting',
      filter: e => e.meals && e.meals.some(m => m.heavy === 'heavy'),
      react:  hadReaction
    },
  ];

  const corrRows = correlations.map(c => {
    const subset = journal.filter(c.filter);
    const hits   = subset.filter(c.react).length;
    const p = pct(hits, subset.length);
    const cls = pctClass(hits, subset.length);
    return `<div class="corr-row">
      <div class="corr-left">
        <div class="corr-name">${c.name}</div>
        <div class="corr-sub">${hits} of ${subset.length} days</div>
      </div>
      <div class="corr-pct ${cls}">${p}</div>
    </div>`;
  }).join('');

  const vEntries = journal.filter(hadReaction);
  const delayCounts = {};
  vEntries.forEach(e => { delayCounts[e.delay] = (delayCounts[e.delay] || 0) + 1; });
  const delayRows = Object.entries(delayCounts)
    .sort((a,b) => b[1] - a[1])
    .map(([k,v]) => `<span class="tag neutral">${k}: ${v}×</span>`)
    .join('');

  const sympCounts = {};
  journal.forEach(e => (e.symptoms||[]).forEach(s => { sympCounts[s] = (sympCounts[s]||0)+1; }));
  const sympRows = Object.entries(sympCounts)
    .sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([k,v]) => `<span class="tag bad">${k} (${v}×)</span>`)
    .join('');

  el.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-num">${n}</div><div class="stat-lbl">Days logged</div></div>
      <div class="stat-card"><div class="stat-num bad">${vomitDays}</div><div class="stat-lbl">Days with vomiting</div></div>
      <div class="stat-card"><div class="stat-num">${pct(vomitDays,n)}</div><div class="stat-lbl">Vomit rate</div></div>
      <div class="stat-card"><div class="stat-num ok">${n - vomitDays}</div><div class="stat-lbl">Clear days</div></div>
    </div>

    <div class="sec-label">Possible correlations</div>
    ${corrRows}

    ${vEntries.length ? `
    <div class="sec-label">Reaction timing</div>
    <div class="card">
      <div style="font-size:.82rem;color:var(--ink2);margin-bottom:.625rem;line-height:1.5">
        Fast reactions (&lt;2 h) suggest IgE allergy. Delayed reactions (2–8 h) are more typical of non-IgE allergy, celiac, or intolerance.
      </div>
      <div class="chip-grid">${delayRows}</div>
    </div>` : ''}

    ${sympRows ? `
    <div class="sec-label">Most frequent symptoms</div>
    <div class="card">
      <div class="chip-grid">${sympRows}</div>
    </div>` : ''}

    <div class="insight-card" style="margin-top:.75rem;border-left:3px solid var(--border)">
      <h3>How to use these numbers</h3>
      <div class="insight-body">
        These percentages are descriptive, not diagnostic. A high correlation is a signal worth investigating — share this log with your pediatric gastroenterologist or allergist. They can order a targeted celiac panel (tTG-IgA, DGP-IgG) or design a supervised elimination diet based on the patterns you see here.
      </div>
    </div>
    <div style="height:.5rem"></div>
  `;
}

// ── Settings helpers ────────────────────────────────────
function updateSettingsDisplay() {
  document.getElementById('cfg-repo-display').textContent =
    CFG.user ? `${CFG.user}/${CFG.repo}` : '—';
  document.getElementById('cfg-count-display').textContent =
    `${journal.length} entr${journal.length === 1 ? 'y' : 'ies'}`;

  const raw = localStorage.getItem('diario_last_sync');
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

// ── Util ────────────────────────────────────────────────
function typeName(t) {
  const m = { breakfast:'Breakfast', snack:'Snack', snack2:'Snack', lunch:'Lunch', dinner:'Dinner', other:'Other' };
  return m[t] || t;
}

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtDate(s) {
  if (!s) return '';
  const [y, mo, d] = s.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}
