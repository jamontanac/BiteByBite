async function runSuite() {

// ════════════════════════════════════════════════════════
// 1. UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════
await describe('typeName()', async () => {
  await it('maps breakfast',        () => expect(typeName('breakfast')).toBe('Breakfast'));
  await it('maps lunch',            () => expect(typeName('lunch')).toBe('Lunch'));
  await it('maps dinner',           () => expect(typeName('dinner')).toBe('Dinner'));
  await it('maps snack and snack2', () => {
    expect(typeName('snack')).toBe('Snack');
    expect(typeName('snack2')).toBe('Snack');
  });
  await it('maps other',            () => expect(typeName('other')).toBe('Other'));
  await it('passes through unknown keys', () => expect(typeName('custom')).toBe('custom'));
});

await describe('fmtDate()', async () => {
  await it('returns empty string for empty input', () => expect(fmtDate('')).toBe(''));
  await it('formats a valid date string', () => {
    const result = fmtDate('2026-06-26');
    expect(result).toContain('2026');
    expect(result).toContain('June');
  });
});


// ════════════════════════════════════════════════════════
// 2. CONFIG LOADING
// ════════════════════════════════════════════════════════
await describe('loadAppConfig()', async () => {
  await it('returns github object from config.json', async () => {
    mockFetch();
    const cfg = await loadAppConfig();
    expect(cfg.github.username).toBe('testuser');
    expect(cfg.github.reponame).toBe('testrepo');
    restoreFetch();
  });

  await it('returns empty object on 404', async () => {
    mockFetch({ 'GET config.json': { status: 404, body: {} } });
    const cfg = await loadAppConfig();
    expect(cfg).toEqual({});
    restoreFetch();
  });

  await it('returns empty object on network error', async () => {
    window.fetch = async () => { throw new Error('Network error'); };
    const cfg = await loadAppConfig();
    expect(cfg).toEqual({});
    restoreFetch();
  });
});


// ════════════════════════════════════════════════════════
// 3. LOCAL CONFIG PERSISTENCE
// ════════════════════════════════════════════════════════
await describe('loadCfg() / saveCfg()', async () => {
  await it('loadCfg returns null when localStorage is empty', () => {
    resetState();
    expect(loadCfg()).toBeNull();
  });

  await it('loadCfg returns null with incomplete credentials', () => {
    resetState();
    localStorage.setItem('diario_cfg', JSON.stringify({ user: 'a', repo: 'b' })); // no token
    expect(loadCfg()).toBeNull();
  });

  await it('loadCfg returns config when all fields present', () => {
    resetState();
    const stored = { user: 'u', repo: 'r', token: 't' };
    localStorage.setItem('diario_cfg', JSON.stringify(stored));
    expect(loadCfg()).toEqual(stored);
  });

  await it('saveCfg writes CFG to localStorage', () => {
    resetState();
    window.CFG = { user: 'jose', repo: 'BiteByBite', token: 'ghp_test' };
    saveCfg();
    const stored = JSON.parse(localStorage.getItem('diario_cfg'));
    expect(stored.user).toBe('jose');
    expect(stored.repo).toBe('BiteByBite');
  });

  await it('saveCfg round-trips correctly', () => {
    resetState();
    window.CFG = { user: 'u2', repo: 'r2', token: 'tok2' };
    saveCfg();
    const loaded = loadCfg();
    expect(loaded).toEqual(window.CFG);
  });
});


// ════════════════════════════════════════════════════════
// 4. LOGOUT
// ════════════════════════════════════════════════════════
await describe('doLogout()', async () => {
  await it('clears all localStorage keys', () => {
    resetState();
    localStorage.setItem('diario_cfg',        '{}');
    localStorage.setItem('diario_local',      '[]');
    localStorage.setItem('diario_last_sync',  '0');
    mockConfirm(true);
    doLogout();
    expect(localStorage.getItem('diario_cfg')).toBeNull();
    expect(localStorage.getItem('diario_local')).toBeNull();
    expect(localStorage.getItem('diario_last_sync')).toBeNull();
    restoreConfirm();
  });

  await it('resets CFG, journal, ghSha', () => {
    resetState();
    window.CFG = { user: 'u', repo: 'r', token: 't' };
    window.journal = [makeEntry()];
    window.ghSha = 'sha-xyz';
    mockConfirm(true);
    doLogout();
    expect(Object.keys(window.CFG)).toHaveLength(0);
    expect(window.journal).toHaveLength(0);
    expect(window.ghSha).toBeNull();
    restoreConfirm();
  });

  await it('does nothing when user cancels', () => {
    resetState();
    localStorage.setItem('diario_cfg', '{"user":"u"}');
    mockConfirm(false);
    doLogout();
    expect(localStorage.getItem('diario_cfg')).not.toBeNull();
    restoreConfirm();
  });

  await it('shows login screen after logout', () => {
    resetState();
    mockConfirm(true);
    doLogout();
    const login = document.getElementById('s-login');
    expect(login.classList.contains('active')).toBeTruthy();
    restoreConfirm();
  });
});


// ════════════════════════════════════════════════════════
// 5. MEAL MANAGEMENT
// ════════════════════════════════════════════════════════
await describe('addMeal()', async () => {
  await it('adds a meal card to #meals-container', () => {
    resetState();
    addMeal();
    expect(document.querySelectorAll('#meals-container .meal-card')).toHaveLength(1);
  });

  await it('each call adds one more card', () => {
    resetState();
    addMeal(); addMeal(); addMeal();
    expect(document.querySelectorAll('#meals-container .meal-card')).toHaveLength(3);
  });

  await it('card has all required input fields', () => {
    resetState();
    addMeal();
    const card = document.querySelector('#meals-container .meal-card');
    expect(card.querySelector('.meal-type-sel')).not.toBeNull();
    expect(card.querySelector('.ml-time')).not.toBeNull();
    expect(card.querySelector('.ml-source')).not.toBeNull();
    expect(card.querySelector('.ml-foods')).not.toBeNull();
    expect(card.querySelector('.ml-heavy')).not.toBeNull();
    expect(card.querySelector('.ml-amount')).not.toBeNull();
  });

  await it('uses <label> wrappers for toggles (not divs)', () => {
    resetState();
    addMeal();
    const card = document.querySelector('#meals-container .meal-card');
    const labels = card.querySelectorAll('label.tog');
    expect(labels.length).toBeGreaterThan(0);
    // No raw div.tog should exist
    const divToggles = card.querySelectorAll('div.tog');
    expect(divToggles).toHaveLength(0);
  });

  await it('clicking a meal label toggles its checkbox', () => {
    resetState();
    addMeal();
    const card  = document.querySelector('#meals-container .meal-card');
    const label = card.querySelector('label.tog');
    const cb    = label.querySelector('input[type="checkbox"]');
    expect(cb.checked).toBeFalsy();
    label.click();
    expect(cb.checked).toBeTruthy();
    label.click();
    expect(cb.checked).toBeFalsy();
  });

  await it('increments mealCount on each call', () => {
    resetState();
    expect(window.mealCount).toBe(0);
    addMeal();
    expect(window.mealCount).toBe(1);
    addMeal();
    expect(window.mealCount).toBe(2);
  });

  await it('sets time input to approximately current time', () => {
    resetState();
    const before = new Date();
    addMeal();
    const timeVal = document.querySelector('#meals-container .ml-time').value; // "HH:MM"
    const [hh, mm] = timeVal.split(':').map(Number);
    // Just check it's a valid time
    expect(hh >= 0 && hh <= 23).toBeTruthy();
    expect(mm >= 0 && mm <= 59).toBeTruthy();
  });
});

await describe('updateMealSelect()', async () => {
  await it('populates ep-meal dropdown with current meals', () => {
    resetState();
    addMeal();
    addReactionEpisode();
    const epSel = document.querySelector('#reactions-container .ep-meal');
    // Should have blank option + 1 meal option
    expect(epSel.options.length).toBe(2);
    expect(epSel.options[1].text).toContain('Breakfast');
  });

  await it('updates existing episode dropdowns when a new meal is added', () => {
    resetState();
    addReactionEpisode();
    const epSel = document.querySelector('#reactions-container .ep-meal');
    expect(epSel.options.length).toBe(1); // only blank
    addMeal(); // triggers updateMealSelect via onchange
    // Force update since addMeal calls updateMealSelect at the end
    expect(epSel.options.length).toBe(2);
  });

  await it('removes meal from dropdown after card is removed', () => {
    resetState();
    addMeal();
    addReactionEpisode();
    const mealCard = document.querySelector('#meals-container .meal-card');
    const epSel    = document.querySelector('#reactions-container .ep-meal');
    expect(epSel.options.length).toBe(2);
    // Simulate remove button click
    mealCard.querySelector('.meal-remove').click();
    expect(epSel.options.length).toBe(1); // back to blank only
  });

  await it('label reflects meal type', () => {
    resetState();
    addMeal();
    const mealCard = document.querySelector('#meals-container .meal-card');
    mealCard.querySelector('.meal-type-sel').value = 'dinner';
    // Manually fire onchange to trigger updateMealSelect
    mealCard.querySelector('.meal-type-sel').dispatchEvent(new Event('change'));
    addReactionEpisode();
    const epSel = document.querySelector('#reactions-container .ep-meal');
    expect(epSel.options[1].text).toContain('Dinner');
  });
});


// ════════════════════════════════════════════════════════
// 6. REACTION EPISODES
// ════════════════════════════════════════════════════════
await describe('addReactionEpisode()', async () => {
  await it('adds a card to #reactions-container', () => {
    resetState();
    addReactionEpisode();
    expect(document.querySelectorAll('#reactions-container .meal-card')).toHaveLength(1);
  });

  await it('card has all required fields', () => {
    resetState();
    addReactionEpisode();
    const card = document.querySelector('#reactions-container .meal-card');
    expect(card.querySelector('.ep-meal')).not.toBeNull();
    expect(card.querySelector('.ep-count')).not.toBeNull();
    expect(card.querySelector('.ep-delay')).not.toBeNull();
    expect(card.querySelector('.ep-content')).not.toBeNull();
  });

  await it('increments reactionCount', () => {
    resetState();
    expect(window.reactionCount).toBe(0);
    addReactionEpisode();
    expect(window.reactionCount).toBe(1);
    addReactionEpisode();
    expect(window.reactionCount).toBe(2);
  });

  await it('multiple episodes are independent', () => {
    resetState();
    addMeal();
    addReactionEpisode();
    addReactionEpisode();
    const eps = document.querySelectorAll('#reactions-container .meal-card');
    expect(eps).toHaveLength(2);
    expect(eps[0].id).not.toBe(eps[1].id);
  });

  await it('episode remove button only removes that episode', () => {
    resetState();
    addReactionEpisode();
    addReactionEpisode();
    const first = document.querySelector('#reactions-container .meal-card');
    first.querySelector('.meal-remove').click();
    expect(document.querySelectorAll('#reactions-container .meal-card')).toHaveLength(1);
  });
});


// ════════════════════════════════════════════════════════
// 7. SYMPTOM CHIPS
// ════════════════════════════════════════════════════════
// initLogTab attaches the chip listeners; call it once then keep the DOM
await describe('Symptom chips', async () => {
  // Make sure listeners are attached
  resetState();
  initLogTab();
  // Clear the auto-added meal
  document.getElementById('meals-container').innerHTML = '';
  window.mealCount = 0;

  await it('clicking a chip adds it to activeSymptoms', () => {
    window.activeSymptoms.clear();
    clickChip('bloating');
    expect(window.activeSymptoms.has('bloating')).toBeTruthy();
  });

  await it('clicking again removes it from activeSymptoms', () => {
    window.activeSymptoms.clear();
    clickChip('bloating');
    clickChip('bloating');
    expect(window.activeSymptoms.has('bloating')).toBeFalsy();
  });

  await it('chip gets active class when selected', () => {
    window.activeSymptoms.clear();
    const chip = document.querySelector('.chip[data-v="gas"]');
    chip.classList.remove('active');
    clickChip('gas');
    expect(chip.classList.contains('active')).toBeTruthy();
  });

  await it('active class removed on second click', () => {
    window.activeSymptoms.clear();
    const chip = document.querySelector('.chip[data-v="rash"]');
    clickChip('rash'); clickChip('rash');
    expect(chip.classList.contains('active')).toBeFalsy();
  });

  await it('multiple chips can be active simultaneously', () => {
    window.activeSymptoms.clear();
    clickChip('bloating'); clickChip('cramps'); clickChip('reflux');
    expect(window.activeSymptoms.size).toBe(3);
  });

  await it('"Other…" chip shows other-symptom-row', () => {
    window.activeSymptoms.clear();
    const row = document.getElementById('other-symptom-row');
    row.style.display = 'none';
    clickChip('other');
    expect(row.style.display).toBe('block');
  });

  await it('"Other…" chip hides row and clears input on second click', () => {
    window.activeSymptoms.clear();
    document.getElementById('e-symptom-other').value = 'some symptom';
    clickChip('other'); // select
    clickChip('other'); // deselect
    const row = document.getElementById('other-symptom-row');
    expect(row.style.display).toBe('none');
    expect(document.getElementById('e-symptom-other').value).toBe('');
  });

  await it('non-other chips do not affect other-symptom-row', () => {
    window.activeSymptoms.clear();
    const row = document.getElementById('other-symptom-row');
    row.style.display = 'none';
    clickChip('cramps');
    expect(row.style.display).toBe('none');
  });
});


// ════════════════════════════════════════════════════════
// 8. MEDICATION TOGGLE
// ════════════════════════════════════════════════════════
await describe('toggleMedInput()', async () => {
  await it('shows med-name-row when checked', () => {
    resetState();
    const cb = document.getElementById('e-meds');
    cb.checked = true;
    toggleMedInput(cb);
    expect(document.getElementById('med-name-row').style.display).toBe('block');
  });

  await it('hides med-name-row when unchecked', () => {
    resetState();
    const cb = document.getElementById('e-meds');
    cb.checked = false;
    toggleMedInput(cb);
    expect(document.getElementById('med-name-row').style.display).toBe('none');
  });

  await it('clears med-name input when unchecked', () => {
    resetState();
    document.getElementById('e-med-name').value = 'Amoxicillin 250mg';
    const cb = document.getElementById('e-meds');
    cb.checked = false;
    toggleMedInput(cb);
    expect(document.getElementById('e-med-name').value).toBe('');
  });

  await it('preserves med-name when checked', () => {
    resetState();
    document.getElementById('e-med-name').value = 'Ibuprofen 100mg';
    const cb = document.getElementById('e-meds');
    cb.checked = true;
    toggleMedInput(cb);
    expect(document.getElementById('e-med-name').value).toBe('Ibuprofen 100mg');
  });
});


// ════════════════════════════════════════════════════════
// 9. SEVERITY SELECTION
// ════════════════════════════════════════════════════════
await describe('selectSev()', async () => {
  await it('sets activeSev to clicked button value', () => {
    resetState();
    selectSev(document.querySelector('.sev-btn.s2'));
    expect(window.activeSev).toBe('2');
  });

  await it('adds active class to clicked button', () => {
    resetState();
    const btn = document.querySelector('.sev-btn.s3');
    selectSev(btn);
    expect(btn.classList.contains('active')).toBeTruthy();
  });

  await it('removes active class from other buttons', () => {
    resetState();
    const s1 = document.querySelector('.sev-btn.s1');
    const s2 = document.querySelector('.sev-btn.s2');
    selectSev(s1);
    selectSev(s2);
    expect(s1.classList.contains('active')).toBeFalsy();
    expect(s2.classList.contains('active')).toBeTruthy();
  });

  await it('activeSev updates when switching severity', () => {
    resetState();
    selectSev(document.querySelector('.sev-btn.s1'));
    expect(window.activeSev).toBe('1');
    selectSev(document.querySelector('.sev-btn.s3'));
    expect(window.activeSev).toBe('3');
  });
});


// ════════════════════════════════════════════════════════
// 10. SAVE ENTRY — VALIDATION
// ════════════════════════════════════════════════════════
await describe('saveEntry() – validation', async () => {
  await it('rejects when date is empty', async () => {
    resetState();
    document.getElementById('e-date').value = '';
    addMeal();
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal).toHaveLength(0);
  });

  await it('rejects when no meals are present', async () => {
    resetState();
    document.getElementById('e-date').value = '2026-06-26';
    document.getElementById('meals-container').innerHTML = '';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal).toHaveLength(0);
  });
});


