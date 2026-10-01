/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Daily Activity Log Modal Component - PT Aetra Air Tangerang
 * Interactive viewer and downloader for officer completed task summaries
 */

import { DivisionId, DIVISIONS } from "../types/division";
import {
  DailyActivityReportData,
  exportDailyActivityToExcel,
  downloadDailyActivityPdf,
  getDailyActivityReport,
  getLocalTodayDateString,
  simulateAddCompletedTaskForToday,
} from "../services/dailyActivityLogService";
import { openReportPreviewModal } from "../reportPreviewModal";
import { loadAllUnifiedTickets } from "../services/divisionTicketService";

export interface DailyActivityLogModalOptions {
  initialDate?: string;
  divisionId?: DivisionId | "all";
  onClose?: () => void;
}

export function openDailyActivityLogModal(options?: DailyActivityLogModalOptions): void {
  const existingModal = document.getElementById("aetra-daily-activity-modal-overlay");
  if (existingModal) {
    existingModal.remove();
  }

  let selectedDate = options?.initialDate || getLocalTodayDateString();
  let selectedDivision: DivisionId | "all" = options?.divisionId || "all";
  let activeView: "officers" | "table" = "officers";
  let expandedOfficers = new Set<string>();

  // Create overlay
  const overlay = document.createElement("div");
  overlay.id = "aetra-daily-activity-modal-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(4px);
    z-index: 100000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    animation: fadeInModal 0.2s ease-out;
  `;

  const container = document.createElement("div");
  container.className = "daily-activity-modal-card";
  container.style.cssText = `
    background: #FFFFFF;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
    width: 100%;
    max-width: 1020px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #E2E8F0;
  `;

  function renderContent(): void {
    const reportData = getDailyActivityReport(selectedDate, selectedDivision);

    container.innerHTML = `
      <!-- Sticky Header -->
      <div style="padding: 16px 20px; background: #0F172A; color: #FFFFFF; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 10px; background: #0284C7; display: flex; align-items: center; justify-content: center; font-size: 20px;">
            📋
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <h2 style="margin: 0; font-size: 16px; font-weight: 800; letter-spacing: -0.3px;">
                Log Aktivitas Harian Petugas Lapangan
              </h2>
              <span style="background: #0284C7; color: #FFF; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 6px;">
                ${reportData.targetDate === getLocalTodayDateString() ? "Hari Ini (Today)" : "Arsip Tanggal"}
              </span>
            </div>
            <div style="font-size: 11.5px; color: #94A3B8; margin-top: 2px;">
              Rekapitulasi pengerjaan Work Order selesai per petugas • ${reportData.formattedDayDate}
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" id="dal-close-btn" style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); color: #FFF; font-size: 14px; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s ease;">
            ✕
          </button>
        </div>
      </div>

      <!-- Controls & Filter Toolbar -->
      <div style="padding: 12px 20px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; flex-shrink: 0;">
        <!-- Left: Date & Division pickers -->
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 6px; background: #FFFFFF; border: 1px solid #CBD5E1; padding: 4px 10px; border-radius: 8px;">
            <span style="font-size: 13px;">📅</span>
            <input type="date" id="dal-date-picker" value="${selectedDate}" style="border: none; outline: none; font-size: 12px; font-weight: 700; color: #1E293B; background: transparent; cursor: pointer;" />
          </div>

          <button type="button" id="dal-today-btn" style="background: ${selectedDate === getLocalTodayDateString() ? "#0284C7" : "#FFFFFF"}; color: ${selectedDate === getLocalTodayDateString() ? "#FFFFFF" : "#334155"}; border: 1px solid ${selectedDate === getLocalTodayDateString() ? "#0284C7" : "#CBD5E1"}; font-size: 11.5px; font-weight: 700; padding: 5px 10px; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">
            Hari Ini
          </button>

          <button type="button" id="dal-yesterday-btn" style="background: #FFFFFF; color: #334155; border: 1px solid #CBD5E1; font-size: 11.5px; font-weight: 700; padding: 5px 10px; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">
            Kemarin
          </button>

          <!-- Division filter dropdown -->
          <div style="display: flex; align-items: center; gap: 6px; background: #FFFFFF; border: 1px solid #CBD5E1; padding: 4px 10px; border-radius: 8px;">
            <span style="font-size: 12px;">🏢</span>
            <select id="dal-div-filter" style="border: none; outline: none; font-size: 11.5px; font-weight: 700; color: #1E293B; background: transparent; cursor: pointer;">
              <option value="all" ${selectedDivision === "all" ? "selected" : ""}>Semua Divisi</option>
              <option value="minor_repair" ${selectedDivision === "minor_repair" ? "selected" : ""}>Divisi Minor Repair</option>
              <option value="sales_support" ${selectedDivision === "sales_support" ? "selected" : ""}>Operasional Sales Support</option>
              <option value="key_account" ${selectedDivision === "key_account" ? "selected" : ""}>Technical Key Account</option>
              <option value="technical_support" ${selectedDivision === "technical_support" ? "selected" : ""}>Technical Support & Lab</option>
              <option value="customer_service" ${selectedDivision === "customer_service" ? "selected" : ""}>Customer Service</option>
            </select>
          </div>
        </div>

        <!-- Right: Action Buttons (Excel & PDF Download) -->
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <button type="button" id="dal-export-excel-btn" style="background: #10B981; hover: #059669; color: #FFFFFF; border: none; font-size: 11.5px; font-weight: 800; padding: 6px 14px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: background 0.15s ease;" title="Unduh data laporan dalam format Microsoft Excel (.xlsx)">
            <span>📊</span>
            <span>Unduh Excel (.xlsx)</span>
          </button>

          <button type="button" id="dal-export-pdf-btn" style="background: #0284C7; hover: #0369A1; color: #FFFFFF; border: none; font-size: 11.5px; font-weight: 800; padding: 6px 14px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); transition: background 0.15s ease;" title="Unduh Berita Acara & Ringkasan Resmi format PDF A4">
            <span>📄</span>
            <span>Unduh PDF Resmi</span>
          </button>

          <button type="button" id="dal-print-btn" style="background: #FFFFFF; color: #334155; border: 1px solid #CBD5E1; font-size: 11.5px; font-weight: 700; padding: 6px 10px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Cetak atau simpan via browser print">
            <span>🖨️</span>
            <span>Cetak</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div style="padding: 14px 20px; background: #FFFFFF; border-bottom: 1px solid #F1F5F9; display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; flex-shrink: 0;">
        <!-- KPI 1 -->
        <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 10px 14px; display: flex; flex-direction: column;">
          <div style="font-size: 11px; font-weight: 800; color: #047857; display: flex; align-items: center; justify-content: space-between;">
            <span>TOTAL WO SELESAI</span>
            <span>✅</span>
          </div>
          <div style="font-size: 22px; font-weight: 900; color: #065F46; margin-top: 4px; line-height: 1;">
            ${reportData.totalCompletedTasks}
          </div>
          <div style="font-size: 10.5px; color: #047857; margin-top: 4px;">
            ${reportData.totalUrgentTasks} tugas status darurat
          </div>
        </div>

        <!-- KPI 2 -->
        <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 10px 14px; display: flex; flex-direction: column;">
          <div style="font-size: 11px; font-weight: 800; color: #1D4ED8; display: flex; align-items: center; justify-content: space-between;">
            <span>PETUGAS AKTIF</span>
            <span>👷</span>
          </div>
          <div style="font-size: 22px; font-weight: 900; color: #1E40AF; margin-top: 4px; line-height: 1;">
            ${reportData.totalActiveOfficers}
          </div>
          <div style="font-size: 10.5px; color: #1D4ED8; margin-top: 4px;">
            Teknisi lapangan bertugas
          </div>
        </div>

        <!-- KPI 3 -->
        <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 10px 14px; display: flex; flex-direction: column;">
          <div style="font-size: 11px; font-weight: 800; color: #B45309; display: flex; align-items: center; justify-content: space-between;">
            <span>RATA-RATA DURASI</span>
            <span>⏱️</span>
          </div>
          <div style="font-size: 22px; font-weight: 900; color: #92400E; margin-top: 4px; line-height: 1;">
            ${reportData.overallAvgDurationMinutes} <span style="font-size: 13px; font-weight: 700;">Menit</span>
          </div>
          <div style="font-size: 10.5px; color: #B45309; margin-top: 4px;">
            Rata-rata tuntas per tiket
          </div>
        </div>

        <!-- KPI 4 -->
        <div style="background: #F5F3FF; border: 1px solid #DDD6FE; border-radius: 10px; padding: 10px 14px; display: flex; flex-direction: column;">
          <div style="font-size: 11px; font-weight: 800; color: #6D28D9; display: flex; align-items: center; justify-content: space-between;">
            <span>KEPATUHAN E-SIGN</span>
            <span>✍️</span>
          </div>
          <div style="font-size: 22px; font-weight: 900; color: #5B21B6; margin-top: 4px; line-height: 1;">
            ${reportData.overallSignedRatePercentage}%
          </div>
          <div style="font-size: 10.5px; color: #6D28D9; margin-top: 4px;">
            ${reportData.totalSignedBast} dari ${reportData.totalCompletedTasks} bertandatangan
          </div>
        </div>

        <!-- KPI 5 -->
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 10px 14px; display: flex; flex-direction: column;">
          <div style="font-size: 11px; font-weight: 800; color: #15803D; display: flex; align-items: center; justify-content: space-between;">
            <span>MATERIAL TERPAKAI</span>
            <span>🔧</span>
          </div>
          <div style="font-size: 22px; font-weight: 900; color: #166534; margin-top: 4px; line-height: 1;">
            ${reportData.totalMaterialsCount} <span style="font-size: 13px; font-weight: 700;">Item</span>
          </div>
          <div style="font-size: 10.5px; color: #15803D; margin-top: 4px;">
            Suku cadang & fitting
          </div>
        </div>
      </div>

      <!-- View Selector Bar -->
      <div style="padding: 8px 20px; background: #FAFAFA; border-bottom: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
        <div style="display: flex; gap: 4px;">
          <button type="button" id="dal-view-officers" style="padding: 5px 12px; border-radius: 8px; border: none; font-size: 12px; font-weight: 800; cursor: pointer; background: ${activeView === "officers" ? "#0F172A" : "transparent"}; color: ${activeView === "officers" ? "#FFF" : "#64748B"};">
            👤 Ringkasan per Petugas (${reportData.officerSummaries.length})
          </button>
          <button type="button" id="dal-view-table" style="padding: 5px 12px; border-radius: 8px; border: none; font-size: 12px; font-weight: 800; cursor: pointer; background: ${activeView === "table" ? "#0F172A" : "transparent"}; color: ${activeView === "table" ? "#FFF" : "#64748B"};">
            📊 Detail Seluruh Tugas (${reportData.allTasks.length})
          </button>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" id="dal-simulate-add-btn" style="background: #FEF3C7; border: 1px solid #FCD34D; color: #92400E; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Tambah simulasi tugas selesai hari ini untuk menguji laporan">
            <span>⚡</span>
            <span>Uji Selesai WO Baru</span>
          </button>
        </div>
      </div>

      <!-- Main Scrollable Body -->
      <div id="dal-modal-body" style="padding: 16px 20px; overflow-y: auto; flex: 1; min-height: 0; background: #F8FAFC;">
        ${renderBodyContent(reportData)}
      </div>

      <!-- Sticky Footer -->
      <div style="padding: 12px 20px; background: #FFFFFF; border-top: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; font-size: 11.5px; color: #64748B;">
        <div>
          Laporan resmi Divisi Distribusi & NRW • PT Aetra Air Tangerang
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" id="dal-bottom-close-btn" style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #334155; font-size: 11.5px; font-weight: 700; padding: 6px 14px; border-radius: 8px; cursor: pointer;">
            Tutup
          </button>
          <button type="button" id="dal-bottom-excel-btn" style="background: #10B981; color: #FFF; border: none; font-size: 11.5px; font-weight: 800; padding: 6px 14px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
            <span>📥 Unduh Excel</span>
          </button>
          <button type="button" id="dal-bottom-pdf-btn" style="background: #0284C7; color: #FFF; border: none; font-size: 11.5px; font-weight: 800; padding: 6px 14px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
            <span>📄 Unduh PDF</span>
          </button>
        </div>
      </div>
    `;

    wireModalEvents(reportData);
  }

  function renderBodyContent(reportData: DailyActivityReportData): string {
    if (reportData.totalCompletedTasks === 0) {
      return `
        <div style="background: #FFFFFF; border: 1.5px dashed #CBD5E1; border-radius: 14px; padding: 48px 24px; text-align: center; max-width: 520px; margin: 20px auto;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto 14px;">
            📭
          </div>
          <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 800; color: #1E293B;">
            Belum Ada Tugas Selesai pada Tanggal Ini
          </h3>
          <p style="margin: 0 0 16px 0; font-size: 12.5px; color: #64748B; line-height: 1.5;">
            Tidak ditemukan Work Order dengan status <b>Selesai</b> untuk tanggal <b>${reportData.formattedDayDate}</b>. Silakan pilih tanggal lain atau uji coba dengan tombol simulasi di bawah.
          </p>
          <div style="display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;">
            <button type="button" id="dal-empty-simulate-btn" style="background: #0284C7; color: #FFF; border: none; font-size: 12px; font-weight: 800; padding: 8px 16px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              <span>⚡</span>
              <span>Selesaikan 1 WO Hari Ini (Uji Coba Laporan)</span>
            </button>
            <button type="button" id="dal-empty-today-btn" style="background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 700; padding: 8px 14px; border-radius: 8px; cursor: pointer;">
              Kembali ke Hari Ini
            </button>
          </div>
        </div>
      `;
    }

    if (activeView === "officers") {
      return `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${reportData.officerSummaries
            .map((off, idx) => {
              const isExpanded = expandedOfficers.has(off.officerName) || reportData.officerSummaries.length === 1;
              const initials = off.officerName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return `
                <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(15,23,42,0.03); transition: all 0.15s ease;">
                  <!-- Officer Summary Card Header -->
                  <div class="dal-officer-header" data-officer="${off.officerName}" style="padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 14px; cursor: pointer; background: #FFFFFF; border-bottom: ${isExpanded ? "1px solid #F1F5F9" : "none"};">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="width: 44px; height: 44px; border-radius: 50%; background: ${off.avatarColor.main}; color: #FFF; font-weight: 900; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.12);">
                        ${initials}
                      </div>
                      <div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                          <span style="font-size: 14px; font-weight: 800; color: #0F172A;">
                            ${off.officerName}
                          </span>
                          <span style="font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 6px; background: ${off.avatarColor.bg}; color: ${off.avatarColor.main}; border: 1px solid ${off.avatarColor.border};">
                            ${off.divisionName}
                          </span>
                          <span style="font-size: 10.5px; color: #64748B;">
                            • ${off.unit}
                          </span>
                        </div>
                        <div style="font-size: 11px; color: #64748B; margin-top: 2px;">
                          ${off.role}
                        </div>
                      </div>
                    </div>

                    <!-- Right Stats & Expand Toggle -->
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                        <span style="background: #ECFDF5; color: #047857; font-weight: 800; padding: 3px 8px; border-radius: 6px; border: 1px solid #A7F3D0;">
                          ${off.totalCompleted} WO Selesai
                        </span>
                        ${
                          off.urgentCount > 0
                            ? `<span style="background: #FEF2F2; color: #DC2626; font-weight: 800; padding: 3px 7px; border-radius: 6px; border: 1px solid #FECACA;">
                                🚨 ${off.urgentCount} Darurat
                              </span>`
                            : ""
                        }
                        <span style="background: #F8FAFC; color: #475569; font-weight: 700; padding: 3px 8px; border-radius: 6px; border: 1px solid #E2E8F0;">
                          ⏱️ ~${off.averageDurationMinutes} mnt/WO
                        </span>
                        <span style="background: #F5F3FF; color: #6D28D9; font-weight: 700; padding: 3px 8px; border-radius: 6px; border: 1px solid #DDD6FE;">
                          ✍️ ${off.signedCount}/${off.totalCompleted} BAST (${off.signedRatePercentage}%)
                        </span>
                      </div>

                      <div style="width: 28px; height: 28px; border-radius: 6px; background: #F1F5F9; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #64748B;">
                        ${isExpanded ? "▲" : "▼"}
                      </div>
                    </div>
                  </div>

                  <!-- Expanded Tasks List -->
                  ${
                    isExpanded
                      ? `
                        <div style="padding: 14px 18px; background: #FAFAFA;">
                          <!-- Materials Summary for this officer -->
                          ${
                            off.materialsUsed.length > 0
                              ? `
                                <div style="margin-bottom: 12px; padding: 8px 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                  <span style="font-size: 11px; font-weight: 800; color: #475569;">🔧 Sparepart Terpakai:</span>
                                  ${off.materialsUsed
                                    .map(
                                      (m) => `
                                    <span style="font-size: 10.5px; font-weight: 700; background: #F0FDF4; border: 1px solid #BBF7D0; color: #166534; padding: 1px 7px; border-radius: 5px;">
                                      ${m.name} <b>(${m.count}x)</b>
                                    </span>
                                  `
                                    )
                                    .join("")}
                                </div>
                              `
                              : ""
                          }

                          <!-- List of completed tasks by this officer -->
                          <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${off.tasks
                              .map(
                                (task, taskIdx) => `
                              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">
                                <div style="flex: 1; min-width: 0;">
                                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 4px;">
                                    <span style="font-family: monospace; font-size: 11.5px; font-weight: 800; color: #0F172A;">
                                      ${task.id}
                                    </span>
                                    <span style="font-family: monospace; font-size: 10px; font-weight: 800; background: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE; padding: 1px 6px; border-radius: 4px;">
                                      #${task.caseId}
                                    </span>
                                    <span style="font-size: 10px; font-weight: 800; background: #EFF6FF; color: #1D4ED8; padding: 1px 6px; border-radius: 4px;">
                                      ${task.category}
                                    </span>
                                    ${
                                      task.urgent
                                        ? `<span style="font-size: 9.5px; font-weight: 800; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 1px 6px; border-radius: 4px;">
                                            🚨 DARURAT
                                          </span>`
                                        : ""
                                    }
                                    <span style="font-size: 10.5px; color: #10B981; font-weight: 700; margin-left: auto;">
                                      ✓ Selesai ${task.completedAt ? new Date(task.completedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"} WIB
                                    </span>
                                  </div>

                                  <div style="font-size: 12.5px; font-weight: 800; color: #1E293B;">
                                    ${task.customer}
                                  </div>
                                  <div style="font-size: 11px; color: #64748B; margin-top: 1px;">
                                    📍 ${task.address} (${task.area})
                                  </div>

                                  <div style="font-size: 11px; color: #334155; margin-top: 5px; background: #F8FAFC; border-radius: 6px; padding: 6px 10px; border-left: 3px solid #0284C7;">
                                    <b>Tindakan:</b> ${task.completionNotes}
                                  </div>

                                  <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; font-size: 10.5px;">
                                    <span style="color: #64748B;">⏱️ Durasi: <b>${task.durationLabel}</b></span>
                                    ${
                                      task.customerSignature
                                        ? `<span style="color: #047857; font-weight: 700; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 1px 6px; border-radius: 4px;">
                                            ✍️ E-Sign Pelanggan: ${task.customerSignerName}
                                          </span>`
                                        : `<span style="color: #D97706; font-weight: 700; background: #FFFBEB; border: 1px solid #FDE68A; padding: 1px 6px; border-radius: 4px;">
                                            ⚠️ Tanpa E-Sign
                                          </span>`
                                    }
                                    <span style="color: #64748B; font-family: monospace; font-size: 10px;">
                                      📌 ${task.coords}
                                    </span>
                                  </div>
                                </div>

                                <div style="display: flex; flex-direction: column; gap: 4px; flex-shrink: 0;">
                                  <button type="button" class="dal-btn-view-bast" data-ticket="${task.id}" style="background: #EFF6FF; border: 1px solid #BFDBFE; color: #1D4ED8; font-size: 10.5px; font-weight: 700; padding: 5px 10px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                                    <span>📄</span>
                                    <span>Lihat BAST</span>
                                  </button>
                                </div>
                              </div>
                            `
                              )
                              .join("")}
                          </div>
                        </div>
                      `
                      : ""
                  }
                </div>
              `;
            })
            .join("")}
        </div>
      `;
    }

    // Table View
    return `
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow-x: auto; box-shadow: 0 1px 3px rgba(15,23,42,0.03);">
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; text-align: left;">
          <thead>
            <tr style="background: #F1F5F9; color: #475569; font-weight: 800; border-bottom: 1px solid #E2E8F0;">
              <th style="padding: 10px 12px; width: 40px;">No</th>
              <th style="padding: 10px 12px;">ID Work Order</th>
              <th style="padding: 10px 12px;">Petugas Pelaksana</th>
              <th style="padding: 10px 12px;">Divisi</th>
              <th style="padding: 10px 12px;">Pelanggan & Lokasi</th>
              <th style="padding: 10px 12px;">Kategori</th>
              <th style="padding: 10px 12px;">Waktu</th>
              <th style="padding: 10px 12px;">Durasi</th>
              <th style="padding: 10px 12px;">BAST E-Sign</th>
              <th style="padding: 10px 12px; text-align: right;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.allTasks
              .map(
                (task, idx) => `
              <tr style="border-bottom: 1px solid #F1F5F9; hover: background #F8FAFC;">
                <td style="padding: 10px 12px; color: #94A3B8; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 10px 12px;">
                  <div style="font-family: monospace; font-weight: 800; color: #0F172A;">${task.id}</div>
                  <div style="font-family: monospace; font-size: 10px; color: #64748B;">#${task.caseId}</div>
                </td>
                <td style="padding: 10px 12px;">
                  <div style="font-weight: 800; color: #1E293B;">${task.officerName}</div>
                  <div style="font-size: 10px; color: #64748B;">${task.officerUnit}</div>
                </td>
                <td style="padding: 10px 12px;">
                  <span style="font-size: 10px; font-weight: 800; background: #EFF6FF; color: #1D4ED8; padding: 2px 6px; border-radius: 4px;">
                    ${task.divisionName}
                  </span>
                </td>
                <td style="padding: 10px 12px; max-width: 240px;">
                  <div style="font-weight: 700; color: #0F172A;">${task.customer}</div>
                  <div style="font-size: 10.5px; color: #64748B; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${task.address}
                  </div>
                </td>
                <td style="padding: 10px 12px;">
                  <span style="font-weight: 700; color: #334155;">${task.category}</span>
                  ${
                    task.urgent
                      ? `<span style="font-size: 9px; font-weight: 800; background: #FEE2E2; color: #DC2626; padding: 1px 4px; border-radius: 3px; margin-left: 4px;">DARURAT</span>`
                      : ""
                  }
                </td>
                <td style="padding: 10px 12px; color: #059669; font-weight: 700; white-space: nowrap;">
                  ${task.completedAt ? new Date(task.completedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"} WIB
                </td>
                <td style="padding: 10px 12px; color: #64748B; white-space: nowrap;">
                  ${task.durationLabel}
                </td>
                <td style="padding: 10px 12px; white-space: nowrap;">
                  ${
                    task.customerSignature
                      ? `<span style="color: #059669; font-weight: 800; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 2px 7px; border-radius: 4px; font-size: 10.5px;">✓ Ditandatangani</span>`
                      : `<span style="color: #94A3B8; font-size: 10.5px;">-</span>`
                  }
                </td>
                <td style="padding: 10px 12px; text-align: right; white-space: nowrap;">
                  <button type="button" class="dal-btn-view-bast" data-ticket="${task.id}" style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #1E293B; font-size: 10.5px; font-weight: 700; padding: 4px 8px; border-radius: 6px; cursor: pointer;">
                    BAST ➔
                  </button>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function wireModalEvents(reportData: DailyActivityReportData): void {
    // Close modal
    const closeBtn = container.querySelector("#dal-close-btn") as HTMLElement;
    const bottomCloseBtn = container.querySelector("#dal-bottom-close-btn") as HTMLElement;
    const closeModal = () => {
      overlay.remove();
      if (options?.onClose) options.onClose();
    };
    if (closeBtn) closeBtn.onclick = closeModal;
    if (bottomCloseBtn) bottomCloseBtn.onclick = closeModal;

    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };

    // Date picker
    const datePicker = container.querySelector("#dal-date-picker") as HTMLInputElement;
    if (datePicker) {
      datePicker.onchange = (e) => {
        selectedDate = (e.target as HTMLInputElement).value;
        renderContent();
      };
    }

    // Today & Yesterday buttons
    const todayBtn = container.querySelector("#dal-today-btn") as HTMLElement;
    if (todayBtn) {
      todayBtn.onclick = () => {
        selectedDate = getLocalTodayDateString();
        renderContent();
      };
    }

    const yesterdayBtn = container.querySelector("#dal-yesterday-btn") as HTMLElement;
    if (yesterdayBtn) {
      yesterdayBtn.onclick = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        selectedDate = getLocalTodayDateString(d);
        renderContent();
      };
    }

    // Division filter
    const divFilter = container.querySelector("#dal-div-filter") as HTMLSelectElement;
    if (divFilter) {
      divFilter.onchange = (e) => {
        selectedDivision = (e.target as HTMLSelectElement).value as any;
        renderContent();
      };
    }

    // View toggles
    const viewOfficersBtn = container.querySelector("#dal-view-officers") as HTMLElement;
    if (viewOfficersBtn) {
      viewOfficersBtn.onclick = () => {
        activeView = "officers";
        renderContent();
      };
    }

    const viewTableBtn = container.querySelector("#dal-view-table") as HTMLElement;
    if (viewTableBtn) {
      viewTableBtn.onclick = () => {
        activeView = "table";
        renderContent();
      };
    }

    // Officer card accordion expand/collapse
    container.querySelectorAll(".dal-officer-header").forEach((header) => {
      (header as HTMLElement).onclick = () => {
        const offName = header.getAttribute("data-officer");
        if (offName) {
          if (expandedOfficers.has(offName)) {
            expandedOfficers.delete(offName);
          } else {
            expandedOfficers.add(offName);
          }
          renderContent();
        }
      };
    });

    // Excel Export
    const exportExcel = () => {
      exportDailyActivityToExcel(reportData);
    };
    const excelBtn = container.querySelector("#dal-export-excel-btn") as HTMLElement;
    const bottomExcelBtn = container.querySelector("#dal-bottom-excel-btn") as HTMLElement;
    if (excelBtn) excelBtn.onclick = exportExcel;
    if (bottomExcelBtn) bottomExcelBtn.onclick = exportExcel;

    // PDF Export
    const exportPdf = () => {
      downloadDailyActivityPdf(reportData);
    };
    const pdfBtn = container.querySelector("#dal-export-pdf-btn") as HTMLElement;
    const bottomPdfBtn = container.querySelector("#dal-bottom-pdf-btn") as HTMLElement;
    if (pdfBtn) pdfBtn.onclick = exportPdf;
    if (bottomPdfBtn) bottomPdfBtn.onclick = exportPdf;

    // Print
    const printBtn = container.querySelector("#dal-print-btn") as HTMLElement;
    if (printBtn) {
      printBtn.onclick = () => {
        window.print();
      };
    }

    // Simulation add completed task
    const simAddBtn = container.querySelector("#dal-simulate-add-btn") as HTMLElement;
    const emptySimBtn = container.querySelector("#dal-empty-simulate-btn") as HTMLElement;
    const runSim = () => {
      selectedDate = getLocalTodayDateString();
      simulateAddCompletedTaskForToday("Agus Setiawan");
      renderContent();
    };
    if (simAddBtn) simAddBtn.onclick = runSim;
    if (emptySimBtn) emptySimBtn.onclick = runSim;

    const emptyTodayBtn = container.querySelector("#dal-empty-today-btn") as HTMLElement;
    if (emptyTodayBtn) {
      emptyTodayBtn.onclick = () => {
        selectedDate = getLocalTodayDateString();
        renderContent();
      };
    }

    // View BAST buttons
    container.querySelectorAll(".dal-btn-view-bast").forEach((btn) => {
      (btn as HTMLElement).onclick = (e) => {
        e.stopPropagation();
        const ticketId = (btn as HTMLElement).getAttribute("data-ticket");
        if (ticketId) {
          const tickets = loadAllUnifiedTickets();
          const target = tickets.find((t) => t.id === ticketId);
          if (target) {
            openReportPreviewModal({
              item: target as any,
              onUpdateItem: () => {
                renderContent();
              },
            });
          }
        }
      };
    });
  }

  renderContent();
  overlay.appendChild(container);
  document.body.appendChild(overlay);
}
