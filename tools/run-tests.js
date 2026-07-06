#!/usr/bin/env node
// ── Headless full-suite runner (jsdom) ──────────────────
// Runs the ENTIRE browser suite (tests/suite.js) in Node, so CI covers the same
// 200+ tests as tests/index.html. It builds a jsdom window and reproduces that
// page's bootstrap: intercept DOMContentLoaded, load the app's classic scripts +
// harness + suite as one script (so their shared `let`/`const` globals resolve),
// then buildDOM() → initLogTab() → mockFetch() → runSuite().
//
//     npm test            (or: node tools/run-tests.js)
//
// The app ships zero dependencies; jsdom is a dev-only dependency used only here.
// Exits 0 when green, 1 on any failure.

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const repo = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(repo, f), 'utf8');

// App scripts in the same order as tests/index.html, then the test infrastructure.
const appFiles = ['util', 'state', 'storage', 'i18n', 'github', 'ui', 'render', 'log-form', 'edit-save', 'lifecycle']
  .map(f => `src/${f}.js`);
const testFiles = ['tests/harness.js', 'tests/mocks.js', 'tests/setup.js', 'tests/suite.js'];

// Mirrors tests/index.html STEP 1 — swallow the app's DOMContentLoaded boot.
const intercept = `
(function () {
  var _orig = window.addEventListener.bind(window);
  window.addEventListener = function (type, fn) {
    if (type === 'DOMContentLoaded') return;
    return _orig.apply(window, arguments);
  };
})();`;

// Mirrors tests/index.html STEP 5 — bootstrap, then run. Appended to the bundle so
// it closes over the app's shared globals (results, mealCount, buildDOM, …).
const driver = `
;window.__runAll = async function () {
  buildDOM();
  initLogTab();
  document.getElementById('meals-container').innerHTML = '';
  mealCount = 0;
  mockFetch();
  await runSuite();
  restoreFetch();
  return results;
};`;

const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', e => console.error('[jsdom]', e.detail || e));

const dom = new JSDOM(
  `<!DOCTYPE html><html><body><div id="output"></div>
   <div id="app-root"></div></body></html>`,
  { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://localhost/', virtualConsole }
);
const { window } = dom;

// Fill the handful of globals jsdom doesn't provide but the app/tests touch.
window.matchMedia = window.matchMedia || (() => ({
  matches: false, media: '', onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; },
}));
window.escape = window.escape || global.escape;
window.unescape = window.unescape || global.unescape;
window.btoa = window.btoa || (s => Buffer.from(s, 'binary').toString('base64'));
window.atob = window.atob || (s => Buffer.from(s, 'base64').toString('binary'));
if (typeof window.fetch !== 'function') {
  window.fetch = async () => ({ ok: false, status: 0, json: async () => ({}), text: async () => '' });
}

const bundle = [intercept, ...appFiles.map(read), ...testFiles.map(read), driver].join('\n');

(async () => {
  try {
    window.eval(bundle);
    const results = await window.__runAll();

    for (const suite of results.suites) {
      const fails = suite.tests.filter(t => t.status === 'fail');
      console.log(`${fails.length ? '✗' : '✓'} ${suite.label}  (${suite.tests.length - fails.length}/${suite.tests.length})`);
      for (const t of fails) console.log(`    ✗ ${t.label}\n      ${t.error}`);
    }
    console.log(`\n${results.pass}/${results.pass + results.fail} passing` + (results.fail ? ` · ${results.fail} failed` : ' ✓'));
    process.exit(results.fail ? 1 : 0);
  } catch (e) {
    console.error('Runner crashed:\n', e);
    process.exit(1);
  }
})();
