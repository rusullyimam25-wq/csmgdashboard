/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Service Perhitungan & Tampilan Standar SLA Kasus Keluhan - PT Aetra Air Tangerang
 * Khusus Akun Handphone Petugas Lapangan & Dashboard
 */

export interface CaseSLARule {
  hours: number;
  days: number;
  label: string;
  categoryName: string;
  urgency: "critical" | "high" | "medium" | "normal";
  description: string;
}

/**
 * Matriks Resmi Standar Layanan (SLA) PT Aetra Air Tangerang Berdasarkan Kategori Kasus
 */
export const CASE_SLA_MATRIX: Record<string, CaseSLARule> = {
  // 1. Kritis / Air Tidak Mengalir (Target 24 Jam)
  KATM: {
    hours: 24,
    days: 1,
    label: "24 Jam (1 Hari Kerja)",
    categoryName: "Air Tidak Mengalir Domestic",
    urgency: "critical",
    description: "Pemulihan aliran air segera dalam 24 jam demi kebutuhan pokok pelanggan.",
  },
  KATMIND: {
    hours: 24,
    days: 1,
    label: "24 Jam (1 Hari Kerja)",
    categoryName: "Air Tidak Mengalir Industri",
    urgency: "critical",
    description: "Prioritas suplai air kawasan industri komersial (< 24 jam).",
  },

  // 2. Kebocoran & Pipa Rusak
  KBSM: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Bocor Sebelum Meter",
    urgency: "high",
    description: "Perbaikan pipa persil dinas sebelum meter untuk menekan NRW (Non-Revenue Water).",
  },
  KBSMIND: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Bocor Sebelum Meter Industri",
    urgency: "critical",
    description: "Penanganan cepat kebocoran jalur pipa industri.",
  },
  KP: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Kebocoran Pipa Persil",
    urgency: "high",
    description: "Perbaikan kebocoran pipa persil.",
  },
  KPIND: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Kebocoran Pipa Industri",
    urgency: "critical",
    description: "Perbaikan kebocoran pipa industri pipa dinas.",
  },
  KLBC: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Pipa Jaringan Bocor",
    urgency: "critical",
    description: "Penanganan kebocoran pipa distribusi utama wilayah.",
  },
  PBL: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Pipa Bocor Luar / Distribusi",
    urgency: "critical",
    description: "Penanganan kebocoran pipa distribusi luar persil.",
  },
  KPPR: {
    hours: 96,
    days: 4,
    label: "4 Hari Kerja (96 Jam)",
    categoryName: "Pipa Dinas Rusak",
    urgency: "high",
    description: "Perbaikan atau penggantian segmen pipa dinas yang patah/rusak.",
  },

  // 3. Kran Meter & Aksesoris
  KKMR: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Kran Meter Rusak",
    urgency: "high",
    description: "Penggantian stop kran / tuas putar meter air pelanggan.",
  },
  KKMRIND: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Kran Meter Rusak Industri",
    urgency: "critical",
    description: "Penggantian kran valve meter industri berdiameter besar.",
  },
  KS: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Stop Kran / Segel Bocor",
    urgency: "high",
    description: "Perbaikan seal kran dan penyegelan ulang meter.",
  },

  // 4. Fisik Meter Air & Penggantian
  KPMR: {
    hours: 96,
    days: 4,
    label: "4 Hari Kerja (96 Jam)",
    categoryName: "Meter Rusak / Buram / Berputar Cepat",
    urgency: "high",
    description: "Penggantian unit meter air rusak dengan unit yang telah ditera.",
  },
  KPMRIND: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Meter Rusak Industri",
    urgency: "critical",
    description: "Penggantian meter elektromagnetik / flowmeter industri.",
  },
  KMR: {
    hours: 96,
    days: 4,
    label: "4 Hari Kerja (96 Jam)",
    categoryName: "Meter Rusak / Macet",
    urgency: "high",
    description: "Penggantian meter air macet total.",
  },
  KMRIND: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Meter Rusak Industri",
    urgency: "critical",
    description: "Penggantian meter industri macet.",
  },
  KMAL: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Meter Air Lepas",
    urgency: "high",
    description: "Pemasangan kembali meter air yang terlepas dari dudukannya.",
  },
  KMALIND: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Meter Air Lepas Industri",
    urgency: "critical",
    description: "Pemasangan kembali sambungan meter air industri.",
  },
  KMDT: {
    hours: 120,
    days: 5,
    label: "5 Hari Kerja (120 Jam)",
    categoryName: "Meter Dipasang Terbalik",
    urgency: "medium",
    description: "Pembetulan arah panah aliran meter air di persil.",
  },
  KSPM: {
    hours: 96,
    days: 4,
    label: "4 Hari Kerja (96 Jam)",
    categoryName: "Meter Tertukar",
    urgency: "medium",
    description: "Investigasi dan penataan nomor meter tertukar antar rumah.",
  },
  MM: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Pemeriksaan Meter Air",
    urgency: "medium",
    description: "Cek fisik kondisi dan pembacaan stand meter.",
  },

  // 5. Kualitas Air & Tekanan
  KATR: {
    hours: 120,
    days: 5,
    label: "5 Hari Kerja (120 Jam)",
    categoryName: "Air Kotor / Keruh / Berbau Domestic",
    urgency: "medium",
    description: "Flushing hidran/pipa dinas & uji laboratorium kualitas air.",
  },
  KATRIND: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Air Kotor Industri",
    urgency: "critical",
    description: "Pengurasan pipa & penjaminan mutu air proses industri.",
  },
  KEC: {
    hours: 120,
    days: 5,
    label: "5 Hari Kerja (120 Jam)",
    categoryName: "Air Keruh / Berwarna",
    urgency: "medium",
    description: "Uji kekeruhan dan pembuangan endapan pipa persil.",
  },
  KECIND: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Air Keruh Industri",
    urgency: "critical",
    description: "Flushing dan penjaminan kejernihan air industri.",
  },
  KTR: {
    hours: 120,
    days: 5,
    label: "5 Hari Kerja (120 Jam)",
    categoryName: "Tekanan Air Rendah / Lemah",
    urgency: "medium",
    description: "Pemeriksaan manometer jaringan & pelacakan penyumbatan debit.",
  },
  KTRIND: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Tekanan Rendah Industri",
    urgency: "critical",
    description: "Penyetelan pompa pendorong suplai kawasan industri.",
  },

  // 6. Pekerjaan Khusus & Relokasi
  KBGL: {
    hours: 144,
    days: 6,
    label: "6 Hari Kerja (144 Jam)",
    categoryName: "Bekas Galian",
    urgency: "normal",
    description: "Perapian dan pengaspalan/pengecoran kembali bekas lubang galian pipa.",
  },
  KMTA: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Meter Tidak Ada / Hilang",
    urgency: "normal",
    description: "Verifikasi lapangan kehilangan meter dan pengadaan meter pengganti.",
  },
  TERAREQ: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Tera Meter Request",
    urgency: "normal",
    description: "Pencopotan meter untuk pengujian akurasi di meja tera lab resmi.",
  },
  SMR: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Tera / Akurasi Meter",
    urgency: "normal",
    description: "Pengujian kalibrasi meter air.",
  },
  TR09: {
    hours: 288,
    days: 12,
    label: "12 Hari Kerja (288 Jam)",
    categoryName: "Pindah Meter / Relokasi",
    urgency: "normal",
    description: "Pekerjaan konstruksi pemindahan rute pipa dan dudukan meter baru.",
  },
  TRO9: {
    hours: 288,
    days: 12,
    label: "12 Hari Kerja (288 Jam)",
    categoryName: "Pindah Meter / Relokasi",
    urgency: "normal",
    description: "Pekerjaan pemindahan rute pipa dan dudukan meter baru.",
  },
  TR09IND: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Pindah Meter Industri",
    urgency: "medium",
    description: "Relokasi jalur pipa inlet meter industri.",
  },
  TRO9IND: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Pindah Meter Industri",
    urgency: "medium",
    description: "Relokasi jalur pipa inlet meter industri.",
  },
  KRMT: {
    hours: 288,
    days: 12,
    label: "12 Hari Kerja (288 Jam)",
    categoryName: "Permintaan Relokasi Meter (teknis)",
    urgency: "normal",
    description: "Relokasi posisi meter atas permintaan teknis pelanggan.",
  },

  // 7. Penertiban, Tunggakan & Layanan Khusus
  KILL: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Illegal Consumption (Konsumsi Liar)",
    urgency: "critical",
    description: "Investigasi dan penertiban sambungan tanpa meter resmi.",
  },
  KPKT: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Penyambungan Kembali Akibat Tunggakan",
    urgency: "high",
    description: "Buka segel dan penyambungan kembali stop kran dinas pasca lunas tagihan.",
  },
  KBBP: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Sudah Bayar Belum Pasang Meter",
    urgency: "high",
    description: "Eksekusi pemasangan unit meter untuk sambungan baru.",
  },
  KBTT: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Sudah Bayar Tapi di Tagih",
    urgency: "medium",
    description: "Rekonsiliasi mutasi bank dan pembukaan status tagihan.",
  },
  KBTR: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Belum Menerima Tagihan",
    urgency: "medium",
    description: "Distribusi cetak ulang surat tagihan air ke pelanggan.",
  },
  KRPT: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Rekening Pembayaran Tinggi (Lonjakan Tagihan)",
    urgency: "medium",
    description: "Pemeriksaan stand meter, cek kebocoran pipa instalasi dalam persil & uji tera.",
  },
  KRPR: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Rekening Pembayaran Rendah",
    urgency: "normal",
    description: "Cek akurasi pembacaan meter dan kelayakan putaran mekanik.",
  },
  KPCT: {
    hours: 120,
    days: 5,
    label: "5 Hari Kerja (120 Jam)",
    categoryName: "Pengajuan Cicilan Tagihan",
    urgency: "normal",
    description: "Verifikasi perjanjian angsuran pembayaran tunggakan.",
  },
  INFO_PLG: {
    hours: 24,
    days: 1,
    label: "24 Jam (1 Hari)",
    categoryName: "Info ke Pelanggan",
    urgency: "normal",
    description: "Penyampaian informasi resmi ke pelanggan.",
  },
};

