/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Recurring Background Work Order Rollover & Auto-Reassignment Scheduler
 * PT Aetra Air Tangerang
 */

import {
  loadAllUnifiedTickets,
  saveAllUnifiedTickets,
  UnifiedTicket,
} from "./divisionTicketService";
import { publishWorkOrderNotification } from "./workOrderNotificationService";

export interface DaemonState {
  isActive: boolean;
  lastRunTimestamp: string | null;
  lastRunResult: {
    rolledOverCount: number;
    ticketIds: string[];
    targetDate: string;
    targetDateIso: string;
    reason: string;
  } | null;
  nextScheduledCheck: string;
  totalRolledOverCount: number;
  recentLogs: Array<{
    id: string;
    timestamp: string;
    count: number;
    ticketIds: string[];
    targetDate: string;
    type: "automatic_shift_end" | "automatic_past_due" | "manual_trigger" | "midnight_rollover";
    details: string;
  }>;
}

const DAEMON_STORAGE_KEY = "aetra_rollover_daemon_state";
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

let daemonIntervalTimer: any = null;
let isRunningCheck = false;

/**
 * Get current stored state of the background daemon
 */
export function getDaemonState(): DaemonState {
  if (typeof window === "undefined") {
    return {
      isActive: false,
      lastRunTimestamp: null,
      lastRunResult: null,
      nextScheduledCheck: new Date().toISOString(),
      totalRolledOverCount: 0,
      recentLogs: [],
    };
  }

  try {
    const raw = localStorage.getItem(DAEMON_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        isActive: true,
        lastRunTimestamp: parsed.lastRunTimestamp || null,
        lastRunResult: parsed.lastRunResult || null,
        nextScheduledCheck: parsed.nextScheduledCheck || new Date(Date.now() + 60000).toISOString(),
        totalRolledOverCount: parsed.totalRolledOverCount || 0,
        recentLogs: Array.isArray(parsed.recentLogs) ? parsed.recentLogs : [],
      };
    }
  } catch (e) {
    console.warn("Daemon state read error:", e);
  }

  return {
    isActive: true,
    lastRunTimestamp: null,
    lastRunResult: null,
    nextScheduledCheck: new Date(Date.now() + 60000).toISOString(),
    totalRolledOverCount: 0,
    recentLogs: [],
  };
}

/**
 * Save daemon state to local storage
 */
function saveDaemonState(state: DaemonState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DAEMON_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(
      new CustomEvent("aetra:daemon_state_changed", { detail: { state } })
    );
  } catch (e) {
    console.warn("Daemon state save error:", e);
  }
}

/**
 * Determine the next operational working day (skips Saturday and Sunday)
 */
export function getNextWorkingDate(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(8, 0, 0, 0);
  return d;
}

/**
 * Format date for human readability (id-ID)
 */
