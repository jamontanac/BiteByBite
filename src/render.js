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

    <div class="sec-label">${t('pat.monthlyTitle')}</div>
    ${renderMonthChart('vomit', episodeCount, 'pat.monthlyTotal', renderMonthPanel)}

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

// ── Monthly bar chart (Patterns tab) ────────────────────
// Six bars, one per month, oldest → current. Used twice: vomiting episodes and
// poor nights. `id` scopes the open-panel state and picks the bar colour via a
// CSS class, so the light-dark() tokens still carry the theme with no JS here (a
// canvas would have to re-read the computed tokens and redraw). `count(entry)`
// is what one day contributes; `panel(monthKey)` renders the tap-open detail.
// Month names come from the locale, so they follow the language for free.
function renderMonthChart(id, count, totalKey, panel) {
  const open = chartOpen[id];
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
           .reduce((sum, e) => sum + count(e), 0));
  const max = Math.max(...counts, 1);          // never divide by zero on a clear window

  // Buttons, not divs: a bar is a control, so it has to be reachable by keyboard
  // and announced to a screen reader. Content is spans — a <button> may only
  // contain phrasing content.
  const bars = months.map((mo, i) => {
    const on = open === mo.key;
    return `
      <button type="button" class="bar-col${on ? ' sel' : ''}" aria-pressed="${on}"
              data-chart="${id}" data-month="${mo.key}" onclick="selectChartMonth('${id}','${mo.key}')">
        <span class="bar-val">${counts[i]}</span>
        <span class="bar-track"><span class="bar-fill" style="height:${counts[i] / max * 100}%"></span></span>
        <span class="bar-lbl">${mo.label}</span>
      </button>`;
  }).join('');

  const total = counts.reduce((a, b) => a + b, 0);

  return `<div class="card chart-${id}">
      <div class="bar-chart${open ? ' has-sel' : ''}">${bars}</div>
      <div class="timing-note">${t(totalKey, { n: total })}${open ? '' : ' · ' + t('pat.month.hint')}</div>
      ${open ? panel(open) : ''}
    </div>`;
}

// Opens a month's detail on one chart, or closes it if that month is already
// open. Re-renders the whole Patterns tab rather than patching the DOM — it's
// cheap, the tab already re-renders on every language change, and it keeps one
// render path.
function selectChartMonth(id, key) {
  chartOpen[id] = (chartOpen[id] === key) ? null : key;
  renderPatterns();
  // The re-render replaced the button that was just activated (and the close ×
  // belongs to this bar too), so hand focus back — otherwise every tap drops a
  // keyboard user at the top of the page.
  const btn = document.querySelector(`.bar-col[data-chart="${id}"][data-month="${key}"]`);
  if (btn) btn.focus();
}

