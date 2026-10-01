/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Admin Dashboard Work Order Notification Banner Bar - PT Aetra Air Tangerang
 * Displays real-time field activity banner at the top of the admin dashboard.
 */

import { DivisionId, DIVISIONS } from "../types/division";
import {
  WorkOrderNotification,
  getRecentNotifications,
  subscribeToWorkOrderNotifications,
  markNotificationAsRead,
} from "../services/workOrderNotificationService";
import { loadAllUnifiedTickets } from "../services/divisionTicketService";
import { openReportPreviewModal } from "../reportPreviewModal";

export interface NotificationBannerProps {
  currentDivision: DivisionId;
  onSwitchDivision?: (targetDivision: DivisionId) => void;
}

export function createWorkOrderNotificationBanner(props: NotificationBannerProps): {
  element: HTMLElement;
  cleanup: () => void;
  updateNotification: (notif: WorkOrderNotification | null) => void;
} {
  const bannerContainer = document.createElement("div");
  bannerContainer.className = "aetra-wo-notification-banner-container";
  bannerContainer.style.cssText = `
    width: 100%;
    box-sizing: border-box;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    display: none;
  `;

  let latestNotif: WorkOrderNotification | null = null;
  let isDismissed = false;

  // Initialize with latest unread notification if available
  const recent = getRecentNotifications();
  if (recent.length > 0) {
    const unread = recent.find((n) => !n.isRead) || recent[0];
    // Check if within last 2 hours
    const ageMs = Date.now() - new Date(unread.timestamp).getTime();
    if (ageMs < 7200000) {
      latestNotif = unread;
    }
  }

  function render() {
    if (!latestNotif || isDismissed) {
      bannerContainer.style.display = "none";
      bannerContainer.innerHTML = "";
      return;
    }

    const notif = latestNotif;
    const targetMeta = DIVISIONS[notif.targetDivision] || DIVISIONS.minor_repair;
    const officerMeta = DIVISIONS[notif.officerDivision] || DIVISIONS.minor_repair;

    let bannerBg = "linear-gradient(90deg, #F0FDF4 0%, #DCFCE7 100%)";
    let borderColor = "#86EFAC";
    let accentColor = "#16A34A";
    let statusText = "PEKERJAAN SELESAI";
    let statusIcon = "✅";

    if (notif.actionType === "work_started") {
      bannerBg = "linear-gradient(90deg, #FFFBEB 0%, #FEF3C7 100%)";
      borderColor = "#FDE68A";
      accentColor = "#D97706";
      statusText = "SEDANG DIKERJAKAN";
      statusIcon = "▶";
    } else if (notif.actionType === "division_transferred") {
      bannerBg = "linear-gradient(90deg, #F5F3FF 0%, #EDE9FE 100%)";
      borderColor = "#DDD6FE";
      accentColor = "#7C3AED";
      statusText = "DIALIHKAN KE DIVISI LAIN";
      statusIcon = "🔄";
    } else if (notif.actionType === "esign_saved") {
      bannerBg = "linear-gradient(90deg, #EFF6FF 0%, #DBEAFE 100%)";
      borderColor = "#BFDBFE";
      accentColor = "#0284C7";
      statusText = "E-SIGN TERSIMPAN";
      statusIcon = "✍️";
    }

    bannerContainer.style.display = "block";
    bannerContainer.innerHTML = `
      <div style="background:${bannerBg}; border-bottom:1.5px solid ${borderColor}; padding:8px 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
        <!-- Left: Status Badge & Pulse -->
        <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:280px;">
          <div style="display:inline-flex; align-items:center; gap:5px; background:#FFFFFF; border:1.5px solid ${borderColor}; color:${accentColor}; padding:3px 9px; border-radius:7px; font-size:11px; font-weight:800; white-space:nowrap; box-shadow:0 1px 2px rgba(0,0,0,0.04);">
            <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${accentColor}; box-shadow:0 0 0 3px ${borderColor};"></span>
            <span>${statusIcon}</span>
            <span>${statusText}</span>
          </div>

          <!-- Ticket & Details -->
          <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:#1E293B; flex-wrap:wrap;">
            <span style="font-family:monospace; font-weight:800; background:rgba(255,255,255,0.8); border:1px solid ${borderColor}; padding:1px 6px; border-radius:5px; color:#0F172A;">
              ${notif.ticketId}
            </span>
            <span style="font-weight:700; color:#0F172A;">${notif.customer}</span>
            <span style="color:#64748B;">•</span>
            <span style="color:#475569; display:inline-flex; align-items:center; gap:4px;">
              <span>👤</span> <b>${notif.officerName}</b> (${officerMeta.shortName})
            </span>
            <span style="color:#64748B; font-size:11px;">
              ${notif.summary}
            </span>
          </div>
        </div>

        <!-- Right: Actions -->
        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
          <button type="button" class="banner-view-wo-btn" style="background:${accentColor}; color:#FFFFFF; border:none; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:4px; box-shadow:0 1px 2px rgba(0,0,0,0.1); transition:opacity 0.15s ease;">
            <span>📋</span> <span>Lihat Detail WO</span>
          </button>

          ${
            notif.actionType === "division_transferred" &&
            notif.targetDivision &&
            notif.targetDivision !== props.currentDivision &&
            props.onSwitchDivision
              ? `<button type="button" class="banner-switch-div-btn" style="background:#FFFFFF; border:1px solid ${borderColor}; color:${accentColor}; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:3px;">
                  <span>🔄</span> <span>Buka ${targetMeta.shortName}</span>
                </button>`
              : ""
          }

          <button type="button" class="banner-dismiss-btn" title="Tutup pemberitahuan" style="background:none; border:none; color:#64748B; font-size:14px; cursor:pointer; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; padding:0;">
            ✕
          </button>
        </div>
      </div>
    `;

    // Bind event handlers
    const viewBtn = bannerContainer.querySelector(".banner-view-wo-btn") as HTMLButtonElement;
    if (viewBtn) {
      viewBtn.onclick = () => {
        markNotificationAsRead(notif.id);
        const tickets = loadAllUnifiedTickets();
        const found = tickets.find((t) => t.id === notif.ticketId);
        if (found) {
          openReportPreviewModal({
            item: found as any,
            onUpdateItem: () => {
              window.dispatchEvent(new CustomEvent("aetra:dashboard_refresh_needed"));
            },
          });
        }
      };
    }

    const switchBtn = bannerContainer.querySelector(".banner-switch-div-btn") as HTMLButtonElement;
    if (switchBtn && props.onSwitchDivision && notif.targetDivision) {
      switchBtn.onclick = () => {
        markNotificationAsRead(notif.id);
        props.onSwitchDivision!(notif.targetDivision);
      };
    }

    const dismissBtn = bannerContainer.querySelector(".banner-dismiss-btn") as HTMLButtonElement;
    if (dismissBtn) {
      dismissBtn.onclick = () => {
        isDismissed = true;
        markNotificationAsRead(notif.id);
        render();
      };
    }
  }

  // Subscribe to live incoming notifications
  const unsubscribe = subscribeToWorkOrderNotifications((newNotif) => {
    latestNotif = newNotif;
    isDismissed = false;
    render();
  });

  render();

  return {
    element: bannerContainer,
    cleanup: () => {
      unsubscribe();
      bannerContainer.remove();
    },
    updateNotification: (notif) => {
      latestNotif = notif;
      isDismissed = false;
      render();
    },
  };
}
