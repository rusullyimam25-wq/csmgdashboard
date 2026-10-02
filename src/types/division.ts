/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Multi-Divisional Types & Configuration - Aetra Air Tangerang
 */

export type DivisionId =
  | "customer_service"
  | "minor_repair"
  | "sales_support"
  | "key_account"
  | "technical_support";

export interface DivisionMeta {
  id: DivisionId;
  name: string;
  shortName: string;
  tagline: string;
  icon: string;
  badgeColor: string;
  badgeBg: string;
  borderColor: string;
  gradient: string;
  defaultAdminEmail: string;
  defaultAdminName: string;
  description: string;
}

export const DIVISIONS: Record<DivisionId, DivisionMeta> = {
  customer_service: {
    id: "customer_service",
    name: "Customer Service & Contact Center",
    shortName: "Customer Service",
    tagline: "Gerbang Awal Penerimaan & Distribusi Komplain Pelanggan",
    icon: "🎧",
    badgeColor: "#0284C7",
    badgeBg: "#EFF6FF",
    borderColor: "#BFDBFE",
    gradient: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
    defaultAdminEmail: "cs.admin@aetra.co.id",
    defaultAdminName: "Putri Delia (Supervisor CS & Dispatcher)",
    description: "Menerima pengaduan pelanggan 24/7, validasi data sambungan, verifikasi keluhan, dan mendistribusikan Work Order ke divisi teknis terkait.",
  },
  minor_repair: {
    id: "minor_repair",
    name: "Divisi Minor Repair (Teknik Lapangan)",
    shortName: "Minor Repair",
    tagline: "Penanganan Gangguan Kebocoran Pipa & Penggantian Meter Air",
    icon: "🛠️",
    badgeColor: "#D97706",
    badgeBg: "#FFFBEB",
    borderColor: "#FDE68A",
    gradient: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
    defaultAdminEmail: "minor.repair@aetra.co.id",
    defaultAdminName: "Ir. Bambang Trihatmojo (Koordinator Lapangan)",
    description: "Eksekusi perbaikan kebocoran pipa persil/dinas, penggantian meter air macet/rusak, stop kran, dokumentasi GPS & BAST serah terima.",
  },
  sales_support: {
    id: "sales_support",
    name: "Operasional Sales Support (OSS)",
    shortName: "Sales Support",
    tagline: "Administrasi Kepelangganan, Billing, Rekening & Sambungan Baru",
    icon: "💼",
    badgeColor: "#059669",
    badgeBg: "#ECFDF5",
    borderColor: "#A7F3D0",
    gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    defaultAdminEmail: "sales.support@aetra.co.id",
    defaultAdminName: "Dewi Lestari, S.E. (Head of Sales Support)",
    description: "Verifikasi administrasi, penyesuaian rekening tinggi (KRPT), cicilan tagihan, balik nama, permohonan pipa dinas baru, dan penyambungan kembali tunggakan.",
  },
  key_account: {
    id: "key_account",
    name: "Technical Key Account (TKA)",
    shortName: "Key Account",
    tagline: "Layanan Prioritas Kawasan Industri, Pabrik & Niaga Besar",
    icon: "🏢",
    badgeColor: "#7C3AED",
    badgeBg: "#F5F3FF",
    borderColor: "#DDD6FE",
    gradient: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
    defaultAdminEmail: "key.account@aetra.co.id",
    defaultAdminName: "H. Rudi Hartono, S.T. (Senior Key Account Specialist)",
    description: "Penanganan komplain debit, tekanan, dan perbaikan pipa kawasan industri dengan SLA prioritas tinggi (< 24 jam) serta berita acara industri.",
  },
  technical_support: {
    id: "technical_support",
    name: "Technical Support & Laboratorium",
    shortName: "Tech Support",
    tagline: "Pengujian Kualitas Air, Uji Akurasi Tera Meter & Penertiban",
    icon: "🔬",
    badgeColor: "#DC2626",
    badgeBg: "#FEF2F2",
    borderColor: "#FECACA",
    gradient: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)",
    defaultAdminEmail: "tech.support@aetra.co.id",
    defaultAdminName: "Dr. Agus Sutrisno (Manager Technical Support & Lab)",
    description: "Investigasi kualitas air (kekeruhan, bau, sisa klorin), flushing jaringan, tera meter uji akurasi bangku tera, dan penertiban konsumsi ilegal.",
  },
};

