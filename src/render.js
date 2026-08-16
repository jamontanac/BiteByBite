// ── History tab ─────────────────────────────────────────
function renderHistory() {
  const el = document.getElementById('history-list');
  if (!journal.length) {
    el.innerHTML = `<div class="empty">
      <div class="empty-icon">📖</div>
      <p>${t('hist.empty')}</p>
    </div>`;
    return;
  }

  el.innerHTML = journal.map((e, i) => {
    const hasRx    = hasReactions(e);
    const hadVomit = dayHadReaction(e);
    const hasNew      = e.meals && e.meals.some(m => m.newFood);
    const hasGluten   = e.meals && e.meals.some(m => m.gluten);
    const hasDairy    = e.meals && e.meals.some(m => m.dairy);
    const hasLeftover = e.meals && e.meals.some(m => m.freshFood === false);

    const detail = hasRx
      ? e.reactions.length + ' ' + (e.reactions.length === 1 ? t('hist.episode') : t('hist.episodes'))
      : e.vomit + '×';
    const tags = [
      hadVomit
        ? `<span class="tag bad">${t('hist.vomited', { detail })}</span>`
        : `<span class="tag ok">${t('hist.noVomiting')}</span>`,
      e.severity === '3' ? `<span class="tag bad">${t('hist.severeDay')}</span>` :
      e.severity === '2' ? `<span class="tag warn">${t('hist.moderateDay')}</span>` :
      e.severity === '1' ? `<span class="tag ok">${t('hist.mildDay')}</span>` : '',
      hasNew      ? `<span class="tag warn">${t('hist.newFood')}</span>` : '',
      hasLeftover ? `<span class="tag neutral">${t('hist.leftover')}</span>` : '',
      hasGluten ? `<span class="tag gluten">${t('hist.gluten')}</span>` : '',
      hasDairy  ? `<span class="tag neutral">${t('hist.dairy')}</span>` : '',
      e.newEnv  ? `<span class="tag neutral">${t('hist.awayFromHome')}</span>` : '',
      e.sick    ? `<span class="tag warn">${t('hist.illnessSigns')}</span>` : '',
      e.meds    ? `<span class="tag neutral">💊 ${e.medName || t('hist.medication')}</span>` : '',
      e.sleep   ? `<span class="tag neutral">${t('hist.sleepTag', { v: e.sleep })}</span>` : '',
    ].filter(Boolean).join('');

    const mealRows = (e.meals || []).slice().sort(mealTimeCompare).map(m => `
      <div class="meal-row">
        <span class="meal-time">${m.time ? fmtTime(m.time) : '—'}</span>
        <span class="meal-foods-text">
          <strong>${typeName(m.type)}</strong> · ${m.foods || t('hist.noDetail')}
          ${m.freshFood === false ? ` · <em class="leftover-note">${t('hist.leftoverNote')}${m.cookedWhen ? ' (' + m.cookedWhen + ')' : ''}</em>` : ''}
          ${m.newFood ? ` · <em class="newfood-note">${m.newFoodName || t('hist.newFoodFallback')}</em>` : ''}
          ${m.gluten  ? ` · <em class="gluten-note">${t('hist.glutenNote')}</em>` : ''}
        </span>
      </div>`).join('');

    let reactionHtml = '';
    if (hasRx) {
      reactionHtml = e.reactions.map(r =>
        `<div class="reaction-bar ${e.severity === '3' ? 'severe' : ''}">
          ${r.count}× &nbsp;·&nbsp; ${r.delay || '—'} ${t('hist.after')} ${r.meal ? `<strong>${r.meal}</strong>` : t('hist.lastMeal')}
          ${r.content ? ` — <em>${r.content}</em>` : ''}
        </div>`
      ).join('');
    } else if (hasLegacyVomit(e) && e.delay) {
      reactionHtml = `<div class="reaction-bar ${e.severity === '3' ? 'severe' : ''}">
        ${t('hist.reaction')} ${e.delay} ${t('hist.after')} ${e.mealVomited ? `<strong>${e.mealVomited}</strong>` : t('hist.lastMeal')}
        ${e.vomitContent ? ` — <em>${e.vomitContent}</em>` : ''}
        ${e.symptoms && e.symptoms.length ? ' · ' + e.symptoms.join(', ') : ''}
      </div>`;
    }

    return `<div class="card">
      <div class="entry-head">
        <div class="entry-date-head">${fmtDate(e.date)}</div>
        <button onclick="enterEditMode(${i})" class="entry-edit-btn" aria-label="Edit entry">${t('hist.edit')}</button>
      </div>
      <div class="tag-row">${tags}</div>
      <div>${mealRows}</div>
      ${reactionHtml}
      ${e.symptoms && e.symptoms.length ? `<div class="reaction-bar symptoms-bar">${e.symptoms.join(', ')}</div>` : ''}
      ${e.notes ? `<div class="entry-note">${e.notes}</div>` : ''}
    </div>`;
  }).join('');
}

