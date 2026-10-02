/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Weekly Repair SLA & Completion Time Analysis Service
 * Divisi Minor Repair & Operasional - PT Aetra Air Tangerang
 */

import { UnifiedTicket } from "./divisionTicketService";
import { ComplaintItem } from "../minorRepairApp";
import { AETRA_CASE_SLA_DAYS, getAetraCaseSlaDays } from "../types/division";

export interface SlaDayData {
  dayName: string; // e.g. "Senin", "Selasa", ...
  dateStr: string; // e.g. "2026-09-21"
  dateLabel: string; // e.g. "21 Sep"
  avgCompletionHours: number;
  avgCompletionDays: number;
  targetSlaHours: number;
  targetSlaDays: number;
  completedCount: number;
  onTimeCount: number;
  complianceRate: number; // percentage (0 - 100)
  isToday: boolean;
  deltaHours: number; // actual - target (negative means faster)
}

export interface SlaCategoryData {
  categoryKey: string;
  categoryLabel: string;
  completedCount: number;
  avgCompletionHours: number;
  avgCompletionDays: number;
  targetSlaHours: number;
  targetSlaDays: number;
  complianceRate: number;
  deltaHours: number;
}

export interface SlaOfficerData {
  officerName: string;
  completedCount: number;
  avgCompletionHours: number;
  avgCompletionDays: number;
  targetSlaHours: number;
  targetSlaDays: number;
  complianceRate: number;
}

export interface WeeklySlaSummary {
  weekStart: string; // ISO date of Monday
  weekEnd: string; // ISO date of Sunday
  weekLabel: string; // e.g. "21 - 27 September 2026"
  totalCompletedThisWeek: number;
  overallAvgCompletionHours: number;
  overallAvgCompletionDays: number;
  overallTargetSlaHours: number;
  overallTargetSlaDays: number;
  overallComplianceRate: number;
  totalOnTime: number;
  varianceHours: number; // negative means faster than target
  variancePercentage: number;
  fastestCompletionHours: number;
  slowestCompletionHours: number;
  dailyData: SlaDayData[];
  categoryData: SlaCategoryData[];
  officerData: SlaOfficerData[];
}

export const SLA_RULES_HOURS: Record<string, number> = Object.entries(AETRA_CASE_SLA_DAYS).reduce(
  (acc, [k, days]) => {
    acc[k] = days * 24;
    return acc;
  },
  {} as Record<string, number>
);

export const CATEGORY_NAMES_MAP: Record<string, string> = {
  BPPD: "Biaya Penambahan Pipa Dinas",
  BPPDIND: "Biaya Penambahan Pipa Dinas Industri",
  "INFO-PLG": "Info ke Pelanggan",
  INFO_PLG: "Info ke Pelanggan",
  KATM: "Air Tidak Mengalir Domestic",
  KATMIND: "Air Tidak Mengalir Industri",
  KATR: "Air Kotor Domestic",
  KATRIND: "Air Kotor Industri",
  KBBP: "Sudah Bayar Belum Pasang Meter",
  KBGL: "Bekas Galian",
  KBSM: "Bocor Sebelum Meter",
  KBSMIND: "Bocor Sebelum Meter Industri",
  KBTR: "Belum Menerima Tagihan",
  KBTT: "Sudah Bayar Tapi di Tagih",
  KILL: "Illegal Consumption",
  KKMR: "Kran Meter Rusak",
  KKMRIND: "Kran Meter Rusak Industri",
  KLBC: "Pipa Jaringan Bocor",
  KMAL: "Meter Air Lepas",
  KMALIND: "Meter Air Lepas Industri",
  KMDT: "Meter Dipasang Terbalik",
  KMTA: "Meter Tidak Ada",
  KPAP: "Perubahan Alamat Premise",
  KPAT: "Perubahan Alamat Billing",
  KPCT: "Pengajuan Cicilan Tagihan",
  KPDB: "Double Bayar",
  KPGP: "Permintaan Balik Nama",
  KPKT: "Penyambungan Kembali Akibat Tunggakan",
  KPMR: "Meter Rusak",
  KPMRIND: "Meter Rusak Industri",
  KPPA: "Revisi Nama",
  KPPM: "Perilaku Pembaca Meter",
  KPPR: "Pipa Dinas Rusak",
  KPPS: "Permintaan Pemutusan Sambungan",
  KPPSIND: "Permintaan Pemutusan Sambungan Industri",
  KPSB: "Salah Bayar",
  KPSM: "Petugas Penyegelan",
  KRMT: "Permintaan Relokasi Meter (teknis)",
  KRPR: "Rekening Pembayaran Rendah",
  KRPT: "Rekening Pembayaran Tinggi",
  KSPM: "Meter Tertukar",
  KTST: "Tidak Sesuai Tarif",
  "KTST-RC": "Tidak Sesuai Tarif - Re Class",
  KTST_RC: "Tidak Sesuai Tarif - Re Class",
  LAPUL: "Lapor Ulang",
  PPMI: "Permintaan Penyesuaian Meter Industri",
  TERAREQ: "Tera Meter Request",
  TR09: "Pindah Meter",
  TRO9: "Pindah Meter",
  TR09IND: "Pindah Meter Industri",
  TRO9IND: "Pindah Meter Industri",
};

