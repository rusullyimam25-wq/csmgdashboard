/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Daily Activity Log Service - PT Aetra Air Tangerang
 * Aggregates completed tasks by officer for a given date and generates downloadable reports (Excel & PDF)
 */

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { DivisionId, DIVISIONS } from "../types/division";
import { loadAllUnifiedTickets, saveSingleTicket, UnifiedTicket } from "./divisionTicketService";
import { findOfficerByName } from "../mobileDivisionData";

export interface CompletedTaskItem {
  id: string;
  caseId: string;
  customer: string;
  phone: string;
  meterId: string;
  address: string;
  area: string;
  category: string;
  categoryLabel: string;
  targetDivision: DivisionId;
  divisionName: string;
  officerName: string;
  officerRole?: string;
  officerUnit?: string;
  receivedAt?: string;
  distributedAt?: string;
  completedAt: string;
  durationMinutes: number;
  durationLabel: string;
  urgent: boolean;
  completionNotes: string;
  usedMaterials: string[];
  customerSignature?: string | null;
  customerSignerName?: string;
  officerSignature?: string | null;
  coords?: string;
  driveFileUrl?: string;
}

export interface OfficerActivitySummary {
  officerName: string;
  divisionId: DivisionId;
  divisionName: string;
  unit: string;
  role: string;
  avatarColor: { main: string; bg: string; border: string };
  totalCompleted: number;
  urgentCount: number;
  signedCount: number;
  signedRatePercentage: number;
  averageDurationMinutes: number;
  materialsUsed: { name: string; count: number }[];
  totalMaterialsCount: number;
  tasks: CompletedTaskItem[];
}

export interface DailyActivityReportData {
  targetDate: string; // YYYY-MM-DD
  formattedDate: string; // e.g. "26 September 2026"
  formattedDayDate: string; // e.g. "Sabtu, 26 September 2026"
  generatedAt: string;
  totalCompletedTasks: number;
  totalActiveOfficers: number;
  totalUrgentTasks: number;
  totalSignedBast: number;
  overallSignedRatePercentage: number;
  overallAvgDurationMinutes: number;
  totalMaterialsCount: number;
  divisionFilter: DivisionId | "all";
  divisionBreakdown: Record<DivisionId, number>;
  officerSummaries: OfficerActivitySummary[];
  allTasks: CompletedTaskItem[];
}

const CATEGORY_LABELS: Record<string, string> = {
  KBSM: "Bocor Sebelum Meter (Pipa Persil)",
  KKMR: "Kran / Meter Rusak",
  KP: "Kebocoran Pipa Persil",
  KPIND: "Kebocoran Pipa Industri",
  KS: "Stop Kran / Segel Bocor",
  KTR: "Tekanan Air Rendah",
  KTRIND: "Tekanan Rendah Industri",
  MM: "Pemeriksaan Meter Air",
  PBL: "Pipa Bocor Luar / Distribusi",
  SMR: "Tera / Akurasi Meter",
  KRPT: "Rekening Tinggi (Billing)",
  KPKT: "Penyambungan Kembali Tunggakan",
  KATMIND: "Air Mati Industri",
  KATR: "Air Kotor / Kekeruhan",
  TERAREQ: "Permohonan Uji Tera",
};

/**
 * Get YYYY-MM-DD date string in local timezone
 */
export function getLocalTodayDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format date string into Indonesian locale
 */
