// NOTE: app.js uses `let` at the top level — those bindings are in the global
// lexical scope, NOT on window. Access them directly (journal, CFG, activeSev …)
// instead of window.journal, window.activeSev, etc.
// Use setJournal(...entries) to replace journal contents safely.

async function runSuite() {

// ════════════════════════════════════════════════════════
// 1. UTILITY FUNCTIONS
// ════════════════════════════════════════════════════════
await describe('typeName()', async () => {
  await it('maps breakfast',         () => expect(typeName('breakfast')).toBe('Breakfast'));
  await it('maps lunch',             () => expect(typeName('lunch')).toBe('Lunch'));
  await it('maps dinner',            () => expect(typeName('dinner')).toBe('Dinner'));
  await it('maps snack and snack2',  () => {
    expect(typeName('snack')).toBe('Snack');
    expect(typeName('snack2')).toBe('Snack');
  });
  await it('maps other',             () => expect(typeName('other')).toBe('Other'));
  await it('passes through unknown', () => expect(typeName('custom')).toBe('custom'));
});

await describe('fmtDate()', async () => {
  await it('returns empty string for empty input', () => expect(fmtDate('')).toBe(''));
  await it('formats a valid date string', () => {
    const r = fmtDate('2026-06-26');
    expect(r).toContain('2026');
    expect(r).toContain('June');
  });
});

await describe('fmtTime()', async () => {
  await it('converts midnight',   () => expect(fmtTime('00:00')).toBe('12:00 AM'));
  await it('converts noon',       () => expect(fmtTime('12:00')).toBe('12:00 PM'));
  await it('converts afternoon',  () => expect(fmtTime('13:30')).toBe('1:30 PM'));
  await it('converts morning',    () => expect(fmtTime('08:05')).toBe('8:05 AM'));
  await it('returns empty for empty input', () => expect(fmtTime('')).toBe(''));
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
    localStorage.setItem('diario_cfg', JSON.stringify({ user: 'a', repo: 'b' }));
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
    CFG = { user: 'jose', repo: 'BiteByBite', token: 'ghp_test' };
    saveCfg();
    const stored = JSON.parse(localStorage.getItem('diario_cfg'));
    expect(stored.user).toBe('jose');
    expect(stored.repo).toBe('BiteByBite');
  });
  await it('saveCfg round-trips correctly', () => {
    resetState();
    CFG = { user: 'u2', repo: 'r2', token: 'tok2' };
    saveCfg();
    expect(loadCfg()).toEqual(CFG);
  });
});


// ════════════════════════════════════════════════════════
// 4. LOGOUT
// ════════════════════════════════════════════════════════
await describe('doLogout()', async () => {
  await it('clears all localStorage keys', () => {
    resetState();
    localStorage.setItem('diario_cfg',       '{}');
    localStorage.setItem('diario_local',     '[]');
    localStorage.setItem('diario_last_sync', '0');
    mockConfirm(true);
    doLogout();
    expect(localStorage.getItem('diario_cfg')).toBeNull();
    expect(localStorage.getItem('diario_local')).toBeNull();
    expect(localStorage.getItem('diario_last_sync')).toBeNull();
    restoreConfirm();
  });
  await it('resets CFG, journal, ghSha', () => {
    resetState();
    CFG = { user: 'u', repo: 'r', token: 't' };
    setJournal(makeEntry());
    ghSha = 'sha-xyz';
    mockConfirm(true);
    doLogout();
    expect(Object.keys(CFG)).toHaveLength(0);
    expect(journal).toHaveLength(0);
    expect(ghSha).toBeNull();
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
    expect(document.getElementById('s-login').classList.contains('active')).toBeTruthy();
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
    expect(document.querySelectorAll('#meals-container .meal-card').length).toBe(1);
  });
  await it('each call adds one more card', () => {
    resetState();
    addMeal(); addMeal(); addMeal();
    expect(document.querySelectorAll('#meals-container .meal-card').length).toBe(3);
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
    expect(card.querySelector('.ml-new-food-name')).not.toBeNull();
  });
  await it('uses <label> wrappers for toggles (not divs)', () => {
    resetState();
    addMeal();
    const card = document.querySelector('#meals-container .meal-card');
    expect(card.querySelectorAll('label.tog').length).toBeGreaterThan(0);
    expect(card.querySelectorAll('div.tog').length).toBe(0);
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
    expect(mealCount).toBe(0);
    addMeal(); expect(mealCount).toBe(1);
    addMeal(); expect(mealCount).toBe(2);
  });
  await it('sets time input to a valid HH:MM value', () => {
    resetState();
    addMeal();
    const val = document.querySelector('#meals-container .ml-time').value;
    const [hh, mm] = val.split(':').map(Number);
    expect(hh >= 0 && hh <= 23).toBeTruthy();
    expect(mm >= 0 && mm <= 59).toBeTruthy();
  });
  await it('fresh food toggle is checked by default', () => {
    resetState();
    addMeal();
    const card = document.querySelector('#meals-container .meal-card');
    expect(card.querySelector('.ml-fresh').checked).toBeTruthy();
  });
  await it('cooked-when row is hidden by default', () => {
    resetState();
    addMeal();
    const card = document.querySelector('#meals-container .meal-card');
    expect(card.querySelector('.ml-cooked-when-row').style.display).toBe('none');
  });
});

