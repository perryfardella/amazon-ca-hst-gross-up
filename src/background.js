/*
 * Service worker: first-run onboarding + "needs setup" toolbar badge.
 * -------------------------------------------------------------------
 * The content script does nothing until the user has chosen a province, so we
 * nudge them: on install we open the onboarding page, and we show an orange "!"
 * badge on the toolbar icon whenever no province is stored (cleared once set).
 */

const BADGE_NEEDS_SETUP = "!";
const BADGE_COLOR = "#d9730d"; // orange

function refreshBadge() {
  chrome.storage.sync.get("province", (data) => {
    const configured = !!(data && data.province);
    chrome.action.setBadgeText({ text: configured ? "" : BADGE_NEEDS_SETUP });
    if (!configured) {
      chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
    }
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/onboarding.html") });
  }
  refreshBadge();
});

chrome.runtime.onStartup.addListener(refreshBadge);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.province) refreshBadge();
});

// Set the badge when the worker first spins up (e.g. after a browser restart
// where onStartup may have already fired before this listener registered).
refreshBadge();
