// ── GitHub API ─────────────────────────────────────────
async function ghGet(path) {
  const r = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${CFG.token}`, Accept: 'application/vnd.github+json' }
  });
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${r.statusText}`);
  return r.json();
}

// Shared writer for PUT/POST (the two were byte-identical bar the verb). ghGet
// stays separate: its `GitHub <status>: …` error text is what the 404 checks in
// loadFromGitHub/ensureJournalBranch match on.
async function ghSend(method, path, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${CFG.token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.message || `GitHub ${r.status}`);
  }
  return r.json();
}

async function loadFromGitHub() {
  try {
    const data = await ghGet(`/repos/${CFG.user}/${CFG.repo}/contents/${JCFG.filename}?ref=${encodeURIComponent(JCFG.branch)}`);
    ghSha = data.sha;
    // Base64 → UTF-8. `atob` alone yields raw bytes; escape + decodeURIComponent
    // turns those bytes back into proper UTF-8 (accents, ñ, curly quotes, em
    // dashes) — the inverse of the btoa(unescape(encodeURIComponent(...))) save.
    const bytes = atob(data.content.replace(/\n/g, ''));
    let decoded;
    try { decoded = decodeURIComponent(escape(bytes)); }
    catch (e) { decoded = bytes; }   // not valid UTF-8 (legacy content) — use as-is
    return JSON.parse(decoded);
  } catch(e) {
    if (e.message.includes('404')) return [];
    throw e;
  }
}

// Builds a unique, timestamped commit message so repeated saves on the same
// day don't collapse into identical messages.
function buildCommitMessage(isEdit, date) {
  const timestamp = new Date().toISOString();
  const tmpl = isEdit ? JCFG.commitMessage.edit : JCFG.commitMessage.new;
  return tmpl.replace(/{ts}/g, timestamp).replace(/{date}/g, date || '');
}

// Builds the `author`/`committer` fields for a commit from JCFG.commitAuthor.
// Both need a name AND an email; if either is missing we send neither, so GitHub
// falls back to attributing the commit to the Personal Access Token owner.
function commitAuthorFields() {
  const a = JCFG.commitAuthor || {};
  if (!a.name || !a.email) return {};
  const who = { name: a.name, email: a.email };
  return { author: who, committer: who };
}

async function saveToGitHub(message) {
  setSyncState('syncing');
  try {
    await ensureJournalBranch();
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(journal, null, 2))));
    const body = {
      message: message || `Update journal ${new Date().toISOString()}`,
      content,
      branch: JCFG.branch,
      ...commitAuthorFields(),
      ...(ghSha ? { sha: ghSha } : {})
    };
    const res = await ghSend('PUT', `/repos/${CFG.user}/${CFG.repo}/contents/${JCFG.filename}`, body);
    ghSha = res.content.sha;
    setSyncState('synced');
    markSynced();
    cacheJournal();
  } catch(e) {
    setSyncState('error');
    throw e;
  }
}

// Ensures the data branch (JCFG.branch) exists, creating it off the repo's
// default branch the first time it's needed. The GitHub contents API will not
// create a branch on its own, so without this the first save would 404/422.
async function ensureJournalBranch() {
  if (journalBranchReady) return;
  const base = `/repos/${CFG.user}/${CFG.repo}`;
  try {
    await ghGet(`${base}/git/ref/heads/${encodeURIComponent(JCFG.branch)}`);
    journalBranchReady = true;            // branch already exists
    return;
  } catch(e) {
    if (!e.message.includes('404')) throw e;
  }
  // Branch is missing → create it from the repo's default branch.
  const repo    = await ghGet(base);
  const baseRef = await ghGet(`${base}/git/ref/heads/${encodeURIComponent(repo.default_branch)}`);
  try {
    await ghSend('POST', `${base}/git/refs`, {
      ref: `refs/heads/${JCFG.branch}`,
      sha: baseRef.object.sha
    });
  } catch(e) {
    // 422 = reference already exists (race from another device) → fine.
    if (!/422|already exists/i.test(e.message)) throw e;
  }
  journalBranchReady = true;
}