await describe('updateMealSelect()', async () => {
  await it('populates ep-meal dropdown with current meals', () => {
    resetState();
    addMeal();
    addReactionEpisode();
    const epSel = document.querySelector('#reactions-container .ep-meal');
    // blank option + 1 meal option
    expect(epSel.options.length).toBe(2);
    expect(epSel.options[1].text).toContain('Breakfast');
  });
  await it('updates existing episode dropdowns when a new meal is added', () => {
    resetState();
    addReactionEpisode();
    const epSel = document.querySelector('#reactions-container .ep-meal');
    expect(epSel.options.length).toBe(1); // only blank
    addMeal();
    expect(epSel.options.length).toBe(2);
  });
  await it('removes meal from dropdown after card is removed', () => {
    resetState();
    addMeal();
    addReactionEpisode();
    const epSel = document.querySelector('#reactions-container .ep-meal');
    expect(epSel.options.length).toBe(2);
    document.querySelector('#meals-container .meal-card').querySelector('.meal-remove').click();
    expect(epSel.options.length).toBe(1);
  });
  await it('label reflects meal type after type change', () => {
    resetState();
    addMeal();
    const mealCard = document.querySelector('#meals-container .meal-card');
    mealCard.querySelector('.meal-type-sel').value = 'dinner';
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
    expect(document.querySelectorAll('#reactions-container .meal-card').length).toBe(1);
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
    expect(reactionCount).toBe(0);
    addReactionEpisode(); expect(reactionCount).toBe(1);
    addReactionEpisode(); expect(reactionCount).toBe(2);
  });
  await it('multiple episodes are independent', () => {
    resetState();
    addReactionEpisode(); addReactionEpisode();
    const eps = document.querySelectorAll('#reactions-container .meal-card');
    expect(eps.length).toBe(2);
    expect(eps[0].id).not.toBe(eps[1].id);
  });
  await it('remove button only removes that episode', () => {
    resetState();
    addReactionEpisode(); addReactionEpisode();
    document.querySelector('#reactions-container .meal-card').querySelector('.meal-remove').click();
    expect(document.querySelectorAll('#reactions-container .meal-card').length).toBe(1);
  });
});


// ════════════════════════════════════════════════════════
// 7. SYMPTOM CHIPS
// ════════════════════════════════════════════════════════
// Chip listeners are attached by the bootstrap's initLogTab() call.
// Do NOT call initLogTab() again here — duplicate listeners would double-toggle
// every click, leaving chips in the wrong state.
await describe('Symptom chips', async () => {
  resetState();

  await it('clicking a chip adds it to activeSymptoms', () => {
    resetChips();
    clickChip('bloating');
    expect(activeSymptoms.has('bloating')).toBeTruthy();
  });
  await it('clicking again removes it from activeSymptoms', () => {
    resetChips();
    clickChip('bloating'); clickChip('bloating');
    expect(activeSymptoms.has('bloating')).toBeFalsy();
  });
  await it('chip gets active class when selected', () => {
    resetChips();
    const chip = document.querySelector('.chip[data-v="gas"]');
    chip.classList.remove('active');
    clickChip('gas');
    expect(chip.classList.contains('active')).toBeTruthy();
  });
  await it('active class removed on second click', () => {
    resetChips();
    clickChip('rash'); clickChip('rash');
    expect(document.querySelector('.chip[data-v="rash"]').classList.contains('active')).toBeFalsy();
  });
  await it('multiple chips can be active simultaneously', () => {
    resetChips();
    clickChip('bloating'); clickChip('cramps'); clickChip('reflux');
    expect(activeSymptoms.size).toBe(3);
  });
  await it('"Other…" chip shows other-symptom-row', () => {
    resetChips();
    document.getElementById('other-symptom-row').style.display = 'none';
    clickChip('other');
    expect(document.getElementById('other-symptom-row').style.display).toBe('block');
  });
  await it('"Other…" chip hides row and clears input on second click', () => {
    resetChips();
    document.getElementById('e-symptom-other').value = 'some symptom';
    clickChip('other'); clickChip('other');
    expect(document.getElementById('other-symptom-row').style.display).toBe('none');
    expect(document.getElementById('e-symptom-other').value).toBe('');
  });
  await it('non-other chips do not affect other-symptom-row', () => {
    resetChips();
    document.getElementById('other-symptom-row').style.display = 'none';
    clickChip('cramps');
    expect(document.getElementById('other-symptom-row').style.display).toBe('none');
  });
});