export interface DivisionUserSession {
  email: string;
  name: string;
  divisionId: DivisionId;
  role: "admin" | "supervisor" | "officer";
  loginAt: string;
  username?: string;
}

export interface TicketComment {
  id: string;
  authorName: string;
  authorDivision: DivisionId;
  authorRole?: string;
  content: string;
  createdAt: string;
  targetDepartment?: string;
}

export interface CaseCategoryItem {
  key: string;
  name: string;
  defaultDiv: DivisionId;
  slaDays: number;
}

/**
 * Matriks Standar Layanan (SLA dalam Hari Kerja) Berdasarkan Standar Kasus PT Aetra Air Tangerang
 */
export const AETRA_CASE_SLA_DAYS: Record<string, number> = {
  // Kolom Kiri
  "BPPD": 8,
  "BPPDIND": 7,
  "INFO-PLG": 1,
  "INFO_PLG": 1,
  "KATM": 1,
  "KATMIND": 1,
  "KATR": 2,
  "KATRIND": 2,
  "KBBP": 16,
  "KBGL": 7,
  "KBSM": 3,
  "KBSMIND": 3,
  "KBTR": 4,
  "KBTT": 7,
  "KILL": 15,
  "KKMR": 3,
  "KKMRIND": 3,
  "KLBC": 3,
  "KMAL": 5,
  "KMALIND": 3,
  "KMDT": 5,
  "KMTA": 7,
  "KPAP": 2,
  "KPAT": 1,
  "KPCT": 10,

  // Kolom Kanan
  "KPDB": 7,
  "KPGP": 1,
  "KPKT": 1,
  "KPMR": 4,
  "KPMRIND": 5,
  "KPPA": 3,
  "KPPM": 7,
  "KPPR": 6,
  "KPPS": 30,
  "KPPSIND": 30,
  "KPSB": 3,
  "KPSM": 8,
  "KRMT": 6,
  "KRPR": 8,
  "KRPT": 10,
  "KSPM": 7,
  "KTST": 7,
  "KTST-RC": 7,
  "KTST_RC": 7,
  "LAPUL": 1,
  "PPMI": 4,
  "TERAREQ": 15,
  "TR09": 12,
  "TRO9": 12,
  "TR09IND": 9,
  "TRO9IND": 9,
};

/**
 * Mengambil SLA hari kerja berdasarkan kode kategori kasus Aetra
 */
export function getAetraCaseSlaDays(category: string): number {
  const cat = (category || "").toUpperCase().trim().replace(/[^A-Z0-9_-]/g, "");
  if (AETRA_CASE_SLA_DAYS[cat] !== undefined) {
    return AETRA_CASE_SLA_DAYS[cat];
  }
  const cleanKey = cat.replace(/IND$/, "");
  if (AETRA_CASE_SLA_DAYS[cleanKey] !== undefined) {
    return AETRA_CASE_SLA_DAYS[cleanKey];
  }
  return 3; // Default 3 hari kerja
}

/**
 * Daftar Resmi 47 Jenis Case / Keluhan Pelanggan PT Aetra Air Tangerang
 * (Sesuai Matriks Resmi Operasional & SLA Aetra)
 */