export interface TicketSLAStatus {
  categoryKey: string;
  categoryName: string;
  slaRule: CaseSLARule;
  targetHours: number;
  targetDays: number;
  durationLabel: string;
  isUrgentOverride: boolean;
  receivedDate: Date;
  deadlineDate: Date;
  deadlineFormatted: string;
  isCompleted: boolean;
  completedDate?: Date;
  isOverdue: boolean;
  remainingHours: number;
  remainingMinutes: number;
  remainingLabel: string;
  elapsedHours: number;
  progressPercent: number; // 0 - 100
  urgencyLevel: "critical" | "high" | "warning" | "normal" | "completed";
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
  statusBadgeText: string;
  summaryText: string;
}

/**
 * Mengambil aturan SLA untuk kode kategori tertentu
 */
export function getCaseSLARule(category: string, urgent: boolean = false): CaseSLARule {
  const key = (category || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  let rule = CASE_SLA_MATRIX[key];

  if (!rule) {
    const cleanKey = key.replace(/IND$/, "");
    rule = CASE_SLA_MATRIX[cleanKey];
  }

  if (!rule) {
    rule = {
      hours: 72,
      days: 3,
      label: "3 Hari Kerja (72 Jam)",
      categoryName: category || "Penanganan Gangguan Teknis",
      urgency: "medium",
      description: "Standar penanganan reguler operasional Aetra Tangerang.",
    };
  }

  // Jika ditandai darurat / urgent oleh dispatch kantor, target SLA dipersingkat menjadi maksimal 24 jam
  if (urgent) {
    return {
      hours: Math.min(rule.hours, 24),
      days: 1,
      label: "🚨 Darurat: Maks. 24 Jam",
      categoryName: `${rule.categoryName} [PRIORITAS TINGGI]`,
      urgency: "critical",
      description: `Prioritas darurat penanganan kasus lapangan (maksimal 24 jam).`,
    };
  }

  return rule;
}

/**
 * Format tanggal dalam format Indonesia yang rapi untuk layar smartphone
 */
export function formatSLADate(d: Date): string {
  try {
    const day = String(d.getDate()).padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const month = months[d.getMonth()] || "Bln";
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month}, ${hours}:${minutes} WIB`;
  } catch (_) {
    return "-";
  }
}

/**
 * Menghitung detail lengkap status SLA penyelesaian untuk tiket tertentu
 */
export function calculateTicketSLA(
  ticket: {
    category: string;
    receivedAt: string;
    status: string;
    completedAt?: string;
    urgent?: boolean;
  }
): TicketSLAStatus {
  const rule = getCaseSLARule(ticket.category, Boolean(ticket.urgent));
  const received = new Date(ticket.receivedAt);
  const now = new Date();
  const isCompleted = ticket.status === "selesai";
  const completedDate = ticket.completedAt ? new Date(ticket.completedAt) : undefined;

  // Deadline = receivedAt + SLA hours
  const targetMs = rule.hours * 60 * 60 * 1000;
  const deadline = new Date(received.getTime() + targetMs);

  // Waktu pembanding: Jika sudah selesai gunakan completedDate, jika belum gunakan waktu sekarang
  const checkTime = isCompleted && completedDate ? completedDate : now;
  const elapsedMs = checkTime.getTime() - received.getTime();
  const elapsedHours = Math.max(0, Math.round((elapsedMs / (1000 * 60 * 60)) * 10) / 10);

  const diffMs = deadline.getTime() - checkTime.getTime();
  const isOverdue = diffMs < 0;

  const totalRemainingMinutes = Math.floor(Math.abs(diffMs) / (1000 * 60));
  const remainingHours = Math.floor(totalRemainingMinutes / 60);
  const remainingMinutes = totalRemainingMinutes % 60;

  // Progress Bar Percentage (clamped between 0 and 100)
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / targetMs) * 100)));

  let urgencyLevel: "critical" | "high" | "warning" | "normal" | "completed" = "normal";
  let badgeBg = "#EFF6FF";
  let badgeColor = "#1D4ED8";
  let badgeBorder = "#BFDBFE";
  let statusBadgeText = "";
  let remainingLabel = "";

  if (isCompleted) {
    urgencyLevel = "completed";
    if (isOverdue) {
      badgeBg = "#FEF3C7";
      badgeColor = "#B45309";
      badgeBorder = "#FCD34D";
      statusBadgeText = `⚠️ Selesai Lewat SLA (+${remainingHours}h)`;
      remainingLabel = `Diselesaikan ${elapsedHours} jam (Target: ${rule.hours} jam)`;
    } else {
      badgeBg = "#ECFDF5";
      badgeColor = "#065F46";
      badgeBorder = "#A7F3D0";
      statusBadgeText = `✅ Tepat SLA (${elapsedHours} jam)`;
      remainingLabel = `Selesai tepat waktu sebelum batas SLA`;
    }
  } else if (isOverdue) {
    urgencyLevel = "critical";
    badgeBg = "#FEF2F2";
    badgeColor = "#DC2626";
    badgeBorder = "#FECACA";
    statusBadgeText = `🚨 Terlambat (+${remainingHours}j ${remainingMinutes}m)`;
    remainingLabel = `Overdue SLA! Lewat ${remainingHours} jam ${remainingMinutes} menit`;
  } else if (remainingHours <= 6 || (rule.hours <= 24 && remainingHours <= 4)) {
    urgencyLevel = "warning";
    badgeBg = "#FFFBEB";
    badgeColor = "#D97706";
    badgeBorder = "#FDE68A";
    statusBadgeText = `⏳ Kritis: Sisa ${remainingHours}j ${remainingMinutes}m`;
    remainingLabel = `Mendekati batas waktu! Sisa ${remainingHours} jam ${remainingMinutes} menit`;
  } else {
    urgencyLevel = rule.urgency === "critical" ? "high" : "normal";
    badgeBg = "#F0F9FF";
    badgeColor = "#0369A1";
    badgeBorder = "#BAE6FD";
    if (remainingHours >= 24) {
      const remDays = Math.floor(remainingHours / 24);
      const remH = remainingHours % 24;
      statusBadgeText = `⏱️ Sisa ${remDays}h ${remH}j`;
      remainingLabel = `Sisa waktu: ${remDays} hari ${remH} jam`;
    } else {
      statusBadgeText = `⏱️ Sisa ${remainingHours}j ${remainingMinutes}m`;
      remainingLabel = `Sisa waktu pengerjaan: ${remainingHours} jam ${remainingMinutes} menit`;
    }
  }

  const durationLabel = rule.label;
  const deadlineFormatted = formatSLADate(deadline);
  const summaryText = `SLA Kategori ${ticket.category || "-"}: Maksimal ${durationLabel} (Batas: ${deadlineFormatted})`;

  return {
    categoryKey: ticket.category,
    categoryName: rule.categoryName,
    slaRule: rule,
    targetHours: rule.hours,
    targetDays: rule.days,
    durationLabel,
    isUrgentOverride: Boolean(ticket.urgent),
    receivedDate: received,
    deadlineDate: deadline,
    deadlineFormatted,
    isCompleted,
    completedDate,
    isOverdue,
    remainingHours,
    remainingMinutes,
    remainingLabel,
    elapsedHours,
    progressPercent,
    urgencyLevel,
    badgeBg,
    badgeColor,
    badgeBorder,
    statusBadgeText,
    summaryText,
  };
}

/**
 * Membuat elemen UI DOM berupa Kartu SLA Kompak & Informatif untuk tampilan Handphone Petugas
 */
export function createMobileSLABadge(
  ticket: {
    category: string;
    receivedAt: string;
    status: string;
    completedAt?: string;
    urgent?: boolean;
  },
  options: { isCompact?: boolean; showProgressBar?: boolean } = {}
): HTMLElement {
  const sla = calculateTicketSLA(ticket);
  const isCompact = options.isCompact ?? false;
  const showProgressBar = options.showProgressBar ?? true;

  const container = document.createElement("div");
  container.className = `mobile-sla-box ${sla.isOverdue ? "sla-overdue" : ""}`;
  container.style.cssText = `
    background: ${sla.badgeBg};
    border: 1px solid ${sla.badgeBorder};
    border-radius: 8px;
    padding: ${isCompact ? "6px 8px" : "8px 10px"};
    margin-top: 4px;
    margin-bottom: 2px;
    font-size: 11px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    transition: all 0.2s ease;
  `;

  // Row 1: Header SLA Kategori & Status Badge
  const rowTop = document.createElement("div");
  rowTop.style.cssText = "display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap;";

  const labelDiv = document.createElement("div");
  labelDiv.style.cssText = `display: flex; align-items: center; gap: 5px; font-weight: 800; color: ${sla.badgeColor}; font-size: 11px;`;
  labelDiv.innerHTML = `
    <span style="font-size: 13px;">⏱️</span>
    <span>Target SLA: <strong style="text-decoration: underline; font-weight: 900;">${sla.durationLabel}</strong></span>
  `;

  const statusBadge = document.createElement("span");
  statusBadge.style.cssText = `
    font-size: 10px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 6px;
    background: ${sla.isOverdue ? "#DC2626" : sla.urgencyLevel === "warning" ? "#D97706" : sla.isCompleted ? "#059669" : "#0284C7"};
    color: #FFFFFF;
    letter-spacing: 0.2px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  `;
  statusBadge.textContent = sla.statusBadgeText;

  rowTop.appendChild(labelDiv);
  rowTop.appendChild(statusBadge);
  container.appendChild(rowTop);

  // Row 2: Batas Waktu Penyelesaian & Sisa Waktu
  const rowBottom = document.createElement("div");
  rowBottom.style.cssText = "display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #475569; gap: 6px;";

  const deadlineSpan = document.createElement("span");
  deadlineSpan.innerHTML = `🎯 Batas: <strong style="color: #1E293B;">${sla.deadlineFormatted}</strong>`;

  const countdownSpan = document.createElement("span");
  countdownSpan.style.cssText = `font-weight: 700; color: ${sla.isOverdue ? "#DC2626" : sla.urgencyLevel === "warning" ? "#D97706" : "#0F172A"};`;
  countdownSpan.textContent = sla.remainingLabel;

  rowBottom.appendChild(deadlineSpan);
  rowBottom.appendChild(countdownSpan);
  container.appendChild(rowBottom);

  // Row 3: Progress Bar Visual SLA (jika belum selesai)
  if (showProgressBar && !sla.isCompleted) {
    const progressTrack = document.createElement("div");
    progressTrack.style.cssText = "width: 100%; height: 5px; background: rgba(0,0,0,0.08); border-radius: 3px; overflow: hidden; margin-top: 2px;";

    const barColor = sla.isOverdue
      ? "#DC2626"
      : sla.urgencyLevel === "warning"
      ? "#F59E0B"
      : "#0284C7";

    const progressBar = document.createElement("div");
    progressBar.style.cssText = `
      width: ${sla.progressPercent}%;
      height: 100%;
      background: ${barColor};
      border-radius: 3px;
      transition: width 0.4s ease;
    `;
    progressTrack.appendChild(progressBar);
    container.appendChild(progressTrack);
  }

  return container;
}