// Heading + close button shared by both month panels.
function monthPanelHead(id, key) {
  const [y, mo] = key.split('-').map(Number);
  const title = new Date(Date.UTC(y, mo - 1, 1))
    .toLocaleDateString(LANG, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return { title, close: `<button type="button" class="month-close"
      onclick="selectChartMonth('${id}','${key}')" aria-label="${t('pat.month.close')}">×</button>` };
}

// The exposure chips a single day carried, e.g. "Gluten · Away from home".
function exposureTags(day) {
  return EXPOSURES.filter(x => x.filter(day))
    .map(x => `<span class="tag neutral">${t(x.tag)}</span>`).join('');
}

// "Gluten 2/3 · Dairy 1/3" — how often each exposure turned up across `days`.
// Counts, never percentages: at these sample sizes a rate is noise dressed up.
function exposureTally(days) {
  return EXPOSURES
    .map(x => ({ tag: x.tag, n: days.filter(x.filter).length }))
    .filter(x => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map(x => `<span class="tag neutral">${t(x.tag)} ${x.n}/${days.length}</span>`)
    .join('');
}

// ── Monthly detail panel (Patterns tab) ─────────────────
// What happened in the selected month: each episode day with the exposures it
// actually carried, then how often each of those turned up. Counts, never
// percentages — "1 of 2 days" is honest at this sample size in a way that
// "50%" is not. The day list scrolls inside the panel so a heavy month can't
// push the heading and close button off a phone screen.
function renderMonthPanel(key) {
  const { title, close } = monthPanelHead('vomit', key);

  const days = journal
    .filter(e => e.date.slice(0, 7) === key && episodeCount(e) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!days.length) {
    return `<div class="month-panel vomit">
      <div class="month-head"><span class="month-title">${title}</span>${close}</div>
      <div class="timing-note">${t('pat.month.none')}</div>
    </div>`;
  }

  const total = days.reduce((sum, e) => sum + episodeCount(e), 0);
  const rows  = days.map(e => `
      <div class="month-row">
        <span class="month-date">${fmtDateShort(e.date)}</span>
        <span class="month-count">${episodeCount(e)}×</span>
        <span class="month-tags">${exposureTags(e)}</span>
      </div>`).join('');
  const tally = exposureTally(days);

  return `<div class="month-panel vomit">
    <div class="month-head">
      <span class="month-title">${title} · ${total} ${total === 1 ? t('hist.episode') : t('hist.episodes')}</span>
      ${close}
    </div>
    <div class="month-rows">${rows}</div>
    ${tally ? `<div class="month-foot">
      <div class="month-foot-lbl">${t('pat.month.onThoseDays')}</div>
      <div class="chip-grid">${tally}</div>
    </div>` : ''}
  </div>`;
}

// ── Sleep month detail panel ────────────────────────────
// The poor nights in a month, each labelled with what the PRECEDING day carried —
// sleep is logged as "last night", so a bad night on D follows day D-1. Nights
// whose previous day was never logged are called out rather than silently
// dropped, and they're excluded from the tally's denominator: counting them
// would understate every exposure.
function renderSleepMonthPanel(key) {
  const { title, close } = monthPanelHead('sleep', key);

  const nights = journal
    .filter(e => e.date.slice(0, 7) === key && dayPoorSleep(e))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!nights.length) {
    return `<div class="month-panel sleep">
      <div class="month-head"><span class="month-title">${title}</span>${close}</div>
      <div class="timing-note">${t('pat.sleep.month.none')}</div>
    </div>`;
  }

  const byDate = new Map(journal.map(e => [e.date, e]));
  const dayBefore = n => byDate.get(shiftDate(n.date, -1));

  const rows = nights.map(n => {
    const day  = dayBefore(n);
    const tags = day ? exposureTags(day) : '';
    return `<div class="month-row">
        <span class="month-date">${fmtDateShort(n.date)}</span>
        ${!day    ? `<span class="month-unknown">${t('pat.sleep.month.unknown')}</span>`
        : tags    ? `<span class="month-after">${t('hist.after')}</span><span class="month-tags">${tags}</span>`
                  : ''}
      </div>`;
  }).join('');

  const known = nights.map(dayBefore).filter(Boolean);
  const tally = known.length ? exposureTally(known) : '';

  return `<div class="month-panel sleep">
    <div class="month-head">
      <span class="month-title">${title} · ${nights.length} ${nights.length === 1 ? t('pat.sleep.nightOne') : t('pat.sleep.nightMany')}</span>
      ${close}
    </div>
    <div class="month-rows">${rows}</div>
    ${tally ? `<div class="month-foot">
      <div class="month-foot-lbl">${t('pat.sleep.month.precededBy')}</div>
      <div class="chip-grid">${tally}</div>
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

  // The chart only needs a night's own `sleep` value, so it renders from day one —
  // long before there are enough back-to-back pairs to say anything about causes.
  const title = `<div class="sec-label">${t('pat.sleep.title')}</div>
    ${renderMonthChart('sleep', e => dayPoorSleep(e) ? 1 : 0, 'pat.sleep.chartTotal', renderSleepMonthPanel)}`;

  if (pairs.length < MIN_PAIRS) {
    return `${title}
    <div class="card">
      <div class="timing-note">${t('pat.sleep.needMore', { min: MIN_PAIRS, n: pairs.length })}</div>
    </div>`;
  }

  const baseRate = pairs.filter(p => p.poor).length / pairs.length;
  const basePct  = Math.round(baseRate * 100) + '%';

  const stats = SLEEP_EXPOSURES.map(x => {
    const subset = pairs.filter(p => x.filter(p.day));
    const total  = subset.length;
    const hits   = subset.filter(p => p.poor).length;
    const rate   = total ? hits / total : 0;
    return { key: x.key, total, hits, rate, dev: rate - baseRate, meaningful: total >= 2 };
  });

  // One exposure logged once is a coincidence, not a signal — those get named in a
  // single trailing line instead of taking a full row each.
  const shown = stats.filter(s => s.meaningful).sort((a, b) => b.dev - a.dev);   // worst first
  const weak  = stats.filter(s => !s.meaningful);

  // Deviation from baseline, scaled so the largest one fills half the track. The
  // floor keeps a set of near-baseline rows from being blown up into fake signal.
  const maxDev = Math.max(...shown.map(s => Math.abs(s.dev)), 0.1);

  const dvRows = shown.map(s => {
    const worse = s.dev > 0;
    const w     = Math.abs(s.dev) / maxDev * 50;
    return `<div class="dv-row">
      <div class="dv-head">
        <span class="dv-name">${t('pat.sleep.exp.' + s.key)}</span>
        <span class="dv-pct ${worse ? 'high' : 'low'}">${Math.round(s.rate * 100)}%</span>
      </div>
      <div class="dv-sub">${t('pat.sleep.rowSub', { hits: s.hits, total: s.total })}</div>
      <div class="dv-track">
        <span class="dv-bar ${worse ? 'worse' : 'better'}"
              style="${worse ? 'left' : 'right'}:50%;width:${w}%"></span>
      </div>
    </div>`;
  }).join('');

  const weakLine = weak.length
    ? `<div class="dv-weak">${t('pat.sleep.lowSampleList', {
        list: weak.map(s => t('pat.sleep.exp.' + s.key)).join(', ') })}</div>`
    : '';

  return `${title}
    <div class="card">
      <div class="timing-note">${t('pat.sleep.intro')}</div>
      <div class="dv-base">${t('pat.sleep.baseline', { p: basePct })} · ${t('pat.sleep.pairs', { n: pairs.length })}</div>
      ${dvRows}
      <div class="dv-axis"><span>← ${t('pat.sleep.better')}</span><span>${t('pat.sleep.worse')} →</span></div>
      ${weakLine}
    </div>`;
}
