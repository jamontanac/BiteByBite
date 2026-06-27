// ── Fetch mock ──────────────────────────────────────────
const _originalFetch   = window.fetch;
const _originalConfirm = window.confirm;

function b64(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2))));
}

function makeGitHubFileResponse(entries = [], sha = 'sha-000') {
  return { sha, content: b64(entries) };
}

function makeResponse({ status = 200, body = {} }) {
  const str = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status < 400 ? 'OK' : 'Error',
    json:  async () => JSON.parse(str),
    text:  async () => str,
  };
}

// Default responses for all GitHub endpoints the app uses
const DEFAULT_RESPONSES = {
  'GET config.json':
    { status: 200, body: { github: { username: 'testuser', reponame: 'testrepo' } } },

  'GET api.github.com/repos/testuser/testrepo\n':  // repo check (no /contents)
    { status: 200, body: { id: 1, name: 'testrepo' } },

  'GET api.github.com/repos/testuser/testrepo/contents/journal.json':
    { status: 200, body: makeGitHubFileResponse([]) },

  'PUT api.github.com/repos/testuser/testrepo/contents/journal.json':
    { status: 200, body: { content: { sha: 'sha-new' } } },
};

function mockFetch(overrides = {}) {
  const table = { ...DEFAULT_RESPONSES, ...overrides };
  window.fetch = async (url, opts = {}) => {
    const method = (opts.method || 'GET').toUpperCase();
    for (const key of Object.keys(table)) {
      const [kMethod, ...rest] = key.split(' ');
      const kUrl = rest.join(' ').trim();
      if (kMethod === method && url.includes(kUrl)) {
        return makeResponse(table[key]);
      }
    }
    return makeResponse({ status: 404, body: { message: 'Not Found' } });
  };
}

function restoreFetch()   { window.fetch   = _originalFetch;   }
function restoreConfirm() { window.confirm = _originalConfirm; }
function mockConfirm(v)   { window.confirm = () => v;          }

// Replace saveToGitHub with a no-op and return a restore function
function mockSave() {
  const orig = window.saveToGitHub;
  window.saveToGitHub = async () => { window.ghSha = 'sha-saved'; };
  return () => { window.saveToGitHub = orig; };
}
