/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Real-Time Work Order Notification Service - PT Aetra Air Tangerang
 * Manages cross-tab and real-time alerts from mobile officer app to admin dashboard.
 */

import { DivisionId, DIVISIONS } from "../types/division";
import { loadAllUnifiedTickets, UnifiedTicket } from "./divisionTicketService";

export type WorkOrderActionType =
  | "work_started"
  | "work_completed"
  | "division_transferred"
  | "field_comment"
  | "esign_saved"
  | "new_report"
  | "status_update";

export interface WorkOrderNotification {
  id: string;
  ticketId: string;
  caseId?: string;
  customer: string;
  address?: string;
  officerName: string;
  officerDivision: DivisionId;
  targetDivision: DivisionId;
  previousDivision?: DivisionId;
  oldStatus?: string;
  newStatus?: string;
  actionType: WorkOrderActionType;
  summary: string;
  details?: string;
  timestamp: string;
  urgent?: boolean;
  isRead: boolean;
  materials?: string[];
  signatureRecorded?: boolean;
  transferReason?: string;
}

const STORAGE_NOTIF_HISTORY_KEY = "aetra_wo_notifications_history";
const STORAGE_LATEST_EVENT_KEY = "aetra_latest_wo_notification_event";
const STORAGE_SOUND_KEY = "aetra_notification_sound_enabled";
const BROADCAST_CHANNEL_NAME = "aetra_wo_notifications_channel";

type NotificationListener = (notification: WorkOrderNotification) => void;
const activeListeners = new Set<NotificationListener>();

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      if (event.data && typeof event.data === "object" && event.data.id) {
        handleIncomingNotification(event.data, false);
      }
    };
  } catch (e) {
    console.warn("BroadcastChannel initialization warning:", e);
  }
}

// Storage event listener for cross-tab fallback
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_LATEST_EVENT_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.id) {
          handleIncomingNotification(parsed, false);
        }
      } catch (err) {
        console.warn("Error parsing storage notification event:", err);
      }
    }
  });

  // Local window custom event listener
  window.addEventListener("aetra:wo_notification", ((e: CustomEvent<WorkOrderNotification>) => {
    if (e.detail && e.detail.id) {
      handleIncomingNotification(e.detail, false);
    }
  }) as EventListener);
}

function handleIncomingNotification(notification: WorkOrderNotification, isLocalPublish: boolean) {
  // Save to history if not already present
  saveToHistory(notification);

  // Play audio chime if enabled and not already played locally
  if (isNotificationSoundEnabled()) {
    playNotificationChime(notification.actionType);
  }

  // Notify in-process subscribers
  activeListeners.forEach((listener) => {
    try {
      listener(notification);
    } catch (err) {
      console.error("Error in notification listener:", err);
    }
  });

  // Trigger DOM custom event for dashboard components
  if (typeof window !== "undefined" && !isLocalPublish) {
    window.dispatchEvent(
      new CustomEvent("aetra:wo_notification_received", { detail: notification })
    );
  }
}

function saveToHistory(notif: WorkOrderNotification) {
  try {
    const list = getRecentNotifications();
    const existingIdx = list.findIndex((n) => n.id === notif.id);
    if (existingIdx !== -1) {
      list[existingIdx] = notif;
    } else {
      list.unshift(notif);
    }
    // Limit to latest 50 notifications
    const trimmed = list.slice(0, 50);
    localStorage.setItem(STORAGE_NOTIF_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn("Failed to persist notification history:", e);
  }
}

/**
 * Get all stored notification history
 */
export function getRecentNotifications(): WorkOrderNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_NOTIF_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Failed to parse notification history:", e);
  }
  return [];
}

/**
 * Get count of unread notifications
 */
export function getUnreadNotificationCount(): number {
  const list = getRecentNotifications();
  return list.filter((n) => !n.isRead).length;
}

/**
 * Mark a single notification as read
 */
export function markNotificationAsRead(id: string): void {
  const list = getRecentNotifications();
  const target = list.find((n) => n.id === id);
  if (target) {
    target.isRead = true;
    try {
      localStorage.setItem(STORAGE_NOTIF_HISTORY_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent("aetra:notifications_updated"));
    } catch (_) {}
  }
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsAsRead(): void {
  const list = getRecentNotifications();
  list.forEach((n) => (n.isRead = true));
  try {
    localStorage.setItem(STORAGE_NOTIF_HISTORY_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("aetra:notifications_updated"));
  } catch (_) {}
}

/**
 * Clear all notifications history
 */
export function clearAllNotifications(): void {
  try {
    localStorage.removeItem(STORAGE_NOTIF_HISTORY_KEY);
    window.dispatchEvent(new CustomEvent("aetra:notifications_updated"));
  } catch (_) {}
}

/**
 * Sound preferences
 */
export function isNotificationSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_SOUND_KEY);
    if (stored !== null) {
      return stored === "true";
    }
  } catch (_) {}
  return true; // default enabled
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_SOUND_KEY, String(enabled));
    window.dispatchEvent(new CustomEvent("aetra:sound_preference_updated", { detail: { enabled } }));
  } catch (_) {}
}

/**
 * Pleasant Web Audio Chime (Zero external dependencies)
 */
