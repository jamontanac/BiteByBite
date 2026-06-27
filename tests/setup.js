// ── App DOM ─────────────────────────────────────────────
// Mirrors every element id / class the app's JS touches.
function buildDOM() {
  document.getElementById('app-root').innerHTML = `
    <div id="loading" style="display:none">
      <div class="ld-word">BiteByBite</div><div class="ld-sub"></div>
    </div>
    <div id="toast"></div>

    <!-- Login -->
    <div id="s-login" class="screen">
      <div id="login-err" class="err-msg" style="display:none"></div>
      <input id="gh-user"  type="text">
      <input id="gh-repo"  type="text">
      <input id="gh-token" type="password">
      <button id="login-btn">Connect &amp; open journal</button>
    </div>

    <!-- App -->
    <div id="s-app" class="screen">
      <div class="sync-dot synced" id="sync-dot"></div>
      <span id="sync-label">Saved</span>

      <!-- Log tab -->
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

      <!-- History tab -->
      <div id="tab-history" class="scroll-area">
        <div id="history-list"></div>
      </div>
      <!-- Patterns tab -->
      <div id="tab-patterns" class="scroll-area">
        <div id="patterns-content"></div>
      </div>
      <!-- Settings tab -->
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

// ── State reset (between tests) ─────────────────────────
function resetState() {
  window.CFG            = {};
  window.journal        = [];
  window.ghSha          = null;
  window.mealCount      = 0;
  window.reactionCount  = 0;
  window.activeSymptoms = new Set();
  window.activeSev      = '';
  localStorage.clear();

  document.getElementById('meals-container').innerHTML     = '';
  document.getElementById('reactions-container').innerHTML = '';
  document.getElementById('history-list').innerHTML        = '';
  document.getElementById('patterns-content').innerHTML    = '';
  document.getElementById('login-err').style.display       = 'none';

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

// ── Test helpers ────────────────────────────────────────
// Minimal valid journal entry
function makeEntry(overrides = {}) {
  return {
    date: '2026-06-26', sleep: '', mood: '', activity: '', stool: '',
    hydration: '', newEnv: false, sick: false, meds: false, medName: '',
    meals: [{
      type: 'breakfast', time: '08:00', source: 'homemade', foods: 'oatmeal',
      heavy: 'light', amount: 'all', newFood: false, gluten: false, dairy: false, egg: false
    }],
    reactions: [], symptoms: [], severity: '', notes: '', ts: 1000,
    ...overrides
  };
}

// Sets date + adds one meal card (minimum for saveEntry to succeed)
function setupMinimalForm(date = '2026-06-26') {
  document.getElementById('e-date').value = date;
  document.getElementById('meals-container').innerHTML = '';
  window.mealCount = 0;
  addMeal();
}

// Simulates clicking a chip by its data-v value
function clickChip(v) {
  const chip = document.querySelector(`#symptom-chips .chip[data-v="${v}"]`);
  chip.click();
  return chip;
}
