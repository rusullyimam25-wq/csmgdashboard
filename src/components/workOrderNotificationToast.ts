/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Real-Time Work Order Notification Toast System - PT Aetra Air Tangerang
 * Renders interactive floating toast notifications when officers update work orders.
 */

import { DIVISIONS, DivisionId } from "../types/division";
import {
  WorkOrderNotification,
  subscribeToWorkOrderNotifications,
  markNotificationAsRead,
} from "../services/workOrderNotificationService";
import { loadAllUnifiedTickets } from "../services/divisionTicketService";
import { openReportPreviewModal } from "../reportPreviewModal";

const MAX_VISIBLE_TOASTS = 4;
const TOAST_DURATION_MS = 8000;

interface ToastRecord {
  card: HTMLElement;
  dismissTimer: any;
  fadeTimer: any;
}

let toastContainer: HTMLElement | null = null;
const activeToasts = new Map<string, ToastRecord>();

function ensureToastContainer(): HTMLElement {
  if (toastContainer && document.body.contains(toastContainer)) {
    return toastContainer;
  }

  const existing = document.getElementById("aetra-toast-container");
  if (existing) {
    toastContainer = existing;
    return existing;
  }

  const container = document.createElement("div");
  container.id = "aetra-toast-container";
  container.style.cssText = `
    position: fixed;
    top: 66px;
    right: 18px;
    z-index: 99995;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 390px;
    width: calc(100vw - 36px);
    pointer-events: none;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  `;

  document.body.appendChild(container);
  toastContainer = container;
  return container;
}

export function initWorkOrderToastListener(): () => void {
  const unsubscribe = subscribeToWorkOrderNotifications((notif) => {
    showWorkOrderToast(notif);
  });

  return () => {
    unsubscribe();
    activeToasts.forEach((record) => {
      if (record.dismissTimer) clearTimeout(record.dismissTimer);
      if (record.fadeTimer) clearTimeout(record.fadeTimer);
      if (record.card && record.card.parentElement) {
        record.card.remove();
      }
    });
    activeToasts.clear();
    if (toastContainer && document.body.contains(toastContainer)) {
      toastContainer.remove();
      toastContainer = null;
    }
  };
}

