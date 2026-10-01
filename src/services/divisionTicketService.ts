/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unified Multi-Divisional Ticket Synchronization Service - Aetra Air Tangerang
 */

import { DivisionId, DivisionUserSession, DIVISIONS, getRecommendedDivision, TicketComment } from "../types/division";
import { dispatchFCMNotificationToOfficer } from "./fcmNotificationService";

export interface UnifiedTicket {
  id: string;
  caseId?: string;
  customer: string;
  phone: string;
  meterId: string;
  address: string;
  area: string;
  category: string;
  desc: string;
  status: "baru" | "proses" | "selesai";
  urgent: boolean;
  coords?: string;
  receivedAt: string;
  officer?: string;
  rescheduledDate?: string | null;
  photoBefore?: string | null;
  photoAfter?: string | null;
  completionNotes?: string;
  usedMaterials?: string[];
  customerSignature?: string | null;
  customerSignerName?: string;
  officerSignature?: string | null;
  completedAt?: string;
  driveFileUrl?: string;

  // Multi-divisional attributes
  targetDivision: DivisionId;
  distributionStatus: "draft" | "distributed" | "received" | "in_progress" | "resolved";
  distributedAt?: string;
  distributedBy?: string;
  distributionNotes?: string;
  intakeChannel?: "WhatsApp CS" | "Telepon / Phone" | "Contact Center" | "Call Center 24 Jam" | "Email" | "Walk In" | "Loket Kantor" | "Mobile App" | "Media Sosial" | string;
  divisionAssignee?: string;
  divisionActionNotes?: string;
  resolutionSummary?: string;

  // Inter-department comments & updates feed
  comments?: TicketComment[];

  // Auto-rollover tracking (komplain tidak dikerjakan hari ini otomatis pindah ke hari berikutnya)
  isRolledOver?: boolean;
  rolloverCount?: number;
  lastRolloverAt?: string;
  originalScheduledDate?: string;
}

const LOCAL_STORAGE_KEY = "aetra_work_orders_backup";
const SESSION_STORAGE_KEY = "aetra_active_division_session";
const TABLE = "complaints";

const SUPABASE_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_SUPABASE_URL) ||
  "https://bprmrbwmoadocyslhsqr.supabase.co";

const SUPABASE_ANON_KEY =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwcm1yYndtb2Fkb2N5c2xoc3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzODc4ODgsImV4cCI6MjEwNDk2Mzg4OH0.oaCUIBFy2ii_ZBrR-XMpuL-UsGvTaH2CGmTpncvf5K8";

// @ts-ignore
const sb = (typeof window !== "undefined" && (window as any).supabase)
  ? // @ts-ignore
    (window as any).supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/**
 * Manage Division Admin Login Session
 */
export function getActiveDivisionSession(): DivisionUserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

export function setActiveDivisionSession(session: DivisionUserSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (_) {}
}

export function clearActiveDivisionSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (_) {}
}

/**
 * Generate Case ID
 */
export function generateCaseId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  return "100" + String(Math.abs(hash)).padStart(7, "0").slice(-7);
}

/**
 * Initial Multi-Divisional Seed Tickets
 */
