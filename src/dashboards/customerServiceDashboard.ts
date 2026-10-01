/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Customer Service Dashboard - Gerbang Awal Penerimaan & Distribusi Komplain
 */

import {
  DivisionId,
  DIVISIONS,
  getRecommendedDivision,
  AETRA_CASE_CATEGORIES,
} from "../types/division";
import {
  UnifiedTicket,
  loadAllUnifiedTickets,
  saveSingleTicket,
  distributeTicketFromCS,
  generateCaseId,
} from "../services/divisionTicketService";
import { openReportPreviewModal } from "../reportPreviewModal";
import { createTicketCommentFeed } from "../components/ticketCommentFeed";
import { isViewItemVisible } from "../services/dashboardVisibilityService";
import { createExecutiveAnalyticsView } from "../components/csExecutiveAnalyticsView";
import { mountThirtyDayMovingAverageCard } from "../components/ThirtyDayMovingAverageCard";
import { createCustomerSatisfactionDashboardView } from "../components/CustomerSatisfactionDashboardWidget";
import {
  promptAutomaticCustomerCompletionWhatsApp,
  promptAutomaticCustomerEnRouteWhatsApp,
} from "../services/customerWhatsAppNotificationService";
import {
  getAllCustomers,
  searchCustomers,
  saveCustomerRecord,
  generateCcnbStandardCaseId,
  AetraCustomerRecord,
} from "../services/customerMasterService";

function generateRandom10DigitCaseId(): string {
  return generateCcnbStandardCaseId();
}

function getNowDateTimeLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseTicketDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  if (typeof dateStr === "string" && dateStr.includes(" ")) {
    d = new Date(dateStr.replace(" ", "T"));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function formatTicketDateTime(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const d = parseTicketDate(dateStr);
    if (!d) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getChannelBadge(channel?: string): { label: string; icon: string; bg: string; color: string; border: string } {
  const ch = (channel || "").toLowerCase();
  if (ch.includes("wa") || ch.includes("whatsapp")) {
    return { label: "WhatsApp", icon: "💬", bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" };
  }
  if (ch.includes("phone") || ch.includes("telepon") || ch.includes("telp")) {
    return { label: "Phone", icon: "📞", bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" };
  }
  if (ch.includes("email") || ch.includes("mail")) {
    return { label: "Email", icon: "✉️", bg: "#FFFBEB", color: "#B45309", border: "#FDE68A" };
  }
  if (ch.includes("walk") || ch.includes("loket") || ch.includes("tatap")) {
    return { label: "Walk In", icon: "🏢", bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE" };
  }
  if (ch.includes("contact") || ch.includes("call center") || ch.includes("call")) {
    return { label: "Contact Center", icon: "🎧", bg: "#F0F9FF", color: "#0369A1", border: "#BAE6FD" };
  }
  if (ch.includes("mobile") || ch.includes("app")) {
    return { label: "Mobile App", icon: "📱", bg: "#EEF2FF", color: "#4338CA", border: "#C7D2FE" };
  }
  if (ch.includes("medsos") || ch.includes("sosial") || ch.includes("social")) {
    return { label: "Media Sosial", icon: "🌐", bg: "#FFF1F2", color: "#BE123C", border: "#FECDD3" };
  }
  return { label: channel || "CS Intake", icon: "📥", bg: "#F1F5F9", color: "#334155", border: "#CBD5E1" };
}

export function renderCustomerServiceDashboard(container: HTMLElement): () => void {
  let tickets: UnifiedTicket[] = loadAllUnifiedTickets();
  let filterDivision: "all" | DivisionId | "unassigned" | "selesai" = "all";
  let searchQuery = "";
  let formOpen = true;
  let activeCsTab: "analytics" | "moving_avg" | "csat_rating" | "operational" =
    (localStorage.getItem("aetra_cs_active_view") as any) || "analytics";

  // Date Range Timeline Filter State
  type DatePreset = "all" | "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "custom";
  let dateFilterPreset: DatePreset = "all";
  let customStartDate: string = "";
  let customEndDate: string = "";

  function initCustomDatesIfEmpty() {
    if (!customStartDate || !customEndDate) {
      const now = new Date();
      const prior7 = new Date(now.getTime() - 6 * 24 * 3600 * 1000);
      const toYmd = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      };
      if (!customEndDate) customEndDate = toYmd(now);
      if (!customStartDate) customStartDate = toYmd(prior7);
    }
  }

  function checkTicketMatchesPreset(t: UnifiedTicket, preset: DatePreset): boolean {
    if (preset === "all") return true;
    const tDate = parseTicketDate(t.receivedAt);
    if (!tDate) return true;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (preset === "today") {
      return tDate >= startOfToday && tDate <= endOfToday;
    }

    if (preset === "yesterday") {
      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 3600 * 1000);
      const endOfYesterday = new Date(startOfToday.getTime() - 1);
      return tDate >= startOfYesterday && tDate <= endOfYesterday;
    }

    if (preset === "last7") {
      const start7 = new Date(startOfToday.getTime() - 6 * 24 * 3600 * 1000);
      return tDate >= start7 && tDate <= endOfToday;
    }

    if (preset === "last30") {
      const start30 = new Date(startOfToday.getTime() - 29 * 24 * 3600 * 1000);
      return tDate >= start30 && tDate <= endOfToday;
    }

    if (preset === "thisMonth") {
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return tDate >= startMonth && tDate <= endMonth;
    }

    if (preset === "custom") {
      let ok = true;
      if (customStartDate) {
        const [sy, sm, sd] = customStartDate.split("-").map(Number);
        const sDate = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
        if (tDate < sDate) ok = false;
      }
      if (customEndDate) {
        const [ey, em, ed] = customEndDate.split("-").map(Number);
        const eDate = new Date(ey, em - 1, ed, 23, 59, 59, 999);
        if (tDate > eDate) ok = false;
      }
      return ok;
    }

    return true;
  }

  function matchesDateFilter(t: UnifiedTicket): boolean {
    return checkTicketMatchesPreset(t, dateFilterPreset);
  }

  function getPresetTicketCount(preset: DatePreset): number {
    if (preset === "all") return tickets.length;
    return tickets.filter((t) => checkTicketMatchesPreset(t, preset)).length;
  }

  function getActiveTimelineLabel(): string {
    const now = new Date();
    if (dateFilterPreset === "all") return "Semua Waktu (Seluruh Riwayat)";
    if (dateFilterPreset === "today") {
      return `Hari Ini (${now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })})`;
    }
    if (dateFilterPreset === "yesterday") {
      const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
      return `Kemarin (${yesterday.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })})`;
    }
    if (dateFilterPreset === "last7") {
      const start7 = new Date(now.getTime() - 6 * 24 * 3600 * 1000);
      return `7 Hari Terakhir (${start7.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - ${now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })})`;
    }
    if (dateFilterPreset === "last30") {
      const start30 = new Date(now.getTime() - 29 * 24 * 3600 * 1000);
      return `30 Hari Terakhir (${start30.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} - ${now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })})`;
    }
    if (dateFilterPreset === "thisMonth") {
      return `Bulan Ini (${now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })})`;
    }
    if (dateFilterPreset === "custom") {
      if (customStartDate && customEndDate) {
        return `Rentang Kustom (${customStartDate} s/d ${customEndDate})`;
      } else if (customStartDate) {
        return `Mulai Dari (${customStartDate})`;
      } else if (customEndDate) {
        return `Sampai Tanggal (${customEndDate})`;
      }
      return "Rentang Kustom (Belum Ditetapkan)";
    }
    return "Rentang Waktu";
  }

  // New ticket state matching Image 1
  let newCaseId = generateRandom10DigitCaseId();
  let newCustomer = "";
  let newPhone = "";
  let newMeterId = "";
  let newAddress = "";
  let newArea = "Cikupa";
  let newCategory = "BPPD";
  let newReceivedAt = getNowDateTimeLocal();
  let newDesc = "";
  let newCoords = "";
  let newUrgent = false;
  let newChannel: UnifiedTicket["intakeChannel"] = "WhatsApp CS";
  let newTargetDivision: DivisionId = getRecommendedDivision("BPPD");
  let newDistributionNotes = "";

  // Master Customer Engine (CCnB Replacement) State
  let selectedMasterCustomer: AetraCustomerRecord | null = null;
  let masterSearchQuery = "";
  let masterSearchResults: AetraCustomerRecord[] = [];
  let isMasterModalOpen = false;
  let masterFilterQuery = "";
  let isAddingNewMasterCustomer = false;

  const AREAS = ["Cikupa", "Panongan", "Pasar Kemis", "Balaraja", "Curug", "Tigaraksa", "Rajeg"];

  function refreshData() {
    tickets = loadAllUnifiedTickets();
    render();
  }

  function handleCategoryChange(catKey: string) {
    newCategory = catKey;
    newTargetDivision = getRecommendedDivision(catKey);
    render();
  }

  function selectMasterCustomer(cust: AetraCustomerRecord) {
    selectedMasterCustomer = cust;
    newCustomer = cust.name;
    newPhone = cust.phone;
    newMeterId = cust.connectionNo ? `${cust.connectionNo} (${cust.meterId})` : cust.meterId;
    newAddress = cust.address;
    newArea = cust.area || "Cikupa";
    newCoords = cust.coords || "-6.2341, 106.5182";
    masterSearchResults = [];
    masterSearchQuery = "";
    render();
  }

  function fillQuickSampleData() {
    newCaseId = generateRandom10DigitCaseId();
    newCustomer = "Bpk. Bambang Wijaya, S.T.";
    newPhone = "081298765432";
    newMeterId = "001482910 (MTR-88291)";
    newAddress = "Jl. Raya Serang Km 14 No. 42, RT 03/RW 01, Kel. Sukamulya";
    newArea = "Cikupa";
    newCategory = "BPPD";
    newChannel = "WhatsApp CS";
    newTargetDivision = getRecommendedDivision("BPPD");
    newReceivedAt = getNowDateTimeLocal();
    newDesc = "Pelanggan mengajukan permohonan penambahan pipa dinas untuk perluasan sambungan gedung usaha ruko via WhatsApp CS.";
    newCoords = "-6.2341, 106.5182";
    newUrgent = false;
    selectedMasterCustomer = getAllCustomers()[0] || null;
    render();
  }

  function submitNewComplaint() {
    const caseIdEl = document.getElementById("cs-case-id") as HTMLInputElement;
    const custEl = document.getElementById("cs-customer") as HTMLInputElement;
    const phoneEl = document.getElementById("cs-phone") as HTMLInputElement;
    const meterEl = document.getElementById("cs-meter") as HTMLInputElement;
    const addrEl = document.getElementById("cs-address") as HTMLInputElement;
    const areaEl = document.getElementById("cs-area") as HTMLSelectElement;
    const catEl = document.getElementById("cs-category") as HTMLSelectElement;
    const channelEl = document.getElementById("cs-channel") as HTMLSelectElement;
    const recvEl = document.getElementById("cs-received-at") as HTMLInputElement;
    const descEl = document.getElementById("cs-desc") as HTMLTextAreaElement;
    const coordsEl = document.getElementById("cs-coords") as HTMLInputElement;
    const urgentEl = document.getElementById("cs-urgent") as HTMLInputElement;

    const caseIdVal = caseIdEl?.value.trim() || newCaseId || generateRandom10DigitCaseId();
    const custVal = custEl?.value.trim() || newCustomer.trim();
    const phoneVal = phoneEl?.value.trim() || newPhone.trim() || "081298765432";
    const meterVal = meterEl?.value.trim() || newMeterId.trim() || `MTR-${Math.floor(10000 + Math.random() * 90000)}`;
    const addrVal = addrEl?.value.trim() || newAddress.trim() || `Area ${areaEl?.value || "Cikupa"}`;
    const areaVal = areaEl?.value || newArea || "Cikupa";
    const catVal = catEl?.value || newCategory || "BPPD";
    const channelVal = channelEl?.value || newChannel || "WhatsApp CS";
    const recvVal = recvEl?.value || newReceivedAt || getNowDateTimeLocal();
    const descVal = descEl?.value.trim() || newDesc.trim() || "Detail komplain dicatat oleh Customer Service.";
    const coordsVal = coordsEl?.value.trim() || newCoords.trim() || "-6.1783, 106.6319";
    const urgentVal = urgentEl ? urgentEl.checked : newUrgent;

    if (!custVal) {
      // @ts-ignore
      if (window.Swal) {
        // @ts-ignore
        window.Swal.fire({
          icon: "warning",
          title: "Lengkapi Data",
          text: "Nama pelanggan wajib diisi.",
          confirmButtonColor: "#2563EB",
        });
      } else {
        alert("Nama pelanggan wajib diisi.");
      }
      return;
    }

    const newId = `WO-2026-${String(Date.now()).slice(-5)}`;
    const targetDivision = getRecommendedDivision(catVal);

    const newTicket: UnifiedTicket = {
      id: newId,
      caseId: caseIdVal,
      customer: custVal,
      phone: phoneVal,
      meterId: meterVal,
      address: addrVal,
      area: areaVal,
      category: catVal,
      desc: descVal,
      status: "baru",
      urgent: urgentVal,
      coords: coordsVal,
      receivedAt: recvVal ? new Date(recvVal).toISOString() : new Date().toISOString(),
      intakeChannel: channelVal,
      targetDivision,
      distributionStatus: "distributed",
      distributedAt: new Date().toISOString(),
      distributedBy: "Putri Delia (CS Dispatcher)",
      distributionNotes: `Tiket kasus [${catVal}] via ${channelVal} dialirkan ke ${DIVISIONS[targetDivision].name}.`,
    };

    saveSingleTicket(newTicket);
    tickets.unshift(newTicket);

    // Reset fields for fresh entry
    newCaseId = generateRandom10DigitCaseId();
    newCustomer = "";
    newPhone = "";
    newMeterId = "";
    newAddress = "";
    newDesc = "";
    newCoords = "";
    newUrgent = false;
    newChannel = "WhatsApp CS";
    newReceivedAt = getNowDateTimeLocal();

    // @ts-ignore
    if (window.Swal) {
      // @ts-ignore
      window.Swal.fire({
        icon: "success",
        title: "Work Order Berhasil Disimpan! 🚀",
        html: `
          <div style="font-size:13px; line-height:1.6; color:#334155; text-align:left; background:#F8FAFC; padding:12px; border-radius:8px; border:1px solid #E2E8F0;">
            <div><b>No. WO:</b> <span style="font-family:monospace; color:#0284C7; font-weight:800;">${newTicket.id}</span></div>
            <div><b>Case ID:</b> <span style="font-family:monospace; color:#4F46E5; font-weight:800;">${newTicket.caseId}</span></div>
            <div><b>Pelanggan:</b> ${newTicket.customer} (${newTicket.phone})</div>
            <div><b>Kasus:</b> [${newTicket.category}]</div>
            <div><b>Area:</b> ${newTicket.area}</div>
            <div><b>Divisi Tujuan:</b> <b style="color:${DIVISIONS[targetDivision].badgeColor};">${DIVISIONS[targetDivision].name}</b></div>
          </div>
        `,
        confirmButtonColor: "#2563EB",
      });
    }

    render();
  }

  function openRedistributeModal(ticket: UnifiedTicket) {
    // @ts-ignore
    if (!window.Swal) return;

    let selectedDiv = ticket.targetDivision;
    let customNotes = ticket.distributionNotes || "";

    // @ts-ignore
    window.Swal.fire({
      title: `⚡ Alihkan / Distribusikan Tiket ${ticket.id}`,
      html: `
        <div style="text-align:left; font-size:12px; color:#334155; display:flex; flex-direction:column; gap:10px;">
          <div><b>Pelanggan:</b> ${ticket.customer} (${ticket.area})</div>
          <div><b>Kategori:</b> [${ticket.category}] ${ticket.desc || ""}</div>
          <div>
            <label style="font-weight:700; display:block; margin-bottom:4px;">Pilih Divisi Tujuan Baru:</label>
            <select id="swal-select-div" style="width:100%; padding:8px; border-radius:6px; border:1px solid #CBD5E1; font-weight:700; font-size:12px;">
              <option value="minor_repair" ${selectedDiv === "minor_repair" ? "selected" : ""}>🛠️ Divisi Minor Repair</option>
              <option value="sales_support" ${selectedDiv === "sales_support" ? "selected" : ""}>💼 Operasional Sales Support</option>
              <option value="key_account" ${selectedDiv === "key_account" ? "selected" : ""}>🏢 Technical Key Account</option>
              <option value="technical_support" ${selectedDiv === "technical_support" ? "selected" : ""}>🔬 Technical Support & Lab</option>
            </select>
          </div>
          <div>
            <label style="font-weight:700; display:block; margin-bottom:4px;">Catatan Arahan CS:</label>
            <textarea id="swal-input-notes" style="width:100%; padding:8px; border-radius:6px; border:1px solid #CBD5E1; min-height:50px; font-size:12px;" placeholder="Instruksi untuk divisi tujuan...">${customNotes}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "🚀 Simpan & Distribusikan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#0284C7",
      preConfirm: () => {
        const divEl = document.getElementById("swal-select-div") as HTMLSelectElement;
        const notesEl = document.getElementById("swal-input-notes") as HTMLTextAreaElement;
        return {
          newDiv: divEl.value as DivisionId,
          newNotes: notesEl.value,
        };
      },
    }).then(async (result: any) => {
      if (result.isConfirmed && result.value) {
        await distributeTicketFromCS(
          ticket.id,
          result.value.newDiv,
          result.value.newNotes,
          "Putri Delia (CS Dispatcher)"
        );
        refreshData();
        const targetMeta = DIVISIONS[result.value.newDiv as DivisionId];
        // @ts-ignore
        window.Swal.fire({
          icon: "success",
          title: "Tiket Berhasil Dialihkan!",
          text: `Tiket ${ticket.id} sekarang telah masuk ke antrean ${targetMeta ? targetMeta.name : "divisi terkait"}.`,
          timer: 1600,
          showConfirmButton: false,
        });
      }
    });
  }

  function openCommentsModal(ticket: UnifiedTicket) {
    // @ts-ignore
    if (!window.Swal) return;

    const modalContainer = document.createElement("div");
    modalContainer.style.textAlign = "left";

    const feedWidget = createTicketCommentFeed({
      ticketId: ticket.id,
      ticketCustomer: ticket.customer,
      initialComments: ticket.comments || [],
      currentDivision: "customer_service",
      authorName: "Putri Delia (CS Dispatcher)",
      onCommentAdded: (_newCmt, allCmts) => {
        ticket.comments = allCmts;
        saveSingleTicket(ticket);
      },
    });
    modalContainer.appendChild(feedWidget);

    // @ts-ignore
    window.Swal.fire({
      title: `💬 Catatan Lintas Divisi: ${ticket.id}`,
      html: modalContainer,
      width: "700px",
      showConfirmButton: false,
      showCloseButton: true,
    }).then(() => {
      refreshData();
    });
  }

  function sendWhatsAppUpdateToCustomer(ticket: UnifiedTicket) {
    if (ticket.status === "selesai") {
      promptAutomaticCustomerCompletionWhatsApp(ticket as any);
      return;
    }

    if (ticket.status === "proses") {
      promptAutomaticCustomerEnRouteWhatsApp(ticket as any);
      return;
    }

    const rawPhone = (ticket.phone || "").replace(/\D/g, "");
    const phone = rawPhone.startsWith("0") ? "62" + rawPhone.slice(1) : rawPhone || "6281234567890";
    const targetDivName = DIVISIONS[ticket.targetDivision].name;

    const message = `Yth. Pelanggan Aetra Air Tangerang Bapak/Ibu ${ticket.customer}, laporan pengaduan Anda dengan No. WO: ${ticket.id} ([${ticket.category}]) telah diterima oleh Customer Service Aetra dan saat ini telah didistribusikan ke tim ${targetDivName} untuk penanganan segera. Terima kasih.`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  function render() {
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "max-width: 1520px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 16px;";

    // Calculate date-filtered tickets
    const dateFilteredTickets = tickets.filter(matchesDateFilter);
    const totalTickets = tickets.length;
    const activeDateCount = dateFilteredTickets.length;
    const mrCount = dateFilteredTickets.filter((t) => t.targetDivision === "minor_repair").length;
    const ossCount = dateFilteredTickets.filter((t) => t.targetDivision === "sales_support").length;
    const tkaCount = dateFilteredTickets.filter((t) => t.targetDivision === "key_account").length;
    const tsCount = dateFilteredTickets.filter((t) => t.targetDivision === "technical_support").length;
    const resolvedCount = dateFilteredTickets.filter((t) => t.status === "selesai").length;

    // View Navigation Bar: Executive Analytics (Power BI View) vs Operational Queue
    const viewTabNav = document.createElement("div");
    viewTabNav.className = "cs-view-tab-nav";
    viewTabNav.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 8px 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.04);
    `;

    const isAnalytics = activeCsTab === "analytics";
    const isMovingAvg = activeCsTab === "moving_avg";
    const isCsat = activeCsTab === "csat_rating";
    const isOperational = activeCsTab === "operational";

    const leftTabGroup = document.createElement("div");
    leftTabGroup.style.cssText = "display: flex; align-items: center; gap: 8px; flex-wrap: wrap;";

    const analyticsTabBtn = document.createElement("button");
    analyticsTabBtn.type = "button";
    analyticsTabBtn.style.cssText = `
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 800;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: ${isAnalytics ? "1px solid #0284C7" : "1px solid #E2E8F0"};
      background: ${isAnalytics ? "#0F172A" : "#F8FAFC"};
      color: ${isAnalytics ? "#38BDF8" : "#475569"};
      box-shadow: ${isAnalytics ? "0 2px 8px rgba(15,23,42,0.35)" : "none"};
      transition: all 0.15s ease;
    `;
    analyticsTabBtn.innerHTML = `
      <span style="font-size: 14px;">📊</span>
      <span>Executive Analytics BI</span>
      <span style="background: ${isAnalytics ? "#0284C7" : "#E2E8F0"}; color: ${isAnalytics ? "#FFFFFF" : "#64748B"}; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 10px;">
        27.959 Tiket
      </span>
    `;
    analyticsTabBtn.onclick = () => {
      activeCsTab = "analytics";
      localStorage.setItem("aetra_cs_active_view", "analytics");
      render();
    };

    const movingAvgTabBtn = document.createElement("button");
    movingAvgTabBtn.type = "button";
    movingAvgTabBtn.style.cssText = `
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 800;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: ${isMovingAvg ? "1px solid #0284C7" : "1px solid #E2E8F0"};
      background: ${isMovingAvg ? "#0F172A" : "#F8FAFC"};
      color: ${isMovingAvg ? "#38BDF8" : "#475569"};
      box-shadow: ${isMovingAvg ? "0 2px 8px rgba(15,23,42,0.35)" : "none"};
      transition: all 0.15s ease;
    `;
    movingAvgTabBtn.innerHTML = `
      <span style="font-size: 14px;">📈</span>
      <span>30-Day Moving Avg Trend</span>
      <span style="background: ${isMovingAvg ? "#0284C7" : "#E2E8F0"}; color: ${isMovingAvg ? "#FFFFFF" : "#64748B"}; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 10px;">
        Recharts
      </span>
    `;
    movingAvgTabBtn.onclick = () => {
      activeCsTab = "moving_avg";
      localStorage.setItem("aetra_cs_active_view", "moving_avg");
      render();
    };

    const csatTabBtn = document.createElement("button");
    csatTabBtn.type = "button";
    csatTabBtn.style.cssText = `
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 800;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: ${isCsat ? "1px solid #F59E0B" : "1px solid #E2E8F0"};
      background: ${isCsat ? "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)" : "#F8FAFC"};
      color: ${isCsat ? "#FBBF24" : "#475569"};
      box-shadow: ${isCsat ? "0 2px 8px rgba(245,158,11,0.35)" : "none"};
      transition: all 0.15s ease;
    `;
    csatTabBtn.innerHTML = `
      <span style="font-size: 14px;">⭐</span>
      <span>Rating Petugas & CSAT</span>
      <span style="background: ${isCsat ? "#F59E0B" : "#FEF3C7"}; color: ${isCsat ? "#FFFFFF" : "#B45309"}; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 10px;">
        Radial & Bar
      </span>
    `;
    csatTabBtn.onclick = () => {
      activeCsTab = "csat_rating";
      localStorage.setItem("aetra_cs_active_view", "csat_rating");
      render();
    };

    const operationalTabBtn = document.createElement("button");
    operationalTabBtn.type = "button";
    operationalTabBtn.style.cssText = `
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 800;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: ${isOperational ? "1px solid #0369A1" : "1px solid #E2E8F0"};
      background: ${isOperational ? "#0284C7" : "#F8FAFC"};
      color: ${isOperational ? "#FFFFFF" : "#475569"};
      box-shadow: ${isOperational ? "0 2px 8px rgba(2,132,199,0.3)" : "none"};
      transition: all 0.15s ease;
    `;
    operationalTabBtn.innerHTML = `
      <span style="font-size: 14px;">📋</span>
      <span>Input & Antrean Distribusi Tiket</span>
      <span style="background: ${isOperational ? "rgba(255,255,255,0.25)" : "#E2E8F0"}; color: ${isOperational ? "#FFFFFF" : "#64748B"}; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 10px;">
        ${dateFilterPreset === "all" ? `${totalTickets} Tiket` : `${activeDateCount} / ${totalTickets} Tiket`}
      </span>
    `;
    operationalTabBtn.onclick = () => {
      activeCsTab = "operational";
      localStorage.setItem("aetra_cs_active_view", "operational");
      render();
    };

    leftTabGroup.appendChild(analyticsTabBtn);
    leftTabGroup.appendChild(movingAvgTabBtn);
    leftTabGroup.appendChild(csatTabBtn);
    leftTabGroup.appendChild(operationalTabBtn);

    const rightTabInfo = document.createElement("div");
    rightTabInfo.style.cssText = "display: flex; align-items: center; gap: 8px; flex-wrap: wrap;";
    rightTabInfo.innerHTML = `
      ${
        dateFilterPreset !== "all"
          ? `<div style="font-size: 11px; font-weight: 700; color: #0284C7; background: #F0F9FF; border: 1px solid #BAE6FD; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
              <span>🗓️ Filter:</span>
              <span style="font-weight: 800;">${getActiveTimelineLabel()}</span>
            </div>`
          : ""
      }
      <span style="font-size: 11px; color: #64748B;">Tampilan Aktif:</span>
      <span style="font-size: 11px; font-weight: 800; color: ${isAnalytics || isMovingAvg ? "#0284C7" : isCsat ? "#D97706" : "#059669"}; background: ${isAnalytics || isMovingAvg ? "#F0F9FF" : isCsat ? "#FEF3C7" : "#ECFDF5"}; border: 1px solid ${isAnalytics || isMovingAvg ? "#BAE6FD" : isCsat ? "#FDE68A" : "#A7F3D0"}; padding: 3px 8px; border-radius: 6px;">
        ${isAnalytics ? "📊 Executive BI View" : isMovingAvg ? "📈 30-Day Moving Avg Trend" : isCsat ? "⭐ Kepuasan CSAT & Rating Petugas" : "📋 Operasional Loket & CS"}
      </span>
      <a href="/lapor.html" target="_blank" rel="noopener noreferrer" style="font-size: 11px; font-weight: 800; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 4px 10px; border-radius: 6px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;" title="Buka Link Pengaduan Mandiri Khusus Pelanggan Terpisah">
        <span>🌐</span>
        <span>Link Pengaduan Warga</span>
        <span>↗</span>
      </a>
      <button id="btn-copy-cs-portal-link" type="button" style="font-size: 11px; font-weight: 700; color: #0369A1; background: #F0F9FF; border: 1px solid #BAE6FD; padding: 4px 9px; border-radius: 6px; cursor: pointer;" title="Salin link /lapor.html untuk dikirim ke chat WhatsApp pelanggan">
        📋 Salin Link Warga
      </button>
    `;

    setTimeout(() => {
      const copyBtn = wrapper.querySelector("#btn-copy-cs-portal-link") as HTMLButtonElement;
      if (copyBtn) {
        copyBtn.onclick = () => {
          const laporUrl = `${window.location.origin}/lapor.html`;
          navigator.clipboard.writeText(laporUrl).then(() => {
            // @ts-ignore
            if ((window as any).Swal) {
              // @ts-ignore
              (window as any).Swal.fire({
                icon: "success",
                title: "Link Pengaduan Pelanggan Disalin! 🌐",
                html: `<div style="font-size:13px; margin-top:6px;">Link pengaduan mandiri terpisah untuk masyarakat/pelanggan:<br><b style="color:#059669;">${laporUrl}</b><br><br>Halaman ini terisolasi murni untuk pengaduan & pelacakan warga (tidak ada akses dashboard ataupun HP petugas).</div>`,
                timer: 4000,
                confirmButtonColor: "#059669",
              });
            }
          });
        };
      }
    }, 50);

    viewTabNav.appendChild(leftTabGroup);
    viewTabNav.appendChild(rightTabInfo);
    wrapper.appendChild(viewTabNav);

    // If Executive Analytics is active, render executive BI dashboard
    if (activeCsTab === "analytics") {
      const execView = createExecutiveAnalyticsView({
        tickets,
        onSwitchToOperational: () => {
          activeCsTab = "operational";
          localStorage.setItem("aetra_cs_active_view", "operational");
          render();
        },
      });
      wrapper.appendChild(execView);
      container.appendChild(wrapper);
      return;
    }

    // If Dedicated 30-Day Moving Average view is active
    if (activeCsTab === "moving_avg") {
      const maViewWrapper = document.createElement("div");
      maViewWrapper.className = "space-y-4 font-sans text-slate-100 p-4 rounded-xl";
      maViewWrapper.style.cssText = "background: #020617; min-height: 80vh;";

      const maRoot = mountThirtyDayMovingAverageCard(maViewWrapper, {
        initialTickets: tickets,
        onRefreshRequested: () => {
          tickets = loadAllUnifiedTickets();
          render();
        },
      });

      wrapper.appendChild(maViewWrapper);
      container.appendChild(wrapper);
      return;
    }

    // If CSAT & Officer Satisfaction Rating view is active
    if (activeCsTab === "csat_rating") {
      const csatView = createCustomerSatisfactionDashboardView({
        divisionFilter: "all",
      });
      wrapper.appendChild(csatView);
      container.appendChild(wrapper);
      return;
    }

    // =========================================================================
    // 0. DATE RANGE SELECTOR AT THE TOP OF OPERATIONAL WORK ORDERS
    // =========================================================================
    const dateRangeContainer = document.createElement("div");
    dateRangeContainer.className = "cs-date-range-selector";
    dateRangeContainer.style.cssText = `
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      padding: 14px 18px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.03);
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    // Header row
    const headerRow = document.createElement("div");
    headerRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;";

    const titleGroup = document.createElement("div");
    titleGroup.style.cssText = "display: flex; align-items: center; gap: 10px;";
    titleGroup.innerHTML = `
      <div style="width: 36px; height: 36px; border-radius: 10px; background: #F0F9FF; border: 1px solid #BAE6FD; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #0284C7; flex-shrink: 0;">
        🗓️
      </div>
      <div>
        <div style="font-size: 13px; font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span>Filter Rentang Waktu (Timeline Selector)</span>
          <span style="font-size: 10.5px; font-weight: 800; background: ${dateFilterPreset !== "all" ? "#0284C7" : "#F1F5F9"}; color: ${dateFilterPreset !== "all" ? "#FFFFFF" : "#475569"}; padding: 2px 7px; border-radius: 10px;">
            ${activeDateCount} dari ${totalTickets} WO
          </span>
        </div>
        <div style="font-size: 11px; color: #64748B; margin-top: 1px;">
          Saring antrean Work Order yang ditampilkan berdasarkan tanggal penerimaan komplain pelanggan
        </div>
      </div>
    `;

    const statusBadgeGroup = document.createElement("div");
    statusBadgeGroup.style.cssText = "display: flex; align-items: center; gap: 8px; flex-wrap: wrap;";

    const isFiltered = dateFilterPreset !== "all";
    statusBadgeGroup.innerHTML = `
      <div style="font-size: 11px; font-weight: 700; color: ${isFiltered ? "#0369A1" : "#475569"}; background: ${isFiltered ? "#F0F9FF" : "#F8FAFC"}; border: 1px solid ${isFiltered ? "#BAE6FD" : "#E2E8F0"}; padding: 4px 10px; border-radius: 8px; display: inline-flex; align-items: center; gap: 5px;">
        <span>${isFiltered ? "📌 Filter Aktif:" : "🌐 Periode:"}</span>
        <span style="font-weight: 800; color: ${isFiltered ? "#0284C7" : "#0F172A"};">${getActiveTimelineLabel()}</span>
      </div>
      ${
        isFiltered
          ? `<button type="button" class="btn-reset-date-top" style="padding: 4px 10px; font-size: 11px; font-weight: 700; background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: background 0.15s ease;">
              <span>✕</span> Reset Timeline
            </button>`
          : ""
      }
    `;

    const resetBtnTop = statusBadgeGroup.querySelector(".btn-reset-date-top") as HTMLButtonElement;
    if (resetBtnTop) {
      resetBtnTop.onclick = () => {
        dateFilterPreset = "all";
        customStartDate = "";
        customEndDate = "";
        render();
      };
    }

    headerRow.appendChild(titleGroup);
    headerRow.appendChild(statusBadgeGroup);
    dateRangeContainer.appendChild(headerRow);

    // Presets Buttons Row
    const presetButtonsRow = document.createElement("div");
    presetButtonsRow.style.cssText = "display: flex; align-items: center; gap: 6px; flex-wrap: wrap;";

    const presetsConfig: { id: DatePreset; label: string; icon: string }[] = [
      { id: "all", label: "Semua Waktu", icon: "🌐" },
      { id: "today", label: "Hari Ini", icon: "⚡" },
      { id: "yesterday", label: "Kemarin", icon: "⏳" },
      { id: "last7", label: "7 Hari Terakhir", icon: "🗓️" },
      { id: "last30", label: "30 Hari Terakhir", icon: "📆" },
      { id: "thisMonth", label: "Bulan Ini", icon: "🏢" },
      { id: "custom", label: "Rentang Kustom", icon: "⚙️" },
    ];

    presetsConfig.forEach((cfg) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const isSelected = dateFilterPreset === cfg.id;
      const count = getPresetTicketCount(cfg.id);

      btn.style.cssText = `
        padding: 7px 12px;
        font-size: 11.5px;
        font-weight: 700;
        border-radius: 8px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
        border: ${isSelected ? "1px solid #0284C7" : "1px solid #CBD5E1"};
        background: ${isSelected ? "#0284C7" : "#FFFFFF"};
        color: ${isSelected ? "#FFFFFF" : "#334155"};
        box-shadow: ${isSelected ? "0 2px 6px rgba(2,132,199,0.25)" : "none"};
      `;
      btn.innerHTML = `
        <span>${cfg.icon}</span>
        <span>${cfg.label}</span>
        ${
          cfg.id !== "custom"
            ? `<span style="background: ${isSelected ? "rgba(255,255,255,0.25)" : "#F1F5F9"}; color: ${isSelected ? "#FFFFFF" : "#475569"}; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 8px;">
                ${count}
              </span>`
            : `<span style="font-size: 10px;">${isSelected ? "▲" : "▼"}</span>`
        }
      `;

      btn.onclick = () => {
        if (cfg.id === "custom") {
          initCustomDatesIfEmpty();
          dateFilterPreset = "custom";
        } else {
          dateFilterPreset = cfg.id;
        }
        render();
      };

      presetButtonsRow.appendChild(btn);
    });

    dateRangeContainer.appendChild(presetButtonsRow);

    // Custom Date Range Inputs Box (if custom is selected)
    if (dateFilterPreset === "custom") {
      initCustomDatesIfEmpty();

      const customRangeBox = document.createElement("div");
      customRangeBox.style.cssText = `
        background: #F8FAFC;
        border: 1px solid #CBD5E1;
        border-radius: 10px;
        padding: 12px 14px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      `;

      customRangeBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 12px; font-weight: 700; color: #475569;">📅 Dari Tanggal:</span>
          <input type="date" id="cs-filter-start-date" value="${customStartDate}" style="padding: 6px 10px; border-radius: 6px; border: 1px solid #CBD5E1; font-size: 12px; font-family: inherit; color: #1E293B; background: #FFFFFF;" />
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 12px; font-weight: 700; color: #475569;">Sampai:</span>
          <input type="date" id="cs-filter-end-date" value="${customEndDate}" style="padding: 6px 10px; border-radius: 6px; border: 1px solid #CBD5E1; font-size: 12px; font-family: inherit; color: #1E293B; background: #FFFFFF;" />
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button type="button" id="cs-btn-apply-custom-date" style="padding: 6px 14px; font-size: 12px; font-weight: 800; background: #0284C7; color: #FFFFFF; border: none; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(2,132,199,0.3);">
            <span>✓</span> Terapkan Filter
          </button>
          <button type="button" id="cs-btn-reset-custom-date" style="padding: 6px 10px; font-size: 11.5px; font-weight: 600; background: #FFFFFF; color: #64748B; border: 1px solid #CBD5E1; border-radius: 6px; cursor: pointer;">
            Reset Tanggal
          </button>
        </div>
        <div style="font-size: 11px; color: #64748B; margin-left: auto;">
          💡 Menampilkan Work Order yang diterima dalam rentang tanggal di atas
        </div>
      `;

      const applyBtn = customRangeBox.querySelector("#cs-btn-apply-custom-date") as HTMLButtonElement;
      const resetBtn = customRangeBox.querySelector("#cs-btn-reset-custom-date") as HTMLButtonElement;
      const sInp = customRangeBox.querySelector("#cs-filter-start-date") as HTMLInputElement;
      const eInp = customRangeBox.querySelector("#cs-filter-end-date") as HTMLInputElement;

      if (applyBtn) {
        applyBtn.onclick = () => {
          if (sInp && eInp) {
            customStartDate = sInp.value;
            customEndDate = eInp.value;
            dateFilterPreset = "custom";
            render();
          }
        };
      }

      if (resetBtn) {
        resetBtn.onclick = () => {
          dateFilterPreset = "all";
          customStartDate = "";
          customEndDate = "";
          render();
        };
      }

      dateRangeContainer.appendChild(customRangeBox);
    }

    wrapper.appendChild(dateRangeContainer);

    // Stats Bar
    if (isViewItemVisible("customer_service", "cs_stats_cards")) {
      const statsRow = document.createElement("div");
      statsRow.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;";

      const isFilteredByDate = dateFilterPreset !== "all";
      const statsData = [
        {
          label: isFilteredByDate ? `Komplain (${getActiveTimelineLabel()})` : "Total Komplain Masuk",
          count: activeDateCount,
          subtext: isFilteredByDate ? `dari ${totalTickets} total riwayat` : "seluruh periode",
          icon: "📥",
          color: "#0284C7",
          bg: "#EFF6FF",
        },
        { label: "Ke Minor Repair", count: mrCount, icon: "🛠️", color: "#D97706", bg: "#FFFBEB" },
        { label: "Ke Sales Support", count: ossCount, icon: "💼", color: "#059669", bg: "#ECFDF5" },
        { label: "Ke Key Account (Industri)", count: tkaCount, icon: "🏢", color: "#7C3AED", bg: "#F5F3FF" },
        { label: "Ke Tech Support (Lab)", count: tsCount, icon: "🔬", color: "#DC2626", bg: "#FEF2F2" },
        { label: "Selesai (BAST Selesai)", count: resolvedCount, icon: "✅", color: "#10B981", bg: "#ECFDF5" },
      ];

      statsData.forEach((st) => {
        const card = document.createElement("div");
        card.style.cssText = `
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        `;
        card.innerHTML = `
          <div style="width: 40px; height: 40px; border-radius: 10px; background: ${st.bg}; color: ${st.color}; display: flex; align-items: center; justify-content: center; font-size: 20px;">
            ${st.icon}
          </div>
          <div>
            <div style="font-size: 11px; font-weight: 700; color: #64748B;">${st.label}</div>
            <div style="font-size: 20px; font-weight: 900; color: #0F172A;">${st.count}</div>
          </div>
        `;
        statsRow.appendChild(card);
      });

      wrapper.appendChild(statsRow);
    }

    // Top Gateway Action Bar
    if (isViewItemVisible("customer_service", "cs_gateway_banner")) {
      const actionBar = document.createElement("div");
      actionBar.style.cssText = `
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 14px;
        padding: 14px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.03);
      `;

      const actionLeft = document.createElement("div");
      actionLeft.innerHTML = `
        <div style="font-size: 11px; font-weight: 800; color: #0284C7; text-transform: uppercase; letter-spacing: 0.5px;">
          🌟 GERBANG AWAL PENERIMA KOMPLAIN
        </div>
        <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-top: 2px;">
          Penerimaan Pengaduan Pelanggan & Distribusi Lintas Divisi (Stand-alone CCnB Engine)
        </div>
      `;

      const actionBtnGroup = document.createElement("div");
      actionBtnGroup.style.cssText = "display: flex; align-items: center; gap: 8px;";

      // Tombol Master Data Pelanggan (Pengganti CCnB)
      const masterBtn = document.createElement("button");
      masterBtn.type = "button";
      masterBtn.style.cssText = `
        background: #F8FAFC;
        color: #1E293B;
        border: 1px solid #CBD5E1;
        border-radius: 10px;
        padding: 9px 15px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      `;
      masterBtn.innerHTML = `<span>👥</span> <span>Database Pelanggan (${getAllCustomers().length})</span>`;
      masterBtn.onclick = () => {
        isMasterModalOpen = true;
        render();
      };
      actionBtnGroup.appendChild(masterBtn);

      const createBtn = document.createElement("button");
      createBtn.type = "button";
      createBtn.style.cssText = `
        background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%);
        color: #FFFFFF;
        border: none;
        border-radius: 10px;
        padding: 10px 18px;
        font-size: 12.5px;
        font-weight: 800;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 3px 10px rgba(2,132,199,0.3);
      `;
      createBtn.innerHTML = `<span>➕</span> <span>${formOpen ? "Tutup Form Input" : "Terima Komplain Baru"}</span>`;
      createBtn.onclick = () => {
        formOpen = !formOpen;
        render();
      };

      actionBtnGroup.appendChild(createBtn);

      actionBar.appendChild(actionLeft);
      actionBar.appendChild(actionBtnGroup);
      wrapper.appendChild(actionBar);
    }

    // Form Input Work Order / Komplain Baru (Sesuai Gambar 1 & Gambar 2)
    if (formOpen && isViewItemVisible("customer_service", "cs_intake_form")) {
      const formCard = document.createElement("div");
      formCard.className = "bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-sm mb-4";
      formCard.style.cssText = "box-shadow: 0 1px 4px rgba(0,0,0,0.06);";

      formCard.innerHTML = `
        <!-- Form Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 flex-wrap gap-2">
          <div>
            <h2 class="text-base font-bold text-slate-800 flex items-center gap-2 m-0">
              <span class="text-lg text-blue-600 font-bold">+</span> Tambah Work Order / Input Komplain Baru
            </h2>
            <div class="text-[11px] text-slate-500 mt-0.5">
              Sistem Pengganti CCnB: Cukup cari nama/No. Sambungan, data langsung terisi otomatis.
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" id="btn-open-master-modal-shortcut" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer">
              <span>👥</span> Master Pelanggan
            </button>
            <button type="button" id="btn-quick-sample-data" class="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 border border-sky-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs">
              <span>⚡</span> Isi Contoh Data Cepat
            </button>
          </div>
        </div>

        <!-- CCnB Replacement Smart Customer Lookup Bar -->
        <div class="mb-5 p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 border border-blue-200 rounded-xl relative">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <span>🔍</span> Cari Cepat Master Pelanggan Aetra (Auto-Fill CCnB)
            </label>
            ${
              selectedMasterCustomer
                ? `<span class="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                    <span>✓</span> Terhubung: ${selectedMasterCustomer.name} (${selectedMasterCustomer.connectionNo})
                  </span>`
                : `<span class="text-[10.5px] text-slate-500 font-medium">Ketik No. Sambungan / No. Meter / Nama / HP</span>`
            }
          </div>
          <div class="relative">
            <input 
              type="text" 
              id="cs-master-search-input" 
              placeholder="Contoh: ketik '001482910' atau 'Bambang' atau '88291' atau '0812'..."
              value="${masterSearchQuery}"
              class="w-full px-3.5 py-2.5 bg-white border border-blue-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div id="cs-master-search-dropdown" class="hidden absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
            </div>
          </div>
          ${
            selectedMasterCustomer
              ? `
              <div class="mt-2.5 pt-2 border-t border-blue-200/60 flex items-center justify-between text-[11px] text-blue-800 flex-wrap gap-2">
                <div>
                  <b>Tarif:</b> ${selectedMasterCustomer.tariffGroup} | <b>Ukuran Meter:</b> ${selectedMasterCustomer.meterSize} | <b>Status Sambungan:</b> <span class="text-emerald-700 font-bold">${selectedMasterCustomer.status}</span>
                </div>
                <button type="button" id="btn-clear-selected-master" class="text-red-600 hover:text-red-700 font-bold underline cursor-pointer text-[10.5px]">
                  Ganti / Lepas Pelanggan
                </button>
              </div>
              `
              : ""
          }
        </div>

        <!-- Form Fields Grid -->
        <div class="space-y-4 text-xs">
          <!-- BARIS 1: 4 Kolom (Case ID, Nama Pelanggan, No WhatsApp, ID Meter) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Kolom 1: Case ID (Kode Unik Kasus) * -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-xs font-semibold text-slate-700">Case ID (Standar CCnB) *</label>
                <button type="button" id="btn-refresh-case-id" class="px-2 py-0.5 text-[10.5px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 flex items-center gap-1 transition cursor-pointer">
                  <span>🔄</span> Acak Baru
                </button>
              </div>
              <input type="text" id="cs-case-id" value="${newCaseId}" class="w-full px-3 py-2 bg-indigo-50/70 border border-indigo-200 rounded-lg text-indigo-700 font-bold font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <div class="text-[10px] text-slate-400 mt-1 leading-tight">
                Nomor Case 10-digit resmi terstandarisasi.
              </div>
            </div>

            <!-- Kolom 2: Nama Pelanggan * -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Nama Pelanggan *</label>
              <input type="text" id="cs-customer" placeholder="Nama Pelanggan" value="${newCustomer}" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>

            <!-- Kolom 3: No WhatsApp -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">No WhatsApp</label>
              <input type="text" id="cs-phone" placeholder="No WA (08xxxxxxxxxx)" value="${newPhone}" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>

            <!-- Kolom 4: ID Meter / No Sambungan -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">ID Meter / No. Sambungan</label>
              <input type="text" id="cs-meter" placeholder="No. Sambungan atau ID Meter" value="${newMeterId}" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>

          <!-- BARIS 2: 2 Kolom (Alamat Lengkap & Area / Kecamatan) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
              <input type="text" id="cs-address" placeholder="Alamat Lengkap" value="${newAddress}" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Area / Kecamatan</label>
              <select id="cs-area" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                ${AREAS.map((a) => `<option value="${a}" ${newArea === a ? "selected" : ""}>${a}</option>`).join("")}
              </select>
            </div>
          </div>

          <!-- BARIS 3: 3 Kolom (CASE Keluhan, Saluran Komplain, Waktu Diterima) -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <!-- Kolom 1: CASE Keluhan -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-semibold text-slate-700">CASE Keluhan (Pilih Jenis Case) *</label>
                <span id="cs-routing-badge" class="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  Rekomendasi: ${DIVISIONS[newTargetDivision].name}
                </span>
              </div>
              <select id="cs-category" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium">
                ${AETRA_CASE_CATEGORIES.map(
                  (c) => `<option value="${c.key}" ${newCategory === c.key ? "selected" : ""}>[${c.key}] ${c.name}</option>`
                ).join("")}
              </select>
            </div>

            <!-- Kolom 2: Saluran Komplain (Darimana Komplain Disampaikan) -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-semibold text-slate-700">Saluran Komplain (Darimana Disampaikan) *</label>
                <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200" id="cs-channel-label-preview">
                  ${newChannel}
                </span>
              </div>
              <select id="cs-channel" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <option value="WhatsApp CS" ${newChannel === "WhatsApp CS" ? "selected" : ""}>💬 WhatsApp (WA)</option>
                <option value="Phone" ${newChannel === "Phone" || newChannel === "Telepon / Phone" ? "selected" : ""}>📞 Phone (Telepon Kantor)</option>
                <option value="Email" ${newChannel === "Email" ? "selected" : ""}>✉️ Email Layanan Pelanggan</option>
                <option value="Walk In" ${newChannel === "Walk In" || newChannel === "Loket Kantor" ? "selected" : ""}>🏢 Walk In (Datang Langsung / Loket)</option>
                <option value="Contact Center" ${newChannel === "Contact Center" || newChannel === "Call Center 24 Jam" ? "selected" : ""}>🎧 Contact Center (Call Center 24 Jam)</option>
                <option value="Mobile App" ${newChannel === "Mobile App" ? "selected" : ""}>📱 Mobile App AETRA</option>
                <option value="Media Sosial" ${newChannel === "Media Sosial" ? "selected" : ""}>🌐 Media Sosial</option>
              </select>
              <!-- Shortcut Cepat Pilihan Saluran -->
              <div class="flex items-center gap-1 mt-1.5 flex-wrap">
                <button type="button" class="btn-channel-chip px-2 py-0.5 text-[10px] font-bold rounded border transition cursor-pointer ${newChannel === 'WhatsApp CS' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}" data-channel="WhatsApp CS">
                  💬 WA
                </button>
                <button type="button" class="btn-channel-chip px-2 py-0.5 text-[10px] font-bold rounded border transition cursor-pointer ${newChannel === 'Phone' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}" data-channel="Phone">
                  📞 Phone
                </button>
                <button type="button" class="btn-channel-chip px-2 py-0.5 text-[10px] font-bold rounded border transition cursor-pointer ${newChannel === 'Email' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}" data-channel="Email">
                  ✉️ Email
                </button>
                <button type="button" class="btn-channel-chip px-2 py-0.5 text-[10px] font-bold rounded border transition cursor-pointer ${newChannel === 'Walk In' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}" data-channel="Walk In">
                  🏢 Walk In
                </button>
                <button type="button" class="btn-channel-chip px-2 py-0.5 text-[10px] font-bold rounded border transition cursor-pointer ${newChannel === 'Contact Center' ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}" data-channel="Contact Center">
                  🎧 Contact Center
                </button>
              </div>
            </div>

            <!-- Kolom 3: Waktu Diterima -->
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Waktu Diterima *</label>
              <div class="relative">
                <input type="datetime-local" id="cs-received-at" value="${newReceivedAt}" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
              </div>
              <div class="text-[10px] text-slate-400 mt-1">
                Waktu pelanggan menyampaikan laporan ke CS
              </div>
            </div>
          </div>

          <!-- BARIS 4: 2 Kolom (Deskripsi Keluhan & Koordinat GPS) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Keluhan</label>
              <textarea id="cs-desc" rows="3" placeholder="Detail komplain..." class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">${newDesc}</textarea>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Koordinat GPS</label>
              <input type="text" id="cs-coords" placeholder="-6.1783, 106.6319 (opsional)" value="${newCoords}" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>

          <!-- BARIS 5: Checkbox Prioritas Utama -->
          <div class="pt-1">
            <label class="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800 select-none">
              <input type="checkbox" id="cs-urgent" ${newUrgent ? "checked" : ""} class="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500" />
              <span>Tandai mendesak (Prioritas Utama)</span>
            </label>
          </div>

          <!-- BARIS 6: Tombol Simpan Komplain & Batal -->
          <div class="flex items-center gap-2 pt-2">
            <button type="button" id="btn-submit-complaint" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5">
              <span>Simpan & Terbitkan Kasus</span>
            </button>
            <button type="button" id="btn-cancel-complaint" class="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer">
              Batal
            </button>
          </div>
        </div>
      `;

      wrapper.appendChild(formCard);

      // Event Listeners for the intake form
      setTimeout(() => {
        // Master Search Auto-Complete Handler
        const masterSearchInput = document.getElementById("cs-master-search-input") as HTMLInputElement;
        const masterDropdown = document.getElementById("cs-master-search-dropdown") as HTMLDivElement;
        const clearMasterBtn = document.getElementById("btn-clear-selected-master") as HTMLButtonElement;
        const openMasterShortcutBtn = document.getElementById("btn-open-master-modal-shortcut") as HTMLButtonElement;

        if (openMasterShortcutBtn) {
          openMasterShortcutBtn.onclick = () => {
            isMasterModalOpen = true;
            render();
          };
        }

        if (clearMasterBtn) {
          clearMasterBtn.onclick = () => {
            selectedMasterCustomer = null;
            render();
          };
        }

        let searchDebounce: any = null;
        if (masterSearchInput && masterDropdown) {
          masterSearchInput.oninput = (e: any) => {
            const val = e.target.value;
            masterSearchQuery = val;
            if (searchDebounce) clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
              if (!val.trim()) {
                masterDropdown.classList.add("hidden");
                masterDropdown.innerHTML = "";
                return;
              }
              const results = searchCustomers(val);
              if (results.length === 0) {
                masterDropdown.innerHTML = `
                  <div class="p-3 text-xs text-slate-500 text-center">
                    Tidak ditemukan pelanggan dengan kata kunci "<b>${val}</b>".<br/>
                    <button type="button" id="btn-add-quick-master" class="mt-2 px-3 py-1 bg-blue-50 text-blue-700 font-bold border border-blue-200 rounded text-[11px] hover:bg-blue-100 cursor-pointer">
                      ➕ Tambah "${val}" sebagai Pelanggan Baru
                    </button>
                  </div>
                `;
                masterDropdown.classList.remove("hidden");
                const addQuickBtn = document.getElementById("btn-add-quick-master");
                if (addQuickBtn) {
                  addQuickBtn.onclick = () => {
                    newCustomer = val;
                    masterDropdown.classList.add("hidden");
                    const custEl = document.getElementById("cs-customer") as HTMLInputElement;
                    if (custEl) custEl.value = val;
                  };
                }
                return;
              }

              masterDropdown.innerHTML = results
                .map(
                  (c) => `
                <div class="master-search-item p-3 hover:bg-blue-50/80 cursor-pointer transition flex items-center justify-between gap-3 text-xs" data-cust-id="${c.id}">
                  <div>
                    <div class="font-bold text-slate-800 flex items-center gap-1.5">
                      <span>👤 ${c.name}</span>
                      <span class="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-mono font-bold">No. Samb: ${c.connectionNo}</span>
                      <span class="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">Meter: ${c.meterId}</span>
                    </div>
                    <div class="text-[11px] text-slate-600 mt-0.5">
                      📍 ${c.address} (${c.area}) | 📞 ${c.phone}
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <span class="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded">
                      ${c.tariffGroup.split("-")[0].trim()}
                    </span>
                    <div class="text-[10px] text-blue-600 font-bold mt-1">⚡ Klik Pilih</div>
                  </div>
                </div>
              `
                )
                .join("");

              masterDropdown.classList.remove("hidden");

              const items = masterDropdown.querySelectorAll(".master-search-item");
              items.forEach((item) => {
                item.addEventListener("click", () => {
                  const custId = item.getAttribute("data-cust-id");
                  const matched = results.find((r) => r.id === custId);
                  if (matched) {
                    selectMasterCustomer(matched);
                  }
                  masterDropdown.classList.add("hidden");
                });
              });
            }, 100);
          };

          // Hide dropdown on outside click
          document.addEventListener("click", (e) => {
            if (!masterSearchInput.contains(e.target as Node) && !masterDropdown.contains(e.target as Node)) {
              masterDropdown.classList.add("hidden");
            }
          });
        }

        const quickDataBtn = document.getElementById("btn-quick-sample-data") as HTMLButtonElement;
        if (quickDataBtn) {
          quickDataBtn.onclick = () => fillQuickSampleData();
        }

        const refreshCaseIdBtn = document.getElementById("btn-refresh-case-id") as HTMLButtonElement;
        if (refreshCaseIdBtn) {
          refreshCaseIdBtn.onclick = () => {
            newCaseId = generateRandom10DigitCaseId();
            const caseIdInput = document.getElementById("cs-case-id") as HTMLInputElement;
            if (caseIdInput) caseIdInput.value = newCaseId;
          };
        }

        const catSelect = document.getElementById("cs-category") as HTMLSelectElement;
        if (catSelect) {
          catSelect.onchange = (e: any) => {
            const val = e.target.value;
            newCategory = val;
            newTargetDivision = getRecommendedDivision(val);
            const badge = document.getElementById("cs-routing-badge");
            if (badge) {
              badge.innerText = `Rekomendasi: ${DIVISIONS[newTargetDivision].name}`;
            }
          };
        }

        const channelSelect = document.getElementById("cs-channel") as HTMLSelectElement;
        const channelChips = formCard.querySelectorAll(".btn-channel-chip") as NodeListOf<HTMLButtonElement>;
        const channelPreview = document.getElementById("cs-channel-label-preview");

        const updateChannelUI = (val: string) => {
          newChannel = val;
          if (channelSelect) channelSelect.value = val;
          if (channelPreview) {
            const icon = val.includes("WhatsApp") ? "💬" : val.includes("Phone") ? "📞" : val.includes("Email") ? "✉️" : val.includes("Walk") ? "🏢" : val.includes("Contact") ? "🎧" : "📥";
            channelPreview.innerText = `${icon} ${val}`;
          }
          channelChips.forEach((chip) => {
            const cVal = chip.getAttribute("data-channel");
            if (cVal === val) {
              chip.className = "btn-channel-chip px-2 py-0.5 text-[10px] font-bold rounded border transition cursor-pointer bg-sky-100 text-sky-800 border-sky-300 shadow-xs";
            } else {
              chip.className = "btn-channel-chip px-2 py-0.5 text-[10px] font-bold rounded border transition cursor-pointer bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100";
            }
          });
        };

        if (channelSelect) {
          channelSelect.onchange = (e: any) => {
            updateChannelUI(e.target.value);
          };
        }

        channelChips.forEach((chip) => {
          chip.onclick = (e) => {
            e.preventDefault();
            const ch = chip.getAttribute("data-channel");
            if (ch) updateChannelUI(ch);
          };
        });

        const submitBtn = document.getElementById("btn-submit-complaint") as HTMLButtonElement;
        if (submitBtn) {
          submitBtn.onclick = () => submitNewComplaint();
        }

        const cancelBtn = document.getElementById("btn-cancel-complaint") as HTMLButtonElement;
        if (cancelBtn) {
          cancelBtn.onclick = () => {
            formOpen = false;
            render();
          };
        }
      }, 0);
    }

    // Monitoring Table Filters
    // Filter Bar & Search
    if (isViewItemVisible("customer_service", "cs_filter_tabs")) {
      const filterRow = document.createElement("div");
      filterRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;";

      const tabGroup = document.createElement("div");
      tabGroup.style.cssText = "display: flex; gap: 4px; background: #FFFFFF; padding: 4px; border-radius: 10px; border: 1px solid #E2E8F0; overflow-x: auto;";

      const filterTabs: { id: typeof filterDivision; label: string; count: number }[] = [
        { id: "all", label: "Semua Komplain", count: activeDateCount },
        { id: "minor_repair", label: "🛠️ Minor Repair", count: mrCount },
        { id: "sales_support", label: "💼 Sales Support", count: ossCount },
        { id: "key_account", label: "🏢 Key Account", count: tkaCount },
        { id: "technical_support", label: "🔬 Tech Support", count: tsCount },
        { id: "selesai", label: "✅ Selesai Ditangani", count: resolvedCount },
      ];

      filterTabs.forEach((tab) => {
        const btn = document.createElement("button");
        btn.type = "button";
        const isActive = filterDivision === tab.id;
        btn.style.cssText = `
          padding: 6px 12px;
          font-size: 11.5px;
          font-weight: 700;
          border-radius: 8px;
          border: none;
          background: ${isActive ? "#0284C7" : "transparent"};
          color: ${isActive ? "#FFFFFF" : "#64748B"};
          cursor: pointer;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        `;
        btn.innerHTML = `<span>${tab.label}</span> <span style="background: ${isActive ? "rgba(255,255,255,0.25)" : "#F1F5F9"}; padding: 1px 6px; border-radius: 10px; font-size: 10.5px;">${tab.count}</span>`;
        btn.onclick = () => {
          filterDivision = tab.id;
          render();
        };
        tabGroup.appendChild(btn);
      });

      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "🔍 Cari No WO, Pelanggan, Alamat, ID Meter...";
      searchInput.value = searchQuery;
      searchInput.style.cssText = "padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; width: 280px;";
      searchInput.oninput = (e: any) => {
        searchQuery = e.target.value;
        render();
      };

      filterRow.appendChild(tabGroup);
      filterRow.appendChild(searchInput);
      wrapper.appendChild(filterRow);
    }

    // Filter tickets based on timeline first, then division and search query
    let filtered = dateFilteredTickets;
    if (filterDivision === "selesai") {
      filtered = filtered.filter((t) => t.status === "selesai");
    } else if (filterDivision !== "all") {
      filtered = filtered.filter((t) => t.targetDivision === filterDivision);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          (t.caseId && t.caseId.toLowerCase().includes(q)) ||
          t.customer.toLowerCase().includes(q) ||
          t.meterId.toLowerCase().includes(q) ||
          t.address.toLowerCase().includes(q) ||
          t.area.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.intakeChannel && t.intakeChannel.toLowerCase().includes(q))
      );
    }

    // Tickets Table Card
    const tableCard = document.createElement("div");
    tableCard.style.cssText = "background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.03);";

    if (filtered.length === 0) {
      tableCard.innerHTML = `
        <div style="text-align: center; padding: 48px 20px; color: #94A3B8;">
          <div style="font-size: 38px; margin-bottom: 8px;">🗓️</div>
          <div style="font-size: 14px; font-weight: 800; color: #1E293B;">Tidak Ada Komplain Pada Periode Ini</div>
          <div style="font-size: 12px; color: #64748B; margin-top: 4px; max-width: 440px; margin-left: auto; margin-right: auto; line-height: 1.45;">
            Tidak ditemukan Work Order pada periode <b>${getActiveTimelineLabel()}</b>${filterDivision !== "all" ? ` untuk divisi terpilih` : ""}${searchQuery ? ` dengan pencarian "${searchQuery}"` : ""}.
          </div>
          ${
            dateFilterPreset !== "all"
              ? `<button type="button" class="btn-reset-timeline-empty" style="margin-top: 14px; padding: 7px 16px; background: #0284C7; color: #FFFFFF; font-weight: 800; font-size: 11.5px; border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(2,132,199,0.3);">
                  <span>🔄</span> Tampilkan Semua Waktu Laporan
                </button>`
              : ""
          }
        </div>
      `;
      const resetBtnEmpty = tableCard.querySelector(".btn-reset-timeline-empty") as HTMLButtonElement;
      if (resetBtnEmpty) {
        resetBtnEmpty.onclick = () => {
          dateFilterPreset = "all";
          customStartDate = "";
          customEndDate = "";
          render();
        };
      }
    } else {
      const table = document.createElement("table");
      table.style.cssText = "width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;";

      table.innerHTML = `
        <thead>
          <tr style="background: #F8FAFC; border-bottom: 1.5px solid #E2E8F0; color: #475569; font-size: 11px; text-transform: uppercase;">
            <th style="padding: 10px 14px;">No. WO / Case ID & Tanggal</th>
            <th style="padding: 10px 14px;">Pelanggan & Lokasi</th>
            <th style="padding: 10px 14px;">Kategori & Keluhan</th>
            <th style="padding: 10px 14px;">Divisi Tujuan (Distribusi)</th>
            <th style="padding: 10px 14px;">Status Penanganan</th>
            <th style="padding: 10px 14px; text-align: right;">Aksi Customer Service</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector("tbody")!;

      filtered.forEach((t) => {
        const tr = document.createElement("tr");
        tr.style.cssText = "border-bottom: 1px solid #F1F5F9; transition: background 0.15s ease;";
        tr.onmouseenter = () => (tr.style.background = "#F8FAFC");
        tr.onmouseleave = () => (tr.style.background = "transparent");

        const divMeta = DIVISIONS[t.targetDivision] || DIVISIONS.minor_repair;
        const chBadge = getChannelBadge(t.intakeChannel);

        const isDone = t.status === "selesai";
        const isProses = t.status === "proses";

        tr.innerHTML = `
          <td style="padding: 12px 14px; vertical-align: top;">
            <div style="font-weight: 800; color: #0284C7; font-family: monospace;">${t.id}</div>
            <div style="font-size: 10px; color: #64748B; font-family: monospace;">#${t.caseId || t.id}</div>
            <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-top: 3px;">
              <span style="font-size: 9.5px; background: ${chBadge.bg}; color: ${chBadge.color}; border: 1px solid ${chBadge.border}; padding: 1px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;" title="Saluran Pengaduan: ${t.intakeChannel || 'WhatsApp CS'}">
                <span>${chBadge.icon}</span>
                <span>${chBadge.label}</span>
              </span>
              <span style="font-size: 9.5px; background: #F1F5F9; color: #475569; padding: 1px 5px; border-radius: 4px; border: 1px solid #E2E8F0; font-family: monospace;" title="Waktu Laporan Diterima">
                📅 ${formatTicketDateTime(t.receivedAt)}
              </span>
            </div>
          </td>
          <td style="padding: 12px 14px; vertical-align: top;">
            <div style="font-weight: 800; color: #0F172A;">${t.customer}</div>
            <div style="font-size: 10.5px; color: #64748B; font-family: monospace;">MTR: ${t.meterId}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">📍 ${t.address} (${t.area})</div>
          </td>
          <td style="padding: 12px 14px; vertical-align: top; max-width: 260px;">
            <span style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #0F172A; font-weight: 800; font-size: 10.5px; padding: 2px 6px; border-radius: 6px;">
              ${t.category}
            </span>
            <div style="font-size: 11px; color: #475569; margin-top: 3px; line-height: 1.35;">
              "${t.desc || "-"}"
            </div>
          </td>
          <td style="padding: 12px 14px; vertical-align: top;">
            <div style="display: inline-flex; align-items: center; gap: 5px; background: ${divMeta.badgeBg}; color: ${divMeta.badgeColor}; border: 1px solid ${divMeta.borderColor}; padding: 3px 8px; border-radius: 8px; font-weight: 800; font-size: 11px;">
              <span>${divMeta.icon}</span>
              <span>${divMeta.shortName}</span>
            </div>
            ${
              t.distributionNotes
                ? `<div style="font-size: 10.5px; color: #64748B; margin-top: 4px; font-style: italic;">
                    "${t.distributionNotes}"
                  </div>`
                : ""
            }
          </td>
          <td style="padding: 12px 14px; vertical-align: top;">
            <span style="font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 12px; display: inline-block; ${
              isDone
                ? "background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0;"
                : isProses
                ? "background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;"
                : "background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA;"
            }">
              ${isDone ? "✅ SELESAI" : isProses ? "⚙️ SEDANG DIKERJAKAN" : "⏳ BARU / MENUNGGU"}
            </span>
            <div style="font-size: 10.5px; color: #64748B; margin-top: 4px;">
              ${t.officer ? `👷 ${t.officer}` : t.divisionAssignee ? `👤 ${t.divisionAssignee}` : "Menunggu penugasan PIC"}
            </div>
          </td>
          <td style="padding: 12px 14px; vertical-align: top; text-align: right;">
            <div style="display: flex; justify-content: flex-end; gap: 6px; flex-wrap: wrap;">
              <button class="btn-cs-comments" style="padding: 5px 8px; font-size: 11px; font-weight: 700; background: #F8FAFC; border: 1px solid #CBD5E1; color: #1E293B; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                💬 Feed ${t.comments && t.comments.length > 0 ? `<span style="background:#0284C7; color:#FFF; font-size:9.5px; font-weight:800; padding:1px 5px; border-radius:8px;">${t.comments.length}</span>` : ""}
              </button>
              <button class="btn-cs-wa" style="padding: 5px 9px; font-size: 11px; font-weight: 700; background: #25D366; color: #FFF; border: none; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                💬 Update WA
              </button>
              <button class="btn-cs-redist" style="padding: 5px 9px; font-size: 11px; font-weight: 700; background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; border-radius: 6px; cursor: pointer;">
                ⚡ Alihkan Divisi
              </button>
              ${
                isDone
                  ? `<button class="btn-cs-report" style="padding: 5px 10px; font-size: 11px; font-weight: 800; background: linear-gradient(135deg, #0284C7, #0369A1); color: #FFF; border: none; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 5px rgba(2,132,199,0.25);">
                      📄 BAST PDF & Drive
                    </button>`
                  : ""
              }
            </div>
          </td>
        `;

        // Event bindings
        const cmtBtn = tr.querySelector(".btn-cs-comments") as HTMLButtonElement;
        if (cmtBtn) cmtBtn.onclick = () => openCommentsModal(t);

        const waBtn = tr.querySelector(".btn-cs-wa") as HTMLButtonElement;
        if (waBtn) waBtn.onclick = () => sendWhatsAppUpdateToCustomer(t);

        const redistBtn = tr.querySelector(".btn-cs-redist") as HTMLButtonElement;
        if (redistBtn) redistBtn.onclick = () => openRedistributeModal(t);

        const reportBtn = tr.querySelector(".btn-cs-report") as HTMLButtonElement;
        if (reportBtn) {
          reportBtn.onclick = () => {
            openReportPreviewModal({
              item: t as any,
              onUpdateItem: (upd) => {
                saveSingleTicket(upd as any);
                refreshData();
              },
            });
          };
        }

        tbody.appendChild(tr);
      });

      tableCard.appendChild(table);
    }

    if (isViewItemVisible("customer_service", "cs_table_tickets")) {
      wrapper.appendChild(tableCard);
    }

    // Modal Database Master Pelanggan (Pengganti CCnB)
    if (isMasterModalOpen) {
      const modalOverlay = document.createElement("div");
      modalOverlay.style.cssText = "position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px;";

      const allCusts = getAllCustomers();
      const filteredCusts = masterFilterQuery.trim()
        ? allCusts.filter(
            (c) =>
              c.connectionNo.toLowerCase().includes(masterFilterQuery.toLowerCase()) ||
              c.meterId.toLowerCase().includes(masterFilterQuery.toLowerCase()) ||
              c.name.toLowerCase().includes(masterFilterQuery.toLowerCase()) ||
              c.phone.toLowerCase().includes(masterFilterQuery.toLowerCase()) ||
              c.address.toLowerCase().includes(masterFilterQuery.toLowerCase()) ||
              c.area.toLowerCase().includes(masterFilterQuery.toLowerCase()) ||
              c.tariffGroup.toLowerCase().includes(masterFilterQuery.toLowerCase())
          )
        : allCusts;

      modalOverlay.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <!-- Modal Header -->
          <div class="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between shrink-0">
            <div>
              <div class="flex items-center gap-2.5">
                <span class="text-xl">👥</span>
                <h3 class="text-base font-bold m-0">Database Master Pelanggan AETRA</h3>
                <span class="bg-blue-600/80 text-white text-[10.5px] font-bold px-2 py-0.5 rounded-full">
                  Pengganti CCnB
                </span>
              </div>
              <p class="text-xs text-slate-300 mt-1 m-0">
                Penyimpanan terpusat profil pelanggan, nomor sambungan, nomor meter, tarif, dan lokasi GPS.
              </p>
            </div>
            <button type="button" id="btn-close-master-modal" class="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer text-sm">
              ✕
            </button>
          </div>

          <!-- Filter & Action Toolbar -->
          <div class="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-wrap shrink-0">
            <div class="flex items-center gap-2 flex-1 min-w-[280px]">
              <input 
                type="text" 
                id="master-modal-filter-input" 
                placeholder="Cari No Sambungan, No Meter, Nama, HP, Alamat..." 
                value="${masterFilterQuery}"
                class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
            <div class="flex items-center gap-2">
              <button type="button" id="btn-toggle-add-master" class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs">
                <span>➕</span> <span>${isAddingNewMasterCustomer ? "Tutup Form Tambah" : "Tambah Pelanggan"}</span>
              </button>
              <button type="button" id="btn-export-master-excel" class="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs">
                <span>📥</span> Ekspor Excel
              </button>
            </div>
          </div>

          <!-- Inline Add Form (if open) -->
          ${
            isAddingNewMasterCustomer
              ? `
              <div class="p-4 bg-blue-50/70 border-b border-blue-200 shrink-0 text-xs">
                <div class="font-bold text-blue-900 mb-3 flex items-center gap-1.5 text-sm">
                  <span>➕</span> Daftarkan Pelanggan Baru ke Master Database Aetra
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">No. Sambungan (ID Pelanggan) *</label>
                    <input type="text" id="add-cust-conn" placeholder="Contoh: 001482930" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs" />
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">No. Meter Seri *</label>
                    <input type="text" id="add-cust-meter" placeholder="Contoh: MTR-99812" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs" />
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                    <input type="text" id="add-cust-name" placeholder="Nama Pelanggan" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs" />
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">No. Telepon / WA *</label>
                    <input type="text" id="add-cust-phone" placeholder="08xxxxxxxxxx" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs" />
                  </div>
                  <div class="sm:col-span-2">
                    <label class="block font-semibold text-slate-700 mb-1">Alamat Lengkap *</label>
                    <input type="text" id="add-cust-addr" placeholder="Jl. Raya..." class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs" />
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Wilayah / Kecamatan</label>
                    <select id="add-cust-area" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs">
                      ${AREAS.map((a) => `<option value="${a}">${a}</option>`).join("")}
                    </select>
                  </div>
                  <div>
                    <label class="block font-semibold text-slate-700 mb-1">Golongan Tarif</label>
                    <select id="add-cust-tariff" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs">
                      <option value="2A2 - Rumah Tangga Menengah">2A2 - Rumah Tangga Menengah</option>
                      <option value="2A1 - Rumah Tangga Sederhana">2A1 - Rumah Tangga Sederhana</option>
                      <option value="3A - Niaga Kecil">3A - Niaga Kecil</option>
                      <option value="3B - Niaga Menengah / Hotel">3B - Niaga Menengah / Hotel</option>
                      <option value="4A - Industri Sedang">4A - Industri Sedang</option>
                      <option value="4B - Industri Besar">4B - Industri Besar</option>
                    </select>
                  </div>
                  <div class="sm:col-span-2">
                    <label class="block font-semibold text-slate-700 mb-1">Koordinat GPS (Opsional)</label>
                    <input type="text" id="add-cust-coords" placeholder="-6.2341, 106.5182" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs" />
                  </div>
                  <div class="sm:col-span-2 flex items-end">
                    <button type="button" id="btn-save-new-master-cust" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-sm w-full">
                      💾 Simpan ke Master Data Pelanggan
                    </button>
                  </div>
                </div>
              </div>
            `
              : ""
          }

          <!-- Customers Table Body -->
          <div class="flex-1 overflow-y-auto p-4">
            <div class="text-xs text-slate-500 mb-2.5 flex items-center justify-between font-semibold">
              <span>Menampilkan ${filteredCusts.length} dari ${allCusts.length} pelanggan terdaftar</span>
              <span class="text-emerald-700">● Database Siap Auto-Fill Komplain</span>
            </div>

            <div class="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th class="p-3">No. Sambungan & Meter</th>
                    <th class="p-3">Nama Pelanggan & Kontak</th>
                    <th class="p-3">Alamat & Wilayah</th>
                    <th class="p-3">Golongan Tarif</th>
                    <th class="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  ${
                    filteredCusts.length === 0
                      ? `
                    <tr>
                      <td colspan="5" class="p-6 text-center text-slate-400">
                        Tidak ada data pelanggan yang sesuai dengan pencarian "${masterFilterQuery}".
                      </td>
                    </tr>
                  `
                      : filteredCusts
                          .map(
                            (c) => `
                    <tr class="hover:bg-blue-50/50 transition">
                      <td class="p-3 font-mono">
                        <div class="font-bold text-blue-700">#${c.connectionNo}</div>
                        <div class="text-[10.5px] text-slate-500 font-medium">Meter: ${c.meterId} (${c.meterSize})</div>
                      </td>
                      <td class="p-3">
                        <div class="font-bold text-slate-800">${c.name}</div>
                        <div class="text-[10.5px] text-slate-500">📞 ${c.phone}</div>
                      </td>
                      <td class="p-3">
                        <div class="text-slate-700">${c.address}</div>
                        <div class="text-[10.5px] font-bold text-sky-700">📍 Wilayah ${c.area}</div>
                      </td>
                      <td class="p-3">
                        <span class="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded text-[10.5px] inline-block">
                          ${c.tariffGroup}
                        </span>
                        <div class="text-[10px] text-slate-400 mt-0.5">Status: <span class="text-emerald-600 font-semibold">${c.status}</span></div>
                      </td>
                      <td class="p-3 text-right">
                        <button type="button" class="btn-use-master-cust px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow-xs inline-flex items-center gap-1" data-cust-id="${c.id}">
                          <span>⚡</span> <span>Buat Kasus</span>
                        </button>
                      </td>
                    </tr>
                  `
                          )
                          .join("")
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs shrink-0">
            <span class="text-slate-500 text-[11px]">
              Tip: Klik <b>"Buat Kasus"</b> untuk langsung mengisi form komplain tanpa harus membuka CCnB.
            </span>
            <button type="button" id="btn-close-master-modal-bottom" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition cursor-pointer">
              Tutup
            </button>
          </div>
        </div>
      `;

      wrapper.appendChild(modalOverlay);

      // Modal Events
      setTimeout(() => {
        const closeBtn1 = document.getElementById("btn-close-master-modal");
        const closeBtn2 = document.getElementById("btn-close-master-modal-bottom");
        const toggleAddBtn = document.getElementById("btn-toggle-add-master");
        const filterInput = document.getElementById("master-modal-filter-input") as HTMLInputElement;
        const exportExcelBtn = document.getElementById("btn-export-master-excel");
        const saveNewCustBtn = document.getElementById("btn-save-new-master-cust");

        const closeMasterModal = () => {
          isMasterModalOpen = false;
          isAddingNewMasterCustomer = false;
          render();
        };

        if (closeBtn1) closeBtn1.onclick = closeMasterModal;
        if (closeBtn2) closeBtn2.onclick = closeMasterModal;

        if (toggleAddBtn) {
          toggleAddBtn.onclick = () => {
            isAddingNewMasterCustomer = !isAddingNewMasterCustomer;
            render();
          };
        }

        if (filterInput) {
          filterInput.oninput = (e: any) => {
            masterFilterQuery = e.target.value;
            render();
          };
        }

        if (exportExcelBtn) {
          exportExcelBtn.onclick = () => {
            // @ts-ignore
            if (window.XLSX) {
              const custs = getAllCustomers();
              // @ts-ignore
              const ws = window.XLSX.utils.json_to_sheet(custs);
              // @ts-ignore
              const wb = window.XLSX.utils.book_new();
              // @ts-ignore
              window.XLSX.utils.book_append_sheet(wb, ws, "MasterPelangganAetra");
              // @ts-ignore
              window.XLSX.writeFile(wb, `Master_Pelanggan_AETRA_${new Date().toISOString().slice(0, 10)}.xlsx`);
            } else {
              alert("Export berhasil dipersiapkan.");
            }
          };
        }

        if (saveNewCustBtn) {
          saveNewCustBtn.onclick = () => {
            const connEl = document.getElementById("add-cust-conn") as HTMLInputElement;
            const meterEl = document.getElementById("add-cust-meter") as HTMLInputElement;
            const nameEl = document.getElementById("add-cust-name") as HTMLInputElement;
            const phoneEl = document.getElementById("add-cust-phone") as HTMLInputElement;
            const addrEl = document.getElementById("add-cust-addr") as HTMLInputElement;
            const areaEl = document.getElementById("add-cust-area") as HTMLSelectElement;
            const tariffEl = document.getElementById("add-cust-tariff") as HTMLSelectElement;
            const coordsEl = document.getElementById("add-cust-coords") as HTMLInputElement;

            const nameVal = nameEl?.value.trim();
            const connVal = connEl?.value.trim() || `0014${Math.floor(10000 + Math.random() * 90000)}`;
            const meterVal = meterEl?.value.trim() || `MTR-${Math.floor(10000 + Math.random() * 90000)}`;
            const phoneVal = phoneEl?.value.trim() || "081298765432";
            const addrVal = addrEl?.value.trim() || `Area ${areaEl?.value || "Cikupa"}`;

            if (!nameVal) {
              alert("Nama pelanggan wajib diisi.");
              return;
            }

            const newCustRecord: AetraCustomerRecord = {
              id: `CUST-${Date.now()}`,
              connectionNo: connVal,
              meterId: meterVal,
              name: nameVal,
              phone: phoneVal,
              address: addrVal,
              area: areaEl?.value || "Cikupa",
              tariffGroup: tariffEl?.value || "2A2 - Rumah Tangga Menengah",
              meterSize: "1/2 inch",
              coords: coordsEl?.value.trim() || "-6.2341, 106.5182",
              status: "Aktif",
              registeredDate: new Date().toISOString().slice(0, 10),
            };

            saveCustomerRecord(newCustRecord);
            isAddingNewMasterCustomer = false;
            // @ts-ignore
            if (window.Swal) {
              // @ts-ignore
              window.Swal.fire({
                icon: "success",
                title: "Tersimpan",
                text: `Pelanggan ${nameVal} berhasil didaftarkan ke Master Database Aetra.`,
                confirmButtonColor: "#2563EB",
              });
            }
            render();
          };
        }

        const useBtns = modalOverlay.querySelectorAll(".btn-use-master-cust");
        useBtns.forEach((btn) => {
          btn.addEventListener("click", () => {
            const custId = btn.getAttribute("data-cust-id");
            const matched = allCusts.find((c) => c.id === custId);
            if (matched) {
              selectMasterCustomer(matched);
              formOpen = true;
              isMasterModalOpen = false;
              render();
            }
          });
        });
      }, 0);
    }

    container.appendChild(wrapper);
  }

  const onViewPrefChange = (e: any) => {
    if (!e.detail || e.detail.division === "customer_service" || e.detail.reset) {
      render();
    }
  };
  window.addEventListener("aetra:dashboard_view_preference_changed", onViewPrefChange);

  const onCsSwitchView = (e: any) => {
    if (e.detail?.view === "analytics" || e.detail?.view === "operational" || e.detail?.view === "moving_avg") {
      activeCsTab = e.detail.view;
      localStorage.setItem("aetra_cs_active_view", e.detail.view);
      render();
    }
  };
  window.addEventListener("aetra:cs_switch_view", onCsSwitchView);

  const onTicketsChanged = () => {
    tickets = loadAllUnifiedTickets();
    render();
  };
  window.addEventListener("aetra:tickets_changed", onTicketsChanged);
  window.addEventListener("aetra:dashboard_refresh_needed", onTicketsChanged);
  const onStorageChange = (e: StorageEvent) => {
    if (e.key === "aetra_work_orders_backup" || e.key === "aetra_latest_wo_notification_event") {
      onTicketsChanged();
    }
  };
  window.addEventListener("storage", onStorageChange);

  render();

  return () => {
    window.removeEventListener("aetra:dashboard_view_preference_changed", onViewPrefChange);
    window.removeEventListener("aetra:cs_switch_view", onCsSwitchView);
    window.removeEventListener("aetra:tickets_changed", onTicketsChanged);
    window.removeEventListener("aetra:dashboard_refresh_needed", onTicketsChanged);
    window.removeEventListener("storage", onStorageChange);
    container.innerHTML = "";
  };
}