export function formatIndonesianDate(dateStr: string, includeDay: boolean = false): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString("id-ID", {
        weekday: includeDay ? "long" : undefined,
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      weekday: includeDay ? "long" : undefined,
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (_) {
    return dateStr;
  }
}

/**
 * Calculate duration between start and end in minutes
 */
function calculateDurationMinutes(startStr?: string, endStr?: string): number {
  if (!endStr) return 0;
  const end = new Date(endStr).getTime();
  const start = startStr ? new Date(startStr).getTime() : end - 3600000;
  if (isNaN(start) || isNaN(end) || end < start) return 45; // Default sensible fallback
  return Math.max(5, Math.round((end - start) / 60000));
}

function formatMinutesToLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} Menit`;
  const hrs = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) return `${hrs} Jam`;
  return `${hrs} Jam ${remainingMins} Mnt`;
}

/**
 * Aggregate completed tasks for a specific date across officers
 */
export function getDailyActivityReport(
  targetDate: string = getLocalTodayDateString(),
  divisionFilter: DivisionId | "all" = "all"
): DailyActivityReportData {
  const allTickets = loadAllUnifiedTickets();

  // Normalize target date string YYYY-MM-DD
  const targetDatePrefix = targetDate.trim();

  // Filter completed tasks on this date
  const completedTickets = allTickets.filter((ticket) => {
    if (ticket.status !== "selesai") return false;

    // Check completedAt date
    let ticketDate = "";
    if (ticket.completedAt) {
      ticketDate = ticket.completedAt.slice(0, 10);
    } else if (ticket.receivedAt) {
      ticketDate = ticket.receivedAt.slice(0, 10);
    } else {
      ticketDate = getLocalTodayDateString();
    }

    if (ticketDate !== targetDatePrefix) return false;

    if (divisionFilter !== "all" && ticket.targetDivision !== divisionFilter) {
      return false;
    }

    return true;
  });

  const allCompletedTasks: CompletedTaskItem[] = completedTickets.map((t) => {
    const officerInfo = findOfficerByName(t.officer || "");
    const divMeta = DIVISIONS[t.targetDivision] || DIVISIONS.minor_repair;
    const durMins = calculateDurationMinutes(t.receivedAt || t.distributedAt, t.completedAt);

    return {
      id: t.id,
      caseId: t.caseId || t.id,
      customer: t.customer,
      phone: t.phone || "-",
      meterId: t.meterId || "-",
      address: t.address,
      area: t.area || "Tangerang",
      category: t.category,
      categoryLabel: CATEGORY_LABELS[t.category] || t.category,
      targetDivision: t.targetDivision,
      divisionName: divMeta.shortName,
      officerName: t.officer || "Petugas Lapangan",
      officerRole: officerInfo?.role || "Teknisi Lapangan",
      officerUnit: officerInfo?.unit || "Unit Lapangan",
      receivedAt: t.receivedAt,
      distributedAt: t.distributedAt,
      completedAt: t.completedAt || new Date().toISOString(),
      durationMinutes: durMins,
      durationLabel: formatMinutesToLabel(durMins),
      urgent: Boolean(t.urgent),
      completionNotes: t.completionNotes || "Perbaikan telah selesai dilaksanakan di lokasi.",
      usedMaterials: Array.isArray(t.usedMaterials) ? t.usedMaterials : [],
      customerSignature: t.customerSignature,
      customerSignerName: t.customerSignerName || t.customer,
      officerSignature: t.officerSignature,
      coords: t.coords || "-6.2231, 106.5134",
      driveFileUrl: t.driveFileUrl,
    };
  });

  // Group by Officer
  const officerMap = new Map<string, CompletedTaskItem[]>();
  allCompletedTasks.forEach((task) => {
    const name = task.officerName;
    if (!officerMap.has(name)) {
      officerMap.set(name, []);
    }
    officerMap.get(name)!.push(task);
  });

  const officerSummaries: OfficerActivitySummary[] = [];
  const divisionBreakdown: Record<DivisionId, number> = {
    customer_service: 0,
    minor_repair: 0,
    sales_support: 0,
    key_account: 0,
    technical_support: 0,
  };

  let totalUrgent = 0;
  let totalSigned = 0;
  let totalMaterials = 0;
  let totalDurationMinutes = 0;

  officerMap.forEach((tasks, officerName) => {
    const officerInfo = findOfficerByName(officerName);
    const primaryDiv = tasks[0]?.targetDivision || officerInfo?.divisionId || "minor_repair";
    const divMeta = DIVISIONS[primaryDiv] || DIVISIONS.minor_repair;

    const urgentCount = tasks.filter((t) => t.urgent).length;
    const signedCount = tasks.filter((t) => Boolean(t.customerSignature)).length;
    const officerDurSum = tasks.reduce((acc, t) => acc + t.durationMinutes, 0);
    const avgDur = tasks.length > 0 ? Math.round(officerDurSum / tasks.length) : 0;

    // Materials tally for this officer
    const matMap = new Map<string, number>();
    tasks.forEach((t) => {
      t.usedMaterials.forEach((m) => {
        matMap.set(m, (matMap.get(m) || 0) + 1);
      });
    });

    const materialsUsed = Array.from(matMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));
    const officerMaterialCount = materialsUsed.reduce((acc, m) => acc + m.count, 0);

    totalUrgent += urgentCount;
    totalSigned += signedCount;
    totalMaterials += officerMaterialCount;
    totalDurationMinutes += officerDurSum;

    tasks.forEach((t) => {
      if (divisionBreakdown[t.targetDivision] !== undefined) {
        divisionBreakdown[t.targetDivision]++;
      }
    });

    officerSummaries.push({
      officerName,
      divisionId: primaryDiv,
      divisionName: divMeta.shortName,
      unit: officerInfo?.unit || "Unit Lapangan",
      role: officerInfo?.role || "Teknisi Lapangan",
      avatarColor: officerInfo?.avatarColor || {
        main: "#0284C7",
        bg: "#EFF6FF",
        border: "#BFDBFE",
      },
      totalCompleted: tasks.length,
      urgentCount,
      signedCount,
      signedRatePercentage: tasks.length > 0 ? Math.round((signedCount / tasks.length) * 100) : 0,
      averageDurationMinutes: avgDur,
      materialsUsed,
      totalMaterialsCount: officerMaterialCount,
      tasks: tasks.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()),
    });
  });

  // Sort officers by total completed descending
  officerSummaries.sort((a, b) => b.totalCompleted - a.totalCompleted);

  const totalTasks = allCompletedTasks.length;
  const overallAvgDuration = totalTasks > 0 ? Math.round(totalDurationMinutes / totalTasks) : 0;
  const overallSignedRate = totalTasks > 0 ? Math.round((totalSigned / totalTasks) * 100) : 0;

  return {
    targetDate: targetDatePrefix,
    formattedDate: formatIndonesianDate(targetDatePrefix, false),
    formattedDayDate: formatIndonesianDate(targetDatePrefix, true),
    generatedAt: new Date().toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    totalCompletedTasks: totalTasks,
    totalActiveOfficers: officerSummaries.length,
    totalUrgentTasks: totalUrgent,
    totalSignedBast: totalSigned,
    overallSignedRatePercentage: overallSignedRate,
    overallAvgDurationMinutes: overallAvgDuration,
    totalMaterialsCount: totalMaterials,
    divisionFilter,
    divisionBreakdown,
    officerSummaries,
    allTasks: allCompletedTasks.sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    ),
  };
}

/**
 * Export Daily Activity Log to Excel (.xlsx) with two professional sheets
 */
export function exportDailyActivityToExcel(reportData: DailyActivityReportData): void {
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: Ringkasan per Petugas (Officer Summary)
  const summaryRows: any[][] = [];

  // Title Block
  summaryRows.push(["PT AETRA AIR TANGERANG"]);
  summaryRows.push(["LOG REKAPITULASI AKTIVITAS HARIAN PETUGAS LAPANGAN"]);
  summaryRows.push([`Tanggal Kegiatan: ${reportData.formattedDayDate}`]);
  summaryRows.push([`Waktu Dibuat: ${reportData.generatedAt}`]);
  summaryRows.push([`Filter Divisi: ${reportData.divisionFilter === "all" ? "Semua Divisi" : DIVISIONS[reportData.divisionFilter]?.name || reportData.divisionFilter}`]);
  summaryRows.push([]);

  // KPI Highlights
  summaryRows.push(["RINGKASAN UTAMA (KPI HARIAN):"]);
  summaryRows.push([
    "Total WO Selesai",
    reportData.totalCompletedTasks,
    "Petugas Aktif",
    reportData.totalActiveOfficers,
    "WO Darurat",
    reportData.totalUrgentTasks,
  ]);
  summaryRows.push([
    "BAST E-Sign Selesai",
    `${reportData.totalSignedBast} (${reportData.overallSignedRatePercentage}%)`,
    "Rata-rata Waktu Penanganan",
    `${reportData.overallAvgDurationMinutes} Menit`,
    "Total Material Terpakai",
    `${reportData.totalMaterialsCount} Unit`,
  ]);
  summaryRows.push([]);

  // Table Headers
  summaryRows.push([
    "No",
    "Nama Petugas",
    "Divisi",
    "Satuan / Unit",
    "Peran Jabatan",
    "Total WO Selesai",
    "WO Darurat",
    "BAST E-Sign (Pelanggan)",
    "Kepatuhan E-Sign (%)",
    "Rata-rata Durasi (Menit)",
    "Total Material (Item)",
    "Rincian Material Terpakai",
  ]);

  // Data rows
  if (reportData.officerSummaries.length === 0) {
    summaryRows.push(["-", "Tidak ada aktivitas pekerjaan selesai pada tanggal ini", "-", "-", "-", 0, 0, 0, "0%", 0, 0, "-"]);
  } else {
    reportData.officerSummaries.forEach((off, idx) => {
      const matStr = off.materialsUsed.length > 0
        ? off.materialsUsed.map((m) => `${m.name} (${m.count}x)`).join(", ")
        : "Tidak ada material tambahan";

      summaryRows.push([
        idx + 1,
        off.officerName,
        off.divisionName,
        off.unit,
        off.role,
        off.totalCompleted,
        off.urgentCount,
        off.signedCount,
        `${off.signedRatePercentage}%`,
        off.averageDurationMinutes,
        off.totalMaterialsCount,
        matStr,
      ]);
    });

    // Total Row
    summaryRows.push([
      "TOTAL",
      `${reportData.totalActiveOfficers} Petugas Aktif`,
      "-",
      "-",
      "-",
      reportData.totalCompletedTasks,
      reportData.totalUrgentTasks,
      reportData.totalSignedBast,
      `${reportData.overallSignedRatePercentage}%`,
      reportData.overallAvgDurationMinutes,
      reportData.totalMaterialsCount,
      "-",
    ]);
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  // Column widths
  wsSummary["!cols"] = [
    { wch: 6 },  // No
    { wch: 22 }, // Nama Petugas
    { wch: 18 }, // Divisi
    { wch: 22 }, // Unit
    { wch: 25 }, // Peran
    { wch: 16 }, // Selesai
    { wch: 14 }, // Darurat
    { wch: 22 }, // BAST
    { wch: 18 }, // Kepatuhan
    { wch: 22 }, // Durasi
    { wch: 18 }, // Total Material
    { wch: 45 }, // Rincian Material
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Petugas");

  // 2. Sheet 2: Rincian Lengkap Tiket (Detailed Task Log)
  const detailRows: any[][] = [];
  detailRows.push(["PT AETRA AIR TANGERANG - DETAIL AKTIVITAS LAPANGAN"]);
  detailRows.push([`Tanggal: ${reportData.formattedDayDate}`]);
  detailRows.push([]);

  detailRows.push([
    "No",
    "ID Work Order",
    "Case ID",
    "Petugas Pelaksana",
    "Divisi",
    "Nama Pelanggan",
    "No Telepon",
    "No Meter Air",
    "Alamat Lengkap",
    "Wilayah / Area",
    "Kategori Gangguan",
    "Status Darurat",
    "Waktu Selesai",
    "Durasi (Menit)",
    "Catatan Perbaikan / Tindakan",
    "Material Digunakan",
    "E-Sign Pelanggan",
    "Nama Penandatangan",
    "Koordinat GPS",
  ]);

  if (reportData.allTasks.length === 0) {
    detailRows.push(["-", "Tidak ada data tiket selesai pada tanggal ini"]);
  } else {
    reportData.allTasks.forEach((task, idx) => {
      detailRows.push([
        idx + 1,
        task.id,
        task.caseId,
        task.officerName,
        task.divisionName,
        task.customer,
        task.phone,
        task.meterId,
        task.address,
        task.area,
        `${task.category} - ${task.categoryLabel}`,
        task.urgent ? "DARURAT" : "Normal",
        task.completedAt ? new Date(task.completedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-",
        task.durationMinutes,
        task.completionNotes,
        task.usedMaterials.join(", ") || "-",
        task.customerSignature ? "Sudah Bertandatangan (BAST)" : "Belum",
        task.customerSignerName || task.customer,
        task.coords || "-",
      ]);
    });
  }

  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail["!cols"] = [
    { wch: 6 },  // No
    { wch: 15 }, // ID WO
    { wch: 14 }, // Case ID
    { wch: 20 }, // Petugas
    { wch: 16 }, // Divisi
    { wch: 22 }, // Pelanggan
    { wch: 16 }, // Telp
    { wch: 14 }, // Meter
    { wch: 35 }, // Alamat
    { wch: 14 }, // Area
    { wch: 28 }, // Kategori
    { wch: 14 }, // Darurat
    { wch: 14 }, // Jam Selesai
    { wch: 14 }, // Durasi
    { wch: 40 }, // Catatan
    { wch: 30 }, // Material
    { wch: 24 }, // E-Sign
    { wch: 20 }, // Penandatangan
    { wch: 24 }, // GPS
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, "Rincian Tugas Lapangan");

  const fileName = `AETRA_Log_Aktivitas_Harian_${reportData.targetDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Generate official PDF report for Daily Activity Log
 */
export function generateDailyActivityPdf(reportData: DailyActivityReportData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let y = 14;

  // Header Banner Background (Aetra Sky Blue #0284C7)
  doc.setFillColor(2, 132, 199);
  doc.rect(margin, y, contentWidth, 24, "F");

  // Aetra Badge icon
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + 4, y + 3, 18, 18, 2, 2, "F");
  doc.setFillColor(2, 132, 199);
  doc.circle(margin + 13, y + 12, 6, "F");
  doc.setFillColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("A", margin + 11.5, y + 13.5);

  // Header Titles
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("PT AETRA AIR TANGERANG", margin + 26, y + 8);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Sistem Pengawasan Multi-Divisi & Penanganan Work Order", margin + 26, y + 13);
  doc.text("Jl. Raya Serang Km. 14, Sentra Cikupa, Tangerang - Banten", margin + 26, y + 17);

  // Document Badge
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.roundedRect(pageWidth - margin - 46, y + 4, 42, 16, 2, 2, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("LAPORAN RESMI", pageWidth - margin - 25, y + 9, { align: "center" });
  doc.setFontSize(7.5);
  doc.text(`TGL: ${reportData.targetDate}`, pageWidth - margin - 25, y + 15, { align: "center" });

  y += 28;

  // Title Box
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("REKAPITULASI AKTIVITAS HARIAN PETUGAS (DAILY ACTIVITY LOG)", margin, y);

  y += 5;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Hari/Tanggal: ${reportData.formattedDayDate}  |  Dibuat: ${reportData.generatedAt}  |  Filter: ${
      reportData.divisionFilter === "all" ? "Semua Divisi" : DIVISIONS[reportData.divisionFilter]?.name || reportData.divisionFilter
    }`,
    margin,
    y
  );

  y += 7;

  // 4 KPI Cards
  const cardWidth = (contentWidth - 9) / 4;
  const cardHeight = 16;

  // KPI 1: Total Selesai
  doc.setFillColor(236, 253, 245); // Emerald-50
  doc.setDrawColor(167, 243, 208); // Emerald-200
  doc.roundedRect(margin, y, cardWidth, cardHeight, 2, 2, "FD");
  doc.setFontSize(7);
  doc.setTextColor(4, 120, 87);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL WO SELESAI", margin + 4, y + 5);
  doc.setFontSize(12);
  doc.text(`${reportData.totalCompletedTasks}`, margin + 4, y + 12);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("Pekerjaan Tuntas", margin + cardWidth - 4, y + 12, { align: "right" });

  // KPI 2: Petugas Aktif
  const kpi2X = margin + cardWidth + 3;
  doc.setFillColor(239, 246, 255); // Blue-50
  doc.setDrawColor(191, 219, 254); // Blue-200
  doc.roundedRect(kpi2X, y, cardWidth, cardHeight, 2, 2, "FD");
  doc.setFontSize(7);
  doc.setTextColor(29, 78, 216);
  doc.setFont("helvetica", "bold");
  doc.text("PETUGAS LAPANGAN", kpi2X + 4, y + 5);
  doc.setFontSize(12);
  doc.text(`${reportData.totalActiveOfficers}`, kpi2X + 4, y + 12);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("Teknisi Bertugas", kpi2X + cardWidth - 4, y + 12, { align: "right" });

  // KPI 3: Avg Durasi
  const kpi3X = kpi2X + cardWidth + 3;
  doc.setFillColor(255, 251, 235); // Amber-50
  doc.setDrawColor(253, 230, 138); // Amber-200
  doc.roundedRect(kpi3X, y, cardWidth, cardHeight, 2, 2, "FD");
  doc.setFontSize(7);
  doc.setTextColor(180, 83, 9);
  doc.setFont("helvetica", "bold");
  doc.text("RATA-RATA DURASI", kpi3X + 4, y + 5);
  doc.setFontSize(11);
  doc.text(`${reportData.overallAvgDurationMinutes} Mnt`, kpi3X + 4, y + 12);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("Perbaikan", kpi3X + cardWidth - 4, y + 12, { align: "right" });

  // KPI 4: Kepatuhan BAST E-Sign
  const kpi4X = kpi3X + cardWidth + 3;
  doc.setFillColor(245, 243, 255); // Purple-50
  doc.setDrawColor(221, 214, 254); // Purple-200
  doc.roundedRect(kpi4X, y, cardWidth, cardHeight, 2, 2, "FD");
  doc.setFontSize(7);
  doc.setTextColor(109, 40, 217);
  doc.setFont("helvetica", "bold");
  doc.text("KEPATUHAN E-SIGN", kpi4X + 4, y + 5);
  doc.setFontSize(12);
  doc.text(`${reportData.overallSignedRatePercentage}%`, kpi4X + 4, y + 12);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text(`${reportData.totalSignedBast} BAST`, kpi4X + cardWidth - 4, y + 12, { align: "right" });

  y += cardHeight + 8;

  // Section 1: Ringkasan Aktivitas per Petugas (Table)
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("I. REKAPITULASI KINERJA PER PETUGAS LAPANGAN", margin, y);

  y += 4;

  // Table Header
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);

  doc.text("No", margin + 2, y + 4.5);
  doc.text("Nama Petugas", margin + 10, y + 4.5);
  doc.text("Divisi / Satuan Unit", margin + 55, y + 4.5);
  doc.text("WO Selesai", margin + 100, y + 4.5);
  doc.text("Darurat", margin + 120, y + 4.5);
  doc.text("Avg Waktu", margin + 138, y + 4.5);
  doc.text("BAST E-Sign", margin + 158, y + 4.5);

  y += 7;

  if (reportData.officerSummaries.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text("Tidak ada data pengerjaan selesai pada tanggal terpilih.", margin + 10, y + 6);
    y += 10;
  } else {
    reportData.officerSummaries.forEach((off, idx) => {
      const isAlt = idx % 2 === 1;
      if (isAlt) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6.5, "F");
      }

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);

      doc.text(String(idx + 1), margin + 2, y + 4.5);
      doc.setFont("helvetica", "bold");
      doc.text(off.officerName, margin + 10, y + 4.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`${off.divisionName} • ${off.unit}`, margin + 55, y + 4.5);

      doc.setTextColor(5, 150, 105);
      doc.setFont("helvetica", "bold");
      doc.text(`${off.totalCompleted} WO`, margin + 100, y + 4.5);

      doc.setTextColor(off.urgentCount > 0 ? 220 : 100, off.urgentCount > 0 ? 38 : 116, off.urgentCount > 0 ? 38 : 139);
      doc.text(`${off.urgentCount}`, margin + 120, y + 4.5);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      doc.text(`${off.averageDurationMinutes} mnt`, margin + 138, y + 4.5);

      doc.setTextColor(off.signedRatePercentage >= 80 ? 5 : 217, off.signedRatePercentage >= 80 ? 150 : 119, off.signedRatePercentage >= 80 ? 105 : 6);
      doc.setFont("helvetica", "bold");
      doc.text(`${off.signedCount}/${off.totalCompleted} (${off.signedRatePercentage}%)`, margin + 158, y + 4.5);

      y += 6.5;
    });

    // Total Row
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 6.5, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("TOTAL KESELURUHAN", margin + 10, y + 4.5);
    doc.text(`${reportData.totalCompletedTasks} WO`, margin + 100, y + 4.5);
    doc.text(`${reportData.totalUrgentTasks}`, margin + 120, y + 4.5);
    doc.text(`${reportData.overallAvgDurationMinutes} mnt`, margin + 138, y + 4.5);
    doc.text(`${reportData.totalSignedBast}/${reportData.totalCompletedTasks} (${reportData.overallSignedRatePercentage}%)`, margin + 158, y + 4.5);

    y += 9;
  }

  // Section 2: Rincian Pekerjaan Selesai
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("II. RINCIAN TIKET WORK ORDER SELESAI", margin, y);

  y += 4;

  // Detail table header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);

  doc.text("No", margin + 2, y + 4.5);
  doc.text("ID WO / Case ID", margin + 8, y + 4.5);
  doc.text("Pelanggan & Alamat", margin + 40, y + 4.5);
  doc.text("Kategori Keluhan", margin + 98, y + 4.5);
  doc.text("Petugas", margin + 135, y + 4.5);
  doc.text("Waktu", margin + 165, y + 4.5);

  y += 7;

  const maxTaskItemsToShow = 8;
  const tasksToRender = reportData.allTasks.slice(0, maxTaskItemsToShow);

  if (tasksToRender.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text("Tidak ada rincian tiket pekerjaan selesai.", margin + 10, y + 6);
    y += 10;
  } else {
    tasksToRender.forEach((task, idx) => {
      const isAlt = idx % 2 === 1;
      if (isAlt) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 8, "F");
      }

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);

      doc.text(String(idx + 1), margin + 2, y + 4);
      doc.setFont("helvetica", "bold");
      doc.text(task.id, margin + 8, y + 4);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(6);
      doc.text(`#${task.caseId}`, margin + 8, y + 7);

      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(task.customer.length > 24 ? task.customer.slice(0, 24) + "..." : task.customer, margin + 40, y + 4);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(6);
      doc.text(task.address.length > 32 ? task.address.slice(0, 32) + "..." : task.address, margin + 40, y + 7);

      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${task.category} (${task.divisionName})`, margin + 98, y + 5);

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(task.officerName.length > 18 ? task.officerName.slice(0, 18) + "..." : task.officerName, margin + 135, y + 5);

      const timeStr = task.completedAt ? new Date(task.completedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";
      doc.setFont("helvetica", "normal");
      doc.setTextColor(5, 150, 105);
      doc.text(`${timeStr} WIB`, margin + 165, y + 5);

      y += 8;
    });

    if (reportData.allTasks.length > maxTaskItemsToShow) {
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text(`* Menampilkan ${maxTaskItemsToShow} dari ${reportData.allTasks.length} total tiket. Ekspor file Excel untuk melihat seluruh riwayat lengkap.`, margin + 4, y + 4);
      y += 6;
    }
  }

  y = Math.max(y + 4, 252);

  // Sign-off / Signature section
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, margin + contentWidth, y);

  y += 5;
  const colW = contentWidth / 2;

  // Left Signatory: Koordinator Petugas Lapangan
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Disiapkan oleh,", margin + 15, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Koordinator Lapangan & Dispatcher", margin + 15, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("(Tanda Tangan & Cap)", margin + 15, y + 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Ir. Bambang Trihatmojo", margin + 15, y + 21);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("NIK. AETRA-DIST-8821", margin + 15, y + 24);

  // Right Signatory: Pengawas / Manager
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Diketahui & Diverifikasi oleh,", margin + colW + 15, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Manager Distribusi & Penanganan Gangguan", margin + colW + 15, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("(Tanda Tangan & Cap)", margin + colW + 15, y + 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Dr. Agus Sutrisno, S.T., M.T.", margin + colW + 15, y + 21);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("NIK. AETRA-MGR-0412", margin + colW + 15, y + 24);

  // Footer note
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Dokumen resmi PT Aetra Air Tangerang • Ref: DAL-${reportData.targetDate.replace(/-/g, "")} • Halaman 1 dari 1`,
    pageWidth / 2,
    pageHeight - 6,
    { align: "center" }
  );

  return doc;
}

