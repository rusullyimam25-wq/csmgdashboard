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
  // === KOLOM KIRI (TABEL RESMI SLA AETRA) ===
  BPPD: {
    hours: 192,
    days: 8,
    label: "8 Hari Kerja (192 Jam)",
    categoryName: "Biaya Penambahan Pipa Dinas",
    urgency: "normal",
    description: "Kalkulasi dan administrasi biaya penambahan pipa dinas baru.",
  },
  BPPDIND: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Biaya Penambahan Pipa Dinas Industri",
    urgency: "medium",
    description: "Kalkulasi dan verifikasi biaya penambahan pipa dinas industri.",
  },
  "INFO-PLG": {
    hours: 24,
    days: 1,
    label: "1 Hari Kerja (24 Jam)",
    categoryName: "Info ke Pelanggan",
    urgency: "normal",
    description: "Penyampaian informasi resmi dan konfirmasi ke pelanggan.",
  },
  INFO_PLG: {
    hours: 24,
    days: 1,
    label: "1 Hari Kerja (24 Jam)",
    categoryName: "Info ke Pelanggan",
    urgency: "normal",
    description: "Penyampaian informasi resmi dan konfirmasi ke pelanggan.",
  },
  KATM: {
    hours: 24,
    days: 1,
    label: "24 Jam (1 Hari Kerja)",
    categoryName: "Air Tidak Mengalir Domestic",
    urgency: "critical",
    description: "Pemulihan suplai air bersih domestik segera dalam 24 jam.",
  },
  KATMIND: {
    hours: 24,
    days: 1,
    label: "24 Jam (1 Hari Kerja)",
    categoryName: "Air Tidak Mengalir Industri",
    urgency: "critical",
    description: "Pemulihan suplai air kawasan industri komersial (< 24 jam).",
  },
  KATR: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Air Kotor Domestic",
    urgency: "high",
    description: "Flushing jaringan dan perbaikan kualitas air keruh/kotor domestik.",
  },
  KATRIND: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Air Kotor Industri",
    urgency: "critical",
    description: "Pengurasan pipa & penjaminan mutu air proses industri.",
  },
  KBBP: {
    hours: 384,
    days: 16,
    label: "16 Hari Kerja (384 Jam)",
    categoryName: "Sudah Bayar Belum Pasang Meter",
    urgency: "normal",
    description: "Eksekusi pemasangan unit meter untuk sambungan baru pasca lunas biaya.",
  },
  KBGL: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Bekas Galian",
    urgency: "normal",
    description: "Perapian dan pengaspalan/pengecoran kembali bekas lubang galian pipa.",
  },
  KBSM: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Bocor Sebelum Meter",
    urgency: "high",
    description: "Perbaikan kebocoran pipa dinas/persil sebelum meteran air.",
  },
  KBSMIND: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Bocor Sebelum Meter Industri",
    urgency: "critical",
    description: "Perbaikan cepat kebocoran jalur pipa industri sebelum meter.",
  },
  KBTR: {
    hours: 96,
    days: 4,
    label: "4 Hari Kerja (96 Jam)",
    categoryName: "Belum Menerima Tagihan",
    urgency: "normal",
    description: "Penyampaian dan cetak ulang lembar tagihan air ke pelanggan.",
  },
  KBTT: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Sudah Bayar Tapi di Tagih",
    urgency: "medium",
    description: "Rekonsiliasi mutasi sistem pembayaran & penghapusan status tunggakan.",
  },
  KILL: {
    hours: 360,
    days: 15,
    label: "15 Hari Kerja (360 Jam)",
    categoryName: "Illegal Consumption",
    urgency: "high",
    description: "Investigasi, pembuktian dan penertiban sambungan konsumsi liar tanpa izin.",
  },
  KKMR: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Kran Meter Rusak",
    urgency: "high",
    description: "Penggantian stop kran / tuas putar meter air pelanggan.",
  },
  KKMRIND: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Kran Meter Rusak Industri",
    urgency: "critical",
    description: "Penggantian valve kran meter industri berdiameter besar.",
  },
  KLBC: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Pipa Jaringan Bocor",
    urgency: "critical",
    description: "Penanganan kebocoran pipa distribusi utama wilayah.",
  },
  KMAL: {
    hours: 120,
    days: 5,
    label: "5 Hari Kerja (120 Jam)",
    categoryName: "Meter Air Lepas",
    urgency: "medium",
    description: "Pemasangan kembali meter air yang terlepas dari dudukannya.",
  },
  KMALIND: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Meter Air Lepas Industri",
    urgency: "critical",
    description: "Pemasangan kembali meter air industri yang terlepas.",
  },
  KMDT: {
    hours: 120,
    days: 5,
    label: "5 Hari Kerja (120 Jam)",
    categoryName: "Meter Dipasang Terbalik",
    urgency: "medium",
    description: "Pembetulan arah panah aliran meter air di persil pelanggan.",
  },
  KMTA: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Meter Tidak Ada",
    urgency: "normal",
    description: "Verifikasi lapangan ketiadaan unit meter dan pengadaan unit baru.",
  },
  KPAP: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Perubahan Alamat Premise",
    urgency: "normal",
    description: "Pembaruan administrasi alamat persil bangunan pelanggan.",
  },
  KPAT: {
    hours: 24,
    days: 1,
    label: "1 Hari Kerja (24 Jam)",
    categoryName: "Perubahan Alamat Billing",
    urgency: "normal",
    description: "Pembaruan alamat penagihan dan pengiriman faktur rekening.",
  },
  KPCT: {
    hours: 240,
    days: 10,
    label: "10 Hari Kerja (240 Jam)",
    categoryName: "Pengajuan Cicilan Tagihan",
    urgency: "normal",
    description: "Verifikasi administrasi skema angsuran pembayaran tunggakan.",
  },

  // === KOLOM KANAN (TABEL RESMI SLA AETRA) ===
  KPDB: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Double Bayar",
    urgency: "normal",
    description: "Pemeriksaan mutasi ganda dan penyesuaian saldo tagihan ke depan.",
  },
  KPGP: {
    hours: 24,
    days: 1,
    label: "1 Hari Kerja (24 Jam)",
    categoryName: "Permintaan Balik Nama",
    urgency: "normal",
    description: "Proses administrasi perubahan kepemilikan nama pelanggan.",
  },
  KPKT: {
    hours: 24,
    days: 1,
    label: "1 Hari Kerja (24 Jam)",
    categoryName: "Penyambungan Kembali Akibat Tunggakan",
    urgency: "critical",
    description: "Buka segel dan penyambungan kembali stop kran pasca pelunasan tunggakan.",
  },
  KPMR: {
    hours: 96,
    days: 4,
    label: "4 Hari Kerja (96 Jam)",
    categoryName: "Meter Rusak",
    urgency: "high",
    description: "Penggantian unit meter air rusak/buram dengan unit yang telah ditera.",
  },
  KPMRIND: {
    hours: 120,
    days: 5,
    label: "5 Hari Kerja (120 Jam)",
    categoryName: "Meter Rusak Industri",
    urgency: "critical",
    description: "Penggantian flowmeter / meter elektromagnetik industri.",
  },
  KPPA: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Revisi Nama",
    urgency: "normal",
    description: "Koreksi ejaan nama pelanggan pada sistem penagihan.",
  },
  KPPM: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Perilaku Pembaca Meter",
    urgency: "normal",
    description: "Investigasi dan tindak lanjut laporan perilaku petugas pembaca meter.",
  },
  KPPR: {
    hours: 144,
    days: 6,
    label: "6 Hari Kerja (144 Jam)",
    categoryName: "Pipa Dinas Rusak",
    urgency: "high",
    description: "Perbaikan segmen pipa dinas distribusi persil yang rusak.",
  },
  KPPS: {
    hours: 720,
    days: 30,
    label: "30 Hari Kerja (720 Jam)",
    categoryName: "Permintaan Pemutusan Sambungan",
    urgency: "normal",
    description: "Administrasi dan penutupan jaringan sambungan pelanggan mandiri.",
  },
  KPPSIND: {
    hours: 720,
    days: 30,
    label: "30 Hari Kerja (720 Jam)",
    categoryName: "Permintaan Pemutusan Sambungan Industri",
    urgency: "normal",
    description: "Proses pemutusan kontrak sambungan industri dan pencopotan instalasi dinas.",
  },
  KPSB: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Salah Bayar",
    urgency: "normal",
    description: "Koreksi dan pengalihan transaksi salah bayar nomor meter.",
  },
  KPSM: {
    hours: 192,
    days: 8,
    label: "8 Hari Kerja (192 Jam)",
    categoryName: "Petugas Penyegelan",
    urgency: "normal",
    description: "Tindak lanjut evaluasi dan penanganan komplain terkait penyegelan.",
  },
  KRMT: {
    hours: 144,
    days: 6,
    label: "6 Hari Kerja (144 Jam)",
    categoryName: "Permintaan Relokasi Meter (teknis)",
    urgency: "medium",
    description: "Survei teknis dan pemindahan dudukan meter atas permintaan teknis.",
  },
  KRPR: {
    hours: 192,
    days: 8,
    label: "8 Hari Kerja (192 Jam)",
    categoryName: "Rekening Pembayaran Rendah",
    urgency: "normal",
    description: "Pemeriksaan stand meter dan akurasi putaran bila pemakaian terlalu rendah.",
  },
  KRPT: {
    hours: 240,
    days: 10,
    label: "10 Hari Kerja (240 Jam)",
    categoryName: "Rekening Pembayaran Tinggi",
    urgency: "medium",
    description: "Pemeriksaan menyeluruh lonjakan tagihan, instalasi persil, dan tera meter.",
  },
  KSPM: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Meter Tertukar",
    urgency: "normal",
    description: "Investigasi dan penataan nomor fisik meter yang tertukar antar persil.",
  },
  KTST: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Tidak Sesuai Tarif",
    urgency: "normal",
    description: "Pemeriksaan kesesuaian golongan tarif langganan.",
  },
  "KTST-RC": {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Tidak Sesuai Tarif - Re Class",
    urgency: "normal",
    description: "Penyesuaian dan reklasifikasi golongan tarif pelanggan.",
  },
  KTST_RC: {
    hours: 168,
    days: 7,
    label: "7 Hari Kerja (168 Jam)",
    categoryName: "Tidak Sesuai Tarif - Re Class",
    urgency: "normal",
    description: "Penyesuaian dan reklasifikasi golongan tarif pelanggan.",
  },
  LAPUL: {
    hours: 24,
    days: 1,
    label: "1 Hari Kerja (24 Jam)",
    categoryName: "Lapor Ulang",
    urgency: "critical",
    description: "Penanganan pengaduan berulang / eskalasi pelanggan.",
  },
  PPMI: {
    hours: 96,
    days: 4,
    label: "4 Hari Kerja (96 Jam)",
    categoryName: "Permintaan Penyesuaian Meter Industri",
    urgency: "medium",
    description: "Penyesuaian teknis dan kalibrasi unit meter komersial industri.",
  },
  TERAREQ: {
    hours: 360,
    days: 15,
    label: "15 Hari Kerja (360 Jam)",
    categoryName: "Tera Meter Request",
    urgency: "normal",
    description: "Pengujian akurasi meter di bangku tera laboratorium resmi.",
  },
  TR09: {
    hours: 288,
    days: 12,
    label: "12 Hari Kerja (288 Jam)",
    categoryName: "Pindah Meter",
    urgency: "normal",
    description: "Pekerjaan konstruksi pemindahan rute pipa dan dudukan meter baru.",
  },
  TRO9: {
    hours: 288,
    days: 12,
    label: "12 Hari Kerja (288 Jam)",
    categoryName: "Pindah Meter",
    urgency: "normal",
    description: "Pekerjaan konstruksi pemindahan rute pipa dan dudukan meter baru.",
  },
  TR09IND: {
    hours: 216,
    days: 9,
    label: "9 Hari Kerja (216 Jam)",
    categoryName: "Pindah Meter Industri",
    urgency: "medium",
    description: "Relokasi jalur pipa inlet dan meter pelanggan industri.",
  },
  TRO9IND: {
    hours: 216,
    days: 9,
    label: "9 Hari Kerja (216 Jam)",
    categoryName: "Pindah Meter Industri",
    urgency: "medium",
    description: "Relokasi jalur pipa inlet dan meter pelanggan industri.",
  },

  // Alias Tambahan & Kompatibilitas
  KP: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Bocor Sebelum Meter (Persil)",
    urgency: "high",
    description: "Perbaikan kebocoran pipa persil.",
  },
  KPIND: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Bocor Sebelum Meter Industri",
    urgency: "critical",
    description: "Perbaikan kebocoran pipa industri.",
  },
  KS: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Stop Kran / Segel Bocor",
    urgency: "high",
    description: "Perbaikan seal kran dan penyegelan ulang meter.",
  },
  KMR: {
    hours: 96,
    days: 4,
    label: "4 Hari Kerja (96 Jam)",
    categoryName: "Meter Rusak",
    urgency: "high",
    description: "Penggantian unit meter air rusak.",
  },
  KMRIND: {
    hours: 120,
    days: 5,
    label: "5 Hari Kerja (120 Jam)",
    categoryName: "Meter Rusak Industri",
    urgency: "critical",
    description: "Penggantian unit meter industri.",
  },
  PBL: {
    hours: 72,
    days: 3,
    label: "3 Hari Kerja (72 Jam)",
    categoryName: "Pipa Jaringan Bocor",
    urgency: "critical",
    description: "Penanganan kebocoran pipa distribusi utama.",
  },
  MM: {
    hours: 96,
    days: 4,
    label: "4 Hari Kerja (96 Jam)",
    categoryName: "Pemeriksaan Meter Air",
    urgency: "medium",
    description: "Cek fisik kondisi dan pembacaan stand meter.",
  },
  SMR: {
    hours: 360,
    days: 15,
    label: "15 Hari Kerja (360 Jam)",
    categoryName: "Tera Meter Request",
    urgency: "normal",
    description: "Pengujian kalibrasi meter air di bangku tera.",
  },
  KEC: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Air Kotor Domestic",
    urgency: "high",
    description: "Flushing dan penjaminan mutu air bersih.",
  },
  KECIND: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Air Kotor Industri",
    urgency: "critical",
    description: "Flushing dan penjaminan mutu air industri.",
  },
  KTR: {
    hours: 48,
    days: 2,
    label: "2 Hari Kerja (48 Jam)",
    categoryName: "Tekanan Air Rendah",
    urgency: "medium",
    description: "Pemeriksaan tekanan suplai air.",
  },
  KTRIND: {
    hours: 24,
    days: 1,
    label: "1 Hari Kerja (24 Jam)",
    categoryName: "Tekanan Rendah Industri",
    urgency: "critical",
    description: "Penyesuaian pompa pendorong suplai air industri.",
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
