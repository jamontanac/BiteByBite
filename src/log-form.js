// ── Log tab ─────────────────────────────────────────────
function initLogTab() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('e-date').value = today;

  populateDayOverview();
  attachChipListeners();

  document.getElementById('e-date').addEventListener('change', updateMealSelect);

  if (document.getElementById('meals-container').children.length === 0) addMeal();
}

// Attaches click handlers to the symptom chips (called after they're rendered).
function attachChipListeners() {
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
}

// Renders the config-driven controls in the Log tab: the day-overview selects,
// the symptom chips, and the severity buttons.
function populateDayOverview() {
  const blank = '<option value="">—</option>';
  const sel = (FORMCFG.day && FORMCFG.day.selects) || {};
  DAY_SELECT_KEYS.forEach(key => {
    const el = document.getElementById('e-' + key);
    if (el) el.innerHTML = blank + optionsHtml(sel[key] || [], null, 'opt.' + key);
  });

  const chips = document.getElementById('symptom-chips');
  if (chips) {
    chips.innerHTML = (FORMCFG.symptoms || [])
      .map(s => `<span class="chip bad" data-v="${s.value}">${optLabel('opt.symptom', s)}</span>`)
      .join('');
  }

  const sevRow = document.querySelector('.sev-row');
  if (sevRow) {
    sevRow.innerHTML = (FORMCFG.severity || [])
      .map(s => `<button class="sev-btn ${s.class || ''}" data-s="${s.value}" onclick="selectSev(this)">${optLabel('opt.severity', s)}</button>`)
      .join('');
  }
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
      <select class="meal-type-sel" onchange="updateMealSelect()">
        ${optionsHtml(FORMCFG.meals.selects.type, null, 'opt.mealType')}
      </select>
      <button class="meal-remove" onclick="document.getElementById('${id}').remove(); updateMealSelect()">${t('meal.remove')}</button>
    </div>
    <div class="f-row">
      <div class="f-group"><label>${t('meal.time')}</label><input type="time" class="ml-time" value="${hh}:${mm}"></div>
      <div class="f-group"><label>${t('meal.source')}</label>
        <select class="ml-source">
          ${optionsHtml(FORMCFG.meals.selects.source, null, 'opt.source')}
        </select>
      </div>
    </div>
    <div class="f-row full">
      <div class="f-group"><label>${t('meal.foods')}</label>
        <textarea class="ml-foods" placeholder="${t('meal.foodsPh')}" rows="2"></textarea>
      </div>
    </div>
    <div class="f-row">
      <div class="f-group"><label>${t('meal.heavy')}</label>
        <select class="ml-heavy">
          ${optionsHtml(FORMCFG.meals.selects.heavy, null, 'opt.heavy')}
        </select>
      </div>
      <div class="f-group"><label>${t('meal.amount')}</label>
        <select class="ml-amount">
          ${optionsHtml(FORMCFG.meals.selects.amount, null, 'opt.amount')}
        </select>
      </div>
    </div>
    <div class="toggle-group">
      <div class="toggle-row">
        <label class="tog"><input type="checkbox" class="ml-new" onchange="toggleNewFoodInput(this)"><span class="tog-track"></span></label>
        <div class="toggle-label">${t('meal.newFood')}
          <small>${t('meal.newFoodHint')}</small>
        </div>
      </div>
      <div class="ml-new-food-row" style="display:none">
        <div class="f-group">
          <label>${t('meal.newIngredient')}</label>
          <input type="text" class="ml-new-food-name" placeholder="${t('meal.newIngredientPh')}" autocomplete="off">
        </div>
      </div>
      <div class="toggle-row">
        <label class="tog"><input type="checkbox" class="ml-fresh" checked onchange="toggleFreshFoodInput(this)"><span class="tog-track"></span></label>
        <div class="toggle-label">${t('meal.fresh')}
          <small>${t('meal.freshHint')}</small>
        </div>
      </div>
      <div class="ml-cooked-when-row" style="display:none">
        <div class="f-group">
          <label>${t('meal.cookedWhen')}</label>
          <input type="text" class="ml-cooked-when" placeholder="${t('meal.cookedWhenPh')}" autocomplete="off">
        </div>
      </div>
      <div class="toggle-row">
        <label class="tog"><input type="checkbox" class="ml-gluten"><span class="tog-track"></span></label>
        <div class="toggle-label">${t('meal.gluten')}
          <small>${t('meal.glutenHint')}</small>
        </div>
      </div>
      <div class="toggle-row">
        <label class="tog"><input type="checkbox" class="ml-dairy"><span class="tog-track"></span></label>
        <div class="toggle-label">${t('meal.dairy')}</div>
      </div>
      <div class="toggle-row">
        <label class="tog"><input type="checkbox" class="ml-egg"><span class="tog-track"></span></label>
        <div class="toggle-label">${t('meal.egg')}</div>
      </div>
    </div>
  `;
  document.getElementById('meals-container').appendChild(div);
  updateMealSelect();
}

function updateMealSelect() {
  const opts = [`<option value="">${t('rx.selectMeal')}</option>`];

  if (editIndex >= 0) {
    // Edit mode: form cards ARE the full day's meals — no separate saved-entry group
    document.querySelectorAll('#meals-container .meal-card').forEach(card => {
      const type = card.querySelector('.meal-type-sel').value;
      const time = card.querySelector('.ml-time').value;
      opts.push(`<option value="${card.id}" data-canon="${mealLabelCanonical(type, time)}">${mealLabel(type, time)}</option>`);
    });
  } else {
  // Meals already saved for this date (from a previous save earlier in the day)
  const date = document.getElementById('e-date') ? document.getElementById('e-date').value : '';
  const savedEntry = date ? journal.find(e => e.date === date) : null;
  if (savedEntry && savedEntry.meals && savedEntry.meals.length) {
    opts.push(`<optgroup label="${t('rx.alreadyLogged')}">`);
    savedEntry.meals.forEach((m, i) => {
      opts.push(`<option value="saved:${i}" data-canon="${mealLabelCanonical(m.type, m.time)}">${mealLabel(m.type, m.time)}</option>`);
    });
    opts.push('</optgroup>');
  }

  // Meals being added right now in the form
  const formMeals = document.querySelectorAll('#meals-container .meal-card');
  if (formMeals.length) {
    if (savedEntry && savedEntry.meals && savedEntry.meals.length) {
      opts.push(`<optgroup label="${t('rx.addingNow')}">`);
    }
    formMeals.forEach(card => {
      const type = card.querySelector('.meal-type-sel').value;
      const time = card.querySelector('.ml-time').value;
      opts.push(`<option value="${card.id}" data-canon="${mealLabelCanonical(type, time)}">${mealLabel(type, time)}</option>`);
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
      <span class="episode-label">${t('rx.title')}</span>
      <button class="meal-remove" onclick="document.getElementById('${id}').remove()">${t('meal.remove')}</button>
    </div>
    <div class="f-row">
      <div class="f-group"><label>${t('rx.meal')}</label>
        <select class="ep-meal"><option value="">${t('rx.selectMeal')}</option></select>
      </div>
      <div class="f-group"><label>${t('rx.count')}</label>
        <select class="ep-count">
          ${optionsHtml(FORMCFG.vomiting.selects.count, null, 'opt.count')}
        </select>
      </div>
    </div>
    <div class="f-row">
      <div class="f-group"><label>${t('rx.delay')}</label>
        <select class="ep-delay">
          ${optionsHtml(FORMCFG.vomiting.selects.delay, null, 'opt.delay')}
        </select>
      </div>
      <div class="f-group"><label>${t('rx.content')}</label>
        <input type="text" class="ep-content" placeholder="${t('rx.contentPh')}">
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

// Re-renders every config-driven Log-tab control (day-overview selects, symptom
// chips, severity buttons, and the meal & reaction cards) in the current
// language, preserving the user's in-progress data. Called by setLang().
function retranslateLogForm() {
  const chips = document.getElementById('symptom-chips');
  if (!chips) return;                       // log form not built yet

  // Capture current state BEFORE re-rendering anything (reactionFromCard reads
  // the meal cards, so grab both while they still exist).
  const dayVals = {};
  DAY_SELECT_KEYS.forEach(k => { const el = document.getElementById('e-' + k); if (el) dayVals[k] = el.value; });
  const sev  = activeSev;
  const syms = new Set(activeSymptoms);
  const date = document.getElementById('e-date') ? document.getElementById('e-date').value : '';
  const savedEntry = date ? journal.find(e => e.date === date) : null;
  const mealsData     = [...document.querySelectorAll('#meals-container .meal-card')].map(mealFromCard);
  const reactionsData = [...document.querySelectorAll('#reactions-container .meal-card')].map(c => reactionFromCard(c, savedEntry));

  // Day overview / chips / severity
  populateDayOverview();
  attachChipListeners();
  DAY_SELECT_KEYS.forEach(k => { const el = document.getElementById('e-' + k); if (el && dayVals[k] != null) el.value = dayVals[k]; });
  document.querySelectorAll('#symptom-chips .chip').forEach(c => { if (syms.has(c.dataset.v)) c.classList.add('active'); });
  document.querySelectorAll('.sev-btn').forEach(b => { if (b.dataset.s === sev) b.classList.add('active'); });

  // Meal & reaction cards — rebuild from the captured data so their dropdowns
  // pick up the new language while keeping every field the user entered.
  document.getElementById('reactions-container').innerHTML = ''; reactionCount = 0;
  document.getElementById('meals-container').innerHTML = '';     mealCount = 0;
  mealsData.forEach(m => {
    addMeal();
    const cards = document.querySelectorAll('#meals-container .meal-card');
    loadMealIntoCard(cards[cards.length - 1], m);
  });
  updateMealSelect();
  reactionsData.forEach(r => {
    addReactionEpisode();
    const cards  = document.querySelectorAll('#reactions-container .meal-card');
    const card   = cards[cards.length - 1];
    const epSel  = card.querySelector('.ep-meal');
    const stored = (r.meal || '').trim();
    for (const opt of epSel.options) {
      if ((opt.dataset.canon || '').trim() === stored || opt.text.trim() === stored) { epSel.value = opt.value; break; }
    }
    card.querySelector('.ep-count').value   = r.count   || '1';
    card.querySelector('.ep-delay').value   = r.delay   || '';
    card.querySelector('.ep-content').value = r.content || '';
  });
}
