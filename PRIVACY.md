# Privacy Policy — Sales Tax Gross-Up for Amazon.ca

_Last updated: 2026-06-25_

**Sales Tax Gross-Up for Amazon.ca does not collect, transmit, or sell any
personal data.**

This extension runs entirely on your own device. Specifically:

- It only runs on `amazon.ca` pages.
- It reads the prices shown on the page and rewrites them on screen to include
  your province's sales tax. All of this happens locally in your browser.
- It makes **no network requests** of its own and contacts **no servers**.
- It uses **no analytics, tracking, cookies, or remote code**.
- It does **not** collect personal information, browsing history, payment
  information, or any other user data.
- Nothing is ever sent to us, shared with third parties, or used for
  advertising.

## The one setting we store

The only thing the extension saves is **the province or territory you select**,
so it knows which tax rate to apply. This is a single non-personal preference (a
two-letter province code such as `ON` or `BC`).

It is stored using the browser's extension storage (`chrome.storage.sync`). If
you are signed into Chrome with sync enabled, the browser may sync this single
preference across your own devices through your Google account — this is handled
by Chrome itself, not by us, and the extension never sends it anywhere.

## Permissions

- **`amazon.ca` host access** — used solely to read the displayed prices and
  rewrite them with tax included; nothing else.
- **`storage`** — used solely to remember the province you selected, so you
  don't have to pick it again every time.

## Contact

Questions? Open an issue at
https://github.com/perryfardella/amazon-ca-hst-gross-up/issues
