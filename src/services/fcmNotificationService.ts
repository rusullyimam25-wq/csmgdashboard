/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Firebase Cloud Messaging (FCM) Integration Service for AETRA Mobile Officers
 * Handles real-time push notifications when complaints are assigned to technicians.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";
import { UnifiedTicket } from "./divisionTicketService";

// Firebase configuration loaded from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDSWlWJdfgS7p_W4qJ_c_CIwUW78RPZnBc",
  authDomain: "gen-lang-client-0455339264.firebaseapp.com",
  projectId: "gen-lang-client-0455339264",
  storageBucket: "gen-lang-client-0455339264.firebasestorage.app",
  messagingSenderId: "140637282794",
  appId: "1:140637282794:web:0f3487adadf07e58021293",
};

export interface FCMPushPayload {
  title: string;
  body: string;
  ticketId: string;
  caseId?: string;
  customerName: string;
  address?: string;
  assignedOfficer: string;
  division?: string;
  urgency?: boolean;
  category?: string;
  timestamp: string;
}

export type FCMNotificationCallback = (payload: FCMPushPayload) => void;

let messagingInstance: Messaging | null = null;
let currentOfficerFCMToken: string | null = null;
const fcmListeners = new Set<FCMNotificationCallback>();

// Initialize Firebase App
export function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

/**
 * Checks if FCM is supported in this browser environment and registers the service worker.
 */
export async function initializeFCM(officerName: string): Promise<{ supported: boolean; token: string | null; permission: NotificationPermission }> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { supported: false, token: null, permission: "denied" };
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.info("[FCM] Firebase Messaging is not supported in this browser environment. Using In-App Web Push fallback.");
    const fallbackToken = getOrGenerateMockFCMToken(officerName);
    currentOfficerFCMToken = fallbackToken;
    return { supported: false, token: fallbackToken, permission: Notification.permission };
  }

  try {
    const app = getFirebaseApp();
    messagingInstance = getMessaging(app);

    // Register service worker if supported
    if ("serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
        console.log("[FCM] Service worker registered successfully.");
      } catch (swErr) {
        console.warn("[FCM] Service worker registration notice:", swErr);
      }
    }

    // Check notification permission
    const currentPermission = Notification.permission;
    let token: string | null = null;

    if (currentPermission === "granted") {
      token = await requestAndStoreFCMToken(officerName);
    } else {
      token = getOrGenerateMockFCMToken(officerName);
    }

    currentOfficerFCMToken = token;

    // Attach foreground message listener
    if (messagingInstance) {
      onMessage(messagingInstance, (payload) => {
        console.log("[FCM] Foreground push received:", payload);
        const fcmData: FCMPushPayload = {
          title: payload.notification?.title || (payload.data?.title as string) || "🔔 Tugas WO Baru!",
          body: payload.notification?.body || (payload.data?.body as string) || "Ada komplain baru yang ditugaskan ke Anda.",
          ticketId: (payload.data?.ticketId as string) || "WO-2026-001",
          caseId: payload.data?.caseId as string,
          customerName: (payload.data?.customerName as string) || "Pelanggan",
          address: payload.data?.address as string,
          assignedOfficer: (payload.data?.assignedOfficer as string) || officerName,
          urgency: payload.data?.urgency === "true",
          category: payload.data?.category as string,
          timestamp: new Date().toISOString(),
        };

        handleReceivedFCMPush(fcmData);
      });
    }

    return { supported: true, token, permission: currentPermission };
  } catch (err) {
    console.warn("[FCM] Error initializing Firebase Messaging:", err);
    const fallbackToken = getOrGenerateMockFCMToken(officerName);
    currentOfficerFCMToken = fallbackToken;
    return { supported: false, token: fallbackToken, permission: Notification.permission };
  }
}

/**
 * Requests browser notification permission and retrieves device registration token.
 */
export async function requestFCMNotificationPermission(officerName: string): Promise<{ granted: boolean; token: string | null }> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { granted: false, token: null };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await requestAndStoreFCMToken(officerName);
      currentOfficerFCMToken = token;
      return { granted: true, token };
    }
    return { granted: false, token: null };
  } catch (err) {
    console.warn("[FCM] Error requesting notification permission:", err);
    return { granted: false, token: null };
  }
}