export function formatIndonesianDate(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export interface RolloverExecutionResult {
  executed: boolean;
  rolledOverCount: number;
  rolledOverTicketIds: string[];
  targetDateFormatted: string;
  targetDateIso: string;
  type: "automatic_shift_end" | "automatic_past_due" | "manual_trigger" | "midnight_rollover";
  details: string;
}

/**
 * Primary algorithm: Identifies pending Work Orders and rolls them over to the next working day.
 * Persists updates across Supabase and local storage, ensuring zero complaints are left behind.
 */
export async function executePendingWorkOrderRollover(
  options: {
    forceToday?: boolean;
    triggerType?: "automatic_shift_end" | "automatic_past_due" | "manual_trigger" | "midnight_rollover";
    reason?: string;
  } = {}
): Promise<RolloverExecutionResult> {
  if (isRunningCheck) {
    return {
      executed: false,
      rolledOverCount: 0,
      rolledOverTicketIds: [],
      targetDateFormatted: "",
      targetDateIso: "",
      type: options.triggerType || "automatic_past_due",
      details: "Check already in progress",
    };
  }

  isRunningCheck = true;

  try {
    const tickets = loadAllUnifiedTickets();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const currentHour = now.getHours();

    const force = Boolean(options.forceToday);
    const triggerType = options.triggerType || (force ? "manual_trigger" : currentHour >= 17 ? "automatic_shift_end" : "automatic_past_due");

    const nextWorkingDay = getNextWorkingDate(today);
    const nextWorkingDateFormatted = formatIndonesianDate(nextWorkingDay);
    const nextWorkingDateIso = nextWorkingDay.toISOString();

    const rolledOverTicketIds: string[] = [];
    const updatedTickets: UnifiedTicket[] = [];

    // Map officers by area to balance workload if needed
    const officerLoadNextDay: Record<string, number> = {};
    tickets.forEach((t) => {
      if (t.status !== "selesai" && t.rescheduledDate) {
        const sD = new Date(t.rescheduledDate);
        if (sD.getDate() === nextWorkingDay.getDate() && sD.getMonth() === nextWorkingDay.getMonth()) {
          const off = t.officer || t.divisionAssignee || "unassigned";
          officerLoadNextDay[off] = (officerLoadNextDay[off] || 0) + 1;
        }
      }
    });

    tickets.forEach((t) => {
      // Rule 1: Never rollover already completed tickets
      if (t.status === "selesai") return;

      // Rule 2: Determine current schedule date
      const schedDate = t.rescheduledDate ? new Date(t.rescheduledDate) : new Date(t.receivedAt);
      const schedDay = new Date(schedDate.getFullYear(), schedDate.getMonth(), schedDate.getDate(), 0, 0, 0, 0);

      const isPastSchedule = schedDay.getTime() < today.getTime();
      const isTodaySchedule = schedDay.getTime() === today.getTime();

      // Rollover condition:
      // - Pending ticket from a previous day (past due)
      // - Pending ticket from today if force=true OR time >= 17:00 (end of field shift)
      const shouldRollover = isPastSchedule || (isTodaySchedule && (force || currentHour >= 17));

      if (shouldRollover) {
        // Prevent re-rolling if already scheduled on or after target next working day
        if (t.rescheduledDate && new Date(t.rescheduledDate).getTime() >= nextWorkingDay.getTime()) {
          return;
        }

        const prevDateFormatted = schedDate.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        if (!t.originalScheduledDate) {
          t.originalScheduledDate = schedDate.toISOString();
        }

        t.rescheduledDate = nextWorkingDateIso;
        t.isRolledOver = true;
        t.rolloverCount = (t.rolloverCount || 0) + 1;
        t.lastRolloverAt = now.toISOString();

        // Add automated audit log comment
        if (!t.comments) t.comments = [];
        t.comments.push({
          id: `cmt-rollover-${Date.now()}-${t.id}`,
          authorName: "Background Scheduler (Aetra Daemon)",
          authorDivision: t.targetDivision || "minor_repair",
          authorRole: "Sistem Otomatis",
          targetDepartment: "Semua Divisi Teknis",
          content: `🔄 [Auto-Scheduler]: Komplain belum diselesaikan pada jadwal sebelumnya (${prevDateFormatted}). Sistem otomatis memindahkan dan menjadwalkan ulang tiket ini ke hari kerja berikutnya (${nextWorkingDateFormatted}) sebagai prioritas harian agar tidak ada komplain yang tertinggal.`,
          createdAt: now.toISOString(),
        });

        rolledOverTicketIds.push(t.id);
        updatedTickets.push(t);
      }
    });

    if (rolledOverTicketIds.length > 0) {
      // 1. Save unified local storage
      saveAllUnifiedTickets(tickets);

      // 2. Sync updated tickets to Supabase
      if (sb) {
        try {
          for (const ut of updatedTickets) {
            await sb
              .from(TABLE)
              .update({
                rescheduled_date: ut.rescheduledDate,
                is_rolled_over: true,
                rollover_count: ut.rolloverCount,
                last_rollover_at: ut.lastRolloverAt,
                comments: ut.comments,
              })
              .eq("id", ut.id);
          }
        } catch (dbErr) {
          console.warn("Supabase batch rollover sync warning:", dbErr);
        }
      }

      // 3. Publish real-time notification
      try {
        publishWorkOrderNotification({
          ticketId: rolledOverTicketIds[0],
          customer: `${rolledOverTicketIds.length} Komplain Tertunda`,
          officerName: "Background Scheduler",
          officerDivision: "minor_repair",
          targetDivision: "minor_repair",
          actionType: "status_update",
          summary: `🔄 Auto-Rollover: ${rolledOverTicketIds.length} Komplain Dipindahkan ke ${nextWorkingDateFormatted}`,
          details: `${rolledOverTicketIds.length} Work Order yang belum selesai hari ini otomatis dialokasikan ke jadwal ${nextWorkingDateFormatted} agar tidak ada komplain yang tertinggal.`,
        });
      } catch (notifErr) {
        console.warn("Notification dispatch warning:", notifErr);
      }

      // 4. Update Daemon State
      const currentState = getDaemonState();
      const newLog = {
        id: `log-${Date.now()}`,
        timestamp: now.toISOString(),
        count: rolledOverTicketIds.length,
        ticketIds: rolledOverTicketIds,
        targetDate: nextWorkingDateFormatted,
        type: triggerType,
        details: options.reason || `Berhasil memindahkan ${rolledOverTicketIds.length} tiket tertunda ke jadwal ${nextWorkingDateFormatted}.`,
      };

      const updatedState: DaemonState = {
        isActive: true,
        lastRunTimestamp: now.toISOString(),
        lastRunResult: {
          rolledOverCount: rolledOverTicketIds.length,
          ticketIds: rolledOverTicketIds,
          targetDate: nextWorkingDateFormatted,
          targetDateIso: nextWorkingDateIso,
          reason: options.reason || "Automatic background check executed",
        },
        nextScheduledCheck: new Date(Date.now() + 60000).toISOString(),
        totalRolledOverCount: (currentState.totalRolledOverCount || 0) + rolledOverTicketIds.length,
        recentLogs: [newLog, ...(currentState.recentLogs || [])].slice(0, 30),
      };

      saveDaemonState(updatedState);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("aetra:rollover_executed", {
            detail: {
              count: rolledOverTicketIds.length,
              ticketIds: rolledOverTicketIds,
              targetDate: nextWorkingDateFormatted,
            },
          })
        );
      }

      return {
        executed: true,
        rolledOverCount: rolledOverTicketIds.length,
        rolledOverTicketIds,
        targetDateFormatted: nextWorkingDateFormatted,
        targetDateIso: nextWorkingDateIso,
        type: triggerType,
        details: `Berhasil memindahkan ${rolledOverTicketIds.length} komplain ke hari kerja berikutnya (${nextWorkingDateFormatted}).`,
      };
    } else {
      // No tickets needed rollover
      const currentState = getDaemonState();
      currentState.lastRunTimestamp = now.toISOString();
      currentState.nextScheduledCheck = new Date(Date.now() + 60000).toISOString();
      saveDaemonState(currentState);

      return {
        executed: true,
        rolledOverCount: 0,
        rolledOverTicketIds: [],
        targetDateFormatted: nextWorkingDateFormatted,
        targetDateIso: nextWorkingDateIso,
        type: triggerType,
        details: "Tidak ada komplain tertunda yang perlu dipindahkan saat ini.",
      };
    }
  } catch (err: any) {
    console.error("Background rollover scheduler execution error:", err);
    return {
      executed: false,
      rolledOverCount: 0,
      rolledOverTicketIds: [],
      targetDateFormatted: "",
      targetDateIso: "",
      type: options.triggerType || "automatic_past_due",
      details: err?.message || "Terjadi kesalahan pada background scheduler",
    };
  } finally {
    isRunningCheck = false;
  }
}

