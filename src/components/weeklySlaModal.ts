/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Weekly Repair SLA vs Completion Time Modal - PT Aetra Air Tangerang
 * Dedicated full-screen / dialog viewer for Recharts SLA Widget
 */

import { mountWeeklySlaWidget } from "./WeeklySlaRechartsWidget";
import { loadAllUnifiedTickets } from "../services/divisionTicketService";

export interface WeeklySlaModalOptions {
  onClose?: () => void;
}

export function openWeeklySlaModal(options?: WeeklySlaModalOptions): void {
  const existingModal = document.getElementById("aetra-weekly-sla-modal-overlay");
  if (existingModal) {
    existingModal.remove();
  }

  // Create overlay
  const overlay = document.createElement("div");
  overlay.id = "aetra-weekly-sla-modal-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(4px);
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  `;

  const container = document.createElement("div");
  container.className = "weekly-sla-modal-card";
  container.style.cssText = `
    background: #FFFFFF;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
    width: 100%;
    max-width: 1100px;
    max-height: 94vh;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    border: 1px solid #E2E8F0;
    position: relative;
  `;

  // Header bar with close button
  const topBar = document.createElement("div");
  topBar.style.cssText = `
    padding: 12px 20px;
    background: #0F172A;
    color: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #334155;
    position: sticky;
    top: 0;
    z-index: 10;
  `;

  topBar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="width: 34px; height: 34px; border-radius: 8px; background: #2563EB; display: flex; align-items: center; justify-content: center; font-size: 18px;">
        ⏱️
      </div>
      <div>
        <div style="font-size: 15px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.01em;">
          Analisis Waktu Selesai Perbaikan vs Target SLA (Recharts)
        </div>
        <div style="font-size: 11px; color: #94A3B8;">
          Dashboard Eksekutif Kinerja Layanan Lapangan PT Aetra Air Tangerang
        </div>
      </div>
    </div>
    <button id="close-weekly-sla-modal-btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #FFFFFF; border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px;" title="Tutup">
      ✕
    </button>
  `;

  const widgetBody = document.createElement("div");
  widgetBody.style.cssText = "padding: 16px; background: #F8FAFC;";

  container.appendChild(topBar);
  container.appendChild(widgetBody);
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  // Mount React Recharts widget
  const mounted = mountWeeklySlaWidget(widgetBody, {
    initialTickets: loadAllUnifiedTickets(),
  });

  const closeModal = () => {
    mounted.unmount();
    overlay.remove();
    if (options?.onClose) options.onClose();
  };

  const closeBtn = topBar.querySelector("#close-weekly-sla-modal-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  // ESC to close
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closeModal();
      window.removeEventListener("keydown", handleKeydown);
    }
  };
  window.addEventListener("keydown", handleKeydown);
}
