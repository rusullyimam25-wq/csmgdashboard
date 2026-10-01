/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Mobile Division Roster & Transfer Configuration - PT Aetra Air Tangerang
 */

import { DivisionId, DIVISIONS } from "./types/division";

export interface DivisionOfficer {
  name: string;
  role: string;
  divisionId: DivisionId;
  email: string;
  phone: string;
  avatarColor: { main: string; bg: string; border: string };
  unit: string;
  specialty: string;
}

export const DIVISION_ORDER: DivisionId[] = [
  "minor_repair",
  "sales_support",
  "key_account",
  "technical_support",
  "customer_service",
];

export const DIVISION_OFFICER_ROSTER: Record<DivisionId, DivisionOfficer[]> = {
  minor_repair: [
    {
      name: "Agus Setiawan",
      role: "Teknisi Pipa & Stop Kran",
      divisionId: "minor_repair",
      email: "agus.setiawan@aetra.co.id",
      phone: "0812-8877-6655",
      avatarColor: { main: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
      unit: "Unit Reaksi Cepat 02",
      specialty: "Pipa Persil, Ganti Stop Kran & Klem HDPE",
    },
    {
      name: "Budi Santoso",
      role: "Teknisi Meter & Pipa Dinas",
      divisionId: "minor_repair",
      email: "budi.santoso@aetra.co.id",
      phone: "0813-2233-4455",
      avatarColor: { main: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
      unit: "Unit Lapangan 01",
      specialty: "Meter Air Rusak, Macet & Tera Segel",
    },
    {
      name: "Dedi Kurniawan",
      role: "Teknisi Tanggap Darurat",
      divisionId: "minor_repair",
      email: "dedi.kurniawan@aetra.co.id",
      phone: "0812-7788-9900",
      avatarColor: { main: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
      unit: "Unit Darurat 03",
      specialty: "Kebocoran Pipa Persil Aspal & Meluap",
    },
    {
      name: "Hendra Wijaya",
      role: "Teknisi Sambung HDPE",
      divisionId: "minor_repair",
      email: "hendra.wijaya@aetra.co.id",
      phone: "0817-4455-6677",
      avatarColor: { main: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
      unit: "Unit Teknik 04",
      specialty: "Penyambungan Socket HDPE & Tekanan Aliran",
    },
    {
      name: "Eko Prasetyo",
      role: "Teknisi Armada Unit 05",
      divisionId: "minor_repair",
      email: "eko.prasetyo@aetra.co.id",
      phone: "0818-9900-1122",
      avatarColor: { main: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
      unit: "Unit Lapangan 05",
      specialty: "Galian Pipa Dinas & Penggantian Paking",
    },
  ],
  sales_support: [
    {
      name: "Dewi Lestari",
      role: "Head of OSS / Koordinator",
      divisionId: "sales_support",
      email: "dewi.lestari@aetra.co.id",
      phone: "0812-3344-5566",
      avatarColor: { main: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
      unit: "OSS Koordinator",
      specialty: "Verifikasi Rekening Tinggi (KRPT) & Keringanan",
    },
    {
      name: "Fajar Pratama",
      role: "Surveyor Lapangan Tagihan",
      divisionId: "sales_support",
      email: "fajar.pratama@aetra.co.id",
      phone: "0813-1122-3344",
      avatarColor: { main: "#0284C7", bg: "#EFF6FF", border: "#BFDBFE" },
      unit: "Unit Survey OSS 01",
      specialty: "Pencocokan Foto Stand Meter Aktual vs Billing",
    },
    {
      name: "Rian Hidayat",
      role: "Teknisi Sambung Tunggakan",
      divisionId: "sales_support",
      email: "rian.hidayat@aetra.co.id",
      phone: "0815-6677-8899",
      avatarColor: { main: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
      unit: "Unit Penertiban OSS",
      specialty: "Penyambungan Kembali Tunggakan Lunas & Segel",
    },
    {
      name: "Siti Nurhaliza",
      role: "Petugas Administrasi OSS",
      divisionId: "sales_support",
      email: "siti.nurhaliza@aetra.co.id",
      phone: "0818-5566-7788",
      avatarColor: { main: "#8B5CF6", bg: "#F5F3FF", border: "#DDD6FE" },
      unit: "Unit Administrasi",
      specialty: "Pengajuan Pipa Dinas Baru & Balik Nama",
    },
  ],
  key_account: [
    {
      name: "H. Rudi Hartono",
      role: "Senior Key Account Specialist",
      divisionId: "key_account",
      email: "rudi.hartono@aetra.co.id",
      phone: "0812-9900-1122",
      avatarColor: { main: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
      unit: "Unit TKA Sentra Industri",
      specialty: "Monitoring Debit & Manometer Pabrik Industri",
    },
    {
      name: "Dimas Wahyu",
      role: "Field Engineer Industri",
      divisionId: "key_account",
      email: "dimas.wahyu@aetra.co.id",
      phone: "0813-8899-0011",
      avatarColor: { main: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
      unit: "Unit Engineer TKA 01",
      specialty: "Booster Pump Industri & Katup 4 Inch",
    },
    {
      name: "Bayu Saputra",
      role: "Teknisi Pipa Industri & Valve",
      divisionId: "key_account",
      email: "bayu.saputra@aetra.co.id",
      phone: "0817-2233-4455",
      avatarColor: { main: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
      unit: "Unit Teknis TKA 02",
      specialty: "Jaringan Distribusi Kawasan Industri Cikupa",
    },
  ],
  technical_support: [
    {
      name: "Dr. Agus Sutrisno",
      role: "Manager Tech Support & Lab",
      divisionId: "technical_support",
      email: "tech.support@aetra.co.id",
      phone: "0812-4455-6677",
      avatarColor: { main: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
      unit: "Laboratorium Kualitas Air",
      specialty: "Uji Kekeruhan, Sisa Klorin & Bakteriologi Air",
    },
    {
      name: "Ilham Maulana",
      role: "Analis Kualitas Air Lapangan",
      divisionId: "technical_support",
      email: "ilham.maulana@aetra.co.id",
      phone: "0813-5566-7788",
      avatarColor: { main: "#0284C7", bg: "#EFF6FF", border: "#BFDBFE" },
      unit: "Unit Uji Lapangan",
      specialty: "Flushing Washout Pipa Distribusi & Uji Bau Tanah",
    },
    {
      name: "Doni Kusuma",
      role: "Teknisi Bangku Tera Kalibrasi",
      divisionId: "technical_support",
      email: "doni.kusuma@aetra.co.id",
      phone: "0815-9988-7766",
      avatarColor: { main: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
      unit: "Unit Bangku Tera",
      specialty: "Pengujian Akurasi Putaran Meter Air & Tera Segel",
    },
  ],
  customer_service: [
    {
      name: "Putri Delia",
      role: "Supervisor Dispatcher CS",
      divisionId: "customer_service",
      email: "cs.admin@aetra.co.id",
      phone: "0812-1111-2222",
      avatarColor: { main: "#0284C7", bg: "#EFF6FF", border: "#BFDBFE" },
      unit: "Pusat Dispatcher CS",
      specialty: "Distribusi WO Cepat & Koordinasi Lintas Divisi",
    },
    {
      name: "Ahmad Fauzi",
      role: "Contact Center & Dispatcher",
      divisionId: "customer_service",
      email: "ahmad.fauzi@aetra.co.id",
      phone: "0813-7788-9911",
      avatarColor: { main: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
      unit: "Unit Call Center & WA",
      specialty: "Verifikasi Pengaduan & Re-dispatch WO Lapangan",
    },
    {
      name: "Rina Marlina",
      role: "Petugas Hubungan Pelanggan",
      divisionId: "customer_service",
      email: "rina.marlina@aetra.co.id",
      phone: "0817-6655-4433",
      avatarColor: { main: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
      unit: "Unit Layanan Posko",
      specialty: "Edukasi Pelanggan & Verifikasi Sambungan",
    },
  ],
};

export const ALL_OFFICERS: DivisionOfficer[] = Object.values(DIVISION_OFFICER_ROSTER).flat();

export function getOfficersForDivision(divisionId: DivisionId): DivisionOfficer[] {
  return DIVISION_OFFICER_ROSTER[divisionId] || DIVISION_OFFICER_ROSTER.minor_repair;
}

export function findOfficerByName(name: string): DivisionOfficer | undefined {
  if (!name) return undefined;
  const clean = name.trim().toLowerCase();
  return ALL_OFFICERS.find(
    (o) =>
      o.name.toLowerCase() === clean ||
      o.name.toLowerCase().includes(clean) ||
      clean.includes(o.name.toLowerCase().split(" ")[0])
  );
}

export interface TransferReasonPreset {
  label: string;
  recommendedDivision: DivisionId;
  defaultText: string;
  icon: string;
}

export const TRANSFER_REASON_PRESETS: TransferReasonPreset[] = [
  {
    label: "Air Keruh / Berbau (Perlu Uji Lab)",
    recommendedDivision: "technical_support",
    defaultText: "Air keluar keruh dan berbau tanah, diperlukan uji laboratorium kualitas air dan flushing washout jaringan pipa distribusi.",
    icon: "🔬",
  },
  {
    label: "Lonjakan Tagihan Rekening (KRPT)",
    recommendedDivision: "sales_support",
    defaultText: "Pelanggan komplain lonjakan rekening air tidak wajar, tidak ada kebocoran fisik. Dialihkan ke Sales Support untuk verifikasi stand meter dan penyesuaian billing.",
    icon: "💼",
  },
  {
    label: "Kawasan Industri / Tekanan Pabrik",
    recommendedDivision: "key_account",
    defaultText: "Pelanggan berada di kawasan industri dengan sambungan komersial besar. Dialihkan ke Technical Key Account untuk pengecekan booster pump & katup 4 inch.",
    icon: "🏢",
  },
  {
    label: "Pipa Persil / Bocor Fisik Lapangan",
    recommendedDivision: "minor_repair",
    defaultText: "Ditemukan kebocoran fisik pada pipa persil / dinas di luar meteran. Dialihkan ke tim Minor Repair untuk perbaikan pipa dan ganti stop kran kuningan.",
    icon: "🛠️",
  },
  {
    label: "Permintaan Tera Uji Akurasi Meter",
    recommendedDivision: "technical_support",
    defaultText: "Pelanggan meminta pengujian akurasi putaran meter air. Dialihkan ke Technical Support untuk kalibrasi di fasilitas bangku tera.",
    icon: "⚖️",
  },
  {
    label: "Buka Segel / Tunggakan Sudah Lunas",
    recommendedDivision: "sales_support",
    defaultText: "Pelanggan telah melunasi denda tunggakan di loket. Dialihkan ke Operasional Sales Support untuk penerbitan surat perintah penyambungan dan buka kran segel.",
    icon: "🔓",
  },
  {
    label: "Alamat Salah / Perlu Klarifikasi CS",
    recommendedDivision: "customer_service",
    defaultText: "Nomor sambungan atau alamat di lapangan tidak sesuai dengan pelanggan pelapor. Dialihkan kembali ke Customer Service untuk verifikasi ulang kontak pelanggan.",
    icon: "🎧",
  },
];