/**
 * Start the recurring background scheduler heartbeat
 */
export function startBackgroundRolloverScheduler(intervalMs = 45000): () => void {
  if (typeof window === "undefined") return () => {};

  if (daemonIntervalTimer) {
    clearInterval(daemonIntervalTimer);
    daemonIntervalTimer = null;
  }

  // Initial check on startup
  setTimeout(() => {
    executePendingWorkOrderRollover({
      forceToday: false,
      triggerType: "automatic_past_due",
      reason: "Initial daemon boot check for past-due work orders",
    });
  }, 1500);

  // Periodic heartbeat runner
  daemonIntervalTimer = setInterval(() => {
    executePendingWorkOrderRollover({
      forceToday: false,
      reason: "Scheduled recurring heartbeat check",
    });
  }, intervalMs);

  // Re-check whenever tab becomes visible or receives focus
  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      executePendingWorkOrderRollover({
        forceToday: false,
        reason: "Tab focus / visibility change trigger",
      });
    }
  };

  const handleOnline = () => {
    executePendingWorkOrderRollover({
      forceToday: false,
      reason: "Network reconnection trigger",
    });
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("online", handleOnline);

  const state = getDaemonState();
  state.isActive = true;
  saveDaemonState(state);

  return () => {
    if (daemonIntervalTimer) {
      clearInterval(daemonIntervalTimer);
      daemonIntervalTimer = null;
    }
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("online", handleOnline);
  };
}

