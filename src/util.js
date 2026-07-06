// ── Util ────────────────────────────────────────────────
// Builds <option> markup from a [{value,label}] array, optionally pre-selecting
// one value. Config values/labels are trusted app config (not user input).
function optionsHtml(arr, selected, ns) {
  return (arr || [])
    .map(o => `<option value="${o.value}"${selected != null && o.value === selected ? ' selected' : ''}>${optLabel(ns, o)}</option>`)
    .join('');
}

// Orders meals chronologically by their HH:MM time. Meals with no time sort to
// the end. Used so the day's meals always display in time order, regardless of
// the order they were logged in.
function mealTimeCompare(a, b) {
  return (a.time || '99:99').localeCompare(b.time || '99:99');
}

// Sorts every entry's meals by time so the in-memory journal is canonical —
// History, the edit form, and Export all read the same chronological order,
// even for entries saved before meal-sorting existed. Called after each load.
function normalizeJournal() {
  journal.forEach(e => { if (Array.isArray(e.meals)) e.meals.sort(mealTimeCompare); });
}

function typeName(type) {
  const keys = { breakfast:'type.breakfast', snack:'type.snack', snack2:'type.snack', lunch:'type.lunch', dinner:'type.dinner', other:'type.other' };
  if (keys[type]) return t(keys[type]);
  const opt = (FORMCFG.meals.selects.type || []).find(o => o.value === type);
  return opt ? opt.label : type;
}

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function fmtDate(s) {
  if (!s) return '';
  const [y, mo, d] = s.split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString(LANG, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

// A meal's short label, e.g. "Breakfast · 8:00 AM" (time optional) — translated
// for display.
function mealLabel(type, time) {
  return typeName(type) + (time ? ' · ' + fmtTime(time) : '');
}

// Canonical (English) meal label, independent of the UI language. Used for the
// value STORED in `reaction.meal` so a reaction logged in any language keeps a
// stable, language-independent label in journal.json. Reproduces the pre-i18n
// English label exactly.
function mealLabelCanonical(type, time) {
  const en = { breakfast:'Breakfast', snack:'Snack', snack2:'Snack', lunch:'Lunch', dinner:'Dinner', other:'Other' };
  let name = en[type];
  if (!name) {
    const opt = (FORMCFG.meals.selects.type || []).find(o => o.value === type);
    name = opt ? opt.label : type;
  }
  return name + (time ? ' · ' + fmtTime(time) : '');
}

// Reaction/vomit detection. Current entries use a reactions[] array; older ones
// used a flat `vomit` field — both must be recognised. History and Patterns
// share these so the two screens never disagree about what counts as a reaction.
function hasReactions(e) {
  return !!(e.reactions && e.reactions.length > 0);
}
function hasLegacyVomit(e) {
  return !!(e.vomit && e.vomit !== 'none');
}
function dayHadReaction(e) {
  return hasReactions(e) || hasLegacyVomit(e);
}

// Next calendar day for a 'YYYY-MM-DD' string. Uses UTC math so it never shifts
// by a day near DST or local midnight. Used to line a day's food/vomiting/illness
// up with the FOLLOWING night's sleep (sleep is logged as "last night").
function nextDateStr(s) {
  const [y, mo, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, d + 1)).toISOString().slice(0, 10);
}

// A "bad night": sleep was poor or very poor. ok/great count as fine. Mirrors the
// poor-sleep predicate used by the correlations block.
function dayPoorSleep(e) {
  return e.sleep === 'poor' || e.sleep === 'very-poor';
}
