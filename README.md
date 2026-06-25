# Sales Tax Gross-Up for Amazon.ca

A small Chrome extension that rewrites the prices shown on **amazon.ca** to
include **your province's sales tax** — so the number on screen reflects roughly
what you'll actually pay, not the pre-tax sticker price.

Grossed-up prices are **recoloured teal** and tagged with a small **`incl. tax`**
label so it's always obvious which numbers the extension has changed.

> $409.99 → **$463.29 `incl. tax`** _(Ontario, 13%)_

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Why

Amazon shows pre-tax prices everywhere while you browse, and the tax only
appears at the very end of checkout, as an Australian I find this disingenuous.
This extension folds the tax back into the prices up front, so comparison
shopping and budgeting reflect the real cost.

You pick your province or territory once (click the extension icon), and prices
are grossed up by that province's **combined sales-tax rate** — HST, GST, or
GST + PST/QST depending on where you are.

> [!IMPORTANT]
> This is an **estimate** for convenience, not an official tax calculation. It
> grosses up **every** price by your province's flat combined rate and makes
> **no** attempt to detect which items are actually taxable (some groceries,
> etc. are exempt or taxed differently).

## Features

- Grosses up prices in place by your province's rate across amazon.ca browsing
  pages.
- **Province selector** in the toolbar popup — all 13 provinces & territories,
  each with its real combined rate (see the table below).
- Recolours modified prices and adds an `incl. tax` tag — no guessing which
  number is which.
- Prices stay **untouched until you pick a province**; a setup nudge opens on
  first install.
- Handles Amazon's different price markups (the split whole/fraction buy-box
  format and the plain-text "list price" / size-selector format).
- Catches lazy-loaded prices (search scroll, carousels, size swatches) and
  client-side navigation via a `MutationObserver`.
- Scoped to **amazon.ca only** — never runs on other Amazon domains.

## Rates by province (2026)

| Province / Territory | Tax | Rate |
| --- | --- | --- |
| Ontario | HST | 13% |
| New Brunswick, Newfoundland & Labrador, PEI | HST | 15% |
| Nova Scotia | HST | 14% |
| British Columbia, Manitoba | GST + PST | 12% |
| Saskatchewan | GST + PST | 11% |
| Quebec | GST + QST | 14.975% |
| Alberta, Yukon, NWT, Nunavut | GST | 5% |

The rates live in [`src/taxRates.js`](src/taxRates.js) — a single source of truth
shared by the content script, popup, and onboarding page.

## What it touches

- **Acts on:** browsing pages (home, search results, product detail / buy box,
  deals, category & browse pages, carousels, wishlists), plus the **cart**
  (`/cart`, `/gp/cart`) and **checkout** (`/checkout/...`).
- **Leaves untouched:** the legacy checkout pipeline (`/gp/buy/`), order history
  / order details, and account / payment pages — those already show real,
  already-taxed totals, so grossing them up would double-count.
- **amazon.ca only:** it does not load on `amazon.com.au` or any other Amazon
  TLD (prices elsewhere already include tax).

## Install (load unpacked)

This isn't on the Chrome Web Store — install it manually:

1. Clone or [download](https://github.com/perryfardella/amazon-ca-hst-gross-up/archive/refs/heads/main.zip)
   this repository.
2. Open `chrome://extensions` in Chrome.
3. Toggle on **Developer mode** (top-right).
4. Click **Load unpacked** and select the project folder
   (`amazon-ca-hst-gross-up`). A welcome tab opens — pick your province.
5. Visit [amazon.ca](https://www.amazon.ca) and search for something — prices
   should appear in teal with an `incl. tax` tag.

You can change your province any time by clicking the extension icon. After
editing any file, return to `chrome://extensions` and click the **reload** icon
on the extension card, then refresh the Amazon tab.

## How it works

- You choose a province in the popup; it's saved to `chrome.storage.sync` and
  the content script looks up the matching rate in `src/taxRates.js`.
- A content script finds Amazon's price elements and reads the value from the
  most reliable source available (the hidden `.a-offscreen` text, the visible
  `.a-price-whole` / `.a-price-fraction` spans, or the plain-text price span),
  grosses it up, and writes it back — keeping the screen-reader text consistent.
- A `MutationObserver` (plus a `history` hook) handles content added after page
  load and client-side navigation, so dynamically loaded prices are grossed up
  too.
- Each processed price is marked with `data-hst-grossed` (and its original value
  stashed in `data-hst-orig`) so switching province re-renders prices live
  without a page reload, and never double-grosses.
- A background service worker opens the onboarding page on first install and
  shows a "needs setup" badge on the icon until a province is chosen.

## Project structure

```
manifest.json        Manifest V3 config
src/taxRates.js      Province → combined rate table (shared source of truth)
src/content.js       All page logic: parse, gross up, rewrite, observe
src/content.css      Colour + "incl. tax" label styling
src/picker.js        Shared province <select> logic (popup + onboarding)
src/popup.html/.css  Toolbar popup UI
src/onboarding.html  First-run welcome / setup page
src/background.js    Service worker: onboarding + setup badge
icons/               Toolbar icons (16/48/128)
```

## Roadmap / ideas

- Optionally distinguish likely-taxable vs likely-exempt items.

## Contributing

Found a price that doesn't get grossed up? Right-click it → **Inspect**, copy
the surrounding element's HTML, and open an issue with it — new price markups
are easy to add once the structure is known.

## Disclaimer

Not affiliated with, endorsed by, or sponsored by Amazon. Prices shown by this
extension are estimates and may not match your actual order total. Use at your
own discretion.

## License

[MIT](LICENSE) © 2026 Perry Fardella