export function showWorkOrderToast(notif: WorkOrderNotification): void {
  const container = ensureToastContainer();

  // If already visible, don't duplicate
  if (activeToasts.has(notif.id)) return;

  // Prune oldest if exceeded max
  if (activeToasts.size >= MAX_VISIBLE_TOASTS) {
    const oldestKey = activeToasts.keys().next().value;
    if (oldestKey) {
      removeToast(oldestKey);
    }
  }

  const targetMeta = DIVISIONS[notif.targetDivision] || DIVISIONS.minor_repair;
  const officerDivMeta = DIVISIONS[notif.officerDivision] || DIVISIONS.minor_repair;

  // Colors and config based on action type
  let accentColor = "#0284C7";
  let bgGradient = "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)";
  let statusBadgeBg = "#EFF6FF";
  let statusBadgeColor = "#1D4ED8";
  let statusBadgeBorder = "#BFDBFE";
  let statusLabel = "UPDATE WO";
  let statusIcon = "⚡";

  if (notif.actionType === "work_completed") {
    accentColor = "#059669";
    statusBadgeBg = "#ECFDF5";
    statusBadgeColor = "#047857";
    statusBadgeBorder = "#A7F3D0";
    statusLabel = "WO SELESAI";
    statusIcon = "✅";
  } else if (notif.actionType === "work_started") {
    accentColor = "#D97706";
    statusBadgeBg = "#FFFBEB";
    statusBadgeColor = "#B45309";
    statusBadgeBorder = "#FDE68A";
    statusLabel = "MULAI DIKERJAKAN";
    statusIcon = "▶";
  } else if (notif.actionType === "division_transferred") {
    accentColor = "#7C3AED";
    statusBadgeBg = "#F5F3FF";
    statusBadgeColor = "#6D28D9";
    statusBadgeBorder = "#DDD6FE";
    statusLabel = "DIALIHKAN DIVISI";
    statusIcon = "🔄";
  } else if (notif.actionType === "esign_saved") {
    accentColor = "#0284C7";
    statusBadgeBg = "#EFF6FF";
    statusBadgeColor = "#0369A1";
    statusBadgeBorder = "#BFDBFE";
    statusLabel = "E-SIGN TERSIMPAN";
    statusIcon = "✍️";
  }

  const toastCard = document.createElement("div");
  toastCard.className = "aetra-toast-card";
  toastCard.style.cssText = `
    pointer-events: auto;
    background: #FFFFFF;
    border-radius: 14px;
    border: 1px solid #E2E8F0;
    border-left: 5px solid ${accentColor};
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.04);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    overflow: hidden;
    transform: translateX(110%);
    opacity: 0;
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
    cursor: default;
  `;

  // Time string
  const timeStr = new Date(notif.timestamp).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  toastCard.innerHTML = `
    <!-- Top Bar -->
    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
      <div style="display:flex; align-items:center; gap:6px;">
        <span style="display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:800; background:${statusBadgeBg}; color:${statusBadgeColor}; border:1px solid ${statusBadgeBorder}; padding:2px 7px; border-radius:6px; letter-spacing:0.3px;">
          <span>${statusIcon}</span>
          <span>${statusLabel}</span>
          <span style="display:inline-block; width:5px; height:5px; border-radius:50%; background:${accentColor}; animation:toastPulse 1.5s infinite;"></span>
        </span>
        <span style="font-size:10px; color:#64748B; font-weight:600;">${timeStr}</span>
      </div>
      <button type="button" class="toast-close-btn" title="Tutup Notifikasi" style="background:none; border:none; color:#94A3B8; font-size:14px; cursor:pointer; width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; padding:0; transition:background 0.15s ease;">
        ✕
      </button>
    </div>

    <!-- Ticket Identity & Officer -->
    <div style="display:flex; align-items:baseline; justify-content:space-between; gap:6px;">
      <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
        <span style="font-family:monospace; font-size:12px; font-weight:800; color:#0F172A; background:#F1F5F9; border:1px solid #CBD5E1; padding:1px 6px; border-radius:5px;">
          ${notif.ticketId}
        </span>
        ${notif.urgent ? '<span style="font-size:9.5px; font-weight:800; background:#FEF2F2; color:#DC2626; border:1px solid #FECACA; padding:1px 5px; border-radius:4px;">DARURAT</span>' : ""}
      </div>
      <span style="font-size:10.5px; font-weight:700; color:#475569; display:inline-flex; align-items:center; gap:3px;">
        <span>👤</span> <span>${notif.officerName}</span>
      </span>
    </div>

    <!-- Customer & Summary -->
    <div>
      <div style="font-size:12.5px; font-weight:800; color:#1E293B; line-height:1.35; margin-bottom:2px;">
        ${notif.customer}
      </div>
      <div style="font-size:11px; color:#475569; line-height:1.4;">
        ${notif.summary}
      </div>
      ${
        notif.details
          ? `<div style="font-size:10.5px; color:#64748B; background:#F8FAFC; border:1px solid #E2E8F0; padding:4px 8px; border-radius:6px; margin-top:5px; line-height:1.35; font-style:italic;">
              "${notif.details}"
            </div>`
          : ""
      }
    </div>

    <!-- Action Buttons -->
    <div style="display:flex; align-items:center; gap:6px; margin-top:3px;">
      <button type="button" class="toast-action-btn-view" style="flex:1; background:${accentColor}; color:#FFFFFF; border:none; padding:5px 10px; border-radius:7px; font-size:11px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 1px 3px rgba(0,0,0,0.1); transition:opacity 0.15s ease;">
        <span>📋</span> <span>Lihat Detail WO</span>
      </button>
      ${
        notif.actionType === "division_transferred" && notif.targetDivision
          ? `<button type="button" class="toast-action-btn-switch" style="background:#F5F3FF; border:1px solid #DDD6FE; color:#6D28D9; padding:5px 8px; border-radius:7px; font-size:10.5px; font-weight:800; cursor:pointer; white-space:nowrap; display:inline-flex; align-items:center; gap:3px;">
              <span>🔄</span> <span>Buka ${targetMeta.shortName}</span>
            </button>`
          : ""
      }
    </div>

    <!-- Progress Bar (Auto Dismiss) -->
    <div class="toast-progress-bar" style="position:absolute; bottom:0; left:0; height:3px; background:${accentColor}; width:100%; transition:width ${TOAST_DURATION_MS}ms linear; opacity:0.8;"></div>
  `;

  // Attach interactive events
  const closeBtn = toastCard.querySelector(".toast-close-btn") as HTMLButtonElement;
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      removeToast(notif.id);
    };
  }

  const viewBtn = toastCard.querySelector(".toast-action-btn-view") as HTMLButtonElement;
  if (viewBtn) {
    viewBtn.onclick = (e) => {
      e.stopPropagation();
      markNotificationAsRead(notif.id);
      openTicketDetails(notif.ticketId);
      removeToast(notif.id);
    };
  }

  const switchBtn = toastCard.querySelector(".toast-action-btn-switch") as HTMLButtonElement;
  if (switchBtn) {
    switchBtn.onclick = (e) => {
      e.stopPropagation();
      markNotificationAsRead(notif.id);
      window.dispatchEvent(
        new CustomEvent("aetra:switch_division_requested", {
          detail: { divisionId: notif.targetDivision },
        })
      );
      removeToast(notif.id);
    };
  }

  // Auto-dismiss countdown with hover-pause
  let remainingMs = TOAST_DURATION_MS;
  let startTime = Date.now();
  const record: ToastRecord = {
    card: toastCard,
    dismissTimer: null,
    fadeTimer: null,
  };
  const progressBar = toastCard.querySelector(".toast-progress-bar") as HTMLElement;

  function startCountdown() {
    startTime = Date.now();
    if (progressBar) {
      progressBar.style.transition = `width ${remainingMs}ms linear`;
      progressBar.style.width = "0%";
    }
    record.dismissTimer = setTimeout(() => {
      removeToast(notif.id);
    }, remainingMs);
  }

  function pauseCountdown() {
    if (record.dismissTimer) {
      clearTimeout(record.dismissTimer);
      record.dismissTimer = null;
    }
    const elapsed = Date.now() - startTime;
    remainingMs = Math.max(500, remainingMs - elapsed);
    if (progressBar) {
      const computedWidth = getComputedStyle(progressBar).width;
      progressBar.style.transition = "none";
      progressBar.style.width = computedWidth;
    }
  }

  toastCard.onmouseenter = pauseCountdown;
  toastCard.onmouseleave = startCountdown;

  container.appendChild(toastCard);
  activeToasts.set(notif.id, record);

  // Trigger enter animation
  requestAnimationFrame(() => {
    toastCard.style.transform = "translateX(0)";
    toastCard.style.opacity = "1";
    startCountdown();
  });
}

