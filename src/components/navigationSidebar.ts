/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Slide-Out Sidebar Navigation - PT Aetra Air Tangerang
 * Houses all division selections and system navigation links in a toggleable drawer
 * to prevent screen clutter in the main dashboard view.
 */

import { DivisionId, DIVISIONS, DivisionUserSession } from "../types/division";
import { DIVISION_ACCOUNTS, authenticateDivisionLogin } from "../auth/divisionAuthService";
import { loadAllUnifiedTickets } from "../services/divisionTicketService";
import { openDailyActivityLogModal } from "./dailyActivityLogModal";
import { openWeeklySlaModal } from "./weeklySlaModal";

export interface NavigationSidebarOptions {
  currentDivision: DivisionId;
  session?: DivisionUserSession | null;
  onSwitchDivision: (
    targetDivision: DivisionId,
    authorizedSession?: DivisionUserSession
  ) => void;
  onLogout: () => void;
  onRefresh?: () => void;
}

let activeDrawerEl: HTMLElement | null = null;
let activeBackdropEl: HTMLElement | null = null;
let isSidebarOpen = false;

export function isNavigationSidebarOpen(): boolean {
  return isSidebarOpen;
}

export function openNavigationSidebar(options: NavigationSidebarOptions) {
  if (isSidebarOpen) return;
  isSidebarOpen = true;

  // Backdrop overlay
  const backdrop = document.createElement("div");
  backdrop.id = "aetra-nav-sidebar-backdrop";
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(3px);
    z-index: 10050;
    opacity: 0;
    transition: opacity 0.25s ease-out;
  `;

  // Sidebar container (sliding from left)
  const sidebar = document.createElement("aside");
  sidebar.id = "aetra-nav-sidebar";
  sidebar.setAttribute("aria-label", "Navigasi Menu dan Divisi");
  sidebar.style.cssText = `
    position: fixed;
    top: 0;
    left: -380px;
    width: 360px;
    max-width: 90vw;
    height: 100vh;
    background: #FFFFFF;
    box-shadow: 4px 0 24px rgba(15, 23, 42, 0.18);
    z-index: 10051;
    display: flex;
    flex-direction: column;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    transition: left 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    box-sizing: border-box;
    overflow: hidden;
  `;

  const currentMeta = DIVISIONS[options.currentDivision] || DIVISIONS.customer_service;
  const currentAcc = DIVISION_ACCOUNTS[options.currentDivision];
  const allTickets = loadAllUnifiedTickets();

  // Cross division authorization prompt handler
  function promptCrossDivisionLogin(targetDivision: DivisionId) {
    const targetMeta = DIVISIONS[targetDivision];
    const targetAcc = DIVISION_ACCOUNTS[targetDivision];

    // @ts-ignore
    if (window.Swal) {
      // @ts-ignore
      window.Swal.fire({
        title: `<span style="font-size: 17px; font-weight: 800; color: #0F172A;">🔒 Otorisasi Divisi Diperlukan</span>`,
        html: `
          <div style="text-align: left; font-size: 12.5px; color: #475569; line-height: 1.45; margin-bottom: 12px;">
            Anda sedang aktif di <strong>${currentMeta.name}</strong>.<br/>
            Untuk beralih ke <strong>${targetMeta.name}</strong>, silakan masukkan kredensial resmi divisi.
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px; text-align: left;">
            <div>
              <label style="font-size: 11.5px; font-weight: 700; color: #1E293B; display: block; margin-bottom: 3px;">
                Username ${targetMeta.shortName} <span style="color: #DC2626;">*</span>
              </label>
              <input id="swal-input-user" class="swal2-input" placeholder="contoh: ${targetAcc.displayUsername}" value="${targetAcc.displayUsername}" style="margin: 0; width: 100%; box-sizing: border-box; font-size: 13px; height: 38px; padding: 0 10px; border-radius: 8px; border: 1.5px solid #CBD5E1;" />
            </div>
            <div>
              <label style="font-size: 11.5px; font-weight: 700; color: #1E293B; display: block; margin-bottom: 3px;">
                Password <span style="color: #DC2626;">*</span>
              </label>
              <input id="swal-input-pass" type="password" class="swal2-input" placeholder="masukkan password" value="123456" style="margin: 0; width: 100%; box-sizing: border-box; font-size: 13px; height: 38px; padding: 0 10px; border-radius: 8px; border: 1.5px solid #CBD5E1;" />
            </div>
            <div style="font-size: 11px; color: #475569; background: #F8FAFC; padding: 8px 10px; border-radius: 8px; border: 1px solid #E2E8F0; line-height: 1.4;">
              💡 <strong>Kredensial Resmi:</strong> Username: <code>${targetAcc.displayUsername}</code> | Password: <code>123456</code><br/>
              <em>Catatan: Akses dibatasi untuk menjaga integritas data antar divisi.</em>
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: `Buka Dashboard ${targetMeta.shortName} ➔`,
        cancelButtonText: "Batal",
        confirmButtonColor: targetMeta.badgeColor,
        cancelButtonColor: "#64748B",
        focusConfirm: false,
        preConfirm: () => {
          const userInput = (
            document.getElementById("swal-input-user") as HTMLInputElement
          )?.value;
          const passInput = (
            document.getElementById("swal-input-pass") as HTMLInputElement
          )?.value;

          const authRes = authenticateDivisionLogin(
            targetDivision,
            userInput || "",
            passInput || ""
          );

          if (!authRes.success) {
            // @ts-ignore
            window.Swal.showValidationMessage(authRes.message);
            return false;
          }
          return authRes.session;
        },
      }).then((result: any) => {
        if (result.isConfirmed && result.value) {
          closeNavigationSidebar();
          options.onSwitchDivision(targetDivision, result.value);
        }
      });
    } else {
      const pass = window.prompt(
        `Masukkan password untuk Divisi ${targetMeta.name} (default: 123456):`
      );
      if (pass === "123456") {
        closeNavigationSidebar();
        options.onSwitchDivision(targetDivision);
      } else if (pass !== null) {
        alert("Password salah atau tidak memiliki akses!");
      }
    }
  }

  // Count tickets per division
  const countByDiv: Record<DivisionId, number> = {
    customer_service: allTickets.filter((t) => t.targetDivision === "customer_service").length,
    minor_repair: allTickets.filter((t) => t.targetDivision === "minor_repair").length,
    sales_support: allTickets.filter((t) => t.targetDivision === "sales_support").length,
    key_account: allTickets.filter((t) => t.targetDivision === "key_account").length,
    technical_support: allTickets.filter((t) => t.targetDivision === "technical_support").length,
  };

  const divisionList: DivisionId[] = [
    "customer_service",
    "minor_repair",
    "sales_support",
    "key_account",
    "technical_support",
  ];

  sidebar.innerHTML = `
    <!-- Top Header -->
    <div style="padding: 16px 18px; border-bottom: 1px solid #E2E8F0; background: #F8FAFC; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <img src="/aetra-logo.svg" alt="Aetra Logo" style="height: 28px; width: auto; object-fit: contain;" />
        <div>
          <div style="font-size: 13px; font-weight: 800; color: #0284C7; letter-spacing: -0.2px; line-height: 1.2;">
            AETRA AIR TANGERANG
          </div>
          <div style="font-size: 10.5px; font-weight: 700; color: #64748B;">
            Sistem Navigasi Terpadu
          </div>
        </div>
      </div>
      <button type="button" id="sidebar-close-btn" style="background: none; border: 1px solid #CBD5E1; border-radius: 7px; width: 30px; height: 30px; font-size: 16px; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease;" title="Tutup Navigasi (Esc)">
        ✕
      </button>
    </div>

    <!-- Active User & Division Info Banner -->
    <div style="padding: 12px 18px; background: ${currentMeta.badgeBg}; border-bottom: 1.5px solid ${currentMeta.borderColor}; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-shrink: 0;">
      <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
        <div style="width: 36px; height: 36px; border-radius: 9px; background: #FFFFFF; border: 1.5px solid ${currentMeta.badgeColor}; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          ${currentMeta.icon}
        </div>
        <div style="min-width: 0;">
          <div style="font-size: 11px; font-weight: 800; color: ${currentMeta.badgeColor}; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px;">
            <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #10B981;"></span>
            ${currentMeta.shortName} (Aktif)
          </div>
          <div style="font-size: 12.5px; font-weight: 800; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${options.session?.name || currentAcc.officerName}
          </div>
        </div>
      </div>
      <span style="font-size: 10px; font-weight: 800; background: ${currentMeta.badgeColor}; color: #FFFFFF; padding: 2px 7px; border-radius: 5px; flex-shrink: 0;">
        ADMIN
      </span>
    </div>

    <!-- Scrollable Navigation Content -->
    <div style="flex: 1; overflow-y: auto; padding: 14px 14px 20px 14px; display: flex; flex-direction: column; gap: 18px;">
      
      <!-- Section: Division Selection -->
      <div>
        <div style="font-size: 11px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; padding-left: 4px; display: flex; justify-content: space-between; align-items: center;">
          <span>PILIHAN DIVISI</span>
          <span style="font-size: 10px; font-weight: 700; color: #64748B;">5 Divisi Terpadu</span>
        </div>
        <div id="sidebar-divisions-container" style="display: flex; flex-direction: column; gap: 7px;">
          <!-- Dynamically populated -->
        </div>
      </div>

      <!-- Section: Feature & Work Tool Links -->
      <div>
        <div style="font-size: 11px; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; padding-left: 4px;">
          FITUR & ALAT KERJA
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          
          <!-- Executive BI Analytics Dashboard (Power BI View) -->
          <button type="button" id="sidebar-link-executive-bi" style="width: 100%; text-align: left; padding: 10px 12px; border-radius: 9px; border: 1px solid #1E293B; background: #0F172A; color: #FFFFFF; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; transition: all 0.15s ease;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 18px;">📊</span>
              <div>
                <div style="line-height: 1.2; color: #38BDF8; font-weight: 800;">Executive BI Analytics</div>
                <div style="font-size: 10.5px; font-weight: 500; color: #94A3B8; margin-top: 1px;">Dashboard Komplain 27.959 Kasus</div>
              </div>
            </div>
            <span style="font-size: 10px; font-weight: 800; background: #0284C7; color: #FFFFFF; padding: 2px 6px; border-radius: 4px;">BI Live</span>
          </button>

          <!-- 30-Day Moving Average Completion Rate -->
          <button type="button" id="sidebar-link-moving-avg" style="width: 100%; text-align: left; padding: 10px 12px; border-radius: 9px; border: 1px solid #1E293B; background: #0B1329; color: #FFFFFF; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; transition: all 0.15s ease;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 18px;">📈</span>
              <div>
                <div style="line-height: 1.2; color: #38BDF8; font-weight: 800;">30-Day Moving Average</div>
                <div style="font-size: 10.5px; font-weight: 500; color: #94A3B8; margin-top: 1px;">Tren Recharts Tingkat Penyelesaian WO</div>
              </div>
            </div>
            <span style="font-size: 10px; font-weight: 800; background: #0369A1; color: #FFFFFF; padding: 2px 6px; border-radius: 4px;">Recharts</span>
          </button>

          <!-- Daily Log & BAST -->
          <button type="button" id="sidebar-link-daily-log" style="width: 100%; text-align: left; padding: 10px 12px; border-radius: 9px; border: 1px solid #E2E8F0; background: #FFFFFF; color: #1E293B; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; transition: all 0.15s ease;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 17px;">📋</span>
              <div>
                <div style="line-height: 1.2;">Log Harian & BAST Petugas</div>
                <div style="font-size: 10.5px; font-weight: 500; color: #64748B; margin-top: 1px;">Rekap aktivitas & unduh PDF/Excel</div>
              </div>
            </div>
            <span style="font-size: 14px; color: #94A3B8;">›</span>
          </button>

          <!-- Weekly SLA Matrix -->
          <button type="button" id="sidebar-link-weekly-sla" style="width: 100%; text-align: left; padding: 10px 12px; border-radius: 9px; border: 1px solid #E2E8F0; background: #FFFFFF; color: #1E293B; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; transition: all 0.15s ease;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 17px;">⏱️</span>
              <div>
                <div style="line-height: 1.2;">Matriks SLA Mingguan</div>
                <div style="font-size: 10.5px; font-weight: 500; color: #64748B; margin-top: 1px;">Pencapaian waktu respons teknis</div>
              </div>
            </div>
            <span style="font-size: 14px; color: #94A3B8;">›</span>
          </button>


          <!-- Field Officer Mobile Portal -->
          <a href="/mobile.html" target="_blank" rel="noopener noreferrer" id="sidebar-link-mobile" style="text-decoration: none; padding: 10px 12px; border-radius: 9px; border: 1px solid #BFDBFE; background: #EFF6FF; color: #1D4ED8; font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; transition: all 0.15s ease;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 17px;">📱</span>
              <div>
                <div style="line-height: 1.2;">Portal Mobile Petugas (HP) ↗</div>
                <div style="font-size: 10.5px; font-weight: 500; color: #3B82F6; margin-top: 1px;">Input pengerjaan GPS & foto langsung</div>
              </div>
            </div>
            <span style="font-size: 13px; font-weight: 800; background: #DBEAFE; color: #1E40AF; padding: 2px 6px; border-radius: 4px;">PWA</span>
          </a>

          <!-- Sync Tickets Data -->
          <button type="button" id="sidebar-link-sync" style="width: 100%; text-align: left; padding: 10px 12px; border-radius: 9px; border: 1px solid #E2E8F0; background: #FFFFFF; color: #1E293B; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; transition: all 0.15s ease;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 17px;">🔄</span>
              <div>
                <div style="line-height: 1.2;">Sinkronisasi Tiket Realtime</div>
                <div style="font-size: 10.5px; font-weight: 500; color: #64748B; margin-top: 1px;">Perbarui data antar 5 divisi sekarang</div>
              </div>
            </div>
            <span style="font-size: 10px; font-weight: 700; color: #0284C7; background: #F0F9FF; padding: 2px 6px; border-radius: 4px;">Sync</span>
          </button>

        </div>
      </div>

    </div>

    <!-- Bottom Footer (Logout & Session Details) -->
    <div style="padding: 14px 18px; border-top: 1px solid #E2E8F0; background: #F8FAFC; display: flex; flex-direction: column; gap: 10px; flex-shrink: 0;">
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #64748B;">
        <span style="display: flex; align-items: center; gap: 4px;">
          <span>🏢</span> PT Aetra Air Tangerang
        </span>
        <span style="font-weight: 700; color: #059669;">v2.6 Enterprise</span>
      </div>
      <button type="button" id="sidebar-logout-btn" style="width: 100%; padding: 9px 14px; border-radius: 8px; background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s ease;">
        <span>🚪</span> Keluar dari Sesi Divisi
      </button>
    </div>
  `;

  // Populate Division List Cards
  const divContainer = sidebar.querySelector("#sidebar-divisions-container") as HTMLElement;
  if (divContainer) {
    divisionList.forEach((divId) => {
      const meta = DIVISIONS[divId];
      const isCurrent = divId === options.currentDivision;
      const count = countByDiv[divId] || 0;

      const card = document.createElement("div");
      card.style.cssText = `
        padding: 9px 12px;
        border-radius: 10px;
        border: ${isCurrent ? `2px solid ${meta.badgeColor}` : "1px solid #E2E8F0"};
        background: ${isCurrent ? meta.badgeBg : "#FFFFFF"};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        transition: all 0.15s ease;
        position: relative;
        box-shadow: ${isCurrent ? "0 2px 5px rgba(0,0,0,0.04)" : "none"};
      `;

      card.onmouseenter = () => {
        if (!isCurrent) {
          card.style.borderColor = meta.badgeColor;
          card.style.background = "#F8FAFC";
        }
      };
      card.onmouseleave = () => {
        if (!isCurrent) {
          card.style.borderColor = "#E2E8F0";
          card.style.background = "#FFFFFF";
        }
      };

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
          <div style="width: 34px; height: 34px; border-radius: 8px; background: ${meta.badgeBg}; border: 1px solid ${meta.borderColor}; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
            ${meta.icon}
          </div>
          <div style="min-width: 0; flex: 1;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 12.5px; font-weight: 800; color: ${isCurrent ? meta.badgeColor : "#0F172A"}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${meta.shortName}
              </span>
              ${
                isCurrent
                  ? `<span style="font-size: 9px; font-weight: 800; background: ${meta.badgeColor}; color: #FFF; padding: 1px 5px; border-radius: 4px;">AKTIF</span>`
                  : `<span style="font-size: 10px; color: #94A3B8;" title="Perlu Kredensial">🔒</span>`
              }
            </div>
            <div style="font-size: 10.5px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">
              ${meta.tagline}
            </div>
          </div>
        </div>
        <div style="flex-shrink: 0; text-align: right;">
          <span style="display: inline-block; padding: 2px 7px; border-radius: 12px; font-size: 11px; font-weight: 800; background: ${isCurrent ? meta.badgeColor : "#F1F5F9"}; color: ${isCurrent ? "#FFFFFF" : "#475569"};" title="${count} tiket di divisi ini">
            ${count}
          </span>
        </div>
      `;

      card.onclick = () => {
        if (isCurrent) {
          closeNavigationSidebar();
        } else {
          promptCrossDivisionLogin(divId);
        }
      };

      divContainer.appendChild(card);
    });
  }

  // Close Button
  const closeBtn = sidebar.querySelector("#sidebar-close-btn") as HTMLButtonElement;
  if (closeBtn) {
    closeBtn.onclick = () => closeNavigationSidebar();
  }

  // Link bindings
  const execBiBtn = sidebar.querySelector("#sidebar-link-executive-bi") as HTMLButtonElement;
  if (execBiBtn) {
    execBiBtn.onclick = () => {
      closeNavigationSidebar();
      localStorage.setItem("aetra_cs_active_view", "analytics");
      if (options.currentDivision !== "customer_service") {
        options.onSwitchDivision("customer_service");
      } else {
        window.dispatchEvent(
          new CustomEvent("aetra:cs_switch_view", { detail: { view: "analytics" } })
        );
      }
    };
  }

  const movingAvgBtn = sidebar.querySelector("#sidebar-link-moving-avg") as HTMLButtonElement;
  if (movingAvgBtn) {
    movingAvgBtn.onclick = () => {
      closeNavigationSidebar();
      localStorage.setItem("aetra_cs_active_view", "moving_avg");
      if (options.currentDivision !== "customer_service") {
        options.onSwitchDivision("customer_service");
      } else {
        window.dispatchEvent(
          new CustomEvent("aetra:cs_switch_view", { detail: { view: "moving_avg" } })
        );
      }
    };
  }

  const dailyLogBtn = sidebar.querySelector("#sidebar-link-daily-log") as HTMLButtonElement;
  if (dailyLogBtn) {
    dailyLogBtn.onclick = () => {
      closeNavigationSidebar();
      openDailyActivityLogModal({
        divisionId: options.currentDivision,
      });
    };
  }

  const weeklySlaBtn = sidebar.querySelector("#sidebar-link-weekly-sla") as HTMLButtonElement;
  if (weeklySlaBtn) {
    weeklySlaBtn.onclick = () => {
      closeNavigationSidebar();
      openWeeklySlaModal();
    };
  }


  const syncBtn = sidebar.querySelector("#sidebar-link-sync") as HTMLButtonElement;
  if (syncBtn && options.onRefresh) {
    syncBtn.onclick = () => {
      closeNavigationSidebar();
      options.onRefresh!();
    };
  }

  const logoutBtn = sidebar.querySelector("#sidebar-logout-btn") as HTMLButtonElement;
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      closeNavigationSidebar();
      options.onLogout();
    };
  }

  // Backdrop click closes
  backdrop.onclick = () => closeNavigationSidebar();

  // Escape key handler
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closeNavigationSidebar();
    }
  };
  window.addEventListener("keydown", handleKeydown, { once: true });

  // Mount to DOM
  document.body.appendChild(backdrop);
  document.body.appendChild(sidebar);

  activeBackdropEl = backdrop;
  activeDrawerEl = sidebar;

  // Animate in smoothly
  requestAnimationFrame(() => {
    backdrop.style.opacity = "1";
    sidebar.style.left = "0px";
  });
}

export function closeNavigationSidebar() {
  if (!isSidebarOpen) return;
  isSidebarOpen = false;

  if (activeDrawerEl) {
    activeDrawerEl.style.left = "-380px";
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
  }, 280);
}

export function toggleNavigationSidebar(options: NavigationSidebarOptions) {
  if (isSidebarOpen) {
    closeNavigationSidebar();
  } else {
    openNavigationSidebar(options);
  }
}

/**
 * Mounts a floating trigger button on the viewport edge
 * allowing quick slide-out sidebar toggle from anywhere.
 */
export function mountFloatingNavSidebarToggle(options: NavigationSidebarOptions) {
  const existing = document.getElementById("aetra-floating-nav-sidebar-toggle");
  if (existing) {
    existing.remove();
  }

  const btn = document.createElement("button");
  btn.id = "aetra-floating-nav-sidebar-toggle";
  btn.type = "button";
  btn.title = "Buka Menu Navigasi & Pilihan Divisi (Ctrl+B)";
  btn.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 20px;
    z-index: 9990;
    background: #0284C7;
    color: #FFFFFF;
    border: 1.5px solid #0369A1;
    border-radius: 30px;
    padding: 8px 14px 8px 12px;
    box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  `;

  btn.innerHTML = `
    <span style="font-size: 15px; line-height: 1;">☰</span>
    <span>Menu & Divisi</span>
  `;

  btn.onmouseenter = () => {
    btn.style.background = "#0369A1";
    btn.style.transform = "scale(1.05) translateY(-2px)";
    btn.style.boxShadow = "0 6px 18px rgba(2, 132, 199, 0.5)";
  };

  btn.onmouseleave = () => {
    btn.style.background = "#0284C7";
    btn.style.transform = "scale(1) translateY(0)";
    btn.style.boxShadow = "0 4px 14px rgba(2, 132, 199, 0.4)";
  };

  btn.onclick = () => {
    toggleNavigationSidebar(options);
  };

  document.body.appendChild(btn);
}