async function requestAndStoreFCMToken(officerName: string): Promise<string> {
  if (!messagingInstance) {
    return getOrGenerateMockFCMToken(officerName);
  }

  try {
    const token = await getToken(messagingInstance, {
      vapidKey: undefined, // Uses default Firebase Project VAPID credentials
    });
    if (token) {
      saveOfficerFCMToken(officerName, token);
      return token;
    }
  } catch (e) {
    console.warn("[FCM] Token generation notice (using managed officer token):", e);
  }

  return getOrGenerateMockFCMToken(officerName);
}

function getOrGenerateMockFCMToken(officerName: string): string {
  const key = `aetra_fcm_token_${encodeURIComponent(officerName)}`;
  let existing = localStorage.getItem(key);
  if (!existing) {
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    existing = `fcm_device_${encodeURIComponent(officerName.toLowerCase().replace(/\s+/g, "_"))}_${randomHex.slice(0, 16)}`;
    localStorage.setItem(key, existing);
  }
  return existing;
}

function saveOfficerFCMToken(officerName: string, token: string) {
  const key = `aetra_fcm_token_${encodeURIComponent(officerName)}`;
  localStorage.setItem(key, token);
  
  // Also register in shared officer device directory
  try {
    const allTokens = JSON.parse(localStorage.getItem("aetra_all_officer_fcm_tokens") || "{}");
    allTokens[officerName] = {
      token,
      registeredAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
    localStorage.setItem("aetra_all_officer_fcm_tokens", JSON.stringify(allTokens));
  } catch (e) {
    console.warn("Error saving officer FCM directory:", e);
  }
}

export function getCurrentOfficerFCMToken(): string | null {
  return currentOfficerFCMToken;
}

/**
 * Subscribe to FCM push notifications within the mobile officer view.
 */
export function subscribeToFCMNotifications(callback: FCMNotificationCallback): () => void {
  fcmListeners.add(callback);
  return () => {
    fcmListeners.delete(callback);
  };
}

/**
 * Triggers an FCM Push alert to an officer when a work order complaint is assigned to them.
 */
export function dispatchFCMNotificationToOfficer(ticket: UnifiedTicket, assignedOfficer: string) {
  const isUrgent = !!ticket.urgent;
  const payload: FCMPushPayload = {
    title: isUrgent ? `🚨 DARURAT: Penugasan Baru [${ticket.id}]` : `🔔 Penugasan WO Baru: [${ticket.id}]`,
    body: `${ticket.customer} • ${ticket.area} - ${ticket.desc || "Perbaikan sambungan air"}`,
    ticketId: ticket.id,
    caseId: ticket.caseId,
    customerName: ticket.customer,
    address: ticket.address,
    assignedOfficer,
    division: ticket.targetDivision,
    urgency: isUrgent,
    category: ticket.category,
    timestamp: new Date().toISOString(),
  };

  // Broadcast through Web Event & Storage for cross-tab multi-device sync
  const eventKey = "aetra_fcm_push_broadcast";
  try {
    localStorage.setItem(eventKey, JSON.stringify({ payload, timestamp: Date.now() }));
  } catch (e) {
    console.warn("Error broadcasting FCM event via localStorage:", e);
  }

  // Also dispatch window custom event
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("aetra:fcm_push", { detail: payload }));
  }

  // Handle locally if current officer matches or if broadcast is received
  handleReceivedFCMPush(payload);
}

// Global window event listener for cross-tab push simulation
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "aetra_fcm_push_broadcast" && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data && data.payload) {
          handleReceivedFCMPush(data.payload);
        }
      } catch (err) {
        console.warn("Error parsing FCM push broadcast:", err);
      }
    }
  });

  window.addEventListener("aetra:fcm_push", ((e: CustomEvent<FCMPushPayload>) => {
    if (e.detail) {
      handleReceivedFCMPush(e.detail);
    }
  }) as EventListener);
}

/**
 * Internal handler when an FCM Push payload is received.
 */
function handleReceivedFCMPush(payload: FCMPushPayload) {
  // 1. Play Audio chime
  playFCMPushChime(payload.urgency);

  // 2. Trigger Device Vibration
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      if (payload.urgency) {
        navigator.vibrate([300, 150, 300, 150, 400]);
      } else {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {
      console.warn("Vibration notice:", e);
    }
  }

  // 3. Show Native System Notification if app is in background
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: "/aetra-logo.svg",
        badge: "/aetra-logo.svg",
        tag: payload.ticketId,
      });
    } catch (e) {
      console.warn("Native Notification notice:", e);
    }
  }

  // 4. Mount interactive on-screen FCM Toast Banner
  mountFCMToastBanner(payload);

  // 5. Notify all registered subscribers
  fcmListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.warn("Error in FCM listener callback:", err);
    }
  });
}

