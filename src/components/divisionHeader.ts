/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unified Multi-Division Section Bar Navigation - PT Aetra Air Tangerang
 * Enforces authenticated division isolation and cross-division authorization
 */

import { DivisionId, DIVISIONS, DivisionUserSession } from "../types/division";
import {
  authenticateDivisionLogin,
  DIVISION_ACCOUNTS,
} from "../auth/divisionAuthService";
import {
  getRecentNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  clearAllNotifications,
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  simulateMobileOfficerUpdate,
  subscribeToWorkOrderNotifications,
  WorkOrderNotification,
} from "../services/workOrderNotificationService";
import { loadAllUnifiedTickets } from "../services/divisionTicketService";
import { openReportPreviewModal } from "../reportPreviewModal";
import { openDailyActivityLogModal } from "./dailyActivityLogModal";
import { openWeeklySlaModal } from "./weeklySlaModal";
import {
  openNavigationSidebar,
  toggleNavigationSidebar,
  isNavigationSidebarOpen,
  mountFloatingNavSidebarToggle,
} from "./navigationSidebar";

export interface DivisionHeaderProps {
  currentDivision: DivisionId;
  session?: DivisionUserSession | null;
  onSwitchDivision: (
    targetDivision: DivisionId,
    authorizedSession?: DivisionUserSession
  ) => void;
  onLogout: () => void;
  onRefresh?: () => void;
}