function removeToast(notifId: string): void {
  const record = activeToasts.get(notifId);
  if (!record) return;

  if (record.dismissTimer) {
    clearTimeout(record.dismissTimer);
    record.dismissTimer = null;
  }
  if (record.fadeTimer) {
    clearTimeout(record.fadeTimer);
    record.fadeTimer = null;
  }

  const { card } = record;
  card.style.transform = "translateX(110%)";
  card.style.opacity = "0";

  record.fadeTimer = setTimeout(() => {
    if (card.parentElement) {
      card.remove();
    }
    activeToasts.delete(notifId);
  }, 300);
}

function openTicketDetails(ticketId: string): void {
  const tickets = loadAllUnifiedTickets();
  const ticket = tickets.find((t) => t.id === ticketId);
  if (ticket) {
    openReportPreviewModal({
      item: ticket as any,
      onUpdateItem: () => {
        // Trigger dashboard re-render
        window.dispatchEvent(new CustomEvent("aetra:dashboard_refresh_needed"));
      },
    });
  } else {
    // @ts-ignore
    if (window.Swal) {
      // @ts-ignore
      window.Swal.fire({
        icon: "info",
        title: "Work Order Terbuka",
        text: `Memeriksa catatan tiket ${ticketId}...`,
        timer: 1500,
        showConfirmButton: false,
      });
    }
  }
}