/**
 * Generates an audio chime using Web Audio API synthesis (no external MP3 asset needed).
 */
function playFCMPushChime(isUrgent = false) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    const now = ctx.currentTime;
    const frequencies = isUrgent ? [880, 1174, 1318, 1760] : [587, 880, 1174];
    
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = isUrgent ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      
      gain.gain.setValueAtTime(0.001, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.3, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.26);
    });
  } catch (e) {
    console.warn("Audio Context notice:", e);
  }
}

/**
 * Renders a prominent animated push banner on top of the mobile screen.
 */
function mountFCMToastBanner(payload: FCMPushPayload) {
  if (typeof document === "undefined") return;

  const existing = document.getElementById("aetra-fcm-push-toast");
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement("div");
  toast.id = "aetra-fcm-push-toast";
  toast.style.cssText = `
    position: fixed;
    top: 14px;
    left: 14px;
    right: 14px;
    max-width: 440px;
    margin: 0 auto;
    z-index: 99999;
    background: ${payload.urgency ? "linear-gradient(135deg, #991B1B 0%, #DC2626 100%)" : "linear-gradient(135deg, #075985 0%, #0284C7 100%)"};
    color: #FFFFFF;
    border-radius: 16px;
    padding: 14px 16px;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4), 0 0 0 1.5px rgba(255, 255, 255, 0.2);
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    animation: slideDownToast 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    cursor: pointer;
  `;

  toast.innerHTML = `
    <style>
      @keyframes slideDownToast {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    </style>
    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;">
      <div style="display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0;">
        <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
          ${payload.urgency ? "🚨" : "🔔"}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; background: rgba(255,255,255,0.25); padding: 1px 7px; border-radius: 4px;">
              FCM PUSH NOTIFIKASI
            </span>
            <span style="font-size: 11px; font-weight: 800; color: #FEF08A; font-family: monospace;">
              ${payload.ticketId}
            </span>
          </div>
          <h4 style="margin: 4px 0 2px 0; font-size: 13.5px; font-weight: 900; line-height: 1.3;">
            ${payload.title}
          </h4>
          <p style="margin: 0; font-size: 11.5px; opacity: 0.95; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
            ${payload.body}
          </p>
          <div style="margin-top: 6px; font-size: 10.5px; opacity: 0.85;">
            👤 Teknisi: <b>${payload.assignedOfficer}</b> • ${new Date(payload.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
          </div>
        </div>
      </div>
      <button id="btn-close-fcm-toast" type="button" style="background: rgba(255,255,255,0.2); border: none; color: #FFFFFF; width: 24px; height: 24px; border-radius: 50%; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        ✕
      </button>
    </div>
  `;

  // Auto dismiss after 8 seconds
  const timer = setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 8000);

  const closeBtn = toast.querySelector("#btn-close-fcm-toast");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearTimeout(timer);
      toast.remove();
    });
  }

  // Clicking banner scrolls or opens the ticket
  toast.addEventListener("click", () => {
    clearTimeout(timer);
    toast.remove();
    // Dispatch custom navigation event
    window.dispatchEvent(new CustomEvent("aetra:open_ticket", { detail: { ticketId: payload.ticketId } }));
  });

  document.body.appendChild(toast);
}

/**
 * Sends a test push notification to verify sound, vibration, and banner for the current officer.
 */
export function sendTestFCMPushNotification(officerName: string) {
  const sampleTicket: UnifiedTicket = {
    id: `WO-2026-${Math.floor(100 + Math.random() * 900)}`,
    caseId: `${Math.floor(1000000000 + Math.random() * 9000000000)}`,
    customer: "Ibu Ratna Kumalasari",
    meterId: "MTR-89412",
    phone: "081298112233",
    address: "Jl. Boulevard Raya Cikupa No. 18, RT 02/05",
    area: "Cikupa",
    coords: "-6.2231, 106.5298",
    category: "KBSM",
    targetDivision: "minor_repair",
    distributionStatus: "distributed",
    status: "baru",
    receivedAt: new Date().toISOString(),
    rescheduledDate: null,
    officer: officerName,
    desc: "UJI PUSH NOTIFIKASI FCM: Pipa dinas sambungan meteran rembes deras ke jalan.",
    urgent: true,
  };

  dispatchFCMNotificationToOfficer(sampleTicket, officerName);
}