/**
 * Trigger immediate download of the PDF Daily Activity Log
 */
export function downloadDailyActivityPdf(reportData: DailyActivityReportData): void {
  const doc = generateDailyActivityPdf(reportData);
  const fileName = `AETRA_Log_Aktivitas_Harian_${reportData.targetDate}.pdf`;
  doc.save(fileName);
}

/**
 * Helper to simulate or complete a work order for today so supervisors can test live
 */
export function simulateAddCompletedTaskForToday(officerName: string = "Agus Setiawan"): UnifiedTicket {
  const tickets = loadAllUnifiedTickets();
  const now = new Date();

  // Find an in-progress or new ticket, or create one
  let target = tickets.find((t) => t.status === "proses" || t.status === "baru");
  if (!target) {
    target = {
      id: `WO-${now.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      caseId: `100482${Math.floor(1000 + Math.random() * 9000)}`,
      customer: "Bpk. Wibowo Hartanto",
      phone: "081298765432",
      meterId: "MTR-66778",
      address: "Perum Graha Raya Blok H5 No. 12",
      area: "Cikupa",
      category: "KKMR",
      desc: "Perbaikan stop kran depan meter bocor",
      status: "selesai",
      urgent: false,
      coords: "-6.2241, 106.5142",
      receivedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      officer: officerName,
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      distributedAt: new Date(Date.now() - 3600000 * 2.5).toISOString(),
      completedAt: now.toISOString(),
      completionNotes: "Penggantian kran kuningan baru dan uji debit normal 1.9 bar.",
      usedMaterials: ["Stop Kran Kuningan 1/2\"", "Seal Tape Tebal"],
      customerSignerName: "Bpk. Wibowo",
      customerSignature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };
  } else {
    target.status = "selesai";
    target.officer = officerName;
    target.completedAt = now.toISOString();
    target.completionNotes = target.completionNotes || "Perbaikan telah selesai dilaksanakan tuntas oleh petugas.";
    target.usedMaterials = target.usedMaterials && target.usedMaterials.length > 0 ? target.usedMaterials : ["Stop Kran Kuningan 1/2\"", "Seal Tape Tebal"];
    target.customerSignerName = target.customer;
    target.customerSignature = target.customerSignature || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }

  saveSingleTicket(target);
  return target;
}
