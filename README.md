# Amazon.ca HST Gross-Up

A Chrome extension that rewrites prices on **amazon.ca** to include **13%
Ontario HST**, so the price you see while browsing reflects what you'll actually
pay. Grossed-up prices are recoloured (teal) and tagged with a small `w/HST`
label.

> **Note:** It grosses up *every* price — it makes no attempt to detect which
> items are actually taxable. It assumes Ontario (13% HST).

## What it does / doesn't touch

- **Acts on:** browsing pages — home, search results, product detail (buy box),
  deals, category/browse pages, carousels, wishlists — plus the **cart**
  (`/cart`, `/gp/cart`) and **checkout** (`/checkout/...`).
- **Leaves untouched:** the legacy checkout pipeline (`/gp/buy/`), order history
  / order details, and account/payment pages. On those, Amazon already shows a
  real tax line, so grossing them up would double-count.
- **amazon.ca only.** It does not load on `amazon.com.au` or any other Amazon
  TLD (prices there already include tax).

## Install (load unpacked)

1. Open `chrome://extensions`.
2. Toggle on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder
   (`amazon-ca-hst-gross-up`).
4. Visit [amazon.ca](https://www.amazon.ca) and search for something — prices
   should appear in teal with a `w/HST` tag.

After editing any file, return to `chrome://extensions` and click the **reload**
icon on the extension card.

## Changing the tax rate

The rate is a single constant at the top of `src/content.js`:

```js
const HST_RATE = 0.13;
```

Change it (e.g. `0.05` for GST-only provinces) and reload the extension.

## How it works

- A content script finds Amazon's `.a-price` elements. The full value is read
  from the hidden `.a-offscreen` span, grossed up, and written back into the
  visible `.a-price-whole` / `.a-price-fraction` spans (and the offscreen text,
  for screen-reader consistency).
- A `MutationObserver` handles lazy-loaded results, carousels and SPA-style
  navigation, so prices added after page load are also grossed up.
- Processed prices are marked with `data-hst-grossed` to avoid double-grossing.

## Known limitations

- Prices not wrapped in any of Amazon's recognised price markup (`.a-price`,
  `.a-price-whole`/`.a-price-fraction`, or the `a-text-price` plain-text span)
  are not modified. If you spot one, capture its HTML and it can be added.
- No popup UI yet. A future version may add an on/off toggle and an editable
  rate (province presets) via `chrome.storage`.

## File layout

```
manifest.json     Manifest V3 config
src/content.js    All logic: parse, gross up, rewrite, observe
src/content.css   Colour + "w/HST" label styling
icons/            Toolbar icons (16/48/128)
```