// ════════════════════════════════════════════════════════
// 8. MEDICATION TOGGLE
// ════════════════════════════════════════════════════════
await describe('toggleMedInput()', async () => {
  await it('shows med-name-row when checked', () => {
    resetState();
    const cb = document.getElementById('e-meds');
    cb.checked = true; toggleMedInput(cb);
    expect(document.getElementById('med-name-row').style.display).toBe('block');
  });
  await it('hides med-name-row when unchecked', () => {
    resetState();
    const cb = document.getElementById('e-meds');
    cb.checked = false; toggleMedInput(cb);
    expect(document.getElementById('med-name-row').style.display).toBe('none');
  });
  await it('clears med-name input when unchecked', () => {
    resetState();
    document.getElementById('e-med-name').value = 'Amoxicillin 250mg';
    const cb = document.getElementById('e-meds');
    cb.checked = false; toggleMedInput(cb);
    expect(document.getElementById('e-med-name').value).toBe('');
  });
  await it('preserves med-name when checked', () => {
    resetState();
    document.getElementById('e-med-name').value = 'Ibuprofen 100mg';
    const cb = document.getElementById('e-meds');
    cb.checked = true; toggleMedInput(cb);
    expect(document.getElementById('e-med-name').value).toBe('Ibuprofen 100mg');
  });
});


// ════════════════════════════════════════════════════════
// 9. FRESH FOOD TOGGLE
// ════════════════════════════════════════════════════════
await describe('toggleFreshFoodInput()', async () => {
  await it('shows cooked-when row when unchecked (leftover)', () => {
    resetState(); addMeal();
    const card = document.querySelector('#meals-container .meal-card');
    const cb   = card.querySelector('.ml-fresh');
    cb.checked = false; toggleFreshFoodInput(cb);
    expect(card.querySelector('.ml-cooked-when-row').style.display).toBe('block');
  });
  await it('hides cooked-when row when re-checked (fresh)', () => {
    resetState(); addMeal();
    const card = document.querySelector('#meals-container .meal-card');
    const cb   = card.querySelector('.ml-fresh');
    cb.checked = false; toggleFreshFoodInput(cb);
    cb.checked = true;  toggleFreshFoodInput(cb);
    expect(card.querySelector('.ml-cooked-when-row').style.display).toBe('none');
  });
  await it('clears cooked-when input when re-checked', () => {
    resetState(); addMeal();
    const card = document.querySelector('#meals-container .meal-card');
    const cb   = card.querySelector('.ml-fresh');
    cb.checked = false; toggleFreshFoodInput(cb);
    card.querySelector('.ml-cooked-when').value = 'yesterday evening';
    cb.checked = true;  toggleFreshFoodInput(cb);
    expect(card.querySelector('.ml-cooked-when').value).toBe('');
  });
  await it('preserves cooked-when text while unchecked', () => {
    resetState(); addMeal();
    const card = document.querySelector('#meals-container .meal-card');
    const cb   = card.querySelector('.ml-fresh');
    cb.checked = false; toggleFreshFoodInput(cb);
    card.querySelector('.ml-cooked-when').value = '2 days ago';
    expect(card.querySelector('.ml-cooked-when').value).toBe('2 days ago');
  });
});


