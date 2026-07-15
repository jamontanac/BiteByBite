// ── State ──────────────────────────────────────────────
let CFG = {};         // {user, repo, token}
let journal = [];     // array of day entries
let ghSha = null;     // SHA of journal.json in GitHub (needed for updates)
let mealCount = 0;
let reactionCount = 0;
let editIndex = -1;
let activeSymptoms = new Set();
let activeSev = '';
let syncTimer = null;
let journalBranchReady = false;   // set once the data branch is confirmed/created

const API = 'https://api.github.com';

// Bump on every shipped app/config change. It's appended to the config fetches
// as a cache-buster (so a browser never serves a stale config after a deploy) and
// shown in the Settings tab so you can confirm which build the browser loaded.
// Keep this in sync with the ?v= query params on the <script>/<link> tags in
// index.html.
const APP_VERSION = '1.1.0';

// The five Day-overview <select> keys — each maps to #e-<key> and to
// FORMCFG.day.selects[<key>]. Shared by the form renderer, the edit loader,
// and the merge logic so the list lives in one place.
const DAY_SELECT_KEYS = ['sleep', 'mood', 'activity', 'stool', 'hydration'];

// ── Config (baked-in defaults) ─────────────────────────
// These mirror the JSON files in /config. The fetched JSON OVERRIDES them at
// runtime (see loadConfigs); they exist so the form always renders if a config
// file is unreachable or invalid, and so the test harness needs no network.
// Keep them in sync when you change a JSON file.
let JCFG = {
  github: { username: '', reponame: '' },
  branch: 'main',
  filename: 'journal.json',
  commitMessage: {
    new:  'Adding new entry to journal at: {ts}',
    edit: 'Editing/Adding the entry for the date {date} at: {ts}'
  },
  // Stamped onto each commit as author + committer. Leave name/email blank to let
  // GitHub attribute the commit to the Personal Access Token owner automatically.
  commitAuthor: { name: '', email: '' }
};

let FORMCFG = {
  day: { selects: {
    sleep: [
      { value: 'great',     label: 'Great' },
      { value: 'ok',        label: 'OK (some waking)' },
      { value: 'poor',      label: 'Poor' },
      { value: 'very-poor', label: 'Very poor' }
    ],
    mood: [
      { value: 'happy',  label: 'Happy, energetic' },
      { value: 'normal', label: 'Normal' },
      { value: 'fussy',  label: 'Fussy, irritable' },
      { value: 'tired',  label: 'Tired, lethargic' }
    ],
    activity: [
      { value: 'low',    label: 'Low / calm' },
      { value: 'normal', label: 'Normal play' },
      { value: 'high',   label: 'Very active' }
    ],
    stool: [
      { value: 'normal', label: 'Normal' },
      { value: 'soft',   label: 'Soft / loose' },
      { value: 'watery', label: 'Watery / diarrhea' },
      { value: 'hard',   label: 'Hard / constipated' },
      { value: 'none',   label: 'None today' }
    ],
    hydration: [
      { value: 'good', label: 'Good' },
      { value: 'low',  label: 'Below normal' },
      { value: 'poor', label: 'Poor / refused' }
    ]
  } },
  meals: { selects: {
    type: [
      { value: 'breakfast', label: 'Breakfast' },
      { value: 'snack',     label: 'Morning snack' },
      { value: 'lunch',     label: 'Lunch' },
      { value: 'snack2',    label: 'Afternoon snack' },
      { value: 'dinner',    label: 'Dinner' },
      { value: 'other',     label: 'Other' }
    ],
    source: [
      { value: 'homemade',   label: 'Homemade' },
      { value: 'packaged',   label: 'Packaged / commercial' },
      { value: 'restaurant', label: 'Restaurant / outside' },
      { value: 'formula',    label: 'Formula / breast milk' }
    ],
    heavy: [
      { value: 'light',    label: 'Light' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'heavy',    label: 'Heavy / rich / fatty' }
    ],
    amount: [
      { value: 'all',     label: 'All / almost all' },
      { value: 'half',    label: 'About half' },
      { value: 'little',  label: 'Just a little' },
      { value: 'refused', label: 'Refused' }
    ]
  } },
  vomiting: { selects: {
    count: [
      { value: '1',  label: 'Once' },
      { value: '2',  label: 'Twice' },
      { value: '3+', label: '3 or more' }
    ],
    delay: [
      { value: '',       label: 'Not applicable' },
      { value: '<30m',   label: 'Under 30 min' },
      { value: '30-60m', label: '30 – 60 min' },
      { value: '1-2h',   label: '1 – 2 hours' },
      { value: '2-3h',   label: '2 – 3 hours' },
      { value: '3-4h',   label: '3 – 4 hours' },
      { value: '>4h',    label: 'Over 4 hours' }
    ]
  } },
  symptoms: [
    { value: 'bloating',     label: 'Bloating' },
    { value: 'gas',          label: 'Excess gas' },
    { value: 'cramps',       label: 'Stomach cramps' },
    { value: 'rash',         label: 'Skin rash' },
    { value: 'itching',      label: 'Itching' },
    { value: 'swelling',     label: 'Lip / face swelling' },
    { value: 'reflux',       label: 'Reflux / spitting' },
    { value: 'crying',       label: 'Inconsolable crying' },
    { value: 'constipation', label: 'Constipation' },
    { value: 'other',        label: 'Other…' }
  ],
  severity: [
    { value: '1', label: 'Mild',     class: 's1' },
    { value: '2', label: 'Moderate', class: 's2' },
    { value: '3', label: 'Severe',   class: 's3' }
  ]
};

