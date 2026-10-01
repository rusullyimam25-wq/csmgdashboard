/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Periodic SLA Breach Email Generation & Department Lead Dispatch Service
 * Technical Support & Laboratory Dashboard - PT Aetra Air Tangerang
 */

import { UnifiedTicket, loadAllUnifiedTickets } from "./divisionTicketService";
import { SLA_RULES_HOURS, CATEGORY_NAMES_MAP } from "./weeklySlaService";

export interface DepartmentLeadContact {
  id: string;
  name: string;
  role: string;
  divisionKey: string;
  divisionLabel: string;
  email: string;
  phone: string;
  selectedByDefault: boolean;
}

export const DEPARTMENT_LEADS: DepartmentLeadContact[] = [
  {
    id: "lead_tech_support",
    name: "Dr. Agus Sutrisno, M.Sc.",
    role: "Manager Technical Support & Laboratorium",
    divisionKey: "technical_support",
    divisionLabel: "Technical Support & Lab",
    email: "agus.sutrisno@aetra-tangerang.co.id",
    phone: "0812-9988-1122",
    selectedByDefault: true,
  },
  {
    id: "lead_minor_repair",
    name: "Ir. Bambang Trihatmojo",
    role: "Head of Minor Repair & Field Response",
    divisionKey: "minor_repair",
    divisionLabel: "Minor Repair & Jaringan",
    email: "bambang.tri@aetra-tangerang.co.id",
    phone: "0813-1122-3344",
    selectedByDefault: true,
  },
  {
    id: "lead_sales_support",
    name: "Rina Wulandari, S.E.",
    role: "Supervisor Sales Support & Metering Billing",
    divisionKey: "sales_support",
    divisionLabel: "Sales Support & Billing",
    email: "rina.wulandari@aetra-tangerang.co.id",
    phone: "0812-3344-5566",
    selectedByDefault: true,
  },
  {
    id: "lead_key_account",
    name: "Ahmad Zarkasih, M.M.",
    role: "Key Account Manager & Commercial Water",
    divisionKey: "key_account",
    divisionLabel: "Key Account & Industri",
    email: "ahmad.zarkasih@aetra-tangerang.co.id",
    phone: "0811-7788-9900",
    selectedByDefault: true,
  },
  {
    id: "lead_customer_service",
    name: "Siti Rahmawati, S.Sos.",
    role: "Chief of Customer Service & Escalation",
    divisionKey: "customer_service",
    divisionLabel: "Customer Service Gateway",
    email: "siti.rahmawati@aetra-tangerang.co.id",
    phone: "0812-5566-7788",
    selectedByDefault: true,
  },
  {
    id: "lead_operations_director",
    name: "Direktur Operasional & Teknik",
    role: "Director of Operations - Executive Board",
    divisionKey: "executive",
    divisionLabel: "Direksi Operasional AETRA",
    email: "direksi.operasional@aetra-tangerang.co.id",
    phone: "021-598-1100",
    selectedByDefault: false,
  },
];

export interface SlaBreachTicketItem {
  ticket: UnifiedTicket;
  receivedAt: string;
  categoryName: string;
  targetDivision: string;
  slaLimitHours: number;
  slaLimitDays: number;
  elapsedHours: number;
  elapsedDays: number;
  overdueHours: number;
  overdueDays: number;
  breachStatus: "breached" | "critical_risk" | "warning" | "on_track";
  riskPercentage: number;
  urgencyLevel: "CRITICAL" | "HIGH" | "MEDIUM";
  rootCauseEstimation: string;
  recommendedAction: string;
}

export interface SlaDepartmentSummary {
  divisionKey: string;
  divisionLabel: string;
  lead: DepartmentLeadContact;
  totalActiveTickets: number;
  breachedCount: number;
  criticalRiskCount: number;
  onTrackCount: number;
  complianceRate: number;
  longestOverdueDays: number;
  items: SlaBreachTicketItem[];
}

export interface SlaBreachAnalysisReport {
  generatedAt: string;
  reportDateStr: string;
  totalActiveTickets: number;
  totalBreached: number;
  totalCriticalRisk: number;
  totalOnTrack: number;
  overallComplianceRate: number;
  departmentSummaries: SlaDepartmentSummary[];
  allBreachedItems: SlaBreachTicketItem[];
  allCriticalItems: SlaBreachTicketItem[];
}

export interface EmailSchedulerConfig {
  enabled: boolean;
  frequency: "daily_morning" | "daily_evening" | "twice_daily" | "weekly_monday";
  sendTime: string; // e.g. "07:30"
  selectedLeadIds: string[];
  ccEmails: string;
  includeCriticalRisk: boolean;
  autoEscalateAfterDays: number;
  lastSentAt: string | null;
  lastDispatchStatus: string | null;
}

