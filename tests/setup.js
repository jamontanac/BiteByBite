// ── App DOM ─────────────────────────────────────────────
function buildDOM() {
  document.getElementById('app-root').innerHTML = `
    <div id="loading" style="display:none">
      <div class="ld-word">BiteByBite</div><div class="ld-sub"></div>
    </div>
    <div id="toast"></div>

    <div id="s-login" class="screen">
      <div id="login-err" class="err-msg" style="display:none"></div>
      <input id="gh-user"  type="text">
      <input id="gh-repo"  type="text">
      <input id="gh-token" type="password">
      <button id="login-btn">Connect &amp; open journal</button>
    </div>

    <div id="s-app" class="screen">
      <div class="sync-dot synced" id="sync-dot"></div>
      <span id="sync-label">Saved</span>

      <div id="tab-log" class="scroll-area active">
        <input id="e-date" type="date">
        <select id="e-sleep">
          <option value="">—</option><option value="great">Great</option>
          <option value="ok">OK</option><option value="poor">Poor</option>
          <option value="very-poor">Very poor</option>
        </select>
        <select id="e-mood">
          <option value="">—</option><option value="happy">Happy</option>
          <option value="normal">Normal</option><option value="fussy">Fussy</option>
          <option value="tired">Tired</option>
        </select>
        <select id="e-activity">
          <option value="">—</option><option value="low">Low</option>
          <option value="normal">Normal</option><option value="high">High</option>
        </select>
        <select id="e-stool">
          <option value="">—</option><option value="normal">Normal</option>
          <option value="soft">Soft</option><option value="watery">Watery</option>
          <option value="hard">Hard</option><option value="none">None</option>
        </select>
        <select id="e-hydration">
          <option value="">—</option><option value="good">Good</option>
          <option value="low">Low</option><option value="poor">Poor</option>
        </select>

        <label class="tog"><input type="checkbox" id="e-newenv"><span class="tog-track"></span></label>
        <label class="tog"><input type="checkbox" id="e-sick"><span class="tog-track"></span></label>
        <label class="tog">
          <input type="checkbox" id="e-meds" onchange="toggleMedInput(this)">
          <span class="tog-track"></span>
        </label>
        <div id="med-name-row" style="display:none">
          <input id="e-med-name" type="text">
        </div>

        <div id="meals-container"></div>
        <div id="reactions-container"></div>

        <div id="symptom-chips">
          <span class="chip bad" data-v="bloating">Bloating</span>
          <span class="chip bad" data-v="gas">Excess gas</span>
          <span class="chip bad" data-v="cramps">Stomach cramps</span>
          <span class="chip bad" data-v="rash">Skin rash</span>
          <span class="chip bad" data-v="itching">Itching</span>
          <span class="chip bad" data-v="swelling">Lip / face swelling</span>
          <span class="chip bad" data-v="reflux">Reflux / spitting</span>
          <span class="chip bad" data-v="crying">Inconsolable crying</span>
          <span class="chip bad" data-v="constipation">Constipation</span>
          <span class="chip bad" data-v="other">Other…</span>
        </div>
        <div id="other-symptom-row" style="display:none">
          <input id="e-symptom-other" type="text">
        </div>

        <div class="sev-row">
          <button class="sev-btn s1" data-s="1" onclick="selectSev(this)">Mild</button>
          <button class="sev-btn s2" data-s="2" onclick="selectSev(this)">Moderate</button>
          <button class="sev-btn s3" data-s="3" onclick="selectSev(this)">Severe</button>
        </div>

        <textarea id="e-notes"></textarea>
        <button id="save-btn"><span>Save entry</span></button>
      </div>

      <div id="tab-history" class="scroll-area">
        <div id="history-list"></div>
      </div>
      <div id="tab-patterns" class="scroll-area">
        <div id="patterns-content"></div>
      </div>
      <div id="tab-settings" class="scroll-area">
        <div id="cfg-repo-display"></div>
        <div id="cfg-count-display"></div>
        <div id="cfg-sync-display"></div>
      </div>

      <nav class="tab-bar">
        <button class="tab-item active" data-tab="log">Log</button>
        <button class="tab-item" data-tab="history">History</button>
        <button class="tab-item" data-tab="patterns">Patterns</button>
        <button class="tab-item" data-tab="settings">Settings</button>
      </nav>
    </div>
  `;
}

// ── State reset ─────────────────────────────────────────
// IMPORTANT: app.js uses `let` declarations, which do NOT appear on window.
// We access them directly by name (same global lexical scope), NOT via window.X.
function resetState() {
  // Reset app.js let-bindings directly (same global scope)
  CFG            = {};
  journal.length = 0;      // mutate in-place so app.js always holds the same array ref
  ghSha          = null;
  mealCount      = 0;
  reactionCount  = 0;
  activeSymptoms = new Set();
  activeSev      = '';
  localStorage.clear();

  // Reset DOM containers
  document.getElementById('meals-container').innerHTML     = '';
  document.getElementById('reactions-container').innerHTML = '';
  document.getElementById('history-list').innerHTML        = '';
  document.getElementById('patterns-content').innerHTML    = '';
  document.getElementById('login-err').style.display       = 'none';

  // Reset form fields
  ['e-date','e-sleep','e-mood','e-activity','e-stool','e-hydration',
   'e-notes','e-med-name','e-symptom-other','gh-user','gh-repo','gh-token']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  ['e-newenv','e-sick','e-meds']
    .forEach(id => { const el = document.getElementById(id); if (el) el.checked = false; });

  document.getElementById('med-name-row').style.display      = 'none';
  document.getElementById('other-symptom-row').style.display = 'none';

  document.querySelectorAll('#symptom-chips .chip').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.sev-btn').forEach(b => b.classList.remove('active'));
}

// ── Journal helpers ─────────────────────────────────────
// Use these instead of window.journal = [...] to avoid the let-vs-window split.
function setJournal(...entries) {
  journal.length = 0;
  entries.forEach(e => journal.push(e));
}

function makeEntry(overrides = {}) {
  return {
    date: '2026-06-26', sleep: '', mood: '', activity: '', stool: '',
    hydration: '', newEnv: false, sick: false, meds: false, medName: '',
    meals: [{
      type: 'breakfast', time: '08:00', source: 'homemade', foods: 'oatmeal',
      heavy: 'light', amount: 'all', newFood: false, newFoodName: '',
      gluten: false, dairy: false, egg: false
    }],
    reactions: [], symptoms: [], severity: '', notes: '', ts: 1000,
    ...overrides
  };
}

// Sets date + adds one meal (minimum for saveEntry to succeed)
function setupMinimalForm(date = '2026-06-26') {
  document.getElementById('e-date').value = date;
  document.getElementById('meals-container').innerHTML = '';
  mealCount = 0;
  addMeal();
}

// Resets all chip DOM state AND the activeSymptoms Set together.
// Use instead of bare activeSymptoms.clear() to avoid DOM/state desync.
function resetChips() {
  activeSymptoms = new Set();
  document.querySelectorAll('#symptom-chips .chip').forEach(c => c.classList.remove('active'));
  document.getElementById('other-symptom-row').style.display = 'none';
  document.getElementById('e-symptom-other').value = '';
}

// Clicks a chip by data-v value
function clickChip(v) {
  document.querySelector(`#symptom-chips .chip[data-v="${v}"]`).click();
}

// Mocks saveToGitHub (function declaration = on window); returns restore fn
function mockSave() {
  const orig = window.saveToGitHub;
  window.saveToGitHub = async () => { ghSha = 'sha-saved'; };
  return () => { window.saveToGitHub = orig; };
}
