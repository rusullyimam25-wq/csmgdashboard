/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Weekly Repair SLA vs Completion Time Recharts Widget
 * Admin Dashboard - PT Aetra Air Tangerang
 */

import React, { useState, useEffect, useMemo } from "react";
import { createRoot, Root } from "react-dom/client";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  computeWeeklySlaMetrics,
  WeeklySlaSummary,
  SlaDayData,
  SlaCategoryData,
  SlaOfficerData,
} from "../services/weeklySlaService";
import { loadAllUnifiedTickets, saveSingleTicket, UnifiedTicket } from "../services/divisionTicketService";

export interface ChartItem {
  name: string;
  fullName?: string;
  shortName?: string;
  actualTime: number;
  targetSla: number;
  count: number;
  onTimeCount?: number;
  complianceRate: number;
  deltaHours?: number;
  isFaster: boolean;
  isToday?: boolean;
}

interface WeeklySlaWidgetProps {
  initialTickets?: any[];
  onRefreshRequested?: () => void;
}

export const WeeklySlaRechartsWidget: React.FC<WeeklySlaWidgetProps> = ({
  initialTickets,
  onRefreshRequested,
}) => {
  const [viewMode, setViewMode] = useState<"daily" | "category" | "officer">("daily");
  const [unitMode, setUnitMode] = useState<"hours" | "days">("hours");
  const [chartType, setChartType] = useState<"composed" | "bar">("composed");
  const [tickets, setTickets] = useState<any[]>(() => {
    if (initialTickets && initialTickets.length > 0) return initialTickets;
    return loadAllUnifiedTickets();
  });
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Sync when initialTickets prop changes
  useEffect(() => {
    if (initialTickets && initialTickets.length > 0) {
      setTickets(initialTickets);
    }
  }, [initialTickets]);

  // Compute metrics
  const summary: WeeklySlaSummary = useMemo(() => {
    return computeWeeklySlaMetrics(tickets);
  }, [tickets, lastRefreshed]);

  const refreshData = () => {
    const loaded = loadAllUnifiedTickets();
    setTickets(loaded);
    setLastRefreshed(new Date());
    if (onRefreshRequested) onRefreshRequested();
  };

  // Add sample completed ticket for current week simulation
  const handleSimulateNewCompletion = () => {
    setIsSimulating(true);
    const idNum = Math.floor(100 + Math.random() * 900);
    const newId = `WO-2026-SIM${idNum}`;
    const officers = ["Budi Santoso", "Agus Setiawan", "Dedi Kurniawan", "Hendra Wijaya", "Eko Prasetyo"];
    const cats = ["KBSM", "KKMR", "KPMR", "KATM", "KATR"];
    const areas = ["Cikupa", "Tigaraksa", "Sepatan", "Panongan", "Pasar Kemis"];
    const chosenOfficer = officers[Math.floor(Math.random() * officers.length)];
    const chosenCat = cats[Math.floor(Math.random() * cats.length)];
    const chosenArea = areas[Math.floor(Math.random() * areas.length)];

    // Received 6 to 24 hours ago, completed now
    const durationHours = Math.round((2 + Math.random() * 16) * 10) / 10;
    const now = new Date();
    const received = new Date(now.getTime() - durationHours * 3600 * 1000);

    const newTicket: UnifiedTicket = {
      id: newId,
      caseId: `10048${idNum}`,
      customer: `Simulasi Warga RT 0${Math.floor(Math.random() * 9 + 1)} (${chosenArea})`,
      phone: "081234567890",
      meterId: `MTR-SIM${idNum}`,
      address: `Jl. Flamboyan No. ${Math.floor(Math.random() * 50 + 1)}, ${chosenArea}`,
      area: chosenArea,
      category: chosenCat,
      desc: `Perbaikan darurat ${chosenCat} diselesaikan cepat oleh ${chosenOfficer} [Simulasi Live SLA]`,
      status: "selesai",
      urgent: Math.random() > 0.6,
      coords: "-6.2231, 106.5134",
      receivedAt: received.toISOString(),
      completedAt: now.toISOString(),
      officer: chosenOfficer,
      targetDivision: "minor_repair",
      distributionStatus: "resolved",
      distributedAt: received.toISOString(),
      distributedBy: "Sistem SLA Dispatcher",
      completionNotes: `Perbaikan cepat penggantian suku cadang standar. Selesai dalam durasi ${durationHours} jam.`,
      usedMaterials: ["Seal Tape", "Fitting Sambungan 1/2\""],
      customerSignerName: "Pelanggan Terverifikasi",
      customerSignature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };

    saveSingleTicket(newTicket);
    refreshData();

    // Trigger global event for other components if listening
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("aetra:ticket_created_or_updated", {
          detail: { ticket: newTicket },
        })
      );
    }

    setTimeout(() => setIsSimulating(false), 600);
  };

  // Export CSV summary
  const handleExportCsv = () => {
    let csv = "";
    if (viewMode === "daily") {
      csv = "Hari,Tanggal,Rata-rata Waktu Selesai (Jam),Target SLA (Jam),Selisih (Jam),Total WO Selesai,Sesuai SLA,Kepatuhan SLA (%)\n";
      summary.dailyData.forEach((d) => {
        csv += `"${d.dayName}","${d.dateStr}",${d.avgCompletionHours},${d.targetSlaHours},${d.deltaHours},${d.completedCount},${d.onTimeCount},${d.complianceRate}%\n`;
      });
    } else if (viewMode === "category") {
      csv = "Kategori Kasus,Nama Gangguan,Rata-rata Waktu Selesai (Jam),Target SLA (Jam),Selisih (Jam),Total WO,Kepatuhan (%)\n";
      summary.categoryData.forEach((c) => {
        csv += `"${c.categoryKey}","${c.categoryLabel}",${c.avgCompletionHours},${c.targetSlaHours},${c.deltaHours},${c.completedCount},${c.complianceRate}%\n`;
      });
    } else {
      csv = "Petugas Lapangan,Total WO Selesai,Rata-rata Waktu Selesai (Jam),Target Acuan (Jam),Kepatuhan SLA (%)\n";
      summary.officerData.forEach((o) => {
        csv += `"${o.officerName}",${o.completedCount},${o.avgCompletionHours},${o.targetSlaHours},${o.complianceRate}%\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Laporan_SLA_Mingguan_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format Recharts data based on active view and units
  const chartData: ChartItem[] = useMemo(() => {
    const isHours = unitMode === "hours";

    if (viewMode === "daily") {
      return summary.dailyData.map((d): ChartItem => {
        const actual = isHours ? d.avgCompletionHours : d.avgCompletionDays;
        const target = isHours ? d.targetSlaHours : d.targetSlaDays;
        const isFaster = d.deltaHours <= 0;
        return {
          name: `${d.dayName} (${d.dateLabel})`,
          shortName: d.dayName,
          actualTime: actual,
          targetSla: target,
          count: d.completedCount,
          onTimeCount: d.onTimeCount,
          complianceRate: d.complianceRate,
          deltaHours: d.deltaHours,
          isFaster,
          isToday: d.isToday,
        };
      });
    }

    if (viewMode === "category") {
      return summary.categoryData.map((c): ChartItem => {
        const actual = isHours ? c.avgCompletionHours : c.avgCompletionDays;
        const target = isHours ? c.targetSlaHours : c.targetSlaDays;
        const isFaster = c.deltaHours <= 0;
        return {
          name: c.categoryKey,
          fullName: c.categoryLabel,
          actualTime: actual,
          targetSla: target,
          count: c.completedCount,
          complianceRate: c.complianceRate,
          deltaHours: c.deltaHours,
          isFaster,
        };
      });
    }

    // Officer view
    return summary.officerData.map((o): ChartItem => {
      const actual = isHours ? o.avgCompletionHours : o.avgCompletionDays;
      const target = isHours ? o.targetSlaHours : o.targetSlaDays;
      return {
        name: o.officerName.split(" ")[0], // First name for neat X-axis
        fullName: o.officerName,
        actualTime: actual,
        targetSla: target,
        count: o.completedCount,
        complianceRate: o.complianceRate,
        isFaster: actual <= target,
      };
    });
  }, [summary, viewMode, unitMode]);

  const unitLabel = unitMode === "hours" ? "Jam" : "Hari";
  const benchmarkSla =
    unitMode === "hours"
      ? summary.overallTargetSlaHours
      : summary.overallTargetSlaDays;

  // Custom Rich Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const actualVal = data.actualTime;
      const targetVal = data.targetSla;
      const countVal = data.count || 0;
      const compRate = data.complianceRate ?? 100;
      const diffVal = Math.round((actualVal - targetVal) * 10) / 10;
      const isPositive = diffVal <= 0;

      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs min-w-[210px] space-y-1.5 z-50">
          <div className="font-bold text-sm text-slate-100 border-b border-slate-800 pb-1 flex justify-between items-center">
            <span>{data.fullName || label}</span>
            {data.isToday && (
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-medium">
                Hari Ini
              </span>
            )}
          </div>
          <div className="flex justify-between items-center text-slate-300 pt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
              Rata-rata Waktu Selesai:
            </span>
            <span className="font-semibold text-white">
              {actualVal} {unitLabel}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
              Target SLA Manajemen:
            </span>
            <span className="font-semibold text-amber-300">
              {targetVal} {unitLabel}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>Varians vs SLA:</span>
            <span
              className={`font-bold ${
                isPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isPositive
                ? `⚡ Lebih cepat ${Math.abs(diffVal)} ${unitLabel}`
                : `⚠️ Melewati target ${diffVal} ${unitLabel}`}
            </span>
          </div>
          <div className="border-t border-slate-800 pt-1.5 flex justify-between items-center text-[11px] text-slate-400">
            <span>Volume WO: {countVal} kasus</span>
            <span>Kepatuhan: {compRate}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-4 sm:p-5 space-y-4 font-sans text-slate-800 dark:text-slate-100 transition-colors">
      {/* 1. Header & Title Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label="clock">
              ⏱️
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white m-0">
              Waktu Selesai Perbaikan vs Target SLA (Minggu Ini)
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Periode Mingguan: {summary.weekLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Standar SLA Divisi Minor Repair</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Aktif Terhubung ke Sistem WO
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSimulateNewCompletion}
            disabled={isSimulating}
            title="Tambah simulasi tiket WO baru yang selesai hari ini untuk menguji kalkulasi Recharts"
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <span>{isSimulating ? "⏳" : "⚡"}</span>
            <span>Uji Selesai WO Baru</span>
          </button>

          <button
            onClick={handleExportCsv}
            title="Unduh rekapitulasi data SLA mingguan ke format CSV"
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <span>📥</span>
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={refreshData}
            title="Segarkan data penyelesaian dan target SLA"
            className="p-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <span role="img" aria-label="refresh">
              🔄
            </span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPI Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1: Actual Average Completion */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Rata-rata Waktu Selesai
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
            {unitMode === "hours"
              ? `${summary.overallAvgCompletionHours} Jam`
              : `${summary.overallAvgCompletionDays} Hari`}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Dari {summary.totalCompletedThisWeek} kasus selesai
          </div>
        </div>

        {/* Metric 2: Target SLA Benchmark */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Target SLA Acuan
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {unitMode === "hours"
              ? `${summary.overallTargetSlaHours} Jam`
              : `${summary.overallTargetSlaDays} Hari`}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Target maksimal manajemen
          </div>
        </div>

        {/* Metric 3: SLA Variance / Efficiency */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Varians Efisiensi SLA
          </div>
          <div
            className={`text-xl sm:text-2xl font-black mt-0.5 ${
              summary.varianceHours <= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {summary.varianceHours <= 0
              ? `-${Math.abs(
                  unitMode === "hours"
                    ? summary.varianceHours
                    : Math.round((summary.varianceHours / 24) * 10) / 10
                )} ${unitLabel}`
              : `+${
                  unitMode === "hours"
                    ? summary.varianceHours
                    : Math.round((summary.varianceHours / 24) * 10) / 10
                } ${unitLabel}`}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {summary.varianceHours <= 0
              ? `⚡ ${Math.abs(summary.variancePercentage)}% lebih cepat dari target`
              : `⚠️ ${summary.variancePercentage}% di atas target SLA`}
          </div>
        </div>

        {/* Metric 4: SLA Compliance Rate */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Kepatuhan SLA (% On-Time)
          </div>
          <div
            className={`text-xl sm:text-2xl font-black mt-0.5 ${
              summary.overallComplianceRate >= 85
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {summary.overallComplianceRate}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {summary.totalOnTime} dari {summary.totalCompletedThisWeek} tepat
            waktu
          </div>
        </div>

        {/* Metric 5: Fastest vs Slowest */}
        <div className="col-span-2 sm:col-span-1 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-100 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Rentang Durasi Lapangan
          </div>
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1.5 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Tercepat:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                {unitMode === "hours"
                  ? `${summary.fastestCompletionHours}j`
                  : `${Math.round((summary.fastestCompletionHours / 24) * 10) / 10}h`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Terpanjang:</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold">
                {unitMode === "hours"
                  ? `${summary.slowestCompletionHours}j`
                  : `${Math.round((summary.slowestCompletionHours / 24) * 10) / 10}h`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive Filter Bar & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Dimension View Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
          <button
            onClick={() => setViewMode("daily")}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === "daily"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            📅 Tren Harian (Sen - Min)
          </button>
          <button
            onClick={() => setViewMode("category")}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === "category"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            🔧 Per Kategori Kerusakan
          </button>
          <button
            onClick={() => setViewMode("officer")}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === "officer"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            👷 Per Petugas Lapangan
          </button>
        </div>

        {/* Secondary controls: Unit mode & Chart type */}
        <div className="flex items-center gap-2 text-xs">
          {/* Unit Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setUnitMode("hours")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                unitMode === "hours"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              Jam
            </button>
            <button
              onClick={() => setUnitMode("days")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                unitMode === "days"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              Hari
            </button>
          </div>

          {/* Chart Display Style Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => setChartType("composed")}
              title="Grafik Batang Waktu Nyata + Garis Target SLA"
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                chartType === "composed"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              📊 Batang + Garis SLA
            </button>
            <button
              onClick={() => setChartType("bar")}
              title="Grafik Batang Berdampingan"
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                chartType === "bar"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              📶 Batang Berdampingan
            </button>
          </div>
        </div>
      </div>

      {/* 4. Recharts Visualization Canvas */}
      <div className="w-full bg-slate-50/50 dark:bg-slate-950/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800/80">
        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mb-2 px-1">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {viewMode === "daily" && "📅 Performa Hari demi Hari Minggu Ini"}
            {viewMode === "category" && "🔧 Durasi Penanganan Berdasarkan Jenis Kerusakan"}
            {viewMode === "officer" && "👷 Rata-rata Durasi Perbaikan per Teknisi Armada"}
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-600 inline-block" />
              <span>Rata-rata Waktu Selesai (Aktual)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-500 inline-block" />
              <span>Target SLA ({unitLabel})</span>
            </span>
          </div>
        </div>

        <div className="w-full h-[320px] sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 25, left: -5, bottom: 25 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#94A3B8"
                opacity={0.2}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#64748B" }}
                tickLine={false}
                axisLine={{ stroke: "#CBD5E1", opacity: 0.5 }}
                dy={8}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748B" }}
                tickLine={false}
                axisLine={{ stroke: "#CBD5E1", opacity: 0.5 }}
                unit={` ${unitLabel}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                height={32}
                iconSize={10}
                formatter={(value) => (
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {value === "actualTime"
                      ? `Rata-rata Selesai (${unitLabel})`
                      : `Target Batas SLA (${unitLabel})`}
                  </span>
                )}
              />

              {/* Reference line for average SLA target benchmark */}
              <ReferenceLine
                y={benchmarkSla}
                stroke="#F59E0B"
                strokeDasharray="5 5"
                label={{
                  value: `Acuan SLA: ${benchmarkSla} ${unitLabel}`,
                  fill: "#D97706",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />

              {/* Actual average completion bar */}
              <Bar
                dataKey="actualTime"
                name="actualTime"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              >
                {chartData.map((entry, index) => {
                  // Color code bars: blue for normal, green for exceptionally fast, amber/rose for breach
                  let barColor = "#2563EB"; // Default royal blue
                  if (entry.actualTime > entry.targetSla) {
                    barColor = "#E11D48"; // Over SLA target (red/rose)
                  } else if (entry.actualTime <= entry.targetSla * 0.5) {
                    barColor = "#059669"; // Extra fast (emerald)
                  }
                  return <Cell key={`cell-${index}`} fill={barColor} />;
                })}
              </Bar>

              {/* SLA Target Representation */}
              {chartType === "composed" ? (
                <Line
                  type="monotone"
                  dataKey="targetSla"
                  name="targetSla"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#F59E0B", strokeWidth: 1.5, stroke: "#FFF" }}
                  activeDot={{ r: 6 }}
                />
              ) : (
                <Bar
                  dataKey="targetSla"
                  name="targetSla"
                  fill="#FCD34D"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                  opacity={0.8}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Informative Footer & Quick Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span>Selesai &le; 50% Target SLA (Efisiensi Tinggi)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <span>Selesai Memenuhi SLA</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
            <span>Melebihi Target SLA (Perlu Eskalasi)</span>
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Diperbarui: {lastRefreshed.toLocaleTimeString("id-ID")} WIB
        </div>
      </div>
    </div>
  );
};

/**
 * Helper to mount the React Recharts widget into any standard DOM element
 */
export function mountWeeklySlaWidget(
  container: HTMLElement,
  options?: {
    initialTickets?: any[];
    onRefreshRequested?: () => void;
  }
): { unmount: () => void; root: Root } {
  const root = createRoot(container);
  root.render(
    <WeeklySlaRechartsWidget
      initialTickets={options?.initialTickets}
      onRefreshRequested={options?.onRefreshRequested}
    />
  );

  return {
    unmount: () => {
      try {
        root.unmount();
      } catch (e) {
        console.warn("Unmount weekly SLA widget error:", e);
      }
    },
    root,
  };
}
