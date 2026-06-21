# Amazon.ca HST Gross-Up

A small Chrome extension that rewrites the prices shown on **amazon.ca** to
include **13% Ontario HST** — so the number on screen reflects roughly what
you'll actually pay, not the pre-tax sticker price.

Grossed-up prices are **recoloured teal** and tagged with a small **`w/HST`**
label so it's always obvious which numbers the extension has changed.

> $409.99 → **$463.29 `w/HST`**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Why

Amazon shows pre-tax prices everywhere while you browse, and the tax only
appears at the very end of checkout, as an Australian I find this disingenuous. This extension folds the tax back into the
prices up front, so comparison shopping and budgeting reflect the real cost.

> [!IMPORTANT]
> This is an **estimate** for convenience, not an official tax calculation. It
> grosses up **every** price by a flat 13% and makes **no** attempt to detect
> which items are actually taxable (some groceries, etc. are exempt or taxed
> differently). It assumes **Ontario (13% HST)**.

## Features

- Grosses up prices in place by 13% across amazon.ca browsing pages.
- Recolours modified prices and adds a `w/HST` tag — no guessing which number
  is which.
- Handles Amazon's different price markups (the split whole/fraction buy-box
  format and the plain-text "list price" / size-selector format).
- Catches lazy-loaded prices (search scroll, carousels, size swatches) and
  client-side navigation via a `MutationObserver`.
- Scoped to **amazon.ca only** — never runs on other Amazon domains.

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
   (`amazon-ca-hst-gross-up`).
5. Visit [amazon.ca](https://www.amazon.ca) and search for something — prices
   should appear in teal with a `w/HST` tag.

After editing any file, return to `chrome://extensions` and click the **reload**
icon on the extension card, then refresh the Amazon tab.

## Configuration

The tax rate is a single constant at the top of [`src/content.js`](src/content.js):

```js
const HST_RATE = 0.13;
```

Change it (e.g. `0.05` for a GST-only province) and reload the extension. The
pages where the extension is *disabled* are listed in the `EXCLUDED_PATTERNS`
array just below it.

## How it works

- A content script finds Amazon's price elements and reads the value from the
  most reliable source available (the hidden `.a-offscreen` text, the visible
  `.a-price-whole` / `.a-price-fraction` spans, or the plain-text price span),
  grosses it up, and writes it back — keeping the screen-reader text consistent.
- A `MutationObserver` (plus a `history` hook) handles content added after page
  load and client-side navigation, so dynamically loaded prices are grossed up
  too.
- Each processed price is marked with `data-hst-grossed` to prevent
  double-grossing on re-render.

## Project structure

```
manifest.json     Manifest V3 config
src/content.js    All logic: parse, gross up, rewrite, observe
src/content.css   Colour + "w/HST" label styling
icons/            Toolbar icons (16/48/128)
```

## Roadmap / ideas

- Popup UI with an on/off toggle and an editable rate (province presets),
  persisted via `chrome.storage`.
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
