// ── Node-runnable slice of the suite ────────────────────
// These describes need no real DOM: pure logic, plus render functions that only
// write innerHTML (a getElementById stub is enough). They run BOTH in the browser
// (tests/index.html calls runNodeSuite() before runSuite()) and headless in Node
// (tools/run-tests.js). Tests that build/query real DOM nodes — meal cards, chips,
// edit mode, saveEntry — stay in runSuite() until we add jsdom.
//
// To migrate a test here: move its describe out of runSuite() in suite.js into
// runNodeSuite() below, then confirm `node tools/run-tests.js` stays green.

async function runNodeSuite() {

// ════════════════════════════════════════════════════════
// UTILITY FUNCTIONS (pure)
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

await describe('buildCommitMessage()', async () => {
  await it('uses the "adding new entry" message when not editing', () => {
    expect(buildCommitMessage(false, '2026-06-26'))
      .toContain('Adding new entry to journal at: ');
  });
  await it('uses the "editing" message and includes the date when editing', () => {
    const msg = buildCommitMessage(true, '2026-06-26');
    expect(msg).toContain('Editing/Adding the entry for the date 2026-06-26 at: ');
  });
  await it('appends an ISO timestamp', () => {
    expect(buildCommitMessage(false, '2026-06-26'))
      .toContain('T'); // ISO timestamps separate date and time with "T"
  });
});


// ════════════════════════════════════════════════════════
// renderPatterns() – sleep influence (next-night)
// ════════════════════════════════════════════════════════
await describe('renderPatterns() – sleep influence', async () => {
  const dairyMeal = { type:'lunch', time:'12:00', source:'homemade', foods:'cheese',
    heavy:'light', amount:'all', freshFood:true, cookedWhen:'',
    newFood:false, newFoodName:'', gluten:false, dairy:true, egg:false };
  const eggMeal = { type:'lunch', time:'12:00', source:'homemade', foods:'egg',
    heavy:'light', amount:'all', freshFood:true, cookedWhen:'',
    newFood:false, newFoodName:'', gluten:false, dairy:false, egg:true };

  // Build consecutive-day entries from specs (oldest→newest), dates 2026-06-20…,
  // returned newest-first for setJournal to match the app's ordering.
  const build = specs => specs.map((s, i) => makeEntry({ date: '2026-06-' + (20 + i), ...s })).reverse();
  const html  = () => document.getElementById('patterns-content').innerHTML;

  await it('stays locked until 5 back-to-back day pairs', () => {
    resetState();
    // 3 consecutive days → only 2 usable pairs (< MIN_PAIRS)
    setJournal(...build([{ sleep:'great' }, { sleep:'poor' }, { sleep:'great' }]));
    renderPatterns();
    expect(html()).toContain('at least 5');
    expect(html()).toContain('you have 2');
  });

  await it('reports baseline and next-night dairy rate once unlocked', () => {
    resetState();
    setJournal(...build([
      { sleep:'',      meals:[dairyMeal] },  // 20: dairy day (never a "night")
      { sleep:'poor',  meals:[dairyMeal] },  // 21: night=poor, also a dairy day
      { sleep:'poor'  },                     // 22: night=poor
      { sleep:'great' },                     // 23
      { sleep:'great' },                     // 24
      { sleep:'great' },                     // 25
    ]));
    renderPatterns();
    const h = html();
    expect(h).toContain('5 back-to-back day pairs');
    expect(h).toContain('40%');              // baseline: 2 of 5 next-nights poor
    expect(h).toContain('After dairy');
    expect(h).toContain('2 of 2 nights poor');
    expect(h).toContain('100%');
  });

  await it('excludes nights with no sleep logged from the pairs', () => {
    resetState();
    // 6 consecutive days but day 24 has no sleep → its pair drops out → 4 pairs
    setJournal(...build([
      { sleep:'great' }, { sleep:'great' }, { sleep:'great' },
      { sleep:'great' }, { sleep:'' }, { sleep:'great' },
    ]));
    renderPatterns();
    expect(html()).toContain('you have 4');
  });

  await it('"After vomiting" counts both new reactions[] and legacy vomit', () => {
    resetState();
    setJournal(...build([
      { sleep:'',     reactions:[{ meal:'Breakfast', count:'1', delay:'<30m', content:'' }] }, // 20: vomiting (new)
      { sleep:'poor', vomit:'1' },                                                              // 21: night=poor, vomiting (legacy)
      { sleep:'poor' },                                                                          // 22: night=poor
      { sleep:'great' }, { sleep:'great' }, { sleep:'great' },                                   // 23,24,25
    ]));
    renderPatterns();
    const h = html();
    expect(h).toContain('After vomiting');
    expect(h).toContain('2 of 2 nights poor');
    expect(h).toContain('100%');
  });

  await it('marks a single-day exposure as not enough data', () => {
    resetState();
    setJournal(...build([
      { sleep:'',     meals:[eggMeal] },  // 20: the only egg day
      { sleep:'great' }, { sleep:'great' }, { sleep:'great' },
      { sleep:'great' }, { sleep:'great' },
    ]));
    renderPatterns();
    const h = html();
    expect(h).toContain('After egg');
    expect(h).toContain('not enough data yet');
  });

  await it('a missing calendar day breaks the pair (date-based, not array order)', () => {
    resetState();
    // Dairy day is 2026-06-22, but 06-23 is missing → 06-22 has no next-night and
    // must NOT be credited. Five other consecutive pairs still unlock the section.
    // If pairing went by array order, 06-22 would wrongly pair with 06-24.
    setJournal(
      makeEntry({ date:'2026-06-27', sleep:'great' }),
      makeEntry({ date:'2026-06-26', sleep:'great' }),
      makeEntry({ date:'2026-06-25', sleep:'poor'  }),
      makeEntry({ date:'2026-06-24', sleep:'great' }),
      // 2026-06-23 intentionally absent
      makeEntry({ date:'2026-06-22', sleep:'great', meals:[dairyMeal] }),
      makeEntry({ date:'2026-06-21', sleep:'great' }),
      makeEntry({ date:'2026-06-20', sleep:'great' }),
    );
    const section = renderSleepPatterns();
    expect(section).toContain('After dairy');
    expect(section).toContain('5 back-to-back day pairs');
    expect(section).not.toContain('100%');   // dairy is unpaired, so nothing hits 100%
  });

  await it('flags elevated (high), protective (low) and low-sample (muted) rows', () => {
    resetState();
    setJournal(...build([
      { sleep:'',      meals:[dairyMeal] },  // 20 dairy
      { sleep:'poor',  meals:[dairyMeal] },  // 21 dairy; night=poor
      { sleep:'poor',  newEnv:true },        // 22 away;  night=poor
      { sleep:'great', newEnv:true },        // 23 away;  night=great
      { sleep:'great', meals:[eggMeal] },    // 24 egg;   night=great
      { sleep:'poor' },                      // 25 plain; night=poor
      { sleep:'great' },                     // 26 night only
    ]));
    const section = renderSleepPatterns();
    expect(section).toContain('corr-pct high');   // dairy 100% vs 50% baseline
    expect(section).toContain('corr-pct low');    // away 0% (below baseline)
    expect(section).toContain('corr-pct muted');  // egg is a single day
  });

  await it('renders alongside correlations, timing and symptoms', () => {
    resetState();
    setJournal(...build([
      { sleep:'', reactions:[{ meal:'Breakfast', count:'1', delay:'<30m', content:'' }], symptoms:['gas'] }, // 20
      { sleep:'poor' }, { sleep:'great' }, { sleep:'great' }, { sleep:'great' }, { sleep:'great' },           // 21-25
    ]));
    renderPatterns();
    const h = html();
    expect(h).toContain('Possible correlations');   // existing correlations block
    expect(h).toContain('What affects his sleep?');  // new sleep block (>= 5 pairs)
    expect(h).toContain('Reaction timing');          // timing block (has a reaction)
    expect(h).toContain('Most frequent symptoms');   // symptoms block (has 'gas')
  });

  await it('renders in Spanish under LANG = es', () => {
    resetState();
    const prev = LANG;
    try {
      LANG = 'es';
      setJournal(...build([
        { sleep:'great' }, { sleep:'great' }, { sleep:'great' },
        { sleep:'great' }, { sleep:'great' }, { sleep:'great' },
      ]));
      const section = renderSleepPatterns();
      expect(section).toContain('¿Qué afecta su sueño?');
      expect(section).toContain('Tras lácteos');
    } finally {
      LANG = prev;                            // restore so later tests stay English
    }
  });
});


// ════════════════════════════════════════════════════════
// nextDateStr() / dayPoorSleep() — alignment primitives
// ════════════════════════════════════════════════════════
await describe('nextDateStr() / dayPoorSleep()', async () => {
  await it('advances one calendar day', () => {
    expect(nextDateStr('2026-06-20')).toBe('2026-06-21');
  });
  await it('crosses month and year boundaries', () => {
    expect(nextDateStr('2026-06-30')).toBe('2026-07-01');
    expect(nextDateStr('2026-12-31')).toBe('2027-01-01');
    expect(nextDateStr('2028-02-28')).toBe('2028-02-29');  // 2028 is a leap year
  });
  await it('counts only poor / very-poor as a bad night', () => {
    expect(dayPoorSleep({ sleep:'poor' })).toBeTruthy();
    expect(dayPoorSleep({ sleep:'very-poor' })).toBeTruthy();
    expect(dayPoorSleep({ sleep:'ok' })).toBeFalsy();
    expect(dayPoorSleep({ sleep:'great' })).toBeFalsy();
    expect(dayPoorSleep({ sleep:'' })).toBeFalsy();
  });
});

}