// ════════════════════════════════════════════════════════
// 10. SEVERITY SELECTION
// ════════════════════════════════════════════════════════
await describe('selectSev()', async () => {
  await it('sets activeSev to clicked button value', () => {
    resetState();
    selectSev(document.querySelector('.sev-btn.s2'));
    expect(activeSev).toBe('2');
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
    selectSev(s1); selectSev(s2);
    expect(s1.classList.contains('active')).toBeFalsy();
    expect(s2.classList.contains('active')).toBeTruthy();
  });
  await it('activeSev updates when switching severity', () => {
    resetState();
    selectSev(document.querySelector('.sev-btn.s1')); expect(activeSev).toBe('1');
    selectSev(document.querySelector('.sev-btn.s3')); expect(activeSev).toBe('3');
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
    expect(journal).toHaveLength(0);
  });
  await it('rejects when no meals are present', async () => {
    resetState();
    document.getElementById('e-date').value = '2026-06-26';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal).toHaveLength(0);
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
    expect(journal).toHaveLength(1);
    expect(journal[0].date).toBe('2026-06-26');
  });
  await it('entry contains meals array', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(Array.isArray(journal[0].meals)).toBeTruthy();
    expect(journal[0].meals).toHaveLength(1);
  });
  await it('entry captures meal type and foods', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    const card = document.querySelector('#meals-container .meal-card');
    card.querySelector('.meal-type-sel').value = 'lunch';
    card.querySelector('.ml-foods').value      = 'rice and chicken';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].meals[0].type).toBe('lunch');
    expect(journal[0].meals[0].foods).toBe('rice and chicken');
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
    expect(journal[0].sleep).toBe('poor');
    expect(journal[0].mood).toBe('fussy');
    expect(journal[0].activity).toBe('low');
  });
  await it('entry captures boolean toggles', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    document.getElementById('e-newenv').checked = true;
    document.getElementById('e-sick').checked   = true;
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].newEnv).toBeTruthy();
    expect(journal[0].sick).toBeTruthy();
  });
  await it('entry captures medication name', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    document.getElementById('e-meds').checked   = true;
    document.getElementById('e-med-name').value = 'Amoxicillin 250mg';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].meds).toBeTruthy();
    expect(journal[0].medName).toBe('Amoxicillin 250mg');
  });
  await it('medName is empty when meds toggle is off', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    document.getElementById('e-meds').checked   = false;
    document.getElementById('e-med-name').value = 'ShouldBeIgnored';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].medName).toBe('');
  });
  await it('captures freshFood true by default', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].meals[0].freshFood).toBeTruthy();
    expect(journal[0].meals[0].cookedWhen).toBe('');
  });
  await it('captures freshFood false and cookedWhen when leftover', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    const card = document.querySelector('#meals-container .meal-card');
    const cb   = card.querySelector('.ml-fresh');
    cb.checked = false;
    card.querySelector('.ml-cooked-when').value = 'yesterday evening';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].meals[0].freshFood).toBeFalsy();
    expect(journal[0].meals[0].cookedWhen).toBe('yesterday evening');
  });
  await it('cookedWhen is empty when food is fresh', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    const card = document.querySelector('#meals-container .meal-card');
    card.querySelector('.ml-cooked-when').value = 'should be ignored';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].meals[0].cookedWhen).toBe('');
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
    expect(journal[0].reactions).toHaveLength(1);
    expect(journal[0].reactions[0].count).toBe('2');
    expect(journal[0].reactions[0].delay).toBe('30-60m');
    expect(journal[0].reactions[0].content).toBe('full breakfast');
  });
  await it('resets form after save', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    document.getElementById('e-sleep').value = 'great';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(document.getElementById('e-sleep').value).toBe('');
  });
});


// ════════════════════════════════════════════════════════
// 12. SAVE ENTRY — SYMPTOMS
// Directly manipulate activeSymptoms — do NOT call initLogTab() here,
// as the bootstrap already attached listeners and calling it again doubles them.
// ════════════════════════════════════════════════════════
await describe('saveEntry() – symptoms', async () => {
  await it('saves active chips to symptoms array', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    activeSymptoms.add('bloating');
    activeSymptoms.add('cramps');
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].symptoms).toContain('bloating');
    expect(journal[0].symptoms).toContain('cramps');
  });
  await it('replaces "other" token with typed text', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    activeSymptoms.add('other');
    document.getElementById('e-symptom-other').value = 'hives on lower back';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].symptoms).toContain('hives on lower back');
    expect(journal[0].symptoms).not.toContain('other');
  });
  await it('keeps "other" label when no text provided', async () => {
    resetState();
    setupMinimalForm('2026-06-26');
    activeSymptoms.add('other');
    document.getElementById('e-symptom-other').value = '';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].symptoms).toContain('other');
  });
});