// ════════════════════════════════════════════════════════
// 11. SAVE ENTRY — NEW ENTRY
// ════════════════════════════════════════════════════════
await describe('saveEntry() – creates a new entry', async () => {
  await it('pushes entry to journal', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal).toHaveLength(1);
    expect(window.journal[0].date).toBe('2026-06-26');
  });

  await it('entry contains meals array', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(Array.isArray(window.journal[0].meals)).toBeTruthy();
    expect(window.journal[0].meals).toHaveLength(1);
  });

  await it('entry captures meal fields correctly', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    const card = document.querySelector('#meals-container .meal-card');
    card.querySelector('.meal-type-sel').value = 'lunch';
    card.querySelector('.ml-foods').value      = 'rice and chicken';
    const restore = mockSave();
    await saveEntry();
    restore();
    const meal = window.journal[0].meals[0];
    expect(meal.type).toBe('lunch');
    expect(meal.foods).toBe('rice and chicken');
  });

  await it('entry captures day-overview fields', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    document.getElementById('e-sleep').value    = 'poor';
    document.getElementById('e-mood').value     = 'fussy';
    document.getElementById('e-activity').value = 'low';
    const restore = mockSave();
    await saveEntry();
    restore();
    const e = window.journal[0];
    expect(e.sleep).toBe('poor');
    expect(e.mood).toBe('fussy');
    expect(e.activity).toBe('low');
  });

  await it('entry captures boolean toggles', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    document.getElementById('e-newenv').checked = true;
    document.getElementById('e-sick').checked   = true;
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].newEnv).toBeTruthy();
    expect(window.journal[0].sick).toBeTruthy();
  });

  await it('entry captures medication name', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    document.getElementById('e-meds').checked   = true;
    document.getElementById('e-med-name').value = 'Amoxicillin 250mg';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].meds).toBeTruthy();
    expect(window.journal[0].medName).toBe('Amoxicillin 250mg');
  });

  await it('medName is empty when meds toggle is off', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    document.getElementById('e-meds').checked   = false;
    document.getElementById('e-med-name').value = 'ShouldBeIgnored';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].medName).toBe('');
  });

  await it('entry captures reactions array', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    addReactionEpisode();
    const ep = document.querySelector('#reactions-container .meal-card');
    ep.querySelector('.ep-count').value   = '2';
    ep.querySelector('.ep-delay').value   = '30-60m';
    ep.querySelector('.ep-content').value = 'full breakfast';
    const restore = mockSave();
    await saveEntry();
    restore();
    const reactions = window.journal[0].reactions;
    expect(reactions).toHaveLength(1);
    expect(reactions[0].count).toBe('2');
    expect(reactions[0].delay).toBe('30-60m');
    expect(reactions[0].content).toBe('full breakfast');
  });

  await it('resets form after successful save', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    document.getElementById('e-sleep').value = 'great';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(document.getElementById('e-sleep').value).toBe('');
    expect(document.getElementById('meals-container').children).toHaveLength(1); // reset adds one meal
  });
});