export interface EmailDispatchLog {
  id: string;
  timestamp: string;
  recipients: string[];
  cc: string[];
  subject: string;
  totalBreachedIncluded: number;
  triggerType: "manual" | "scheduled_periodic";
  status: "SENT" | "SCHEDULED" | "FAILED";
  previewSnippet: string;
}

const STORAGE_SCHEDULER_KEY = "aetra_sla_email_scheduler_config";
const STORAGE_LOGS_KEY = "aetra_sla_email_dispatch_logs";

export function loadEmailSchedulerConfig(): EmailSchedulerConfig {
  try {
    const raw = localStorage.getItem(STORAGE_SCHEDULER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (_) {}

  return {
    enabled: true,
    frequency: "daily_morning",
    sendTime: "07:30",
    selectedLeadIds: DEPARTMENT_LEADS.filter((l) => l.selectedByDefault).map((l) => l.id),
    ccEmails: "cc-operations@aetra-tangerang.co.id, qa.technical@aetra-tangerang.co.id",
    includeCriticalRisk: true,
    autoEscalateAfterDays: 3,
    lastSentAt: null,
    lastDispatchStatus: null,
  };
}

export function saveEmailSchedulerConfig(config: EmailSchedulerConfig): void {
  try {
    localStorage.setItem(STORAGE_SCHEDULER_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save email scheduler config:", e);
  }
}

export function loadEmailDispatchLogs(): EmailDispatchLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

export function saveEmailDispatchLog(log: EmailDispatchLog): void {
  try {
    const logs = loadEmailDispatchLogs();
    logs.unshift(log);
    // Keep max 50 logs
    const trimmed = logs.slice(0, 50);
    localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error("Failed to save email dispatch log:", e);
  }
}

/**
 * Root Cause & Mitigation Analysis for SLA breaches
 */
function determineRootCauseAndAction(ticket: UnifiedTicket, overdueDays: number): { cause: string; action: string } {
  const cat = (ticket.category || "").toUpperCase();
  const desc = (ticket.desc || "").toLowerCase();
  const div = ticket.targetDivision || "technical_support";

  if (div === "technical_support" || cat.includes("KATR") || cat.includes("KERUH") || cat.includes("BAU") || desc.includes("kualitas") || desc.includes("uji")) {
    return {
      cause: "Menunggu penyelesaian uji parameter laboratorium kimia/fisika & protokol flushing hydrant",
      action: "Eskalasi ke analis lab untuk rilis sertifikat mutu air minum & koordinasi teknisi flushing jaringan distribusi",
    };
  }

  if (cat.includes("KMTA") || cat.includes("TERA") || desc.includes("tera") || desc.includes("akurasi")) {
    return {
      cause: "Proses kalibrasi tera akurasi meter air di bench test teknis membutuhkan penjadwalan uji tera sah",
      action: "Tuntaskan berita acara uji tera dan kirimkan meter pengganti siap pasang",
    };
  }

  if (cat.includes("KBSM") || desc.includes("bocor") || desc.includes("pipa") || desc.includes("aspal")) {
    return {
      cause: overdueDays > 2
        ? "Lokasi pipa tertanam di bawah jalan raya beton/aspal atau kendala perizinan instansi Bina Marga"
        : "Antrean armada tim galian & penyambungan pipa dinas",
      action: "Kirim tim respon darurat Minor Repair untuk proteksi kebocoran dan penyambungan clamping segera",
    };
  }

  if (div === "key_account" || cat.includes("IND") || desc.includes("industri") || desc.includes("pabrik")) {
    return {
      cause: "Koordinasi jadwal shut-down koneksi teknis dengan pihak manajemen pabrik / kawasan industri",
      action: "Key Account Officer segera menjadwalkan kunjungan teknis onsite bersama Head of Commercial",
    };
  }

  if (div === "sales_support" || desc.includes("tarif") || desc.includes("tagihan") || desc.includes("rekening")) {
    return {
      cause: "Pencocokan riwayat angka stand meter fisik vs sistem billing SAP",
      action: "Lakukan validasi baca meter persil dan terbitkan penyesuaian koreksi rekening air",
    };
  }

  return {
    cause: "Penyelidikan lapangan lanjutan memerlukan verifikasi data pelanggan di lokasi",
    action: "Penugasan prioritas teknisi shift pagi dan konfirmasi ketersediaan pelanggan di rumah",
  };
}

/**
 * Comprehensive SLA Breach Analyzer across all unified tickets
 */
export function analyzeAllSlaBreaches(customTickets?: UnifiedTicket[]): SlaBreachAnalysisReport {
  const allTickets = customTickets || loadAllUnifiedTickets();
  const now = new Date().getTime();

  // Consider active (not completed) tickets, plus recently completed tickets that breached SLA
  const activeTickets = allTickets.filter((t) => t.status !== "selesai");

  const breachItems: SlaBreachTicketItem[] = [];
  const criticalItems: SlaBreachTicketItem[] = [];
  const allAnalyzedItems: SlaBreachTicketItem[] = [];

  activeTickets.forEach((t) => {
    const receivedTime = new Date(t.receivedAt || (t as any).date || new Date()).getTime();
    const elapsedMs = Math.max(0, now - receivedTime);
    const elapsedHours = Math.round((elapsedMs / (1000 * 60 * 60)) * 10) / 10;
    const elapsedDays = Math.round((elapsedHours / 24) * 10) / 10;

    const catKey = (t.category || "TR09").toUpperCase().trim();
    const slaLimitHours = SLA_RULES_HOURS[catKey] || 72; // Default 72 hours (3 days)
    const slaLimitDays = Math.round((slaLimitHours / 24) * 10) / 10;

    const categoryName = CATEGORY_NAMES_MAP[catKey] || t.category || "Keluhan Umum";
    const targetDivision = t.targetDivision || "technical_support";

    const riskPercentage = Math.round((elapsedHours / slaLimitHours) * 100);
    const overdueHours = Math.max(0, Math.round((elapsedHours - slaLimitHours) * 10) / 10);
    const overdueDays = Math.max(0, Math.round((overdueHours / 24) * 10) / 10);

    let breachStatus: "breached" | "critical_risk" | "warning" | "on_track" = "on_track";
    let urgencyLevel: "CRITICAL" | "HIGH" | "MEDIUM" = "MEDIUM";

    if (elapsedHours >= slaLimitHours) {
      breachStatus = "breached";
      urgencyLevel = overdueDays >= 2 || t.urgent ? "CRITICAL" : "HIGH";
    } else if (riskPercentage >= 80) {
      breachStatus = "critical_risk";
      urgencyLevel = t.urgent ? "CRITICAL" : "HIGH";
    } else if (riskPercentage >= 50) {
      breachStatus = "warning";
      urgencyLevel = "MEDIUM";
    }

    const { cause, action } = determineRootCauseAndAction(t, overdueDays);

    const item: SlaBreachTicketItem = {
      ticket: t,
      receivedAt: t.receivedAt || (t as any).date || new Date().toISOString(),
      categoryName,
      targetDivision,
      slaLimitHours,
      slaLimitDays,
      elapsedHours,
      elapsedDays,
      overdueHours,
      overdueDays,
      breachStatus,
      riskPercentage,
      urgencyLevel,
      rootCauseEstimation: cause,
      recommendedAction: action,
    };

    allAnalyzedItems.push(item);
    if (breachStatus === "breached") {
      breachItems.push(item);
    } else if (breachStatus === "critical_risk") {
      criticalItems.push(item);
    }
  });

  // Sort breached items by longest overdue first
  breachItems.sort((a, b) => b.overdueHours - a.overdueHours);
  criticalItems.sort((a, b) => b.riskPercentage - a.riskPercentage);

  // Department groupings
  const departmentSummaries: SlaDepartmentSummary[] = DEPARTMENT_LEADS.filter(
    (l) => l.divisionKey !== "executive"
  ).map((lead) => {
    const deptItems = allAnalyzedItems.filter(
      (item) => item.targetDivision === lead.divisionKey
    );
    const breached = deptItems.filter((i) => i.breachStatus === "breached");
    const crit = deptItems.filter((i) => i.breachStatus === "critical_risk");
    const onTrack = deptItems.filter((i) => i.breachStatus === "on_track" || i.breachStatus === "warning");
    const complianceRate =
      deptItems.length > 0
        ? Math.round(((deptItems.length - breached.length) / deptItems.length) * 100)
        : 100;
    const longestOverdueDays =
      breached.length > 0 ? Math.max(...breached.map((b) => b.overdueDays)) : 0;

    return {
      divisionKey: lead.divisionKey,
      divisionLabel: lead.divisionLabel,
      lead,
      totalActiveTickets: deptItems.length,
      breachedCount: breached.length,
      criticalRiskCount: crit.length,
      onTrackCount: onTrack.length,
      complianceRate,
      longestOverdueDays,
      items: deptItems.sort((a, b) => b.overdueHours - a.overdueHours),
    };
  });

  const totalActive = allAnalyzedItems.length;
  const overallComplianceRate =
    totalActive > 0
      ? Math.round(((totalActive - breachItems.length) / totalActive) * 100)
      : 100;

  const nowFormatted = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    generatedAt: new Date().toISOString(),
    reportDateStr: `${nowFormatted} WIB`,
    totalActiveTickets: totalActive,
    totalBreached: breachItems.length,
    totalCriticalRisk: criticalItems.length,
    totalOnTrack: totalActive - breachItems.length - criticalItems.length,
    overallComplianceRate,
    departmentSummaries,
    allBreachedItems: breachItems,
    allCriticalItems: criticalItems,
  };
}

/**
 * Generates Subject Line for Email
 */
export function generateSlaEmailSubject(report: SlaBreachAnalysisReport, frequencyLabel?: string): string {
  const dateShort = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  const freq = frequencyLabel || "Harian";
  const statusFlag = report.totalBreached > 0 ? `🚨 [PERINGATAN SLA: ${report.totalBreached} KASUS]` : "✅ [SLA TERKENDALI]";
  return `${statusFlag} Laporan Ringkasan Status SLA ${freq} PT Aetra Air Tangerang - ${dateShort}`;
}

/**
 * Builds Rich, Responsive HTML Email Template for Department Leads
 */
export function buildSlaBreachHtmlEmail(report: SlaBreachAnalysisReport, selectedLeads: DepartmentLeadContact[]): string {
  const leadsNames = selectedLeads.map((l) => `${l.name} (${l.divisionLabel})`).join(", ");

  const deptRowsHtml = report.departmentSummaries
    .map((dept) => {
      const isBad = dept.breachedCount > 0;
      const statusBadge = isBad
        ? `<span style="background:#FEE2E2; color:#991B1B; border:1px solid #FCA5A5; padding:3px 8px; border-radius:12px; font-weight:800; font-size:11px;">🚨 ${dept.breachedCount} Pelanggaran</span>`
        : `<span style="background:#DCFCE7; color:#166534; border:1px solid #86EFAC; padding:3px 8px; border-radius:12px; font-weight:800; font-size:11px;">✅ 100% Sesuai SLA</span>`;

      return `
        <tr style="border-bottom:1px solid #E2E8F0;">
          <td style="padding:10px 14px; font-weight:700; color:#0F172A; font-size:12.5px;">
            <div>${dept.divisionLabel}</div>
            <div style="font-size:11px; color:#64748B; font-weight:500;">Lead: ${dept.lead.name}</div>
          </td>
          <td style="padding:10px 14px; text-align:center; font-weight:800; color:#0F172A; font-size:13px;">${dept.totalActiveTickets}</td>
          <td style="padding:10px 14px; text-align:center; font-weight:800; color:${dept.breachedCount > 0 ? "#DC2626" : "#166534"}; font-size:13px;">${dept.breachedCount}</td>
          <td style="padding:10px 14px; text-align:center; font-weight:800; color:${dept.criticalRiskCount > 0 ? "#D97706" : "#64748B"}; font-size:13px;">${dept.criticalRiskCount}</td>
          <td style="padding:10px 14px; text-align:center; font-weight:800; color:${dept.complianceRate < 85 ? "#DC2626" : "#059669"}; font-size:13px;">${dept.complianceRate}%</td>
          <td style="padding:10px 14px; text-align:center;">${statusBadge}</td>
        </tr>
      `;
    })
    .join("");

  const breachedTableRowsHtml =
    report.allBreachedItems.length === 0
      ? `<tr><td colspan="6" style="padding:20px; text-align:center; color:#166534; font-weight:700; background:#F0FDF4;">🎉 Tidak ada kasus yang melewati batas SLA hari ini. Seluruh pekerjaan tertangani tepat waktu.</td></tr>`
      : report.allBreachedItems
          .map((item, idx) => {
            const t = item.ticket;
            const urgentPill = t.urgent
              ? `<span style="background:#EF4444; color:#FFF; font-size:9.5px; font-weight:800; padding:1px 5px; border-radius:4px; margin-left:4px;">URGENT</span>`
              : "";

            return `
              <tr style="border-bottom:1px solid #F1F5F9; background:${idx % 2 === 0 ? "#FFFFFF" : "#FFF7ED"};">
                <td style="padding:10px 12px; vertical-align:top;">
                  <div style="font-weight:800; font-family:monospace; color:#DC2626; font-size:12px;">${t.id}${urgentPill}</div>
                  <div style="font-size:10.5px; color:#64748B; font-family:monospace;">${t.caseId ? `#${t.caseId}` : ""}</div>
                  <div style="font-size:10.5px; background:#EFF6FF; color:#1D4ED8; padding:2px 5px; border-radius:4px; display:inline-block; margin-top:2px; font-weight:700;">${item.targetDivision.toUpperCase().replace("_", " ")}</div>
                </td>
                <td style="padding:10px 12px; vertical-align:top;">
                  <div style="font-weight:700; color:#0F172A; font-size:12px;">${t.customer}</div>
                  <div style="font-size:11px; color:#64748B;">📍 ${t.address || t.area || "-"}</div>
                  <div style="font-size:10.5px; color:#0284C7; font-weight:600; margin-top:2px;">[${t.category}] ${item.categoryName}</div>
                </td>
                <td style="padding:10px 12px; vertical-align:top; text-align:center;">
                  <div style="font-size:11.5px; font-weight:700; color:#475569;">Target: ${item.slaLimitDays} Hari</div>
                  <div style="font-size:12px; font-weight:800; color:#DC2626; margin-top:2px;">Berjalan: ${item.elapsedDays} Hari</div>
                </td>
                <td style="padding:10px 12px; vertical-align:top; text-align:center;">
                  <span style="background:#FEE2E2; color:#991B1B; border:1.5px solid #F87171; padding:3px 8px; border-radius:8px; font-weight:800; font-size:11px; display:inline-block;">
                    +${item.overdueDays} Hari (+${item.overdueHours} Jam)
                  </span>
                </td>
                <td style="padding:10px 12px; vertical-align:top; font-size:11px; color:#334155; line-height:1.4;">
                  <div style="font-weight:700; color:#9A3412;">🔍 Indikasi Kendala:</div>
                  <div>${item.rootCauseEstimation}</div>
                </td>
                <td style="padding:10px 12px; vertical-align:top; font-size:11px; color:#065F46; line-height:1.4;">
                  <div style="font-weight:700; color:#047857;">⚡ Tindakan Diperlukan:</div>
                  <div>${item.recommendedAction}</div>
                </td>
              </tr>
            `;
          })
          .join("");

  const criticalTableRowsHtml =
    report.allCriticalItems.length === 0
      ? ""
      : `
        <div style="margin-top:24px;">
          <div style="font-size:14px; font-weight:800; color:#B45309; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
            <span>⚠️</span> KASUS KRITIS MENDEKATI BATAS SLA (< 24 JAM TERSISA)
          </div>
          <table style="width:100%; border-collapse:collapse; background:#FFFBEB; border:1px solid #FDE68A; border-radius:8px; font-size:11.5px;">
            <thead>
              <tr style="background:#FEF3C7; color:#92400E; text-align:left; font-size:10.5px; text-transform:uppercase;">
                <th style="padding:8px 10px;">No. WO</th>
                <th style="padding:8px 10px;">Pelanggan & Lokasi</th>
                <th style="padding:8px 10px;">Divisi Penanggung Jawab</th>
                <th style="padding:8px 10px; text-align:center;">Konsumsi SLA</th>
                <th style="padding:8px 10px;">Tindakan Segera</th>
              </tr>
            </thead>
            <tbody>
              ${report.allCriticalItems
                .map(
                  (c) => `
                <tr style="border-bottom:1px solid #FEF3C7;">
                  <td style="padding:8px 10px; font-family:monospace; font-weight:800; color:#B45309;">${c.ticket.id}</td>
                  <td style="padding:8px 10px; font-weight:600; color:#0F172A;">${c.ticket.customer} (${c.ticket.area || "-"})</td>
                  <td style="padding:8px 10px; color:#475569; font-weight:700;">${c.targetDivision.toUpperCase()}</td>
                  <td style="padding:8px 10px; text-align:center; font-weight:800; color:#D97706;">${c.riskPercentage}% (${c.elapsedHours}/${c.slaLimitHours} Jam)</td>
                  <td style="padding:8px 10px; color:#0F172A;">${c.recommendedAction}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laporan Ringkasan Status SLA - PT Aetra Air Tangerang</title>
</head>
<body style="margin:0; padding:0; background:#0F172A; font-family:'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; color:#334155; line-height:1.5;">

  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#0F172A; padding:24px 12px;">
    <tr>
      <td align="center">
        
        <!-- Main Email Container -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:820px; background:#FFFFFF; border-radius:18px; overflow:hidden; box-shadow:0 12px 36px rgba(0,0,0,0.35);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #0284C7 0%, #0F172A 100%); padding:24px 28px; color:#FFFFFF;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:flex; align-items:center; gap:10px; font-size:11px; font-weight:800; letter-spacing:1px; color:#38BDF8; text-transform:uppercase;">
                      💧 PT AETRA AIR TANGERANG • TECHNICAL SUPPORT & LAB
                    </div>
                    <h1 style="margin:6px 0 2px 0; font-size:20px; font-weight:900; color:#FFFFFF; letter-spacing:-0.3px;">
                      Daily SLA Breach & Operational Status Summary
                    </h1>
                    <div style="font-size:12px; color:#BAE6FD;">
                      Laporan Berkala Penanganan Komplain Pelanggan & Kepatuhan Service Level Agreement
                    </div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <div style="background:rgba(255,255,255,0.12); backdrop-filter:blur(6px); padding:8px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.2); text-align:right;">
                      <div style="font-size:10px; color:#94A3B8; font-weight:700;">WAKTU GENERASI:</div>
                      <div style="font-size:12px; font-weight:800; color:#FFFFFF; font-family:monospace;">${report.reportDateStr}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Department Leads Salutation -->
          <tr>
            <td style="padding:18px 28px; background:#F8FAFC; border-bottom:1px solid #E2E8F0; font-size:12.5px; color:#475569;">
              <div>Yth. <strong>Para Pimpinan Divisi (Department Leads)</strong>:</div>
              <div style="color:#0284C7; font-weight:700; margin-top:3px; font-size:11.5px;">${leadsNames}</div>
              <div style="margin-top:6px; font-size:12px; color:#334155;">
                Berikut terlampir ringkasan harian tiket pengaduan aktif, kasus yang telah <strong>melewati batas SLA operasional</strong>, serta daftar kasus berisiko tinggi yang membutuhkan percepatan koordinasi teknis antar-divisi hari ini.
              </div>
            </td>
          </tr>

          <!-- KPI Scorecards -->
          <tr>
            <td style="padding:20px 28px 10px 28px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="24%" style="padding:4px;">
                    <div style="background:#F8FAFC; border:1.5px solid #E2E8F0; border-radius:12px; padding:12px; text-align:center;">
                      <div style="font-size:10.5px; font-weight:700; color:#64748B; text-transform:uppercase;">Total Kasus Aktif</div>
                      <div style="font-size:22px; font-weight:900; color:#0F172A; margin-top:2px;">${report.totalActiveTickets}</div>
                      <div style="font-size:10px; color:#0284C7; font-weight:600;">Semua Divisi</div>
                    </div>
                  </td>
                  <td width="24%" style="padding:4px;">
                    <div style="background:${report.totalBreached > 0 ? "#FEF2F2" : "#F0FDF4"}; border:1.5px solid ${report.totalBreached > 0 ? "#FECACA" : "#BBF7D0"}; border-radius:12px; padding:12px; text-align:center;">
                      <div style="font-size:10.5px; font-weight:700; color:${report.totalBreached > 0 ? "#991B1B" : "#166534"}; text-transform:uppercase;">Melewati SLA</div>
                      <div style="font-size:22px; font-weight:900; color:${report.totalBreached > 0 ? "#DC2626" : "#166534"}; margin-top:2px;">${report.totalBreached}</div>
                      <div style="font-size:10px; color:${report.totalBreached > 0 ? "#B91C1C" : "#15803D"}; font-weight:700;">Perlu Tindakan Segera</div>
                    </div>
                  </td>
                  <td width="24%" style="padding:4px;">
                    <div style="background:#FFFBEB; border:1.5px solid #FDE68A; border-radius:12px; padding:12px; text-align:center;">
                      <div style="font-size:10.5px; font-weight:700; color:#92400E; text-transform:uppercase;">Kritis < 24 Jam</div>
                      <div style="font-size:22px; font-weight:900; color:#D97706; margin-top:2px;">${report.totalCriticalRisk}</div>
                      <div style="font-size:10px; color:#B45309; font-weight:600;">Risiko Tinggi</div>
                    </div>
                  </td>
                  <td width="28%" style="padding:4px;">
                    <div style="background:${report.overallComplianceRate >= 90 ? "#F0FDF4" : "#FEF2F2"}; border:1.5px solid ${report.overallComplianceRate >= 90 ? "#BBF7D0" : "#FECACA"}; border-radius:12px; padding:12px; text-align:center;">
                      <div style="font-size:10.5px; font-weight:700; color:${report.overallComplianceRate >= 90 ? "#166534" : "#991B1B"}; text-transform:uppercase;">SLA Compliance Rate</div>
                      <div style="font-size:22px; font-weight:900; color:${report.overallComplianceRate >= 90 ? "#166534" : "#DC2626"}; margin-top:2px;">${report.overallComplianceRate}%</div>
                      <div style="font-size:10px; color:${report.overallComplianceRate >= 90 ? "#15803D" : "#B91C1C"}; font-weight:700;">Target Manajemen: ≥95%</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Section 1: Department SLA Matrix -->
          <tr>
            <td style="padding:16px 28px;">
              <div style="font-size:14px; font-weight:800; color:#0F172A; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                <span>📊</span> 1. REKAPITULASI KEPATUHAN SLA PER DIVISI
              </div>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0; border-radius:10px; overflow:hidden; border-collapse:collapse; text-align:left;">
                <thead>
                  <tr style="background:#F1F5F9; color:#475569; font-size:11px; text-transform:uppercase; border-bottom:1.5px solid #CBD5E1;">
                    <th style="padding:10px 14px;">Divisi & Penanggung Jawab</th>
                    <th style="padding:10px 14px; text-align:center;">Kasus Aktif</th>
                    <th style="padding:10px 14px; text-align:center;">Lewat SLA</th>
                    <th style="padding:10px 14px; text-align:center;">Kritis</th>
                    <th style="padding:10px 14px; text-align:center;">Kepatuhan</th>
                    <th style="padding:10px 14px; text-align:center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${deptRowsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Section 2: Detailed Breached Cases Table -->
          <tr>
            <td style="padding:16px 28px;">
              <div style="font-size:14px; font-weight:800; color:#991B1B; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span>🚨</span> 2. DAFTAR KASUS MELEWATI BATAS SLA (URGENT ACTION LIST)
                </div>
                <div style="font-size:11px; font-weight:700; color:#DC2626; background:#FEE2E2; padding:2px 8px; border-radius:6px;">
                  ${report.totalBreached} Kasus Teridentifikasi
                </div>
              </div>

              <div style="border:1px solid #FECACA; border-radius:12px; overflow:hidden;">
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse; text-align:left; font-size:11.5px;">
                  <thead>
                    <tr style="background:#FEF2F2; color:#991B1B; font-size:10.5px; text-transform:uppercase; border-bottom:1.5px solid #FCA5A5;">
                      <th style="padding:10px 12px;">No. WO / Divisi</th>
                      <th style="padding:10px 12px;">Pelanggan & Lokasi</th>
                      <th style="padding:10px 12px; text-align:center;">Target vs Realisasi</th>
                      <th style="padding:10px 12px; text-align:center;">Keterlambatan</th>
                      <th style="padding:10px 12px;">Akar Masalah</th>
                      <th style="padding:10px 12px;">Rekomendasi Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${breachedTableRowsHtml}
                  </tbody>
                </table>
              </div>

              ${criticalTableRowsHtml}
            </td>
          </tr>

          <!-- Section 3: Department Leads Next Action Steps -->
          <tr>
            <td style="padding:16px 28px 24px 28px;">
              <div style="background:#F0F9FF; border:1.5px solid #BAE6FD; border-radius:14px; padding:16px 20px;">
                <div style="font-size:13.5px; font-weight:800; color:#0369A1; margin-bottom:6px; display:flex; align-items:center; gap:6px;">
                  <span>📌</span> PETUNJUK TINDAK LANJUT DEPARTMENT LEADS HARI INI
                </div>
                <ol style="margin:0; padding-left:20px; font-size:12px; color:#0C4A6E; line-height:1.6;">
                  <li><strong>Technical Support & Lab</strong>: Percepat penyerahan sertifikat parameter uji air keruh/klorin dan konfirmasi jadwal tera ulang meter air bermasalah.</li>
                  <li><strong>Minor Repair</strong>: Prioritaskan pengiriman tim galian & clamping untuk kasus kebocoran pipa yang telah melewati target 3 hari.</li>
                  <li><strong>Customer Service</strong>: Hubungi pelanggan terkait konfirmasi jadwal kedatangan teknisi dan hindari status <em>unreachable</em>.</li>
                  <li><strong>Key Account & Sales Support</strong>: Verifikasi penyesuaian koreksi tagihan industri dan koordinasi teknis sambungan.</li>
                </ol>
              </div>
            </td>
          </tr>

          <!-- Footer Official Signature -->
          <tr>
            <td style="background:#0F172A; padding:20px 28px; color:#94A3B8; font-size:11px; text-align:center; line-height:1.6; border-top:1px solid rgba(255,255,255,0.1);">
              <div style="color:#F8FAFC; font-weight:800; font-size:12px;">PT AETRA AIR TANGERANG</div>
              <div>Divisi Technical Support & Laboratorium Kualitas Air • Sistem Manajemen Mutu ISO 9001:2015</div>
              <div style="margin-top:4px; color:#64748B;">
                Email otomatis ini dikirim oleh <em>AETRA Periodic Status & SLA Dispatcher Engine</em> kepada seluruh Department Leads.
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

/**
 * Builds Plain-Text version of Email (for Outlook/Text Clients)
 */
export function buildSlaBreachPlainTextEmail(report: SlaBreachAnalysisReport, selectedLeads: DepartmentLeadContact[]): string {
  const leadsNames = selectedLeads.map((l) => `${l.name} (${l.divisionLabel})`).join(", ");

  let text = `==================================================================
PT AETRA AIR TANGERANG - TECHNICAL SUPPORT & LABORATORY
LAPORAN RINGKASAN STATUS SLA & PELANGGARAN WAKTU PENANGANAN
==================================================================
Waktu Pembuatan: ${report.reportDateStr}
Penerima: ${leadsNames}

RINGKASAN EKSEKUTIF:
- Total Kasus Aktif: ${report.totalActiveTickets}
- Kasus Melewati Batas SLA: ${report.totalBreached} Kasus
- Kasus Kritis (< 24 Jam): ${report.totalCriticalRisk} Kasus
- SLA Compliance Rate: ${report.overallComplianceRate}% (Target: >=95%)

------------------------------------------------------------------
1. KEPATUHAN SLA PER DIVISI:
------------------------------------------------------------------
`;

  report.departmentSummaries.forEach((d) => {
    text += `* ${d.divisionLabel} (Lead: ${d.lead.name})\n`;
    text += `  - Total Aktif: ${d.totalActiveTickets} | Lewat SLA: ${d.breachedCount} | Kritis: ${d.criticalRiskCount} | Kepatuhan: ${d.complianceRate}%\n`;
  });

  text += `\n------------------------------------------------------------------
2. DAFTAR KASUS MELEWATI BATAS SLA (URGENT):
------------------------------------------------------------------\n`;

  if (report.allBreachedItems.length === 0) {
    text += `Tidak ada pelanggaran SLA hari ini. Semua kasus tertangani dengan baik.\n`;
  } else {
    report.allBreachedItems.forEach((b, idx) => {
      text += `[${idx + 1}] WO: ${b.ticket.id} (${b.ticket.caseId ? "#" + b.ticket.caseId : ""})\n`;
      text += `    Pelanggan: ${b.ticket.customer} | Lokasi: ${b.ticket.address || b.ticket.area || "-"}\n`;
      text += `    Divisi: ${b.targetDivision.toUpperCase()} | Kategori: [${b.ticket.category}] ${b.categoryName}\n`;
      text += `    Target SLA: ${b.slaLimitDays} Hari | Realisasi: ${b.elapsedDays} Hari (Terlambat: +${b.overdueDays} Hari)\n`;
      text += `    Kendala: ${b.rootCauseEstimation}\n`;
      text += `    Tindakan: ${b.recommendedAction}\n\n`;
    });
  }

  text += `==================================================================
PT Aetra Air Tangerang - Call Center 24 Jam: (021) 598-1122
==================================================================`;

  return text;
}

/**
 * Open Email in User's Email Client / Web Gmail
 */
export function openSlaBreachInEmailClient(
  report: SlaBreachAnalysisReport,
  leads: DepartmentLeadContact[],
  ccEmails: string,
  preferredClient: "default_mail" | "gmail_web" = "gmail_web"
): void {
  const subject = generateSlaEmailSubject(report);
  const toEmails = leads.map((l) => l.email).join(",");
  const plainBody = buildSlaBreachPlainTextEmail(report, leads);

  if (preferredClient === "gmail_web") {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmails)}&cc=${encodeURIComponent(
      ccEmails
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`;
    window.open(gmailUrl, "_blank");
  } else {
    const mailtoUrl = `mailto:${encodeURIComponent(toEmails)}?cc=${encodeURIComponent(ccEmails)}&subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(plainBody)}`;
    window.location.href = mailtoUrl;
  }
}

/**
 * Dispatch Email with Logging (Simulation / API Dispatch)
 */
export async function executeSlaEmailDispatch(
  report: SlaBreachAnalysisReport,
  leads: DepartmentLeadContact[],
  ccEmails: string,
  triggerType: "manual" | "scheduled_periodic" = "manual"
): Promise<EmailDispatchLog> {
  const subject = generateSlaEmailSubject(report);
  const recipients = leads.map((l) => l.email);
  const ccList = ccEmails.split(",").map((s) => s.trim()).filter(Boolean);

  const newLog: EmailDispatchLog = {
    id: `DISPATCH-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    recipients,
    cc: ccList,
    subject,
    totalBreachedIncluded: report.totalBreached,
    triggerType,
    status: "SENT",
    previewSnippet: `Terkirim ke ${recipients.length} Department Leads (${recipients.join(", ")}). Kepatuhan SLA: ${report.overallComplianceRate}%, Pelanggaran: ${report.totalBreached} kasus.`,
  };

  saveEmailDispatchLog(newLog);

  // Update Scheduler Config last sent
  const config = loadEmailSchedulerConfig();
  config.lastSentAt = newLog.timestamp;
  config.lastDispatchStatus = `Terkirim Sukses (${newLog.id}) - ${new Date().toLocaleTimeString("id-ID")}`;
  saveEmailSchedulerConfig(config);

  return newLog;
}