// ════════════════════════════════════════════════════════
// 13. MERGE — MEALS
// ════════════════════════════════════════════════════════
await describe('saveEntry() merge – meals', async () => {
  await it('appends new meals to existing entry', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', meals: [
      { type:'breakfast', time:'08:00', source:'homemade', foods:'oatmeal',
        heavy:'light', amount:'all', newFood:false, newFoodName:'', gluten:false, dairy:false, egg:false }
    ]}));
    setupMinimalForm('2026-06-26');
    document.querySelector('#meals-container .meal-type-sel').value = 'lunch';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].meals).toHaveLength(2);
    expect(journal[0].meals[0].type).toBe('breakfast');
    expect(journal[0].meals[1].type).toBe('lunch');
  });
  await it('preserves original meals', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26' }));
    setupMinimalForm('2026-06-26');
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].meals).toHaveLength(2);
  });
});


// ════════════════════════════════════════════════════════
// 14. MERGE — DAY OVERVIEW
// ════════════════════════════════════════════════════════
await describe('saveEntry() merge – day overview', async () => {
  await it('does NOT overwrite sleep when new value is empty', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', sleep: 'poor' }));
    setupMinimalForm('2026-06-26');
    document.getElementById('e-sleep').value = '';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].sleep).toBe('poor');
  });
  await it('overwrites sleep when new value is filled in', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', sleep: 'poor' }));
    setupMinimalForm('2026-06-26');
    document.getElementById('e-sleep').value = 'great';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].sleep).toBe('great');
  });
  await it('does NOT overwrite mood when new value is empty', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', mood: 'happy' }));
    setupMinimalForm('2026-06-26');
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].mood).toBe('happy');
  });
  await it('overwrites stool when provided', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', stool: 'normal' }));
    setupMinimalForm('2026-06-26');
    document.getElementById('e-stool').value = 'soft';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].stool).toBe('soft');
  });
});


// ════════════════════════════════════════════════════════
// 15. MERGE — STICKY TOGGLES
// ════════════════════════════════════════════════════════
await describe('saveEntry() merge – sticky toggles', async () => {
  await it('newEnv stays true once set', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', newEnv: true }));
    setupMinimalForm('2026-06-26');
    document.getElementById('e-newenv').checked = false;
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].newEnv).toBeTruthy();
  });
  await it('sick is sticky', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', sick: true }));
    setupMinimalForm('2026-06-26');
    document.getElementById('e-sick').checked = false;
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].sick).toBeTruthy();
  });
  await it('meds is sticky and medName is updated', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', meds: true, medName: 'OldMed' }));
    setupMinimalForm('2026-06-26');
    document.getElementById('e-meds').checked   = true;
    document.getElementById('e-med-name').value = 'NewMed 5mg';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].meds).toBeTruthy();
    expect(journal[0].medName).toBe('NewMed 5mg');
  });
  await it('newEnv gets set to true from false', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', newEnv: false }));
    setupMinimalForm('2026-06-26');
    document.getElementById('e-newenv').checked = true;
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].newEnv).toBeTruthy();
  });
});


// ════════════════════════════════════════════════════════
// 16. MERGE — REACTIONS
// ════════════════════════════════════════════════════════
await describe('saveEntry() merge – reactions', async () => {
  await it('appends new episodes to existing ones', async () => {
    resetState();
    setJournal(makeEntry({
      date: '2026-06-26',
      reactions: [{ meal:'Breakfast · 8:00 AM', count:'1', delay:'<30m', content:'full breakfast' }]
    }));
    setupMinimalForm('2026-06-26');
    addReactionEpisode();
    const ep = document.querySelector('#reactions-container .meal-card');
    ep.querySelector('.ep-count').value   = '1';
    ep.querySelector('.ep-delay').value   = '1-2h';
    ep.querySelector('.ep-content').value = 'lunch residue';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].reactions).toHaveLength(2);
    expect(journal[0].reactions[0].delay).toBe('<30m');
    expect(journal[0].reactions[1].delay).toBe('1-2h');
  });
  await it('preserves original episode data', async () => {
    resetState();
    const original = { meal:'Breakfast · 8:00 AM', count:'2', delay:'30-60m', content:'cereal' };
    setJournal(makeEntry({ date: '2026-06-26', reactions: [original] }));
    setupMinimalForm('2026-06-26');
    const restore = mockSave();
    await saveEntry();
    restore();
    const first = journal[0].reactions[0];
    expect(first.count).toBe('2');
    expect(first.content).toBe('cereal');
  });
  await it('no episodes added when container is empty', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', reactions: [{ meal:'Lunch', count:'1', delay:'1-2h', content:'pasta' }] }));
    setupMinimalForm('2026-06-26');
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].reactions).toHaveLength(1);
  });
});