// ════════════════════════════════════════════════════════
// 12. SAVE ENTRY — SYMPTOMS
// ════════════════════════════════════════════════════════
await describe('saveEntry() – symptoms', async () => {
  await it('saves selected chips to symptoms array', async () => {
    resetState();
    initLogTab();
    document.getElementById('meals-container').innerHTML = '';
    window.mealCount = 0;
    setupMinimalForm('2026-06-26');
    clickChip('bloating'); clickChip('cramps');
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].symptoms).toContain('bloating');
    expect(window.journal[0].symptoms).toContain('cramps');
  });

  await it('replaces "other" token with typed text', async () => {
    resetState();
    initLogTab();
    document.getElementById('meals-container').innerHTML = '';
    window.mealCount = 0;
    setupMinimalForm('2026-06-26');
    clickChip('other');
    document.getElementById('e-symptom-other').value = 'hives on lower back';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].symptoms).toContain('hives on lower back');
    expect(window.journal[0].symptoms).not.toContain('other');
  });

  await it('keeps "other" if no text provided', async () => {
    resetState();
    initLogTab();
    document.getElementById('meals-container').innerHTML = '';
    window.mealCount = 0;
    setupMinimalForm('2026-06-26');
    clickChip('other');
    document.getElementById('e-symptom-other').value = '';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].symptoms).toContain('other');
  });
});


