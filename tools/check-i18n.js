#!/usr/bin/env node
// ── i18n parity guard ───────────────────────────────────
// Verifies that config/i18n_<lang>.json is a faithful mirror of the baked-in
// I18N object in src/i18n.js — same keys, same values, per language. This catches
// the easy mistake of adding a string to src/i18n.js and forgetting to mirror it
// into the JSON (or vice versa: a key that exists only in the JSON).
//
// The browser test suite can't do this (it never fetches the config files), so
// run this from the repo root whenever you touch translations:
//
//     node tools/check-i18n.js
//
// Exits 0 when everything matches, 1 (with a report) when it doesn't. No deps.

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const repo = path.join(__dirname, '..');
const langs = ['en', 'es'];

// Load the baked I18N object out of the classic script without executing the app.
function loadBaked() {
  const src = fs.readFileSync(path.join(repo, 'src', 'i18n.js'), 'utf8');
  const sandbox = {};
  vm.runInNewContext(src + '\nthis.__I18N = I18N;', sandbox);
  return sandbox.__I18N;
}

const baked = loadBaked();
let problems = 0;

for (const lang of langs) {
  const jsonPath = path.join(repo, 'config', `i18n_${lang}.json`);
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const b = baked[lang] || {};

  const bKeys = new Set(Object.keys(b));
  const jKeys = new Set(Object.keys(json));

  const missingInJson = [...bKeys].filter(k => !jKeys.has(k));           // in i18n.js, not mirrored
  const orphanInJson  = [...jKeys].filter(k => !bKeys.has(k));           // only in JSON
  const valueMismatch = [...bKeys].filter(k => jKeys.has(k) && b[k] !== json[k]);

  const langProblems = missingInJson.length + orphanInJson.length + valueMismatch.length;
  problems += langProblems;

  if (langProblems === 0) {
    console.log(`✓ ${lang}: ${bKeys.size} keys match config/i18n_${lang}.json`);
    continue;
  }

  console.log(`✗ ${lang}: config/i18n_${lang}.json out of sync with src/i18n.js`);
  if (missingInJson.length) console.log(`  · ${missingInJson.length} baked key(s) missing from JSON: ${missingInJson.join(', ')}`);
  if (orphanInJson.length)  console.log(`  · ${orphanInJson.length} key(s) only in JSON (not baked): ${orphanInJson.join(', ')}`);
  if (valueMismatch.length) {
    console.log(`  · ${valueMismatch.length} value mismatch(es):`);
    valueMismatch.forEach(k => console.log(`      ${k}\n        i18n.js: ${JSON.stringify(b[k])}\n        json:    ${JSON.stringify(json[k])}`));
  }
}

console.log(problems ? `\n${problems} i18n parity problem(s) found` : '\ni18n config is in sync ✓');
process.exit(problems ? 1 : 0);