/**
 * Returns the target SLA in hours for a given complaint category
 */
export function getTargetSlaHours(category: string): number {
  return getAetraCaseSlaDays(category) * 24;
}

/**
 * Calculate the start (Monday 00:00:00) and end (Sunday 23:59:59) of the current week
 */
export function getCurrentWeekBounds(baseDate: Date = new Date()): {
  startOfWeek: Date;
  endOfWeek: Date;
  days: { date: Date; name: string; label: string; isToday: boolean }[];
} {
  const curr = new Date(baseDate);
  const dayOfWeek = curr.getDay(); // 0 = Sunday, 1 = Monday, ...
  // Calculate difference to Monday: in JS Sunday is 0, so if 0, diff is -6
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(curr);
  monday.setDate(curr.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const DAY_NAMES = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
    "Minggu",
  ];
  const MONTH_NAMES_SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];

  const days: {
    date: Date;
    name: string;
    label: string;
    isToday: boolean;
  }[] = [];

  const todayStr = curr.toISOString().split("T")[0];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dStr = d.toISOString().split("T")[0];
    days.push({
      date: d,
      name: DAY_NAMES[i],
      label: `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]}`,
      isToday: dStr === todayStr,
    });
  }

  return { startOfWeek: monday, endOfWeek: sunday, days };
}

export interface TicketWithCompletion {
  id: string;
  caseId?: string;
  customer: string;
  category: string;
  officer: string;
  receivedAt: string;
  completedAt: string;
  durationHours: number;
  durationDays: number;
  targetSlaHours: number;
  targetSlaDays: number;
  isOnTime: boolean;
  deltaHours: number;
}

/**
 * Normalizes completed tickets and extracts duration in hours
 */
export function normalizeCompletedTickets(
  rawTickets: Array<UnifiedTicket | ComplaintItem>
): TicketWithCompletion[] {
  const result: TicketWithCompletion[] = [];

  for (const item of rawTickets) {
    if (item.status !== "selesai") continue;
    if (!item.completedAt) continue;

    const completedTime = new Date(item.completedAt).getTime();
    if (isNaN(completedTime)) continue;

    // Use receivedAt or fallback to 4 hours prior to completedAt
    const receivedTime = item.receivedAt
      ? new Date(item.receivedAt).getTime()
      : completedTime - 4 * 3600 * 1000;
    const validReceivedTime = isNaN(receivedTime)
      ? completedTime - 4 * 3600 * 1000
      : receivedTime;

    const durationMs = Math.max(completedTime - validReceivedTime, 15 * 60 * 1000);
    const durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10;
    const durationDays = Math.round((durationHours / 24) * 10) / 10;

    const targetSlaHours = getTargetSlaHours(item.category);
    const targetSlaDays = Math.round((targetSlaHours / 24) * 10) / 10;
    const isOnTime = durationHours <= targetSlaHours;
    const deltaHours = Math.round((durationHours - targetSlaHours) * 10) / 10;

    result.push({
      id: item.id,
      caseId: item.caseId,
      customer: item.customer || "Pelanggan Aetra",
      category: item.category || "KBSM",
      officer: item.officer || "Petugas Armada",
      receivedAt: new Date(validReceivedTime).toISOString(),
      completedAt: new Date(completedTime).toISOString(),
      durationHours,
      durationDays,
      targetSlaHours,
      targetSlaDays,
      isOnTime,
      deltaHours,
    });
  }

  return result;
}