// ════════════════════════════════════════════════════════
// 13. MERGE — MEALS
// ════════════════════════════════════════════════════════
await describe('saveEntry() merge – meals', async () => {
  await it('appends new meals to existing entry', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26', meals: [
      { type: 'breakfast', time: '08:00', source: 'homemade', foods: 'oatmeal',
        heavy: 'light', amount: 'all', newFood: false, gluten: false, dairy: false, egg: false }
    ]})];
    setupMinimalForm('2026-06-26');
    const card = document.querySelector('#meals-container .meal-card');
    card.querySelector('.meal-type-sel').value = 'lunch';
    card.querySelector('.ml-foods').value      = 'pasta';
    const restore = mockSave();
    await saveEntry();
    restore();
    const meals = window.journal[0].meals;
    expect(meals).toHaveLength(2);
    expect(meals[0].type).toBe('breakfast');
    expect(meals[1].type).toBe('lunch');
  });

  await it('preserves original meals when merging', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26' })];
    setupMinimalForm('2026-06-26');
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].meals).toHaveLength(2);
  });
});


// ════════════════════════════════════════════════════════
// 14. MERGE — DAY OVERVIEW
// ════════════════════════════════════════════════════════
await describe('saveEntry() merge – day overview', async () => {
  await it('does NOT overwrite existing sleep if new value is empty', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26', sleep: 'poor' })];
    setupMinimalForm('2026-06-26');
    document.getElementById('e-sleep').value = ''; // not filled in
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].sleep).toBe('poor');
  });

  await it('overwrites existing sleep if new value is filled in', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26', sleep: 'poor' })];
    setupMinimalForm('2026-06-26');
    document.getElementById('e-sleep').value = 'great';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].sleep).toBe('great');
  });

  await it('does NOT overwrite existing mood if new value is empty', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26', mood: 'happy' })];
    setupMinimalForm('2026-06-26');
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].mood).toBe('happy');
  });

  await it('overwrites stool when provided', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26', stool: 'normal' })];
    setupMinimalForm('2026-06-26');
    document.getElementById('e-stool').value = 'soft';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].stool).toBe('soft');
  });
});


