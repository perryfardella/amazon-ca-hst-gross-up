/*
 * Shared province picker, used by both the popup and the onboarding page.
 * Expects in the DOM:
 *   <select id="province-select"></select>
 *   <p id="picker-status"></p>           (optional status line)
 * Reads/writes chrome.storage.sync key "province". Relies on TAX_RATES and
 * PROVINCE_ORDER globals from taxRates.js (loaded first).
 */
(() => {
  "use strict";

  const select = document.getElementById("province-select");
  const status = document.getElementById("picker-status");
  const confirmBtn = document.getElementById("confirm-btn");
  if (!select) return;

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select your province…";
  placeholder.disabled = true;
  select.appendChild(placeholder);

  globalThis.PROVINCE_ORDER.forEach((code) => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = globalThis.TAX_RATES[code].name;
    select.appendChild(opt);
  });

  // Format a rate as a percent string, trimming trailing zeros:
  // 0.14975 -> "14.975", 0.13 -> "13".
  function pct(rate) {
    return parseFloat((rate * 100).toFixed(3)).toString();
  }

  function renderStatus(code) {
    if (!status) return;
    const entry = globalThis.TAX_RATES[code];
    status.textContent = entry
      ? `${entry.name} — prices on Amazon.ca will include ${pct(entry.rate)}% tax.`
      : "Pick your province to start showing tax-included prices.";
  }

  // Enable the confirm/done button only once a valid province is selected.
  function renderConfirm(code) {
    if (confirmBtn) confirmBtn.disabled = !globalThis.TAX_RATES[code];
  }

  function render(code) {
    renderStatus(code);
    renderConfirm(code);
  }

  chrome.storage.sync.get("province", (data) => {
    const code = (data && data.province) || "";
    if (code && globalThis.TAX_RATES[code]) {
      select.value = code;
    } else {
      placeholder.selected = true;
    }
    render(code);
  });

  select.addEventListener("change", () => {
    const code = select.value;
    chrome.storage.sync.set({ province: code });
    render(code);
  });

  if (confirmBtn) {
    confirmBtn.addEventListener("click", () => {
      if (confirmBtn.dataset.action === "shop") {
        // Onboarding: send the user on to where they'd actually shop.
        window.location.href = "https://www.amazon.ca";
      } else {
        // Popup: close it.
        window.close();
      }
    });
  }
})();
