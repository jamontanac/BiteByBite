// ── Util ────────────────────────────────────────────────
// Builds <option> markup from a [{value,label}] array, optionally pre-selecting
// one value. Config values/labels are trusted app config (not user input).
function optionsHtml(arr, selected) {
  return (arr || [])
    .map(o => `<option value="${o.value}"${selected != null && o.value === selected ? ' selected' : ''}>${o.label}</option>`)
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

function typeName(t) {
  const m = { breakfast:'Breakfast', snack:'Snack', snack2:'Snack', lunch:'Lunch', dinner:'Dinner', other:'Other' };
  if (m[t]) return m[t];
  const opt = (FORMCFG.meals.selects.type || []).find(o => o.value === t);
  return opt ? opt.label : t;
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
  return new Date(y, mo - 1, d).toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}