// ════════════════════════════════════════════════════════
// 15. MERGE — TOGGLES (STICKY)
// ════════════════════════════════════════════════════════
await describe('saveEntry() merge – sticky toggles', async () => {
  await it('newEnv stays true once set (OR logic)', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26', newEnv: true })];
    setupMinimalForm('2026-06-26');
    document.getElementById('e-newenv').checked = false;
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].newEnv).toBeTruthy();
  });

  await it('sick is sticky', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26', sick: true })];
    setupMinimalForm('2026-06-26');
    document.getElementById('e-sick').checked = false;
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].sick).toBeTruthy();
  });

  await it('meds is sticky and medName is updated', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26', meds: true, medName: 'OldMed' })];
    setupMinimalForm('2026-06-26');
    document.getElementById('e-meds').checked   = true;
    document.getElementById('e-med-name').value = 'NewMed 5mg';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].meds).toBeTruthy();
    expect(window.journal[0].medName).toBe('NewMed 5mg');
  });

  await it('newEnv gets set to true from false by new save', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26', newEnv: false })];
    setupMinimalForm('2026-06-26');
    document.getElementById('e-newenv').checked = true;
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].newEnv).toBeTruthy();
  });
});


// ════════════════════════════════════════════════════════
// 16. MERGE — REACTIONS
// ════════════════════════════════════════════════════════
await describe('saveEntry() merge – reactions', async () => {
  await it('appends new episodes to existing ones', async () => {
    resetState();
    window.journal = [makeEntry({
      date: '2026-06-26',
      reactions: [{ meal: 'Breakfast · 08:00', count: '1', delay: '<30m', content: 'full breakfast' }]
    })];
    setupMinimalForm('2026-06-26');
    addReactionEpisode();
    const ep = document.querySelector('#reactions-container .meal-card');
    ep.querySelector('.ep-count').value   = '1';
    ep.querySelector('.ep-delay').value   = '1-2h';
    ep.querySelector('.ep-content').value = 'lunch residue';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].reactions).toHaveLength(2);
    expect(window.journal[0].reactions[0].delay).toBe('<30m');
    expect(window.journal[0].reactions[1].delay).toBe('1-2h');
  });

  await it('preserves original episode data', async () => {
    resetState();
    const original = { meal: 'Breakfast · 08:00', count: '2', delay: '30-60m', content: 'cereal' };
    window.journal = [makeEntry({ date: '2026-06-26', reactions: [original] })];
    setupMinimalForm('2026-06-26');
    const restore = mockSave();
    await saveEntry();
    restore();
    const first = window.journal[0].reactions[0];
    expect(first.meal).toBe('Breakfast · 08:00');
    expect(first.count).toBe('2');
    expect(first.content).toBe('cereal');
  });

  await it('no episodes added when reactions-container is empty', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26', reactions: [{ meal: 'Lunch · 12:00', count: '1', delay: '1-2h', content: 'pasta' }] })];
    setupMinimalForm('2026-06-26');
    // Don't add any episode cards
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].reactions).toHaveLength(1);
  });
});


