/*
 * Amazon.ca HST Gross-Up
 * ----------------------
 * Rewrites prices shown on amazon.ca browsing pages to include 13% Ontario HST,
 * so the number on screen reflects what you'll actually pay. Every price is
 * grossed up (no attempt to detect which items are truly taxable).
 *
 * Only runs on browsing pages (search, product detail, deals, etc.). It bails
 * out on cart / checkout / order / account pages, where Amazon already shows the
 * real tax line — grossing those up would double-count and mislead.
 */
(() => {
  "use strict";

  // --- Config -------------------------------------------------------------
  // FUTURE: replace this constant with a chrome.storage-backed value to allow
  // an editable rate / province selection via a popup. Keep it the single
  // source of truth for the rate.
  const HST_RATE = 0.13;

  const PROCESSED_ATTR = "data-hst-grossed";

  // Transactional path prefixes where we must NOT gross up. Matched with
  // String.prototype.startsWith against location.pathname, so e.g.
  // "/gp/css/order-history?..." matches "/gp/css/order-history". Easy to extend.
  //
  // NOTE: Cart (/cart, /gp/cart) and the modern checkout (/checkout) are
  // intentionally NOT excluded — the user wants prices grossed up there too.
  const EXCLUDED_PATTERNS = [
    // Checkout / buy flow — legacy pipeline only (modern /checkout is allowed)
    "/gp/buy/", // legacy SPC pipeline
    // Orders
    "/gp/css/order-history",
    "/gp/css/summary",
    "/gp/css/order-details",
    "/your-orders",
    // Account / payments / wallet
    "/gp/your-account",
    "/cpe/yourpayments",
  ];

  function isExcludedPage() {
    const path = location.pathname;
    return EXCLUDED_PATTERNS.some((pat) => path.startsWith(pat));
  }

  // --- Price math ---------------------------------------------------------

  // Parse a money value from arbitrary text. Strips currency symbols/letters and
  // thousands separators, keeps the decimal dot. Returns null if no number.
  function numFromText(text) {
    if (!text) return null;
    const cleaned = text.replace(/[^\d.,]/g, "").replace(/,/g, "");
    if (!cleaned) return null;
    const value = parseFloat(cleaned);
    return Number.isFinite(value) ? value : null;
  }

  // The visible price node for the `a-text-price` format: a direct-child
  // `aria-hidden` span holding the whole price as plain text (e.g. "$619.99"),
  // with no `.a-price-whole`/`.a-price-fraction` split. Used by strikethrough
  // list prices and the twister/size-selector prices. Excludes our own tag.
  function textPriceNode(priceEl) {
    return priceEl.querySelector(
      ':scope > span[aria-hidden="true"]:not(.hst-tag)'
    );
  }

  // Parse the numeric value from a price unit, trying the most reliable source
  // first and falling back as needed (Amazon uses several markups, and
  // `.a-offscreen` is sometimes blank or absent):
  //   1. `.a-offscreen` text (e.g. "$24.99")
  //   2. visible `.a-price-whole` + `.a-price-fraction` spans
  //   3. `a-text-price` plain-text span (e.g. "$619.99")
  function parsePrice(priceEl) {
    const offscreen = priceEl.querySelector(".a-offscreen");
    const fromOffscreen = numFromText(offscreen ? offscreen.textContent : "");
    if (fromOffscreen != null) return fromOffscreen;

    const whole = priceEl.querySelector(".a-price-whole");
    if (whole) {
      const w = whole.textContent.replace(/[^\d]/g, "");
      const fraction = priceEl.querySelector(".a-price-fraction");
      const f = fraction ? fraction.textContent.replace(/[^\d]/g, "") : "00";
      const fromSplit = numFromText(`${w}.${f}`);
      if (fromSplit != null) return fromSplit;
    }

    const textNode = textPriceNode(priceEl);
    if (textNode) return numFromText(textNode.textContent);

    return null;
  }

  // Returns grossed-up amount in whole cents (integer) to avoid float drift.
  function grossUpCents(value) {
    return Math.round(value * (1 + HST_RATE) * 100);
  }

  // --- DOM rewriting ------------------------------------------------------

  function processPriceEl(priceEl) {
    if (priceEl.getAttribute(PROCESSED_ATTR)) return;

    const value = parsePrice(priceEl);
    if (value == null) return;

    // Mark immediately so re-renders / nested scans never double-gross.
    priceEl.setAttribute(PROCESSED_ATTR, "1");

    const totalCents = grossUpCents(value);
    const dollarsInt = Math.floor(totalCents / 100);
    const dollars = dollarsInt.toLocaleString("en-US"); // group thousands
    const cents = (totalCents % 100).toString().padStart(2, "0");

    // Update the visible price. Two layouts:
    const wholeEl = priceEl.querySelector(".a-price-whole");
    if (wholeEl) {
      // Split format: `.a-price-whole` (may contain a child `.a-price-decimal`
      // separator span — preserve it, only replace text nodes) + fraction.
      Array.from(wholeEl.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) node.remove();
      });
      wholeEl.insertBefore(document.createTextNode(dollars), wholeEl.firstChild);

      const fractionEl = priceEl.querySelector(".a-price-fraction");
      if (fractionEl) fractionEl.textContent = cents;
    } else {
      // `a-text-price` format: whole price is plain text in one span. Replace
      // the number while preserving the original currency prefix (e.g. "$").
      const textNode = textPriceNode(priceEl);
      if (textNode) {
        const prefix = (textNode.textContent.match(/^[^\d-]*/) || [""])[0];
        textNode.textContent = `${prefix}${dollars}.${cents}`;
      }
    }

    // Keep the hidden a11y text consistent with the visible number.
    const offscreenEl = priceEl.querySelector(".a-offscreen");
    if (offscreenEl) {
      const symbol =
        (priceEl.querySelector(".a-price-symbol") || {}).textContent || "$";
      offscreenEl.textContent = `${symbol}${dollars}.${cents}`;
    }

    // Recolour the price (via CSS class) and append a small "w/HST" tag once.
    priceEl.classList.add("hst-grossed");
    const tag = document.createElement("span");
    tag.className = "hst-tag";
    tag.textContent = "w/HST";
    tag.setAttribute("aria-hidden", "true");
    priceEl.appendChild(tag);
  }

  // Collect the "price unit" elements to rewrite within `root`. Two shapes:
  //  1. Standard `.a-price` wrappers (search results, buy box, etc.).
  //  2. Orphan price groups where the symbol/whole/fraction spans are NOT
  //     wrapped in `.a-price` (e.g. the large price near a product title).
  //     For these we anchor on `.a-price-whole` and use its immediate parent
  //     (the `aria-hidden` span) as the unit.
  // The `data-hst-grossed` guard in processPriceEl prevents any overlap from
  // being processed twice.
  function collectUnits(root) {
    const units = new Set();
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return units;

    if (root.matches?.(".a-price")) units.add(root);
    if (
      root.matches?.(".a-price-whole") &&
      !root.closest(".a-price") &&
      root.parentElement
    ) {
      units.add(root.parentElement);
    }

    if (root.querySelectorAll) {
      root.querySelectorAll(".a-price").forEach((el) => units.add(el));
      root.querySelectorAll(".a-price-whole").forEach((whole) => {
        if (!whole.closest(".a-price") && whole.parentElement) {
          units.add(whole.parentElement);
        }
      });
    }
    return units;
  }

  function scan(root) {
    collectUnits(root).forEach(processPriceEl);
  }

  // --- Dynamic content (lazy-loaded results, carousels, SPA nav) -----------

  let observer = null;
  const pendingNodes = new Set();
  let frameScheduled = false;

  function flushPending() {
    frameScheduled = false;
    const nodes = Array.from(pendingNodes);
    pendingNodes.clear();
    nodes.forEach(scan);
  }

  function startObserving() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === Node.ELEMENT_NODE) pendingNodes.add(n);
        });
      }
      if (!frameScheduled && pendingNodes.size) {
        frameScheduled = true;
        requestAnimationFrame(flushPending);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserving() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    pendingNodes.clear();
  }

  // Re-evaluate exclusion on client-side navigation (Amazon does some SPA-style
  // route changes). Patch history methods to emit an event we can listen for.
  function installUrlChangeListener() {
    const emit = () => window.dispatchEvent(new Event("hst:locationchange"));
    for (const method of ["pushState", "replaceState"]) {
      const original = history[method];
      history[method] = function (...args) {
        const result = original.apply(this, args);
        emit();
        return result;
      };
    }
    window.addEventListener("popstate", emit);
    window.addEventListener("hst:locationchange", applyForCurrentPage);
  }

  function applyForCurrentPage() {
    if (isExcludedPage()) {
      stopObserving();
      return;
    }
    scan(document.body);
    startObserving();
  }

  // --- Init ---------------------------------------------------------------
  installUrlChangeListener();
  applyForCurrentPage();
})();