export const AETRA_CASE_CATEGORIES: CaseCategoryItem[] = [
  // Kolom Kiri
  { key: "BPPD", name: "Biaya Penambahan Pipa Dinas", defaultDiv: "sales_support", slaDays: 8 },
  { key: "BPPDIND", name: "Biaya Penambahan Pipa Dinas Industri", defaultDiv: "key_account", slaDays: 7 },
  { key: "INFO-PLG", name: "Info ke Pelanggan", defaultDiv: "sales_support", slaDays: 1 },
  { key: "KATM", name: "Air Tidak Mengalir Domestic", defaultDiv: "technical_support", slaDays: 1 },
  { key: "KATMIND", name: "Air Tidak Mengalir Industri", defaultDiv: "key_account", slaDays: 1 },
  { key: "KATR", name: "Air Kotor Domestic", defaultDiv: "technical_support", slaDays: 2 },
  { key: "KATRIND", name: "Air Kotor Industri", defaultDiv: "key_account", slaDays: 2 },
  { key: "KBBP", name: "Sudah Bayar Belum Pasang Meter", defaultDiv: "sales_support", slaDays: 16 },
  { key: "KBGL", name: "Bekas Galian", defaultDiv: "minor_repair", slaDays: 7 },
  { key: "KBSM", name: "Bocor Sebelum Meter", defaultDiv: "minor_repair", slaDays: 3 },
  { key: "KBSMIND", name: "Bocor Sebelum Meter Industri", defaultDiv: "key_account", slaDays: 3 },
  { key: "KBTR", name: "Belum Menerima Tagihan", defaultDiv: "sales_support", slaDays: 4 },
  { key: "KBTT", name: "Sudah Bayar Tapi di Tagih", defaultDiv: "sales_support", slaDays: 7 },
  { key: "KILL", name: "Illegal Consumption", defaultDiv: "technical_support", slaDays: 15 },
  { key: "KKMR", name: "Kran Meter Rusak", defaultDiv: "minor_repair", slaDays: 3 },
  { key: "KKMRIND", name: "Kran Meter Rusak Industri", defaultDiv: "key_account", slaDays: 3 },
  { key: "KLBC", name: "Pipa Jaringan Bocor", defaultDiv: "minor_repair", slaDays: 3 },
  { key: "KMAL", name: "Meter Air Lepas", defaultDiv: "minor_repair", slaDays: 5 },
  { key: "KMALIND", name: "Meter Air Lepas Industri", defaultDiv: "key_account", slaDays: 3 },
  { key: "KMDT", name: "Meter Dipasang Terbalik", defaultDiv: "minor_repair", slaDays: 5 },
  { key: "KMTA", name: "Meter Tidak Ada", defaultDiv: "technical_support", slaDays: 7 },
  { key: "KPAP", name: "Perubahan Alamat Premise", defaultDiv: "sales_support", slaDays: 2 },
  { key: "KPAT", name: "Perubahan Alamat Billing", defaultDiv: "sales_support", slaDays: 1 },
  { key: "KPCT", name: "Pengajuan Cicilan Tagihan", defaultDiv: "sales_support", slaDays: 10 },

  // Kolom Kanan
  { key: "KPDB", name: "Double Bayar", defaultDiv: "sales_support", slaDays: 7 },
  { key: "KPGP", name: "Permintaan Balik Nama", defaultDiv: "sales_support", slaDays: 1 },
  { key: "KPKT", name: "Penyambungan Kembali Akibat Tunggakan", defaultDiv: "sales_support", slaDays: 1 },
  { key: "KPMR", name: "Meter Rusak", defaultDiv: "minor_repair", slaDays: 4 },
  { key: "KPMRIND", name: "Meter Rusak Industri", defaultDiv: "key_account", slaDays: 5 },
  { key: "KPPA", name: "Revisi Nama", defaultDiv: "sales_support", slaDays: 3 },
  { key: "KPPM", name: "Perilaku Pembaca Meter", defaultDiv: "technical_support", slaDays: 7 },
  { key: "KPPR", name: "Pipa Dinas Rusak", defaultDiv: "minor_repair", slaDays: 6 },
  { key: "KPPS", name: "Permintaan Pemutusan Sambungan", defaultDiv: "sales_support", slaDays: 30 },
  { key: "KPPSIND", name: "Permintaan Pemutusan Sambungan Industri", defaultDiv: "key_account", slaDays: 30 },
  { key: "KPSB", name: "Salah Bayar", defaultDiv: "sales_support", slaDays: 3 },
  { key: "KPSM", name: "Petugas Penyegelan", defaultDiv: "technical_support", slaDays: 8 },
  { key: "KRMT", name: "Permintaan Relokasi Meter (teknis)", defaultDiv: "minor_repair", slaDays: 6 },
  { key: "KRPR", name: "Rekening Pembayaran Rendah", defaultDiv: "sales_support", slaDays: 8 },
  { key: "KRPT", name: "Rekening Pembayaran Tinggi", defaultDiv: "sales_support", slaDays: 10 },
  { key: "KSPM", name: "Meter Tertukar", defaultDiv: "technical_support", slaDays: 7 },
  { key: "KTST", name: "Tidak Sesuai Tarif", defaultDiv: "sales_support", slaDays: 7 },
  { key: "KTST-RC", name: "Tidak Sesuai Tarif - Re Class", defaultDiv: "sales_support", slaDays: 7 },
  { key: "LAPUL", name: "Lapor Ulang", defaultDiv: "sales_support", slaDays: 1 },
  { key: "PPMI", name: "Permintaan Penyesuaian Meter Industri", defaultDiv: "key_account", slaDays: 4 },
  { key: "TERAREQ", name: "Tera Meter Request", defaultDiv: "technical_support", slaDays: 15 },
  { key: "TR09", name: "Pindah Meter", defaultDiv: "minor_repair", slaDays: 12 },
  { key: "TR09IND", name: "Pindah Meter Industri", defaultDiv: "key_account", slaDays: 9 },
];