export function getInitialSeedTickets(): UnifiedTicket[] {
  const now = Date.now();
  const h = (hoursAgo: number) => new Date(now - hoursAgo * 3600000).toISOString();
  const dt = (month: number, day: number, hour = 9) => new Date(2026, month - 1, day, hour, 0, 0).toISOString();

  return [
    // 1. Minor Repair ticket
    {
      id: "WO-2026-001",
      caseId: "1004829101",
      customer: "Bpk. Suherman",
      meterId: "MTR-88291",
      phone: "081299887766",
      address: "Jl. Raya Serang Km 14 No. 42",
      area: "Cikupa",
      category: "KBSM",
      desc: "Pipa persil depan pagar bocor kencang air meluap ke aspal",
      status: "proses",
      urgent: true,
      coords: "-6.2235, 106.5184",
      receivedAt: h(4),
      officer: "Agus Setiawan",
      targetDivision: "minor_repair",
      distributionStatus: "in_progress",
      distributedAt: h(3.5),
      distributedBy: "Putri Delia (CS Dispatcher)",
      distributionNotes: "Segera kirim armada terdekat, air menggenangi jalan raya Serang.",
      intakeChannel: "WhatsApp CS",
      comments: [
        {
          id: "cmt-101",
          authorName: "Putri Delia (CS Dispatcher)",
          authorDivision: "customer_service",
          authorRole: "Dispatcher",
          targetDepartment: "Divisi Minor Repair",
          content: "Laporan masuk via WhatsApp. Pelanggan info air menyembur deras di jalan raya Serang depan pagar. Mohon prioritas armada terdekat.",
          createdAt: h(3.5),
        },
        {
          id: "cmt-102",
          authorName: "Ir. Bambang Trihatmojo",
          authorDivision: "minor_repair",
          authorRole: "Koordinator Lapangan",
          targetDepartment: "Customer Service",
          content: "Armada unit 02 (Petugas Agus Setiawan) sudah ditugaskan dan meluncur membawa pipa PE 1/2\" dan klem sadel.",
          createdAt: h(3.0),
        },
        {
          id: "cmt-103",
          authorName: "Agus Setiawan (Petugas Lapangan)",
          authorDivision: "minor_repair",
          authorRole: "Teknisi Lapangan",
          targetDepartment: "Customer Service & Operasional",
          content: "Tiba di lokasi. Pipa persil pecah akibat tertekan akar pohon. Sedang dilakukan pemotongan dan penyambungan socket fitting.",
          createdAt: h(1.5),
        },
      ],
    },
    // 2. Minor Repair completed ticket with GPS and E-sign
    {
      id: "WO-2026-002",
      caseId: "1004829102",
      customer: "Ibu Ratna Dewi",
      meterId: "MTR-55412",
      phone: "081377665544",
      address: "Komplek Citra Raya Blok E2/15",
      area: "Panongan",
      category: "KKMR",
      desc: "Stop kran sebelum meteran patah dan merembes",
      status: "selesai",
      urgent: false,
      coords: "-6.2412, 106.5298",
      receivedAt: h(9),
      officer: "Budi Santoso",
      completedAt: h(2),
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      distributedAt: h(8.5),
      distributedBy: "Putri Delia (CS Dispatcher)",
      distributionNotes: "Penggantian kran meter rusak.",
      intakeChannel: "Call Center 24 Jam",
      completionNotes: "Penggantian stop kran kuningan baru 1/2\", pasang seal tape & uji aliran normal 1.8 bar.",
      usedMaterials: ["Stop Kran Kuningan 1/2\"", "Seal Tape Tebal", "Karet Paking Meter Air"],
      comments: [
        {
          id: "cmt-201",
          authorName: "Ahmad Fauzi (CS Officer)",
          authorDivision: "customer_service",
          authorRole: "Contact Center",
          targetDepartment: "Divisi Minor Repair",
          content: "Pelanggan telepon mengeluh kran depan meteran patah saat hendak menutup saluran.",
          createdAt: h(8.5),
        },
        {
          id: "cmt-202",
          authorName: "Budi Santoso",
          authorDivision: "minor_repair",
          authorRole: "Teknisi Lapangan",
          targetDepartment: "Customer Service & Billing",
          content: "Perbaikan selesai. Kran kuningan diganti baru. Air mengalir lancar tanpa rembesan, pelanggan telah menandatangani BAST digital.",
          createdAt: h(2.0),
        },
      ],
    },
    // 3. Operasional Sales Support ticket (KRPT - Rekening Tinggi)
    {
      id: "WO-2026-003",
      caseId: "1004829103",
      customer: "Bpk. Rahmat Hidayat",
      meterId: "MTR-33901",
      phone: "081288334455",
      address: "Perumahan Bumi Asri Blok C4/12",
      area: "Tigaraksa",
      category: "KRPT",
      desc: "Tagihan air bulan ini melonjak dari normal 150rb menjadi 1.2jt padahal pemakaian sama",
      status: "proses",
      urgent: false,
      coords: "-6.2610, 106.4850",
      receivedAt: h(6),
      targetDivision: "sales_support",
      distributionStatus: "in_progress",
      distributedAt: h(5.5),
      distributedBy: "Ahmad Fauzi (CS Officer)",
      distributionNotes: "Mohon verifikasi foto stand meter bulan lalu vs aktual, jika ada salah catat segera sesuaikan rekening.",
      intakeChannel: "Loket Kantor",
      divisionAssignee: "Dewi Lestari (OSS Staff)",
      divisionActionNotes: "Sedang dilakukan verifikasi historis kubikasi dan pembacaan foto meteran oleh tim billing.",
    },
    // 4. Operasional Sales Support ticket (KPKT - Sambung Kembali Tunggakan)
    {
      id: "WO-2026-004",
      caseId: "1004829104",
      customer: "Toko Sinar Jaya Abadi",
      meterId: "MTR-66712",
      phone: "081399001122",
      address: "Pasar Kemis Ruko No. 21",
      area: "Pasar Kemis",
      category: "KPKT",
      desc: "Pelanggan sudah melunasi tunggakan 2 bulan di loket posko, mohon penyambungan kembali kran meteran",
      status: "baru",
      urgent: true,
      coords: "-6.1834, 106.5381",
      receivedAt: h(2),
      targetDivision: "sales_support",
      distributionStatus: "distributed",
      distributedAt: h(1.8),
      distributedBy: "Putri Delia (CS Dispatcher)",
      distributionNotes: "Bukti lunas pembayaran No. Kwitansi: KW-99210 terlampir. Mohon terbitkan surat perintah sambung.",
      intakeChannel: "Loket Kantor",
    },
    // 5. Technical Key Account ticket (KATMIND - Air Mati Pabrik Industri)
    {
      id: "WO-2026-005",
      caseId: "1004829105",
      customer: "PT Mayora Indah Tbk (Plant Cikupa)",
      meterId: "MTR-IND-0012",
      phone: "0215981234",
      address: "Kawasan Industri Sentra Cikupa Blok A No. 1",
      area: "Cikupa",
      category: "KATMIND",
      desc: "Tekanan air drop hingga 0.2 bar, suplai ke boiler pabrik terhenti mendadak",
      status: "proses",
      urgent: true,
      coords: "-6.2190, 106.5120",
      receivedAt: h(1.5),
      targetDivision: "key_account",
      distributionStatus: "in_progress",
      distributedAt: h(1.2),
      distributedBy: "Putri Delia (CS Dispatcher)",
      distributionNotes: "CRITICAL INDUSTRY: Key Account industri makanan. Mohon tim TKA segera cek booster pump & katup 4 inch.",
      intakeChannel: "Call Center 24 Jam",
      divisionAssignee: "H. Rudi Hartono (TKA Lead)",
      divisionActionNotes: "Tim engineer TKA sedang bergerak ke intake pipa industri Cikupa membawa manometer digital.",
    },
    // 6. Technical Support ticket (KATR - Air Keruh Kawasan & Uji Kualitas)
    {
      id: "WO-2026-006",
      caseId: "1004829106",
      customer: "Ketua RW 05 Perumahan Balaraja",
      meterId: "MTR-77219",
      phone: "081722339900",
      address: "Jl. Dahlia Utama RT 03/RW 05",
      area: "Balaraja",
      category: "KATR",
      desc: "Air PDAM keluar kecoklatan dan berbau tanah sejak pagi mengenai sekitar 20 rumah",
      status: "proses",
      urgent: true,
      coords: "-6.1950, 106.4520",
      receivedAt: h(3),
      targetDivision: "technical_support",
      distributionStatus: "in_progress",
      distributedAt: h(2.8),
      distributedBy: "Ahmad Fauzi (CS Officer)",
      distributionNotes: "Mohon tim laboratorium lakukan pengambilan sampel air & lakukan flushing washout pipa distribusi terdekat.",
      intakeChannel: "WhatsApp CS",
      divisionAssignee: "Dr. Agus Sutrisno (Lab Tech)",
      divisionActionNotes: "Sedang dilakukan flushing wash-out pipa hydrant dan uji kekeruhan (turbidity test).",
    },
    // 7. Technical Support ticket (TERAREQ - Permintaan Uji Tera Akurasi)
    {
      id: "WO-2026-007",
      caseId: "1004829107",
      customer: "Klinik Permata Medika",
      meterId: "MTR-44321",
      phone: "081288997711",
      address: "Jl. Raya Curug Km 2 No. 10",
      area: "Curug",
      category: "TERAREQ",
      desc: "Permohonan pengujian akurasi meter air (tera kalibrasi) karena dugaan meteran terlalu cepat berputar",
      status: "baru",
      urgent: false,
      coords: "-6.2410, 106.5540",
      receivedAt: h(5),
      targetDivision: "technical_support",
      distributionStatus: "distributed",
      distributedAt: h(4.6),
      distributedBy: "Putri Delia (CS Dispatcher)",
      distributionNotes: "Permintaan uji bangku tera akurasi meter 1 inch.",
      intakeChannel: "Loket Kantor",
    },
    // 8. New CS Ticket waiting for distribution
    {
      id: "WO-2026-008",
      caseId: "1004829108",
      customer: "Bpk. Hendra Gunawan",
      meterId: "MTR-90123",
      phone: "081344556677",
      address: "Jl. Anggrek No. 18, RT 01/RW 03, Rajeg",
      area: "Rajeg",
      category: "KP",
      desc: "Pipa air depan teras rumah patah terkena roda mobil, air mengucur",
      status: "baru",
      urgent: true,
      coords: "-6.1480, 106.5050",
      receivedAt: h(0.5),
      targetDivision: "customer_service",
      distributionStatus: "draft",
      intakeChannel: "WhatsApp CS",
    },
    // 9. Completed Minor Repair Ticket for Today (Agus Setiawan)
    {
      id: "WO-2026-009",
      caseId: "1004829109",
      customer: "Bpk. Mulyadi Kusuma",
      meterId: "MTR-22341",
      phone: "081298711223",
      address: "Perumahan Talaga Bestari Blok B3 No. 8",
      area: "Cikupa",
      category: "KBSM",
      desc: "Pipa persil depan garasi pecah tertekan paving block",
      status: "selesai",
      urgent: true,
      coords: "-6.2215, 106.5160",
      receivedAt: h(5),
      officer: "Agus Setiawan",
      completedAt: h(1.2),
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      distributedAt: h(4.8),
      distributedBy: "Putri Delia (CS Dispatcher)",
      distributionNotes: "Pipa persil pecah, air mengalir ke garasi warga.",
      intakeChannel: "WhatsApp CS",
      completionNotes: "Pemotongan pipa bocor 1/2 inch, penyambungan socket HDPE 20mm & seal tape. Tekanan pipa normal 1.8 bar.",
      usedMaterials: ["Pipa HDPE 20mm (1 meter)", "Socket HDPE 20mm", "Seal Tape Tebal"],
      customerSignerName: "Bpk. Mulyadi",
      customerSignature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    },
    // 10. Completed Key Account Ticket for Today (H. Rudi Hartono)
    {
      id: "WO-2026-010",
      caseId: "1004829110",
      customer: "PT Gajah Tunggal Tbk",
      meterId: "MTR-IND-0044",
      phone: "0215984433",
      address: "Kawasan Industri Jatake Blok C No. 5",
      area: "Jatake",
      category: "KATMIND",
      desc: "Tekanan drop pada jalur suplai pendingin turbin",
      status: "selesai",
      urgent: true,
      coords: "-6.2080, 106.5390",
      receivedAt: h(7),
      officer: "H. Rudi Hartono",
      completedAt: h(2.8),
      targetDivision: "key_account",
      distributionStatus: "resolved",
      distributedAt: h(6.5),
      distributedBy: "Putri Delia (CS Dispatcher)",
      distributionNotes: "Prioritas suplai industri berat, koordinasi teknisi TKA.",
      intakeChannel: "Call Center 24 Jam",
      completionNotes: "Pengecekan inlet booster pump, pembersihan strainer 4 inch & kalibrasi valve. Tekanan normal 2.6 bar.",
      usedMaterials: ["Manometer Tekanan Air", "Karet Paking Meter Air"],
      customerSignerName: "Ir. Hendrawan (Chief Utility)",
      customerSignature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    },
    // 11. Completed Minor Repair Ticket - Senin (Budi Santoso - KBSM)
    {
      id: "WO-2026-011",
      caseId: "1004829111",
      customer: "Ibu Nurhasanah",
      meterId: "MTR-66712",
      phone: "081399882211",
      address: "Jl. Beringin Raya No. 12, Sepatan",
      area: "Sepatan",
      category: "KBSM",
      desc: "Pipa persil rembes depan meteran air",
      status: "selesai",
      urgent: false,
      coords: "-6.1245, 106.5740",
      receivedAt: h(125),
      officer: "Budi Santoso",
      completedAt: h(114),
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      distributedAt: h(124),
      distributedBy: "Putri Delia (CS Dispatcher)",
      completionNotes: "Penyambungan pipa PE 1/2\", pasang socket compression baru.",
      usedMaterials: ["Socket PE 1/2\"", "Seal Tape"],
    },
    // 12. Completed Minor Repair Ticket - Senin (Hendra Wijaya - KATM)
    {
      id: "WO-2026-012",
      caseId: "1004829112",
      customer: "Bpk. Kuswanto",
      meterId: "MTR-33419",
      phone: "081288990011",
      address: "Perum Graha Curug Blok B1/05",
      area: "Curug",
      category: "KATM",
      desc: "Air tidak mengalir di pemukiman warga",
      status: "selesai",
      urgent: true,
      coords: "-6.2415, 106.5545",
      receivedAt: h(122),
      officer: "Hendra Wijaya",
      completedAt: h(112),
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      completionNotes: "Pembersihan strainer inlet, air kembali mengalir lancar 1.7 bar.",
      usedMaterials: ["Karet Paking"],
    },
    // 13. Completed Minor Repair Ticket - Selasa (Dedi Kurniawan - KPMR)
    {
      id: "WO-2026-013",
      caseId: "1004829113",
      customer: "Bpk. Anton Subagyo",
      meterId: "MTR-99812",
      phone: "081722334455",
      address: "Komplek Cikupa Indah Blok D/18",
      area: "Cikupa",
      category: "KPMR",
      desc: "Meteran air macet angka tidak bergerak",
      status: "selesai",
      urgent: false,
      coords: "-6.2210, 106.5180",
      receivedAt: h(102),
      officer: "Dedi Kurniawan",
      completedAt: h(90),
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      completionNotes: "Penggantian unit meter air caliber 1/2 inch baru terkalibrasi.",
      usedMaterials: ["Meter Air 1/2 Inch Baru", "Segel Tera Plastik"],
    },
    // 14. Completed Minor Repair Ticket - Selasa (Agus Setiawan - KKMR)
    {
      id: "WO-2026-014",
      caseId: "1004829114",
      customer: "Ibu Laksmi",
      meterId: "MTR-44512",
      phone: "081377889900",
      address: "Jl. Raya Pasarkemis No. 89",
      area: "Pasar Kemis",
      category: "KKMR",
      desc: "Stop kran sebelum meteran patah berkarat",
      status: "selesai",
      urgent: false,
      coords: "-6.1755, 106.5390",
      receivedAt: h(98),
      officer: "Agus Setiawan",
      completedAt: h(86),
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      completionNotes: "Penggantian stop valve kuningan 1/2 inch tahan karat.",
      usedMaterials: ["Stop Kran Kuningan 1/2\"", "Seal Tape Tebal"],
    },
    // 15. Completed Minor Repair Ticket - Rabu (Eko Prasetyo - KBSM)
    {
      id: "WO-2026-015",
      caseId: "1004829115",
      customer: "Bpk. Syaiful Anwar",
      meterId: "MTR-22901",
      phone: "081299001122",
      address: "Perumahan Bumi Asri C2/09",
      area: "Tigaraksa",
      category: "KBSM",
      desc: "Pipa retak setelah pemasangan pagar",
      status: "selesai",
      urgent: false,
      coords: "-6.2620, 106.4860",
      receivedAt: h(76),
      officer: "Eko Prasetyo",
      completedAt: h(64),
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      completionNotes: "Penyambungan pipa HDPE dan klem sadel baru.",
      usedMaterials: ["Pipa HDPE 20mm (1 meter)", "Klem Sadel 1/2\""],
    },
    // 16. Completed Minor Repair Ticket - Rabu (Budi Santoso - KMAL)
    {
      id: "WO-2026-016",
      caseId: "1004829116",
      customer: "Drs. Bambang Sudiro",
      meterId: "MTR-77123",
      phone: "081544332211",
      address: "Jl. Veteran No. 34, Panongan",
      area: "Panongan",
      category: "KMAL",
      desc: "Meter air terlepas akibat pondasi amblas",
      status: "selesai",
      urgent: true,
      coords: "-6.2420, 106.5300",
      receivedAt: h(74),
      officer: "Budi Santoso",
      completedAt: h(60),
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      completionNotes: "Pemasangan kembali meter air dengan dudukan beton kokoh.",
      usedMaterials: ["Double Nipple Kuningan", "Seal Tape"],
    },
    // 17. Completed Minor Repair Ticket - Kamis (Hendra Wijaya - KKMR)
    {
      id: "WO-2026-017",
      caseId: "1004829117",
      customer: "Ibu Sri Rezeki",
      meterId: "MTR-55109",
      phone: "081877665544",
      address: "Jl. Merpati Blok G No. 14, Sepatan",
      area: "Sepatan",
      category: "KKMR",
      desc: "Kran meter bocor deras saat diputar",
      status: "selesai",
      urgent: false,
      coords: "-6.1260, 106.5750",
      receivedAt: h(52),
      officer: "Hendra Wijaya",
      completedAt: h(40),
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      completionNotes: "Penggantian kran 1/2 inch kuningan dan pengetesan debit.",
      usedMaterials: ["Stop Kran Kuningan 1/2\"", "Seal Tape"],
    },
    // 18. Completed Minor Repair Ticket - Kamis (Agus Setiawan - KBSM)
    {
      id: "WO-2026-018",
      caseId: "1004829118",
      customer: "Bpk. Rahmat Santoso",
      meterId: "MTR-88129",
      phone: "081233445566",
      address: "Jl. Flamboyan Blok B2/10, Cikupa",
      area: "Cikupa",
      category: "KBSM",
      desc: "Rembesan air pipa sambungan sebelum meter",
      status: "selesai",
      urgent: false,
      coords: "-6.2225, 106.5175",
      receivedAt: h(50),
      officer: "Agus Setiawan",
      completedAt: h(38),
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      completionNotes: "Pergantian sambungan socket dan seal tape tebal.",
      usedMaterials: ["Socket PE 1/2\"", "Seal Tape Tebal"],
    },
    // 19. Completed Minor Repair Ticket - Jumat (Dedi Kurniawan - KATM)
    {
      id: "WO-2026-019",
      caseId: "1004829119",
      customer: "Ibu Kartika Sari",
      meterId: "MTR-11928",
      phone: "081911223344",
      address: "Perum Citra Pasarkemis Blok F4/01",
      area: "Pasar Kemis",
      category: "KATM",
      desc: "Air mati total tidak keluar sejak malam",
      status: "selesai",
      urgent: true,
      coords: "-6.1760, 106.5385",
      receivedAt: h(28),
      officer: "Dedi Kurniawan",
      completedAt: h(18),
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      completionNotes: "Flushing pipa sambungan karena tersumbat endapan sedimen pipa lama.",
      usedMaterials: ["Karet Paking Meter Air"],
    },
    // 20. Completed Minor Repair Ticket - Jumat (Eko Prasetyo - KPMR)
    {
      id: "WO-2026-020",
      caseId: "1004829120",
      customer: "Bpk. Gunawan Wibisono",
      meterId: "MTR-66190",
      phone: "081388776655",
      address: "Jl. Anggrek No. 27, Tigaraksa",
      area: "Tigaraksa",
      category: "KPMR",
      desc: "Kaca meteran buram dan jarum angka macet",
      status: "selesai",
      urgent: false,
      coords: "-6.2615, 106.4855",
      receivedAt: h(26),
      officer: "Eko Prasetyo",
      completedAt: h(15),
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      completionNotes: "Penggantian unit meter air baru 1/2\" dan kalibrasi normal.",
      usedMaterials: ["Meter Air 1/2 Inch Baru", "Segel Tera Plastik"],
    },

    // --- Data Historis Bulanan (Januari - September 2026) Lintas Divisi ---
    // JANUARI 2026
    {
      id: "WO-2026-021",
      caseId: "1004829121",
      customer: "Bpk. Dwi Cahyono",
      meterId: "MTR-10291",
      phone: "081211223344",
      address: "Jl. Dahlia Raya No. 4, Cikupa",
      area: "Cikupa",
      category: "KBSM",
      desc: "Pipa persil bocor di bawah lantai carport",
      status: "selesai",
      urgent: false,
      receivedAt: dt(1, 14, 8),
      completedAt: dt(1, 15, 11),
      officer: "Agus Setiawan",
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      intakeChannel: "WhatsApp CS",
      completionNotes: "Penyambungan pipa PE 1/2\" dan klem saddle.",
    },
    {
      id: "WO-2026-022",
      caseId: "1004829122",
      customer: "Ibu Fatimah Zahra",
      meterId: "MTR-20412",
      phone: "081322334455",
      address: "Perum Graha Curug Blok A/12",
      area: "Curug",
      category: "KRPT",
      desc: "Lonjakan tagihan rekening air dari 120rb menjadi 890rb",
      status: "selesai",
      urgent: false,
      receivedAt: dt(1, 20, 10),
      completedAt: dt(1, 22, 14),
      targetDivision: "sales_support",
      distributionStatus: "resolved",
      intakeChannel: "Loket Kantor",
      completionNotes: "Koreksi stand meter salah input catat meter dan penyesuaian tagihan.",
    },
    {
      id: "WO-2026-023",
      caseId: "1004829123",
      customer: "PT Torabika Eka Semesta",
      meterId: "MTR-IND-0019",
      phone: "0215981122",
      address: "Kawasan Industri Jatake Kav. 12",
      area: "Jatake",
      category: "KATMIND",
      desc: "Suplai air industri bertekanan rendah pada pipa utama 3 inch",
      status: "selesai",
      urgent: true,
      receivedAt: dt(1, 27, 9),
      completedAt: dt(1, 28, 15),
      officer: "H. Rudi Hartono",
      targetDivision: "key_account",
      distributionStatus: "resolved",
      intakeChannel: "Call Center 24 Jam",
      completionNotes: "Flushing strainer katup bypass dan pembersihan sedimen pipa industri.",
    },

    // FEBRUARI 2026
    {
      id: "WO-2026-024",
      caseId: "1004829124",
      customer: "Bpk. Hendro Siswanto",
      meterId: "MTR-30192",
      phone: "081233445566",
      address: "Jl. Beringin No. 20, Sepatan",
      area: "Sepatan",
      category: "KKMR",
      desc: "Stop kran sebelum meteran patah dan menetes",
      status: "selesai",
      urgent: false,
      receivedAt: dt(2, 6, 8),
      completedAt: dt(2, 7, 10),
      officer: "Budi Santoso",
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      intakeChannel: "WhatsApp CS",
      completionNotes: "Ganti kran kuningan 1/2 inch baru.",
    },
    {
      id: "WO-2026-025",
      caseId: "1004829125",
      customer: "Toko Berkah Abadi",
      meterId: "MTR-40291",
      phone: "081344556677",
      address: "Pasar Kemis Ruko No. 8",
      area: "Pasar Kemis",
      category: "KPKT",
      desc: "Permohonan sambung kembali pasca pelunasan tunggakan rekening",
      status: "selesai",
      urgent: false,
      receivedAt: dt(2, 14, 11),
      completedAt: dt(2, 15, 16),
      targetDivision: "sales_support",
      distributionStatus: "resolved",
      intakeChannel: "Loket Kantor",
      completionNotes: "Buka segel resmi dan pasang kran sambung aktif.",
    },
    {
      id: "WO-2026-026",
      caseId: "1004829126",
      customer: "Perumahan Citra Raya RW 08",
      meterId: "MTR-50392",
      phone: "081555667788",
      address: "Komplek Citra Raya Sektor 3",
      area: "Panongan",
      category: "KATR",
      desc: "Kualitas air keruh kecoklatan pasca perbaikan pipa distribusi",
      status: "selesai",
      urgent: true,
      receivedAt: dt(2, 22, 13),
      completedAt: dt(2, 23, 17),
      targetDivision: "technical_support",
      distributionStatus: "resolved",
      intakeChannel: "Call Center 24 Jam",
      completionNotes: "Flushing wash out hydrant dan pengetesan turbidity air jernih.",
    },

    // MARET 2026
    {
      id: "WO-2026-027",
      caseId: "1004829127",
      customer: "Bpk. Bambang Irawan",
      meterId: "MTR-60491",
      phone: "081766778899",
      address: "Jl. Melati No. 15, Balaraja",
      area: "Balaraja",
      category: "KPMR",
      desc: "Meteran air macet, jarum tidak berputar",
      status: "selesai",
      urgent: false,
      receivedAt: dt(3, 9, 9),
      completedAt: dt(3, 11, 11),
      officer: "Dedi Kurniawan",
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      intakeChannel: "Email",
      completionNotes: "Penggantian unit meter air 1/2 inch bersegel baru.",
    },
    {
      id: "WO-2026-028",
      caseId: "1004829128",
      customer: "Klinik Medika Panongan",
      meterId: "MTR-70592",
      phone: "081877889900",
      address: "Jl. Raya Panongan Km 2",
      area: "Panongan",
      category: "TERAREQ",
      desc: "Pengujian tera akurasi meter air 1 inch fasilitas klinik",
      status: "selesai",
      urgent: false,
      receivedAt: dt(3, 17, 10),
      completedAt: dt(3, 20, 15),
      targetDivision: "technical_support",
      distributionStatus: "resolved",
      intakeChannel: "Loket Kantor",
      completionNotes: "Hasil uji tera lab deviasi normal +0.8%, meter laik operasi.",
    },
    {
      id: "WO-2026-029",
      caseId: "1004829129",
      customer: "PT Indofood Fritolay Makmur",
      meterId: "MTR-IND-0022",
      phone: "0215982233",
      address: "Kawasan Industri Sentra Cikupa Blok B",
      area: "Cikupa",
      category: "KBSMIND",
      desc: "Bocor pipa persil 2 inch area gerbang muat barang",
      status: "selesai",
      urgent: true,
      receivedAt: dt(3, 26, 8),
      completedAt: dt(3, 27, 12),
      officer: "H. Rudi Hartono",
      targetDivision: "key_account",
      distributionStatus: "resolved",
      intakeChannel: "Call Center 24 Jam",
      completionNotes: "Klem gibault joint 2 inch dan pengecoran kembali dudukan pipa.",
    },

    // APRIL 2026
    {
      id: "WO-2026-030",
      caseId: "1004829130",
      customer: "Ibu Sri Wahyuni",
      meterId: "MTR-80691",
      phone: "081988990011",
      address: "Perum Bumi Asri C1/10, Tigaraksa",
      area: "Tigaraksa",
      category: "KBSM",
      desc: "Pipa sebelum meteran rembes air membasahi rumput",
      status: "selesai",
      urgent: false,
      receivedAt: dt(4, 5, 8),
      completedAt: dt(4, 6, 11),
      officer: "Eko Prasetyo",
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      intakeChannel: "WhatsApp CS",
      completionNotes: "Ganti socket HDPE 20mm baru.",
    },
    {
      id: "WO-2026-031",
      caseId: "1004829131",
      customer: "Bpk. Suryanto",
      meterId: "MTR-90792",
      phone: "081299001122",
      address: "Jl. Raya Serang No. 70, Balaraja",
      area: "Balaraja",
      category: "KRPT",
      desc: "Lonjakan pemakaian kubikasi drastis",
      status: "selesai",
      urgent: false,
      receivedAt: dt(4, 14, 10),
      completedAt: dt(4, 16, 14),
      targetDivision: "sales_support",
      distributionStatus: "resolved",
      intakeChannel: "WhatsApp CS",
      completionNotes: "Ditemukan kebocoran pipa instalasi dalam rumah milik pelanggan.",
    },
    {
      id: "WO-2026-032",
      caseId: "1004829132",
      customer: "Warga RT 02/03 Rajeg",
      meterId: "MTR-10893",
      phone: "081300112233",
      address: "Jl. Kamboja No. 9, Rajeg",
      area: "Rajeg",
      category: "KILL",
      desc: "Laporan sambungan pipa liar tanpa meteran",
      status: "selesai",
      urgent: false,
      receivedAt: dt(4, 23, 9),
      completedAt: dt(4, 25, 14),
      targetDivision: "technical_support",
      distributionStatus: "resolved",
      intakeChannel: "Email",
      completionNotes: "Penertiban sambungan liar dan penutupan dop pipa resmi.",
    },

    // MEI 2026
    {
      id: "WO-2026-033",
      caseId: "1004829133",
      customer: "Bpk. Agus Supriyadi",
      meterId: "MTR-20991",
      phone: "081411223344",
      address: "Jl. Flamboyan Blok D No. 2, Cikupa",
      area: "Cikupa",
      category: "KKMR",
      desc: "Kran meter air bocor pada drat kuningan",
      status: "selesai",
      urgent: false,
      receivedAt: dt(5, 7, 8),
      completedAt: dt(5, 8, 10),
      officer: "Agus Setiawan",
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      intakeChannel: "WhatsApp CS",
      completionNotes: "Ganti stop kran kuningan baru dan seal tape.",
    },
    {
      id: "WO-2026-034",
      caseId: "1004829134",
      customer: "Ibu Dewi Anggraeni",
      meterId: "MTR-30102",
      phone: "081522334455",
      address: "Perumahan Taman Buah Cikupa Blok G/5",
      area: "Cikupa",
      category: "KPGP",
      desc: "Permohonan balik nama pemilik rekening dari almarhum suami",
      status: "selesai",
      urgent: false,
      receivedAt: dt(5, 16, 11),
      completedAt: dt(5, 18, 15),
      targetDivision: "sales_support",
      distributionStatus: "resolved",
      intakeChannel: "Loket Kantor",
      completionNotes: "Verifikasi dokumen KTP & sertifikat rumah, mutasi nama berhasil diperbarui.",
    },
    {
      id: "WO-2026-035",
      caseId: "1004829135",
      customer: "PT Surya Toto Indonesia Tbk",
      meterId: "MTR-IND-0031",
      phone: "0215983344",
      address: "Kawasan Industri Pasar Kemis",
      area: "Pasar Kemis",
      category: "KATMIND",
      desc: "Aliran air ke tangki penampung pabrik mati total",
      status: "selesai",
      urgent: true,
      receivedAt: dt(5, 26, 9),
      completedAt: dt(5, 27, 13),
      officer: "H. Rudi Hartono",
      targetDivision: "key_account",
      distributionStatus: "resolved",
      intakeChannel: "Call Center 24 Jam",
      completionNotes: "Perbaikan gate valve utama dan normalisasi debit air industri.",
    },

    // JUNI 2026
    {
      id: "WO-2026-036",
      caseId: "1004829136",
      customer: "Bpk. Tri Wahyudi",
      meterId: "MTR-40211",
      phone: "081633445566",
      address: "Jl. Kenanga Blok C No. 7, Panongan",
      area: "Panongan",
      category: "KBSM",
      desc: "Pipa persil pecah akibat beban proyek drainase",
      status: "selesai",
      urgent: true,
      receivedAt: dt(6, 4, 8),
      completedAt: dt(6, 5, 11),
      officer: "Hendra Wijaya",
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      intakeChannel: "WhatsApp CS",
      completionNotes: "Penggantian pipa HDPE 20mm sepanjang 2 meter dan socket.",
    },
    {
      id: "WO-2026-037",
      caseId: "1004829137",
      customer: "Puskesmas Balaraja",
      meterId: "MTR-50322",
      phone: "081744556677",
      address: "Jl. Raya Kresek No. 12, Balaraja",
      area: "Balaraja",
      category: "KATR",
      desc: "Pemeriksaan mutu dan bau air PDAM unit IGD",
      status: "selesai",
      urgent: true,
      receivedAt: dt(6, 15, 10),
      completedAt: dt(6, 17, 14),
      targetDivision: "technical_support",
      distributionStatus: "resolved",
      intakeChannel: "Call Center 24 Jam",
      completionNotes: "Flushing pipa inlet puskesmas dan tes sisa klorin normal 0.3 mg/L.",
    },
    {
      id: "WO-2026-038",
      caseId: "1004829138",
      customer: "Bpk. Firman Utina",
      meterId: "MTR-60433",
      phone: "081855667788",
      address: "Perum Talaga Bestari Blok E2",
      area: "Cikupa",
      category: "BPPD",
      desc: "Permohonan perpanjangan pipa dinas sambungan baru",
      status: "selesai",
      urgent: false,
      receivedAt: dt(6, 25, 9),
      completedAt: dt(6, 28, 16),
      targetDivision: "sales_support",
      distributionStatus: "resolved",
      intakeChannel: "Loket Kantor",
      completionNotes: "Survei teknis lokasi dan rincian biaya penambahan pipa disetujui pemohon.",
    },

    // JULI 2026
    {
      id: "WO-2026-039",
      caseId: "1004829139",
      customer: "Ibu Marlina",
      meterId: "MTR-70541",
      phone: "081966778899",
      address: "Jl. Veteran No. 44, Sepatan",
      area: "Sepatan",
      category: "KPMR",
      desc: "Kaca meteran buram mengembun tidak terbaca petugas catat meter",
      status: "selesai",
      urgent: false,
      receivedAt: dt(7, 5, 8),
      completedAt: dt(7, 7, 12),
      officer: "Dedi Kurniawan",
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      intakeChannel: "WhatsApp CS",
      completionNotes: "Ganti meter air 1/2 inch baru segel merah tera sah.",
    },
    {
      id: "WO-2026-040",
      caseId: "1004829140",
      customer: "Masjid Agung Al-Ikhlas",
      meterId: "MTR-80652",
      phone: "081277889900",
      address: "Jl. Raya Tigaraksa Km 1",
      area: "Tigaraksa",
      category: "KPCT",
      desc: "Permohonan penyesuaian tarif sosial & angsuran rekening tempat ibadah",
      status: "selesai",
      urgent: false,
      receivedAt: dt(7, 14, 11),
      completedAt: dt(7, 16, 15),
      targetDivision: "sales_support",
      distributionStatus: "resolved",
      intakeChannel: "Loket Kantor",
      completionNotes: "Persetujuan tarif khusus sosial dan skema restrukturisasi rekening.",
    },
    {
      id: "WO-2026-041",
      caseId: "1004829141",
      customer: "PT Mayora Indah Tbk Unit Balaraja",
      meterId: "MTR-IND-0041",
      phone: "0215984455",
      address: "Kawasan Industri Balaraja Barat",
      area: "Balaraja",
      category: "PPMI",
      desc: "Penyesuaian relokasi meter air induk industri 4 inch",
      status: "selesai",
      urgent: false,
      receivedAt: dt(7, 24, 10),
      completedAt: dt(7, 27, 16),
      officer: "H. Rudi Hartono",
      targetDivision: "key_account",
      distributionStatus: "resolved",
      intakeChannel: "Email",
      completionNotes: "Pemasangan kembali meter induk industri pada boks beton baru.",
    },

    // AGUSTUS 2026
    {
      id: "WO-2026-042",
      caseId: "1004829142",
      customer: "Bpk. Johan Pranata",
      meterId: "MTR-90761",
      phone: "081388990011",
      address: "Jl. Anggrek No. 55, Curug",
      area: "Curug",
      category: "KBSM",
      desc: "Pipa persil depan gerbang bocor menyembur",
      status: "selesai",
      urgent: true,
      receivedAt: dt(8, 4, 8),
      completedAt: dt(8, 5, 11),
      officer: "Agus Setiawan",
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      intakeChannel: "WhatsApp CS",
      completionNotes: "Penyambungan pipa PE 1/2 inch dengan soket compression baru.",
    },
    {
      id: "WO-2026-043",
      caseId: "1004829143",
      customer: "Ibu Hesti Purwanti",
      meterId: "MTR-10872",
      phone: "081499001122",
      address: "Komplek Citra Pasarkemis Blok B/18",
      area: "Pasar Kemis",
      category: "KKMR",
      desc: "Kran meteran patah saat dibuka warga",
      status: "selesai",
      urgent: false,
      receivedAt: dt(8, 12, 9),
      completedAt: dt(8, 13, 11),
      officer: "Budi Santoso",
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      intakeChannel: "Call Center 24 Jam",
      completionNotes: "Ganti kran bola kuningan 1/2 inch.",
    },
    {
      id: "WO-2026-044",
      caseId: "1004829144",
      customer: "Hotel Grand Serang Balaraja",
      meterId: "MTR-20983",
      phone: "081500112233",
      address: "Jl. Raya Serang Km 28",
      area: "Balaraja",
      category: "KTR",
      desc: "Tekanan air drop di lantai 3 kamar hotel",
      status: "selesai",
      urgent: true,
      receivedAt: dt(8, 22, 10),
      completedAt: dt(8, 24, 15),
      targetDivision: "technical_support",
      distributionStatus: "resolved",
      intakeChannel: "Call Center 24 Jam",
      completionNotes: "Pembersihan saringan pipa suplai dan pengaturan tekanan katup pengatur.",
    },

    // SEPTEMBER 2026 (Tiket Aktif & Baru Lintas Divisi)
    {
      id: "WO-2026-045",
      caseId: "1004829145",
      customer: "Bpk. Faisal Rahman",
      meterId: "MTR-30194",
      phone: "081611223344",
      address: "Jl. Kutilang No. 8, Rajeg",
      area: "Rajeg",
      category: "KLBC",
      desc: "Pipa distribusi pinggir jalan utama pecah aspal basah mengalir",
      status: "proses",
      urgent: true,
      receivedAt: dt(9, 12, 8),
      officer: "Hendra Wijaya",
      targetDivision: "minor_repair",
      distributionStatus: "in_progress",
      intakeChannel: "WhatsApp CS",
      distributionNotes: "Pipa retak tergilas truk pengangkut pasir, perlu klem sadel dan penggantian pipa.",
    },
    {
      id: "WO-2026-046",
      caseId: "1004829146",
      customer: "Ibu Ratna Susanti",
      meterId: "MTR-40205",
      phone: "081722334455",
      address: "Perum Graha Panongan Blok C/22",
      area: "Panongan",
      category: "KRPT",
      desc: "Tagihan air September melonjak tajam padahal rumah kosong 2 minggu",
      status: "proses",
      urgent: false,
      receivedAt: dt(9, 16, 11),
      targetDivision: "sales_support",
      distributionStatus: "in_progress",
      intakeChannel: "Loket Kantor",
      distributionNotes: "Verifikasi meteran oleh petugas billing dan foto stand meter aktual.",
    },
    {
      id: "WO-2026-047",
      caseId: "1004829147",
      customer: "RSUD Balaraja",
      meterId: "MTR-50316",
      phone: "081833445566",
      address: "Jl. Raya Kresek No. 1, Balaraja",
      area: "Balaraja",
      category: "TERAREQ",
      desc: "Uji tera tahunan meter air 2 inch fasilitas rumah sakit daerah",
      status: "baru",
      urgent: false,
      receivedAt: dt(9, 21, 9),
      targetDivision: "technical_support",
      distributionStatus: "distributed",
      intakeChannel: "Email",
      distributionNotes: "Jadwalkan tim kalibrasi tera akurasi laboratorium.",
    },
    {
      id: "WO-2026-048",
      caseId: "1004829148",
      customer: "PT Paragon Technology and Innovation",
      meterId: "MTR-IND-0052",
      phone: "0215985566",
      address: "Kawasan Industri Jatake Blok F No. 10",
      area: "Jatake",
      category: "KATMIND",
      desc: "Kebutuhan air proses manufaktur terganggu akibat tekanan inlet rendah",
      status: "proses",
      urgent: true,
      receivedAt: dt(9, 24, 13),
      officer: "H. Rudi Hartono",
      targetDivision: "key_account",
      distributionStatus: "in_progress",
      intakeChannel: "Call Center 24 Jam",
      distributionNotes: "Pengecekan booster pump zona Jatake dan kalibrasi valve.",
    },
    {
      id: "WO-2026-049",
      caseId: "1004829149",
      customer: "Bpk. Mulyo Sudarsono",
      meterId: "MTR-60427",
      phone: "081944556677",
      address: "Jl. Flamboyan No. 19, Tigaraksa",
      area: "Tigaraksa",
      category: "KPAP",
      desc: "Permohonan koreksi penomoran blok alamat premise pada tagihan",
      status: "selesai",
      urgent: false,
      receivedAt: dt(9, 14, 10),
      completedAt: dt(9, 15, 14),
      targetDivision: "customer_service",
      distributionStatus: "resolved",
      intakeChannel: "Loket Kantor",
      completionNotes: "Update data sistem GIS dan penomoran premise alamat disesuaikan.",
    },
    {
      id: "WO-2026-050",
      caseId: "1004829150",
      customer: "Ibu Kusmiati",
      meterId: "MTR-70538",
      phone: "081255667788",
      address: "Perum Citra Raya Sektor 5 Blok H/10",
      area: "Panongan",
      category: "KPPM",
      desc: "Keluhan petugas catat meter tidak mengetuk pagar dan estimasi angka",
      status: "selesai",
      urgent: false,
      receivedAt: dt(9, 18, 14),
      completedAt: dt(9, 19, 16),
      targetDivision: "customer_service",
      distributionStatus: "resolved",
      intakeChannel: "WhatsApp CS",
      completionNotes: "Edukasi petugas pembaca meter wilayah Panongan dan konfirmasi ke pelanggan.",
    },
  ];
}

