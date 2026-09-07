# Web Panel

Personal-use extension (Chrome / Edge / Brave, Manifest V3) that opens a **side panel**
with a site of your choice, without leaving the current tab.

- A **select** at the top with the saved URLs
- **`+`** button — opens a modal with *Name* and *URL* fields to add a new site
- **`r`** button — reloads the displayed page
- **`×`** button — removes the selected URL from the list
- The chosen site is shown below, filling the rest of the panel

The list is stored in `chrome.storage.local`, along with the last selected URL — when you
reopen the panel, it returns to the same site.

## Installation

1. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
2. Enable **Developer mode** (top-right corner).
3. Click **Load unpacked**.
4. Select this folder: `/Users/cristian/Projects26/extension_web`.
5. (Optional) Pin the extension to the toolbar by clicking the puzzle icon → pin.

## Usage

- Click the **W** icon in the toolbar → the side panel opens.
- Choose a site in the select; it loads in the lower area.
- **`+`** to add a new site. The name is free-form; if you omit the URL scheme,
  `https://` is added automatically (`example.com` → `https://example.com`).
- **`r`** reloads. **`×`** removes (asks for confirmation).
- `Esc` or clicking outside closes the modal.

## Default URLs

Preloaded on first run: ChatGPT, Claude, MDN Web Docs, GitHub, and Hacker News.

To change the defaults, edit `DEFAULT_SITES` at the top of `sidepanel.js`. **Note:** this list
is only used when nothing is stored yet. If you have already opened the panel, clear stored
data so the new defaults apply — in the side panel, right-click → *Inspect*, and in the
console run:

```
chrome.storage.local.clear()
```

## Sites that refuse to open in the panel

An iframe cannot display pages that send `X-Frame-Options` or
`Content-Security-Policy: frame-ancestors`. Because this is personal use, the extension
strips those headers — but **only for the domain currently shown in the panel**, and only
on sub-frame requests (`background.js`, via `declarativeNetRequest`). No rule applies to
the rest of your browsing.

Even so, some sites will not work because they block framing in other ways:

- **Google (Accounts, Gmail, Drive), banks**, and similar detect framing via JavaScript
  or refuse login in a frame — there is no workaround, and there should not be one.
- Sites that rely on `SameSite=Strict` cookies may appear logged out.
- Some apps break layout at small widths; drag the panel edge to make it wider.

If a site opens blank, open the panel console (right-click → *Inspect*) to see why it was
blocked.

## Requested permissions and why

| Permission | Reason |
| --- | --- |
| `sidePanel` | open the side panel |
| `storage` | save the site list and current selection |
| `declarativeNetRequestWithHostAccess` + `host_permissions: <all_urls>` | strip `X-Frame-Options`/CSP for the domain shown in the panel |

`<all_urls>` is required because you can add any URL; the rule itself is created only for
the active domain in the panel.

## Files

```
manifest.json    extension configuration (MV3)
background.js    service worker: opens the panel, header-stripping rule
sidepanel.html   panel structure (toolbar + iframe + modal)
sidepanel.css    styles, with automatic light/dark theme
sidepanel.js     logic: storage, select, modal, reload
icons/           "W" icon at 16/32/48/128 sizes
```

## After editing the code

Go back to `chrome://extensions` and click **reload** (⟳) on the extension card.
Changes to `sidepanel.html/css/js` also require closing and reopening the panel.