/**
 * Smart Category to Division Mapping Rules
 */
export const CATEGORY_DIVISION_ROUTING: Record<string, DivisionId> = {
  // Minor Repair
  KBSM: "minor_repair",
  KP: "minor_repair",
  KPPR: "minor_repair",
  KKMR: "minor_repair",
  KS: "minor_repair",
  KPMR: "minor_repair",
  KMR: "minor_repair",
  KMDT: "minor_repair",
  KMAL: "minor_repair",
  KLBC: "minor_repair",
  TRO9: "minor_repair",
  TR09: "minor_repair",
  KBGL: "minor_repair",
  KRMT: "minor_repair",

  // Operasional Sales Support
  BPPD: "sales_support",
  "INFO-PLG": "sales_support",
  KBBP: "sales_support",
  KBTR: "sales_support",
  KBTT: "sales_support",
  KPAP: "sales_support",
  KPAT: "sales_support",
  KPCT: "sales_support",
  KPDB: "sales_support",
  KPGP: "sales_support",
  KPKT: "sales_support",
  KPPA: "sales_support",
  KPPS: "sales_support",
  KPSB: "sales_support",
  KRPR: "sales_support",
  KRPT: "sales_support",
  KTST: "sales_support",
  "KTST-RC": "sales_support",
  LAPUL: "sales_support",

  // Technical Key Account (Industri)
  BPPDIND: "key_account",
  KATMIND: "key_account",
  KATRIND: "key_account",
  KBSMIND: "key_account",
  KKMRIND: "key_account",
  KMALIND: "key_account",
  KPMRIND: "key_account",
  KPPSIND: "key_account",
  PPMI: "key_account",
  TRO9IND: "key_account",
  TR09IND: "key_account",
  KTRIND: "key_account",
  KPIND: "key_account",

  // Technical Support (Kualitas, Tera, Tekanan, Ilegal)
  KATR: "technical_support",
  KATM: "technical_support",
  KEC: "technical_support",
  TERAREQ: "technical_support",
  SMR: "technical_support",
  MM: "technical_support",
  KILL: "technical_support",
  KTR: "technical_support",
  KMTA: "technical_support",
  KPSM: "technical_support",
  KPPM: "technical_support",
  KSPM: "technical_support",
};

/**
 * Determine default target division from complaint category
 */
export function getRecommendedDivision(categoryKey: string): DivisionId {
  const cleanKey = (categoryKey || "").trim().toUpperCase();
  if (CATEGORY_DIVISION_ROUTING[cleanKey]) {
    return CATEGORY_DIVISION_ROUTING[cleanKey];
  }
  if (cleanKey.endsWith("IND") || cleanKey.includes("IND") || cleanKey === "PPMI") {
    return "key_account";
  }
  return "minor_repair";
}
