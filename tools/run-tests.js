#!/usr/bin/env node
// ── Headless Node test runner ───────────────────────────
// Runs the Node-safe slice of the suite (tests/suite.node.js → runNodeSuite())
// without a browser, so it works in CI. The app files are classic scripts that
// share one global scope; we load them + the harness + the Node suite as a single
// script (mirroring how the browser loads them) over a tiny DOM/localStorage stub.
//
//     node tools/run-tests.js
//
// Exits 0 when green, 1 on any failure. No dependencies. DOM-heavy tests (meal
// cards, chips, edit mode, saveEntry) still run only in the browser via
// tests/index.html until we add jsdom.

const fs = require('fs');
const vm = require('vm');
const path = require('path');
const repo = path.join(__dirname, '..');

// ── Minimal shims: enough for pure logic + render-to-innerHTML ──
globalThis.window = globalThis;

function stubEl() {
  return {
    innerHTML: '', textContent: '', value: '', checked: false, readOnly: false,
    disabled: false, style: {}, dataset: {}, options: [],
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    querySelector() { return stubEl(); },
    querySelectorAll() { return []; },
    appendChild() {}, removeChild() {}, remove() {}, insertBefore() {},
    addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute() { return null; }, focus() {}, click() {},
  };
}
const _byId = {};
const _bySel = {};
globalThis.document = {
  getElementById: id => _byId[id] || (_byId[id] = stubEl()),
  querySelector: sel => _bySel[sel] || (_bySel[sel] = stubEl()),
  querySelectorAll: () => [],
  createElement: () => stubEl(),
  addEventListener() {},
  body: stubEl(),
  documentElement: stubEl(),
};
globalThis.addEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
globalThis.navigator = { language: 'en' };
globalThis.confirm = () => true;
globalThis.alert = () => {};
globalThis.fetch = async () => ({ ok: false, status: 0, json: async () => ({}), text: async () => '' });
globalThis.localStorage = (() => {
  let m = {};
  return {
    getItem: k => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: k => { delete m[k]; },
    clear: () => { m = {}; },
  };
})();
// btoa / atob / unescape / encodeURIComponent are Node globals (v16+).

// ── Load app + harness + Node suite as one shared-scope script ──
const files = [
  'src/util.js', 'src/state.js', 'src/storage.js', 'src/i18n.js', 'src/github.js',
  'src/ui.js', 'src/render.js', 'src/log-form.js', 'src/edit-save.js',
  'tests/harness.js', 'tests/mocks.js', 'tests/setup.js', 'tests/suite.node.js',
];
const bundle = files.map(f => fs.readFileSync(path.join(repo, f), 'utf8')).join('\n');
const driver = '\n;globalThis.__run = (async () => { await runNodeSuite(); return results; })();';

try {
  vm.runInThisContext(bundle + driver, { filename: 'node-suite-bundle.js' });
} catch (e) {
  console.error('Failed to load the suite:\n', e);
  process.exit(1);
}

(async () => {
  const results = await globalThis.__run;
  for (const suite of results.suites) {
    const fails = suite.tests.filter(t => t.status === 'fail');
    console.log(`${fails.length ? '✗' : '✓'} ${suite.label}  (${suite.tests.length - fails.length}/${suite.tests.length})`);
    for (const t of fails) console.log(`    ✗ ${t.label}\n      ${t.error}`);
  }
  console.log(`\n${results.pass}/${results.pass + results.fail} passing` + (results.fail ? ` · ${results.fail} failed` : ' ✓'));
  process.exit(results.fail ? 1 : 0);
})();