// ── Exposures (Patterns tab) ────────────────────────────
// The day-level things worth testing against. One predicate each, shared by the
// correlation table, the sleep-influence table, and the monthly detail panel —
// so a change to what counts as (say) a gluten day lands in all three at once.
// `tag` names the short History label the detail panel reuses for its chips.
const EXPOSURES = [
  { key: 'gluten',   tag: 'hist.gluten',       filter: e => e.meals && e.meals.some(m => m.gluten) },
  { key: 'dairy',    tag: 'hist.dairy',        filter: e => e.meals && e.meals.some(m => m.dairy) },
  { key: 'egg',      tag: 'hist.egg',          filter: e => e.meals && e.meals.some(m => m.egg) },
  { key: 'newFood',  tag: 'hist.newFood',      filter: e => e.meals && e.meals.some(m => m.newFood) },
  { key: 'leftover', tag: 'hist.leftover',     filter: e => e.meals && e.meals.some(m => m.freshFood === false) },
  { key: 'away',     tag: 'hist.awayFromHome', filter: e => e.newEnv },
  { key: 'illness',  tag: 'hist.illnessSigns', filter: e => e.sick },
  { key: 'heavy',    tag: 'hist.heavyMeal',    filter: e => e.meals && e.meals.some(m => m.heavy === 'heavy') },
];
const EXP = Object.fromEntries(EXPOSURES.map(x => [x.key, x]));

// Correlation rows, in display order. Poor sleep is an exposure here but the
// OUTCOME in the sleep table below, so it belongs to this list alone.
const CORR_EXPOSURES = [
  EXP.gluten, EXP.dairy, EXP.egg, EXP.newFood, EXP.leftover,
  { key: 'poorSleep', filter: dayPoorSleep },
  EXP.away, EXP.illness, EXP.heavy,
];

// Sleep-influence rows: the shared list plus vomiting, which is the outcome in
// the correlation table above and an exposure here.
const SLEEP_EXPOSURES = [{ key: 'vomiting', filter: dayHadReaction }, ...EXPOSURES];

