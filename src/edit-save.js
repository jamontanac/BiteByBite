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

// ── Meal card serialization ─────────────────────────────
// One descriptor drives BOTH directions (DOM ⇄ meal object) so each field is
// declared once. `freshFood`/`newFood` are checkboxes that reveal a sub-input
// whose value is only stored while that sub-row is active (see `sub`).
const MEAL_FIELDS = [
  { key: 'type',      sel: '.meal-type-sel', kind: 'value', def: 'breakfast' },
  { key: 'time',      sel: '.ml-time',       kind: 'value', def: '' },
  { key: 'source',    sel: '.ml-source',     kind: 'value', def: 'homemade' },
  { key: 'foods',     sel: '.ml-foods',      kind: 'text',  def: '' },
  { key: 'heavy',     sel: '.ml-heavy',      kind: 'value', def: 'light' },
  { key: 'amount',    sel: '.ml-amount',     kind: 'value', def: 'all' },
  { key: 'freshFood', sel: '.ml-fresh', kind: 'checked', defaultOn: true,
    sub: { key: 'cookedWhen',  sel: '.ml-cooked-when',   row: '.ml-cooked-when-row', activeWhen: false } },
  { key: 'newFood',   sel: '.ml-new',   kind: 'checked',
    sub: { key: 'newFoodName', sel: '.ml-new-food-name', row: '.ml-new-food-row',   activeWhen: true } },
  { key: 'gluten',    sel: '.ml-gluten', kind: 'checked' },
  { key: 'dairy',     sel: '.ml-dairy',  kind: 'checked' },
  { key: 'egg',       sel: '.ml-egg',    kind: 'checked' },
];

// Reads a meal object out of a meal card's DOM.
function mealFromCard(card) {
  const meal = {};
  for (const f of MEAL_FIELDS) {
    const el = card.querySelector(f.sel);
    if (f.kind === 'value')      meal[f.key] = el.value;
    else if (f.kind === 'text')  meal[f.key] = el.value.trim();
    else {                                       // checkbox
      meal[f.key] = el.checked;
      if (f.sub) {
        const active = el.checked === f.sub.activeWhen;
        meal[f.sub.key] = active ? card.querySelector(f.sub.sel).value.trim() : '';
      }
    }
  }
  return meal;
}

// Writes a meal object into a meal card's DOM (used when editing an entry).
function loadMealIntoCard(card, meal) {
  for (const f of MEAL_FIELDS) {
    const el = card.querySelector(f.sel);
    if (f.kind === 'value' || f.kind === 'text') {
      el.value = meal[f.key] || f.def;
    } else {                                     // checkbox
      // freshFood defaults to ON for legacy meals; every other box defaults OFF.
      el.checked = f.defaultOn ? (meal[f.key] !== false) : !!meal[f.key];
      if (f.sub && el.checked === f.sub.activeWhen) {
        card.querySelector(f.sub.row).style.display = 'block';
        card.querySelector(f.sub.sel).value = meal[f.sub.key] || '';
      }
    }
  }
}

// Reads a vomiting-episode object out of a reaction card. The "meal that
// triggered it" dropdown points at either a meal saved earlier today
// (`saved:<i>`) or a meal card currently in the form (by element id).
function reactionFromCard(card, savedEntry) {
  const mealId = card.querySelector('.ep-meal').value;
  let label = '';
  if (mealId.startsWith('saved:')) {
    const m = savedEntry && savedEntry.meals && savedEntry.meals[parseInt(mealId.slice(6))];
    if (m) label = mealLabel(m.type, m.time);
  } else if (mealId) {
    const mealCard = document.getElementById(mealId);
    if (mealCard) label = mealLabel(mealCard.querySelector('.meal-type-sel').value,
                                    mealCard.querySelector('.ml-time').value);
  }
  return {
    meal:    label,
    count:   card.querySelector('.ep-count').value,
    delay:   card.querySelector('.ep-delay').value,
    content: card.querySelector('.ep-content').value.trim(),
  };
}

function loadEntryIntoForm(entry) {
  document.getElementById('e-date').value = entry.date;
  DAY_SELECT_KEYS.forEach(k => { document.getElementById('e-' + k).value = entry[k] || ''; });

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
  const predefined = FORMCFG.symptoms.map(s => s.value).filter(v => v !== 'other');
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

// ── Save entry ──────────────────────────────────────────
async function saveEntry() {
  const date = document.getElementById('e-date').value;
  if (!date) { toast('Please pick a date', true); return; }

  const mealCards = document.querySelectorAll('#meals-container .meal-card');
  if (mealCards.length === 0) { toast('Add at least one meal', true); return; }

  const meals = [];
  mealCards.forEach(card => meals.push(mealFromCard(card)));
  meals.sort(mealTimeCompare);

  const savedEntry = journal.find(e => e.date === date);
  const reactions = [];
  document.querySelectorAll('#reactions-container .meal-card')
    .forEach(card => reactions.push(reactionFromCard(card, savedEntry)));

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
      ex.meals = [...(ex.meals || []), ...entry.meals].sort(mealTimeCompare);
      DAY_SELECT_KEYS.forEach(k => { if (entry[k]) ex[k] = entry[k]; });
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
    await saveToGitHub(buildCommitMessage(isEdit, date));
    updateSettingsDisplay();
    if (isEdit) {
      toast('Entry updated ✓');
      exitEditMode();
      resetLogForm();
      switchTab('history');
      document.getElementById('tab-history').scrollTop = 0;  // show newest entry, not where we were
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
