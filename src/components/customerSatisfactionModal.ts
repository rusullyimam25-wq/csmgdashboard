/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Customer Satisfaction (CSAT) Modal Launcher - PT Aetra Air Tangerang
 */

import { createCustomerSatisfactionDashboardView } from "./CustomerSatisfactionDashboardWidget";
import { DivisionId } from "../types/division";

export function openCustomerSatisfactionModal(initialDivision?: DivisionId | "all"): void {
  const existingModal = document.getElementById("csat-analytics-modal-backdrop");
  if (existingModal) {
    existingModal.remove();
  }

  const backdrop = document.createElement("div");
  backdrop.id = "csat-analytics-modal-backdrop";
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    animation: fadeIn 0.2s ease-out;
  `;

  const modalDialog = document.createElement("div");
  modalDialog.className = "csat-modal-dialog";
  modalDialog.style.cssText = `
    width: 100%;
    max-width: 1100px;
    max-height: 92vh;
    background: #0F172A;
    border: 1px solid #334155;
    border-radius: 20px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  `;

  // Modal Top Bar with Close Button
  const modalTopBar = document.createElement("div");
  modalTopBar.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 20px;
    background: #1E293B;
    border-bottom: 1px solid #334155;
  `;
  modalTopBar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 18px;">⭐</span>
      <span style="font-size: 13.5px; font-weight: 800; color: #F8FAFC;">
        Indeks Kepuasan Pelanggan (CSAT) & Rating Kinerja Petugas
      </span>
    </div>
    <button id="btn-close-csat-modal" type="button" style="background: transparent; border: none; font-size: 20px; color: #94A3B8; cursor: pointer; padding: 4px 8px; border-radius: 6px; line-height: 1;">
      ✕
    </button>
  `;

  const modalBody = document.createElement("div");
  modalBody.style.cssText = `
    padding: 20px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
  `;

  const csatWidget = createCustomerSatisfactionDashboardView({
    divisionFilter: initialDivision || "all",
  });
  modalBody.appendChild(csatWidget);

  modalDialog.appendChild(modalTopBar);
  modalDialog.appendChild(modalBody);
  backdrop.appendChild(modalDialog);
  document.body.appendChild(backdrop);

  const closeBtn = modalTopBar.querySelector("#btn-close-csat-modal");
  const closeModal = () => {
    backdrop.remove();
  };

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
}