export function playNotificationChime(actionType?: WorkOrderActionType): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    // Different gentle melodies based on action type
    if (actionType === "work_completed") {
      // Upbeat cheerful chord (E5 -> G#5 -> B5)
      osc1.frequency.setValueAtTime(659.25, now);
      osc1.frequency.exponentialRampToValueAtTime(830.61, now + 0.12);
      osc2.frequency.setValueAtTime(987.77, now + 0.1);
    } else if (actionType === "division_transferred") {
      // Attention harmonic chord (A4 -> C#5)
      osc1.frequency.setValueAtTime(440.0, now);
      osc1.frequency.exponentialRampToValueAtTime(554.37, now + 0.14);
      osc2.frequency.setValueAtTime(659.25, now);
    } else {
      // Smooth double chime (C5 -> G5)
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.15);
      osc2.frequency.setValueAtTime(1046.5, now + 0.08);
    }

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);

    setTimeout(() => {
      try {
        ctx.close();
      } catch (_) {}
    }, 500);
  } catch (err) {
    // Ignore audio autoplay policy restrictions if any
  }
}

/**
 * Publish a new Work Order status update from mobile app or anywhere
 */
export function publishWorkOrderNotification(
  input: Omit<WorkOrderNotification, "id" | "timestamp" | "isRead">
): WorkOrderNotification {
  const notif: WorkOrderNotification = {
    ...input,
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    timestamp: new Date().toISOString(),
    isRead: false,
  };

  // 1. Save to history
  saveToHistory(notif);

  // 2. Broadcast to other tabs/windows
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(notif);
    } catch (e) {
      console.warn("BroadcastChannel postMessage error:", e);
    }
  }

  // 3. Fallback cross-tab via localStorage event
  try {
    localStorage.setItem(STORAGE_LATEST_EVENT_KEY, JSON.stringify(notif));
  } catch (e) {
    console.warn("Storage event trigger warning:", e);
  }

  // 4. In-process dispatch
  handleIncomingNotification(notif, true);

  // 5. Fire window custom events for UI hooks
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("aetra:wo_notification_received", { detail: notif })
    );
  }

  return notif;
}

/**
 * Subscribe to work order notifications
 */
export function subscribeToWorkOrderNotifications(
  listener: NotificationListener
): () => void {
  activeListeners.add(listener);
  return () => {
    activeListeners.delete(listener);
  };
}

/**
 * Simulate a mobile officer update (ideal for testing in UI)
 */
export function simulateMobileOfficerUpdate(
  type: WorkOrderActionType = "work_completed"
): WorkOrderNotification {
  const tickets = loadAllUnifiedTickets();
  const sampleTicket =
    tickets.find((t) => t.status === "proses") ||
    tickets[0] || {
      id: "WO-2026-001",
      caseId: "1004829101",
      customer: "Bpk. Suherman",
      address: "Jl. Raya Serang Km 14 No. 42, Cikupa",
      officer: "Agus Setiawan",
      targetDivision: "minor_repair",
      category: "KBSM",
    };

  const officerName = sampleTicket.officer || "Agus Setiawan";
  const divisionId = (sampleTicket.targetDivision as DivisionId) || "minor_repair";

  if (type === "work_completed") {
    return publishWorkOrderNotification({
      ticketId: sampleTicket.id,
      caseId: sampleTicket.caseId,
      customer: sampleTicket.customer,
      address: sampleTicket.address,
      officerName,
      officerDivision: divisionId,
      targetDivision: divisionId,
      oldStatus: "proses",
      newStatus: "selesai",
      actionType: "work_completed",
      summary: `Petugas ${officerName} telah menyelesaikan perbaikan di lokasi pelanggan.`,
      details: "Stop kran kuningan 1/2\" baru dipasang, rembesan tertangani, dan BAST digital telah ditandatangani.",
      materials: ["Stop Kran Kuningan 1/2\"", "Seal Tape Tebal"],
      signatureRecorded: true,
      urgent: sampleTicket.urgent,
    });
  }

  if (type === "division_transferred") {
    const targetDiv: DivisionId =
      divisionId === "minor_repair" ? "sales_support" : "minor_repair";
    const targetMeta = DIVISIONS[targetDiv];

    return publishWorkOrderNotification({
      ticketId: sampleTicket.id,
      caseId: sampleTicket.caseId,
      customer: sampleTicket.customer,
      address: sampleTicket.address,
      officerName,
      officerDivision: divisionId,
      previousDivision: divisionId,
      targetDivision: targetDiv,
      oldStatus: sampleTicket.status,
      newStatus: "baru",
      actionType: "division_transferred",
      summary: `Pekerjaan dialihkan dari ${DIVISIONS[divisionId].shortName} ke ${targetMeta.name}.`,
      details: "Perlu investigasi lebih lanjut dan verifikasi administrasi billing rekening oleh tim terkait.",
      transferReason: "Kondisi teknis membutuhkan kewenangan divisi lanjutan",
      urgent: true,
    });
  }

  if (type === "work_started") {
    return publishWorkOrderNotification({
      ticketId: sampleTicket.id,
      caseId: sampleTicket.caseId,
      customer: sampleTicket.customer,
      address: sampleTicket.address,
      officerName,
      officerDivision: divisionId,
      targetDivision: divisionId,
      oldStatus: "baru",
      newStatus: "proses",
      actionType: "work_started",
      summary: `Petugas ${officerName} telah tiba di lokasi dan memulai pengerjaan.`,
      details: "Pemeriksaan titik kebocoran pipa persil menggunakan peralatan deteksi.",
      urgent: sampleTicket.urgent,
    });
  }

  return publishWorkOrderNotification({
    ticketId: sampleTicket.id,
    caseId: sampleTicket.caseId,
    customer: sampleTicket.customer,
    address: sampleTicket.address,
    officerName,
    officerDivision: divisionId,
    targetDivision: divisionId,
    actionType: "field_comment",
    summary: `Petugas ${officerName} menambahkan catatan pembaruan dari lapangan.`,
    details: "Lokasi berhasil dijangkau, menunggu izin pembongkaran paving teras.",
  });
}