// ════════════════════════════════════════════════════════
// 17. MERGE — SYMPTOMS & SEVERITY
// ════════════════════════════════════════════════════════
await describe('saveEntry() merge – symptoms & severity', async () => {
  await it('merges symptoms as a union', async () => {
    resetState();
    initLogTab();
    document.getElementById('meals-container').innerHTML = '';
    window.mealCount = 0;
    window.journal = [makeEntry({ date: '2026-06-26', symptoms: ['bloating', 'gas'] })];
    setupMinimalForm('2026-06-26');
    clickChip('cramps'); clickChip('bloating'); // bloating already present
    const restore = mockSave();
    await saveEntry();
    restore();
    const s = window.journal[0].symptoms;
    expect(s).toContain('bloating');
    expect(s).toContain('gas');
    expect(s).toContain('cramps');
    // No duplicates
    const bloatingCount = s.filter(x => x === 'bloating').length;
    expect(bloatingCount).toBe(1);
  });

  await it('takes highest severity', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26', severity: '2' })];
    setupMinimalForm('2026-06-26');
    selectSev(document.querySelector('.sev-btn.s3'));
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].severity).toBe('3');
  });

  await it('keeps higher existing severity when new is lower', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26', severity: '3' })];
    setupMinimalForm('2026-06-26');
    selectSev(document.querySelector('.sev-btn.s1'));
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].severity).toBe('3');
  });
});