// ════════════════════════════════════════════════════════
// 17. MERGE — SYMPTOMS & SEVERITY
// ════════════════════════════════════════════════════════
await describe('saveEntry() merge – symptoms & severity', async () => {
  await it('merges symptoms as a union (no duplicates)', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', symptoms: ['bloating', 'gas'] }));
    setupMinimalForm('2026-06-26');
    activeSymptoms.add('cramps');
    activeSymptoms.add('bloating'); // already present
    const restore = mockSave();
    await saveEntry();
    restore();
    const s = journal[0].symptoms;
    expect(s).toContain('bloating');
    expect(s).toContain('gas');
    expect(s).toContain('cramps');
    expect(s.filter(x => x === 'bloating').length).toBe(1);
  });
  await it('takes highest severity', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', severity: '2' }));
    setupMinimalForm('2026-06-26');
    selectSev(document.querySelector('.sev-btn.s3'));
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].severity).toBe('3');
  });
  await it('keeps existing severity when new is lower', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', severity: '3' }));
    setupMinimalForm('2026-06-26');
    selectSev(document.querySelector('.sev-btn.s1'));
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].severity).toBe('3');
  });
});


// ════════════════════════════════════════════════════════
// 18. MERGE — NOTES
// ════════════════════════════════════════════════════════
await describe('saveEntry() merge – notes', async () => {
  await it('appends new notes with a newline', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', notes: 'Morning note' }));
    setupMinimalForm('2026-06-26');
    document.getElementById('e-notes').value = 'Evening note';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].notes).toContain('Morning note');
    expect(journal[0].notes).toContain('Evening note');
    expect(journal[0].notes).toContain('\n');
  });
  await it('preserves existing notes when new notes are empty', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', notes: 'Keep this' }));
    setupMinimalForm('2026-06-26');
    document.getElementById('e-notes').value = '';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].notes).toBe('Keep this');
  });
  await it('sets notes on first note for the day', async () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26', notes: '' }));
    setupMinimalForm('2026-06-26');
    document.getElementById('e-notes').value = 'First note ever';
    const restore = mockSave();
    await saveEntry();
    restore();
    expect(journal[0].notes).toBe('First note ever');
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
    ['e-newenv','e-sick','e-meds'].forEach(id => { document.getElementById(id).checked = true; });
    resetLogForm();
    ['e-newenv','e-sick','e-meds'].forEach(id => {
      expect(document.getElementById(id).checked).toBeFalsy();
    });
  });
  await it('clears meals-container and adds one fresh meal', () => {
    resetState();
    addMeal(); addMeal(); addMeal();
    resetLogForm();
    expect(document.querySelectorAll('#meals-container .meal-card').length).toBe(1);
  });
  await it('clears reactions-container', () => {
    resetState();
    addReactionEpisode(); addReactionEpisode();
    resetLogForm();
    expect(document.querySelectorAll('#reactions-container .meal-card').length).toBe(0);
  });
  await it('resets reactionCount to 0', () => {
    resetState();
    addReactionEpisode(); addReactionEpisode();
    resetLogForm();
    expect(reactionCount).toBe(0);
  });
  await it('hides med-name-row and clears input', () => {
    resetState();
    document.getElementById('e-med-name').value          = 'SomeMed';
    document.getElementById('med-name-row').style.display = 'block';
    resetLogForm();
    expect(document.getElementById('med-name-row').style.display).toBe('none');
    expect(document.getElementById('e-med-name').value).toBe('');
  });
  await it('hides other-symptom-row and clears input', () => {
    resetState();
    document.getElementById('e-symptom-other').value          = 'custom';
    document.getElementById('other-symptom-row').style.display = 'block';
    resetLogForm();
    expect(document.getElementById('other-symptom-row').style.display).toBe('none');
    expect(document.getElementById('e-symptom-other').value).toBe('');
  });
  await it('clears activeSymptoms', () => {
    resetState();
    activeSymptoms.add('bloating'); activeSymptoms.add('gas');
    resetLogForm();
    expect(activeSymptoms.size).toBe(0);
  });
  await it('clears activeSev', () => {
    resetState();
    activeSev = '3';
    resetLogForm();
    expect(activeSev).toBe('');
  });
  await it('sets date to today', () => {
    resetState();
    document.getElementById('e-date').value = '2020-01-01';
    resetLogForm();
    expect(document.getElementById('e-date').value).toBe(new Date().toISOString().slice(0, 10));
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
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('No entries');
  });
  await it('renders entry date', () => {
    resetState();
    setJournal(makeEntry({ date: '2026-06-26' }));
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('2026');
  });
  await it('shows ✓ No vomiting when no reactions', () => {
    resetState();
    setJournal(makeEntry({ reactions: [] }));
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('No vomiting');
  });
  await it('shows vomited tag with episode count', () => {
    resetState();
    setJournal(makeEntry({
      reactions: [
        { meal:'Breakfast · 8:00 AM', count:'1', delay:'<30m', content:'cereal' },
        { meal:'Lunch · 12:30 PM',    count:'1', delay:'1-2h', content:'residue' }
      ]
    }));
    renderHistory();
    const html = document.getElementById('history-list').innerHTML;
    expect(html).toContain('2 episodes');
    expect(html).toContain('Breakfast');
    expect(html).toContain('Lunch');
  });
  await it('backward-compat: renders old vomit format', () => {
    resetState();
    setJournal(makeEntry({
      vomit: '1', delay: '30-60m', mealVomited: 'Lunch · 12:00',
      vomitContent: 'pasta residue'
    }));
    renderHistory();
    const html = document.getElementById('history-list').innerHTML;
    expect(html).toContain('Vomited');
    expect(html).toContain('Lunch');
  });
  await it('shows medication tag with name', () => {
    resetState();
    setJournal(makeEntry({ meds: true, medName: 'Amoxicillin' }));
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('Amoxicillin');
  });
  await it('shows medication tag without name if medName empty', () => {
    resetState();
    setJournal(makeEntry({ meds: true, medName: '' }));
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('Medication');
  });
  await it('shows notes', () => {
    resetState();
    setJournal(makeEntry({ notes: 'Follow up with doctor' }));
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('Follow up with doctor');
  });
  await it('shows severity tag', () => {
    resetState();
    setJournal(makeEntry({ severity: '3' }));
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('Severe day');
  });
  await it('shows new food tag with ingredient name', () => {
    resetState();
    setJournal(makeEntry({
      meals: [{ type:'breakfast', time:'08:00', source:'homemade', foods:'mango',
                heavy:'light', amount:'all', newFood:true, newFoodName:'mango',
                gluten:false, dairy:false, egg:false }]
    }));
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('mango');
  });
  await it('shows Leftover food tag when a meal has freshFood false', () => {
    resetState();
    setJournal(makeEntry({
      meals: [{ type:'lunch', time:'12:00', source:'homemade', foods:'pasta',
                heavy:'moderate', amount:'all', freshFood:false, cookedWhen:'yesterday',
                newFood:false, newFoodName:'', gluten:false, dairy:false, egg:false }]
    }));
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('Leftover food');
  });
  await it('shows cookedWhen text in meal row', () => {
    resetState();
    setJournal(makeEntry({
      meals: [{ type:'lunch', time:'12:00', source:'homemade', foods:'pasta',
                heavy:'moderate', amount:'all', freshFood:false, cookedWhen:'2 days ago',
                newFood:false, newFoodName:'', gluten:false, dairy:false, egg:false }]
    }));
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('2 days ago');
  });
  await it('no leftover tag when all meals are fresh', () => {
    resetState();
    setJournal(makeEntry({
      meals: [{ type:'breakfast', time:'08:00', source:'homemade', foods:'eggs',
                heavy:'light', amount:'all', freshFood:true, cookedWhen:'',
                newFood:false, newFoodName:'', gluten:false, dairy:false, egg:true }]
    }));
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).not.toContain('Leftover food');
  });
  await it('old entries without freshFood field show no leftover tag', () => {
    resetState();
    setJournal(makeEntry({
      meals: [{ type:'breakfast', time:'08:00', source:'homemade', foods:'oatmeal',
                heavy:'light', amount:'all', newFood:false, newFoodName:'',
                gluten:false, dairy:false, egg:false }]  // no freshFood field
    }));
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).not.toContain('Leftover food');
  });
  await it('renders entries in descending date order', () => {
    resetState();
    setJournal(makeEntry({ date:'2026-06-26' }), makeEntry({ date:'2026-06-25' }));
    renderHistory();
    const html = document.getElementById('history-list').innerHTML;
    expect(html.indexOf('June 26') < html.indexOf('June 25')).toBeTruthy();
  });
  await it('shows symptoms bar', () => {
    resetState();
    setJournal(makeEntry({ symptoms: ['bloating', 'cramps'] }));
    renderHistory();
    expect(document.getElementById('history-list').innerHTML).toContain('bloating');
  });
});


