// Open the side panel when clicking the extension icon.
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});
chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

// Many sites send X-Frame-Options / CSP frame-ancestors to prevent being
// displayed inside an iframe. Because this extension is for personal use,
// we strip those headers — but ONLY for the domain currently shown in the
// panel, and only on sub-frame requests.
const RULE_ID = 1;

const STRIPPED_HEADERS = [
  'x-frame-options',
  'frame-options',
  'content-security-policy',
  'content-security-policy-report-only'
];

async function allowFraming(url) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    host = null;
  }

  const removeRules = { removeRuleIds: [RULE_ID] };
  if (!host) {
    await chrome.declarativeNetRequest.updateSessionRules(removeRules);
    return;
  }

  await chrome.declarativeNetRequest.updateSessionRules({
    ...removeRules,
    addRules: [
      {
        id: RULE_ID,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          responseHeaders: STRIPPED_HEADERS.map((header) => ({ header, operation: 'remove' }))
        },
        condition: {
          requestDomains: [host],
          resourceTypes: ['sub_frame']
        }
      }
    ]
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'allowFraming') {
    allowFraming(message.url)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true; // async response
  }
});