/**
 * Load all tickets from local storage or database
 */
export function loadAllUnifiedTickets(): UnifiedTicket[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const mapped = parsed.map((item: any) => {
          if (!item.targetDivision) {
            item.targetDivision = getRecommendedDivision(item.category);
          }
          if (!item.distributionStatus) {
            item.distributionStatus = item.status === "selesai" ? "resolved" : "distributed";
          }
          if (!item.caseId) {
            item.caseId = generateCaseId(item.id);
          }
          return item;
        });

        // Ensure newly introduced seeds (e.g. WO-2026-009, WO-2026-010) exist for daily log
        const seeds = getInitialSeedTickets();
        let added = false;
        seeds.forEach((seed) => {
          if (!mapped.some((m: any) => m.id === seed.id)) {
            mapped.push(seed);
            added = true;
          }
        });
        if (added) {
          saveAllUnifiedTickets(mapped);
        }

        return mapped;
      }
    }
  } catch (e) {
    console.warn("Storage load error:", e);
  }

  const initial = getInitialSeedTickets();
  saveAllUnifiedTickets(initial);
  return initial;
}

/**
 * Save all tickets to storage and Supabase
 */
export function saveAllUnifiedTickets(tickets: UnifiedTicket[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tickets));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aetra:tickets_changed", { detail: { tickets } }));
    }
  } catch (e) {
    console.warn("Storage save error:", e);
  }
}

