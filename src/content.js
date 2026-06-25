/*
 * Amazon.ca Sales Tax Gross-Up
 * ----------------------------
 * Rewrites prices shown on amazon.ca browsing pages to include the user's
 * provincial sales tax, so the number on screen reflects what they'll actually
 * pay. Every price is grossed up (no attempt to detect which items are truly
 * taxable).
 *
 * The rate comes from the province the user picks in the popup, stored in
 * chrome.storage.sync. Until a province is chosen, prices are left untouched.
 *
 * Only runs on browsing pages (search, product detail, deals, etc.). It bails
 * out on cart / checkout / order / account pages, where Amazon already shows the
 * real tax line — grossing those up would double-count and mislead.
 */
(() => {
  "use strict";

  // --- Config -------------------------------------------------------------
  // Active gross-up rate (e.g. 0.13). Null until a province is loaded from
  // storage; while null, nothing on the page is modified.
  let RATE = null;

  const PROCESSED_ATTR = "data-hst-grossed"; // marks a unit we've grossed up
  const ORIG_ATTR = "data-hst-orig"; // original pre-tax value, for re-rendering

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

  // Containers whose price is plain text (no `.a-price` markup), identified only
  // by class. Each holds a single "$NNN.NN" amount in a descendant text node —
  // e.g. the EWC "added to cart" side-sheet on product/cart pages. Extend as
  // new ones are found.
  const PLAIN_TEXT_PRICE_SELECTORS = [
    ".ewc-subtotal-amount", // cart side-sheet subtotal
    ".ewc-unit-price", // cart side-sheet per-item price
    ".sc-price", // cart page prices (subtotals, item prices)
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

  // Concatenated text of an element's *own* direct text nodes (ignoring text in
  // child elements).
  function ownText(el) {
    return Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent)
      .join("");
  }

  // The element directly holding the visible price text, for markups without the
  // `.a-price-whole`/`.a-price-fraction` split: the `a-text-price` aria-hidden
  // span ("$619.99"), or an EWC leaf such as the `<h2>`/`<span>` inside a cart
  // side-sheet. Returns the deepest descendant whose own text parses to a number
  // (skipping the hidden a11y span and our own tag).
  function plainTextLeaf(priceEl) {
    const candidates = [priceEl, ...priceEl.querySelectorAll("*")];
    for (let i = candidates.length - 1; i >= 0; i--) {
      const node = candidates[i];
      if (
        node.classList &&
        (node.classList.contains("a-offscreen") ||
          node.classList.contains("hst-tag"))
      ) {
        continue;
      }
      if (numFromText(ownText(node)) != null) return node;
    }
    return null;
  }

  // Parse the numeric value from a price unit, trying the most reliable source
  // first and falling back as needed (Amazon uses several markups, and
  // `.a-offscreen` is sometimes blank or absent):
  //   1. `.a-offscreen` text (e.g. "$24.99")
  //   2. visible `.a-price-whole` + `.a-price-fraction` spans
  //   3. a plain-text price element (a-text-price span, EWC leaf, etc.)
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

    const leaf = plainTextLeaf(priceEl);
    if (leaf) return numFromText(ownText(leaf));

    return null;
  }

  // Replace the money amount within a string, preserving the currency symbol and
  // any surrounding whitespace/text. Prefers a `$`-anchored amount so labels like
  // "(3 items): $409.99" don't get the item count rewritten.
  function replacePriceText(text, dollars, cents) {
    const amount = `${dollars}.${cents}`;
    if (/\$\s*[\d.,]*\d/.test(text)) {
      return text.replace(/(\$\s*)[\d.,]*\d/, `$1${amount}`);
    }
    if (/\d/.test(text)) return text.replace(/\d[\d.,]*/, amount);
    return text;
  }

  // Returns grossed-up amount in whole cents (integer) to avoid float drift.
  function grossUpCents(value) {
    return Math.round(value * (1 + RATE) * 100);
  }

  // --- DOM rewriting ------------------------------------------------------

  // Rewrite the visible amount of a single price leaf in place, replacing only
  // its own text nodes so element children (the a11y span, our tag) survive.
  function rewriteLeafAmount(leaf, dollars, cents) {
    const textNodes = Array.from(leaf.childNodes).filter(
      (n) => n.nodeType === Node.TEXT_NODE
    );
    const target = textNodes.find((n) => /\d/.test(n.textContent));
    if (target) {
      target.textContent = replacePriceText(target.textContent, dollars, cents);
    } else if (textNodes[0]) {
      textNodes[0].textContent = `$${dollars}.${cents}`;
    } else {
      leaf.insertBefore(
        document.createTextNode(`$${dollars}.${cents}`),
        leaf.firstChild
      );
    }
  }

  // Write the grossed-up value for `value` into `priceEl`'s visible markup and
  // the hidden a11y text. Idempotent, so it can re-render an already-grossed unit
  // when the rate changes. Returns the element to recolour/tag.
  function renderPrice(priceEl, value) {
    const totalCents = grossUpCents(value);
    const dollarsInt = Math.floor(totalCents / 100);
    const dollars = dollarsInt.toLocaleString("en-US"); // group thousands
    const cents = (totalCents % 100).toString().padStart(2, "0");

    let colorTarget = priceEl;
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
      // Plain-text format (a-text-price span or EWC leaf): the whole price is
      // text in a single element. Rewrite the amount in place and recolour/tag
      // that leaf so it doesn't fight Amazon's own per-element price colour.
      const leaf = plainTextLeaf(priceEl);
      if (leaf) {
        rewriteLeafAmount(leaf, dollars, cents);
        colorTarget = leaf;
      }
    }

    // Keep the hidden a11y text consistent with the visible number.
    const offscreenEl = priceEl.querySelector(".a-offscreen");
    if (offscreenEl) {
      const symbol =
        (priceEl.querySelector(".a-price-symbol") || {}).textContent || "$";
      offscreenEl.textContent = `${symbol}${dollars}.${cents}`;
    }

    return colorTarget;
  }

  function processPriceEl(priceEl) {
    if (priceEl.getAttribute(PROCESSED_ATTR)) return;

    const value = parsePrice(priceEl);
    if (value == null) return;

    // Mark immediately so re-renders / nested scans never double-gross, and
    // stash the original value so a later rate change can re-render from it.
    priceEl.setAttribute(PROCESSED_ATTR, "1");
    priceEl.setAttribute(ORIG_ATTR, String(value));

    const colorTarget = renderPrice(priceEl, value);

    // Recolour the price (via CSS class) and append a small tax tag once.
    colorTarget.classList.add("hst-grossed");
    const tag = document.createElement("span");
    tag.className = "hst-tag";
    tag.textContent = "incl. tax";
    tag.setAttribute("aria-hidden", "true");
    colorTarget.appendChild(tag);
  }

  // Re-render every already-grossed unit from its stored original value using the
  // current RATE. Used when the user switches province while a page is open.
  function reRenderAll() {
    document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach((priceEl) => {
      const orig = parseFloat(priceEl.getAttribute(ORIG_ATTR));
      if (Number.isFinite(orig)) renderPrice(priceEl, orig);
    });
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

    PLAIN_TEXT_PRICE_SELECTORS.forEach((sel) => {
      if (root.matches?.(sel)) units.add(root);
    });

    if (root.querySelectorAll) {
      root.querySelectorAll(".a-price").forEach((el) => units.add(el));
      root.querySelectorAll(".a-price-whole").forEach((whole) => {
        if (!whole.closest(".a-price") && whole.parentElement) {
          units.add(whole.parentElement);
        }
      });
      PLAIN_TEXT_PRICE_SELECTORS.forEach((sel) => {
        root.querySelectorAll(sel).forEach((el) => units.add(el));
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
    // No province chosen yet, or a transactional page — leave prices untouched.
    if (RATE == null || isExcludedPage()) {
      stopObserving();
      return;
    }
    scan(document.body);
    startObserving();
  }

  // --- Storage wiring -----------------------------------------------------

  function rateForProvince(code) {
    const entry = code && globalThis.TAX_RATES[code];
    return entry ? entry.rate : null;
  }

  // React to the user choosing / changing their province in the popup.
  function onProvinceChanged(code) {
    const newRate = rateForProvince(code);
    if (newRate == null) return; // unset / unknown — leave the page as-is

    const wasActive = RATE != null;
    RATE = newRate;
    if (wasActive) {
      // Already grossing up: just re-render the existing prices at the new rate.
      reRenderAll();
    } else {
      // First activation on this page: scan and start watching for new prices.
      applyForCurrentPage();
    }
  }

  // --- Init ---------------------------------------------------------------
  installUrlChangeListener();

  chrome.storage.sync.get("province", (data) => {
    RATE = rateForProvince(data && data.province);
    applyForCurrentPage();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes.province) return;
    onProvinceChanged(changes.province.newValue);
  });
})();