// ── Patterns tab ────────────────────────────────────────
function renderPatterns() {
  const el = document.getElementById('patterns-content');
  if (journal.length < 2) {
    el.innerHTML = `<div class="empty">
      <div class="empty-icon">📊</div>
      <p>${t('pat.empty')}</p>
    </div>`;
    return;
  }

  const hadReaction = dayHadReaction;

  const n = journal.length;
  const vomitDays = journal.filter(hadReaction).length;

  // Headline numbers. Both are relative to today, and both ignore future-dated
  // entries — a mistyped date shouldn't inflate the 30-day count or produce a
  // negative streak.
  const today     = todayStr();
  const lastVomit = journal.filter(e => hadReaction(e) && e.date <= today)
                           .map(e => e.date).sort().pop();   // max date; journal order not assumed
  const sinceLast = lastVomit ? daysBetween(lastVomit, today) : '—';
  const since30   = shiftDate(today, -29);                   // today + the 29 days before it
  const last30    = journal.filter(e => e.date >= since30 && e.date <= today)
                           .reduce((sum, e) => sum + episodeCount(e), 0);

  const pct = (a, b) => b === 0 ? '—' : Math.round(a / b * 100) + '%';
  const pctClass = (a, b) => {
    if (b === 0) return 'low';
    const r = a / b;
    return r > .6 ? 'high' : r > .3 ? 'mid' : 'low';
  };

  const corrRows = CORR_EXPOSURES.map(c => {
    const subset = journal.filter(c.filter);
    const hits   = subset.filter(hadReaction).length;
    const p = pct(hits, subset.length);
    const cls = pctClass(hits, subset.length);
    return `<div class="corr-row">
      <div class="corr-left">
        <div class="corr-name">${t('pat.corr.' + c.key)}</div>
        <div class="corr-sub">${t('pat.corrSub', { hits, total: subset.length })}</div>
      </div>
      <div class="corr-pct ${cls}">${p}</div>
    </div>`;
  }).join('');

  const vEntries = journal.filter(hadReaction);
  const delayCounts = {};
  vEntries.forEach(e => {
    if (hasReactions(e)) {
      e.reactions.forEach(r => {
        const d = r.delay || '—';
        // parseInt, not Number: the count option '3+' is a valid stored value and
        // Number('3+') is NaN, which poisoned the whole chip total.
        delayCounts[d] = (delayCounts[d] || 0) + (parseInt(r.count, 10) || 1);
      });
    } else if (hasLegacyVomit(e) && e.delay) {
      delayCounts[e.delay] = (delayCounts[e.delay] || 0) + 1;
    }
  });
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
      <div class="stat-card"><div class="stat-num">${n}</div><div class="stat-lbl">${t('pat.daysLogged')}</div></div>
      <div class="stat-card"><div class="stat-num">${pct(vomitDays,n)}</div><div class="stat-lbl">${t('pat.vomitRate')}</div></div>
      <div class="stat-card"><div class="stat-num ${sinceLast > 0 ? 'ok' : ''}">${sinceLast}</div><div class="stat-lbl">${t('pat.sinceLast')}</div></div>
      <div class="stat-card"><div class="stat-num bad">${last30}</div><div class="stat-lbl">${t('pat.last30')}</div></div>
    </div>

    ${renderMonthlyChart()}

    <div class="sec-label">${t('pat.corrTitle')}</div>
    ${corrRows}

    ${vEntries.length ? `
    <div class="sec-label">${t('pat.timingTitle')}</div>
    <div class="card">
      <div class="timing-note">
        ${t('pat.timingNote')}
      </div>
      <div class="chip-grid">${delayRows}</div>
    </div>` : ''}

    ${sympRows ? `
    <div class="sec-label">${t('pat.symptomsTitle')}</div>
    <div class="card">
      <div class="chip-grid">${sympRows}</div>
    </div>` : ''}

    ${renderSleepPatterns()}

    <div class="insight-card insight-howto">
      <h3>${t('pat.howtoTitle')}</h3>
      <div class="insight-body">
        ${t('pat.howtoBody')}
      </div>
    </div>
    <div class="spacer-sm"></div>
  `;
}

// ── Monthly episode chart (Patterns tab) ────────────────
// Six bars, one per month, oldest → current. The bars are plain divs sized in
// percent and filled with var(--warn) — a light-dark() token — so the theme
// toggle repaints them with no JS here (a canvas would have to re-read the
// computed tokens and redraw). Month names come from the locale, so they follow
// the language without costing a translation key.
function renderMonthlyChart() {
  const [y, m] = todayStr().split('-').map(Number);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 6 + i, 1));
    return {
      key:   d.toISOString().slice(0, 7),
      // timeZone:'UTC' is load-bearing: without it, UTC midnight on the 1st
      // renders as the PREVIOUS month for anyone west of Greenwich.
      label: d.toLocaleDateString(LANG, { month: 'short', timeZone: 'UTC' }),
    };
  });

  const counts = months.map(mo =>
    journal.filter(e => e.date.slice(0, 7) === mo.key)
           .reduce((sum, e) => sum + episodeCount(e), 0));
  const max = Math.max(...counts, 1);          // never divide by zero on a clear window

  // Buttons, not divs: a bar is a control, so it has to be reachable by keyboard
  // and announced to a screen reader. Content is spans — a <button> may only
  // contain phrasing content.
  const bars = months.map((mo, i) => {
    const on = chartMonth === mo.key;
    return `
      <button type="button" class="bar-col${on ? ' sel' : ''}" aria-pressed="${on}"
              data-month="${mo.key}" onclick="selectChartMonth('${mo.key}')">
        <span class="bar-val">${counts[i]}</span>
        <span class="bar-track"><span class="bar-fill" style="height:${counts[i] / max * 100}%"></span></span>
        <span class="bar-lbl">${mo.label}</span>
      </button>`;
  }).join('');

  const total = counts.reduce((a, b) => a + b, 0);

  return `<div class="sec-label">${t('pat.monthlyTitle')}</div>
    <div class="card">
      <div class="bar-chart${chartMonth ? ' has-sel' : ''}">${bars}</div>
      <div class="timing-note">${t('pat.monthlyTotal', { n: total })}${chartMonth ? '' : ' · ' + t('pat.month.hint')}</div>
      ${chartMonth ? renderMonthPanel(chartMonth) : ''}
    </div>`;
}

// Opens a month's detail, or closes it if that month is already open. Re-renders
// the whole Patterns tab rather than patching the DOM — it's cheap, the tab
// already re-renders on every language change, and it keeps one render path.
function selectChartMonth(key) {
  chartMonth = (chartMonth === key) ? null : key;
  renderPatterns();
  // The re-render replaced the button that was just activated (and the close ×
  // belongs to this bar too), so hand focus back — otherwise every tap drops a
  // keyboard user at the top of the page.
  const btn = document.querySelector(`.bar-col[data-month="${key}"]`);
  if (btn) btn.focus();
}

// ── Monthly detail panel (Patterns tab) ─────────────────
// What happened in the selected month: each episode day with the exposures it
// actually carried, then how often each of those turned up. Counts, never
// percentages — "1 of 2 days" is honest at this sample size in a way that
// "50%" is not. The day list scrolls inside the panel so a heavy month can't
// push the heading and close button off a phone screen.
function renderMonthPanel(key) {
  const [y, mo] = key.split('-').map(Number);
  const title   = new Date(Date.UTC(y, mo - 1, 1))
    .toLocaleDateString(LANG, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const close   = `<button type="button" class="month-close" onclick="selectChartMonth('${key}')"
      aria-label="${t('pat.month.close')}">×</button>`;

  const days = journal
    .filter(e => e.date.slice(0, 7) === key && episodeCount(e) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!days.length) {
    return `<div class="month-panel">
      <div class="month-head"><span class="month-title">${title}</span>${close}</div>
      <div class="timing-note">${t('pat.month.none')}</div>
    </div>`;
  }

  const total = days.reduce((sum, e) => sum + episodeCount(e), 0);
  const rows  = days.map(e => `
      <div class="month-row">
        <span class="month-date">${fmtDateShort(e.date)}</span>
        <span class="month-count">${episodeCount(e)}×</span>
        <span class="month-tags">${
          EXPOSURES.filter(x => x.filter(e)).map(x => `<span class="tag neutral">${t(x.tag)}</span>`).join('')
        }</span>
      </div>`).join('');

  const present = EXPOSURES
    .map(x => ({ tag: x.tag, n: days.filter(x.filter).length }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map(x => `<span class="tag neutral">${t(x.tag)} ${x.n}/${days.length}</span>`)
    .join('');

  return `<div class="month-panel">
    <div class="month-head">
      <span class="month-title">${title} · ${total} ${total === 1 ? t('hist.episode') : t('hist.episodes')}</span>
      ${close}
    </div>
    <div class="month-rows">${rows}</div>
    ${present ? `<div class="month-foot">
      <div class="month-foot-lbl">${t('pat.month.onThoseDays')}</div>
      <div class="chip-grid">${present}</div>
    </div>` : ''}
  </div>`;
}

// ── Sleep-influence section (Patterns tab) ──────────────
// Flips the correlation direction: instead of "does poor sleep predict vomiting",
// it asks "does a day's food / vomiting / illness lead to a bad NEXT night". Sleep
// is logged as "last night", so day D's exposures are paired with the D+1 entry's
// sleep (see nextDateStr). Needs consecutive logged days; below MIN_PAIRS it shows
// a "log back-to-back days" prompt instead of numbers, so a sparse log can't fake
// a finding.
function renderSleepPatterns() {
  const MIN_PAIRS = 5;

  const byDate = new Map(journal.map(e => [e.date, e]));
  const pairs = [];                          // { day, poor } — one per consecutive-day pair
  journal.forEach(day => {
    const night = byDate.get(nextDateStr(day.date));
    if (night && night.sleep) pairs.push({ day, poor: dayPoorSleep(night) });
  });

  const title = `<div class="sec-label">${t('pat.sleep.title')}</div>`;

  if (pairs.length < MIN_PAIRS) {
    return `${title}
    <div class="card">
      <div class="timing-note">${t('pat.sleep.needMore', { min: MIN_PAIRS, n: pairs.length })}</div>
    </div>`;
  }

  const baseRate = pairs.filter(p => p.poor).length / pairs.length;
  const basePct  = Math.round(baseRate * 100) + '%';

  const rows = SLEEP_EXPOSURES.map(x => {
    const subset = pairs.filter(p => x.filter(p.day));
    const total  = subset.length;
    const hits   = subset.filter(p => p.poor).length;
    const rate   = total ? hits / total : 0;
    const meaningful = total >= 2;            // 1-day exposures are noise, not a signal

    let cls;
    if (!meaningful)                cls = 'muted';
    else if (baseRate === 0)        cls = rate > 0 ? 'high' : 'low';
    else if (rate / baseRate > 1.3) cls = 'high';
    else if (rate / baseRate < 0.8) cls = 'low';
    else                            cls = 'mid';

    let sub = t('pat.sleep.rowSub', { hits, total });
    sub += ' · ' + (meaningful ? t('pat.sleep.vsBaseline', { p: basePct }) : t('pat.sleep.lowSample'));

    return {
      meaningful, rate,
      html: `<div class="corr-row">
      <div class="corr-left">
        <div class="corr-name">${t('pat.sleep.exp.' + x.key)}</div>
        <div class="corr-sub">${sub}</div>
      </div>
      <div class="corr-pct ${cls}">${total === 0 ? '—' : Math.round(rate * 100) + '%'}</div>
    </div>`
    };
  })
  .sort((a, b) => (b.meaningful - a.meaningful) || (b.rate - a.rate))  // meaningful first, then by rate
  .map(r => r.html)
  .join('');

  return `${title}
    <div class="card">
      <div class="timing-note">${t('pat.sleep.intro')}</div>
      <div class="chip-grid">
        <span class="tag neutral">${t('pat.sleep.baseline', { p: basePct })}</span>
        <span class="tag neutral">${t('pat.sleep.pairs', { n: pairs.length })}</span>
      </div>
    </div>
    ${rows}`;
}
