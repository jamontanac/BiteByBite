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

    const mealRows = (e.meals || []).slice().sort(mealTimeCompare).map(m => `
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
