/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Background Scheduler & Supabase Auto-Rollover Management Modal
 * PT Aetra Air Tangerang
 */

import {
  getDaemonState,
  executePendingWorkOrderRollover,
  getSupabaseCronMigrationScript,
  formatIndonesianDate,
  getNextWorkingDate,
} from "../services/backgroundRolloverScheduler";
import { loadAllUnifiedTickets } from "../services/divisionTicketService";

let activeModalOverlay: HTMLElement | null = null;

export function openBackgroundSchedulerModal(onRolloverExecuted?: () => void): void {
  if (typeof document === "undefined") return;

  // Close existing modal if any
  if (activeModalOverlay) {
    activeModalOverlay.remove();
    activeModalOverlay = null;
  }

  const state = getDaemonState();
  const allTickets = loadAllUnifiedTickets();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Count pending tickets for today
  const pendingTodayTickets = allTickets.filter((t) => {
    if (t.status === "selesai") return false;
    const schedDate = t.rescheduledDate ? new Date(t.rescheduledDate) : new Date(t.receivedAt);
    schedDate.setHours(0, 0, 0, 0);
    return schedDate.getTime() <= today.getTime();
  });

  const nextWorkingDay = getNextWorkingDate(today);
  const nextWorkingFormatted = formatIndonesianDate(nextWorkingDay);

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px);
    z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px;
    font-family: 'Plus Jakarta Sans', sans-serif;
  `;

  let activeTab: "status" | "logs" | "sql" = "status";

  const renderContent = () => {
    const currentState = getDaemonState();

    overlay.innerHTML = `
      <div style="background: #FFFFFF; width: 100%; max-width: 680px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: column; max-height: 90vh;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0F172A, #1E293B); color: #FFFFFF; padding: 18px 22px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.4); display: flex; align-items: center; justify-content: center; font-size: 18px;">
              ⚙️
            </div>
            <div>
              <h3 style="margin: 0; font-size: 15.5px; font-weight: 800; letter-spacing: -0.2px;">
                Background Task: Auto-Rollover & Re-assignment
              </h3>
              <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">
                Penjadwalan otomatis tiket tertunda ke hari kerja berikutnya (Supabase & App Daemon)
              </div>
            </div>
          </div>
          <button id="close-scheduler-modal-btn" type="button" style="background: rgba(255,255,255,0.1); border: none; color: #FFFFFF; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;">
            ✕
          </button>
        </div>

        <!-- Tab Navigation -->
        <div style="display: flex; border-bottom: 1px solid #E2E8F0; background: #F8FAFC; padding: 0 16px;">
          <button id="tab-btn-status" type="button" style="padding: 10px 16px; font-size: 12px; font-weight: 700; border: none; background: none; cursor: pointer; border-bottom: 2px solid ${activeTab === "status" ? "#0284C7" : "transparent"}; color: ${activeTab === "status" ? "#0284C7" : "#64748B"};">
            ⚡ Status & Eksekusi Daemon
          </button>
          <button id="tab-btn-logs" type="button" style="padding: 10px 16px; font-size: 12px; font-weight: 700; border: none; background: none; cursor: pointer; border-bottom: 2px solid ${activeTab === "logs" ? "#0284C7" : "transparent"}; color: ${activeTab === "logs" ? "#0284C7" : "#64748B"};">
            📋 Riwayat Audit Rollover (${currentState.recentLogs.length})
          </button>
          <button id="tab-btn-sql" type="button" style="padding: 10px 16px; font-size: 12px; font-weight: 700; border: none; background: none; cursor: pointer; border-bottom: 2px solid ${activeTab === "sql" ? "#0284C7" : "transparent"}; color: ${activeTab === "sql" ? "#0284C7" : "#64748B"};">
            🐘 Supabase pg_cron SQL
          </button>
        </div>

        <!-- Body Content -->
        <div style="padding: 18px 22px; overflow-y: auto; flex: 1;">
          ${
            activeTab === "status"
              ? `
            <!-- Live Health Status Card -->
            <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="position: relative; display: flex; height: 12px; width: 12px;">
                  <span style="animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; position: absolute; display: inline-flex; height: 100%; width: 100%; border-radius: 9999px; background-color: #22C55E; opacity: 0.75;"></span>
                  <span style="position: relative; display: inline-flex; border-radius: 9999px; height: 12px; width: 12px; background-color: #16A34A;"></span>
                </span>
                <div>
                  <div style="font-size: 12.5px; font-weight: 800; color: #166534;">
                    Background Scheduler Aktif (Heartbeat 45 Detik)
                  </div>
                  <div style="font-size: 11px; color: #15803D; margin-top: 1px;">
                    Otomatis berjalan pada pukul 17:00 WIB (akhir shift), 00:00 (pergantian hari), & saat tab browser aktif.
                  </div>
                </div>
              </div>
              <span style="background: #DCFCE7; color: #15803D; border: 1px solid #86EFAC; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 6px;">
                Daemon Running
              </span>
            </div>

            <!-- Stats Overview Grid -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px;">
              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px;">
                <div style="font-size: 10.5px; font-weight: 700; color: #64748B;">KOMPLAIN PENDING HARI INI</div>
                <div style="font-size: 20px; font-weight: 800; color: ${pendingTodayTickets.length > 0 ? "#DC2626" : "#059669"}; margin-top: 4px;">
                  ${pendingTodayTickets.length} WO
                </div>
                <div style="font-size: 10px; color: #94A3B8; margin-top: 2px;">
                  ${pendingTodayTickets.length > 0 ? "Siap dipindahkan ke jadwal berikutnya" : "Semua sudah selesai"}
                </div>
              </div>

              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px;">
                <div style="font-size: 10.5px; font-weight: 700; color: #64748B;">TARGET JADWAL BERIKUTNYA</div>
                <div style="font-size: 14px; font-weight: 800; color: #0284C7; margin-top: 4px; line-height: 1.2;">
                  ${nextWorkingFormatted.split(",")[0]}
                </div>
                <div style="font-size: 10.5px; color: #475569; margin-top: 2px;">
                  ${nextWorkingFormatted}
                </div>
              </div>

              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px;">
                <div style="font-size: 10.5px; font-weight: 700; color: #64748B;">TOTAL ROLLED-OVER (ALL-TIME)</div>
                <div style="font-size: 20px; font-weight: 800; color: #D97706; margin-top: 4px;">
                  ${currentState.totalRolledOverCount} Tiket
                </div>
                <div style="font-size: 10px; color: #94A3B8; margin-top: 2px;">
                  Tersinkron di Supabase & Local DB
                </div>
              </div>
            </div>

            <!-- How Auto-Rollover Logic Works -->
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
              <div style="font-size: 12px; font-weight: 800; color: #1D4ED8; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                <span>🛡️</span> Jaminan "No Complaint Left Behind"
              </div>
              <ul style="margin: 0; padding-left: 18px; font-size: 11.5px; color: #1E40AF; line-height: 1.6;">
                <li>Setiap tiket dengan status <b>Baru</b> atau <b>Diproses</b> yang belum selesai di akhir shift kerja harian tidak akan hilang.</li>
                <li>Sistem otomatis memindahkan tanggal kerja ke <b>hari kerja aktif berikutnya</b> (Senin–Jumat, melompati Sabtu & Minggu).</li>
                <li>Pemberian label prioritas <b>'🔄 Pindahan Kemarin'</b> agar teknisi memprioritaskannya di urutan awal rute lapangan.</li>
                <li>Perubahan langsung tersinkron ke tabel <code>complaints</code> di Supabase dan disiarkan ke semua HP teknisi.</li>
              </ul>
            </div>

            <!-- Action Controls -->
            <div style="display: flex; gap: 10px; justify-content: flex-end; align-items: center; border-top: 1px solid #E2E8F0; padding-top: 14px;">
              <button id="trigger-manual-check-btn" type="button" style="background: linear-gradient(135deg, #0284C7, #0369A1); color: #FFFFFF; border: none; padding: 9px 18px; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);">
                ⚡ Eksekusi Rollover Hari Ini Sekarang
              </button>
            </div>
          `
              : activeTab === "logs"
              ? `
            <div style="font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 10px;">
              Log Riwayat Eksekusi Rollover Terakhir:
            </div>
            ${
              currentState.recentLogs.length === 0
                ? `<div style="text-align: center; padding: 30px; color: #94A3B8; font-size: 12px; background: #F8FAFC; border-radius: 8px;">Belum ada riwayat rollover yang tercatat.</div>`
                : `
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${currentState.recentLogs
                  .map(
                    (log) => `
                  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; font-size: 11.5px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                      <span style="font-weight: 800; color: #0284C7;">
                        🔄 ${log.count} Tiket Dipindahkan → ${log.targetDate}
                      </span>
                      <span style="font-size: 10px; color: #94A3B8; font-family: monospace;">
                        ${new Date(log.timestamp).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div style="font-size: 11px; color: #475569;">
                      ${log.details}
                    </div>
                    <div style="font-size: 10px; font-family: monospace; color: #64748B; margin-top: 4px;">
                      Tiket IDs: ${log.ticketIds.slice(0, 5).join(", ")}${log.ticketIds.length > 5 ? ` (+${log.ticketIds.length - 5} lainnya)` : ""}
                    </div>
                  </div>
                `
                  )
                  .join("")}
              </div>
            `
            }
          `
              : `
            <!-- SQL pg_cron Tab -->
            <div style="margin-bottom: 12px;">
              <div style="font-size: 12px; font-weight: 800; color: #1E293B; margin-bottom: 4px;">
                🐘 Skrip Server-Side pg_cron untuk Supabase Database
              </div>
              <div style="font-size: 11px; color: #64748B; line-height: 1.4;">
                Salin skrip SQL ini dan jalankan di <b>Supabase SQL Editor</b> Anda untuk mengaktifkan scheduled cron job otomatis langsung di level database PostgreSQL.
              </div>
            </div>

            <div style="position: relative; margin-bottom: 14px;">
              <pre style="background: #0F172A; color: #38BDF8; padding: 14px; border-radius: 8px; font-size: 11px; font-family: 'JetBrains Mono', monospace; line-height: 1.5; overflow-x: auto; max-height: 280px; margin: 0;">${getSupabaseCronMigrationScript()}</pre>
              <button id="copy-supabase-sql-btn" type="button" style="position: absolute; top: 10px; right: 10px; background: #1E293B; color: #F8FAFC; border: 1px solid #475569; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">
                📋 Salin SQL
              </button>
            </div>

            <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 10px 12px; font-size: 11px; color: #065F46;">
              💡 <b>Catatan:</b> Meskipun Anda tidak menjalankan SQL di database, aplikasi web & mobile tetap menjalankan task background scheduler secara otomatis di client-side daemon saat browser dibuka!
            </div>
          `
          }
        </div>

      </div>
    `;

    // Bind event listeners
    const closeBtn = overlay.querySelector("#close-scheduler-modal-btn") as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.onclick = () => {
        overlay.remove();
        activeModalOverlay = null;
      };
    }

    const tabStatus = overlay.querySelector("#tab-btn-status") as HTMLButtonElement;
    if (tabStatus) {
      tabStatus.onclick = () => {
        activeTab = "status";
        renderContent();
      };
    }

    const tabLogs = overlay.querySelector("#tab-btn-logs") as HTMLButtonElement;
    if (tabLogs) {
      tabLogs.onclick = () => {
        activeTab = "logs";
        renderContent();
      };
    }

    const tabSql = overlay.querySelector("#tab-btn-sql") as HTMLButtonElement;
    if (tabSql) {
      tabSql.onclick = () => {
        activeTab = "sql";
        renderContent();
      };
    }

    const triggerBtn = overlay.querySelector("#trigger-manual-check-btn") as HTMLButtonElement;
    if (triggerBtn) {
      triggerBtn.onclick = async () => {
        triggerBtn.disabled = true;
        triggerBtn.innerText = "⏳ Sedang Memproses...";
        const res = await executePendingWorkOrderRollover({
          forceToday: true,
          triggerType: "manual_trigger",
          reason: "Manual rollover trigger via Background Scheduler Modal",
        });

        triggerBtn.disabled = false;
        renderContent();

        if (onRolloverExecuted) {
          onRolloverExecuted();
        }

        // @ts-ignore
        if ((window as any).Swal) {
          // @ts-ignore
          (window as any).Swal.fire({
            icon: "success",
            title: "Auto-Rollover Berhasil! 🔄",
            html:
              res.rolledOverCount > 0
                ? `Sebanyak <b>${res.rolledOverCount} komplain</b> yang tertunda telah otomatis dialokasikan ke jadwal hari kerja berikutnya (<b>${res.targetDateFormatted}</b>).`
                : "Semua komplain aktif hari ini sudah selesai atau telah dipindahkan ke jadwal berikutnya.",
            timer: 3000,
            showConfirmButton: true,
            confirmButtonColor: "#0284C7",
          });
        }
      };
    }

    const copySqlBtn = overlay.querySelector("#copy-supabase-sql-btn") as HTMLButtonElement;
    if (copySqlBtn) {
      copySqlBtn.onclick = () => {
        navigator.clipboard.writeText(getSupabaseCronMigrationScript());
        copySqlBtn.innerText = "✅ Tersalin!";
        setTimeout(() => {
          if (copySqlBtn) copySqlBtn.innerText = "📋 Salin SQL";
        }, 2000);
      };
    }
  };

  overlay.onclick = (e: MouseEvent) => {
    if (e.target === overlay) {
      overlay.remove();
      activeModalOverlay = null;
    }
  };

  renderContent();
  document.body.appendChild(overlay);
  activeModalOverlay = overlay;
}