// Fetches the config files from /config and overrides the baked-in defaults.
// Each file is independent: a fetch error or invalid JSON is logged and that
// slot keeps its default, so the form always renders.
async function loadConfigs() {
  const files = [
    ['config/journal_config.json',          json => { JCFG = mergeJCFG(json); }],
    ['config/day_overview_config.json',     json => { if (json.selects) FORMCFG.day      = { selects: json.selects }; }],
    ['config/meals_feeds_config.json',      json => { if (json.selects) FORMCFG.meals    = { selects: json.selects }; }],
    ['config/vomiting_episode_config.json', json => { if (json.selects) FORMCFG.vomiting = { selects: json.selects }; }],
    ['config/symptoms_config.json',         json => { if (Array.isArray(json.symptoms)) FORMCFG.symptoms = json.symptoms; }],
    ['config/severity_config.json',         json => { if (Array.isArray(json.severity)) FORMCFG.severity = json.severity; }],
    ['config/i18n_en.json',                 json => { if (json && typeof json === 'object') Object.assign(I18N.en, json); }],
    ['config/i18n_es.json',                 json => { if (json && typeof json === 'object') Object.assign(I18N.es, json); }],
  ];
  await Promise.all(files.map(async ([path, apply]) => {
    try {
      const sep = path.includes('?') ? '&' : '?';
      const res = await fetch(`${path}${sep}v=${APP_VERSION}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      apply(await res.json());
    } catch(e) {
      console.warn(`Config: using built-in defaults for ${path} (${e.message})`);
    }
  }));
}

// Merge a fetched journal_config over the defaults so a partial file still works.
function mergeJCFG(json) {
  json = json || {};
  const gh = json.github || {};
  const cm = json.commitMessage || {};
  const ca = json.commitAuthor || {};
  return {
    github: {
      username: gh.username || JCFG.github.username,
      reponame: gh.reponame || JCFG.github.reponame
    },
    branch:   json.branch   || JCFG.branch,
    filename: json.filename || JCFG.filename,
    commitMessage: {
      new:  cm.new  || JCFG.commitMessage.new,
      edit: cm.edit || JCFG.commitMessage.edit
    },
    commitAuthor: {
      name:  ca.name  || JCFG.commitAuthor.name,
      email: ca.email || JCFG.commitAuthor.email
    }
  };
}
