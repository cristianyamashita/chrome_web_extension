// Default URLs — created on first run.
// Edit this list if you want different defaults (only applies to a new profile;
// after that, data lives in chrome.storage.local).
const DEFAULT_SITES = [
  { id: 'default-chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/' },
  { id: 'default-claude', name: 'Claude', url: 'https://claude.ai/' },
  { id: 'default-mdn', name: 'MDN Web Docs', url: 'https://developer.mozilla.org/' },
  { id: 'default-github', name: 'GitHub', url: 'https://github.com/' },
  { id: 'default-hn', name: 'Hacker News', url: 'https://news.ycombinator.com/' }
];

const selectEl = document.getElementById('site-select');
const addBtn = document.getElementById('add-btn');
const reloadBtn = document.getElementById('reload-btn');
const removeBtn = document.getElementById('remove-btn');
const frameEl = document.getElementById('frame');
const emptyStateEl = document.getElementById('empty-state');
const modalEl = document.getElementById('modal');
const formEl = document.getElementById('site-form');
const nameInput = document.getElementById('name-input');
const urlInput = document.getElementById('url-input');
const formErrorEl = document.getElementById('form-error');

let sites = [];
let selectedId = null;

/* ---------------- storage ---------------- */

async function loadState() {
  const stored = await chrome.storage.local.get(['sites', 'selectedId']);
  if (Array.isArray(stored.sites)) {
    sites = stored.sites;
  } else {
    sites = DEFAULT_SITES.slice();
    await chrome.storage.local.set({ sites });
  }
  selectedId = stored.selectedId ?? null;
  if (!sites.some((site) => site.id === selectedId)) {
    selectedId = sites[0]?.id ?? null;
  }
}

function saveSites() {
  return chrome.storage.local.set({ sites });
}

function saveSelection() {
  return chrome.storage.local.set({ selectedId });
}

/* ---------------- rendering ---------------- */

function currentSite() {
  return sites.find((site) => site.id === selectedId) ?? null;
}

function renderSelect() {
  selectEl.replaceChildren();
  for (const site of sites) {
    const option = document.createElement('option');
    option.value = site.id;
    option.textContent = site.name;
    option.title = site.url;
    selectEl.append(option);
  }
  selectEl.value = selectedId ?? '';

  const hasSite = Boolean(currentSite());
  selectEl.disabled = sites.length === 0;
  reloadBtn.disabled = !hasSite;
  removeBtn.disabled = !hasSite;
}

// Ask the service worker to allow this domain in the iframe BEFORE loading,
// otherwise Chrome blocks the response because of X-Frame-Options / CSP.
async function showCurrentSite() {
  const site = currentSite();

  if (!site) {
    frameEl.hidden = true;
    frameEl.removeAttribute('src');
    emptyStateEl.hidden = false;
    await chrome.runtime.sendMessage({ type: 'allowFraming', url: null }).catch(() => {});
    return;
  }

  emptyStateEl.hidden = true;
  frameEl.hidden = false;

  try {
    await chrome.runtime.sendMessage({ type: 'allowFraming', url: site.url });
  } catch (error) {
    console.warn('Could not adjust response headers:', error);
  }

  // Reassigning src forces a reload even if the URL is the same.
  frameEl.removeAttribute('src');
  frameEl.src = site.url;
}

/* ---------------- modal ---------------- */

function openModal() {
  formErrorEl.hidden = true;
  nameInput.value = '';
  urlInput.value = '';
  modalEl.hidden = false;
  nameInput.focus();
}

function closeModal() {
  modalEl.hidden = true;
}

function normalizeUrl(raw) {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  let parsed;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return parsed.href;
}

/* ---------------- events ---------------- */

selectEl.addEventListener('change', async () => {
  selectedId = selectEl.value;
  await saveSelection();
  await showCurrentSite();
});

addBtn.addEventListener('click', openModal);

reloadBtn.addEventListener('click', showCurrentSite);

removeBtn.addEventListener('click', async () => {
  const site = currentSite();
  if (!site) return;
  if (!confirm(`Remove "${site.name}" from the list?`)) return;

  sites = sites.filter((item) => item.id !== site.id);
  selectedId = sites[0]?.id ?? null;
  await Promise.all([saveSites(), saveSelection()]);
  renderSelect();
  await showCurrentSite();
});

formEl.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();
  const url = normalizeUrl(urlInput.value);

  if (!name) {
    formErrorEl.textContent = 'Enter a name.';
    formErrorEl.hidden = false;
    return;
  }
  if (!url) {
    formErrorEl.textContent = 'Invalid URL. Use http:// or https://.';
    formErrorEl.hidden = false;
    return;
  }

  const site = { id: crypto.randomUUID(), name, url };
  sites.push(site);
  selectedId = site.id;
  await Promise.all([saveSites(), saveSelection()]);

  closeModal();
  renderSelect();
  await showCurrentSite();
});

document.getElementById('cancel-btn').addEventListener('click', closeModal);

modalEl.addEventListener('click', (event) => {
  if (event.target === modalEl) closeModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modalEl.hidden) closeModal();
});

/* ---------------- initialization ---------------- */

(async function init() {
  await loadState();
  renderSelect();
  await showCurrentSite();
})();
