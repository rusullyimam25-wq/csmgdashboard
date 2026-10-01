/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Executive Complaint Analytics BI Dashboard
 * Layout matches executive visual BI template, powered 100% by live data from all divisions.
 */

import {
  UnifiedTicket,
  loadAllUnifiedTickets,
  saveSingleTicket,
  generateCaseId,
} from "../services/divisionTicketService";
import { DivisionId, DIVISIONS, AETRA_CASE_CATEGORIES, getRecommendedDivision } from "../types/division";
import * as XLSX from "xlsx";
import { mountThirtyDayMovingAverageCard } from "./ThirtyDayMovingAverageCard";

// SLA Rules map in days
const SLA_RULES_MAP: Record<string, number> = {
  KATM: 1,
  KATMIND: 1,
  KBSM: 3,
  KBSMIND: 3,
  KKMR: 3,
  KKMRIND: 3,
  KMDT: 5,
  KMTA: 7,
  KPMR: 4,
  KPMRIND: 4,
  KPPR: 6,
  KLBC: 2,
  KRPT: 7,
  KPKT: 3,
  KPCT: 5,
  KPGP: 3,
  BPPD: 14,
  KATR: 2,
  KATRIND: 2,
  TERAREQ: 14,
  KILL: 5,
  KTR: 3,
  KPAP: 3,
  KPAT: 3,
  KPPM: 3,
  PPMI: 7,
  TR09: 12,
  TRO9: 12,
};

function getSlaDays(category: string): number {
  const cat = (category || "").toUpperCase().trim();
  if (SLA_RULES_MAP[cat] !== undefined) return SLA_RULES_MAP[cat];
  const stripped = cat.replace(/IND$/, "");
  if (SLA_RULES_MAP[stripped] !== undefined) return SLA_RULES_MAP[stripped];
  return 5;
}

function inferCustomerType(t: UnifiedTicket): string {
  const text = `${t.customer || ""} ${t.address || ""} ${t.category || ""}`.toUpperCase();
  if (t.category?.endsWith("IND") || text.includes("PT ") || text.includes("TBK") || text.includes("PABRIK") || text.includes("INDUSTRI")) {
    return "INDUSTRIAL";
  }
  if (text.includes("RUKO") || text.includes("TOKO") || text.includes("KLINIK") || text.includes("RESTO") || text.includes("PASAR") || text.includes("HOTEL")) {
    return "COMMERCIAL";
  }
  if (text.includes("RSUD") || text.includes("PUSKESMAS") || text.includes("PEMDA") || text.includes("INSTANSI") || text.includes("KANTOR")) {
    return "SPECIAL CUSTOMER";
  }
  if (text.includes("MASJID") || text.includes("GEREJA") || text.includes("YAYASAN") || text.includes("PANTI") || text.includes("RW ") || text.includes("RT ")) {
    return "SOCIAL";
  }
  if (text.includes("SEKOLAH") || text.includes("KAMPUS") || text.includes("UNIVERSITAS")) {
    return "INSTITUTIONAL";
  }
  return "RESIDENTIAL";
}

function formatMonth(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const m = d.getMonth();
    return months[m] || "Sep";
  } catch (e) {
    return "Sep";
  }
}

function getDivisionLabel(divId?: string): string {
  if (!divId) return "Customer Service";
  const map: Record<string, string> = {
    minor_repair: "Minor Repair",
    sales_support: "Operasional Sales Support",
    key_account: "Technical Key Account",
    technical_support: "Technical Support",
    customer_service: "Customer Service",
    billing: "Billing",
    collection: "Collection",
    contact_center: "Contact Center",
    distribusi: "Distribusi",
    illegal_team: "Illegal Team",
    meter_reading: "Meter Reading",
    tim_nc: "Tim NC",
    produksi: "Produksi",
  };
  return map[divId] || divId;
}

export interface ExecutiveAnalyticsViewProps {
  tickets?: UnifiedTicket[];
  onSwitchToOperational?: () => void;
}

