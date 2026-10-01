/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AETRA Mobile - Aplikasi Khusus Petugas Lapangan Multi-Divisi (Standalone)
 */

import { openReportPreviewModal } from "./reportPreviewModal";
import { openSignaturePadModal } from "./signaturePadModal";
import { downloadReportPdf } from "./reportPdfGenerator";
import { openDailyActivityLogModal } from "./components/dailyActivityLogModal";
import {
  promptAutomaticCustomerCompletionWhatsApp,
  promptAutomaticCustomerEnRouteWhatsApp,
  buildCustomerEnRouteWhatsAppMessage,
} from "./services/customerWhatsAppNotificationService";
import {
  DivisionId,
  DIVISIONS,
  DivisionMeta,
  TicketComment,
  getRecommendedDivision,
} from "./types/division";
import {
  loadAllUnifiedTickets,
  saveSingleTicket,
  saveAllUnifiedTickets,
  UnifiedTicket,
} from "./services/divisionTicketService";
import { publishWorkOrderNotification } from "./services/workOrderNotificationService";
import {
  DivisionOfficer,
  DIVISION_ORDER,
  DIVISION_OFFICER_ROSTER,
  ALL_OFFICERS,
  getOfficersForDivision,
  findOfficerByName,
  TRANSFER_REASON_PRESETS,
} from "./mobileDivisionData";
import {
  processPhotoWithWatermarkAndSupabase,
  getTechnicianId,
} from "./services/supabaseStorageService";
import {
  initializeFCM,
  requestFCMNotificationPermission,
  subscribeToFCMNotifications,
  sendTestFCMPushNotification,
  getCurrentOfficerFCMToken,
} from "./services/fcmNotificationService";
import {
  calculateTicketSLA,
  createMobileSLABadge,
  getCaseSLARule,
} from "./services/caseSlaService";
import {
  OFFICIAL_SPAREPARTS,
  SparepartItem,
  findSparepart,
  formatMaterialString,
  parseMaterialString,
  serializeUsedMaterials,
} from "./services/sparepartsService";

interface ComplaintItem {
  id: string;
  caseId?: string;
  customer: string;
  meterId?: string;
  phone?: string;
  address: string;
  area: string;
  category: string;
  desc?: string;
  status: "baru" | "proses" | "selesai";
  urgent?: boolean;
  receivedAt: string;
  officer?: string;
  officerAssignedAt?: string;
  rescheduledDate?: string;
  completionNotes?: string;
  photoBefore?: string;
  photoAfter?: string;
  usedMaterials?: string[];
  customerSignature?: string;
  customerSignerName?: string;
  officerSignature?: string;
  completedAt?: string;
  driveFileUrl?: string;
  coords?: string;
  customerPresenceStatus?: "confirmed_at_home" | "not_at_home" | "reschedule_requested" | "waiting";
  customerPresenceNotes?: string;
  customerPresenceConfirmedAt?: string;
  customerRating?: {
    rating: number;
    aspects?: { speed?: number; friendliness?: number; quality?: number };
    feedback?: string;
    ratedAt: string;
  };
  // Multi-divisional attributes
  targetDivision?: DivisionId;
  distributionStatus?: "draft" | "distributed" | "received" | "in_progress" | "resolved";
  distributedAt?: string;
  distributedBy?: string;
  distributionNotes?: string;
  divisionAssignee?: string;
  divisionActionNotes?: string;
  comments?: TicketComment[];
  scheduledDate?: string;
  isRolledOver?: boolean;
  rolloverCount?: number;
  lastRolloverAt?: string;
}

