# Chrome Web Store listing — copy & answers

Paste these into the Developer Dashboard fields. Nothing here ships in the
extension package; it's just reference for filling out the listing.

---

## Product name
HST Gross-Up for Amazon.ca

## Summary (≤ 132 characters)
See Amazon.ca prices with 13% Ontario HST included, so the price on screen
reflects what you'll actually pay.

## Category
Shopping

## Language
English (Canada)

## Detailed description
Amazon shows pre-tax prices while you browse, and the tax only shows up at the
very end of checkout. HST Gross-Up for Amazon.ca folds the tax back into the
prices up front, so the number you see reflects roughly what you'll actually pay.

Grossed-up prices are recoloured (teal) and tagged with a small "w/HST" label,
so it's always obvious which numbers the extension has changed.

Features:
• Adds 13% Ontario HST to prices across amazon.ca — search results, product
  pages, the cart, and the cart side-sheet.
• Clearly marks every modified price (teal colour + "w/HST" tag).
• Handles Amazon's different price layouts and prices that load as you scroll.
• Runs only on amazon.ca. It does nothing on any other website.

Please note:
• This is an estimate for convenience, not an official tax calculation. It
  applies a flat 13% to every price and does not try to detect items that are
  tax-exempt or taxed differently. It assumes Ontario (13% HST).
• Not affiliated with, endorsed by, or sponsored by Amazon.

Privacy: this extension collects no data of any kind. Everything happens locally
in your browser; it makes no network requests and contacts no servers.

Open source: https://github.com/perryfardella/amazon-ca-hst-gross-up

---

## Single purpose (dashboard field)
This extension has a single purpose: to display the prices on amazon.ca with
Ontario HST (13%) included, so the user sees a tax-inclusive estimate while
shopping.

## Permission justifications (dashboard "Privacy practices" tab)

Host permission — `*://*.amazon.ca/*`:
The extension only operates on amazon.ca. It needs access to that site to read
the prices displayed on the page and rewrite them on screen to include HST. It
does not access any other site, and it does not read or transmit any other data.

Remote code: No remote code is used. All code is contained in the package.

## Data usage disclosures (certify in the dashboard)
- Does the extension collect or use user data? No.
- Sold to third parties? No.
- Used or transferred for purposes unrelated to the single purpose? No.
- Used or transferred to determine creditworthiness / for lending? No.
- Privacy policy URL: (link your hosted PRIVACY.md — see note below)

---

## Assets checklist
- [x] Store icon: 128×128 (icons/icon128.png)
- [ ] Screenshot(s): at least 1, sized 1280×800 or 640×400 (PNG/JPEG).
      Suggested: an amazon.ca search results or product page showing several
      teal "w/HST" prices. Capture from your logged-in browser.
- [ ] (Optional) Small promo tile: 440×280.

## Privacy policy URL options
You must provide a public URL. Easiest options:
1. Enable GitHub Pages on the repo and link the rendered PRIVACY page, or
2. Link the raw file:
   https://github.com/perryfardella/amazon-ca-hst-gross-up/blob/main/PRIVACY.md
