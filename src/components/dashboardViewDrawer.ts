/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dashboard View Customizer Sidebar Drawer Component - PT Aetra Air Tangerang
 * Modern sliding sidebar allowing users to toggle sections and widgets per dashboard,
 * and access division tools without crowding the header or dashboard.
 */

import { DivisionId, DIVISIONS } from "../types/division";
import {
  DASHBOARD_VIEWS_CONFIG,
  getDashboardViewPreferences,
  setViewItemVisible,
  resetDashboardViewPreferences,
  setAllViewsVisible,
} from "../services/dashboardVisibilityService";
import { openDailyActivityLogModal } from "./dailyActivityLogModal";
import { openWeeklySlaModal } from "./weeklySlaModal";

export interface DashboardViewDrawerProps {
  currentDivision: DivisionId;
  onPreferencesChange?: () => void;
  onSwitchDivision?: (divisionId: DivisionId) => void;
}

let activeDrawerEl: HTMLElement | null = null;
let activeBackdropEl: HTMLElement | null = null;
let isDrawerOpen = false;
let currentActiveDivision: DivisionId = "customer_service";
let activeTab: "views" | "tools" | "divisions" = "views";

export function openDashboardViewDrawer(
  division: DivisionId,
  onPreferencesChange?: () => void,
  initialTab?: "views" | "tools" | "divisions"
) {
  if (isDrawerOpen) {
    closeDashboardViewDrawer();
    return;
  }

  isDrawerOpen = true;
  currentActiveDivision = division;
  if (initialTab) activeTab = initialTab;

  const divMeta = DIVISIONS[currentActiveDivision] || DIVISIONS.customer_service;
  const items = DASHBOARD_VIEWS_CONFIG[currentActiveDivision] || [];

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.id = "aetra-view-drawer-backdrop";
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(2px);
    z-index: 99998;
    opacity: 0;
    transition: opacity 0.25s ease;
  `;

  // Drawer Panel (Slides from right)
  const drawer = document.createElement("aside");
  drawer.id = "aetra-view-drawer-panel";
  drawer.style.cssText = `
    position: fixed;
    top: 0;
    right: -450px;
    width: 420px;
    max-width: 92vw;
    height: 100vh;
    background: #FFFFFF;
    box-shadow: -10px 0 36px rgba(15, 23, 42, 0.22);
    border-left: 1px solid #E2E8F0;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    transition: right 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    color: #0F172A;
  `;

  function applyPreset(preset: "default" | "compact" | "all") {
    if (preset === "all") {
      setAllViewsVisible(currentActiveDivision, true);
    } else if (preset === "default") {
      resetDashboardViewPreferences(currentActiveDivision);
    } else if (preset === "compact") {
      // Compact: Keep only tables and search/filter, hide heavy charts/banners
      items.forEach((it) => {
        if (it.id.includes("table") || it.id.includes("filter") || it.id.includes("kanban")) {
          setViewItemVisible(currentActiveDivision, it.id, true);
        } else {
          setViewItemVisible(currentActiveDivision, it.id, false);
        }
      });
    }
    renderDrawerContent();
    if (onPreferencesChange) onPreferencesChange();
  }

  function renderDrawerContent() {
    const prefs = getDashboardViewPreferences(currentActiveDivision);
    const visibleCount = items.filter((it) => prefs[it.id] !== false).length;

    drawer.innerHTML = `
      <!-- Drawer Header -->
      <div style="padding: 16px 20px; border-bottom: 1px solid #E2E8F0; background: #F8FAFC; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 38px; height: 38px; border-radius: 10px; background: ${divMeta.badgeBg}; border: 1.5px solid ${divMeta.borderColor}; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
            🎛️
          </div>
          <div>
            <div style="font-size: 14.5px; font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 6px;">
              Toggle Sidebar & Menu
              <span style="font-size: 9.5px; font-weight: 800; background: ${divMeta.badgeColor}; color: #FFF; padding: 2px 7px; border-radius: 5px;">
                ${divMeta.shortName}
              </span>
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
              Atur tampilan dashboard agar tidak menumpuk & akses menu lengkap.
            </div>
          </div>
        </div>
        <button type="button" id="drawer-close-btn" style="background: none; border: none; font-size: 18px; color: #64748B; cursor: pointer; padding: 6px; border-radius: 8px; line-height: 1; display: flex; align-items: center; justify-content: center; transition: background 0.15s;" title="Tutup Sidebar">
          ✕
        </button>
      </div>

      <!-- Nav Tabs Inside Sidebar -->
      <div style="display: flex; background: #F1F5F9; padding: 4px; gap: 4px; border-bottom: 1px solid #E2E8F0;">
        <button type="button" id="tab-views-btn" style="flex: 1; padding: 7px 10px; font-size: 11.5px; font-weight: 800; border-radius: 7px; border: none; cursor: pointer; transition: all 0.15s; background: ${activeTab === "views" ? "#FFFFFF" : "transparent"}; color: ${activeTab === "views" ? "#0F172A" : "#64748B"}; box-shadow: ${activeTab === "views" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"};">
          🎛️ Tampilan (${visibleCount}/${items.length})
        </button>
        <button type="button" id="tab-tools-btn" style="flex: 1; padding: 7px 10px; font-size: 11.5px; font-weight: 800; border-radius: 7px; border: none; cursor: pointer; transition: all 0.15s; background: ${activeTab === "tools" ? "#FFFFFF" : "transparent"}; color: ${activeTab === "tools" ? "#0F172A" : "#64748B"}; box-shadow: ${activeTab === "tools" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"};">
          ⚡ Fitur & Alat
        </button>
        <button type="button" id="tab-divisions-btn" style="flex: 1; padding: 7px 10px; font-size: 11.5px; font-weight: 800; border-radius: 7px; border: none; cursor: pointer; transition: all 0.15s; background: ${activeTab === "divisions" ? "#FFFFFF" : "transparent"}; color: ${activeTab === "divisions" ? "#0F172A" : "#64748B"}; box-shadow: ${activeTab === "divisions" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"};">
          🏢 Divisi
        </button>
      </div>

      <!-- Tab 1: View Options -->
      <div id="tab-views-content" style="display: ${activeTab === "views" ? "flex" : "none"}; flex-direction: column; flex: 1; overflow: hidden;">
        <!-- Quick Preset Buttons -->
        <div style="padding: 12px 18px; background: #FFFFFF; border-bottom: 1px solid #F1F5F9; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.3px;">
              Mode Tampilan Cepat:
            </span>
            <span style="font-size: 11px; font-weight: 700; color: #0284C7;">
              ${visibleCount} Komponen Aktif
            </span>
          </div>
          <div style="display: flex; gap: 6px;">
            <button type="button" id="preset-compact-btn" title="Hanya tampilkan tabel & filter agar tampilan ringkas dan tidak menumpuk" style="flex: 1; padding: 6px 8px; font-size: 11px; font-weight: 800; background: #FEF3C7; border: 1px solid #FDE68A; color: #B45309; border-radius: 6px; cursor: pointer; transition: all 0.15s;">
              🔍 Mode Ringkas
            </button>
            <button type="button" id="preset-all-btn" title="Tampilkan seluruh widget, grafik, dan metrik" style="flex: 1; padding: 6px 8px; font-size: 11px; font-weight: 800; background: #EFF6FF; border: 1px solid #BFDBFE; color: #1D4ED8; border-radius: 6px; cursor: pointer; transition: all 0.15s;">
              📊 Mode Lengkap
            </button>
            <button type="button" id="preset-reset-btn" title="Kembalikan ke tampilan default bawaan" style="padding: 6px 10px; font-size: 11px; font-weight: 700; background: #F8FAFC; border: 1px solid #CBD5E1; color: #475569; border-radius: 6px; cursor: pointer; transition: all 0.15s;">
              Reset
            </button>
          </div>
        </div>

        <!-- Toggles List -->
        <div id="drawer-toggles-container" style="flex: 1; overflow-y: auto; padding: 14px 18px; display: flex; flex-direction: column; gap: 9px;">
        </div>
      </div>

      <!-- Tab 2: Division Tools (Moved from Header so it doesn't pile up) -->
      <div id="tab-tools-content" style="display: ${activeTab === "tools" ? "flex" : "none"}; flex-direction: column; flex: 1; overflow-y: auto; padding: 16px 18px; gap: 12px;">
        <div style="font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 2px;">
          PILIHAN FITUR & ALAT OPERASIONAL
        </div>
        <div style="font-size: 11px; color: #64748B; margin-top: -8px; margin-bottom: 6px;">
          Fitur dipindahkan ke sidebar agar bilah atas tetap rapi dan tidak menumpuk.
        </div>

        <!-- Daily Activity Log Card -->
        <div id="tool-daily-log-card" style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 12px; padding: 14px; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: flex-start; gap: 12px;">
          <div style="font-size: 24px; line-height: 1;">📋</div>
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 800; color: #15803D;">Rekapitulasi Log Harian Petugas</div>
            <div style="font-size: 11px; color: #166534; margin-top: 3px; line-height: 1.4;">
              Lihat riwayat tugas selesai hari ini per petugas dan unduh laporan resmi dalam format Excel (.xlsx) atau PDF BAST.
            </div>
            <div style="margin-top: 8px;">
              <span style="font-size: 10.5px; font-weight: 800; background: #DCFCE7; color: #15803D; padding: 3px 8px; border-radius: 5px; border: 1px solid #86EFAC;">
                Buka Log & Unduh ➔
              </span>
            </div>
          </div>
        </div>

        <!-- Weekly SLA Widget Card -->
        <div id="tool-sla-widget-card" style="background: #EFF6FF; border: 1.5px solid #BFDBFE; border-radius: 12px; padding: 14px; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: flex-start; gap: 12px;">
          <div style="font-size: 24px; line-height: 1;">⏱️</div>
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 800; color: #1D4ED8;">Widget Analitik SLA Mingguan</div>
            <div style="font-size: 11px; color: #1E40AF; margin-top: 3px; line-height: 1.4;">
              Visualisasi grafik Recharts rata-rata jam penyelesaian kasus vs batas SLA per divisi (Minor Repair, OSS, TKA, Lab).
            </div>
            <div style="margin-top: 8px;">
              <span style="font-size: 10.5px; font-weight: 800; background: #DBEAFE; color: #1D4ED8; padding: 3px 8px; border-radius: 5px; border: 1px solid #93C5FD;">
                Tampilkan Grafik SLA ➔
              </span>
            </div>
          </div>
        </div>

        <!-- Mobile Officer Link Card -->
        <a href="/mobile.html" target="_blank" rel="noopener noreferrer" style="text-decoration: none; background: #F8FAFC; border: 1.5px solid #CBD5E1; border-radius: 12px; padding: 14px; display: flex; align-items: flex-start; gap: 12px; transition: all 0.15s ease;">
          <div style="font-size: 24px; line-height: 1;">📱</div>
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 6px;">
              Portal Petugas Lapangan (HP)
              <span style="font-size: 10px; background: #0284C7; color: #FFF; padding: 1px 6px; border-radius: 4px;">Tab Baru ↗</span>
            </div>
            <div style="font-size: 11px; color: #64748B; margin-top: 3px; line-height: 1.4;">
              Akses khusus smartphone bagi teknisi: checklist GPS, tanda tangan digital BAST pelanggan, dan foto bukti perbaikan.
            </div>
          </div>
        </a>

        <!-- Live Sync Card -->
        <div id="tool-sync-card" style="background: #FDF4FF; border: 1.5px solid #F0ABFC; border-radius: 12px; padding: 14px; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: flex-start; gap: 12px;">
          <div style="font-size: 24px; line-height: 1;">🔄</div>
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 800; color: #A21CAF;">Sinkronisasi Data Realtime</div>
            <div style="font-size: 11px; color: #86198F; margin-top: 3px; line-height: 1.4;">
              Perbarui status tiket komplain dan lembar kerja antar 5 divisi secara instan via BroadcastChannel.
            </div>
            <div style="margin-top: 8px;">
              <span style="font-size: 10.5px; font-weight: 800; background: #FAE8FF; color: #A21CAF; padding: 3px 8px; border-radius: 5px; border: 1px solid #E879F9;">
                Sinkronkan Sekarang 🔄
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: Division Switcher (Clean alternative to crowded tabs) -->
      <div id="tab-divisions-content" style="display: ${activeTab === "divisions" ? "flex" : "none"}; flex-direction: column; flex: 1; overflow-y: auto; padding: 16px 18px; gap: 10px;">
        <div style="font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 2px;">
          PILIHAN PINDAH DIVISI AETRA
        </div>
        <div style="font-size: 11px; color: #64748B; margin-top: -6px; margin-bottom: 4px;">
          Pilih divisi kerja untuk langsung membuka dashboard dan antrean tugasnya:
        </div>
        <div id="drawer-division-list" style="display: flex; flex-direction: column; gap: 8px;">
        </div>
      </div>

      <!-- Footer Info -->
      <div style="padding: 12px 20px; border-top: 1px solid #E2E8F0; background: #F8FAFC; display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #64748B;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span>💾</span>
          <span>Tersimpan otomatis per divisi</span>
        </div>
        <button type="button" id="drawer-done-btn" style="background: ${divMeta.badgeColor}; color: #FFFFFF; border: none; font-weight: 800; font-size: 11.5px; padding: 7px 16px; border-radius: 8px; cursor: pointer; transition: opacity 0.15s;">
          Selesai & Tutup ➔
        </button>
      </div>
    `;

    // Render Tab 1: toggle cards
    const containerEl = drawer.querySelector("#drawer-toggles-container") as HTMLElement;
    if (containerEl && activeTab === "views") {
      items.forEach((item) => {
        const isChecked = prefs[item.id] !== false;

        const row = document.createElement("div");
        row.style.cssText = `
          background: ${isChecked ? "#FFFFFF" : "#F8FAFC"};
          border: 1.5px solid ${isChecked ? "#CBD5E1" : "#E2E8F0"};
          border-radius: 10px;
          padding: 11px 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          transition: all 0.15s ease;
          opacity: ${isChecked ? "1" : "0.7"};
          cursor: pointer;
        `;

        row.onmouseenter = () => {
          row.style.borderColor = isChecked ? "#94A3B8" : "#CBD5E1";
        };
        row.onmouseleave = () => {
          row.style.borderColor = isChecked ? "#CBD5E1" : "#E2E8F0";
        };

        row.innerHTML = `
          <div style="display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0;">
            <div style="font-size: 20px; line-height: 1; flex-shrink: 0; padding-top: 2px;">
              ${item.icon}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 12.5px; font-weight: 800; color: ${isChecked ? "#0F172A" : "#64748B"}; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${item.label}
              </div>
              <div style="font-size: 11px; color: #64748B; line-height: 1.35;">
                ${item.description}
              </div>
            </div>
          </div>

          <!-- Switch Slider -->
          <div style="flex-shrink: 0; position: relative; width: 44px; height: 24px;">
            <input type="checkbox" id="toggle-${item.id}" ${isChecked ? "checked" : ""} style="opacity: 0; width: 0; height: 0; position: absolute;" />
            <div class="aetra-switch-track" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: ${isChecked ? divMeta.badgeColor : "#CBD5E1"}; border-radius: 24px; transition: background 0.2s ease;">
              <div style="position: absolute; content: ''; height: 18px; width: 18px; left: ${isChecked ? "23px" : "3px"}; bottom: 3px; background: #FFFFFF; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: left 0.2s ease;"></div>
            </div>
          </div>
        `;

        const checkbox = row.querySelector(`#toggle-${item.id}`) as HTMLInputElement;
        const toggleAction = (e?: Event) => {
          if (e) e.stopPropagation();
          const nextState = !checkbox.checked;
          checkbox.checked = nextState;
          setViewItemVisible(currentActiveDivision, item.id, nextState);
          renderDrawerContent();
          updateFloatingBadge();
          if (onPreferencesChange) onPreferencesChange();
        };

        row.onclick = () => toggleAction();
        checkbox.onchange = (e) => toggleAction(e);

        containerEl.appendChild(row);
      });
    }

    // Render Tab 3: division switcher items
    const divListEl = drawer.querySelector("#drawer-division-list") as HTMLElement;
    if (divListEl && activeTab === "divisions") {
      const allDivKeys: DivisionId[] = [
        "customer_service",
        "minor_repair",
        "sales_support",
        "key_account",
        "technical_support",
      ];
      allDivKeys.forEach((key) => {
        const d = DIVISIONS[key];
        const isActive = key === currentActiveDivision;
        const item = document.createElement("div");
        item.style.cssText = `
          padding: 11px 13px;
          border-radius: 10px;
          border: 1.5px solid ${isActive ? d.borderColor : "#E2E8F0"};
          background: ${isActive ? d.badgeBg : "#FFFFFF"};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: all 0.15s ease;
        `;
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 20px;">${d.icon}</div>
            <div>
              <div style="font-size: 12.5px; font-weight: 800; color: ${isActive ? d.badgeColor : "#0F172A"};">
                ${d.name}
              </div>
              <div style="font-size: 11px; color: #64748B;">
                ${d.tagline}
              </div>
            </div>
          </div>
          ${
            isActive
              ? `<span style="font-size: 10px; font-weight: 800; background: ${d.badgeColor}; color: #FFF; padding: 2px 7px; border-radius: 4px;">AKTIF</span>`
              : `<span style="font-size: 11px; color: #64748B; font-weight: 700;">Buka ➔</span>`
          }
        `;
        item.onclick = () => {
          if (!isActive) {
            closeDashboardViewDrawer();
            window.dispatchEvent(
              new CustomEvent("aetra:switch_division_requested", {
                detail: { divisionId: key },
              })
            );
          }
        };
        divListEl.appendChild(item);
      });
    }

    // Tab buttons switching
    const tabViewsBtn = drawer.querySelector("#tab-views-btn") as HTMLButtonElement;
    if (tabViewsBtn) {
      tabViewsBtn.onclick = () => {
        activeTab = "views";
        renderDrawerContent();
      };
    }
    const tabToolsBtn = drawer.querySelector("#tab-tools-btn") as HTMLButtonElement;
    if (tabToolsBtn) {
      tabToolsBtn.onclick = () => {
        activeTab = "tools";
        renderDrawerContent();
      };
    }
    const tabDivisionsBtn = drawer.querySelector("#tab-divisions-btn") as HTMLButtonElement;
    if (tabDivisionsBtn) {
      tabDivisionsBtn.onclick = () => {
        activeTab = "divisions";
        renderDrawerContent();
      };
    }

    // Preset buttons
    const presetCompactBtn = drawer.querySelector("#preset-compact-btn") as HTMLButtonElement;
    if (presetCompactBtn) presetCompactBtn.onclick = () => applyPreset("compact");
    const presetAllBtn = drawer.querySelector("#preset-all-btn") as HTMLButtonElement;
    if (presetAllBtn) presetAllBtn.onclick = () => applyPreset("all");
    const presetResetBtn = drawer.querySelector("#preset-reset-btn") as HTMLButtonElement;
    if (presetResetBtn) presetResetBtn.onclick = () => applyPreset("default");

    // Tools card handlers
    const toolDailyLogCard = drawer.querySelector("#tool-daily-log-card") as HTMLElement;
    if (toolDailyLogCard) {
      toolDailyLogCard.onclick = () => {
        closeDashboardViewDrawer();
        openDailyActivityLogModal({ divisionId: currentActiveDivision });
      };
    }
    const toolSlaWidgetCard = drawer.querySelector("#tool-sla-widget-card") as HTMLElement;
    if (toolSlaWidgetCard) {
      toolSlaWidgetCard.onclick = () => {
        closeDashboardViewDrawer();
        openWeeklySlaModal();
      };
    }
    const toolSyncCard = drawer.querySelector("#tool-sync-card") as HTMLElement;
    if (toolSyncCard) {
      toolSyncCard.onclick = () => {
        window.dispatchEvent(new CustomEvent("aetra:dashboard_refresh_needed"));
        window.dispatchEvent(
          new CustomEvent("aetra:dashboard_view_preference_changed", {
            detail: { division: currentActiveDivision },
          })
        );
        // @ts-ignore
        if (window.Swal) {
          // @ts-ignore
          window.Swal.fire({
            icon: "success",
            title: "Data Disinkronkan",
            text: "Status tiket antardivisi telah disinkronkan ke seluruh terminal.",
            timer: 1500,
            showConfirmButton: false,
          });
        }
      };
    }

    // Close & Done buttons
    const closeBtn = drawer.querySelector("#drawer-close-btn") as HTMLButtonElement;
    if (closeBtn) closeBtn.onclick = () => closeDashboardViewDrawer();
    const doneBtn = drawer.querySelector("#drawer-done-btn") as HTMLButtonElement;
    if (doneBtn) doneBtn.onclick = () => closeDashboardViewDrawer();
  }

  renderDrawerContent();

  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  activeBackdropEl = backdrop;
  activeDrawerEl = drawer;

  backdrop.onclick = () => closeDashboardViewDrawer();

  // Escape key handler
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closeDashboardViewDrawer();
      window.removeEventListener("keydown", handleKeyDown);
    }
  };
  window.addEventListener("keydown", handleKeyDown);

  // Animate in
  requestAnimationFrame(() => {
    backdrop.style.opacity = "1";
    drawer.style.right = "0px";
  });
}

export function closeDashboardViewDrawer() {
  if (!isDrawerOpen) return;
  isDrawerOpen = false;

  if (activeDrawerEl) {
    activeDrawerEl.style.right = "-450px";
  }
  if (activeBackdropEl) {
    activeBackdropEl.style.opacity = "0";
  }

  setTimeout(() => {
    if (activeDrawerEl && activeDrawerEl.parentNode) {
      activeDrawerEl.parentNode.removeChild(activeDrawerEl);
    }
    if (activeBackdropEl && activeBackdropEl.parentNode) {
      activeBackdropEl.parentNode.removeChild(activeBackdropEl);
    }
    activeDrawerEl = null;
    activeBackdropEl = null;
  }, 300);
}

// Floating Sidebar Toggle Button mounted on the right edge of viewport
let floatingBtnEl: HTMLElement | null = null;

export function mountFloatingSidebarToggle(
  currentDivision: DivisionId,
  onPreferencesChange?: () => void
): void {
  // Remove existing if any
  const existing = document.getElementById("aetra-floating-sidebar-toggle");
  if (existing) existing.remove();

  const divMeta = DIVISIONS[currentDivision] || DIVISIONS.customer_service;
  const items = DASHBOARD_VIEWS_CONFIG[currentDivision] || [];
  const prefs = getDashboardViewPreferences(currentDivision);
  const visibleCount = items.filter((it) => prefs[it.id] !== false).length;

  const btn = document.createElement("button");
  btn.id = "aetra-floating-sidebar-toggle";
  btn.type = "button";
  btn.title = "Buka Sidebar: Pilihan Tampilan Dashboard & Menu Fitur (Agar Tidak Menumpuk)";
  btn.style.cssText = `
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 9990;
    background: #FFFFFF;
    border: 1.5px solid #CBD5E1;
    border-right: none;
    border-radius: 12px 0 0 12px;
    padding: 10px 10px 10px 8px;
    box-shadow: -4px 4px 16px rgba(15, 23, 42, 0.12);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  `;

  btn.innerHTML = `
    <div style="width: 28px; height: 28px; border-radius: 7px; background: ${divMeta.badgeBg}; border: 1px solid ${divMeta.borderColor}; display: flex; align-items: center; justify-content: center; font-size: 15px;">
      🎛️
    </div>
    <span style="writing-mode: vertical-rl; transform: rotate(180deg); font-size: 10.5px; font-weight: 800; color: #334155; letter-spacing: 0.5px; margin: 4px 0;">
      ATUR TAMPILAN
    </span>
    <span id="floating-sidebar-badge" style="background: ${divMeta.badgeColor}; color: #FFFFFF; font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 9999px;">
      ${visibleCount}
    </span>
  `;

  btn.onmouseenter = () => {
    btn.style.transform = "translateY(-50%) translateX(-4px)";
    btn.style.boxShadow = "-6px 6px 20px rgba(15, 23, 42, 0.18)";
    btn.style.borderColor = divMeta.badgeColor;
  };

  btn.onmouseleave = () => {
    btn.style.transform = "translateY(-50%) translateX(0px)";
    btn.style.boxShadow = "-4px 4px 16px rgba(15, 23, 42, 0.12)";
    btn.style.borderColor = "#CBD5E1";
  };

  btn.onclick = () => {
    openDashboardViewDrawer(currentDivision, onPreferencesChange);
  };

  document.body.appendChild(btn);
  floatingBtnEl = btn;
}

export function updateFloatingBadge(): void {
  const badge = document.getElementById("floating-sidebar-badge");
  if (badge) {
    const items = DASHBOARD_VIEWS_CONFIG[currentActiveDivision] || [];
    const prefs = getDashboardViewPreferences(currentActiveDivision);
    const visibleCount = items.filter((it) => prefs[it.id] !== false).length;
    badge.innerText = `${visibleCount}`;
  }
}