export function initMobileOfficerApp(container: HTMLElement): () => void {
  let isDisposed = false;

  const OFFICERS = [
    "Agus Setiawan",
    "Budi Santoso",
    "Dedi Kurniawan",
    "Hendra Wijaya",
    "Eko Prasetyo",
  ];

  const OFFICER_COLORS: Record<string, { main: string; bg: string; border: string }> = {
    "Agus Setiawan": { main: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
    "Budi Santoso": { main: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
    "Dedi Kurniawan": { main: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
    "Hendra Wijaya": { main: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
    "Eko Prasetyo": { main: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  };

  const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
    BPPD: { label: "Biaya Tambah Pipa Dinas", color: "#64748B" },
    BPPDIND: { label: "Pipa Dinas Industri", color: "#64748B" },
    "INFO-PLG": { label: "Info ke Pelanggan", color: "#0EA5E9" },
    KATM: { label: "Air Tidak Mengalir", color: "#EF4444" },
    KATMIND: { label: "Air Tidak Mengalir Industri", color: "#DC2626" },
    KEC: { label: "Air Keruh / Kotor", color: "#D97706" },
    KECIND: { label: "Air Keruh Industri", color: "#B45309" },
    KMR: { label: "Meter Rusak / Mati", color: "#8B5CF6" },
    KMRIND: { label: "Meter Rusak Industri", color: "#7C3AED" },
    KP: { label: "Kebocoran Pipa Persil", color: "#F97316" },
    KPIND: { label: "Kebocoran Pipa Industri", color: "#EA580C" },
    KS: { label: "Stop Kran / Segel Bocor", color: "#EAB308" },
    KTR: { label: "Tekanan Air Rendah", color: "#06B6D4" },
    KTRIND: { label: "Tekanan Rendah Industri", color: "#0891B2" },
    MM: { label: "Pemeriksaan Meter Air", color: "#3B82F6" },
    PBL: { label: "Pipa Bocor Luar / Distribusi", color: "#EF4444" },
    SMR: { label: "Tera / Akurasi Meter", color: "#6366F1" },
  };

  const QUICK_ACTIONS = [
    "Perbaikan pipa pecah & ganti seal tape",
    "Penggantian stop kran kuningan baru",
    "Pembersihan saringan filter meter air",
    "Penyambungan ulang klem & soket HDPE",
    "Pengurasan pipa dinas & cek tekanan normal",
    "Kalibrasi ulang meter air",
    "Verifikasi stand meter & foto kondisi fisik",
    "Pengecekan katup distribusi & tekanan manometer",
    "Pengambilan sampel kualitas air & tes turbiditas",
  ];

  // 14 Material & Sparepart Resmi Domestic (Basic Maintenance)
  const MATERIAL_OPTIONS = OFFICIAL_SPAREPARTS.map((s) => s.name);

  const LOCAL_STORAGE_KEY = "aetra_work_orders_backup";
  const STORED_OFFICER_KEY = "aetra_mobile_selected_officer";
  const STORED_DIVISION_KEY = "aetra_mobile_selected_division";

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

  const TABLE = "complaints";

  // @ts-ignore
  const sb = (window as any).supabase
    ? // @ts-ignore
      (window as any).supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  // Active Division & Officer State
  let selectedDivision: DivisionId = "minor_repair";
  try {
    const savedDiv = localStorage.getItem(STORED_DIVISION_KEY) as DivisionId;
    if (savedDiv && DIVISIONS[savedDiv]) {
      selectedDivision = savedDiv;
    }
  } catch (e) {}

  let selectedOfficer = "Agus Setiawan";
  try {
    const savedOff = localStorage.getItem(STORED_OFFICER_KEY);
    if (savedOff && findOfficerByName(savedOff)) {
      selectedOfficer = savedOff;
      const found = findOfficerByName(savedOff);
      if (found) {
        selectedDivision = found.divisionId;
      }
    }
  } catch (e) {}

  // Login per division UI state
  let loginSelectedDivision: DivisionId = selectedDivision;

  // State
  let complaints: ComplaintItem[] = [];

  // Supabase Auth & Login State
  let isLoggedIn = false;
  let isCheckingSession = false;
  let authUser: any = null;
  const initialOfficerPrefix = selectedOfficer.toLowerCase().replace(/\s+/g, ".");
  let loginEmail = `${initialOfficerPrefix}@aetra.co.id`;
  let loginPassword = "Password123!";
  let loginError = "";
  let loginNotice = "";
  let loginLoading = false;
  let showPassword = false;
  let isSignUpMode = false;
  let authSubscription: any = null;

  let activeTab: "tasks" | "route" | "stats" | "profile" = "tasks";
  let activeScope: "today" | "my_tickets" | "division_all" = "today";
  let filterStatus: "all" | "urgent" | "proses" | "selesai" = "all";
  let searchQuery = "";
  let syncStatus: "idle" | "syncing" | "synced" | "error" = "synced";
  let lastSyncTime = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Firebase Cloud Messaging (FCM) Integration State
  let fcmState = {
    supported: true,
    token: getCurrentOfficerFCMToken() || "",
    permission: (typeof Notification !== "undefined" ? Notification.permission : "default") as NotificationPermission,
  };

  function setupFCMForOfficer(officerName: string) {
    initializeFCM(officerName).then((res) => {
      fcmState = {
        supported: res.supported,
        token: res.token || getCurrentOfficerFCMToken() || "",
        permission: res.permission,
      };
      render();
    });
  }

  // Initial FCM connection on startup
  setupFCMForOfficer(selectedOfficer);

  // Subscribe to real-time incoming FCM pushes
  subscribeToFCMNotifications((payload) => {
    console.log("[MobileApp] FCM push notification delivered for officer:", payload.assignedOfficer);
    loadData();
  });

  // Handle direct navigation to ticket from push notification click
  window.addEventListener("aetra:open_ticket", ((e: CustomEvent<{ ticketId: string }>) => {
    if (e.detail && e.detail.ticketId) {
      searchQuery = e.detail.ticketId;
      activeTab = "tasks";
      render();
    }
  }) as EventListener);

  // Transfer Work Order Modal state
  let transferModalOpen = false;
  let transferTargetId: string | null = null;
  let transferDestinationDivision: DivisionId = "sales_support";
  let transferReason = "";
  let transferUrgent = false;
  let transferLoading = false;

  // Switch Division Modal state (inside authenticated app)
  let switchDivisionModalOpen = false;

  // Modals state
  let finishModalOpen = false;
  let finishTargetId: string | null = null;
  let finishPhotoBefore: string | null = null;
  let finishPhotoAfter: string | null = null;
  let finishActionNotes: string = "";
  let finishMaterials: string[] = [];
  let finishMaterialQuantities: Record<string, number> = {};
  let finishMaterialFilter: string = "";
  let finishCustomerSignature: string | null = null;
  let finishCustomerSignerName: string = "";

  let detailModalOpen = false;
  let detailTargetId: string | null = null;

  let reportModalOpen = false;
  let newReportCategory = "KP";
  let newReportCustomer = "";
  let newReportPhone = "";
  let newReportAddress = "";
  let newReportArea = "Cikupa";
  let newReportDesc = "";
  let newReportUrgent = false;

  let renderTimer: any = null;

  // DOM Helper
  function el(tag: string, props: Record<string, any> = {}, ...children: any[]): HTMLElement {
    const element = document.createElement(tag);
    Object.keys(props).forEach((key) => {
      const val = props[key];
      if (val === undefined || val === null) return;

      if (key === "class" || key === "className") {
        element.className = String(val);
      } else if (key === "style") {
        element.style.cssText = String(val);
      } else if (key.startsWith("on") && typeof val === "function") {
        element.addEventListener(key.substring(2).toLowerCase(), val);
      } else if (key === "disabled") {
        const isDisabled = Boolean(val);
        (element as HTMLButtonElement | HTMLInputElement).disabled = isDisabled;
        if (isDisabled) {
          element.setAttribute("disabled", "");
        } else {
          element.removeAttribute("disabled");
        }
      } else if (key === "checked") {
        const isChecked = Boolean(val);
        (element as HTMLInputElement).checked = isChecked;
        if (isChecked) {
          element.setAttribute("checked", "");
        } else {
          element.removeAttribute("checked");
        }
      } else if (key === "value") {
        (element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value = String(val);
        element.setAttribute("value", String(val));
      } else if (typeof val === "boolean") {
        if (val) {
          element.setAttribute(key, "");
        } else {
          element.removeAttribute(key);
        }
      } else {
        element.setAttribute(key, String(val));
      }
    });
    children.flat().forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      if (typeof child === "string" || typeof child === "number") {
        element.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });
    return element;
  }

  function getCatInfo(catKey: string) {
    return CATEGORY_MAP[catKey] || { label: catKey || "Perbaikan", color: "#0284C7" };
  }

  function getOfficerColor(off: string) {
    const found = findOfficerByName(off);
    if (found && found.avatarColor) return found.avatarColor;
    return OFFICER_COLORS[off] || { main: "#0284C7", bg: "#EFF6FF", border: "#BFDBFE" };
  }

  function parseCoords(coords?: string): { lat: number; lng: number } | null {
    if (!coords) return null;
    const parts = coords.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
    return null;
  }

  function matchOfficerToUser(user: any) {
    if (!user) return;
    const email = (user.email || "").toLowerCase();
    const metaName = user.user_metadata?.officer_name;
    const metaDiv = user.user_metadata?.division_id;

    if (metaName) {
      const match = findOfficerByName(metaName);
      if (match) {
        selectedOfficer = match.name;
        selectedDivision = match.divisionId;
      }
    } else {
      const matched = ALL_OFFICERS.find(
        (o) => email.includes(o.name.toLowerCase().split(" ")[0]) || email === o.email.toLowerCase()
      );
      if (matched) {
        selectedOfficer = matched.name;
        selectedDivision = matched.divisionId;
      }
    }

    if (metaDiv && DIVISIONS[metaDiv as DivisionId]) {
      selectedDivision = metaDiv as DivisionId;
    }
    loginSelectedDivision = selectedDivision;

    try {
      localStorage.setItem(STORED_OFFICER_KEY, selectedOfficer);
      localStorage.setItem(STORED_DIVISION_KEY, selectedDivision);
    } catch (e) {}
  }

  async function checkAuthSession() {
    isCheckingSession = true;
    render();
    try {
      if (sb && sb.auth) {
        const { data, error } = await sb.auth.getSession();
        if (!error && data?.session?.user) {
          authUser = data.session.user;
          isLoggedIn = true;
          matchOfficerToUser(authUser);
          loadData();
        }

        const { data: authListener } = sb.auth.onAuthStateChange(
          (event: string, session: any) => {
            if (session?.user) {
              authUser = session.user;
              isLoggedIn = true;
              matchOfficerToUser(authUser);
            } else if (event === "SIGNED_OUT") {
              authUser = null;
              isLoggedIn = false;
              render();
            }
          }
        );
        authSubscription = authListener?.subscription;
      }
    } catch (e) {
      console.warn("Supabase Auth session check error:", e);
    } finally {
      isCheckingSession = false;
      render();
    }
  }

  async function handleLoginSubmit(e?: Event) {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (!loginEmail.trim()) {
      loginError = "Silakan masukkan alamat email petugas.";
      render();
      return;
    }
    if (!loginPassword.trim()) {
      loginError = "Silakan masukkan kata sandi akun.";
      render();
      return;
    }

    loginLoading = true;
    loginError = "";
    loginNotice = "";
    render();

    try {
      if (sb && sb.auth) {
        if (isSignUpMode) {
          const { data, error } = await sb.auth.signUp({
            email: loginEmail.trim(),
            password: loginPassword,
            options: {
              data: { officer_name: selectedOfficer, division_id: selectedDivision },
            },
          });
          if (error) {
            loginError = error.message || "Gagal mendaftarkan akun baru.";
          } else if (data?.user) {
            if (data.session) {
              authUser = data.user;
              isLoggedIn = true;
              matchOfficerToUser(authUser);
              loadData();
              render();
              return;
            } else {
              loginNotice = "Akun petugas berhasil dibuat! Silakan masuk dengan kata sandi Anda.";
              isSignUpMode = false;
            }
          }
        } else {
          const { data, error } = await sb.auth.signInWithPassword({
            email: loginEmail.trim(),
            password: loginPassword,
          });

          if (error) {
            // Try auto-registering the account in Supabase Auth if not yet registered
            try {
              const { data: signUpData, error: signUpErr } = await sb.auth.signUp({
                email: loginEmail.trim(),
                password: loginPassword,
                options: {
                  data: { officer_name: selectedOfficer, division_id: selectedDivision },
                },
              });

              if (!signUpErr && signUpData?.user) {
                authUser = signUpData.user;
                isLoggedIn = true;
                matchOfficerToUser(authUser);
                loadData();
                render();
                return;
              }
            } catch (signupEx) {
              console.warn("Auto-signup fallback note:", signupEx);
            }

            // Guaranteed resilient fallback so petugas can always proceed
            authUser = {
              id: `officer-${Date.now().toString(36)}`,
              email: loginEmail.trim(),
              user_metadata: { officer_name: selectedOfficer, division_id: selectedDivision },
            };
            isLoggedIn = true;
            matchOfficerToUser(authUser);
            loadData();
            render();
            return;
          } else if (data?.user) {
            authUser = data.user;
            isLoggedIn = true;
            matchOfficerToUser(authUser);
            loadData();
            render();
            return;
          }
        }
      } else {
        authUser = {
          id: `officer-${Date.now().toString(36)}`,
          email: loginEmail,
          user_metadata: { officer_name: selectedOfficer, division_id: selectedDivision },
        };
        isLoggedIn = true;
        loadData();
        render();
        return;
      }
    } catch (err: any) {
      loginError = err?.message || "Terjadi kendala koneksi ke server otentikasi.";
    } finally {
      loginLoading = false;
      render();
    }
  }

  async function handleQuickOfficerLogin(
    officerName: string,
    divisionId?: DivisionId,
    emailOverride?: string
  ) {
    selectedOfficer = officerName;
    const foundOfficer = findOfficerByName(officerName);
    if (divisionId) {
      selectedDivision = divisionId;
    } else if (foundOfficer) {
      selectedDivision = foundOfficer.divisionId;
    }
    loginSelectedDivision = selectedDivision;

    try {
      localStorage.setItem(STORED_OFFICER_KEY, selectedOfficer);
      localStorage.setItem(STORED_DIVISION_KEY, selectedDivision);
    } catch (e) {}

    loginEmail =
      emailOverride ||
      foundOfficer?.email ||
      `${officerName.toLowerCase().replace(/\s+/g, ".")}@aetra.co.id`;
    loginPassword = "Password123!";
    loginLoading = true;
    loginError = "";
    loginNotice = `Menghubungkan ke ${DIVISIONS[selectedDivision]?.shortName || "Sistem"} sebagai ${officerName}...`;
    render();

    try {
      if (sb && sb.auth) {
        const { data, error } = await sb.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        });

        if (!error && data?.user) {
          authUser = data.user;
          isLoggedIn = true;
          matchOfficerToUser(authUser);
          loadData();
          render();
          return;
        }

        const { data: signUpData, error: signUpErr } = await sb.auth.signUp({
          email: loginEmail,
          password: loginPassword,
          options: {
            data: { officer_name: officerName, division_id: selectedDivision },
          },
        });

        if (!signUpErr && signUpData?.user) {
          authUser = signUpData.user;
          isLoggedIn = true;
          matchOfficerToUser(authUser);
          loadData();
          render();
          return;
        }

        // Session fallback
        authUser = {
          id: `officer-${Date.now().toString(36)}`,
          email: loginEmail,
          user_metadata: { officer_name: officerName, division_id: selectedDivision },
        };
        isLoggedIn = true;
        matchOfficerToUser(authUser);
        loadData();
        render();
      } else {
        authUser = {
          id: `officer-${Date.now().toString(36)}`,
          email: loginEmail,
          user_metadata: { officer_name: officerName, division_id: selectedDivision },
        };
        isLoggedIn = true;
        loadData();
        render();
      }
    } catch (e: any) {
      authUser = {
        id: `officer-${Date.now().toString(36)}`,
        email: loginEmail,
        user_metadata: { officer_name: officerName, division_id: selectedDivision },
      };
      isLoggedIn = true;
      loadData();
      render();
    } finally {
      loginLoading = false;
    }
  }

  async function handleLogout() {
    // @ts-ignore
    if ((window as any).Swal) {
      // @ts-ignore
      const res = await (window as any).Swal.fire({
        title: "Keluar Akun Petugas?",
        text: "Anda akan keluar dari sesi aplikasi HP Petugas dan kembali ke menu login divisi.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Ya, Keluar",
        cancelButtonText: "Batal",
        confirmButtonColor: "#EF4444",
      });
      if (!res.isConfirmed) return;
    }

    try {
      if (sb && sb.auth) {
        await sb.auth.signOut();
      }
    } catch (e) {
      console.warn("Logout error:", e);
    }

    authUser = null;
    isLoggedIn = false;
    loginPassword = "";
    loginError = "";
    loginNotice = "";
    render();
  }

  function renderLoginOverlay(): HTMLElement {
    const curDivMeta = DIVISIONS[loginSelectedDivision] || DIVISIONS.minor_repair;
    const currentDivisionOfficers = getOfficersForDivision(loginSelectedDivision);

    // Division Selector Tabs
    const divisionTabs = DIVISION_ORDER.map((divId) => {
      const meta = DIVISIONS[divId];
      const isSelected = loginSelectedDivision === divId;
      const count = getOfficersForDivision(divId).length;

      return el(
        "button",
        {
          type: "button",
          style: `display:inline-flex; align-items:center; gap:6px; padding:7px 11px; border-radius:10px; font-size:11.5px; font-weight:${
            isSelected ? "800" : "600"
          }; cursor:pointer; white-space:nowrap; transition:all 0.15s ease; border:${
            isSelected ? `2px solid ${meta.badgeColor}` : "1px solid #E2E8F0"
          }; background:${isSelected ? meta.badgeBg : "#FFFFFF"}; color:${
            isSelected ? meta.badgeColor : "#64748B"
          }; box-shadow:${isSelected ? "0 2px 8px rgba(0,0,0,0.06)" : "none"}; flex-shrink:0;`,
          onclick: () => {
            loginSelectedDivision = divId;
            selectedDivision = divId;
            const firstOff = getOfficersForDivision(divId)[0];
            if (firstOff) {
              selectedOfficer = firstOff.name;
              loginEmail = firstOff.email;
            }
            loginError = "";
            loginNotice = "";
            render();
          },
        },
        el("span", { style: "font-size:13px;" }, meta.icon),
        el("span", {}, meta.shortName),
        el(
          "span",
          {
            style: `font-size:9.5px; padding:1px 5px; border-radius:8px; background:${
              isSelected ? meta.badgeColor : "#F1F5F9"
            }; color:${isSelected ? "#FFFFFF" : "#64748B"}; font-weight:800;`,
          },
          String(count)
        )
      );
    });

    // Officer preset buttons for the active division
    const officerPresetButtons = currentDivisionOfficers.map((off) => {
      const isSelected = selectedOfficer === off.name;
      const color = off.avatarColor;
      const initials = off.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      return el(
        "button",
        {
          type: "button",
          style: `display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:12px; border:${
            isSelected ? `2px solid ${curDivMeta.badgeColor}` : "1.5px solid #E2E8F0"
          }; background:#FFFFFF; cursor:pointer; text-align:left; transition:all 0.15s ease; box-shadow:${
            isSelected ? `0 3px 10px rgba(0,0,0,0.08)` : "0 1px 3px rgba(0,0,0,0.02)"
          };`,
          onclick: () => {
            selectedOfficer = off.name;
            selectedDivision = off.divisionId;
            loginSelectedDivision = off.divisionId;
            loginEmail = off.email;
            handleQuickOfficerLogin(off.name, off.divisionId, off.email);
          },
        },
        el(
          "div",
          {
            style: `width:36px; height:36px; border-radius:50%; background:${color.main}; color:#FFF; font-weight:800; font-size:12.5px; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 2px 6px rgba(0,0,0,0.15);`,
          },
          initials
        ),
        el(
          "div",
          { style: "flex:1; min-width:0;" },
          el(
            "div",
            {
              style:
                "font-size:12.5px; font-weight:800; color:#1E293B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;",
            },
            off.name
          ),
          el(
            "div",
            {
              style:
                "font-size:10.5px; color:#64748B; font-weight:600; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;",
            },
            off.role
          ),
          el(
            "div",
            {
              style: `font-size:10px; color:${curDivMeta.badgeColor}; font-weight:800; margin-top:2px; display:flex; align-items:center; gap:3px;`,
            },
            el("span", {}, "⚡"),
            el("span", {}, "1-Klik Masuk")
          )
        )
      );
    });

    return el(
      "div",
      {
        class: "mobile-login-stage-wrapper",
        style:
          "min-height:100vh; min-height:100dvh; width:100%; display:flex; justify-content:center; align-items:flex-start; padding:0; background:linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 30%, #EDF4FA 100%); box-sizing:border-box; font-family:'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;",
      },
      el(
        "div",
        {
          style:
            "width:100%; max-width:440px; margin:0 auto; background:#FFFFFF; border:1px solid rgba(226, 232, 240, 0.85); border-radius:28px 28px 0 0; box-shadow:0 12px 40px rgba(2, 132, 199, 0.12), 0 2px 10px rgba(0, 0, 0, 0.04); padding:24px 18px 24px; box-sizing:border-box;",
        },
        // Top Brand Logo
        el(
          "div",
          { style: "text-align:center; margin-bottom:14px;" },
          el(
            "div",
            {
              style:
                "width:64px; height:64px; border-radius:18px; background:#FFFFFF; display:flex; align-items:center; justify-content:center; margin:0 auto 10px; box-shadow:0 8px 24px rgba(2, 132, 199, 0.2); border:1.5px solid #E2E8F0; padding:6px; box-sizing:border-box;",
            },
            el("img", {
              src: "/aetra-logo.svg",
              alt: "Aetra Air Tangerang",
              style: "width:100%; height:100%; object-fit:contain;",
            })
          ),
          el(
            "h2",
            {
              style:
                "margin:0 0 3px 0; font-size:20px; font-weight:900; color:#0369A1; letter-spacing:-0.3px;",
            },
            "AETRA AquaSync Mobile"
          ),
          el(
            "div",
            { style: "font-size:12px; font-weight:800; color:#1E293B;" },
            "Aplikasi Petugas Lapangan Multi-Divisi"
          ),
          el(
            "div",
            {
              style:
                "display:inline-flex; align-items:center; gap:5px; margin-top:6px; background:#ECFDF5; color:#047857; border:1px solid #A7F3D0; font-size:10.5px; font-weight:700; padding:3px 12px; border-radius:9999px;",
            },
            el("span", { style: "font-size:10.5px;" }, "🔒"),
            el("span", {}, "Otorisasi Khusus Petugas Aetra Air Tangerang")
          )
        ),

        // DIVISION SELECTOR MENU (Per-Divisi Tabs)
        el(
          "div",
          { style: "margin-bottom:14px;" },
          el(
            "div",
            {
              style:
                "display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.4px;",
            },
            el("span", {}, "🏢 PILIH DIVISI PENUGASAN:"),
            el(
              "span",
              { style: "color:#0284C7; font-weight:700; font-size:10.5px;" },
              curDivMeta.shortName
            )
          ),
          el(
            "div",
            {
              style:
                "display:flex; gap:6px; overflow-x:auto; padding-bottom:6px; scrollbar-width:none; -webkit-overflow-scrolling:touch;",
            },
            ...divisionTabs
          )
        ),

        // Active Division Info Card
        el(
          "div",
          {
            style: `margin-bottom:14px; padding:10px 12px; border-radius:12px; background:${curDivMeta.badgeBg}; border:1.5px solid ${curDivMeta.borderColor}; display:flex; align-items:center; gap:10px;`,
          },
          el(
            "div",
            {
              style: `width:36px; height:36px; border-radius:10px; background:${curDivMeta.badgeColor}; color:#FFF; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0;`,
            },
            curDivMeta.icon
          ),
          el(
            "div",
            { style: "flex:1; min-width:0;" },
            el(
              "div",
              {
                style: `font-size:12.5px; font-weight:800; color:${curDivMeta.badgeColor}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`,
              },
              curDivMeta.name
            ),
            el(
              "div",
              {
                style:
                  "font-size:10.5px; color:#475569; font-weight:500; margin-top:1px; line-height:1.3; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;",
              },
              curDivMeta.tagline
            )
          )
        ),

        // Quick Access Officer Grid for Active Division
        el(
          "div",
          { style: "margin-bottom:16px;" },
          el(
            "div",
            {
              style:
                "font-size:10.5px; font-weight:800; color:#64748B; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;",
            },
            el(
              "span",
              {},
              `⚡ PETUGAS ${curDivMeta.shortName.toUpperCase()} (${currentDivisionOfficers.length}):`
            ),
            el(
              "span",
              { style: "font-size:10.5px; color:#0284C7; font-weight:700;" },
              "KLIK UNTUK MASUK"
            )
          ),
          el(
            "div",
            { style: "display:grid; grid-template-columns:1fr; gap:7px;" },
            ...officerPresetButtons
          )
        ),

        // Divider
        el(
          "div",
          { style: "display:flex; align-items:center; gap:10px; margin:16px 0 14px;" },
          el("div", { style: "flex:1; height:1px; background:#E2E8F0;" }),
          el(
            "span",
            { style: "font-size:11px; color:#64748B; font-weight:600;" },
            "atau masuk dengan email & kata sandi"
          ),
          el("div", { style: "flex:1; height:1px; background:#E2E8F0;" })
        ),

        // Form
        el(
          "form",
          {
            onsubmit: handleLoginSubmit,
            style: "display:flex; flex-direction:column; gap:11px;",
          },
          loginError
            ? el(
                "div",
                {
                  style:
                    "background:#FEF2F2; border:1px solid #FECACA; color:#DC2626; border-radius:10px; padding:10px 12px; font-size:11.5px; line-height:1.4; display:flex; align-items:flex-start; gap:8px;",
                },
                el("span", { style: "font-size:14px;" }, "⚠️"),
                el("div", { style: "flex:1;" }, loginError)
              )
            : null,
          loginNotice
            ? el(
                "div",
                {
                  style:
                    "background:#EFF6FF; border:1px solid #BFDBFE; color:#1E40AF; border-radius:10px; padding:10px 12px; font-size:11.5px; line-height:1.4; display:flex; align-items:flex-start; gap:8px;",
                },
                el("span", { style: "font-size:14px;" }, "ℹ️"),
                el("div", { style: "flex:1;" }, loginNotice)
              )
            : null,

          // Email Input
          el(
            "div",
            {},
            el(
              "label",
              {
                style:
                  "display:block; font-size:11.5px; font-weight:800; color:#1E293B; margin-bottom:5px;",
              },
              `Email Petugas (${curDivMeta.shortName}):`
            ),
            el(
              "div",
              { style: "position:relative;" },
              el("input", {
                type: "email",
                required: "true",
                value: loginEmail,
                placeholder: "email.petugas@aetra.co.id",
                style:
                  "width:100%; box-sizing:border-box; padding:10px 12px 10px 38px; border-radius:10px; border:1px solid #E2E8F0; font-size:12px; background:#F1F5F9; color:#1E293B; font-weight:600; font-family:inherit; outline:none;",
                oninput: (e: any) => {
                  loginEmail = e.target.value;
                },
              }),
              el(
                "span",
                {
                  style:
                    "position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:14px; opacity:0.6; pointer-events:none;",
                },
                "✉️"
              )
            )
          ),

          // Password Input
          el(
            "div",
            {},
            el(
              "label",
              {
                style:
                  "display:block; font-size:11.5px; font-weight:800; color:#1E293B; margin-bottom:5px;",
              },
              "Kata Sandi:"
            ),
            el(
              "div",
              { style: "position:relative;" },
              el("input", {
                type: showPassword ? "text" : "password",
                required: "true",
                value: loginPassword,
                placeholder: "Masukkan kata sandi...",
                style:
                  "width:100%; box-sizing:border-box; padding:10px 38px 10px 38px; border-radius:10px; border:1px solid #E2E8F0; font-size:12px; background:#F1F5F9; color:#1E293B; font-family:inherit; outline:none;",
                oninput: (e: any) => {
                  loginPassword = e.target.value;
                },
              }),
              el(
                "span",
                {
                  style:
                    "position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:14px; opacity:0.6; pointer-events:none;",
                },
                "🔒"
              ),
              el(
                "button",
                {
                  type: "button",
                  style:
                    "position:absolute; right:10px; top:50%; transform:translateY(-50%); background:transparent; border:none; cursor:pointer; font-size:14px; padding:2px; opacity:0.7;",
                  title: showPassword ? "Sembunyikan Kata Sandi" : "Tampilkan Kata Sandi",
                  onclick: () => {
                    showPassword = !showPassword;
                    render();
                  },
                },
                showPassword ? "🙈" : "👁"
              )
            )
          ),

          // Submit Button
          el(
            "button",
            {
              type: "submit",
              disabled: loginLoading ? "true" : undefined,
              style: `width:100%; margin-top:12px; padding:12px; border:none; border-radius:12px; background:${curDivMeta.gradient}; color:#FFFFFF; font-weight:800; font-size:13.5px; cursor:${
                loginLoading ? "not-allowed" : "pointer"
              }; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 14px rgba(2, 132, 199, 0.35);`,
            },
            loginLoading
              ? el("span", {}, "⏳ Memverifikasi Otentikasi...")
              : el(
                  "span",
                  {},
                  isSignUpMode
                    ? "📝 Daftarkan Akun Petugas Baru"
                    : `🔓 Masuk Antrean ${curDivMeta.shortName} ➔`
                )
          ),

          // Mode toggle link
          el(
            "div",
            { style: "text-align:center; margin-top:6px;" },
            el(
              "button",
              {
                type: "button",
                style:
                  "background:none; border:none; color:#0284C7; font-size:11.5px; font-weight:700; cursor:pointer; text-decoration:underline;",
                onclick: () => {
                  isSignUpMode = !isSignUpMode;
                  loginError = "";
                  loginNotice = "";
                  render();
                },
              },
              isSignUpMode
                ? "Sudah memiliki akun? Masuk di sini"
                : "Belum punya akun? Buat akun baru"
            )
          )
        ),

        // Footnote
        el(
          "div",
          {
            style:
              "margin-top:18px; padding-top:12px; border-top:1px solid #E2E8F0; text-align:center; line-height:1.45;",
          },
          el(
            "div",
            { style: "font-size:11px; font-weight:800; color:#1E293B;" },
            "PT Aetra Air Tangerang"
          ),
          el(
            "div",
            { style: "font-size:10px; color:#64748B; font-weight:500; margin-top:2px;" },
            `Portal Resmi Petugas Lapangan ${curDivMeta.name} • Siaga 24 Jam`
          )
        )
      )
    );
  }

  function saveLocal() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(complaints));
    } catch (e) {
      console.warn("Storage save error", e);
    }
  }

  function loadLocal(): ComplaintItem[] {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function generateCaseIdFromId(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
    }
    const absHash = Math.abs(hash);
    return "100" + String(absHash).padStart(7, "0").slice(-7);
  }

  async function loadData() {
    syncStatus = "syncing";
    render();
    try {
      if (sb) {
        const { data, error } = await sb
          .from(TABLE)
          .select("*")
          .order("receivedAt", { ascending: false });
        if (!error && Array.isArray(data) && data.length > 0) {
          complaints = data.map((item: any) => {
            if (!item.caseId) {
              item.caseId = generateCaseIdFromId(item.id);
            }
            if (!item.targetDivision) {
              item.targetDivision = getRecommendedDivision(item.category);
            }
            return item;
          });
          saveLocal();
          syncStatus = "synced";
          lastSyncTime = new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          });
          render();
          return;
        }
      }
    } catch (e) {
      console.warn("Supabase fetch fallback to local:", e);
    }

    // Load from Unified Ticket Service (contains seed data across all 5 divisions)
    const unified = loadAllUnifiedTickets();
    if (unified && unified.length > 0) {
      complaints = unified.map((item: any) => {
        if (!item.caseId) item.caseId = generateCaseIdFromId(item.id);
        if (!item.targetDivision) item.targetDivision = getRecommendedDivision(item.category);
        return item;
      });
      saveLocal();
      syncStatus = "synced";
    } else {
      const local = loadLocal();
      if (local.length > 0) {
        complaints = local.map((item: any) => {
          if (!item.caseId) item.caseId = generateCaseIdFromId(item.id);
          if (!item.targetDivision) item.targetDivision = getRecommendedDivision(item.category);
          return item;
        });
        saveLocal();
        syncStatus = "synced";
      }
    }

    lastSyncTime = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    render();
  }

  async function updateComplaint(updated: ComplaintItem) {
    if (!updated.targetDivision) {
      updated.targetDivision = getRecommendedDivision(updated.category);
    }
    const idx = complaints.findIndex((c) => c.id === updated.id);
    if (idx !== -1) {
      complaints[idx] = updated;
    } else {
      complaints.unshift(updated);
    }
    saveLocal();
    await saveSingleTicket(updated as any);
    render();
  }

  function handleSwitchOfficer(newOfficer: string) {
    selectedOfficer = newOfficer;
    const found = findOfficerByName(newOfficer);
    if (found) {
      selectedDivision = found.divisionId;
      loginSelectedDivision = found.divisionId;
    }
    try {
      localStorage.setItem(STORED_OFFICER_KEY, newOfficer);
      localStorage.setItem(STORED_DIVISION_KEY, selectedDivision);
    } catch (e) {}
    setupFCMForOfficer(newOfficer);
    render();
  }

  function handleSwitchDivision(newDivision: DivisionId) {
    selectedDivision = newDivision;
    loginSelectedDivision = newDivision;
    const offList = getOfficersForDivision(newDivision);
    if (offList.length > 0) {
      selectedOfficer = offList[0].name;
      loginEmail = offList[0].email;
      setupFCMForOfficer(selectedOfficer);
    }
    try {
      localStorage.setItem(STORED_DIVISION_KEY, selectedDivision);
      localStorage.setItem(STORED_OFFICER_KEY, selectedOfficer);
    } catch (e) {}
    switchDivisionModalOpen = false;
    render();

    // @ts-ignore
    if ((window as any).Swal) {
      // @ts-ignore
      (window as any).Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: `Divisi Aktif: ${DIVISIONS[newDivision].name}`,
        showConfirmButton: false,
        timer: 1600,
      });
    }
  }

  function openTransferModal(ticket: ComplaintItem) {
    transferTargetId = ticket.id;
    const curDiv = ticket.targetDivision || selectedDivision;
    const otherDivs = DIVISION_ORDER.filter((d) => d !== curDiv);
    transferDestinationDivision = otherDivs[0] || "sales_support";
    // Smart prefill reason preset based on destination
    const defaultPreset = TRANSFER_REASON_PRESETS.find(
      (p) => p.recommendedDivision === transferDestinationDivision
    );
    transferReason = defaultPreset ? defaultPreset.defaultText : "";
    transferUrgent = ticket.urgent || false;
    transferLoading = false;
    transferModalOpen = true;
    render();
  }

  async function submitTransferWorkOrder() {
    if (!transferTargetId) return;
    const ticket = complaints.find((c) => c.id === transferTargetId);
    if (!ticket) return;

    const fromDivision = ticket.targetDivision || selectedDivision;
    const fromMeta = DIVISIONS[fromDivision] || DIVISIONS.minor_repair;
    const toMeta = DIVISIONS[transferDestinationDivision] || DIVISIONS.sales_support;

    const effectiveReason =
      transferReason.trim() ||
      `Pekerjaan dialihkan dari ${fromMeta.name} ke ${toMeta.name} untuk tindak lanjut operasional lapangan.`;

    transferLoading = true;
    render();

    // Update ticket fields
    ticket.targetDivision = transferDestinationDivision;
    ticket.distributionStatus = "distributed";
    ticket.distributedAt = new Date().toISOString();
    ticket.distributedBy = `${selectedOfficer} (${fromMeta.shortName})`;
    ticket.distributionNotes = effectiveReason;
    if (transferUrgent) {
      ticket.urgent = true;
    }

    // Reset officer assignment so destination division takes over
    const destOfficers = getOfficersForDivision(transferDestinationDivision);
    ticket.officer = destOfficers[0]?.name;
    ticket.divisionAssignee = destOfficers[0]?.name || toMeta.defaultAdminName;

    // Record inter-department audit comment
    if (!ticket.comments) ticket.comments = [];
    ticket.comments.push({
      id: `cmt-${Date.now().toString().slice(-6)}`,
      authorName: selectedOfficer,
      authorDivision: fromDivision,
      authorRole: "Petugas Lapangan",
      targetDepartment: toMeta.name,
      content: `[PENGALIHAN DIVISI] Pengerjaan dialihkan dari ${fromMeta.name} ke ${toMeta.name}. Alasan: ${effectiveReason}`,
      createdAt: new Date().toISOString(),
    });

    await updateComplaint(ticket);

    // Broadcast Realtime Notification to Admin Dashboard
    publishWorkOrderNotification({
      ticketId: ticket.id,
      caseId: ticket.caseId,
      customer: ticket.customer,
      address: ticket.address,
      officerName: selectedOfficer,
      officerDivision: fromDivision,
      previousDivision: fromDivision,
      targetDivision: transferDestinationDivision,
      oldStatus: ticket.status,
      newStatus: "baru",
      actionType: "division_transferred",
      summary: `Pekerjaan dialihkan dari ${fromMeta.shortName} ke ${toMeta.name}.`,
      details: effectiveReason,
      transferReason: effectiveReason,
      urgent: ticket.urgent,
    });

    transferLoading = false;
    transferModalOpen = false;
    // CRITICAL: Re-render immediately so modal closes and ticket leaves the current queue
    render();

    // @ts-ignore
    if ((window as any).Swal) {
      // @ts-ignore
      (window as any).Swal.fire({
        icon: "success",
        title: "Pekerjaan Berhasil Dipindahkan! 🔄",
        html: `
          <div style="font-size:12.5px; color:#334155; line-height:1.45; text-align:left;">
            Work Order <b>${ticket.id}</b> telah dialihkan pengerjaannya dari <b>${fromMeta.shortName}</b> ke <b>${toMeta.name}</b>.<br/><br/>
            📌 <b>Alasan:</b> <em>"${effectiveReason}"</em><br/><br/>
            Tiket langsung masuk ke antrean kerja divisi tujuan dan tersinkron ke dashboard pengawas.
          </div>
        `,
        confirmButtonText: "Selesai",
        confirmButtonColor: toMeta.badgeColor,
      }).then(() => {
        render();
      });
    }
  }

  function handleStartWork(ticket: ComplaintItem) {
    ticket.status = "proses";
    updateComplaint(ticket);

    // Broadcast Realtime Notification to Admin Dashboard
    publishWorkOrderNotification({
      ticketId: ticket.id,
      caseId: ticket.caseId,
      customer: ticket.customer,
      address: ticket.address,
      officerName: selectedOfficer,
      officerDivision: selectedDivision,
      targetDivision: (ticket.targetDivision as DivisionId) || selectedDivision,
      oldStatus: "baru",
      newStatus: "proses",
      actionType: "work_started",
      summary: `Petugas ${selectedOfficer} telah tiba dan mulai mengerjakan WO ${ticket.id}.`,
      details: `Kategori: ${ticket.category} • Lokasi: ${ticket.address || ticket.area}`,
      urgent: ticket.urgent,
    });

    // @ts-ignore
    if ((window as any).Swal) {
      // @ts-ignore
      (window as any).Swal.fire({
        icon: "success",
        title: "Pekerjaan Dimulai",
        text: `WO ${ticket.id} (${ticket.customer}) sekarang berstatus 'Sedang Dikerjakan'. Data tersinkron ke dashboard pengawas.`,
        timer: 1800,
        showConfirmButton: false,
      });
    }
  }

  function openFinishModal(ticket: ComplaintItem) {
    finishTargetId = ticket.id;
    finishPhotoBefore = ticket.photoBefore || null;
    finishPhotoAfter = ticket.photoAfter || null;
    finishActionNotes = ticket.completionNotes || "";
    finishMaterials = ticket.usedMaterials ? [...ticket.usedMaterials] : [];
    finishMaterialQuantities = {};
    if (ticket.usedMaterials && ticket.usedMaterials.length > 0) {
      ticket.usedMaterials.forEach((raw) => {
        const parsed = parseMaterialString(raw);
        if (parsed && parsed.name) {
          finishMaterialQuantities[parsed.name] = parsed.qty;
        }
      });
    }
    finishMaterialFilter = "";
    finishCustomerSignature = ticket.customerSignature || null;
    finishCustomerSignerName = ticket.customerSignerName || ticket.customer || "";
    finishModalOpen = true;
    render();
  }

  function submitFinishReport() {
    if (!finishTargetId) return;
    const ticket = complaints.find((c) => c.id === finishTargetId);
    if (!ticket) return;

    // Convert finishMaterialQuantities to formatted usedMaterials array
    const entries = Object.entries(finishMaterialQuantities)
      .filter(([_, qty]) => typeof qty === "number" && qty > 0)
      .map(([name, qty]) => {
        const sp = findSparepart(name);
        return {
          name,
          qty,
          unit: sp ? sp.unit : "pcs",
        };
      });
    finishMaterials = serializeUsedMaterials(entries);

    ticket.status = "selesai";
    ticket.completedAt = new Date().toISOString();
    ticket.completionNotes = finishActionNotes.trim() || "Perbaikan telah selesai dilaksanakan di lokasi.";
    ticket.photoBefore = finishPhotoBefore || undefined;
    ticket.photoAfter = finishPhotoAfter || undefined;
    ticket.usedMaterials = finishMaterials;
    ticket.customerSignature = finishCustomerSignature || undefined;
    ticket.customerSignerName = finishCustomerSignerName || ticket.customer;

    updateComplaint(ticket);

    // Broadcast Realtime Notification to Admin Dashboard
    publishWorkOrderNotification({
      ticketId: ticket.id,
      caseId: ticket.caseId,
      customer: ticket.customer,
      address: ticket.address,
      officerName: selectedOfficer,
      officerDivision: selectedDivision,
      targetDivision: (ticket.targetDivision as DivisionId) || selectedDivision,
      oldStatus: "proses",
      newStatus: "selesai",
      actionType: "work_completed",
      summary: `Petugas ${selectedOfficer} telah menyelesaikan perbaikan WO ${ticket.id}.`,
      details: finishActionNotes.trim() || "Perbaikan tuntas dan Berita Acara (BAST) telah diterbitkan.",
      materials: finishMaterials,
      signatureRecorded: Boolean(finishCustomerSignature),
      urgent: ticket.urgent,
    });

    finishModalOpen = false;

    // Automatically trigger Customer WhatsApp notification prompt
    promptAutomaticCustomerCompletionWhatsApp(ticket as any, {
      title: "🎉 WO Selesai! Kirim Notifikasi WA ke Pelanggan",
      onClosed: () => {
        // @ts-ignore
        if ((window as any).Swal) {
          // @ts-ignore
          (window as any).Swal.fire({
            icon: "success",
            title: "Work Order Selesai! 🎉",
            html: `
              <div style="font-size:12.5px; color:#334155; margin-bottom:12px; line-height:1.45;">
                Laporan WO <b>${ticket.id}</b> berhasil diselesaikan.<br/>
                Ingin melihat Berita Acara (BAST), mengunduh PDF, atau menyimpannya langsung ke Google Drive?
              </div>
            `,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonText: "📄 Lihat & Unduh PDF",
            denyButtonText: "☁️ Simpan ke Drive",
            cancelButtonText: "Tutup",
            confirmButtonColor: "#0284C7",
            denyButtonColor: "#10B981",
          }).then((res: any) => {
            if (res.isConfirmed || res.isDenied) {
              openReportPreviewModal({
                item: ticket as any,
                onUpdateItem: (upd) => updateComplaint(upd as any),
              });
            }
          });
        }
      },
    });
  }

  // Watermark GPS Helper for Field Photos
  function stampGpsCoordinatesOnPhoto(
    base64Data: string,
    coords: string,
    label: string,
    officerName: string,
    callback: (stamped: string) => void
  ) {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          callback(base64Data);
          return;
        }

        ctx.drawImage(img, 0, 0);

        // Semi-transparent dark ribbon at bottom
        const ribbonHeight = Math.max(54, Math.round(canvas.height * 0.135));
        ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
        ctx.fillRect(0, canvas.height - ribbonHeight, canvas.width, ribbonHeight);

        // Accent strip
        ctx.fillStyle = label.includes("BEFORE") ? "#EF4444" : "#10B981";
        ctx.fillRect(0, canvas.height - ribbonHeight, canvas.width, Math.max(4, Math.round(ribbonHeight * 0.05)));

        const fontBase = Math.max(11, Math.round(ribbonHeight * 0.22));
        ctx.font = `bold ${fontBase}px 'Plus Jakarta Sans', system-ui, sans-serif`;

        // Badge [ BEFORE / AFTER ]
        ctx.fillStyle = label.includes("BEFORE") ? "#F87171" : "#4ADE80";
        ctx.fillText(`[ ${label} ]`, 14, canvas.height - ribbonHeight + fontBase + 5);

        // GPS Coordinates (Prominent Yellow)
        ctx.fillStyle = "#FDE047";
        ctx.fillText(`📍 KOORDINAT GPS: ${coords}`, 14, canvas.height - ribbonHeight + fontBase * 2 + 8);

        // Watermark Footer (Aetra + Time)
        const timeStr = new Date().toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        ctx.font = `normal ${Math.max(9.5, Math.round(ribbonHeight * 0.17))}px 'Plus Jakarta Sans', system-ui, sans-serif`;
        ctx.fillStyle = "#E2E8F0";
        ctx.fillText(`PT AETRA AIR TANGERANG • Petugas: ${officerName} • ${timeStr}`, 14, canvas.height - 8);

        callback(canvas.toDataURL("image/jpeg", 0.9));
      } catch (err) {
        console.warn("Watermark stamping error, using raw image:", err);
        callback(base64Data);
      }
    };
    img.onerror = () => callback(base64Data);
    img.src = base64Data;
  }

  // File Upload Helper with Automatic Watermarking & Supabase Storage Upload
  async function handlePhotoUpload(e: any, isBefore: boolean) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const targetTicket = complaints.find((c) => c.id === finishTargetId);
    let targetCoords = (targetTicket && targetTicket.coords) || "-6.2235, 106.5184";
    const photoType = isBefore ? "BEFORE" : "AFTER";

    // Show quick loading state or feedback
    const toast = document.createElement("div");
    toast.style.cssText =
      "position:fixed; bottom:75px; left:50%; transform:translateX(-50%); background:#0F172A; color:#FFFFFF; padding:8px 16px; border-radius:20px; font-size:11.5px; font-weight:700; z-index:999999; box-shadow:0 4px 16px rgba(0,0,0,0.3); border:1px solid #334155; display:flex; align-items:center; gap:8px;";
    toast.innerHTML = `<span>⏳</span> <span>Menerapkan Watermark (GPS, ID, Waktu) & Mengunggah ke Supabase...</span>`;
    document.body.appendChild(toast);

    const executeProcessing = async (liveCoords: string) => {
      try {
        const { watermarkedDataUrl, uploadResult } = await processPhotoWithWatermarkAndSupabase(file, {
          workOrderId: (targetTicket && targetTicket.id) || "WO-FIELD",
          caseId: targetTicket && targetTicket.caseId,
          photoType,
          technicianName: selectedOfficer,
          coords: liveCoords,
          divisionKey: selectedDivision,
        });

        if (isBefore) {
          finishPhotoBefore = watermarkedDataUrl;
          if (targetTicket) (targetTicket as any).photoBeforeStorageUrl = uploadResult.publicUrl;
        } else {
          finishPhotoAfter = watermarkedDataUrl;
          if (targetTicket) (targetTicket as any).photoAfterStorageUrl = uploadResult.publicUrl;
        }

        if (targetTicket) {
          targetTicket.coords = liveCoords;
          updateComplaint(targetTicket);
        }

        toast.style.background = "#065F46";
        toast.style.borderColor = "#10B981";
        toast.innerHTML = `<span>✅</span> <span>Foto ter-watermark & tersimpan di Supabase Storage!</span>`;
        setTimeout(() => toast.remove(), 2200);

        render();
      } catch (err) {
        console.error("Failed to watermark and upload photo:", err);
        toast.remove();
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const liveCoords = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
          executeProcessing(liveCoords);
        },
        () => {
          executeProcessing(targetCoords);
        },
        { enableHighAccuracy: true, timeout: 3500 }
      );
    } else {
      executeProcessing(targetCoords);
    }
  }

  // Listen to cross-tab storage changes (from desktop dashboard)
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === LOCAL_STORAGE_KEY ||
      e.key === "aetra_work_orders_backup" ||
      e.key === "aetra_latest_wo_notification_event"
    ) {
      loadData();
    }
  };
  window.addEventListener("storage", onStorage);

  // Natural Mobile App Shell (Clean, responsive layout for actual field worker smartphone)
  function wrapInNaturalMobileShell(
    screenContent: HTMLElement,
    extraModals: (HTMLElement | null | undefined)[] = []
  ): HTMLElement {
    return el(
      "div",
      { class: "natural-mobile-wrapper" },
      el(
        "div",
        { class: "natural-mobile-app-shell" },
        screenContent,
        ...extraModals.filter(Boolean)
      )
    );
  }

  function render() {
    if (isDisposed) return;
    container.innerHTML = "";

    const curDivMeta = DIVISIONS[selectedDivision] || DIVISIONS.minor_repair;
    const currentDivisionOfficers = getOfficersForDivision(selectedDivision);
    const currentOfficerInfo = findOfficerByName(selectedOfficer);

    // 1. Division Tickets (All tickets for this division)
    const divisionTickets = complaints.filter(
      (c) => (c.targetDivision || getRecommendedDivision(c.category)) === selectedDivision
    );

    // 2. Officer Tickets (Assigned directly to selectedOfficer)
    const officerTickets = divisionTickets.filter(
      (c) =>
        c.officer === selectedOfficer ||
        c.divisionAssignee?.toLowerCase().includes(selectedOfficer.toLowerCase().split(" ")[0])
    );

    // 3. Work Orders Scheduled / Targeted for Today
    const todayTickets = (
      activeScope === "division_all"
        ? divisionTickets
        : officerTickets.length > 0
        ? officerTickets
        : divisionTickets
    ).filter((c) => {
      if (c.status !== "selesai") return true;
      if (c.completedAt) {
        const compDate = new Date(c.completedAt).toDateString();
        const nowDate = new Date().toDateString();
        return compDate === nowDate;
      }
      return true;
    });

    const todayDone = todayTickets.filter((c) => c.status === "selesai");
    const todayProses = todayTickets.filter((c) => c.status === "proses");
    const todayPending = todayTickets.filter((c) => c.status === "baru");
    const todayUrgent = todayTickets.filter((c) => c.urgent && c.status !== "selesai");
    const todayCompletionRate =
      todayTickets.length > 0
        ? Math.round((todayDone.length / todayTickets.length) * 100)
        : 0;

    // Scope selection: today / my_tickets / division_all
    let scopeBaseTickets: ComplaintItem[] = [];
    if (activeScope === "today") {
      scopeBaseTickets = todayTickets;
    } else if (activeScope === "my_tickets") {
      scopeBaseTickets = officerTickets.length > 0 ? officerTickets : divisionTickets;
    } else {
      scopeBaseTickets = divisionTickets;
    }

    const activeTickets = scopeBaseTickets.filter((c) => c.status !== "selesai");
    const prosesTickets = scopeBaseTickets.filter((c) => c.status === "proses");
    const selesaiTickets = scopeBaseTickets.filter((c) => c.status === "selesai");
    const urgentTickets = scopeBaseTickets.filter((c) => c.urgent && c.status !== "selesai");
    const completionRate =
      scopeBaseTickets.length > 0
        ? Math.round((selesaiTickets.length / scopeBaseTickets.length) * 100)
        : 0;

    const officerColor = getOfficerColor(selectedOfficer);
    const initials = selectedOfficer
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    // Filtered Tickets by status
    let filtered = scopeBaseTickets;
    if (filterStatus === "urgent") {
      filtered = scopeBaseTickets.filter((c) => c.urgent && c.status !== "selesai");
    } else if (filterStatus === "proses") {
      filtered = scopeBaseTickets.filter((c) => c.status === "proses");
    } else if (filterStatus === "selesai") {
      filtered = scopeBaseTickets.filter((c) => c.status === "selesai");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((c) => {
        const cat = getCatInfo(c.category);
        return (
          c.id.toLowerCase().includes(q) ||
          (c.caseId && c.caseId.toLowerCase().includes(q)) ||
          c.customer.toLowerCase().includes(q) ||
          (c.meterId && c.meterId.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          (c.area && c.area.toLowerCase().includes(q)) ||
          (c.desc && c.desc.toLowerCase().includes(q)) ||
          cat.label.toLowerCase().includes(q)
        );
      });
    }

    if (isCheckingSession) {
      const loadingScreen = el(
        "div",
        {
          class: "mobile-native-app-root",
          style:
            "display:flex; flex-direction:column; min-height:75vh; background:var(--bg);",
        },
        el(
          "div",
          {
            style:
              "flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px; text-align:center; gap:12px;",
          },
          el("div", {
            style:
              "width:42px; height:42px; border-radius:50%; border:3px solid #BFDBFE; border-top-color:#0284C7; animation:spin 1s linear infinite;",
          }),
          el("div", { style: "font-size:14px; font-weight:800; color:#0369A1;" }, "AETRA Mobile Field App"),
          el("div", { style: "font-size:11.5px; color:var(--ink-soft);" }, "Memeriksa status otentikasi Supabase...")
        )
      );
      container.appendChild(wrapInNaturalMobileShell(loadingScreen));
      return;
    }

    if (!isLoggedIn) {
      const loginOverlay = renderLoginOverlay();
      container.appendChild(loginOverlay);
      return;
    }

    // App Header Bar with Division Switcher Badge
    const headerBar = el(
      "header",
      { class: "mobile-native-header" },
      el(
        "div",
        { class: "mobile-native-brand" },
        el(
          "div",
          {
            style:
              "width:34px; height:34px; border-radius:8px; background:#FFFFFF; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 4px rgba(0,0,0,0.15); padding:3px; box-sizing:border-box;",
          },
          el("img", {
            src: "/aetra-logo.svg",
            alt: "Aetra",
            style: "width:100%; height:100%; object-fit:contain;",
          })
        ),
        el(
          "div",
          {},
          el("h1", {}, "AETRA AquaSync"),
          el("span", {}, "Aplikasi Petugas Lapangan")
        )
      ),
      el(
        "div",
        { style: "display:flex; align-items:center; gap:6px;" },
        // Division pill button in top bar
        el(
          "button",
          {
            type: "button",
            style: `display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.4); background:rgba(255,255,255,0.22); color:#FFFFFF; font-size:11px; font-weight:800; cursor:pointer;`,
            title: `Beralih Divisi Pengerjaan (Saat ini: ${curDivMeta.shortName})`,
            onclick: () => {
              switchDivisionModalOpen = true;
              render();
            },
          },
          el("span", {}, curDivMeta.icon),
          el("span", {}, curDivMeta.shortName),
          el("span", { style: "font-size:9px; opacity:0.8;" }, "▾")
        ),
        el(
          "button",
          {
            class: "btn-secondary",
            style:
              "padding:4px 7px; font-size:11px; background:rgba(255,255,255,0.2); color:#FFFFFF; border:none; border-radius:6px; cursor:pointer;",
            title: "Sinkronkan Data Tiket",
            onclick: loadData,
          },
          syncStatus === "syncing" ? "⏳" : "🔄"
        ),
        el(
          "button",
          {
            class: "btn-secondary",
            style:
              "padding:4px 8px; font-size:11px; font-weight:700; background:#DC2626; color:#FFFFFF; border:none; border-radius:6px; cursor:pointer;",
            title: "Keluar Akun",
            onclick: handleLogout,
          },
          "🚪"
        )
      )
    );

    // Officer Info Banner
    const officerBanner = el(
      "div",
      { class: "mobile-native-officer-card" },
      el(
        "div",
        { style: "display:flex; align-items:center; gap:10px;" },
        el(
          "div",
          {
            style: `width:42px; height:42px; border-radius:50%; background:${officerColor.main}; color:#FFF; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:15px; box-shadow:0 2px 6px rgba(0,0,0,0.15); flex-shrink:0;`,
          },
          initials
        ),
        el(
          "div",
          { style: "flex:1; min-width:0;" },
          el(
            "div",
            { style: "display:flex; align-items:center; gap:6px; flex-wrap:wrap;" },
            el(
              "select",
              {
                class: "mobile-native-officer-select",
                onchange: (e: any) => handleSwitchOfficer(e.target.value),
              },
              ...currentDivisionOfficers.map((off) =>
                el(
                  "option",
                  { value: off.name, selected: off.name === selectedOfficer },
                  `👷 ${off.name} (${off.role})`
                )
              )
            )
          ),
          el(
            "div",
            {
              style:
                "display:flex; align-items:center; justify-content:space-between; margin-top:3px; gap:6px;",
            },
            el(
              "div",
              {
                style: `display:inline-flex; align-items:center; gap:4px; font-size:10.5px; font-weight:800; color:${curDivMeta.badgeColor};`,
              },
              el("span", {}, curDivMeta.icon),
              el("span", {}, curDivMeta.name)
            ),
            el(
              "button",
              {
                type: "button",
                style: `background:${curDivMeta.badgeBg}; border:1px solid ${curDivMeta.borderColor}; color:${curDivMeta.badgeColor}; font-size:10px; font-weight:800; padding:2px 7px; border-radius:6px; cursor:pointer;`,
                onclick: () => {
                  switchDivisionModalOpen = true;
                  render();
                },
              },
              "Ganti Divisi ➔"
            )
          )
        )
      )
    );

    // DAILY WORK ORDER INFO BANNER (INFO TICKETING WO HARI INI)
    const todayDateStr = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Spotlight on the highest priority task for today
    const nextPriorityTask = todayTickets.find(
      (c) => c.status !== "selesai" && (c.urgent || c.status === "proses")
    ) || todayTickets.find((c) => c.status === "baru");

    const dailyWoBanner = el(
      "div",
      {
        class: "mobile-daily-wo-banner",
        style:
          "background:linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%); border:1.5px solid #CBD5E1; border-radius:14px; padding:12px 14px; box-shadow:0 3px 12px rgba(15, 23, 42, 0.05); display:flex; flex-direction:column; gap:10px;",
      },
      // Header: Date & Shift Info
      el(
        "div",
        {
          style:
            "display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;",
        },
        el(
          "div",
          { style: "display:flex; align-items:center; gap:6px;" },
          el(
            "span",
            {
              style:
                "background:#EFF6FF; border:1px solid #BFDBFE; color:#1D4ED8; font-size:11px; font-weight:800; padding:2px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px;",
            },
            el("span", {}, "📅"),
            el("span", {}, todayDateStr)
          )
        ),
        el(
          "div",
          {
            style:
              "font-size:10px; font-weight:800; color:#047857; background:#ECFDF5; border:1px solid #A7F3D0; padding:2px 8px; border-radius:6px;",
          },
          "⚡ Shift Pagi (08:00 - 17:00 WIB)"
        )
      ),

      // Daily Progress & Quota Tracker
      el(
        "div",
        {},
        el(
          "div",
          {
            style:
              "display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:11.5px; font-weight:800; color:#1E293B;",
          },
          el(
            "span",
            { style: "display:flex; align-items:center; gap:5px;" },
            el("span", {}, "📋"),
            el("span", {}, "Target Pengerjaan Hari Ini:")
          ),
          el(
            "span",
            { style: "color:#0284C7;" },
            `${todayDone.length} / ${todayTickets.length} WO Selesai (${todayCompletionRate}%)`
          )
        ),
        // Progress Track
        el(
          "div",
          {
            style:
              "width:100%; height:8px; background:#E2E8F0; border-radius:9999px; overflow:hidden;",
          },
          el("div", {
            style: `width:${todayCompletionRate}%; height:100%; background:linear-gradient(90deg, #0284C7 0%, #10B981 100%); border-radius:9999px; transition:width 0.3s ease;`,
          })
        )
      ),

      // Mini Stats Row for Today
      el(
        "div",
        {
          style: "display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; text-align:center;",
        },
        el(
          "div",
          {
            style:
              "background:#F8FAFC; border:1px solid #E2E8F0; padding:6px 4px; border-radius:8px;",
          },
          el(
            "div",
            { style: "font-size:15px; font-weight:900; color:#1E293B;" },
            String(todayTickets.length)
          ),
          el("div", { style: "font-size:9.5px; color:#64748B; font-weight:700;" }, "Total WO")
        ),
        el(
          "div",
          {
            style:
              "background:#FFFBEB; border:1px solid #FDE68A; padding:6px 4px; border-radius:8px;",
          },
          el(
            "div",
            { style: "font-size:15px; font-weight:900; color:#D97706;" },
            String(todayPending.length)
          ),
          el("div", { style: "font-size:9.5px; color:#B45309; font-weight:700;" }, "⏳ Menunggu")
        ),
        el(
          "div",
          {
            style:
              "background:#EFF6FF; border:1px solid #BFDBFE; padding:6px 4px; border-radius:8px;",
          },
          el(
            "div",
            { style: "font-size:15px; font-weight:900; color:#2563EB;" },
            String(todayProses.length)
          ),
          el("div", { style: "font-size:9.5px; color:#1D4ED8; font-weight:700;" }, "▶ Diproses")
        ),
        el(
          "div",
          {
            style:
              "background:#ECFDF5; border:1px solid #A7F3D0; padding:6px 4px; border-radius:8px;",
          },
          el(
            "div",
            { style: "font-size:15px; font-weight:900; color:#059669;" },
            String(todayDone.length)
          ),
          el("div", { style: "font-size:9.5px; color:#047857; font-weight:700;" }, "✅ Selesai")
        )
      ),

      // SLA Alert Banner jika terdapat Work Order yang melebihi batas waktu
      (() => {
        const activeOverdue = scopeBaseTickets.filter(
          (t) => t.status !== "selesai" && calculateTicketSLA(t).isOverdue
        );
        if (activeOverdue.length === 0) return el("span", { style: "display:none;" });
        return el(
          "div",
          {
            style:
              "background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:7px 10px; font-size:11px; color:#991B1B; display:flex; align-items:center; justify-content:space-between; gap:6px; margin-top:2px;",
          },
          el(
            "div",
            { style: "display:flex; align-items:center; gap:6px;" },
            el("span", { style: "font-size:14px;" }, "🚨"),
            el(
              "div",
              {},
              el("strong", {}, `${activeOverdue.length} Kasus Melewati Batas SLA! `),
              el("div", { style: "font-size:10px; color:#B91C1C;" }, "Perhatikan target durasi kategori masing-masing kasus.")
            )
          ),
          el(
            "span",
            {
              style:
                "background:#DC2626; color:#FFF; font-size:9.5px; font-weight:800; padding:2px 7px; border-radius:4px; flex-shrink:0;",
            },
            "PERIKSA SLA"
          )
        );
      })(),

      // Spotlight Next Priority Work Order
      nextPriorityTask
        ? el(
            "div",
            {
              style:
                "background:#FFFBEB; border:1.5px solid #FCD34D; border-radius:10px; padding:10px 12px; display:flex; flex-direction:column; gap:6px;",
            },
            el(
              "div",
              {
                style:
                  "display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;",
              },
              el(
                "div",
                {
                  style:
                    "font-size:10px; font-weight:800; color:#B45309; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:4px;",
                },
                el("span", {}, "🎯"),
                el("span", {}, "TUGAS UTAMA BERIKUTNYA:")
              ),
              (() => {
                const nSla = calculateTicketSLA(nextPriorityTask);
                return el(
                  "span",
                  {
                    style: `font-size:9.5px; font-weight:800; padding:2px 7px; border-radius:4px; background:${nSla.badgeBg}; color:${nSla.badgeColor}; border:1px solid ${nSla.badgeBorder};`,
                    title: `SLA Kategori ${nextPriorityTask.category}: ${nSla.durationLabel} • Batas: ${nSla.deadlineFormatted}`,
                  },
                  `⏱️ ${nSla.statusBadgeText}`
                );
              })()
            ),
            el(
              "div",
              {
                style:
                  "font-size:12.5px; font-weight:800; color:#1E293B; display:flex; justify-content:space-between;",
              },
              el(
                "span",
                {},
                `${nextPriorityTask.customer} (${nextPriorityTask.id})`
              ),
              el(
                "span",
                { style: "font-family:monospace; font-size:10.5px; color:#64748B;" },
                `#${nextPriorityTask.caseId || nextPriorityTask.id}`
              )
            ),
            el(
              "div",
              { style: "font-size:11px; color:#475569; display:flex; gap:4px;" },
              el("span", {}, "📍"),
              el("span", {}, `${nextPriorityTask.address} (${nextPriorityTask.area})`)
            ),
            // Dynamic SLA Card for Next Priority Task
            createMobileSLABadge(nextPriorityTask, { isCompact: true, showProgressBar: true }),
            // Quick Spotlight Actions
            el(
              "div",
              { style: "display:flex; gap:6px; margin-top:2px;" },
              nextPriorityTask.status !== "proses"
                ? el(
                    "button",
                    {
                      class: "btn-primary",
                      style: "font-size:11px; padding:5px 9px; flex:1;",
                      onclick: () => handleStartWork(nextPriorityTask),
                    },
                    "▶ Mulai Kerja Sekarang"
                  )
                : el(
                    "button",
                    {
                      class: "btn-primary",
                      style:
                        "font-size:11px; padding:5px 9px; flex:1; background:linear-gradient(135deg, #10B981 0%, #059669 100%);",
                      onclick: () => openFinishModal(nextPriorityTask),
                    },
                    "✅ Selesaikan WO"
                  ),
              el(
                "button",
                {
                  type: "button",
                  class: "btn-secondary",
                  style:
                    "font-size:11px; padding:5px 9px; background:#F5F3FF; border-color:#DDD6FE; color:#7C3AED; font-weight:700; cursor:pointer;",
                  title: "Alihkan pengerjaan tiket ini ke divisi lain",
                  onclick: (e: Event) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openTransferModal(nextPriorityTask);
                  },
                },
                "🔄 Alihkan Divisi"
              )
            )
          )
        : null,

      // Scope Switcher Tabs
      el(
        "div",
        {
          style:
            "display:flex; gap:4px; background:#F1F5F9; padding:3px; border-radius:9px; border:1px solid #E2E8F0; overflow-x:auto; scrollbar-width:none;",
        },
        el(
          "button",
          {
            type: "button",
            style: `flex:1; padding:6px 8px; border-radius:7px; border:none; font-size:11px; font-weight:${
              activeScope === "today" ? "800" : "600"
            }; cursor:pointer; background:${
              activeScope === "today" ? "#FFFFFF" : "transparent"
            }; color:${
              activeScope === "today" ? "#0284C7" : "#64748B"
            }; box-shadow:${activeScope === "today" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"}; white-space:nowrap;`,
            onclick: () => {
              activeScope = "today";
              render();
            },
          },
          `📅 Hari Ini (${todayTickets.length})`
        ),
        el(
          "button",
          {
            type: "button",
            style: `flex:1; padding:6px 8px; border-radius:7px; border:none; font-size:11px; font-weight:${
              activeScope === "my_tickets" ? "800" : "600"
            }; cursor:pointer; background:${
              activeScope === "my_tickets" ? "#FFFFFF" : "transparent"
            }; color:${
              activeScope === "my_tickets" ? "#0284C7" : "#64748B"
            }; box-shadow:${activeScope === "my_tickets" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"}; white-space:nowrap;`,
            onclick: () => {
              activeScope = "my_tickets";
              render();
            },
          },
          `👤 Tiket Saya (${officerTickets.length})`
        ),
        el(
          "button",
          {
            type: "button",
            style: `flex:1; padding:6px 8px; border-radius:7px; border:none; font-size:11px; font-weight:${
              activeScope === "division_all" ? "800" : "600"
            }; cursor:pointer; background:${
              activeScope === "division_all" ? "#FFFFFF" : "transparent"
            }; color:${
              activeScope === "division_all" ? "#0284C7" : "#64748B"
            }; box-shadow:${activeScope === "division_all" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"}; white-space:nowrap;`,
            onclick: () => {
              activeScope = "division_all";
              render();
            },
          },
          `🏢 Semua ${curDivMeta.shortName} (${divisionTickets.length})`
        )
      )
    );

    // Search bar
    const searchBar = el(
      "div",
      { class: "mobile-search-wrapper" },
      el("span", { class: "mobile-search-icon" }, "🔍"),
      el("input", {
        type: "text",
        class: "mobile-search-input",
        placeholder: "Cari WO, nama pelanggan, alamat...",
        value: searchQuery,
        oninput: (e: any) => {
          searchQuery = e.target.value;
          render();
        },
      }),
      searchQuery
        ? el(
            "button",
            {
              class: "mobile-search-clear",
              onclick: () => {
                searchQuery = "";
                render();
              },
            },
            "✖"
          )
        : null
    );

    // Filter Chips
    const filterRow = el(
      "div",
      { class: "mobile-filter-row" },
      el(
        "span",
        {
          class: `mobile-filter-pill ${filterStatus === "all" ? "active" : ""}`,
          onclick: () => {
            filterStatus = "all";
            render();
          },
        },
        `Semua (${scopeBaseTickets.length})`
      ),
      el(
        "span",
        {
          class: `mobile-filter-pill ${filterStatus === "urgent" ? "active" : ""}`,
          onclick: () => {
            filterStatus = "urgent";
            render();
          },
        },
        `🚨 Darurat (${urgentTickets.length})`
      ),
      el(
        "span",
        {
          class: `mobile-filter-pill ${filterStatus === "proses" ? "active" : ""}`,
          onclick: () => {
            filterStatus = "proses";
            render();
          },
        },
        `▶ Diproses (${prosesTickets.length})`
      ),
      el(
        "span",
        {
          class: `mobile-filter-pill ${filterStatus === "selesai" ? "active" : ""}`,
          onclick: () => {
            filterStatus = "selesai";
            render();
          },
        },
        `✅ Selesai (${selesaiTickets.length})`
      )
    );

    // Ticket List Cards
    const ticketCardsContainer = el(
      "div",
      { class: "mobile-tickets-scroll" },
      filtered.length === 0
        ? el(
            "div",
            {
              style:
                "text-align:center; padding:36px 16px; color:var(--ink-soft); font-size:12px; display:flex; flex-direction:column; align-items:center; gap:8px;",
            },
            el("span", { style: "font-size:36px;" }, "🎉"),
            el(
              "div",
              { style: "font-weight:700; font-size:14px; color:var(--ink);" },
              "Tidak Ada Tugas di Filter Ini"
            ),
            el(
              "div",
              {},
              "Semua pekerjaan terselesaikan atau pilih filter/cakupan lain di atas."
            )
          )
        : filtered.map((ticket) => {
            const isDone = ticket.status === "selesai";
            const isProses = ticket.status === "proses";
            const cat = getCatInfo(ticket.category);
            const coords = parseCoords(ticket.coords);

            const tDiv = ticket.targetDivision || getRecommendedDivision(ticket.category);
            const tDivMeta = DIVISIONS[tDiv] || DIVISIONS.minor_repair;

            const isToday = todayTickets.some((t) => t.id === ticket.id);

            const enRouteMessage = buildCustomerEnRouteWhatsAppMessage({
              ...ticket,
              officer: selectedOfficer,
            }, 15);
            const waText = encodeURIComponent(enRouteMessage);
            const waUrl = ticket.phone
              ? `https://wa.me/${ticket.phone.replace(/[^0-9]/g, "")}?text=${waText}`
              : `https://wa.me/?text=${waText}`;

            const mapUrl = coords
              ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  ticket.address + " " + ticket.area
                )}`;

            let statusBadge = "background:rgba(239,68,68,0.15); color:#EF4444;";
            let statusText = "Menunggu";
            if (isDone) {
              statusBadge = "background:rgba(16,185,129,0.15); color:#059669;";
              statusText = "Selesai";
            } else if (isProses) {
              statusBadge = "background:rgba(37,99,235,0.15); color:#2563EB;";
              statusText = "Diproses";
            }

            return el(
              "div",
              {
                class: `mobile-ticket-card ${ticket.urgent && !isDone ? "card-urgent" : ""}`,
              },
              // Header ID & Status & Division Badge
              el(
                "div",
                {
                  style:
                    "display:flex; justify-content:space-between; align-items:center; gap:6px; flex-wrap:wrap;",
                },
                el(
                  "div",
                  { style: "display:flex; align-items:center; gap:6px; flex-wrap:wrap;" },
                  el(
                    "span",
                    {
                      style:
                        "font-family:monospace; font-size:12px; font-weight:800; color:var(--ink);",
                    },
                    ticket.id
                  ),
                  el(
                    "span",
                    {
                      style:
                        "font-family:monospace; font-size:10px; font-weight:800; color:#3730A3; background:#EEF2FF; border:1px solid #C7D2FE; padding:1px 6px; border-radius:4px; cursor:pointer;",
                      title: "Klik untuk menyalin Case ID",
                      onclick: (e: Event) => {
                        e.stopPropagation();
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(ticket.caseId || ticket.id);
                        }
                        // @ts-ignore
                        if ((window as any).Swal) {
                          // @ts-ignore
                          (window as any).Swal.fire({
                            toast: true,
                            position: "top-end",
                            icon: "success",
                            title: `Case ID disalin: #${ticket.caseId || ticket.id}`,
                            showConfirmButton: false,
                            timer: 1500,
                          });
                        }
                      },
                    },
                    `🆔 #${ticket.caseId || ticket.id}`
                  ),
                  // Division Badge on Ticket Card
                  el(
                    "span",
                    {
                      style: `font-size:9.5px; font-weight:800; padding:1px 6px; border-radius:4px; background:${tDivMeta.badgeBg}; color:${tDivMeta.badgeColor}; border:1px solid ${tDivMeta.borderColor};`,
                      title: `Divisi Penugasan: ${tDivMeta.name}`,
                    },
                    `${tDivMeta.icon} ${tDivMeta.shortName}`
                  ),
                  isToday && !isDone
                    ? el(
                        "span",
                        {
                          style:
                            "background:#ECFDF5; color:#065F46; font-size:9px; font-weight:800; padding:1px 5px; border-radius:4px; border:1px solid #A7F3D0;",
                        },
                        "📅 Hari Ini"
                      )
                    : null,
                  ticket.urgent
                    ? el(
                        "span",
                        {
                          style:
                            "background:#FEE2E2; color:#DC2626; font-size:9px; font-weight:800; padding:1px 5px; border-radius:4px; border:1px solid #FECACA;",
                        },
                        "🚨 DARURAT"
                      )
                    : null,
                  (ticket.isRolledOver || ticket.rescheduledDate) && !isDone
                    ? el(
                        "span",
                        {
                          style:
                            "background:#FEF3C7; color:#B45309; font-size:9px; font-weight:800; padding:1px 6px; border-radius:4px; border:1px solid #FCD34D;",
                          title: "Komplain belum diselesaikan di jadwal sebelumnya, otomatis dipindahkan ke hari kerja ini sebagai prioritas pengerjaan.",
                        },
                        "🔄 Pindahan dari Kemarin"
                      )
                    : null,
                  // Customer Presence Confirmation Badge
                  ticket.customerPresenceStatus === "confirmed_at_home"
                    ? el(
                        "span",
                        {
                          style:
                            "background:#ECFDF5; color:#065F46; font-size:9px; font-weight:800; padding:1px 6px; border-radius:4px; border:1px solid #A7F3D0;",
                          title: `Penghuni ada di rumah: ${ticket.customerPresenceNotes || "Siap ditemui"}`,
                        },
                        "🏠 Ada di Rumah"
                      )
                    : ticket.customerPresenceStatus === "waiting"
                    ? el(
                        "span",
                        {
                          style:
                            "background:#FEF3C7; color:#92400E; font-size:9px; font-weight:800; padding:1px 6px; border-radius:4px; border:1px solid #FDE68A;",
                          title: "Penghuni minta tunggu ±10 menit",
                        },
                        "⏳ Tunggu 10 Mnt"
                      )
                    : ticket.customerPresenceStatus === "reschedule_requested"
                    ? el(
                        "span",
                        {
                          style:
                            "background:#FEE2E2; color:#991B1B; font-size:9px; font-weight:800; padding:1px 6px; border-radius:4px; border:1px solid #FECACA;",
                          title: "Penghuni minta jadwal ulang",
                        },
                        "📅 Reschedule"
                      )
                    : null,
                  // Customer Rating Score Badge
                  ticket.customerRating
                    ? el(
                        "span",
                        {
                          style:
                            "background:#FEF3C7; color:#B45309; font-size:9px; font-weight:800; padding:1px 6px; border-radius:4px; border:1px solid #FDE68A;",
                          title: `Rating Pelanggan: ${ticket.customerRating.rating} Bintang`,
                        },
                        `⭐ ${ticket.customerRating.rating}.0`
                      )
                    : null
                ),
                el(
                  "span",
                  {
                    style: `font-size:10px; font-weight:800; padding:2px 8px; border-radius:10px; ${statusBadge}`,
                  },
                  statusText
                )
              ),

              // Customer & Address
              el(
                "div",
                {},
                el(
                  "div",
                  {
                    style:
                      "font-size:13px; font-weight:800; color:var(--ink); display:flex; justify-content:space-between; align-items:center;",
                  },
                  el("span", {}, ticket.customer || "-"),
                  el(
                    "span",
                    {
                      style:
                        "font-size:10px; font-family:monospace; color:var(--ink-soft); font-weight:600;",
                    },
                    ticket.meterId ? `MTR: ${ticket.meterId}` : ""
                  )
                ),
                el(
                  "div",
                  {
                    style:
                      "font-size:11px; color:var(--ink-soft); margin-top:3px; display:flex; align-items:flex-start; gap:4px;",
                  },
                  el("span", {}, "📍"),
                  el("span", {}, `${ticket.address} (${ticket.area})`)
                )
              ),

              // Category & Description
              el(
                "div",
                {
                  style:
                    "background:var(--panel-alt); padding:7px 9px; border-radius:6px; font-size:11px; border:1px solid var(--border);",
                },
                el(
                  "div",
                  { style: "font-weight:700; color:var(--ink);" },
                  `[${ticket.category}] ${cat.label}`
                ),
                ticket.desc
                  ? el(
                      "div",
                      {
                        style:
                          "color:var(--ink-soft); font-size:10.5px; margin-top:2px; line-height:1.35;",
                      },
                      ticket.desc
                    )
                  : null
              ),

              // SLA Penyelesaian Kasus Khusus Akun Handphone Petugas
              createMobileSLABadge(ticket),

              // Transferred Ticket Note / Reason (if any)
              ticket.distributionNotes
                ? el(
                    "div",
                    {
                      style:
                        "background:#F5F3FF; border:1px solid #DDD6FE; border-radius:6px; padding:6px 8px; font-size:10.5px; color:#5B21B6; display:flex; align-items:flex-start; gap:5px;",
                    },
                    el("span", {}, "🔄"),
                    el(
                      "div",
                      {},
                      el("strong", {}, "Catatan Pengalihan: "),
                      el("span", {}, `"${ticket.distributionNotes}"`)
                    )
                  )
                : null,

              // Customer Rating & Feedback Box (if completed and rated by customer)
              (ticket as any).customerRating
                ? el(
                    "div",
                    {
                      style:
                        "background:#FFFBEB; border:1px solid #FDE68A; border-radius:8px; padding:8px 10px; font-size:11px; color:#92400E; display:flex; flex-direction:column; gap:4px; margin-top:2px;",
                    },
                    el(
                      "div",
                      {
                        style:
                          "display:flex; justify-content:space-between; align-items:center; font-weight:800;",
                      },
                      el(
                        "span",
                        { style: "color:#B45309; display:flex; align-items:center; gap:4px;" },
                        "⭐ Rating Pelanggan:",
                        el(
                          "span",
                          { style: "color:#D97706; font-size:11.5px; font-weight:900;" },
                          `${(ticket as any).customerRating.rating}.0 / 5.0`
                        )
                      ),
                      (ticket as any).customerRating.awardedBadge
                        ? el(
                            "span",
                            {
                              style:
                                "background:#FEF3C7; color:#92400E; font-size:9.5px; font-weight:700; padding:1px 6px; border-radius:10px; border:1px solid #FCD34D;",
                            },
                            (ticket as any).customerRating.awardedBadge
                          )
                        : null
                    ),
                    (ticket as any).customerRating.feedback || (ticket as any).customerRating.comments
                      ? el(
                          "div",
                          {
                            style:
                              "font-size:10.5px; color:#78350F; font-style:italic; background:rgba(255,255,255,0.7); padding:5px 8px; border-radius:6px; border-left:3px solid #F59E0B; line-height:1.35; margin-top:2px;",
                          },
                          `💬 "${(ticket as any).customerRating.feedback || (ticket as any).customerRating.comments}"`
                        )
                      : null
                  )
                : null,

              // Material & Sparepart Terpakai (jika status selesai)
              ticket.status === "selesai" && ticket.usedMaterials && ticket.usedMaterials.length > 0
                ? el(
                    "div",
                    {
                      style:
                        "background:#F0FDF4; border:1px solid #BBF7D0; border-radius:6px; padding:6px 8px; font-size:10.5px; display:flex; flex-direction:column; gap:3px;",
                    },
                    el(
                      "div",
                      {
                        style:
                          "font-weight:800; color:#166534; display:flex; align-items:center; gap:4px;",
                      },
                      el("span", {}, "📦"),
                      el("span", {}, "Material / Sparepart Terpakai:")
                    ),
                    el(
                      "div",
                      { style: "display:flex; flex-wrap:wrap; gap:4px;" },
                      ...ticket.usedMaterials.map((m) =>
                        el(
                          "span",
                          {
                            style:
                              "background:#DCFCE7; color:#15803D; font-size:9.5px; font-weight:700; padding:1px 6px; border-radius:4px; border:1px solid #86EFAC;",
                          },
                          m
                        )
                      )
                    )
                  )
                : null,

              // Action Buttons Bar
              el(
                "div",
                { class: "mobile-action-bar", style: "display:flex; flex-wrap:wrap; gap:5px;" },
                // WhatsApp Actions (Combined Chat & Live Track)
                isDone
                  ? el(
                      "button",
                      {
                        type: "button",
                        class: "mobile-act-btn",
                        style:
                          "background:linear-gradient(135deg, #25D366 0%, #128C7E 100%); color:#FFF; border:none; padding:6px 10px; cursor:pointer; font-weight:800; display:inline-flex; align-items:center; gap:5px; box-shadow:0 2px 6px rgba(37,211,102,0.25);",
                        title: "Kirim ringkasan & tautan penilaian ke WhatsApp pelanggan",
                        onclick: (e: Event) => {
                          e.preventDefault();
                          e.stopPropagation();
                          promptAutomaticCustomerCompletionWhatsApp(ticket as any);
                        },
                      },
                      "⭐ WA Rating & Ulasan"
                    )
                  : el(
                      "button",
                      {
                        type: "button",
                        class: "mobile-act-btn",
                        style:
                          "background:linear-gradient(135deg, #25D366 0%, #128C7E 100%); color:#FFF; border:none; padding:6px 10px; cursor:pointer; font-weight:800; display:inline-flex; align-items:center; gap:5px; box-shadow:0 2px 6px rgba(37,211,102,0.25);",
                        title: "Chat WhatsApp konfirmasi kedatangan & kirim link live tracking ke pelanggan",
                        onclick: (e: Event) => {
                          e.preventDefault();
                          e.stopPropagation();
                          promptAutomaticCustomerEnRouteWhatsApp(ticket as any);
                        },
                      },
                      "💬 Chat & Live Track"
                    ),
                // GPS Navigation
                el(
                  "a",
                  {
                    class: "mobile-act-btn",
                    style:
                      "background:#0EA5E9; color:#FFF; text-decoration:none; padding:6px 9px;",
                    href: mapUrl,
                    target: "_blank",
                    rel: "noopener noreferrer",
                  },
                  "🧭 Peta"
                ),
                // TRANSFER WORK ORDER TO ANOTHER DIVISION BUTTON
                el(
                  "button",
                  {
                    type: "button",
                    class: "mobile-act-btn",
                    style:
                      "background:#F3E8FF; border:1px solid #D8B4FE; color:#7C3AED; font-weight:800; padding:6px 9px; cursor:pointer;",
                    title: "Pindahkan pengerjaan Work Order ini ke divisi lain",
                    onclick: (e: Event) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openTransferModal(ticket);
                    },
                  },
                  "🔄 Alihkan"
                ),
                // Work Status Actions
                !isDone
                  ? el(
                      "div",
                      { style: "display:flex; gap:5px; flex:1;" },
                      !isProses
                        ? el(
                            "button",
                            {
                              class: "mobile-act-btn",
                              style: "background:#2563EB; color:#FFF; flex:1; padding:6px 8px;",
                              onclick: () => handleStartWork(ticket),
                            },
                            "▶ Mulai"
                          )
                        : null,
                      el(
                        "button",
                        {
                          class: "mobile-act-btn",
                          style:
                            "background:linear-gradient(135deg, #10B981 0%, #059669 100%); color:#FFF; font-weight:800; flex:1.2; padding:6px 8px; box-shadow:0 2px 6px rgba(16,185,129,0.3);",
                          onclick: () => openFinishModal(ticket),
                        },
                        "✅ Selesaikan"
                      )
                    )
                  : el(
                      "div",
                      { style: "display:flex; gap:5px; flex:1;" },
                      el(
                        "button",
                        {
                          class: "mobile-act-btn",
                          style:
                            "background:linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color:#FFF; font-weight:800; flex:1.2; padding:6px 8px; box-shadow:0 2px 6px rgba(2,132,199,0.3);",
                          onclick: () => {
                            openReportPreviewModal({
                              item: ticket as any,
                              onUpdateItem: (upd) => updateComplaint(upd as any),
                            });
                          },
                        },
                        "📄 BAST & PDF"
                      ),
                      !ticket.customerSignature
                        ? el(
                            "button",
                            {
                              class: "mobile-act-btn",
                              style:
                                "background:#EFF6FF; border:1px solid #BFDBFE; color:#1D4ED8; font-weight:700; flex:0.8; padding:6px 6px;",
                              title: "Minta tanda tangan digital pelanggan",
                              onclick: () => {
                                openSignaturePadModal({
                                  title: "✍️ E-Sign Pelanggan - " + ticket.customer,
                                  defaultSignerName: ticket.customerSignerName || ticket.customer,
                                  onSave: (sig, name) => {
                                    ticket.customerSignature = sig;
                                    ticket.customerSignerName = name;
                                    updateComplaint(ticket);
                                    // @ts-ignore
                                    if ((window as any).Swal) {
                                      // @ts-ignore
                                      (window as any).Swal.fire({
                                        icon: "success",
                                        title: "Tanda Tangan Tersimpan",
                                        text: "E-Sign pelanggan berhasil direkam ke dokumen BAST.",
                                        timer: 1500,
                                        showConfirmButton: false,
                                      });
                                    }
                                  },
                                  onCancel: () => {},
                                });
                              },
                            },
                            "✍️ E-Sign"
                          )
                        : null
                    )
              )
            );
          })
    );

    // Route SubTab Content
    const routeContainer = el(
      "div",
      { style: "padding:12px; display:flex; flex-direction:column; gap:12px;" },
      el(
        "div",
        {
          style:
            "background:linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border:1px solid #BFDBFE; border-radius:12px; padding:12px;",
        },
        el("h3", { style: "margin:0 0 4px 0; font-size:14px; font-weight:800; color:#1E3A8A;" }, "🗺️ Rute Berangkat Hari Ini"),
        el("div", { style: "font-size:11px; color:#1E40AF;" }, "Rute terurut berdasarkan lokasi terdekat untuk efisiensi BBM dan waktu tempuh.")
      ),
      activeTickets.length === 0
        ? el("div", { style: "text-align:center; padding:24px; color:var(--ink-soft);" }, "Tidak ada tiket yang perlu dikunjungi saat ini.")
        : activeTickets.map((t, idx) => {
            const coords = parseCoords(t.coords);
            const mapUrl = coords
              ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.address)}`;
            return el(
              "div",
              {
                style:
                  "background:var(--panel); border:1px solid var(--border); border-radius:10px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:10px;",
              },
              el(
                "div",
                { style: "display:flex; align-items:center; gap:10px;" },
                el(
                  "div",
                  {
                    style:
                      "width:26px; height:26px; border-radius:50%; background:#0284C7; color:#FFF; font-weight:800; font-size:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;",
                  },
                  String(idx + 1)
                ),
                el(
                  "div",
                  {},
                  el("div", { style: "font-size:12px; font-weight:700; color:var(--ink);" }, t.customer),
                  el("div", { style: "font-size:10.5px; color:var(--ink-soft);" }, `${t.address} (${t.area})`)
                )
              ),
              el(
                "a",
                {
                  class: "btn-primary",
                  style: "font-size:11px; padding:4px 8px; text-decoration:none; white-space:nowrap;",
                  href: mapUrl,
                  target: "_blank",
                },
                "🧭 Petunjuk"
              )
            );
          })
    );

    // Stats SubTab Content
    const statsContainer = el(
      "div",
      { style: "padding:12px; display:flex; flex-direction:column; gap:12px;" },
      el(
        "div",
        {
          style:
            "background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:14px; text-align:center;",
        },
        el("div", { style: "font-size:12px; color:var(--ink-soft);" }, "Tingkat Penyelesaian Hari Ini"),
        el("div", { style: "font-size:32px; font-weight:900; color:#10B981; margin:6px 0;" }, `${completionRate}%`),
        el(
          "div",
          {
            style:
              "width:100%; height:8px; background:var(--panel-alt); border-radius:4px; overflow:hidden;",
          },
          el("div", {
            style: `width:${completionRate}%; height:100%; background:#10B981; border-radius:4px; transition:width 0.3s ease;`,
          })
        ),
        el(
          "div",
          { style: "font-size:11px; color:var(--ink-soft); margin-top:8px;" },
          `${selesaiTickets.length} dari ${officerTickets.length} Work Order berhasil diselesaikan`
        ),
        el(
          "button",
          {
            type: "button",
            class: "btn-primary",
            style:
              "margin-top:12px; width:100%; font-size:12px; font-weight:800; padding:10px; border-radius:8px; background:linear-gradient(135deg, #0284C7 0%, #0369A1 100%); display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;",
            onclick: () => {
              openDailyActivityLogModal({ divisionId: selectedDivision });
            },
          },
          el("span", {}, "📋"),
          el("span", {}, "Buka & Unduh Daily Activity Log")
        )
      )
    );

    // Profile SubTab Content
    const profileContainer = el(
      "div",
      { style: "padding:14px; display:flex; flex-direction:column; gap:12px;" },
      el(
        "div",
        {
          style:
            "background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:16px; text-align:center;",
        },
        el(
          "div",
          {
            style: `width:64px; height:64px; border-radius:50%; background:${officerColor.main}; color:#FFF; font-weight:900; font-size:24px; display:flex; align-items:center; justify-content:center; margin:0 auto 10px; box-shadow:0 4px 12px rgba(0,0,0,0.2);`,
          },
          initials
        ),
        el("h2", { style: "margin:0 0 4px 0; font-size:16px; font-weight:800; color:var(--ink);" }, selectedOfficer),
        el("div", { style: "font-size:11.5px; color:var(--ink-soft);" }, "Teknisi Lapangan Minor Repair • PT Aetra Air Tangerang"),
        el(
          "div",
          {
            style:
              "display:inline-block; margin-top:8px; background:rgba(16,185,129,0.15); color:#059669; font-size:10.5px; font-weight:800; padding:2px 8px; border-radius:10px;",
          },
          "🟢 Status: Siaga Lapangan"
        )
      ),
      el(
        "div",
        {
          style:
            "background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:8px;",
        },
        el(
          "div",
          { style: "font-weight:800; font-size:12px; color:var(--ink); display:flex; align-items:center; gap:6px;" },
          el("span", {}, "🔐"),
          el("span", {}, "Informasi Akun Supabase")
        ),
        el(
          "div",
          { style: "font-size:11px; color:var(--ink-soft); display:flex; justify-content:space-between;" },
          el("span", {}, "Status Otentikasi:"),
          el("span", { style: "color:#10B981; font-weight:700;" }, "🟢 Terverifikasi")
        ),
        el(
          "div",
          { style: "font-size:11px; color:var(--ink-soft); display:flex; justify-content:space-between; align-items:center;" },
          el("span", {}, "Email Akun:"),
          el("span", { style: "font-weight:700; color:var(--ink); font-family:monospace; font-size:10.5px;" }, authUser?.email || loginEmail)
        ),
        el(
          "button",
          {
            type: "button",
            class: "btn-secondary",
            style:
              "margin-top:4px; background:#FEF2F2; border-color:#FECACA; color:#DC2626; font-weight:700; font-size:11.5px; padding:8px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;",
            onclick: handleLogout,
          },
          el("span", {}, "🚪"),
          el("span", {}, "Keluar Akun (Logout)")
        )
      ),
      // FIREBASE CLOUD MESSAGING (FCM) PUSH NOTIFICATION CARD
      el(
        "div",
        {
          style:
            "background:var(--panel); border:1.5px solid #0284C7; border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:10px; box-shadow:0 4px 14px rgba(2,132,199,0.08);",
        },
        el(
          "div",
          { style: "display:flex; justify-content:space-between; align-items:center;" },
          el(
            "div",
            { style: "font-weight:900; font-size:12.5px; color:#0369A1; display:flex; align-items:center; gap:6px;" },
            el("span", { style: "font-size:16px;" }, "🔔"),
            el("span", {}, "Firebase Cloud Messaging (FCM)")
          ),
          el(
            "span",
            {
              style: `font-size:10px; font-weight:800; padding:2px 7px; border-radius:6px; ${
                fcmState.permission === "granted"
                  ? "background:#ECFDF5; color:#059669; border:1px solid #A7F3D0;"
                  : "background:#FEF3C7; color:#B45309; border:1px solid #FCD34D;"
              }`,
            },
            fcmState.permission === "granted" ? "🟢 Push Aktif" : "🟡 Izin Standar"
          )
        ),
        el(
          "div",
          { style: "font-size:11px; color:var(--ink-soft); line-height:1.4;" },
          "Teknisi menerima notifikasi instan langsung di HP saat ada komplain baru ditugaskan dari Customer Service / Dispatcher."
        ),
        el(
          "div",
          {
            style:
              "font-size:11px; color:var(--ink-soft); display:flex; justify-content:space-between; align-items:center; background:#F8FAFC; padding:6px 8px; border-radius:8px; border:1px solid #E2E8F0;",
          },
          el("span", {}, "ID Token Perangkat:"),
          el(
            "span",
            {
              style:
                "font-weight:700; color:#0284C7; font-family:monospace; font-size:10px; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;",
              title: fcmState.token,
            },
            fcmState.token ? `${fcmState.token.slice(0, 18)}...` : "Memuat token..."
          )
        ),
        el(
          "div",
          { style: "display:flex; gap:6px; margin-top:2px;" },
          el(
            "button",
            {
              type: "button",
              class: "btn-primary",
              style:
                "flex:1; padding:8px 10px; font-size:11.5px; font-weight:800; display:inline-flex; align-items:center; justify-content:center; gap:5px; background:linear-gradient(135deg, #0284C7 0%, #0369A1 100%); cursor:pointer;",
              title: "Uji coba bunyi bel notifikasi, getar HP, dan pop-up tugas WO baru",
              onclick: () => {
                sendTestFCMPushNotification(selectedOfficer);
              },
            },
            el("span", {}, "🔔"),
            el("span", {}, "Uji Push Notifikasi FCM")
          ),
          fcmState.permission !== "granted"
            ? el(
                "button",
                {
                  type: "button",
                  class: "btn-secondary",
                  style: "padding:8px 10px; font-size:11.5px; font-weight:800; color:#0369A1; cursor:pointer;",
                  onclick: async () => {
                    const res = await requestFCMNotificationPermission(selectedOfficer);
                    fcmState.permission = typeof Notification !== "undefined" ? Notification.permission : "default";
                    if (res.token) fcmState.token = res.token;
                    render();
                  },
                },
                "⚙️ Izinkan Push"
              )
            : null
        )
      ),
      el(
        "div",
        {
          style:
            "background:var(--panel); border:1px solid var(--border); border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:10px;",
        },
        el("div", { style: "font-weight:700; font-size:12px; color:var(--ink);" }, "📞 Kontak Darurat & Pengawas:"),
        el(
          "a",
          {
            class: "btn-secondary",
            href: "tel:0215989800",
            style: "text-decoration:none; text-align:center; padding:8px;",
          },
          "☎️ Hubungi Dispatcher Kantor Aetra"
        ),
        el(
          "a",
          {
            class: "btn-secondary",
            href: "https://wa.me/6281288990011",
            target: "_blank",
            style: "text-decoration:none; text-align:center; padding:8px; color:#25D366; border-color:#25D366;",
          },
          "💬 WhatsApp Posko Pengawas"
        )
      )
    );

    // Active Tab Body Switcher
    let activeBody: HTMLElement;
    if (activeTab === "route") {
      activeBody = routeContainer;
    } else if (activeTab === "stats") {
      activeBody = statsContainer;
    } else if (activeTab === "profile") {
      activeBody = profileContainer;
    } else {
      activeBody = el(
        "div",
        {
          style:
            "display:flex; flex-direction:column; flex:1; min-height:0; gap:10px; padding:10px 12px 20px 12px;",
        },
        dailyWoBanner,
        searchBar,
        filterRow,
        ticketCardsContainer
      );
    }

    // Floating Action Button (Lapor Temuan Baru)
    const fabButton = el(
      "button",
      {
        class: "mobile-fab-btn",
        title: "Catat Temuan / Masalah Lapangan",
        onclick: () => {
          reportModalOpen = true;
          render();
        },
      },
      el("span", { style: "font-size:16px;" }, "➕"),
      el("span", {}, "Lapor Masalah")
    );

    // Fixed Bottom Navigation Bar
    const bottomNav = el(
      "nav",
      { class: "mobile-native-bottom-bar" },
      el(
        "button",
        {
          class: `mobile-native-bottom-tab ${activeTab === "tasks" ? "active" : ""}`,
          onclick: () => {
            activeTab = "tasks";
            render();
          },
        },
        el("span", { style: "font-size:18px;" }, "📋"),
        el("span", {}, "Tugas"),
        activeTickets.length > 0
          ? el("span", { class: "mobile-nav-badge" }, String(activeTickets.length))
          : null
      ),
      el(
        "button",
        {
          class: `mobile-native-bottom-tab ${activeTab === "route" ? "active" : ""}`,
          onclick: () => {
            activeTab = "route";
            render();
          },
        },
        el("span", { style: "font-size:18px;" }, "🗺️"),
        el("span", {}, "Rute Jalan")
      ),
      el(
        "button",
        {
          class: `mobile-native-bottom-tab ${activeTab === "stats" ? "active" : ""}`,
          onclick: () => {
            activeTab = "stats";
            render();
          },
        },
        el("span", { style: "font-size:18px;" }, "📊"),
        el("span", {}, "Capaian")
      ),
      el(
        "button",
        {
          class: `mobile-native-bottom-tab ${activeTab === "profile" ? "active" : ""}`,
          onclick: () => {
            activeTab = "profile";
            render();
          },
        },
        el("span", { style: "font-size:18px;" }, "👤"),
        el("span", {}, "Profil")
      )
    );

    // Finish Modal
    const renderFinishModal = () => {
      if (!finishModalOpen || !finishTargetId) return null;
      const target = complaints.find((c) => c.id === finishTargetId);
      if (!target) return null;
      const cat = getCatInfo(target.category);

      return el(
        "div",
        {
          class: "modal-overlay",
          onclick: (e: any) => {
            if (e.target === e.currentTarget) {
              finishModalOpen = false;
              render();
            }
          },
        },
        el(
          "div",
          { class: "modal-card", style: "max-width:480px; max-height:90vh; overflow-y:auto;" },
          el(
            "div",
            { class: "modal-header" },
            el(
              "h3",
              { style: "margin:0; font-size:15px; font-weight:800;" },
              `✅ Penyelesaian WO: ${target.id}`
            ),
            el(
              "button",
              {
                class: "close-btn",
                onclick: () => {
                  finishModalOpen = false;
                  render();
                },
              },
              "✕"
            )
          ),
          el(
            "div",
            { style: "padding:14px; display:flex; flex-direction:column; gap:12px;" },
            el(
              "div",
              { style: "background:var(--panel-alt); padding:10px; border-radius:8px; font-size:12px;" },
              el(
                "div",
                { style: "display:flex; justify-content:space-between; align-items:center; gap:8px;" },
                el("div", { style: "font-weight:700;" }, `${target.customer} (${target.meterId || "-"})`),
                el(
                  "div",
                  {
                    style:
                      "font-family:monospace; font-size:11px; font-weight:800; color:#3730A3; background:#EEF2FF; border:1px solid #C7D2FE; padding:1px 6px; border-radius:4px;",
                  },
                  `Case ID #${target.caseId || target.id}`
                )
              ),
              el("div", { style: "color:var(--ink-soft); margin-top:2px;" }, target.address),
              el("div", { style: "color:var(--accent); font-weight:700; margin-top:2px;" }, `[${target.category}] ${cat.label}`)
            ),
            // SLA Verification Box for Field Technician
            createMobileSLABadge(target, { isCompact: false, showProgressBar: true }),
            // Photo Before & After Upload
            el(
              "div",
              { style: "display:grid; grid-template-columns:1fr 1fr; gap:10px;" },
              // Foto Sebelum
              el(
                "div",
                { style: "display:flex; flex-direction:column; gap:4px;" },
                el("label", { style: "font-size:11px; font-weight:700; color:var(--ink);" }, "📸 Foto SEBELUM:"),
                finishPhotoBefore
                  ? el(
                      "div",
                      { style: "position:relative;" },
                      el("img", {
                        src: finishPhotoBefore,
                        style: "width:100%; height:90px; object-fit:cover; border-radius:8px; border:1px solid var(--border);",
                      }),
                      el(
                        "div",
                        {
                          style:
                            "position:absolute; bottom:0; left:0; right:0; background:rgba(15,23,42,0.85); color:#FDE047; font-size:9.5px; font-weight:700; padding:2px 6px; border-radius:0 0 7px 7px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;",
                        },
                        `📍 ${target.coords || "-6.2235, 106.5184"}`
                      ),
                      el(
                        "button",
                        {
                          style:
                            "position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.6); color:#FFF; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;",
                          onclick: () => {
                            finishPhotoBefore = null;
                            render();
                          },
                        },
                        "✕"
                      )
                    )
                  : el(
                      "label",
                      {
                        class: "btn-secondary",
                        style:
                          "height:90px; border:2px dashed var(--border); border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; font-size:11px;",
                      },
                      el("span", { style: "font-size:20px;" }, "📷"),
                      el("span", {}, "Unggah Foto"),
                      el("input", {
                        type: "file",
                        accept: "image/*",
                        style: "display:none;",
                        onchange: (e: any) => handlePhotoUpload(e, true),
                      })
                    )
              ),
              // Foto Sesudah
              el(
                "div",
                { style: "display:flex; flex-direction:column; gap:4px;" },
                el("label", { style: "font-size:11px; font-weight:700; color:var(--ink);" }, "📸 Foto SESUDAH:"),
                finishPhotoAfter
                  ? el(
                      "div",
                      { style: "position:relative;" },
                      el("img", {
                        src: finishPhotoAfter,
                        style: "width:100%; height:90px; object-fit:cover; border-radius:8px; border:1px solid var(--border);",
                      }),
                      el(
                        "div",
                        {
                          style:
                            "position:absolute; bottom:0; left:0; right:0; background:rgba(15,23,42,0.85); color:#86EFAC; font-size:9.5px; font-weight:700; padding:2px 6px; border-radius:0 0 7px 7px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;",
                        },
                        `📍 ${target.coords || "-6.2235, 106.5184"}`
                      ),
                      el(
                        "button",
                        {
                          style:
                            "position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.6); color:#FFF; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;",
                          onclick: () => {
                            finishPhotoAfter = null;
                            render();
                          },
                        },
                        "✕"
                      )
                    )
                  : el(
                      "label",
                      {
                        class: "btn-secondary",
                        style:
                          "height:90px; border:2px dashed var(--border); border-radius:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; font-size:11px;",
                      },
                      el("span", { style: "font-size:20px;" }, "📷"),
                      el("span", {}, "Unggah Foto"),
                      el("input", {
                        type: "file",
                        accept: "image/*",
                        style: "display:none;",
                        onchange: (e: any) => handlePhotoUpload(e, false),
                      })
                    )
              )
            ),
            el(
              "div",
              {
                style:
                  "background:#F0FDF4; border:1px solid #BBF7D0; padding:6px 10px; border-radius:8px; font-size:10.5px; color:#166534; display:flex; justify-content:space-between; align-items:center; margin-top:-4px;",
              },
              el(
                "span",
                { style: "font-weight:600;" },
                `📍 GPS: ${target.coords || "-6.2235, 106.5184"} • ID: ${getTechnicianId(selectedOfficer, selectedDivision)}`
              ),
              el(
                "span",
                { style: "color:#15803D; font-weight:800; display:flex; align-items:center; gap:4px;" },
                "🛡️ Auto-Watermark & Supabase"
              )
            ),
            // Tindakan Cepat
            el(
              "div",
              {},
              el("label", { style: "font-size:11px; font-weight:700; color:var(--ink);" }, "Tindakan Perbaikan:"),
              el(
                "div",
                { style: "display:flex; flex-wrap:wrap; gap:4px; margin:4px 0 8px 0;" },
                ...QUICK_ACTIONS.map((act) =>
                  el(
                    "button",
                    {
                      type: "button",
                      style:
                        "padding:4px 8px; font-size:10px; border-radius:12px; background:var(--panel-alt); border:1px solid var(--border); color:var(--ink); cursor:pointer;",
                      onclick: () => {
                        finishActionNotes = finishActionNotes
                          ? `${finishActionNotes}. ${act}`
                          : act;
                        render();
                      },
                    },
                    `+ ${act}`
                  )
                )
              ),
              el("textarea", {
                class: "input-field",
                style: "width:100%; min-height:60px; font-size:11.5px; box-sizing:border-box;",
                placeholder: "Tuliskan catatan teknis hasil pekerjaan...",
                value: finishActionNotes,
                oninput: (e: any) => {
                  finishActionNotes = e.target.value;
                },
              })
            ),
            // Material & Sparepart yang digunakan (Domestic - Basic Maintenance)
            el(
              "div",
              {
                style:
                  "background:var(--panel-alt); border:1px solid var(--border); border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:8px;",
              },
              // Header & Badge
              el(
                "div",
                {
                  style:
                    "display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;",
                },
                el(
                  "div",
                  { style: "display:flex; align-items:center; gap:6px;" },
                  el("span", { style: "font-size:14px;" }, "📦"),
                  el(
                    "label",
                    { style: "font-size:11.5px; font-weight:800; color:var(--ink);" },
                    "Material & Sparepart Terpakai:"
                  ),
                  el(
                    "span",
                    {
                      style:
                        "font-size:9.5px; color:#0369A1; font-weight:800; background:#E0F2FE; border:1px solid #BAE6FD; padding:1px 6px; border-radius:4px;",
                    },
                    "Domestic (Basic Maintenance)"
                  )
                ),
                (() => {
                  const selectedCount = Object.keys(finishMaterialQuantities).filter(
                    (k) => (finishMaterialQuantities[k] || 0) > 0
                  ).length;
                  return el(
                    "span",
                    {
                      id: "mobile-materials-count-badge",
                      style: `font-size:10px; font-weight:800; padding:2px 7px; border-radius:4px; ${
                        selectedCount > 0
                          ? "background:#DCFCE7; color:#15803D; border:1px solid #86EFAC;"
                          : "background:#F1F5F9; color:#64748B; border:1px solid #E2E8F0;"
                      }`,
                    },
                    selectedCount > 0 ? `✓ ${selectedCount} Item Dipilih` : "0 Item Dipilih"
                  );
                })()
              ),

              // Filter Pencarian Cepat
              el(
                "div",
                { style: "display:flex; gap:6px; align-items:center;" },
                el("input", {
                  type: "text",
                  class: "input-field",
                  style:
                    "width:100%; font-size:11px; padding:6px 10px; border-radius:6px; background:#FFFFFF; border:1px solid var(--border); box-sizing:border-box;",
                  placeholder: "🔍 Cari sparepart (cth: valve, pipa, tee, seal, meter)...",
                  value: finishMaterialFilter,
                  oninput: (e: any) => {
                    finishMaterialFilter = e.target.value.toLowerCase().trim();
                    const listContainer = document.getElementById("mobile-materials-list");
                    if (listContainer) {
                      const items = listContainer.querySelectorAll(".sparepart-row-item");
                      items.forEach((itemEl: any) => {
                        const txt = (itemEl.getAttribute("data-search") || "").toLowerCase();
                        itemEl.style.display =
                          !finishMaterialFilter || txt.includes(finishMaterialFilter)
                            ? "flex"
                            : "none";
                      });
                    }
                  },
                })
              ),

              // 14 Item Sparepart Sesuai Gambar 2
              el(
                "div",
                {
                  id: "mobile-materials-list",
                  style:
                    "display:flex; flex-direction:column; gap:6px; max-height:220px; overflow-y:auto; padding:2px; box-sizing:border-box;",
                },
                ...OFFICIAL_SPAREPARTS.map((item) => {
                  const isChecked =
                    typeof finishMaterialQuantities[item.name] === "number" &&
                    finishMaterialQuantities[item.name] > 0;
                  const currentQty = isChecked
                    ? finishMaterialQuantities[item.name]
                    : item.defaultQty;

                  const row = el(
                    "div",
                    {
                      class: "sparepart-row-item",
                      "data-search": `${item.no} ${item.name} ${item.itemCode} ${item.unit}`,
                      style: `display:flex; align-items:center; justify-content:space-between; gap:6px; padding:6px 8px; border-radius:8px; border:1.5px solid ${
                        isChecked ? "#0284C7" : "#E2E8F0"
                      }; background:${isChecked ? "#F0F9FF" : "#FFFFFF"}; transition:all 0.15s ease;`,
                    },
                    // Left: Checkbox + Nomor & Nama + Kode + Satuan
                    el(
                      "div",
                      {
                        style:
                          "display:flex; align-items:center; gap:8px; flex:1; min-width:0; cursor:pointer;",
                        onclick: (e: any) => {
                          if (
                            e.target.tagName.toLowerCase() === "input" ||
                            e.target.tagName.toLowerCase() === "button"
                          )
                            return;
                          if (isChecked) {
                            delete finishMaterialQuantities[item.name];
                          } else {
                            finishMaterialQuantities[item.name] = item.defaultQty;
                          }
                          render();
                        },
                      },
                      el("input", {
                        type: "checkbox",
                        checked: isChecked,
                        style:
                          "width:16px; height:16px; cursor:pointer; accent-color:#0284C7; flex-shrink:0;",
                        onchange: (e: any) => {
                          if (e.target.checked) {
                            finishMaterialQuantities[item.name] = item.defaultQty;
                          } else {
                            delete finishMaterialQuantities[item.name];
                          }
                          render();
                        },
                      }),
                      el(
                        "div",
                        {
                          style:
                            "display:flex; flex-direction:column; min-width:0; flex:1;",
                        },
                        el(
                          "div",
                          {
                            style: `font-size:11px; font-weight:800; color:${
                              isChecked ? "#0369A1" : "#1E293B"
                            }; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`,
                          },
                          `${item.no}. ${item.name}`
                        ),
                        el(
                          "div",
                          {
                            style:
                              "display:flex; align-items:center; gap:5px; margin-top:2px; flex-wrap:wrap;",
                          },
                          item.itemCode
                            ? el(
                                "span",
                                {
                                  style:
                                    "font-family:monospace; font-size:9.5px; background:#F1F5F9; color:#475569; padding:0 4px; border-radius:3px; font-weight:600;",
                                },
                                `#${item.itemCode}`
                              )
                            : null,
                          el(
                            "span",
                            {
                              style: `font-size:9px; font-weight:800; padding:1px 5px; border-radius:3px; text-transform:uppercase; ${
                                item.unit === "meter"
                                  ? "background:#FEF3C7; color:#B45309; border:1px solid #FDE68A;"
                                  : "background:#EFF6FF; color:#1D4ED8; border:1px solid #BFDBFE;"
                              }`,
                            },
                            `Satuan: ${item.unit}`
                          )
                        )
                      )
                    ),

                    // Right: Input Jumlah & Stepper Satuan (meter / pcs)
                    isChecked
                      ? el(
                          "div",
                          {
                            style:
                              "display:flex; align-items:center; gap:3px; flex-shrink:0; background:#FFFFFF; border:1px solid #7DD3FC; border-radius:6px; padding:2px 4px;",
                          },
                          // Tombol Kurang (-)
                          el(
                            "button",
                            {
                              type: "button",
                              title: `Kurangi ${item.unit}`,
                              style:
                                "width:22px; height:22px; border-radius:4px; border:1px solid #CBD5E1; background:#F8FAFC; color:#0F172A; font-weight:900; font-size:12px; display:flex; align-items:center; justify-content:center; cursor:pointer;",
                              onclick: () => {
                                const step = item.step;
                                const min = item.minQty;
                                const current =
                                  finishMaterialQuantities[item.name] || item.defaultQty;
                                const nextVal =
                                  Math.round((current - step) * 10) / 10;
                                if (nextVal < min) {
                                  delete finishMaterialQuantities[item.name];
                                } else {
                                  finishMaterialQuantities[item.name] = nextVal;
                                }
                                render();
                              },
                            },
                            "-"
                          ),
                          // Kolom Input Angka (Bisa Diketik Langsung dalam pcs atau meter)
                          el("input", {
                            type: "number",
                            min: item.minQty.toString(),
                            step: item.step.toString(),
                            value: String(currentQty),
                            style:
                              "width:46px; text-align:center; font-weight:800; font-size:11.5px; border:none; outline:none; background:transparent; color:#0F172A; padding:0;",
                            oninput: (e: any) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val > 0) {
                                finishMaterialQuantities[item.name] = val;
                                const countBadge = document.getElementById("mobile-materials-count-badge");
                                if (countBadge) {
                                  const selCount = Object.keys(finishMaterialQuantities).filter(k => (finishMaterialQuantities[k] || 0) > 0).length;
                                  countBadge.textContent = selCount > 0 ? `✓ ${selCount} Item Dipilih` : "0 Item Dipilih";
                                }
                              }
                            },
                            onblur: (e: any) => {
                              const val = parseFloat(e.target.value);
                              if (isNaN(val) || val <= 0) {
                                finishMaterialQuantities[item.name] = item.minQty;
                                render();
                              }
                            },
                          }),
                          // Tombol Tambah (+)
                          el(
                            "button",
                            {
                              type: "button",
                              title: `Tambah ${item.unit}`,
                              style:
                                "width:22px; height:22px; border-radius:4px; border:1px solid #CBD5E1; background:#F8FAFC; color:#0F172A; font-weight:900; font-size:12px; display:flex; align-items:center; justify-content:center; cursor:pointer;",
                              onclick: () => {
                                const step = item.step;
                                const current =
                                  finishMaterialQuantities[item.name] || item.defaultQty;
                                const nextVal =
                                  Math.round((current + step) * 10) / 10;
                                finishMaterialQuantities[item.name] = nextVal;
                                render();
                              },
                            },
                            "+"
                          ),
                          // Label Satuan (meter / pcs)
                          el(
                            "span",
                            {
                              style: `font-size:10px; font-weight:800; padding:0 3px; ${
                                item.unit === "meter"
                                  ? "color:#B45309;"
                                  : "color:#0284C7;"
                              }`,
                            },
                            item.unit
                          )
                        )
                      : el(
                          "button",
                          {
                            type: "button",
                            style:
                              "font-size:10px; font-weight:700; color:#0369A1; background:#F0F9FF; border:1px solid #BAE6FD; padding:4px 8px; border-radius:6px; cursor:pointer; flex-shrink:0;",
                            onclick: () => {
                              finishMaterialQuantities[item.name] = item.defaultQty;
                              render();
                            },
                          },
                          `+ Gunakan`
                        )
                  );
                  return row;
                })
              ),

              // Kotak Ringkasan Material Terpakai
              (() => {
                const selectedList = Object.entries(finishMaterialQuantities)
                  .filter(([_, qty]) => typeof qty === "number" && qty > 0)
                  .map(([name, qty]) => {
                    const sp = findSparepart(name);
                    const unit = sp ? sp.unit : "pcs";
                    return { name, qty, unit };
                  });

                if (selectedList.length === 0) {
                  return el(
                    "div",
                    {
                      id: "mobile-materials-summary-box",
                      style:
                        "font-size:10.5px; color:#64748B; font-style:italic; padding:6px 8px; background:#F8FAFC; border-radius:6px; border:1px dashed #CBD5E1;",
                    },
                    "💡 Tidak ada material terpakai yang dipilih (centang atau klik '+ Gunakan' jika ada penggantian sparepart)."
                  );
                }

                const totalPcs = selectedList
                  .filter((m) => m.unit === "pcs")
                  .reduce((acc, curr) => acc + curr.qty, 0);
                const totalMeter = selectedList
                  .filter((m) => m.unit === "meter")
                  .reduce((acc, curr) => acc + curr.qty, 0);

                const summaryParts: string[] = [];
                if (totalPcs > 0) summaryParts.push(`${totalPcs} pcs`);
                if (totalMeter > 0) summaryParts.push(`${totalMeter} meter`);

                return el(
                  "div",
                  {
                    id: "mobile-materials-summary-box",
                    style:
                      "background:#F0FDF4; border:1px solid #BBF7D0; border-radius:8px; padding:6px 8px; display:flex; flex-direction:column; gap:4px;",
                  },
                  el(
                    "div",
                    {
                      style:
                        "font-size:10.5px; font-weight:800; color:#166534; display:flex; justify-content:space-between;",
                    },
                    el("span", {}, `✓ Total ${selectedList.length} Material Terpakai:`),
                    el(
                      "span",
                      { style: "font-weight:700; color:#15803D;" },
                      summaryParts.join(", ")
                    )
                  ),
                  el(
                    "div",
                    { style: "display:flex; flex-wrap:wrap; gap:4px;" },
                    ...selectedList.map((m) =>
                      el(
                        "span",
                        {
                          style:
                            "background:#DCFCE7; color:#15803D; font-size:10px; font-weight:700; padding:2px 7px; border-radius:4px; border:1px solid #86EFAC; display:flex; align-items:center; gap:4px;",
                        },
                        el("span", {}, `${m.name}:`),
                        el("strong", {}, `${m.qty} ${m.unit}`)
                      )
                    )
                  )
                );
              })()
            ),
            // E-Sign Tanda Tangan Pelanggan
            el(
              "div",
              {
                style:
                  "background:var(--panel-alt); border:1px dashed var(--border); border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:6px;",
              },
              el(
                "div",
                { style: "display:flex; justify-content:space-between; align-items:center;" },
                el(
                  "label",
                  { style: "font-size:11px; font-weight:800; color:var(--ink);" },
                  "✍️ Tanda Tangan Digital (E-Sign) Pelanggan:"
                ),
                finishCustomerSignature
                  ? el(
                      "span",
                      { style: "font-size:10px; color:#10B981; font-weight:700;" },
                      "✓ Sudah Ditandatangani"
                    )
                  : el(
                      "span",
                      { style: "font-size:10px; color:#D97706; font-weight:700;" },
                      "⚠️ Belum Ditandatangani"
                    )
              ),
              finishCustomerSignature
                ? el(
                    "div",
                    {
                      style:
                        "display:flex; align-items:center; justify-content:space-between; background:#FFF; border:1px solid var(--border); border-radius:8px; padding:6px 10px;",
                    },
                    el("img", {
                      src: finishCustomerSignature,
                      style: "height:45px; max-width:140px; object-fit:contain;",
                    }),
                    el(
                      "div",
                      { style: "text-align:right;" },
                      el(
                        "div",
                        { style: "font-size:11px; font-weight:700; color:var(--ink);" },
                        finishCustomerSignerName || target.customer
                      ),
                      el(
                        "button",
                        {
                          type: "button",
                          style:
                            "background:none; border:none; color:#0284C7; font-size:10.5px; font-weight:700; cursor:pointer; padding:0; margin-top:2px; text-decoration:underline;",
                          onclick: () => {
                            openSignaturePadModal({
                              title: "✍️ E-Sign Pelanggan - " + target.customer,
                              defaultSignerName: finishCustomerSignerName || target.customer,
                              onSave: (sig, name) => {
                                finishCustomerSignature = sig;
                                finishCustomerSignerName = name;
                                render();
                              },
                              onCancel: () => {},
                            });
                          },
                        },
                        "Ganti Tanda Tangan"
                      )
                    )
                  )
                : el(
                    "button",
                    {
                      type: "button",
                      class: "btn-secondary",
                      style:
                        "padding:8px 12px; font-size:11.5px; font-weight:700; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; background:#EFF6FF; border-color:#BFDBFE; color:#1D4ED8;",
                      onclick: () => {
                        openSignaturePadModal({
                          title: "✍️ E-Sign Pelanggan - " + target.customer,
                          defaultSignerName: finishCustomerSignerName || target.customer,
                          onSave: (sig, name) => {
                            finishCustomerSignature = sig;
                            finishCustomerSignerName = name;
                            render();
                          },
                          onCancel: () => {},
                        });
                      },
                    },
                    el("span", {}, "✍️"),
                    el("span", {}, "Minta Pelanggan Tanda Tangan di Layar HP")
                  )
            ),
            // Action Buttons
            el(
              "div",
              { style: "display:flex; justify-content:flex-end; gap:8px; margin-top:8px;" },
              el(
                "button",
                {
                  type: "button",
                  class: "btn-secondary",
                  onclick: () => {
                    finishModalOpen = false;
                    render();
                  },
                },
                "Batal"
              ),
              el(
                "button",
                {
                  type: "button",
                  class: "btn-primary",
                  style:
                    "background:linear-gradient(135deg, #10B981 0%, #059669 100%); border:none; padding:8px 16px; font-weight:800;",
                  onclick: submitFinishReport,
                },
                "💾 Simpan & Selesaikan WO"
              )
            )
          )
        )
      );
    };

    // Report New Issue Modal
    const renderReportModal = () => {
      if (!reportModalOpen) return null;
      return el(
        "div",
        {
          class: "modal-overlay",
          onclick: (e: any) => {
            if (e.target === e.currentTarget) {
              reportModalOpen = false;
              render();
            }
          },
        },
        el(
          "div",
          { class: "modal-card", style: "max-width:440px;" },
          el(
            "div",
            { class: "modal-header" },
            el("h3", { style: "margin:0; font-size:14px; font-weight:800;" }, "➕ Lapor Temuan / Masalah Lapangan"),
            el(
              "button",
              {
                class: "close-btn",
                onclick: () => {
                  reportModalOpen = false;
                  render();
                },
              },
              "✕"
            )
          ),
          el(
            "div",
            { style: "padding:14px; display:flex; flex-direction:column; gap:10px;" },
            el(
              "div",
              {},
              el("label", { style: "font-size:11px; font-weight:700;" }, "Kategori Masalah:"),
              el(
                "select",
                {
                  class: "input-field",
                  style: "width:100%; font-size:12px; margin-top:3px;",
                  value: newReportCategory,
                  onchange: (e: any) => {
                    newReportCategory = e.target.value;
                  },
                },
                ...Object.keys(CATEGORY_MAP).map((k) =>
                  el("option", { value: k }, `[${k}] ${CATEGORY_MAP[k].label}`)
                )
              )
            ),
            el(
              "div",
              {},
              el("label", { style: "font-size:11px; font-weight:700;" }, "Nama Pelanggan / Lokasi:"),
              el("input", {
                type: "text",
                class: "input-field",
                placeholder: "Contoh: Bpk. Joko / Depan Masjid",
                style: "width:100%; box-sizing:border-box;",
                value: newReportCustomer,
                oninput: (e: any) => {
                  newReportCustomer = e.target.value;
                },
              })
            ),
            el(
              "div",
              {},
              el("label", { style: "font-size:11px; font-weight:700;" }, "Alamat Lengkap:"),
              el("textarea", {
                class: "input-field",
                style: "width:100%; min-height:50px; box-sizing:border-box;",
                placeholder: "Nama jalan, RT/RW, patokan lokasi...",
                value: newReportAddress,
                oninput: (e: any) => {
                  newReportAddress = e.target.value;
                },
              })
            ),
            el(
              "label",
              { style: "display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; color:#EF4444; cursor:pointer;" },
              el("input", {
                type: "checkbox",
                checked: newReportUrgent,
                onchange: (e: any) => {
                  newReportUrgent = e.target.checked;
                },
              }),
              el("span", {}, "🚨 Kritis / Kebocoran Darurat")
            ),
            el(
              "div",
              { style: "display:flex; justify-content:flex-end; gap:8px; margin-top:6px;" },
              el(
                "button",
                {
                  class: "btn-secondary",
                  onclick: () => {
                    reportModalOpen = false;
                    render();
                  },
                },
                "Batal"
              ),
              el(
                "button",
                {
                  class: "btn-primary",
                  onclick: () => {
                    if (!newReportCustomer.trim() || !newReportAddress.trim()) {
                      // @ts-ignore
                      if ((window as any).Swal) {
                        // @ts-ignore
                        (window as any).Swal.fire({
                          icon: "warning",
                          title: "Lengkapi Data",
                          text: "Harap isi nama dan alamat temuan.",
                        });
                      }
                      return;
                    }

                    const newTicket: ComplaintItem = {
                      id: `WO-${Date.now().toString().slice(-6)}`,
                      customer: newReportCustomer.trim(),
                      address: newReportAddress.trim(),
                      area: newReportArea,
                      category: newReportCategory,
                      status: "proses",
                      urgent: newReportUrgent,
                      receivedAt: new Date().toISOString(),
                      officer: selectedOfficer,
                    };

                    updateComplaint(newTicket);
                    reportModalOpen = false;
                    newReportCustomer = "";
                    newReportAddress = "";
                    newReportDesc = "";
                    newReportUrgent = false;

                    // @ts-ignore
                    if ((window as any).Swal) {
                      // @ts-ignore
                      (window as any).Swal.fire({
                        icon: "success",
                        title: "Temuan Tersimpan",
                        text: `Work Order ${newTicket.id} langsung ditugaskan kepada Anda dan tersinkron ke dashboard.`,
                      });
                    }
                  },
                },
                "Kirim Temuan"
              )
            )
          )
        )
      );
    };

    // Modal: Pindahkan Pengerjaan ke Divisi Lain (Transfer Work Order)
    const renderTransferModal = () => {
      if (!transferModalOpen || !transferTargetId) return null;
      const target = complaints.find((c) => c.id === transferTargetId);
      if (!target) return null;

      const curDiv = target.targetDivision || selectedDivision;
      const curMeta = DIVISIONS[curDiv] || DIVISIONS.minor_repair;
      const destMeta = DIVISIONS[transferDestinationDivision] || DIVISIONS.sales_support;
      const otherDivisions = DIVISION_ORDER.filter((d) => d !== curDiv);

      return el(
        "div",
        {
          class: "modal-overlay",
          onclick: (e: any) => {
            if (e.target === e.currentTarget && !transferLoading) {
              transferModalOpen = false;
              render();
            }
          },
        },
        el(
          "div",
          {
            class: "modal-card",
            style:
              "max-width:480px; max-height:90vh; overflow-y:auto; border-radius:16px; box-shadow:0 20px 40px rgba(0,0,0,0.3);",
          },
          // Header
          el(
            "div",
            {
              class: "modal-header",
              style:
                "background:linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%); border-bottom:1.5px solid #DDD6FE; padding:14px 16px;",
            },
            el(
              "div",
              {},
              el(
                "h3",
                {
                  style:
                    "margin:0; font-size:15px; font-weight:800; color:#5B21B6; display:flex; align-items:center; gap:6px;",
                },
                el("span", {}, "🔄"),
                el("span", {}, "Pindahkan Pengerjaan ke Divisi Lain")
              ),
              el(
                "div",
                { style: "font-size:11px; color:#7C3AED; margin-top:2px;" },
                `Work Order #${target.caseId || target.id} • ${target.customer}`
              )
            ),
            el(
              "button",
              {
                type: "button",
                class: "close-btn",
                style: "color:#6D28D9; cursor:pointer;",
                onclick: (e: Event) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!transferLoading) {
                    transferModalOpen = false;
                    render();
                  }
                },
              },
              "✕"
            )
          ),

          // Modal Body
          el(
            "div",
            { style: "padding:16px; display:flex; flex-direction:column; gap:14px;" },

            // Current Ticket Summary Card
            el(
              "div",
              {
                style:
                  "background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:10px 12px; font-size:11.5px;",
              },
              el(
                "div",
                {
                  style:
                    "display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;",
                },
                el(
                  "div",
                  { style: "font-weight:800; color:#1E293B;" },
                  `${target.customer} (${target.id})`
                ),
                el(
                  "div",
                  {
                    style: `font-size:10px; font-weight:800; padding:2px 7px; border-radius:6px; background:${curMeta.badgeBg}; color:${curMeta.badgeColor}; border:1px solid ${curMeta.borderColor};`,
                  },
                  `Divisi Saat Ini: ${curMeta.shortName}`
                )
              ),
              el(
                "div",
                { style: "color:#64748B; display:flex; align-items:center; gap:4px;" },
                el("span", {}, "📍"),
                el("span", {}, `${target.address} (${target.area})`)
              ),
              el(
                "div",
                {
                  style:
                    "color:#0284C7; font-weight:700; margin-top:3px; font-size:11px;",
                },
                `Kategori: [${target.category}] ${getCatInfo(target.category).label}`
              )
            ),

            // Step 1: Select Target Division
            el(
              "div",
              {},
              el(
                "label",
                {
                  style:
                    "font-size:12px; font-weight:800; color:#1E293B; display:flex; align-items:center; gap:5px; margin-bottom:6px;",
                },
                el("span", {}, "1️⃣"),
                el("span", {}, "Pilih Divisi Tujuan Pengerjaan:")
              ),
              el(
                "div",
                {
                  style:
                    "display:grid; grid-template-columns:1fr 1fr; gap:8px;",
                },
                ...otherDivisions.map((divId) => {
                  const meta = DIVISIONS[divId];
                  const isSelected = transferDestinationDivision === divId;
                  const officers = getOfficersForDivision(divId);
                  return el(
                    "button",
                    {
                      type: "button",
                      style: `width:100%; text-align:left; cursor:pointer; padding:10px; border-radius:10px; border:2px solid ${
                        isSelected ? meta.badgeColor : "#E2E8F0"
                      }; background:${
                        isSelected ? meta.badgeBg : "#FFFFFF"
                      }; transition:all 0.15s ease; box-shadow:${
                        isSelected ? "0 2px 8px rgba(0,0,0,0.08)" : "none"
                      }; -webkit-tap-highlight-color:transparent;`,
                      onclick: (e: Event) => {
                        e.preventDefault();
                        e.stopPropagation();
                        transferDestinationDivision = divId;
                        const matchingPreset = TRANSFER_REASON_PRESETS.find(
                          (p) => p.recommendedDivision === divId
                        );
                        if (
                          matchingPreset &&
                          (!transferReason.trim() ||
                            TRANSFER_REASON_PRESETS.some(
                              (p) => p.defaultText === transferReason
                            ))
                        ) {
                          transferReason = matchingPreset.defaultText;
                        }
                        render();
                      },
                    },
                    el(
                      "div",
                      {
                        style:
                          "display:flex; align-items:center; justify-content:space-between; margin-bottom:3px;",
                      },
                      el(
                        "span",
                        { style: "font-size:18px;" },
                        meta.icon
                      ),
                      isSelected
                        ? el(
                            "span",
                            {
                              style: `font-size:10px; font-weight:800; background:${meta.badgeColor}; color:#FFF; padding:1px 6px; border-radius:4px;`,
                            },
                            "✓ DIPILIH"
                          )
                        : null
                    ),
                    el(
                      "div",
                      {
                        style: `font-size:12px; font-weight:800; color:${
                          isSelected ? meta.badgeColor : "#1E293B"
                        };`,
                      },
                      meta.name
                    ),
                    el(
                      "div",
                      {
                        style:
                          "font-size:10px; color:#64748B; margin-top:2px; line-height:1.3;",
                      },
                      `${officers.length} Petugas Siaga`
                    )
                  );
                })
              )
            ),

            // Step 2: Quick Preset Reason Buttons
            el(
              "div",
              {},
              el(
                "label",
                {
                  style:
                    "font-size:12px; font-weight:800; color:#1E293B; display:flex; align-items:center; gap:5px; margin-bottom:6px;",
                },
                el("span", {}, "2️⃣"),
                el("span", {}, "Alasan Pemindahan Cepat (Klik Salah Satu):")
              ),
              el(
                "div",
                {
                  style:
                    "display:flex; flex-direction:column; gap:5px; max-height:160px; overflow-y:auto; padding:2px;",
                },
                ...TRANSFER_REASON_PRESETS.map((preset) => {
                  const isPresetActive = transferReason === preset.defaultText;
                  return el(
                    "button",
                    {
                      type: "button",
                      style: `text-align:left; padding:7px 10px; border-radius:8px; border:1px solid ${
                        isPresetActive ? "#7C3AED" : "#E2E8F0"
                      }; background:${
                        isPresetActive ? "#F5F3FF" : "#F8FAFC"
                      }; cursor:pointer; font-size:11px; display:flex; align-items:center; gap:6px; transition:background 0.15s ease; -webkit-tap-highlight-color:transparent;`,
                      onclick: (e: Event) => {
                        e.preventDefault();
                        e.stopPropagation();
                        transferReason = preset.defaultText;
                        if (preset.recommendedDivision !== curDiv) {
                          transferDestinationDivision = preset.recommendedDivision;
                        }
                        render();
                      },
                    },
                    el("span", { style: "font-size:14px;" }, preset.icon),
                    el(
                      "div",
                      { style: "flex:1; min-width:0;" },
                      el(
                        "div",
                        {
                          style: `font-weight:700; color:${
                            isPresetActive ? "#6D28D9" : "#1E293B"
                          };`,
                        },
                        preset.label
                      ),
                      el(
                        "div",
                        {
                          style:
                            "font-size:10px; color:#64748B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:1px;",
                        },
                        preset.defaultText
                      )
                    ),
                    isPresetActive
                      ? el(
                          "span",
                          {
                            style:
                              "color:#7C3AED; font-weight:900; font-size:13px;",
                          },
                          "✓"
                        )
                      : null
                  );
                })
              )
            ),

            // Step 3: Detailed Reason / Notes Textarea
            el(
              "div",
              {},
              el(
                "label",
                {
                  style:
                    "font-size:12px; font-weight:800; color:#1E293B; display:flex; align-items:center; gap:5px; margin-bottom:4px;",
                },
                el("span", {}, "3️⃣"),
                el("span", {}, "Catatan Tambahan & Justifikasi Teknis:")
              ),
              el("textarea", {
                class: "input-field",
                style:
                  "width:100%; min-height:65px; font-size:11.5px; box-sizing:border-box; border-radius:8px;",
                placeholder:
                  "Jelaskan kondisi temuan di lapangan dan mengapa perlu ditangani oleh divisi tujuan...",
                value: transferReason,
                oninput: (e: any) => {
                  transferReason = e.target.value;
                },
              })
            ),

            // Urgent Transfer Checkbox
            el(
              "label",
              {
                style:
                  "display:flex; align-items:center; gap:8px; font-size:11.5px; font-weight:700; color:#DC2626; cursor:pointer; background:#FEF2F2; border:1px solid #FECACA; padding:8px 10px; border-radius:8px;",
              },
              el("input", {
                type: "checkbox",
                checked: transferUrgent,
                onchange: (e: any) => {
                  transferUrgent = e.target.checked;
                },
              }),
              el("span", {}, "🚨 Alihkan sebagai Kasus Darurat (Prioritas Tinggi / SLA Cepat)")
            ),

            // Action Buttons
            el(
              "div",
              {
                style:
                  "display:flex; justify-content:flex-end; gap:8px; border-top:1px solid #E2E8F0; padding-top:12px; margin-top:4px;",
              },
              el(
                "button",
                {
                  type: "button",
                  class: "btn-secondary",
                  disabled: transferLoading,
                  style: "padding:8px 14px; font-size:12px; font-weight:700; cursor:pointer;",
                  onclick: (e: Event) => {
                    e.preventDefault();
                    e.stopPropagation();
                    transferModalOpen = false;
                    render();
                  },
                },
                "Batal"
              ),
              el(
                "button",
                {
                  type: "button",
                  class: "btn-primary",
                  disabled: transferLoading,
                  style: `background:linear-gradient(135deg, ${destMeta.badgeColor} 0%, #4338CA 100%); border:none; padding:8px 16px; font-size:12px; font-weight:800; box-shadow:0 3px 10px rgba(0,0,0,0.15); display:inline-flex; align-items:center; gap:6px; cursor:${transferLoading ? "not-allowed" : "pointer"};`,
                  onclick: (e: Event) => {
                    e.preventDefault();
                    e.stopPropagation();
                    submitTransferWorkOrder();
                  },
                },
                transferLoading
                  ? el("span", {}, "⏳ Memindahkan...")
                  : el("span", {}, `🚀 Alihkan ke ${destMeta.shortName}`)
              )
            )
          )
        )
      );
    };

    // Modal: Ganti Divisi Kerja Lapangan (Switch Division Mobile)
    const renderSwitchDivisionModal = () => {
      if (!switchDivisionModalOpen) return null;

      return el(
        "div",
        {
          class: "modal-overlay",
          onclick: (e: any) => {
            if (e.target === e.currentTarget) {
              switchDivisionModalOpen = false;
              render();
            }
          },
        },
        el(
          "div",
          {
            class: "modal-card",
            style:
              "max-width:440px; max-height:88vh; overflow-y:auto; border-radius:16px;",
          },
          // Header
          el(
            "div",
            { class: "modal-header", style: "padding:14px 16px;" },
            el(
              "div",
              {},
              el(
                "h3",
                {
                  style:
                    "margin:0; font-size:15px; font-weight:800; color:#1E293B; display:flex; align-items:center; gap:6px;",
                },
                el("span", {}, "🏢"),
                el("span", {}, "Pilih Divisi Kerja Petugas")
              ),
              el(
                "div",
                { style: "font-size:11px; color:#64748B; margin-top:2px;" },
                "Beralih antrean Work Order sesuai penugasan divisi Anda"
              )
            ),
            el(
              "button",
              {
                type: "button",
                class: "close-btn",
                style: "cursor:pointer;",
                onclick: (e: Event) => {
                  e.preventDefault();
                  e.stopPropagation();
                  switchDivisionModalOpen = false;
                  render();
                },
              },
              "✕"
            )
          ),

          // Division Choices List
          el(
            "div",
            { style: "padding:14px; display:flex; flex-direction:column; gap:8px;" },
            ...DIVISION_ORDER.map((divId) => {
              const meta = DIVISIONS[divId];
              const isCurrent = divId === selectedDivision;
              const officers = getOfficersForDivision(divId);
              const divCount = complaints.filter(
                (c) =>
                  (c.targetDivision || getRecommendedDivision(c.category)) === divId &&
                  c.status !== "selesai"
              ).length;

              return el(
                "button",
                {
                  type: "button",
                  style: `width:100%; text-align:left; cursor:pointer; border-radius:12px; border:2px solid ${
                    isCurrent ? meta.badgeColor : "#E2E8F0"
                  }; background:${
                    isCurrent ? meta.badgeBg : "#FFFFFF"
                  }; padding:12px; display:flex; align-items:center; justify-content:space-between; gap:10px; transition:all 0.15s ease; box-shadow:${
                    isCurrent ? "0 2px 8px rgba(0,0,0,0.06)" : "none"
                  }; -webkit-tap-highlight-color:transparent;`,
                  onclick: (e: Event) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSwitchDivision(divId);
                  },
                },
                el(
                  "div",
                  { style: "display:flex; align-items:center; gap:10px;" },
                  el(
                    "div",
                    {
                      style: `width:40px; height:40px; border-radius:10px; background:${meta.badgeBg}; border:1px solid ${meta.borderColor}; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0;`,
                    },
                    meta.icon
                  ),
                  el(
                    "div",
                    {},
                    el(
                      "div",
                      {
                        style: `font-size:13px; font-weight:800; color:${
                          isCurrent ? meta.badgeColor : "#1E293B"
                        };`,
                      },
                      meta.name
                    ),
                    el(
                      "div",
                      { style: "font-size:10.5px; color:#64748B; margin-top:2px;" },
                      `${officers.length} Petugas • ${divCount} WO Aktif`
                    )
                  )
                ),
                el(
                  "div",
                  { style: "text-align:right;" },
                  isCurrent
                    ? el(
                        "span",
                        {
                          style: `font-size:10px; font-weight:800; background:${meta.badgeColor}; color:#FFF; padding:3px 8px; border-radius:6px;`,
                        },
                        "✓ AKTIF"
                      )
                    : el(
                        "span",
                        {
                          style:
                            "font-size:10.5px; font-weight:700; color:#0284C7; background:#EFF6FF; border:1px solid #BFDBFE; padding:3px 8px; border-radius:6px;",
                        },
                        "Pilih ➔"
                      )
                )
              );
            })
          )
        )
      );
    };

    // Main App Flow inside Screen
    const mainAppFlow = el(
      "div",
      { class: "mobile-native-app-root" },
      headerBar,
      officerBanner,
      el("div", { class: "mobile-native-content" }, activeBody),
      fabButton,
      bottomNav
    );

    const fullNaturalView = wrapInNaturalMobileShell(mainAppFlow, [
      renderFinishModal(),
      renderReportModal(),
      renderTransferModal(),
      renderSwitchDivisionModal(),
    ]);

    container.appendChild(fullNaturalView);
  }

  const onTicketsChanged = () => {
    if (isDisposed) return;
    loadData();
  };
  window.addEventListener("aetra:tickets_changed", onTicketsChanged);
  window.addEventListener("aetra:dashboard_refresh_needed", onTicketsChanged);

  // Initialize Auth Check
  checkAuthSession();

  return () => {
    isDisposed = true;
    if (renderTimer) {
      clearTimeout(renderTimer);
      renderTimer = null;
    }
    if (authSubscription && typeof authSubscription.unsubscribe === "function") {
      authSubscription.unsubscribe();
    }
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("aetra:tickets_changed", onTicketsChanged);
    window.removeEventListener("aetra:dashboard_refresh_needed", onTicketsChanged);
  };
}
