/*
 * Combined sales-tax rates by Canadian province / territory (2026).
 * ----------------------------------------------------------------
 * `rate` is the total effective tax a shopper pays at checkout — federal GST
 * plus any provincial component (HST is the harmonized single rate; the GST+PST
 * provinces are summed; Quebec is 5% GST + 9.975% QST, not compounded).
 *
 * Single source of truth, shared (via a global) by the content script, popup,
 * onboarding page, and service worker — there is no bundler, so no imports.
 */
globalThis.TAX_RATES = {
  ON: { name: "Ontario", rate: 0.13 }, // HST
  NB: { name: "New Brunswick", rate: 0.15 }, // HST
  NL: { name: "Newfoundland & Labrador", rate: 0.15 }, // HST
  PE: { name: "Prince Edward Island", rate: 0.15 }, // HST
  NS: { name: "Nova Scotia", rate: 0.14 }, // HST (cut from 15% on Apr 1, 2025)
  BC: { name: "British Columbia", rate: 0.12 }, // 5% GST + 7% PST
  MB: { name: "Manitoba", rate: 0.12 }, // 5% GST + 7% RST
  SK: { name: "Saskatchewan", rate: 0.11 }, // 5% GST + 6% PST
  QC: { name: "Quebec", rate: 0.14975 }, // 5% GST + 9.975% QST
  AB: { name: "Alberta", rate: 0.05 }, // GST only
  YT: { name: "Yukon", rate: 0.05 }, // GST only
  NT: { name: "Northwest Territories", rate: 0.05 }, // GST only
  NU: { name: "Nunavut", rate: 0.05 }, // GST only
};

// Province codes in the order they should appear in the selector (HST provinces
// first, then GST+PST, then GST-only territories — roughly east-to-west/north).
globalThis.PROVINCE_ORDER = [
  "ON",
  "QC",
  "BC",
  "AB",
  "MB",
  "SK",
  "NS",
  "NB",
  "NL",
  "PE",
  "YT",
  "NT",
  "NU",
];