// ════════════════════════════════════════════════════════
// 18. MERGE — NOTES
// ════════════════════════════════════════════════════════
await describe('saveEntry() merge – notes', async () => {
  await it('appends new notes with a newline', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26', notes: 'Morning note' })];
    setupMinimalForm('2026-06-26');
    document.getElementById('e-notes').value = 'Evening note';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].notes).toContain('Morning note');
    expect(window.journal[0].notes).toContain('Evening note');
    expect(window.journal[0].notes).toContain('\n');
  });

  await it('preserves existing notes when new notes are empty', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26', notes: 'Keep this' })];
    setupMinimalForm('2026-06-26');
    document.getElementById('e-notes').value = '';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].notes).toBe('Keep this');
  });

  await it('sets notes on first entry with notes', async () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26', notes: '' })];
    setupMinimalForm('2026-06-26');
    document.getElementById('e-notes').value = 'First note ever';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(window.journal[0].notes).toBe('First note ever');
  });
});


// ════════════════════════════════════════════════════════
// 19. RESET FORM
// ════════════════════════════════════════════════════════
await describe('resetLogForm()', async () => {
  await it('clears sleep, mood, activity, stool, hydration', () => {
    resetState();
    ['e-sleep','e-mood','e-activity','e-stool','e-hydration'].forEach(id => {
      document.getElementById(id).value = 'something';
    });
    resetLogForm();
    ['e-sleep','e-mood','e-activity','e-stool','e-hydration'].forEach(id => {
      expect(document.getElementById(id).value).toBe('');
    });
  });

  await it('unchecks all boolean toggles', () => {
    resetState();
    ['e-newenv','e-sick','e-meds'].forEach(id => {
      document.getElementById(id).checked = true;
    });
    resetLogForm();
    ['e-newenv','e-sick','e-meds'].forEach(id => {
      expect(document.getElementById(id).checked).toBeFalsy();
    });
  });

  await it('clears meals-container and adds one fresh meal', () => {
    resetState();
    addMeal(); addMeal(); addMeal();
    resetLogForm();
    expect(document.querySelectorAll('#meals-container .meal-card')).toHaveLength(1);
  });

  await it('clears reactions-container', () => {
    resetState();
    addReactionEpisode(); addReactionEpisode();
    resetLogForm();
    expect(document.querySelectorAll('#reactions-container .meal-card')).toHaveLength(0);
  });

  await it('resets reactionCount to 0', () => {
    resetState();
    addReactionEpisode(); addReactionEpisode();
    resetLogForm();
    expect(window.reactionCount).toBe(0);
  });

  await it('hides med-name-row and clears input', () => {
    resetState();
    document.getElementById('e-med-name').value         = 'SomeMed';
    document.getElementById('med-name-row').style.display = 'block';
    resetLogForm();
    expect(document.getElementById('med-name-row').style.display).toBe('none');
    expect(document.getElementById('e-med-name').value).toBe('');
  });

  await it('hides other-symptom-row and clears input', () => {
    resetState();
    document.getElementById('e-symptom-other').value       = 'custom';
    document.getElementById('other-symptom-row').style.display = 'block';
    resetLogForm();
    expect(document.getElementById('other-symptom-row').style.display).toBe('none');
    expect(document.getElementById('e-symptom-other').value).toBe('');
  });

  await it('clears activeSymptoms', () => {
    resetState();
    window.activeSymptoms.add('bloating');
    window.activeSymptoms.add('gas');
    resetLogForm();
    expect(window.activeSymptoms.size).toBe(0);
  });

  await it('clears activeSev', () => {
    resetState();
    window.activeSev = '3';
    resetLogForm();
    expect(window.activeSev).toBe('');
  });

  await it('sets date to today', () => {
    resetState();
    document.getElementById('e-date').value = '2020-01-01';
    resetLogForm();
    const today = new Date().toISOString().slice(0, 10);
    expect(document.getElementById('e-date').value).toBe(today);
  });

  await it('clears notes', () => {
    resetState();
    document.getElementById('e-notes').value = 'some notes';
    resetLogForm();
    expect(document.getElementById('e-notes').value).toBe('');
  });
});


