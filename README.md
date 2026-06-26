# BiteByBite · Food & Symptom Journal

A lightweight, data-driven food and symptom diary designed to track daily meals and identify potential food allergies or sensitivities over time.

**No server, no subscription, no tracking.** Your data lives as a JSON file in your own private GitHub repository.

---

## How it works

- The app runs entirely in the browser (static HTML + JS, no build step).
- Entries are stored as `journal.json` in a private GitHub repo you control.
- On every save, the app commits the updated file via the GitHub API.
- Works offline (reads from local cache) and syncs when reconnected.
- Install it on your phone like an app (PWA).

---

## Project structure

```
index.html    — markup and styles
app.js        — all application logic
config.json   — default values pre-filled in the login form (edit this to configure)
manifest.json — PWA metadata
```

### Configuring defaults

Open `config.json` and set your GitHub username and data repository name:

```json
{
  "github": {
    "username": "your-github-username",
    "reponame": "your-data-repo-name"
  }
}
```

These values are fetched by `app.js` on load and pre-fill the login form so you don't have to type them every time. They are **not** credentials — the Personal Access Token is always entered manually and stored only in the browser.

---

## Setup in 5 steps

### 1. Fork or copy this repository

Click **Fork** on GitHub, or create a new repo and upload `index.html`, `app.js`, `config.json`, and `manifest.json`.

### 2. Create a separate private repo for your data

Go to GitHub → New repository → set it **private** → name it something like `BitebyBite`.

> This keeps your health data separate from the app code.

### 3. Enable GitHub Pages on the app repo

Go to your app repo → **Settings → Pages → Source: Deploy from branch → main → / (root)** → Save.

After ~1 minute your app will be live at `https://YOUR-USERNAME.github.io/REPO-NAME/`.

### 4. Generate a Personal Access Token

Go to [GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)](https://github.com/settings/tokens/new):

- Note: `BiteByBite journal`
- Expiration: 1 year (or No expiration)
- Scope: ✅ **repo** (full control of private repositories)

Copy the token — you'll only see it once.

### 5. Open the app and connect

Visit your GitHub Pages URL, then fill in:

| Field | Value |
|-------|-------|
| GitHub username | your GitHub username |
| Repository name | the **data** repo name (e.g. `BitebyBite`) |
| Personal Access Token | the `ghp_…` token you just created |

The token is stored only in your browser's `localStorage` — it never touches any server other than GitHub's own API.

---

## Install on your phone (PWA)

**iPhone / Safari:**
Open the app URL in Safari → tap the Share button (box with arrow) → **Add to Home Screen**.

**Android / Chrome:**
Open the URL in Chrome → tap the three-dot menu → **Add to Home Screen** (or **Install app**).

The app will appear on your home screen and open full-screen, without the browser chrome.

---

## Data format

All entries are stored in `journal.json` in your data repo. Each entry looks like:

```json
{
  "date": "2025-03-15",
  "sleep": "poor",
  "mood": "fussy",
  "activity": "normal",
  "stool": "soft",
  "hydration": "good",
  "newEnv": false,
  "sick": false,
  "meds": false,
  "meals": [
    {
      "type": "breakfast",
      "time": "07:30",
      "source": "homemade",
      "foods": "oatmeal with banana",
      "heavy": "light",
      "amount": "half",
      "newFood": false,
      "gluten": true,
      "dairy": false,
      "egg": false
    }
  ],
  "vomit": "1",
  "delay": "2-3h",
  "symptoms": ["bloating", "cramps"],
  "severity": "2",
  "notes": "Pediatrician visit tomorrow",
  "ts": 1741996800000
}
```

You can open `journal.json` directly on GitHub to review or edit entries manually. Every save creates a commit, so you have a full history of changes.

---

## Security notes

- The PAT is stored in `localStorage` on your device only.
- Use a **private** repo for your data so entries are not publicly accessible.
- To revoke access at any time, delete the token at [github.com/settings/tokens](https://github.com/settings/tokens).
- Never share your PAT with anyone.

---

## Sharing access with a second person (e.g. your partner)

Option A — easiest: share the app URL and let them log in with their own GitHub account if you add them as a collaborator on the data repo (Settings → Collaborators → Add).

Option B: they can use the same PAT from a different device. Just re-enter the credentials on their phone.

---

## Exporting data for a doctor's appointment

In the app → **Settings → Export as JSON** downloads a local backup file (`bitebybite-backup-YYYY-MM-DD.json`) you can attach to an email or open in any spreadsheet app (Google Sheets can import JSON via Apps Script).

---

## License

MIT — use freely, modify as needed.
