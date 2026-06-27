// ── Minimal test harness ────────────────────────────────
const results = { pass: 0, fail: 0, suites: [] };
let _currentSuite = null;

async function describe(label, fn) {
  const suite = { label, tests: [] };
  results.suites.push(suite);
  _currentSuite = suite;
  try { await fn(); } catch (e) { console.error('Suite setup error:', label, e); }
  _currentSuite = null;
}

async function it(label, fn) {
  const test = { label, status: 'pass', error: null };
  if (_currentSuite) _currentSuite.tests.push(test);
  try {
    await fn();
    results.pass++;
  } catch (e) {
    results.fail++;
    test.status = 'fail';
    test.error = e.message;
  }
}

function expect(val) {
  const fail = msg => { throw new Error(msg); };
  const ser  = v => {
    try { return JSON.stringify(v); } catch (_) { return String(v); }
  };
  return {
    toBe:           exp => val !== exp                   && fail(`Expected ${ser(exp)}, got ${ser(val)}`),
    toEqual:        exp => ser(val) !== ser(exp)         && fail(`Expected\n  ${ser(exp)}\ngot\n  ${ser(val)}`),
    toBeTruthy:     ()  => !val                          && fail(`Expected truthy, got ${ser(val)}`),
    toBeFalsy:      ()  => !!val                         && fail(`Expected falsy, got ${ser(val)}`),
    toBeNull:       ()  => val !== null                  && fail(`Expected null, got ${ser(val)}`),
    toContain:      s   => !String(val).includes(String(s)) && fail(`"${val}" does not contain "${s}"`),
    toHaveLength:   n   => val.length !== n              && fail(`Expected length ${n}, got ${val.length}`),
    toBeGreaterThan: n  => val <= n                      && fail(`Expected ${val} > ${n}`),
    not: {
      toBe:        exp => val === exp                    && fail(`Expected not to be ${ser(exp)}`),
      toBeTruthy:  ()  => !!val                          && fail(`Expected falsy, got ${ser(val)}`),
      toBeFalsy:   ()  => !val                           && fail(`Expected truthy, got ${ser(val)}`),
      toBeNull:    ()  => val === null                   && fail(`Expected not to be null`),
      toContain:   s   => String(val).includes(String(s)) && fail(`"${val}" should not contain "${s}"`),
    }
  };
}

function renderResults() {
  const out = document.getElementById('output');
  const total = results.pass + results.fail;
  const pct = total ? Math.round(results.pass / total * 100) : 0;

  let html = `<div class="summary ${results.fail === 0 ? 'all-pass' : 'has-fail'}">
    <span class="big">${results.pass} / ${total}</span>
    <span class="sub">${pct}% passing${results.fail ? ` · ${results.fail} failed` : ' ✓'}</span>
  </div>`;

  for (const suite of results.suites) {
    const failed = suite.tests.filter(t => t.status === 'fail').length;
    html += `<details ${failed ? 'open' : ''} class="suite">
      <summary class="${failed ? 'fail' : 'pass'}">
        ${failed ? '✗' : '✓'} ${suite.label}
        <span class="count">${suite.tests.length - failed}/${suite.tests.length}</span>
      </summary>
      <div class="tests">`;
    for (const t of suite.tests) {
      html += `<div class="test ${t.status}">
        ${t.status === 'pass' ? '✓' : '✗'} ${t.label}
        ${t.error ? `<div class="err">${t.error}</div>` : ''}
      </div>`;
    }
    html += '</div></details>';
  }
  out.innerHTML = html;
}