/**
 * Computes weekly SLA metrics for the current week
 */
export function computeWeeklySlaMetrics(
  rawTickets: Array<UnifiedTicket | ComplaintItem>,
  baseDate: Date = new Date()
): WeeklySlaSummary {
  const { startOfWeek, endOfWeek, days } = getCurrentWeekBounds(baseDate);
  const normalized = normalizeCompletedTickets(rawTickets);

  const startMs = startOfWeek.getTime();
  const endMs = endOfWeek.getTime();

  // Filter tickets completed during current week
  const weekTickets = normalized.filter((t) => {
    const compTime = new Date(t.completedAt).getTime();
    return compTime >= startMs && compTime <= endMs;
  });

  const MONTH_NAMES_LONG = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const weekLabel = `${startOfWeek.getDate()} ${
    MONTH_NAMES_LONG[startOfWeek.getMonth()]
  } - ${endOfWeek.getDate()} ${
    MONTH_NAMES_LONG[endOfWeek.getMonth()]
  } ${endOfWeek.getFullYear()}`;

  // 1. Daily Aggregation
  const dailyData: SlaDayData[] = days.map((dayInfo) => {
    const dayStart = new Date(dayInfo.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayInfo.date);
    dayEnd.setHours(23, 59, 59, 999);

    const startT = dayStart.getTime();
    const endT = dayEnd.getTime();

    const ticketsThisDay = weekTickets.filter((t) => {
      const compT = new Date(t.completedAt).getTime();
      return compT >= startT && compT <= endT;
    });

    const count = ticketsThisDay.length;
    let avgHours = 0;
    let targetHours = 0;
    let onTimeCount = 0;

    if (count > 0) {
      const sumActual = ticketsThisDay.reduce(
        (acc, cur) => acc + cur.durationHours,
        0
      );
      const sumTarget = ticketsThisDay.reduce(
        (acc, cur) => acc + cur.targetSlaHours,
        0
      );
      avgHours = Math.round((sumActual / count) * 10) / 10;
      targetHours = Math.round((sumTarget / count) * 10) / 10;
      onTimeCount = ticketsThisDay.filter((t) => t.isOnTime).length;
    } else {
      // Default baseline standard for empty days to provide a clear reference target
      targetHours = 48; // standard 48 hours SLA target
    }

    const avgDays = Math.round((avgHours / 24) * 10) / 10;
    const targetDays = Math.round((targetHours / 24) * 10) / 10;
    const complianceRate =
      count > 0 ? Math.round((onTimeCount / count) * 100) : 100;
    const deltaHours = Math.round((avgHours - targetHours) * 10) / 10;

    return {
      dayName: dayInfo.name,
      dateStr: dayInfo.date.toISOString().split("T")[0],
      dateLabel: dayInfo.label,
      avgCompletionHours: avgHours,
      avgCompletionDays: avgDays,
      targetSlaHours: targetHours,
      targetSlaDays: targetDays,
      completedCount: count,
      onTimeCount,
      complianceRate,
      isToday: dayInfo.isToday,
      deltaHours,
    };
  });

  // 2. Category Aggregation
  const categoryGroups: Record<string, TicketWithCompletion[]> = {};
  for (const t of weekTickets) {
    if (!categoryGroups[t.category]) {
      categoryGroups[t.category] = [];
    }
    categoryGroups[t.category].push(t);
  }

  const categoryData: SlaCategoryData[] = Object.keys(categoryGroups).map(
    (catKey) => {
      const group = categoryGroups[catKey];
      const count = group.length;
      const sumActual = group.reduce(
        (acc, cur) => acc + cur.durationHours,
        0
      );
      const sumTarget = group.reduce(
        (acc, cur) => acc + cur.targetSlaHours,
        0
      );
      const avgHours = Math.round((sumActual / count) * 10) / 10;
      const targetHours = Math.round((sumTarget / count) * 10) / 10;
      const onTime = group.filter((t) => t.isOnTime).length;

      return {
        categoryKey: catKey,
        categoryLabel: CATEGORY_NAMES_MAP[catKey] || catKey,
        completedCount: count,
        avgCompletionHours: avgHours,
        avgCompletionDays: Math.round((avgHours / 24) * 10) / 10,
        targetSlaHours: targetHours,
        targetSlaDays: Math.round((targetHours / 24) * 10) / 10,
        complianceRate: Math.round((onTime / count) * 100),
        deltaHours: Math.round((avgHours - targetHours) * 10) / 10,
      };
    }
  );

  // 3. Officer Aggregation
  const officerGroups: Record<string, TicketWithCompletion[]> = {};
  for (const t of weekTickets) {
    const off = t.officer || "Lainnya";
    if (!officerGroups[off]) {
      officerGroups[off] = [];
    }
    officerGroups[off].push(t);
  }

  const officerData: SlaOfficerData[] = Object.keys(officerGroups).map(
    (offName) => {
      const group = officerGroups[offName];
      const count = group.length;
      const sumActual = group.reduce(
        (acc, cur) => acc + cur.durationHours,
        0
      );
      const sumTarget = group.reduce(
        (acc, cur) => acc + cur.targetSlaHours,
        0
      );
      const avgHours = Math.round((sumActual / count) * 10) / 10;
      const targetHours = Math.round((sumTarget / count) * 10) / 10;
      const onTime = group.filter((t) => t.isOnTime).length;

      return {
        officerName: offName,
        completedCount: count,
        avgCompletionHours: avgHours,
        avgCompletionDays: Math.round((avgHours / 24) * 10) / 10,
        targetSlaHours: targetHours,
        targetSlaDays: Math.round((targetHours / 24) * 10) / 10,
        complianceRate: Math.round((onTime / count) * 100),
      };
    }
  );

  // Overall Weekly Calculations
  const totalCompletedThisWeek = weekTickets.length;
  let overallAvgCompletionHours = 0;
  let overallTargetSlaHours = 0;
  let totalOnTime = 0;
  let fastest = 0;
  let slowest = 0;

  if (totalCompletedThisWeek > 0) {
    const sumActual = weekTickets.reduce(
      (acc, cur) => acc + cur.durationHours,
      0
    );
    const sumTarget = weekTickets.reduce(
      (acc, cur) => acc + cur.targetSlaHours,
      0
    );
    overallAvgCompletionHours =
      Math.round((sumActual / totalCompletedThisWeek) * 10) / 10;
    overallTargetSlaHours =
      Math.round((sumTarget / totalCompletedThisWeek) * 10) / 10;
    totalOnTime = weekTickets.filter((t) => t.isOnTime).length;

    const durations = weekTickets.map((t) => t.durationHours);
    fastest = Math.min(...durations);
    slowest = Math.max(...durations);
  } else {
    overallTargetSlaHours = 48;
  }

  const overallAvgCompletionDays =
    Math.round((overallAvgCompletionHours / 24) * 10) / 10;
  const overallTargetSlaDays =
    Math.round((overallTargetSlaHours / 24) * 10) / 10;
  const overallComplianceRate =
    totalCompletedThisWeek > 0
      ? Math.round((totalOnTime / totalCompletedThisWeek) * 100)
      : 100;
  const varianceHours =
    Math.round((overallAvgCompletionHours - overallTargetSlaHours) * 10) / 10;
  const variancePercentage =
    overallTargetSlaHours > 0
      ? Math.round((varianceHours / overallTargetSlaHours) * 100)
      : 0;

  return {
    weekStart: startOfWeek.toISOString(),
    weekEnd: endOfWeek.toISOString(),
    weekLabel,
    totalCompletedThisWeek,
    overallAvgCompletionHours,
    overallAvgCompletionDays,
    overallTargetSlaHours,
    overallTargetSlaDays,
    overallComplianceRate,
    totalOnTime,
    varianceHours,
    variancePercentage,
    fastestCompletionHours: fastest,
    slowestCompletionHours: slowest,
    dailyData,
    categoryData,
    officerData,
  };
}
