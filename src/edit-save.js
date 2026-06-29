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
  meals.sort(mealTimeCompare);

  const savedEntry = journal.find(e => e.date === date);
  const reactions = [];
  document.querySelectorAll('#reactions-container .meal-card').forEach(card => {
    const mealId = card.querySelector('.ep-meal').value;
    let label = '';
    if (mealId.startsWith('saved:')) {
      const idx = parseInt(mealId.slice(6));
      if (savedEntry && savedEntry.meals && savedEntry.meals[idx]) {
        const m = savedEntry.meals[idx];
        label = mealLabel(m.type, m.time);
      }
    } else if (mealId) {
      const mealCard = document.getElementById(mealId);
      if (mealCard) {
        const mt = mealCard.querySelector('.ml-time').value;
        label = mealLabel(mealCard.querySelector('.meal-type-sel').value, mt);
      }
    }
    reactions.push({
      meal:    label,
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
      ex.meals = [...(ex.meals || []), ...entry.meals].sort(mealTimeCompare);
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