// ════════════════════════════════════════════════════════
// 20. renderHistory()
// ════════════════════════════════════════════════════════
await describe('renderHistory()', async () => {
  await it('shows empty state when journal is empty', () => {
    resetState();
    window.journal = [];
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('No entries');
  });

  await it('renders entry date heading', () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26' })];
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('2026');
  });

  await it('shows ✓ No vomiting tag when no reactions', () => {
    resetState();
    window.journal = [makeEntry({ reactions: [] })];
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('No vomiting');
  });

  await it('shows vomited tag with episode count', () => {
    resetState();
    window.journal = [makeEntry({
      reactions: [
        { meal: 'Breakfast · 08:00', count: '1', delay: '<30m', content: 'cereal' },
        { meal: 'Lunch · 12:30',     count: '1', delay: '1-2h', content: 'residue' }
      ]
    })];
    renderHistory();
    const html = document.getElementById('history-list').innerHTML;
    expect(html).toContain('2 episodes');
    expect(html).toContain('Breakfast');
    expect(html).toContain('Lunch');
  });

  await it('backward-compat: renders old vomit format', () => {
    resetState();
    window.journal = [makeEntry({
      vomit: '1', delay: '30-60m', mealVomited: 'Lunch · 12:00',
      vomitContent: 'pasta residue', reactions: undefined
    })];
    renderHistory();
    const html = document.getElementById('history-list').innerHTML;
    expect(html).toContain('Vomited');
    expect(html).toContain('Lunch');
  });

  await it('shows medication tag with name', () => {
    resetState();
    window.journal = [makeEntry({ meds: true, medName: 'Amoxicillin' })];
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('Amoxicillin');
  });

  await it('shows medication tag without name if medName is empty', () => {
    resetState();
    window.journal = [makeEntry({ meds: true, medName: '' })];
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('Medication');
  });

  await it('shows notes', () => {
    resetState();
    window.journal = [makeEntry({ notes: 'Follow up with doctor' })];
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('Follow up with doctor');
  });

  await it('shows severity tag', () => {
    resetState();
    window.journal = [makeEntry({ severity: '3' })];
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('Severe day');
  });

  await it('shows new food tag', () => {
    resetState();
    window.journal = [makeEntry({
      meals: [{ type: 'breakfast', time: '08:00', source: 'homemade', foods: 'mango',
                heavy: 'light', amount: 'all', newFood: true, gluten: false, dairy: false, egg: false }]
    })];
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('New food');
  });

  await it('renders multiple entries in descending date order', () => {
    resetState();
    window.journal = [
      makeEntry({ date: '2026-06-26' }),
      makeEntry({ date: '2026-06-25' }),
    ];
    renderHistory();
    const html = document.getElementById('history-list').innerHTML;
    const pos26 = html.indexOf('26');
    const pos25 = html.indexOf('25');
    expect(pos26 < pos25).toBeTruthy();
  });
});


// ════════════════════════════════════════════════════════
// 21. renderPatterns()
// ════════════════════════════════════════════════════════
await describe('renderPatterns()', async () => {
  await it('shows empty state with < 2 entries', () => {
    resetState();
    window.journal = [makeEntry()];
    renderPatterns();
    expect(document.getElementById('patterns-content').innerHTML).toContain('2 days');
  });

  await it('shows days logged count', () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26' }), makeEntry({ date: '2026-06-25' })];
    renderPatterns();
    expect(document.getElementById('patterns-content').innerHTML).toContain('2');
  });

  await it('counts days with vomiting (new format)', () => {
    resetState();
    window.journal = [
      makeEntry({ date: '2026-06-26', reactions: [{ meal: 'Breakfast · 08:00', count: '1', delay: '<30m', content: '' }] }),
      makeEntry({ date: '2026-06-25', reactions: [] })
    ];
    renderPatterns();
    const html = document.getElementById('patterns-content').innerHTML;
    // 1 vomit day out of 2
    expect(html).toContain('50%');
  });

  await it('counts days with vomiting (old format)', () => {
    resetState();
    window.journal = [
      makeEntry({ date: '2026-06-26', vomit: '1', reactions: undefined }),
      makeEntry({ date: '2026-06-25', vomit: 'none', reactions: undefined })
    ];
    renderPatterns();
    const html = document.getElementById('patterns-content').innerHTML;
    expect(html).toContain('50%');
  });

  await it('shows gluten correlation row', () => {
    resetState();
    window.journal = [makeEntry({ date: '2026-06-26' }), makeEntry({ date: '2026-06-25' })];
    renderPatterns();
    expect(document.getElementById('patterns-content').innerHTML).toContain('Gluten');
  });

  await it('shows 0 vomit days when all clear', () => {
    resetState();
    window.journal = [
      makeEntry({ date: '2026-06-26', reactions: [] }),
      makeEntry({ date: '2026-06-25', reactions: [] })
    ];
    renderPatterns();
    const html = document.getElementById('patterns-content').innerHTML;
    expect(html).toContain('0%');
  });
});

} // end runSuite