export function createDivisionHeader(props: DivisionHeaderProps): HTMLElement {
  const currentMeta = DIVISIONS[props.currentDivision] || DIVISIONS.customer_service;
  const currentAcc = DIVISION_ACCOUNTS[props.currentDivision];

  const header = document.createElement("header");
  header.className = "division-unified-header";
  header.style.cssText = `
    background: #FFFFFF;
    border-bottom: 1px solid #E2E8F0;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    padding: 0 16px;
    height: 54px;
    min-height: 54px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    position: sticky;
    top: 0;
    z-index: 1000;
    box-sizing: border-box;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  `;

  // Sidebar toggle helper
  const handleToggleNavSidebar = () => {
    toggleNavigationSidebar({
      currentDivision: props.currentDivision,
      session: props.session,
      onSwitchDivision: props.onSwitchDivision,
      onLogout: props.onLogout,
      onRefresh: props.onRefresh,
    });
  };

  // Keyboard shortcut Ctrl+B or Alt+M to toggle sidebar navigation
  const handleGlobalKeydown = (e: KeyboardEvent) => {
    if ((e.ctrlKey && e.key.toLowerCase() === "b") || (e.altKey && e.key.toLowerCase() === "m")) {
      e.preventDefault();
      handleToggleNavSidebar();
    }
  };
  window.addEventListener("keydown", handleGlobalKeydown);

  // 1. Left: Hamburger Toggle Sidebar Button + Brand + Clickable Active Division Badge
  const brandGroup = document.createElement("div");
  brandGroup.style.cssText = `
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  `;

  // Prominent Toggle Sidebar Button
  const navSidebarToggleBtn = document.createElement("button");
  navSidebarToggleBtn.type = "button";
  navSidebarToggleBtn.id = "btn-toggle-nav-sidebar";
  navSidebarToggleBtn.title = "Buka Menu Navigasi & Pilihan Divisi (Ctrl+B)";
  navSidebarToggleBtn.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 800;
    background: #0284C7;
    color: #FFFFFF;
    border: 1px solid #0369A1;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(2, 132, 199, 0.28);
    transition: all 0.15s ease;
    white-space: nowrap;
  `;
  navSidebarToggleBtn.innerHTML = `
    <span style="font-size: 14px; line-height: 1;">☰</span>
    <span>Menu & Divisi</span>
  `;
  navSidebarToggleBtn.onmouseenter = () => {
    navSidebarToggleBtn.style.background = "#0369A1";
    navSidebarToggleBtn.style.transform = "translateY(-1px)";
  };
  navSidebarToggleBtn.onmouseleave = () => {
    navSidebarToggleBtn.style.background = "#0284C7";
    navSidebarToggleBtn.style.transform = "translateY(0)";
  };
  navSidebarToggleBtn.onclick = handleToggleNavSidebar;

  brandGroup.appendChild(navSidebarToggleBtn);

  // Brand Logo
  const logoWrapper = document.createElement("div");
  logoWrapper.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  `;
  logoWrapper.title = "Aetra Air Tangerang - Klik untuk membuka menu navigasi";
  logoWrapper.innerHTML = `
    <img src="/aetra-logo.svg" alt="Aetra Air Tangerang" style="height: 24px; width: auto; object-fit: contain;" />
    <span style="font-size: 11.5px; font-weight: 800; color: #0284C7; letter-spacing: -0.2px; white-space: nowrap;">
      AETRA AquaSync
    </span>
  `;
  logoWrapper.onclick = handleToggleNavSidebar;
  brandGroup.appendChild(logoWrapper);

  const divider = document.createElement("div");
  divider.style.cssText = "width: 1px; height: 18px; background: #E2E8F0;";
  brandGroup.appendChild(divider);

  // Clickable Active Division Badge
  const activeDivBadge = document.createElement("button");
  activeDivBadge.type = "button";
  activeDivBadge.title = "Divisi aktif saat ini. Klik untuk ganti divisi di sidebar.";
  activeDivBadge.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: ${currentMeta.badgeBg};
    border: 1.5px solid ${currentMeta.borderColor};
    color: ${currentMeta.badgeColor};
    padding: 3px 9px;
    border-radius: 7px;
    font-size: 11.5px;
    font-weight: 800;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.15s ease;
  `;
  activeDivBadge.innerHTML = `
    <span>${currentMeta.icon}</span>
    <span>${currentMeta.shortName}</span>
    <span style="font-size: 9px; background: ${currentMeta.badgeColor}; color: #FFF; padding: 1px 5px; border-radius: 4px;">AKTIF</span>
    <span style="font-size: 10px; opacity: 0.7;">▾</span>
  `;
  activeDivBadge.onmouseenter = () => {
    activeDivBadge.style.borderColor = currentMeta.badgeColor;
  };
  activeDivBadge.onmouseleave = () => {
    activeDivBadge.style.borderColor = currentMeta.borderColor;
  };
  activeDivBadge.onclick = handleToggleNavSidebar;
  brandGroup.appendChild(activeDivBadge);

  // 2. Center: Clean & Uncluttered Context Bar (Replacing the cluttered 5-tab bar)
  const centerBar = document.createElement("div");
  centerBar.className = "division-center-clean-bar";
  centerBar.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-width: 0;
    padding: 0 10px;
  `;
  centerBar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
      <span style="font-weight: 700; color: #1E293B;">${currentMeta.name}</span>
      <span style="color: #CBD5E1;">•</span>
      <span style="color: #64748B; font-weight: 500; overflow: hidden; text-overflow: ellipsis;">${currentMeta.tagline}</span>
    </div>
  `;



  // 3. Right: Utility Actions & User Pill
  const rightGroup = document.createElement("div");
  rightGroup.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  `;

  // User Session Pill
  const userPill = document.createElement("div");
  userPill.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 7px;
    font-size: 11px;
    color: #334155;
    white-space: nowrap;
    max-width: 170px;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
  const officerName = props.session?.name || currentAcc.officerName;
  userPill.title = `Login sebagai: ${officerName} (${currentMeta.name})`;
  userPill.innerHTML = `
    <span style="font-size: 12px;">👤</span>
    <span style="font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
      ${officerName.split(" ")[0]}
    </span>
  `;
  rightGroup.appendChild(userPill);

  // Notification Bell Button & Dropdown Center
  const notifContainer = document.createElement("div");
  notifContainer.style.cssText = "position: relative; display: inline-flex; align-items: center;";

  const notifBtn = document.createElement("button");
  notifBtn.type = "button";
  notifBtn.title = "Pusat Notifikasi Update Work Order Petugas Lapangan";
  notifBtn.style.cssText = `
    padding: 5px 8px;
    font-size: 11px;
    font-weight: 700;
    border-radius: 7px;
    background: #F8FAFC;
    border: 1px solid #CBD5E1;
    color: #334155;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.15s ease;
    white-space: nowrap;
    position: relative;
  `;

  function updateNotifBtnBadge() {
    const unread = getUnreadNotificationCount();
    if (unread > 0) {
      notifBtn.style.background = "#FEF2F2";
      notifBtn.style.borderColor = "#FECACA";
      notifBtn.style.color = "#DC2626";
      notifBtn.innerHTML = `
        <span style="font-size: 12px;">🔔</span>
        <span>Notifikasi</span>
        <span style="background: #DC2626; color: #FFF; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 9999px; line-height: 1;">
          ${unread}
        </span>
      `;
    } else {
      notifBtn.style.background = "#F8FAFC";
      notifBtn.style.borderColor = "#CBD5E1";
      notifBtn.style.color = "#334155";
      notifBtn.innerHTML = `
        <span style="font-size: 12px;">🔔</span>
        <span>Notifikasi</span>
      `;
    }
  }

  updateNotifBtnBadge();

  // Listen to notification events for badge updates
  const unsubNotif = subscribeToWorkOrderNotifications(() => {
    updateNotifBtnBadge();
  });
  window.addEventListener("aetra:notifications_updated", updateNotifBtnBadge);

  // Dropdown Popover
  let isNotifOpen = false;
  let activeTab: "all" | "completed" | "in_progress" | "transferred" = "all";
  const dropdown = document.createElement("div");
  dropdown.style.cssText = `
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 380px;
    max-width: 90vw;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    box-shadow: 0 16px 36px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.06);
    z-index: 99999;
    display: none;
    flex-direction: column;
    overflow: hidden;
    animation: fadeInDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  function renderNotificationDropdown() {
    const notifications = getRecentNotifications();
    const unreadCount = getUnreadNotificationCount();
    const soundEnabled = isNotificationSoundEnabled();

    let filtered = notifications;
    if (activeTab === "completed") {
      filtered = notifications.filter((n) => n.actionType === "work_completed");
    } else if (activeTab === "in_progress") {
      filtered = notifications.filter((n) => n.actionType === "work_started");
    } else if (activeTab === "transferred") {
      filtered = notifications.filter((n) => n.actionType === "division_transferred");
    }

    dropdown.innerHTML = `
      <!-- Header -->
      <div style="padding: 12px 14px; background: #0F172A; color: #FFFFFF; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 14px;">🔔</span>
          <span style="font-size: 13px; font-weight: 800; letter-spacing: -0.2px;">Aktivitas Petugas Lapangan</span>
          ${
            unreadCount > 0
              ? `<span style="background: #DC2626; color: #FFF; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 10px;">${unreadCount} Baru</span>`
              : ""
          }
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button type="button" id="notif-toggle-sound-btn" title="Aktifkan/Matikan Suara Notifikasi" style="background: ${soundEnabled ? "rgba(255,255,255,0.15)" : "rgba(220,38,38,0.3)"}; border: none; color: #FFFFFF; font-size: 11px; padding: 3px 7px; border-radius: 6px; cursor: pointer;">
            ${soundEnabled ? "🔊 Suara" : "🔇 Bisu"}
          </button>
          ${
            unreadCount > 0
              ? `<button type="button" id="notif-mark-read-btn" style="background: rgba(255,255,255,0.15); border: none; color: #E2E8F0; font-size: 10.5px; font-weight: 700; padding: 3px 7px; border-radius: 6px; cursor: pointer;">
                  ✓ Dibaca
                </button>`
              : ""
          }
        </div>
      </div>

      <!-- Quick Simulation Bar (For testing toast/banner live) -->
      <div style="padding: 6px 12px; background: #F1F5F9; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 10.5px;">
        <span style="color: #64748B; font-weight: 700; white-space: nowrap;">⚡ Tes Simulasi:</span>
        <div style="display: flex; gap: 4px; overflow-x: auto;">
          <button type="button" id="sim-complete-btn" style="background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; padding: 2px 6px; border-radius: 5px; font-size: 10px; font-weight: 800; cursor: pointer; white-space: nowrap;">
            ✅ Selesai
          </button>
          <button type="button" id="sim-start-btn" style="background: #FFFBEB; border: 1px solid #FDE68A; color: #B45309; padding: 2px 6px; border-radius: 5px; font-size: 10px; font-weight: 800; cursor: pointer; white-space: nowrap;">
            ▶ Dikerjakan
          </button>
          <button type="button" id="sim-transfer-btn" style="background: #F5F3FF; border: 1px solid #DDD6FE; color: #6D28D9; padding: 2px 6px; border-radius: 5px; font-size: 10px; font-weight: 800; cursor: pointer; white-space: nowrap;">
            🔄 Alihkan
          </button>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div style="display: flex; gap: 4px; padding: 6px 12px; background: #FAFAFA; border-bottom: 1px solid #E2E8F0; font-size: 11px;">
        <button type="button" class="notif-tab ${activeTab === "all" ? "active" : ""}" data-tab="all" style="padding: 3px 8px; border-radius: 6px; border: none; font-weight: 700; font-size: 11px; cursor: pointer; background: ${activeTab === "all" ? "#0F172A" : "transparent"}; color: ${activeTab === "all" ? "#FFF" : "#64748B"};">
          Semua (${notifications.length})
        </button>
        <button type="button" class="notif-tab ${activeTab === "completed" ? "active" : ""}" data-tab="completed" style="padding: 3px 8px; border-radius: 6px; border: none; font-weight: 700; font-size: 11px; cursor: pointer; background: ${activeTab === "completed" ? "#059669" : "transparent"}; color: ${activeTab === "completed" ? "#FFF" : "#64748B"};">
          Selesai
        </button>
        <button type="button" class="notif-tab ${activeTab === "in_progress" ? "active" : ""}" data-tab="in_progress" style="padding: 3px 8px; border-radius: 6px; border: none; font-weight: 700; font-size: 11px; cursor: pointer; background: ${activeTab === "in_progress" ? "#D97706" : "transparent"}; color: ${activeTab === "in_progress" ? "#FFF" : "#64748B"};">
          Diproses
        </button>
        <button type="button" class="notif-tab ${activeTab === "transferred" ? "active" : ""}" data-tab="transferred" style="padding: 3px 8px; border-radius: 6px; border: none; font-weight: 700; font-size: 11px; cursor: pointer; background: ${activeTab === "transferred" ? "#7C3AED" : "transparent"}; color: ${activeTab === "transferred" ? "#FFF" : "#64748B"};">
          Dialihkan
        </button>
      </div>

      <!-- Notification List -->
      <div id="notif-list-scroll" style="max-height: 330px; overflow-y: auto; padding: 6px 8px; display: flex; flex-direction: column; gap: 6px;">
        ${
          filtered.length === 0
            ? `<div style="text-align: center; padding: 30px 16px; color: #94A3B8; font-size: 12px;">
                <span style="font-size: 26px; display: block; margin-bottom: 6px;">📭</span>
                Belum ada notifikasi pada filter ini.
              </div>`
            : filtered
                .map((n) => {
                  const divMeta = DIVISIONS[n.targetDivision] || DIVISIONS.minor_repair;
                  const timeAgo = formatTimeAgo(new Date(n.timestamp));
                  let badgeBg = "#EFF6FF";
                  let badgeColor = "#1D4ED8";
                  let badgeText = "UPDATE";

                  if (n.actionType === "work_completed") {
                    badgeBg = "#ECFDF5";
                    badgeColor = "#047857";
                    badgeText = "✅ SELESAI";
                  } else if (n.actionType === "work_started") {
                    badgeBg = "#FFFBEB";
                    badgeColor = "#B45309";
                    badgeText = "▶ PROSES";
                  } else if (n.actionType === "division_transferred") {
                    badgeBg = "#F5F3FF";
                    badgeColor = "#6D28D9";
                    badgeText = "🔄 DIALIHKAN";
                  }

                  return `
                    <div class="notif-item-card" data-id="${n.id}" data-ticket="${n.ticketId}" style="background: ${n.isRead ? "#FFFFFF" : "#F0FDF4"}; border: 1px solid ${n.isRead ? "#E2E8F0" : "#86EFAC"}; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 4px; transition: all 0.15s ease;">
                      <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                        <div style="display: flex; align-items: center; gap: 5px;">
                          <span style="font-size: 10px; font-weight: 800; background: ${badgeBg}; color: ${badgeColor}; padding: 1px 5px; border-radius: 4px;">
                            ${badgeText}
                          </span>
                          <span style="font-family: monospace; font-size: 11px; font-weight: 800; color: #0F172A;">
                            ${n.ticketId}
                          </span>
                        </div>
                        <span style="font-size: 10px; color: #64748B;">${timeAgo}</span>
                      </div>
                      <div style="font-size: 11.5px; font-weight: 700; color: #1E293B;">
                        ${n.customer} • <span style="font-weight: 500; color: #475569;">👤 ${n.officerName}</span>
                      </div>
                      <div style="font-size: 11px; color: #475569; line-height: 1.35;">
                        ${n.summary}
                      </div>
                      <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-top: 4px;">
                        <button type="button" class="notif-btn-open-wo" data-ticket="${n.ticketId}" data-id="${n.id}" style="background: #0284C7; color: #FFF; border: none; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 5px; cursor: pointer;">
                          📋 Buka WO
                        </button>
                      </div>
                    </div>
                  `;
                })
                .join("")
        }
      </div>

      <!-- Footer -->
      <div style="padding: 8px 12px; background: #F8FAFC; border-top: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; color: #64748B;">
        <span>Realtime Sync • BroadcastChannel & LocalStorage</span>
        ${
          notifications.length > 0
            ? `<button type="button" id="notif-clear-all-btn" style="background: none; border: none; color: #DC2626; font-weight: 700; cursor: pointer; padding: 0;">
                Bersihkan Semua
              </button>`
            : ""
        }
      </div>
    `;

    // Bind dropdown events
    const toggleSoundBtn = dropdown.querySelector("#notif-toggle-sound-btn") as HTMLButtonElement;
    if (toggleSoundBtn) {
      toggleSoundBtn.onclick = () => {
        const next = !isNotificationSoundEnabled();
        setNotificationSoundEnabled(next);
        renderNotificationDropdown();
      };
    }

    const markReadBtn = dropdown.querySelector("#notif-mark-read-btn") as HTMLButtonElement;
    if (markReadBtn) {
      markReadBtn.onclick = () => {
        markAllNotificationsAsRead();
        updateNotifBtnBadge();
        renderNotificationDropdown();
      };
    }

    const clearAllBtn = dropdown.querySelector("#notif-clear-all-btn") as HTMLButtonElement;
    if (clearAllBtn) {
      clearAllBtn.onclick = () => {
        clearAllNotifications();
        updateNotifBtnBadge();
        renderNotificationDropdown();
      };
    }

    // Simulation triggers
    const simCompleteBtn = dropdown.querySelector("#sim-complete-btn") as HTMLButtonElement;
    if (simCompleteBtn) {
      simCompleteBtn.onclick = () => {
        simulateMobileOfficerUpdate("work_completed");
        renderNotificationDropdown();
      };
    }

    const simStartBtn = dropdown.querySelector("#sim-start-btn") as HTMLButtonElement;
    if (simStartBtn) {
      simStartBtn.onclick = () => {
        simulateMobileOfficerUpdate("work_started");
        renderNotificationDropdown();
      };
    }

    const simTransferBtn = dropdown.querySelector("#sim-transfer-btn") as HTMLButtonElement;
    if (simTransferBtn) {
      simTransferBtn.onclick = () => {
        simulateMobileOfficerUpdate("division_transferred");
        renderNotificationDropdown();
      };
    }

    // Tab buttons
    dropdown.querySelectorAll(".notif-tab").forEach((btn) => {
      (btn as HTMLElement).onclick = (e) => {
        const target = (e.currentTarget as HTMLElement).getAttribute("data-tab") as any;
        if (target) {
          activeTab = target;
          renderNotificationDropdown();
        }
      };
    });

    // Open WO buttons
    dropdown.querySelectorAll(".notif-btn-open-wo").forEach((btn) => {
      (btn as HTMLElement).onclick = (e) => {
        const ticketId = (e.currentTarget as HTMLElement).getAttribute("data-ticket");
        const notifId = (e.currentTarget as HTMLElement).getAttribute("data-id");
        if (notifId) markNotificationAsRead(notifId);
        updateNotifBtnBadge();
        if (ticketId) {
          const tickets = loadAllUnifiedTickets();
          const found = tickets.find((t) => t.id === ticketId);
          if (found) {
            openReportPreviewModal({
              item: found as any,
              onUpdateItem: () => {
                window.dispatchEvent(new CustomEvent("aetra:dashboard_refresh_needed"));
              },
            });
          }
        }
        dropdown.style.display = "none";
        isNotifOpen = false;
      };
    });
  }

  function formatTimeAgo(date: Date): string {
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 45) return "Baru saja";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  }

  notifBtn.onclick = (e) => {
    e.stopPropagation();
    isNotifOpen = !isNotifOpen;
    if (isNotifOpen) {
      renderNotificationDropdown();
      dropdown.style.display = "flex";
    } else {
      dropdown.style.display = "none";
    }
  };

  // Close dropdown on outside click
  document.addEventListener("click", (e) => {
    if (isNotifOpen && !notifContainer.contains(e.target as Node)) {
      dropdown.style.display = "none";
      isNotifOpen = false;
    }
  });

  notifContainer.appendChild(notifBtn);
  notifContainer.appendChild(dropdown);
  rightGroup.appendChild(notifContainer);

  // Standalone Mobile Officer App Shortcut Button
  const openMobileBtn = document.createElement("a");
  openMobileBtn.href = "/mobile.html";
  openMobileBtn.target = "_blank";
  openMobileBtn.rel = "noopener noreferrer";
  openMobileBtn.title = "Buka Tampilan Khusus HP Petugas Lapangan (Mobile GPS & E-Sign)";
  openMobileBtn.style.cssText = `
    padding: 5px 9px;
    font-size: 11px;
    font-weight: 800;
    border-radius: 7px;
    background: #F0F9FF;
    border: 1px solid #BAE6FD;
    color: #0284C7;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: all 0.15s ease;
    white-space: nowrap;
  `;
  openMobileBtn.innerHTML = `
    <span>📱</span>
    <span>Buka di HP Petugas</span>
    <span style="font-size: 10px; opacity: 0.8;">↗</span>
  `;
  rightGroup.appendChild(openMobileBtn);




  // Logout Button
  const logoutBtn = document.createElement("button");
  logoutBtn.type = "button";
  logoutBtn.title = "Keluar dari sesi portal divisi dan kembali ke halaman login";
  logoutBtn.style.cssText = `
    padding: 5px 9px;
    font-size: 11px;
    font-weight: 700;
    border-radius: 7px;
    background: #FEF2F2;
    border: 1px solid #FECACA;
    color: #DC2626;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    transition: background 0.15s ease;
    white-space: nowrap;
  `;
  logoutBtn.innerHTML = "<span>🚪</span> <span>Keluar</span>";
  logoutBtn.onmouseenter = () => (logoutBtn.style.background = "#FEE2E2");
  logoutBtn.onmouseleave = () => (logoutBtn.style.background = "#FEF2F2");
  logoutBtn.onclick = props.onLogout;
  rightGroup.appendChild(logoutBtn);

  // Assemble into Header
  header.appendChild(brandGroup);
  header.appendChild(centerBar);
  header.appendChild(rightGroup);

  // Remove legacy floating widget toggle if present
  const oldWidgetToggle = document.getElementById("aetra-floating-sidebar-toggle");
  if (oldWidgetToggle) oldWidgetToggle.remove();

  // Mount persistent floating navigation sidebar toggle on viewport left edge
  mountFloatingNavSidebarToggle({
    currentDivision: props.currentDivision,
    session: props.session,
    onSwitchDivision: props.onSwitchDivision,
    onLogout: props.onLogout,
    onRefresh: props.onRefresh,
  });

  return header;
}