/**
 * Save / Update a single ticket
 */
export async function saveSingleTicket(ticket: UnifiedTicket): Promise<void> {
  const tickets = loadAllUnifiedTickets();
  const idx = tickets.findIndex((t) => t.id === ticket.id);
  if (idx !== -1) {
    tickets[idx] = { ...tickets[idx], ...ticket };
  } else {
    tickets.unshift(ticket);
  }
  saveAllUnifiedTickets(tickets);

  // Trigger Firebase Cloud Messaging (FCM) Push alert to the assigned technician
  if (ticket.officer && ticket.status !== "selesai") {
    try {
      dispatchFCMNotificationToOfficer(ticket, ticket.officer);
    } catch (fcmErr) {
      console.warn("[FCM] Dispatch notification error:", fcmErr);
    }
  }

  if (sb) {
    try {
      await sb.from(TABLE).upsert([ticket]);
    } catch (e) {
      console.warn("Supabase upsert warning:", e);
    }
  }
}

/**
 * Customer Service Gateway: Distribute Ticket to Specific Division
 */
export async function distributeTicketFromCS(
  ticketId: string,
  targetDivision: DivisionId,
  notes: string,
  dispatcherName: string
): Promise<UnifiedTicket> {
  const tickets = loadAllUnifiedTickets();
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    throw new Error(`Tiket dengan ID ${ticketId} tidak ditemukan.`);
  }

  ticket.targetDivision = targetDivision;
  ticket.distributionStatus = "distributed";
  ticket.distributedAt = new Date().toISOString();
  ticket.distributedBy = dispatcherName;
  ticket.distributionNotes = notes;
  if (ticket.status === "baru") {
    // Keep status as baru or update division tracking
  }

  await saveSingleTicket(ticket);
  return ticket;
}