// ════════════════════════════════════════════════════════
// 21. renderPatterns()
// ════════════════════════════════════════════════════════
await describe('renderPatterns()', async () => {
  await it('shows empty state with < 2 entries', () => {
    resetState();
    setJournal(makeEntry());
    renderPatterns();
    expect(document.getElementById('patterns-content').innerHTML).toContain('2 days');
  });
  await it('shows total days logged', () => {
    resetState();
    setJournal(makeEntry({ date:'2026-06-26' }), makeEntry({ date:'2026-06-25' }));
    renderPatterns();
    expect(document.getElementById('patterns-content').innerHTML).toContain('2');
  });
  await it('counts vomit days (new reaction format)', () => {
    resetState();
    setJournal(
      makeEntry({ date:'2026-06-26', reactions:[{ meal:'Breakfast', count:'1', delay:'<30m', content:'' }] }),
      makeEntry({ date:'2026-06-25', reactions:[] })
    );
    renderPatterns();
    expect(document.getElementById('patterns-content').innerHTML).toContain('50%');
  });
  await it('counts vomit days (old vomit format)', () => {
    resetState();
    setJournal(
      makeEntry({ date:'2026-06-26', vomit:'1' }),
      makeEntry({ date:'2026-06-25', vomit:'none' })
    );
    renderPatterns();
    expect(document.getElementById('patterns-content').innerHTML).toContain('50%');
  });
  await it('shows 0% when all days clear', () => {
    resetState();
    setJournal(makeEntry({ date:'2026-06-26', reactions:[] }), makeEntry({ date:'2026-06-25', reactions:[] }));
    renderPatterns();
    expect(document.getElementById('patterns-content').innerHTML).toContain('0%');
  });
  await it('shows gluten correlation row', () => {
    resetState();
    setJournal(makeEntry({ date:'2026-06-26' }), makeEntry({ date:'2026-06-25' }));
    renderPatterns();
    expect(document.getElementById('patterns-content').innerHTML).toContain('Gluten');
  });
  await it('shows leftover food correlation row', () => {
    resetState();
    setJournal(makeEntry({ date:'2026-06-26' }), makeEntry({ date:'2026-06-25' }));
    renderPatterns();
    expect(document.getElementById('patterns-content').innerHTML).toContain('Leftover');
  });
  await it('leftover correlation only counts days with freshFood === false', () => {
    resetState();
    const leftoverMeal = { type:'lunch', time:'12:00', source:'homemade', foods:'pasta',
      heavy:'moderate', amount:'all', freshFood:false, cookedWhen:'yesterday',
      newFood:false, newFoodName:'', gluten:false, dairy:false, egg:false };
    const freshMeal = { type:'breakfast', time:'08:00', source:'homemade', foods:'oatmeal',
      heavy:'light', amount:'all', freshFood:true, cookedWhen:'',
      newFood:false, newFoodName:'', gluten:false, dairy:false, egg:false };
    setJournal(
      makeEntry({ date:'2026-06-26', meals:[leftoverMeal] }),
      makeEntry({ date:'2026-06-25', meals:[freshMeal] })
    );
    renderPatterns();
    // Only 1 of 2 days has leftover food — row should exist
    expect(document.getElementById('patterns-content').innerHTML).toContain('Leftover');
  });
  await it('old entries without freshFood field not counted as leftover', () => {
    resetState();
    const oldMeal = { type:'breakfast', time:'08:00', source:'homemade', foods:'oatmeal',
      heavy:'light', amount:'all', newFood:false, newFoodName:'',
      gluten:false, dairy:false, egg:false }; // no freshFood field
    setJournal(
      makeEntry({ date:'2026-06-26', meals:[oldMeal] }),
      makeEntry({ date:'2026-06-25', meals:[oldMeal] })
    );
    renderPatterns();
    // 0 leftover days — correlation row shows "0 of 0 days"
    const html = document.getElementById('patterns-content').innerHTML;
    expect(html).toContain('Leftover');
    expect(html).toContain('0 of 0');
  });
});

} // end runSuite