export function createExecutiveAnalyticsView(props?: ExecutiveAnalyticsViewProps): HTMLElement {
  const container = document.createElement("div");
  container.className = "space-y-4 font-sans text-slate-100";
  container.style.cssText = "background: #020617; min-height: 100vh; padding: 16px; border-radius: 8px;";

  // State
  let activeFilter: {
    type: "none" | "case" | "pic" | "channel" | "custType" | "sla" | "month" | "status";
    value: string;
    label: string;
  } = { type: "none", value: "", label: "Semua Data" };

  let tableSearchQuery = "";
  let currentTickets: UnifiedTicket[] = props?.tickets || loadAllUnifiedTickets();
  let movingAvgInstance: { unmount: () => void; root: any } | null = null;

  function refreshData() {
    currentTickets = loadAllUnifiedTickets();
    renderContent();
  }

  // Listen to cross-division updates
  const handleTicketsChanged = () => {
    refreshData();
  };
  window.addEventListener("aetra:tickets_changed", handleTicketsChanged);
  window.addEventListener("storage", handleTicketsChanged);

  // Filtered tickets for data explorer
  function getFilteredTickets(): UnifiedTicket[] {
    return currentTickets.filter((t) => {
      // Filter by chart interaction
      if (activeFilter.type === "case" && t.category !== activeFilter.value) return false;
      if (activeFilter.type === "pic") {
        const divName = getDivisionLabel(t.targetDivision);
        if (divName !== activeFilter.value && t.targetDivision !== activeFilter.value && t.officer !== activeFilter.value) {
          return false;
        }
      }
      if (activeFilter.type === "channel" && (t.intakeChannel || "WhatsApp CS") !== activeFilter.value) return false;
      if (activeFilter.type === "custType" && inferCustomerType(t) !== activeFilter.value) return false;
      if (activeFilter.type === "month" && formatMonth(t.receivedAt) !== activeFilter.value) return false;
      if (activeFilter.type === "status") {
        if (activeFilter.value === "selesai" && t.status !== "selesai") return false;
        if (activeFilter.value === "on_progress" && t.status === "selesai") return false;
      }
      if (activeFilter.type === "sla") {
        const slaDays = getSlaDays(t.category);
        const receivedTime = new Date(t.receivedAt).getTime();
        const doneTime = t.completedAt ? new Date(t.completedAt).getTime() : Date.now();
        const diffDays = (doneTime - receivedTime) / (1000 * 3600 * 24);
        const isCompleted = t.status === "selesai";

        if (activeFilter.value === "TERCAPAI") {
          if (!isCompleted || diffDays > slaDays) return false;
        } else if (activeFilter.value === "TIDAK TERCAPAI") {
          if (isCompleted && diffDays <= slaDays) return false;
          if (!isCompleted && diffDays <= slaDays) return false;
        } else if (activeFilter.value === "ON PROGRESS") {
          if (isCompleted || diffDays > slaDays) return false;
        }
      }

      // Filter by text search
      if (tableSearchQuery.trim()) {
        const q = tableSearchQuery.toLowerCase();
        const match =
          (t.id || "").toLowerCase().includes(q) ||
          (t.caseId || "").toLowerCase().includes(q) ||
          (t.customer || "").toLowerCase().includes(q) ||
          (t.meterId || "").toLowerCase().includes(q) ||
          (t.address || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q) ||
          (t.desc || "").toLowerCase().includes(q) ||
          (t.officer || "").toLowerCase().includes(q) ||
          getDivisionLabel(t.targetDivision).toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }

  function setFilter(type: typeof activeFilter.type, value: string, label: string) {
    if (activeFilter.type === type && activeFilter.value === value) {
      // Toggle off if already selected
      activeFilter = { type: "none", value: "", label: "Semua Data" };
    } else {
      activeFilter = { type, value, label };
    }
    renderContent();
    const tableEl = container.querySelector("#bi-data-table-section");
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function resetFilter() {
    activeFilter = { type: "none", value: "", label: "Semua Data" };
    tableSearchQuery = "";
    renderContent();
  }

  function renderContent() {
    if (movingAvgInstance) {
      try {
        movingAvgInstance.unmount();
      } catch (_) {}
      movingAvgInstance = null;
    }
    container.innerHTML = "";

    const totalComplaints = currentTickets.length;
    const completedComplaints = currentTickets.filter((t) => t.status === "selesai").length;
    const onProgressComplaints = currentTickets.filter((t) => t.status !== "selesai").length;
    const completedPct = totalComplaints > 0 ? ((completedComplaints / totalComplaints) * 100).toFixed(1) : "0.0";
    const onProgressPct = totalComplaints > 0 ? ((onProgressComplaints / totalComplaints) * 100).toFixed(1) : "0.0";

    // 1. TOP HEADER & CONTROLS BAR
    const topBar = document.createElement("div");
    topBar.className = "flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800";
    topBar.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-black text-xl">
          📊
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-black text-white tracking-wide">EXECUTIVE COMPLAINT ANALYTICS</h1>
            <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> LIVE SYNC SEMUA DIVISI
            </span>
          </div>
          <p class="text-xs text-slate-400">
            Data aktual terintegrasi otomatis dari Minor Repair, Sales Support, Key Account, Technical Support & Customer Service.
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button id="btn-sync-data" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 hover:border-sky-500/50 rounded text-xs font-semibold flex items-center gap-1.5 transition shadow">
          <span>🔄</span> Sinkronkan (${totalComplaints} Tiket)
        </button>
        <button id="btn-export-bi" class="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition shadow">
          <span>📥</span> Export Excel
        </button>
        <button id="btn-quick-new-ticket" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition shadow">
          <span>➕</span> Input Pengaduan
        </button>
      </div>
    `;

    topBar.querySelector("#btn-sync-data")?.addEventListener("click", () => {
      refreshData();
    });

    topBar.querySelector("#btn-export-bi")?.addEventListener("click", () => {
      exportTicketsToExcel(getFilteredTickets());
    });

    topBar.querySelector("#btn-quick-new-ticket")?.addEventListener("click", () => {
      openQuickTicketModal(() => {
        refreshData();
      });
    });

    container.appendChild(topBar);

    // Active Filter Indicator Banner (if filtered)
    if (activeFilter.type !== "none") {
      const banner = document.createElement("div");
      banner.className = "px-4 py-2 bg-sky-950/60 border border-sky-500/40 rounded-lg flex items-center justify-between text-xs text-sky-200 animate-fadeIn";
      banner.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="font-bold text-sky-400">🔍 Filter Aktif:</span>
          <span class="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/30">${activeFilter.label}</span>
          <span class="text-slate-400">(${getFilteredTickets().length} dari ${totalComplaints} total tiket sesuai filter)</span>
        </div>
        <button id="btn-reset-filter" class="px-2.5 py-1 bg-sky-900/60 hover:bg-sky-800 text-sky-200 rounded font-semibold text-[11px] border border-sky-600/40 transition">
          ✕ Hapus Filter
        </button>
      `;
      banner.querySelector("#btn-reset-filter")?.addEventListener("click", () => {
        resetFilter();
      });
      container.appendChild(banner);
    }

    // 2. FEATURED VISUAL CARD: 30-Day Moving Average Completion Rate (Recharts)
    const movingAvgWrapper = document.createElement("div");
    movingAvgWrapper.className = "w-full mb-3";
    movingAvgInstance = mountThirtyDayMovingAverageCard(movingAvgWrapper, {
      initialTickets: currentTickets,
      onRefreshRequested: () => refreshData(),
      onFilterRequested: (type, val) => {
        setFilter(type as any, val, `${type}: ${val}`);
      },
    });
    container.appendChild(movingAvgWrapper);

    // 3. MAIN GRID (Dark Executive Layout matching screenshot)
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-1 xl:grid-cols-12 gap-3";

    // ----------------------------------------------------
    // LEFT COLUMN (xl:col-span-5): 3 Top Cards + Monthly Trend + Outstanding by PIC + Outstanding by Month
    // ----------------------------------------------------
    const leftCol = document.createElement("div");
    leftCol.className = "xl:col-span-5 flex flex-col gap-3";

    // A. 3 KPI CARDS ON TOP
    const kpiRow = document.createElement("div");
    kpiRow.className = "grid grid-cols-3 gap-2";
    kpiRow.innerHTML = `
      <!-- 1. Complaint Card -->
      <div class="p-3 bg-black border border-slate-700/80 rounded flex flex-col justify-between cursor-pointer hover:border-sky-500 transition" id="kpi-card-total">
        <div class="flex items-center gap-1.5 text-xs font-bold text-white tracking-wide">
          <span>📑</span> Complaint:
        </div>
        <div class="text-2xl lg:text-3xl font-black text-white mt-1">
          ${totalComplaints.toLocaleString("id-ID")}
        </div>
        <div class="text-[10px] text-slate-400 mt-1">Semua Divisi</div>
      </div>

      <!-- 2. Completed Card -->
      <div class="p-3 bg-black border border-slate-700/80 rounded flex flex-col justify-between cursor-pointer hover:border-sky-400 transition" id="kpi-card-completed">
        <div class="flex items-center gap-1.5 text-xs font-bold text-white tracking-wide">
          <span>☑️</span> Completed:
        </div>
        <div class="text-2xl lg:text-3xl font-black text-sky-400 mt-1">
          ${completedComplaints.toLocaleString("id-ID")}
        </div>
        <div class="text-right text-xs font-bold text-sky-400 mt-1">
          ${completedPct}%
        </div>
      </div>

      <!-- 3. On Progress Card -->
      <div class="p-3 bg-black border border-slate-700/80 rounded flex flex-col justify-between cursor-pointer hover:border-sky-300 transition" id="kpi-card-progress">
        <div class="flex items-center gap-1.5 text-xs font-bold text-white tracking-wide">
          <span>📋</span> On Progress:
        </div>
        <div class="text-2xl lg:text-3xl font-black text-white mt-1">
          ${onProgressComplaints.toLocaleString("id-ID")}
        </div>
        <div class="text-right text-xs font-bold text-slate-300 mt-1">
          ${onProgressPct}%
        </div>
      </div>
    `;

    kpiRow.querySelector("#kpi-card-total")?.addEventListener("click", () => resetFilter());
    kpiRow.querySelector("#kpi-card-completed")?.addEventListener("click", () => setFilter("status", "selesai", "Status: Selesai"));
    kpiRow.querySelector("#kpi-card-progress")?.addEventListener("click", () => setFilter("status", "on_progress", "Status: On Progress"));

    leftCol.appendChild(kpiRow);

    // B. TOTAL COMPLAIN - MONTHLY (Line Chart computed from real tickets)
    const monthlyCard = createMonthlyTrendCard(currentTickets, activeFilter, (month) => {
      setFilter("month", month, `Bulan: ${month}`);
    });
    leftCol.appendChild(monthlyCard);

    // C. OUTSTANDING BY PIC (Bar chart)
    const outstandingPicCard = createOutstandingPicCard(currentTickets, activeFilter, (pic) => {
      setFilter("pic", pic, `PIC / Divisi: ${pic}`);
    });
    leftCol.appendChild(outstandingPicCard);

    // D. OUTSTANDING BY MONTH (Bar chart)
    const outstandingMonthCard = createOutstandingMonthCard(currentTickets, activeFilter, (month) => {
      setFilter("month", month, `Bulan Outstanding: ${month}`);
    });
    leftCol.appendChild(outstandingMonthCard);

    grid.appendChild(leftCol);

    // ----------------------------------------------------
    // RIGHT COLUMN (xl:col-span-7): Complain by Case + Middle Row (3 charts) + Bottom Row (2 charts)
    // ----------------------------------------------------
    const rightCol = document.createElement("div");
    rightCol.className = "xl:col-span-7 flex flex-col gap-3";

    // E. TOTAL COMPLAIN BY CASE (Bar chart on top right)
    const complainByCaseCard = createComplainByCaseCard(currentTickets, activeFilter, (cat) => {
      setFilter("case", cat, `Kasus: ${cat}`);
    });
    rightCol.appendChild(complainByCaseCard);

    // F. MIDDLE ROW (3 columns: Contact Method + Customer Type + SLA Complain)
    const middleRow = document.createElement("div");
    middleRow.className = "grid grid-cols-1 md:grid-cols-3 gap-3";

    // F1. By Contact Method (Donut)
    const contactMethodCard = createContactMethodCard(currentTickets, activeFilter, (method) => {
      setFilter("channel", method, `Saluran: ${method}`);
    });
    middleRow.appendChild(contactMethodCard);

    // F2. By Customer Type (Bar)
    const customerTypeCard = createCustomerTypeCard(currentTickets, activeFilter, (ctype) => {
      setFilter("custType", ctype, `Tipe Pelanggan: ${ctype}`);
    });
    middleRow.appendChild(customerTypeCard);

    // F3. SLA Complain (Donut)
    const slaComplainCard = createSlaComplainCard(currentTickets, activeFilter, (slaLabel) => {
      setFilter("sla", slaLabel, `SLA: ${slaLabel}`);
    });
    middleRow.appendChild(slaComplainCard);

    rightCol.appendChild(middleRow);

    // G. BOTTOM ROW (2 columns: Outstanding by Case + Average SLA by Case)
    const bottomRow = document.createElement("div");
    bottomRow.className = "grid grid-cols-1 md:grid-cols-2 gap-3";

    // G1. Outstanding by Case (Bar)
    const outstandingByCaseCard = createOutstandingByCaseCard(currentTickets, activeFilter, (cat) => {
      setFilter("case", cat, `Outstanding Kasus: ${cat}`);
    });
    bottomRow.appendChild(outstandingByCaseCard);

    // G2. Average SLA by Case (Bar)
    const averageSlaCard = createAverageSlaCard(currentTickets, activeFilter, (cat) => {
      setFilter("case", cat, `Rata-rata SLA Kasus: ${cat}`);
    });
    bottomRow.appendChild(averageSlaCard);

    rightCol.appendChild(bottomRow);

    grid.appendChild(rightCol);
    container.appendChild(grid);

    // ----------------------------------------------------
    // 3. INTERACTIVE DATA EXPLORER TABLE (LIHAT DATANYA)
    // ----------------------------------------------------
    const dataSection = createDataExplorerSection(
      getFilteredTickets(),
      totalComplaints,
      activeFilter,
      tableSearchQuery,
      (query) => {
        tableSearchQuery = query;
        renderContent();
      },
      () => resetFilter(),
      () => refreshData()
    );
    container.appendChild(dataSection);
  }

  // Initial render
  renderContent();

  (container as any).cleanup = () => {
    window.removeEventListener("aetra:tickets_changed", handleTicketsChanged);
    window.removeEventListener("storage", handleTicketsChanged);
    if (movingAvgInstance) {
      try {
        movingAvgInstance.unmount();
      } catch (_) {}
      movingAvgInstance = null;
    }
  };

  return container;
}

// -----------------------------------------------------------------------------------
// CHART COMPONENTS (100% COMPUTED FROM REAL TICKETS)
// -----------------------------------------------------------------------------------

/**
 * 1. Monthly Trend Line Chart (Total Complain - Monthly)
 */
function createMonthlyTrendCard(
  tickets: UnifiedTicket[],
  activeFilter: any,
  onSelectMonth: (m: string) => void
): HTMLElement {
  const card = document.createElement("div");
  card.className = "p-3 bg-black border border-slate-700/80 rounded";

  const title = document.createElement("div");
  title.className = "text-center text-xs font-bold text-white tracking-wider mb-2";
  title.textContent = "Total Complain - Monthly";
  card.appendChild(title);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  const monthlyCounts: Record<string, number> = {};
  months.forEach((m) => (monthlyCounts[m] = 0));

  tickets.forEach((t) => {
    const m = formatMonth(t.receivedAt);
    if (monthlyCounts[m] !== undefined) {
      monthlyCounts[m]++;
    }
  });

  const counts = months.map((m) => monthlyCounts[m]);
  const maxCount = Math.max(...counts, 1);

  // SVG Line Chart
  const svgWidth = 440;
  const svgHeight = 130;
  const padLeft = 25;
  const padRight = 25;
  const padTop = 25;
  const padBottom = 22;

  const widthAvail = svgWidth - padLeft - padRight;
  const heightAvail = svgHeight - padTop - padBottom;
  const stepX = widthAvail / (months.length - 1);

  const points = months.map((m, i) => {
    const x = padLeft + i * stepX;
    const y = padTop + heightAvail - (monthlyCounts[m] / maxCount) * heightAvail;
    return { x, y, month: m, count: monthlyCounts[m] };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(" ");

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
  svg.setAttribute("class", "w-full h-32");

  // Grid baseline
  const baseline = document.createElementNS("http://www.w3.org/2000/svg", "line");
  baseline.setAttribute("x1", "10");
  baseline.setAttribute("y1", String(svgHeight - padBottom));
  baseline.setAttribute("x2", String(svgWidth - 10));
  baseline.setAttribute("y2", String(svgHeight - padBottom));
  baseline.setAttribute("stroke", "#334155");
  baseline.setAttribute("stroke-width", "1");
  svg.appendChild(baseline);

  // Trend line
  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", "#38bdf8");
  polyline.setAttribute("stroke-width", "2.5");
  polyline.setAttribute("stroke-linejoin", "round");
  polyline.setAttribute("points", polylineStr);
  svg.appendChild(polyline);

  // Dots and labels
  points.forEach((p) => {
    const isSelected = activeFilter.type === "month" && activeFilter.value === p.month;

    // Dot circle
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(p.x));
    circle.setAttribute("cy", String(p.y));
    circle.setAttribute("r", isSelected ? "5.5" : "3.5");
    circle.setAttribute("fill", isSelected ? "#38bdf8" : "#0284c7");
    circle.setAttribute("stroke", "#ffffff");
    circle.setAttribute("stroke-width", "1.5");
    circle.setAttribute("class", "cursor-pointer transition hover:r-6");
    circle.addEventListener("click", () => onSelectMonth(p.month));
    svg.appendChild(circle);

    // Value text on top of dot
    const valText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    valText.setAttribute("x", String(p.x));
    valText.setAttribute("y", String(p.y - 7));
    valText.setAttribute("fill", isSelected ? "#38bdf8" : "#ffffff");
    valText.setAttribute("font-size", "10");
    valText.setAttribute("font-weight", "bold");
    valText.setAttribute("text-anchor", "middle");
    valText.textContent = String(p.count);
    svg.appendChild(valText);

    // Month text below axis
    const monthText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    monthText.setAttribute("x", String(p.x));
    monthText.setAttribute("y", String(svgHeight - 6));
    monthText.setAttribute("fill", isSelected ? "#38bdf8" : "#94a3b8");
    monthText.setAttribute("font-size", "10");
    monthText.setAttribute("font-weight", isSelected ? "bold" : "normal");
    monthText.setAttribute("text-anchor", "middle");
    monthText.setAttribute("class", "cursor-pointer hover:fill-sky-400");
    monthText.textContent = p.month;
    monthText.addEventListener("click", () => onSelectMonth(p.month));
    svg.appendChild(monthText);
  });

  card.appendChild(svg);
  return card;
}

/**
 * 2. Total Complain by Case (Bar chart top right)
 */
function createComplainByCaseCard(
  tickets: UnifiedTicket[],
  activeFilter: any,
  onSelectCase: (c: string) => void
): HTMLElement {
  const card = document.createElement("div");
  card.className = "p-3 bg-black border border-slate-700/80 rounded";

  const title = document.createElement("div");
  title.className = "text-center text-xs font-bold text-white tracking-wider mb-2";
  title.textContent = "Total Complain by Case";
  card.appendChild(title);

  // Tally counts by category
  const caseCounts: Record<string, number> = {};
  tickets.forEach((t) => {
    const cat = t.category || "LAINNYA";
    caseCounts[cat] = (caseCounts[cat] || 0) + 1;
  });

  const categories = Object.keys(caseCounts).sort((a, b) => caseCounts[b] - caseCounts[a]);
  const maxCount = Math.max(...Object.values(caseCounts), 1);

  const containerBar = document.createElement("div");
  containerBar.className = "flex items-end gap-1.5 h-36 px-2 overflow-x-auto pb-6 pt-6";

  categories.forEach((cat) => {
    const count = caseCounts[cat];
    const heightPct = Math.max(8, (count / maxCount) * 100);
    const isSelected = activeFilter.type === "case" && activeFilter.value === cat;

    const col = document.createElement("div");
    col.className = "flex-1 min-w-[28px] max-w-[42px] flex flex-col items-center justify-end h-full relative cursor-pointer group";
    col.addEventListener("click", () => onSelectCase(cat));

    col.innerHTML = `
      <div class="text-[9px] font-bold ${isSelected ? "text-sky-300" : "text-white"} mb-1 text-center whitespace-nowrap">
        ${count}
      </div>
      <div class="w-full ${isSelected ? "bg-sky-400" : "bg-sky-600 group-hover:bg-sky-500"} rounded-t transition" style="height: ${heightPct}%;"></div>
      <div class="absolute -bottom-5 text-[8px] font-semibold ${isSelected ? "text-sky-300 font-bold" : "text-slate-400"} text-center truncate w-full" title="${cat}">
        ${cat}
      </div>
    `;

    containerBar.appendChild(col);
  });

  card.appendChild(containerBar);
  return card;
}

/**
 * 3. Outstanding by PIC / Division
 */
function createOutstandingPicCard(
  tickets: UnifiedTicket[],
  activeFilter: any,
  onSelectPic: (p: string) => void
): HTMLElement {
  const card = document.createElement("div");
  card.className = "p-3 bg-black border border-slate-700/80 rounded";

  const title = document.createElement("div");
  title.className = "text-center text-xs font-bold text-white tracking-wider mb-2";
  title.textContent = "OUTSTANDING BY PIC";
  card.appendChild(title);

  // Filter unresolved tickets
  const outstanding = tickets.filter((t) => t.status !== "selesai");
  const picCounts: Record<string, number> = {
    "Minor Repair": 0,
    "Operasional Sales Support": 0,
    "Technical Key Account": 0,
    "Technical Support": 0,
    "Customer Service": 0,
    "Billing": 0,
    "Contact Center": 0,
    "Distribusi": 0,
  };

  outstanding.forEach((t) => {
    const label = getDivisionLabel(t.targetDivision);
    picCounts[label] = (picCounts[label] || 0) + 1;
  });

  const pics = Object.keys(picCounts);
  const maxCount = Math.max(...Object.values(picCounts), 1);

  const containerBar = document.createElement("div");
  containerBar.className = "flex items-end gap-2 h-36 px-2 overflow-x-auto pb-7 pt-5";

  pics.forEach((pic) => {
    const count = picCounts[pic] || 0;
    const heightPct = Math.max(6, (count / maxCount) * 100);
    const isSelected = activeFilter.type === "pic" && activeFilter.value === pic;

    const col = document.createElement("div");
    col.className = "flex-1 min-w-[38px] flex flex-col items-center justify-end h-full relative cursor-pointer group";
    col.addEventListener("click", () => onSelectPic(pic));

    col.innerHTML = `
      <div class="text-[9px] font-bold ${isSelected ? "text-sky-300" : "text-white"} mb-1 text-center">
        ${count}
      </div>
      <div class="w-full ${isSelected ? "bg-sky-400" : "bg-sky-600 group-hover:bg-sky-500"} rounded-t transition" style="height: ${heightPct}%;"></div>
      <div class="absolute -bottom-6 text-[8px] font-semibold ${isSelected ? "text-sky-300 font-bold" : "text-slate-400"} text-center truncate w-full" title="${pic}">
        ${pic.replace("Operasional ", "").replace("Technical ", "")}
      </div>
    `;

    containerBar.appendChild(col);
  });

  card.appendChild(containerBar);
  return card;
}

/**
 * 4. By Contact Method (Donut)
 */
function createContactMethodCard(
  tickets: UnifiedTicket[],
  activeFilter: any,
  onSelectChannel: (c: string) => void
): HTMLElement {
  const card = document.createElement("div");
  card.className = "p-3 bg-black border border-slate-700/80 rounded flex flex-col items-center justify-between";

  const counts: Record<string, number> = {
    "WhatsApp CS": 0,
    "Call Center 24 Jam": 0,
    "Loket Kantor": 0,
    "Email": 0,
    "Walk In": 0,
  };

  tickets.forEach((t) => {
    const ch = t.intakeChannel || "WhatsApp CS";
    counts[ch] = (counts[ch] || 0) + 1;
  });

  const total = tickets.length || 1;
  const methods = [
    { key: "WhatsApp CS", label: "WA", count: counts["WhatsApp CS"], color: "#0ea5e9" },
    { key: "Call Center 24 Jam", label: "Phone", count: counts["Call Center 24 Jam"], color: "#38bdf8" },
    { key: "Email", label: "Email", count: counts["Email"], color: "#60a5fa" },
    { key: "Loket Kantor", label: "Walk In", count: counts["Loket Kantor"] + counts["Walk In"], color: "#93c5fd" },
  ];

  const svg = createDonutSvg(
    methods.map((m) => ({
      label: m.label,
      count: m.count,
      pct: Math.round((m.count / total) * 100),
      color: m.color,
    })),
    "BY CONTACT\nMETHOD",
    (lbl) => {
      const match = methods.find((m) => m.label === lbl);
      if (match) onSelectChannel(match.key);
    }
  );

  card.appendChild(svg);

  // Legend
  const legend = document.createElement("div");
  legend.className = "flex flex-wrap items-center justify-center gap-2 mt-2 text-[9px] text-slate-300";
  methods.forEach((m) => {
    const isSelected = activeFilter.type === "channel" && activeFilter.value === m.key;
    legend.innerHTML += `
      <div class="flex items-center gap-1 cursor-pointer hover:text-white" title="${m.label}: ${m.count}">
        <span class="w-2 h-2 rounded-full" style="background: ${m.color}"></span>
        <span class="${isSelected ? "text-sky-300 font-bold" : ""}">${m.label} (${m.count})</span>
      </div>
    `;
  });

  card.appendChild(legend);
  return card;
}

/**
 * 5. By Customer Type (Bar)
 */
function createCustomerTypeCard(
  tickets: UnifiedTicket[],
  activeFilter: any,
  onSelectType: (t: string) => void
): HTMLElement {
  const card = document.createElement("div");
  card.className = "p-3 bg-black border border-slate-700/80 rounded";

  const title = document.createElement("div");
  title.className = "text-center text-xs font-bold text-white tracking-wider mb-2";
  title.textContent = "BY CUSTOMER TYPE";
  card.appendChild(title);

  const typeCounts: Record<string, number> = {
    "COMMERCIAL": 0,
    "INDUSTRIAL": 0,
    "INSTITUTIONAL": 0,
    "RESIDENTIAL": 0,
    "SOCIAL": 0,
    "SPECIAL CUSTOMER": 0,
  };

  tickets.forEach((t) => {
    const ctype = inferCustomerType(t);
    typeCounts[ctype] = (typeCounts[ctype] || 0) + 1;
  });

  const types = Object.keys(typeCounts);
  const maxCount = Math.max(...Object.values(typeCounts), 1);

  const containerBar = document.createElement("div");
  containerBar.className = "flex items-end gap-1.5 h-36 px-2 pb-6 pt-5";

  types.forEach((type) => {
    const count = typeCounts[type];
    const heightPct = Math.max(5, (count / maxCount) * 100);
    const isSelected = activeFilter.type === "custType" && activeFilter.value === type;

    const col = document.createElement("div");
    col.className = "flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group";
    col.addEventListener("click", () => onSelectType(type));

    col.innerHTML = `
      <div class="text-[9px] font-bold ${isSelected ? "text-sky-300" : "text-white"} mb-1 text-center">
        ${count}
      </div>
      <div class="w-full ${isSelected ? "bg-sky-400" : "bg-sky-600 group-hover:bg-sky-500"} rounded-t transition" style="height: ${heightPct}%;"></div>
      <div class="absolute -bottom-5 text-[7.5px] font-semibold ${isSelected ? "text-sky-300 font-bold" : "text-slate-400"} text-center truncate w-full" title="${type}">
        ${type.replace("CUSTOMER", "CUST")}
      </div>
    `;

    containerBar.appendChild(col);
  });

  card.appendChild(containerBar);
  return card;
}

/**
 * 6. SLA Complain (Donut)
 */
function createSlaComplainCard(
  tickets: UnifiedTicket[],
  activeFilter: any,
  onSelectSla: (s: string) => void
): HTMLElement {
  const card = document.createElement("div");
  card.className = "p-3 bg-black border border-slate-700/80 rounded flex flex-col items-center justify-between";

  let tercapai = 0;
  let tidakTercapai = 0;
  let onProgress = 0;

  tickets.forEach((t) => {
    const slaDays = getSlaDays(t.category);
    const receivedTime = new Date(t.receivedAt).getTime();
    const doneTime = t.completedAt ? new Date(t.completedAt).getTime() : Date.now();
    const diffDays = (doneTime - receivedTime) / (1000 * 3600 * 24);

    if (t.status === "selesai") {
      if (diffDays <= slaDays) {
        tercapai++;
      } else {
        tidakTercapai++;
      }
    } else {
      if (diffDays <= slaDays) {
        onProgress++;
      } else {
        tidakTercapai++;
      }
    }
  });

  const total = tickets.length || 1;
  const tercapaiPct = Math.round((tercapai / total) * 100);
  const tidakTercapaiPct = Math.round((tidakTercapai / total) * 100);
  const onProgressPct = Math.max(0, 100 - tercapaiPct - tidakTercapaiPct);

  const items = [
    { label: "TERCAPAI", count: tercapai, pct: tercapaiPct, color: "#0284c7" },
    { label: "TIDAK TERCAPAI", count: tidakTercapai, pct: tidakTercapaiPct, color: "#60a5fa" },
    { label: "ON PROGRESS", count: onProgress, pct: onProgressPct, color: "#93c5fd" },
  ];

  const svg = createDonutSvg(items, "SLA\nCOMPLAIN", onSelectSla);
  card.appendChild(svg);

  // Legend
  const legend = document.createElement("div");
  legend.className = "flex flex-wrap items-center justify-center gap-2 mt-2 text-[9px] text-slate-300";
  items.forEach((item) => {
    const isSelected = activeFilter.type === "sla" && activeFilter.value === item.label;
    legend.innerHTML += `
      <div class="flex items-center gap-1 cursor-pointer hover:text-white" title="${item.label}: ${item.count}">
        <span class="w-2 h-2 rounded-full" style="background: ${item.color}"></span>
        <span class="${isSelected ? "text-sky-300 font-bold" : ""}">${item.label} (${item.count})</span>
      </div>
    `;
  });

  card.appendChild(legend);
  return card;
}

/**
 * 7. Outstanding by Month (Bar)
 */
function createOutstandingMonthCard(
  tickets: UnifiedTicket[],
  activeFilter: any,
  onSelectMonth: (m: string) => void
): HTMLElement {
  const card = document.createElement("div");
  card.className = "p-3 bg-black border border-slate-700/80 rounded";

  const title = document.createElement("div");
  title.className = "text-center text-xs font-bold text-white tracking-wider mb-2";
  title.textContent = "OUTSTANDING BY MONTH";
  card.appendChild(title);

  const outstanding = tickets.filter((t) => t.status !== "selesai");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
  const monthlyCounts: Record<string, number> = {};
  months.forEach((m) => (monthlyCounts[m] = 0));

  outstanding.forEach((t) => {
    const m = formatMonth(t.receivedAt);
    if (monthlyCounts[m] !== undefined) {
      monthlyCounts[m]++;
    }
  });

  const maxCount = Math.max(...Object.values(monthlyCounts), 1);

  const containerBar = document.createElement("div");
  containerBar.className = "flex items-end gap-1.5 h-32 px-2 pb-5 pt-4";

  months.forEach((m) => {
    const count = monthlyCounts[m] || 0;
    const heightPct = Math.max(5, (count / maxCount) * 100);
    const isSelected = activeFilter.type === "month" && activeFilter.value === m;

    const col = document.createElement("div");
    col.className = "flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group";
    col.addEventListener("click", () => onSelectMonth(m));

    col.innerHTML = `
      <div class="text-[9px] font-bold ${isSelected ? "text-sky-300" : "text-white"} mb-1 text-center">
        ${count}
      </div>
      <div class="w-full ${isSelected ? "bg-sky-400" : "bg-sky-600 group-hover:bg-sky-500"} rounded-t transition" style="height: ${heightPct}%;"></div>
      <div class="absolute -bottom-5 text-[8.5px] font-semibold ${isSelected ? "text-sky-300 font-bold" : "text-slate-400"} text-center w-full">
        ${m}
      </div>
    `;

    containerBar.appendChild(col);
  });

  card.appendChild(containerBar);
  return card;
}

/**
 * 8. Outstanding by Case (Bar)
 */
function createOutstandingByCaseCard(
  tickets: UnifiedTicket[],
  activeFilter: any,
  onSelectCase: (c: string) => void
): HTMLElement {
  const card = document.createElement("div");
  card.className = "p-3 bg-black border border-slate-700/80 rounded";

  const title = document.createElement("div");
  title.className = "text-center text-xs font-bold text-white tracking-wider mb-2";
  title.textContent = "OUTSTANDING BY CASE";
  card.appendChild(title);

  const outstanding = tickets.filter((t) => t.status !== "selesai");
  const caseCounts: Record<string, number> = {};

  outstanding.forEach((t) => {
    const cat = t.category || "LAINNYA";
    caseCounts[cat] = (caseCounts[cat] || 0) + 1;
  });

  const categories = Object.keys(caseCounts).sort((a, b) => caseCounts[b] - caseCounts[a]);
  const maxCount = Math.max(...Object.values(caseCounts), 1);

  const containerBar = document.createElement("div");
  containerBar.className = "flex items-end gap-1.5 h-32 px-2 overflow-x-auto pb-5 pt-4";

  if (categories.length === 0) {
    containerBar.innerHTML = `<div class="w-full h-full flex items-center justify-center text-xs text-slate-500 italic">Tidak ada tiket outstanding</div>`;
  } else {
    categories.forEach((cat) => {
      const count = caseCounts[cat];
      const heightPct = Math.max(8, (count / maxCount) * 100);
      const isSelected = activeFilter.type === "case" && activeFilter.value === cat;

      const col = document.createElement("div");
      col.className = "flex-1 min-w-[26px] max-w-[38px] flex flex-col items-center justify-end h-full relative cursor-pointer group";
      col.addEventListener("click", () => onSelectCase(cat));

      col.innerHTML = `
        <div class="text-[9px] font-bold ${isSelected ? "text-sky-300" : "text-white"} mb-1 text-center">
          ${count}
        </div>
        <div class="w-full ${isSelected ? "bg-sky-400" : "bg-sky-600 group-hover:bg-sky-500"} rounded-t transition" style="height: ${heightPct}%;"></div>
        <div class="absolute -bottom-5 text-[8px] font-semibold ${isSelected ? "text-sky-300 font-bold" : "text-slate-400"} text-center truncate w-full" title="${cat}">
          ${cat}
        </div>
      `;

      containerBar.appendChild(col);
    });
  }

  card.appendChild(containerBar);
  return card;
}

/**
 * 9. Average SLA by Case (Bar)
 */
function createAverageSlaCard(
  tickets: UnifiedTicket[],
  activeFilter: any,
  onSelectCase: (c: string) => void
): HTMLElement {
  const card = document.createElement("div");
  card.className = "p-3 bg-black border border-slate-700/80 rounded";

  const title = document.createElement("div");
  title.className = "text-center text-xs font-bold text-white tracking-wider mb-2";
  title.textContent = "AVERAGE SLA BY CASE (DAYS)";
  card.appendChild(title);

  // Group durations by category
  const caseDurations: Record<string, number[]> = {};
  tickets.forEach((t) => {
    const cat = t.category || "LAINNYA";
    if (!caseDurations[cat]) caseDurations[cat] = [];

    if (t.completedAt) {
      const days = Math.max(0.5, (new Date(t.completedAt).getTime() - new Date(t.receivedAt).getTime()) / (1000 * 3600 * 24));
      caseDurations[cat].push(days);
    } else {
      // Use target SLA
      caseDurations[cat].push(getSlaDays(cat));
    }
  });

  const categories = Object.keys(caseDurations).sort((a, b) => a.localeCompare(b));
  const averages: Record<string, number> = {};
  categories.forEach((cat) => {
    const arr = caseDurations[cat];
    const avg = arr.reduce((acc, v) => acc + v, 0) / arr.length;
    averages[cat] = Math.round(avg * 10) / 10;
  });

  const maxDays = Math.max(...Object.values(averages), 1);

  const containerBar = document.createElement("div");
  containerBar.className = "flex items-end gap-1.5 h-32 px-2 overflow-x-auto pb-5 pt-4";

  categories.forEach((cat) => {
    const avg = averages[cat];
    const heightPct = Math.max(8, (avg / maxDays) * 100);
    const isSelected = activeFilter.type === "case" && activeFilter.value === cat;

    const col = document.createElement("div");
    col.className = "flex-1 min-w-[26px] max-w-[38px] flex flex-col items-center justify-end h-full relative cursor-pointer group";
    col.addEventListener("click", () => onSelectCase(cat));

    col.innerHTML = `
      <div class="text-[8.5px] font-bold ${isSelected ? "text-sky-300" : "text-white"} mb-1 text-center whitespace-nowrap">
        ${avg.toFixed(1)}
      </div>
      <div class="w-full ${isSelected ? "bg-sky-400" : "bg-sky-600 group-hover:bg-sky-500"} rounded-t transition" style="height: ${heightPct}%;"></div>
      <div class="absolute -bottom-5 text-[8px] font-semibold ${isSelected ? "text-sky-300 font-bold" : "text-slate-400"} text-center truncate w-full" title="${cat}">
        ${cat}
      </div>
    `;

    containerBar.appendChild(col);
  });

  card.appendChild(containerBar);
  return card;
}

/**
 * Reusable SVG Donut Chart with center label
 */
function createDonutSvg(
  slices: { label: string; count: number; pct: number; color: string }[],
  centerText: string,
  onClickSlice: (lbl: string) => void
): SVGElement {
  const size = 160;
  const center = size / 2;
  const radius = 55;
  const strokeWidth = 24;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("class", "w-36 h-36 my-1");

  const circumference = 2 * Math.PI * radius;
  let accumulatedPct = 0;

  slices.forEach((slice) => {
    if (slice.count <= 0 && slice.pct <= 0) return;

    const strokeDasharray = `${(slice.pct / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPct / 100) * circumference);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(center));
    circle.setAttribute("cy", String(center));
    circle.setAttribute("r", String(radius));
    circle.setAttribute("fill", "transparent");
    circle.setAttribute("stroke", slice.color);
    circle.setAttribute("stroke-width", String(strokeWidth));
    circle.setAttribute("stroke-dasharray", strokeDasharray);
    circle.setAttribute("stroke-dashoffset", String(strokeDashoffset));
    circle.setAttribute("transform", `rotate(-90 ${center} ${center})`);
    circle.setAttribute("class", "cursor-pointer transition hover:opacity-80");

    circle.addEventListener("click", () => onClickSlice(slice.label));
    svg.appendChild(circle);

    accumulatedPct += slice.pct;
  });

  // Inner center text
  const lines = centerText.split("\n");
  lines.forEach((line, i) => {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(center));
    text.setAttribute("y", String(center - (lines.length - 1) * 6 + i * 12 + 4));
    text.setAttribute("fill", "#ffffff");
    text.setAttribute("font-size", "8.5");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("text-anchor", "middle");
    svg.appendChild(text);
    text.textContent = line;
  });

  return svg;
}

// -----------------------------------------------------------------------------------
// 10. INTERACTIVE DATA EXPLORER TABLE (LIHAT DATANYA)
// -----------------------------------------------------------------------------------

function createDataExplorerSection(
  filteredTickets: UnifiedTicket[],
  totalCount: number,
  activeFilter: any,
  searchQuery: string,
  onSearchChange: (q: string) => void,
  onResetFilter: () => void,
  onDataModified: () => void
): HTMLElement {
  const section = document.createElement("div");
  section.id = "bi-data-table-section";
  section.className = "p-4 bg-slate-900 border border-slate-800 rounded-lg shadow-xl mt-4";

  // Header & Search
  const header = document.createElement("div");
  header.className = "flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800";
  header.innerHTML = `
    <div>
      <h2 class="text-sm font-black text-white flex items-center gap-2">
        <span>📋</span> DATA PENGADUAN LINTAS DIVISI
        <span class="px-2 py-0.5 rounded-full bg-sky-900/60 text-sky-300 text-xs font-bold border border-sky-700/50">
          ${filteredTickets.length} / ${totalCount} Tiket
        </span>
      </h2>
      <p class="text-xs text-slate-400 mt-0.5">
        Klik baris atau tombol Aksi untuk memeriksa rincian lengkap atau memperbarui status pengaduan.
      </p>
    </div>
    <div class="flex items-center gap-2">
      <div class="relative">
        <input
          type="text"
          id="bi-search-input"
          placeholder="Cari nama, meter, ID, alamat..."
          value="${searchQuery}"
          class="w-64 px-3 py-1.5 pl-8 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
        />
        <span class="absolute left-2.5 top-2 text-slate-500 text-xs">🔍</span>
      </div>
      ${
        activeFilter.type !== "none" || searchQuery
          ? `<button id="btn-clear-search-filter" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold border border-slate-700 transition">
              ✕ Reset
            </button>`
          : ""
      }
    </div>
  `;

  header.querySelector("#bi-search-input")?.addEventListener("input", (e: any) => {
    onSearchChange(e.target.value);
  });

  header.querySelector("#btn-clear-search-filter")?.addEventListener("click", () => {
    onResetFilter();
  });

  section.appendChild(header);

  // Table
  const tableContainer = document.createElement("div");
  tableContainer.className = "overflow-x-auto mt-3 max-h-[500px]";

  if (filteredTickets.length === 0) {
    tableContainer.innerHTML = `
      <div class="p-8 text-center text-slate-500 text-xs italic">
        Tidak ditemukan tiket pengaduan yang sesuai dengan filter atau pencarian saat ini.
      </div>
    `;
  } else {
    const table = document.createElement("table");
    table.className = "w-full text-left text-xs border-collapse";

    table.innerHTML = `
      <thead>
        <tr class="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
          <th class="p-2.5">Case ID / WO</th>
          <th class="p-2.5">Tanggal</th>
          <th class="p-2.5">Pelanggan</th>
          <th class="p-2.5">Divisi / PIC</th>
          <th class="p-2.5">Kasus</th>
          <th class="p-2.5">Saluran</th>
          <th class="p-2.5">Tipe Pelanggan</th>
          <th class="p-2.5">Status</th>
          <th class="p-2.5">SLA</th>
          <th class="p-2.5 text-center">Aksi</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-800/80">
      </tbody>
    `;

    const tbody = table.querySelector("tbody")!;

    filteredTickets.forEach((t) => {
      const slaDays = getSlaDays(t.category);
      const isDone = t.status === "selesai";
      const customerType = inferCustomerType(t);
      const divLabel = getDivisionLabel(t.targetDivision);

      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-800/50 transition cursor-pointer text-slate-300";

      tr.innerHTML = `
        <td class="p-2.5 font-mono">
          <div class="font-bold text-sky-400">${t.caseId || t.id}</div>
          <div class="text-[10px] text-slate-500">${t.id}</div>
        </td>
        <td class="p-2.5 whitespace-nowrap">
          <div class="font-medium text-slate-200">${formatDateShort(t.receivedAt)}</div>
          <div class="text-[10px] text-slate-500">${formatMonth(t.receivedAt)} 2026</div>
        </td>
        <td class="p-2.5">
          <div class="font-bold text-white">${t.customer}</div>
          <div class="text-[10px] text-slate-400 truncate max-w-[180px]">${t.address || t.area || "-"}</div>
        </td>
        <td class="p-2.5">
          <div class="font-semibold text-slate-200">${divLabel}</div>
          <div class="text-[10px] text-slate-400">${t.officer || "Belum ditugaskan"}</div>
        </td>
        <td class="p-2.5">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-sky-300 border border-slate-700">
            ${t.category}
          </span>
          <div class="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">${t.desc}</div>
        </td>
        <td class="p-2.5 whitespace-nowrap">
          <span class="text-[11px]">${t.intakeChannel || "WhatsApp CS"}</span>
        </td>
        <td class="p-2.5 whitespace-nowrap">
          <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${
            customerType === "INDUSTRIAL"
              ? "bg-purple-950 text-purple-300 border border-purple-800"
              : customerType === "COMMERCIAL"
              ? "bg-amber-950 text-amber-300 border border-amber-800"
              : "bg-slate-800 text-slate-300"
          }">
            ${customerType}
          </span>
        </td>
        <td class="p-2.5 whitespace-nowrap">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isDone
              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800"
              : t.status === "proses"
              ? "bg-sky-950/80 text-sky-300 border border-sky-800"
              : "bg-amber-950/80 text-amber-300 border border-amber-800"
          }">
            ${isDone ? "✓ Selesai" : t.status === "proses" ? "⏳ Proses" : "Baru"}
          </span>
        </td>
        <td class="p-2.5 whitespace-nowrap">
          <div class="font-bold ${isDone ? "text-emerald-400" : "text-amber-400"} text-[10px]">
            ${slaDays} Hari (SLA)
          </div>
        </td>
        <td class="p-2.5 text-center whitespace-nowrap">
          <button class="btn-ticket-detail px-2 py-1 bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800 rounded font-semibold text-[10px] transition">
            👁️ Detail
          </button>
        </td>
      `;

      tr.querySelector(".btn-ticket-detail")?.addEventListener("click", (e) => {
        e.stopPropagation();
        openTicketDetailModal(t, () => {
          onDataModified();
        });
      });

      tr.addEventListener("click", () => {
        openTicketDetailModal(t, () => {
          onDataModified();
        });
      });

      tbody.appendChild(tr);
    });

    tableContainer.appendChild(table);
  }

  section.appendChild(tableContainer);
  return section;
}

// -----------------------------------------------------------------------------------
// MODALS & ACTIONS
// -----------------------------------------------------------------------------------

function openTicketDetailModal(ticket: UnifiedTicket, onUpdate: () => void) {
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn";

  const isDone = ticket.status === "selesai";
  const divLabel = getDivisionLabel(ticket.targetDivision);
  const custType = inferCustomerType(ticket);

  modalOverlay.innerHTML = `
    <div class="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 shadow-2xl text-slate-100 flex flex-col gap-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <div class="text-[10px] font-mono text-sky-400 font-bold">CASE ID: ${ticket.caseId || ticket.id}</div>
          <h3 class="text-base font-black text-white">${ticket.customer}</h3>
        </div>
        <button id="modal-close" class="text-slate-400 hover:text-white text-lg font-bold">✕</button>
      </div>

      <div class="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800">
        <div>
          <div class="text-[10px] text-slate-500 font-bold uppercase">Divisi Penanggung Jawab</div>
          <div class="font-bold text-white mt-0.5">${divLabel}</div>
        </div>
        <div>
          <div class="text-[10px] text-slate-500 font-bold uppercase">Petugas / PIC</div>
          <div class="font-bold text-slate-300 mt-0.5">${ticket.officer || "Belum ditugaskan"}</div>
        </div>
        <div>
          <div class="text-[10px] text-slate-500 font-bold uppercase">Kategori Pengaduan</div>
          <div class="font-bold text-sky-400 mt-0.5">${ticket.category}</div>
        </div>
        <div>
          <div class="text-[10px] text-slate-500 font-bold uppercase">Tipe Pelanggan</div>
          <div class="font-bold text-purple-300 mt-0.5">${custType}</div>
        </div>
        <div>
          <div class="text-[10px] text-slate-500 font-bold uppercase">Saluran Masuk</div>
          <div class="font-bold text-slate-300 mt-0.5">${ticket.intakeChannel || "WhatsApp CS"}</div>
        </div>
        <div>
          <div class="text-[10px] text-slate-500 font-bold uppercase">Status Tiket</div>
          <div class="font-bold ${isDone ? "text-emerald-400" : "text-amber-400"} mt-0.5">
            ${isDone ? "Selesai Ditangani" : ticket.status === "proses" ? "Sedang Diproses" : "Baru Diterima"}
          </div>
        </div>
      </div>

      <div class="text-xs">
        <div class="text-[10px] text-slate-500 font-bold uppercase">Deskripsi Keluhan</div>
        <div class="mt-1 p-2 bg-slate-950 border border-slate-800 rounded text-slate-300 leading-relaxed">
          ${ticket.desc || "Tidak ada deskripsi rinci."}
        </div>
      </div>

      ${
        ticket.completionNotes
          ? `
        <div class="text-xs">
          <div class="text-[10px] text-emerald-400 font-bold uppercase">Catatan Penyelesaian</div>
          <div class="mt-1 p-2 bg-emerald-950/30 border border-emerald-800/50 rounded text-emerald-200">
            ${ticket.completionNotes}
          </div>
        </div>
      `
          : ""
      }

      <div class="flex items-center justify-between pt-3 border-t border-slate-800 gap-2">
        <button id="modal-btn-toggle-status" class="px-3 py-2 ${
          isDone ? "bg-amber-800 hover:bg-amber-700 text-white" : "bg-emerald-700 hover:bg-emerald-600 text-white"
        } rounded text-xs font-bold transition flex items-center gap-1.5 shadow">
          <span>${isDone ? "↩️ Buka Kembali Tiket" : "✓ Tandai Selesai"}</span>
        </button>
        <button id="modal-btn-cancel" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition">
          Tutup
        </button>
      </div>
    </div>
  `;

  modalOverlay.querySelector("#modal-close")?.addEventListener("click", () => modalOverlay.remove());
  modalOverlay.querySelector("#modal-btn-cancel")?.addEventListener("click", () => modalOverlay.remove());

  modalOverlay.querySelector("#modal-btn-toggle-status")?.addEventListener("click", () => {
    ticket.status = isDone ? "proses" : "selesai";
    ticket.distributionStatus = isDone ? "in_progress" : "resolved";
    if (!isDone) {
      ticket.completedAt = new Date().toISOString();
      if (!ticket.completionNotes) {
        ticket.completionNotes = "Ditandai selesai via Executive BI Dashboard.";
      }
    } else {
      ticket.completedAt = undefined;
    }
    saveSingleTicket(ticket);
    window.dispatchEvent(new CustomEvent("aetra:tickets_changed", { detail: ticket }));
    modalOverlay.remove();
    onUpdate();
  });

  document.body.appendChild(modalOverlay);
}

function openQuickTicketModal(onCreated: () => void) {
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn";

  modalOverlay.innerHTML = `
    <div class="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-5 shadow-2xl text-slate-100 flex flex-col gap-3">
      <div class="flex items-center justify-between pb-2 border-b border-slate-800">
        <h3 class="text-sm font-black text-white flex items-center gap-2">
          <span>➕</span> INPUT PENGADUAN BARU
        </h3>
        <button id="quick-modal-close" class="text-slate-400 hover:text-white">✕</button>
      </div>

      <div class="space-y-2 text-xs">
        <div>
          <label class="block text-[10px] text-slate-400 uppercase font-bold mb-1">Nama Pelanggan</label>
          <input type="text" id="quick-customer" placeholder="Contoh: Bpk. Bambang Sutopo" class="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-sky-500" />
        </div>
        <div>
          <label class="block text-[10px] text-slate-400 uppercase font-bold mb-1">Nomor Meter / Alamat</label>
          <input type="text" id="quick-address" placeholder="Contoh: MTR-9901 / Jl. Flamboyan Blok B No. 4" class="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-sky-500" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] text-slate-400 uppercase font-bold mb-1">Kategori Kasus</label>
            <select id="quick-category" class="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-sky-500">
              ${AETRA_CASE_CATEGORIES.map((c) => `<option value="${c.key}">[${c.key}] ${c.name}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="block text-[10px] text-slate-400 uppercase font-bold mb-1">Saluran Masuk</label>
            <select id="quick-channel" class="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-sky-500">
              <option value="WhatsApp CS">WhatsApp CS</option>
              <option value="Call Center 24 Jam">Call Center 24 Jam</option>
              <option value="Loket Kantor">Loket Kantor</option>
              <option value="Email">Email</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-[10px] text-slate-400 uppercase font-bold mb-1">Keterangan Keluhan</label>
          <textarea id="quick-desc" rows="2" placeholder="Deskripsikan pengaduan warga..." class="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-sky-500"></textarea>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
        <button id="quick-btn-cancel" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold">Batal</button>
        <button id="quick-btn-submit" class="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold transition">Simpan Pengaduan</button>
      </div>
    </div>
  `;

  modalOverlay.querySelector("#quick-modal-close")?.addEventListener("click", () => modalOverlay.remove());
  modalOverlay.querySelector("#quick-btn-cancel")?.addEventListener("click", () => modalOverlay.remove());

  modalOverlay.querySelector("#quick-btn-submit")?.addEventListener("click", () => {
    const custInput = (modalOverlay.querySelector("#quick-customer") as HTMLInputElement).value.trim();
    const addrInput = (modalOverlay.querySelector("#quick-address") as HTMLInputElement).value.trim();
    const catInput = (modalOverlay.querySelector("#quick-category") as HTMLSelectElement).value;
    const chanInput = (modalOverlay.querySelector("#quick-channel") as HTMLSelectElement).value;
    const descInput = (modalOverlay.querySelector("#quick-desc") as HTMLTextAreaElement).value.trim();

    if (!custInput) {
      alert("Silakan masukkan nama pelanggan.");
      return;
    }

    const newId = `WO-2026-${String(Date.now()).slice(-4)}`;
    const newCaseId = generateCaseId(newId);

    // Determine target division dynamically from official category rules
    const targetDivision: DivisionId = getRecommendedDivision(catInput);

    const newTicket: UnifiedTicket = {
      id: newId,
      caseId: newCaseId,
      customer: custInput,
      phone: "081299887766",
      address: addrInput || "Area Tangerang Barat",
      area: "Cikupa",
      meterId: `MTR-${Math.floor(10000 + Math.random() * 90000)}`,
      category: catInput,
      desc: descInput || "Laporan masuk via CS",
      status: "baru",
      urgent: false,
      coords: "-6.2231, 106.5134",
      receivedAt: new Date().toISOString(),
      targetDivision,
      distributionStatus: "distributed",
      distributedAt: new Date().toISOString(),
      distributedBy: "Customer Service (BI Quick Input)",
      intakeChannel: chanInput as any,
    };

    saveSingleTicket(newTicket);
    window.dispatchEvent(new CustomEvent("aetra:tickets_changed", { detail: newTicket }));
    modalOverlay.remove();
    onCreated();
  });

  document.body.appendChild(modalOverlay);
}

function exportTicketsToExcel(tickets: UnifiedTicket[]) {
  const data = tickets.map((t) => ({
    "Case ID": t.caseId || t.id,
    "Nomor WO": t.id,
    "Tanggal Terima": t.receivedAt ? new Date(t.receivedAt).toLocaleDateString("id-ID") : "-",
    "Bulan": formatMonth(t.receivedAt),
    "Nama Pelanggan": t.customer,
    "Nomor Meter": t.meterId || "-",
    "Alamat / Wilayah": t.address || t.area || "-",
    "Divisi PIC": getDivisionLabel(t.targetDivision),
    "Petugas": t.officer || "-",
    "Kategori Kasus": t.category,
    "Deskripsi": t.desc || "-",
    "Saluran Masuk": t.intakeChannel || "WhatsApp CS",
    "Tipe Pelanggan": inferCustomerType(t),
    "Status": t.status,
    "Target SLA (Hari)": getSlaDays(t.category),
    "Tanggal Selesai": t.completedAt ? new Date(t.completedAt).toLocaleDateString("id-ID") : "-",
    "Catatan Selesai": t.completionNotes || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Executive_Complaints");
  XLSX.writeFile(workbook, `Aetra_Executive_Complaints_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function formatDateShort(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  } catch (e) {
    return "-";
  }
}