/**
 * Add an Inter-Department Comment/Update Note to a Ticket
 */
export async function addTicketComment(
  ticketId: string,
  commentData: {
    authorName: string;
    authorDivision: DivisionId;
    authorRole?: string;
    content: string;
    targetDepartment?: string;
  }
): Promise<TicketComment> {
  const tickets = loadAllUnifiedTickets();
  const ticket = tickets.find((t) => t.id === ticketId);
  if (!ticket) {
    throw new Error(`Tiket ${ticketId} tidak ditemukan.`);
  }

  if (!ticket.comments) {
    ticket.comments = [];
  }

  const newComment: TicketComment = {
    id: `cmt-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
    authorName: commentData.authorName,
    authorDivision: commentData.authorDivision,
    authorRole: commentData.authorRole || "Staf",
    content: commentData.content.trim(),
    createdAt: new Date().toISOString(),
    targetDepartment: commentData.targetDepartment || "Semua Divisi",
  };

  ticket.comments.push(newComment);
  await saveSingleTicket(ticket);
  return newComment;
}

export interface RolloverResult {
  rolledOverCount: number;
  rolledOverTicketIds: string[];
  nextWorkingDateString: string;
  nextWorkingDateIso: string;
}

/**
 * Automatically move / roll over complaints not finished today to the next working day.
 * Skips weekends (Saturday & Sunday).
 * @param customTickets Optional ticket array to operate on. If omitted, loads all tickets.
 * @param forceTodayRollover If true, unconditionally rolls over all today's unfinished tickets to tomorrow.
 */
export function autoRolloverUnfinishedTickets(
  customTickets?: UnifiedTicket[],
  forceTodayRollover = false
): RolloverResult {
  const tickets = customTickets || loadAllUnifiedTickets();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  // Helper to determine next working day (skips Saturday & Sunday)
  const getNextWorkingDate = (startDate: Date): Date => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    d.setHours(8, 0, 0, 0);
    return d;
  };

  const nextWorkingDay = getNextWorkingDate(today);
  const nextWorkingDateFormatted = nextWorkingDay.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const rolledOverTicketIds: string[] = [];
  let modified = false;

  tickets.forEach((t) => {
    // Only rollover tickets that are not completed yet
    if (t.status === "selesai") return;

    // Determine current scheduled date
    const schedDate = t.rescheduledDate ? new Date(t.rescheduledDate) : new Date(t.receivedAt);
    const schedDay = new Date(schedDate.getFullYear(), schedDate.getMonth(), schedDate.getDate(), 0, 0, 0, 0);

    const isPastSchedule = schedDay.getTime() < today.getTime();
    const isTodaySchedule = schedDay.getTime() === today.getTime();

    // Rollover if schedule was past and not completed, OR if forceTodayRollover is true, OR if current hour >= 17 (end of field shift)
    const shouldRollover = isPastSchedule || (isTodaySchedule && (forceTodayRollover || now.getHours() >= 17));

    if (shouldRollover) {
      // Avoid rolling over more than once to the same target date on the same day
      if (t.rescheduledDate && new Date(t.rescheduledDate).getTime() >= nextWorkingDay.getTime()) {
        return;
      }

      const prevDateStr = schedDate.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      if (!t.originalScheduledDate) {
        t.originalScheduledDate = schedDate.toISOString();
      }

      t.rescheduledDate = nextWorkingDay.toISOString();
      t.isRolledOver = true;
      t.rolloverCount = (t.rolloverCount || 0) + 1;
      t.lastRolloverAt = now.toISOString();

      if (!t.comments) t.comments = [];
      t.comments.push({
        id: `cmt-rollover-${Date.now()}-${t.id}`,
        authorName: "Sistem Auto-Rollover Aetra",
        authorDivision: t.targetDivision,
        authorRole: "Sistem",
        targetDepartment: "Semua Divisi Teknis",
        content: `🔄 Komplain belum diselesaikan pada jadwal sebelumnya (${prevDateStr}). Sistem secara otomatis memindahkan komplain ini ke jadwal kerja berikutnya (${nextWorkingDateFormatted}) sebagai prioritas pengerjaan.`,
        createdAt: now.toISOString(),
      });

      rolledOverTicketIds.push(t.id);
      modified = true;
    }
  });

  if (modified) {
    saveAllUnifiedTickets(tickets);
  }

  return {
    rolledOverCount: rolledOverTicketIds.length,
    rolledOverTicketIds,
    nextWorkingDateString: nextWorkingDateFormatted,
    nextWorkingDateIso: nextWorkingDay.toISOString(),
  };
}

