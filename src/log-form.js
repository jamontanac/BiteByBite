// ── Log tab ─────────────────────────────────────────────
function initLogTab() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('e-date').value = today;

  populateDayOverview();

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

// Renders the config-driven controls in the Log tab: the day-overview selects,
// the symptom chips, and the severity buttons.
function populateDayOverview() {
  const blank = '<option value="">—</option>';
  const sel = (FORMCFG.day && FORMCFG.day.selects) || {};
  DAY_SELECT_KEYS.forEach(key => {
    const el = document.getElementById('e-' + key);
    if (el) el.innerHTML = blank + optionsHtml(sel[key] || []);
  });

  const chips = document.getElementById('symptom-chips');
  if (chips) {
    chips.innerHTML = (FORMCFG.symptoms || [])
      .map(s => `<span class="chip bad" data-v="${s.value}">${s.label}</span>`)
      .join('');
  }

  const sevRow = document.querySelector('.sev-row');
  if (sevRow) {
    sevRow.innerHTML = (FORMCFG.severity || [])
      .map(s => `<button class="sev-btn ${s.class || ''}" data-s="${s.value}" onclick="selectSev(this)">${s.label}</button>`)
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
        ${optionsHtml(FORMCFG.meals.selects.type)}
      </select>
      <button class="meal-remove" onclick="document.getElementById('${id}').remove(); updateMealSelect()">Remove</button>
    </div>
    <div class="f-row">
      <div class="f-group"><label>Time given</label><input type="time" class="ml-time" value="${hh}:${mm}"></div>
      <div class="f-group"><label>Source</label>
        <select class="ml-source">
          ${optionsHtml(FORMCFG.meals.selects.source)}
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
          ${optionsHtml(FORMCFG.meals.selects.heavy)}
        </select>
      </div>
      <div class="f-group"><label>Amount eaten</label>
        <select class="ml-amount">
          ${optionsHtml(FORMCFG.meals.selects.amount)}
        </select>
      </div>
    </div>
    <div class="toggle-group">
      <div class="toggle-row">
        <label class="tog"><input type="checkbox" class="ml-new" onchange="toggleNewFoodInput(this)"><span class="tog-track"></span></label>
        <div class="toggle-label">New food
          <small>Ingredient rarely or never eaten before</small>
        </div>
      </div>
      <div class="ml-new-food-row" style="display:none">
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
      <div class="ml-cooked-when-row" style="display:none">
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
      opts.push(`<option value="${card.id}">${mealLabel(type, time)}</option>`);
    });
  } else {
  // Meals already saved for this date (from a previous save earlier in the day)
  const date = document.getElementById('e-date') ? document.getElementById('e-date').value : '';
  const savedEntry = date ? journal.find(e => e.date === date) : null;
  if (savedEntry && savedEntry.meals && savedEntry.meals.length) {
    opts.push('<optgroup label="Already logged today">');
    savedEntry.meals.forEach((m, i) => {
      opts.push(`<option value="saved:${i}">${mealLabel(m.type, m.time)}</option>`);
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
      opts.push(`<option value="${card.id}">${mealLabel(type, time)}</option>`);
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
      <span class="episode-label">Vomiting episode</span>
      <button class="meal-remove" onclick="document.getElementById('${id}').remove()">Remove</button>
    </div>
    <div class="f-row">
      <div class="f-group"><label>Meal that triggered it</label>
        <select class="ep-meal"><option value="">— select meal —</option></select>
      </div>
      <div class="f-group"><label>Times vomited</label>
        <select class="ep-count">
          ${optionsHtml(FORMCFG.vomiting.selects.count)}
        </select>
      </div>
    </div>
    <div class="f-row">
      <div class="f-group"><label>Delay after meal</label>
        <select class="ep-delay">
          ${optionsHtml(FORMCFG.vomiting.selects.delay)}
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