/**
 * Returns PostgreSQL pg_cron migration code for running natively server-side on Supabase
 */
export function getSupabaseCronMigrationScript(): string {
  return `-- ====================================================================
-- SUPABASE / POSTGRESQL NATIVE PG_CRON SCHEDULED TASK
-- PT AETRA AIR TANGERANG - WORK ORDER RECURRING AUTO-ROLLOVER
-- ====================================================================

-- 1. Pastikan extension pg_cron aktif di Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Fungsi Stored Procedure untuk Auto-Rollover Tiket Tertunda
CREATE OR REPLACE FUNCTION fn_auto_rollover_pending_work_orders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_next_working_day DATE;
  v_count INT := 0;
  v_dow INT;
  v_result JSONB;
BEGIN
  -- Hitung hari kerja berikutnya (Senin-Jumat, lompati Sabtu & Minggu)
  v_next_working_day := v_today + 1;
  v_dow := EXTRACT(DOW FROM v_next_working_day);

  IF v_dow = 6 THEN
    -- Jika hari Sabtu, loncat ke Senin (+2 hari)
    v_next_working_day := v_next_working_day + 2;
  ELSIF v_dow = 0 THEN
    -- Jika hari Minggu, loncat ke Senin (+1 hari)
    v_next_working_day := v_next_working_day + 1;
  END IF;

  -- Update seluruh Work Order yang belum berstatus 'selesai'
  -- yang dijadwalkan pada hari ini atau hari sebelumnya
  WITH updated_rows AS (
    UPDATE complaints
    SET 
      rescheduled_date = v_next_working_day::text,
      is_rolled_over = true,
      rollover_count = COALESCE(rollover_count, 0) + 1,
      last_rollover_at = NOW()::text,
      description = description || ' [Rollover Otomatis ke ' || v_next_working_day::text || ']'
    WHERE 
      status != 'selesai'
      AND (
        rescheduled_date IS NULL AND received_at::date <= v_today
        OR rescheduled_date IS NOT NULL AND rescheduled_date::date <= v_today
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated_rows;

  v_result := jsonb_build_object(
    'status', 'success',
    'executed_at', NOW(),
    'rolled_over_count', v_count,
    'next_working_day', v_next_working_day
  );

  RETURN v_result;
END;
$$;

-- 3. Daftarkan Scheduled Cron Job di pg_cron
-- Berjalan setiap hari kerja (Senin s/d Jumat) pukul 17:00 WIB (10:00 UTC)
SELECT cron.unschedule('aetra-daily-workorder-rollover') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'aetra-daily-workorder-rollover'
);

SELECT cron.schedule(
  'aetra-daily-workorder-rollover',
  '0 10 * * 1-5', -- Pukul 17:00 WIB (10:00 UTC)
  $$ SELECT fn_auto_rollover_pending_work_orders(); $$
);

-- ====================================================================
-- SELESAI: Task Cron aktif di Supabase Database!
-- ====================================================================
`;
}
