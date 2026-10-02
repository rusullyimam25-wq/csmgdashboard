/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Customer Service Dashboard (TSX Module) - PT Aetra Air Tangerang
 * Dedicated module for managing customer complaints from Supabase,
 * with full 1-Click 'Create Case' & Case Dispatch Engine.
 */

import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  DivisionId,
  DIVISIONS,
  getRecommendedDivision,
  AETRA_CASE_CATEGORIES,
} from "../types/division";
import {
  UnifiedTicket,
  loadAllUnifiedTickets,
  saveSingleTicket,
  distributeTicketFromCS,
  generateCaseId,
} from "../services/divisionTicketService";
import { openReportPreviewModal } from "../reportPreviewModal";
import { createTicketCommentFeed } from "../components/ticketCommentFeed";
import { isViewItemVisible } from "../services/dashboardVisibilityService";
import { createExecutiveAnalyticsView } from "../components/csExecutiveAnalyticsView";
import { mountThirtyDayMovingAverageCard } from "../components/ThirtyDayMovingAverageCard";
import { createCustomerSatisfactionDashboardView } from "../components/CustomerSatisfactionDashboardWidget";
import {
  promptAutomaticCustomerCompletionWhatsApp,
  promptAutomaticCustomerEnRouteWhatsApp,
} from "../services/customerWhatsAppNotificationService";
import {
  getAllCustomers,
  searchCustomers,
  saveCustomerRecord,
  generateCcnbStandardCaseId,
  AetraCustomerRecord,
} from "../services/customerMasterService";
import {
  getAllSubmissions,
  saveSingleSubmission,
  markSubmissionConverted,
  rejectSubmission,
  getPendingSubmissionsCount,
  CustomerSubmission,
} from "../services/customerSubmissionService";
import { publishWorkOrderNotification } from "../services/workOrderNotificationService";

// Supabase Configuration
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

function getSupabaseClient() {
  if (typeof window !== "undefined" && (window as any).supabase) {
    try {
      return (window as any).supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
      console.warn("Supabase init error:", e);
    }
  }
  return null;
}

export interface SupabaseCustomerComplaint {
  id: string;
  customerName: string;
  phone: string;
  meterId: string;
  address: string;
  area: string;
  category: string;
  desc: string;
  photo?: string | null;
  coords?: string;
  submittedAt: string;
  status: "menunggu_verifikasi" | "dibuatkan_kasus" | "ditolak" | "baru";
  isUrgent: boolean;
  source: string;
  createdCaseId?: string;
  createdTicketId?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  isFromSupabase?: boolean;
}

/**
 * React Component for Customer Service Dashboard
 */
export const CustomerServiceDashboardComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "supabase_complaints" | "operational" | "analytics" | "moving_avg" | "csat_rating"
  >("supabase_complaints");
  const [complaints, setComplaints] = useState<SupabaseCustomerComplaint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>("menunggu_verifikasi");
  const [filterUrgentOnly, setFilterUrgentOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(true);

  // Load complaints from Supabase & Local Cache
  const loadComplaints = async () => {
    setIsLoading(true);
    const sb = getSupabaseClient();
    let combinedList: SupabaseCustomerComplaint[] = [];

    // 1. Get from customer submission service
    const localSubms = getAllSubmissions().map((s) => ({
      ...s,
      isFromSupabase: true,
    }));
    combinedList = [...localSubms];

    // 2. Fetch from Supabase cloud if client exists
    if (sb) {
      try {
        const { data, error } = await sb
          .from("complaints")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (!error && Array.isArray(data)) {
          setSupabaseConnected(true);
          const sbMapped: SupabaseCustomerComplaint[] = data.map((row: any) => ({
            id: row.id || `SB-${row.caseId || Date.now()}`,
            customerName: row.customer || row.customer_name || "Pelanggan Aetra",
            phone: row.phone || "-",
            meterId: row.meterId || row.meter_id || "-",
            address: row.address || "-",
            area: row.area || "Cikupa",
            category: row.category || "KBSM",
            desc: row.desc || row.description || "Laporan masuk via Supabase",
            photo: row.photoBefore || row.photo_before || null,
            coords: row.coords || "",
            submittedAt: row.receivedAt || row.received_at || row.created_at || new Date().toISOString(),
            status: row.status === "baru" ? "menunggu_verifikasi" : row.caseId ? "dibuatkan_kasus" : "menunggu_verifikasi",
            isUrgent: !!row.urgent,
            source: "Supabase Cloud DB",
            createdCaseId: row.caseId || row.case_id,
            createdTicketId: row.id,
            isFromSupabase: true,
          }));

          // Merge without duplicate IDs
          const existingIds = new Set(combinedList.map((c) => c.id));
          sbMapped.forEach((item) => {
            if (!existingIds.has(item.id)) {
              combinedList.push(item);
            }
          });
        }
      } catch (err) {
        console.warn("Supabase fetch fallback:", err);
        setSupabaseConnected(false);
      }
    }

    setComplaints(combinedList);
    setIsLoading(false);
  };

  useEffect(() => {
    loadComplaints();

    const handleUpdate = () => {
      loadComplaints();
    };

    window.addEventListener("aetra:customer_submissions_updated", handleUpdate);
    window.addEventListener("aetra:new_customer_submission", handleUpdate);

    return () => {
      window.removeEventListener("aetra:customer_submissions_updated", handleUpdate);
      window.removeEventListener("aetra:new_customer_submission", handleUpdate);
    };
  }, []);

  // 1-Click 'Create Case' Handler
  const handleCreateCase = async (item: SupabaseCustomerComplaint) => {
    const caseIdVal = generateCcnbStandardCaseId();
    const year = new Date().getFullYear();
    const newWoId = `WO-${year}-${String(Date.now()).slice(-4)}`;
    const targetDivision = getRecommendedDivision(item.category || "KBSM");

    const newTicket: UnifiedTicket = {
      id: newWoId,
      caseId: caseIdVal,
      customer: item.customerName,
      phone: item.phone,
      meterId: item.meterId,
      address: item.address,
      area: item.area || "Cikupa",
      category: item.category || "KBSM",
      desc: item.desc || `Laporan komplain pelanggan dari Supabase Cloud`,
      status: "baru",
      urgent: item.isUrgent,
      coords: item.coords || undefined,
      photoBefore: item.photo || undefined,
      receivedAt: item.submittedAt || new Date().toISOString(),
      intakeChannel: "Mobile App",
      targetDivision,
      distributionStatus: "distributed",
      distributedAt: new Date().toISOString(),
      distributedBy: "Putri Delia (Customer Service)",
      distributionNotes: `Laporan [${item.id}] diverifikasi dari Supabase & resmi diterbitkan menjadi Kasus #${caseIdVal}.`,
      comments: [
        {
          id: `cmt-cs-${Date.now()}`,
          authorName: "Putri Delia (Customer Service)",
          authorDivision: "customer_service",
          authorRole: "CS Admin",
          targetDepartment: DIVISIONS[targetDivision].name,
          content: `Komplain pelanggan telah diverifikasi dan diterbitkan menjadi Work Order ${newWoId} (Case #${caseIdVal}).`,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    // Save ticket locally
    await saveSingleTicket(newTicket);

    // Sync to Supabase if available
    const sb = getSupabaseClient();
    if (sb) {
      try {
        await sb.from("complaints").upsert([
          {
            id: newWoId,
            caseId: caseIdVal,
            customer: item.customerName,
            phone: item.phone,
            meterId: item.meterId,
            address: item.address,
            area: item.area,
            category: item.category,
            desc: item.desc,
            status: "baru",
            urgent: item.isUrgent,
            coords: item.coords,
            receivedAt: item.submittedAt,
            targetDivision,
          },
        ]);
      } catch (e) {
        console.warn("Supabase upsert note:", e);
      }
    }

    // Mark as converted in submission service
    markSubmissionConverted(item.id, caseIdVal, newWoId, "Putri Delia (Customer Service)");

    // Broadcast real-time notification
    publishWorkOrderNotification({
      ticketId: newTicket.id,
      caseId: newTicket.caseId,
      customer: newTicket.customer,
      address: newTicket.address,
      officerName: "Petugas Lapangan",
      officerDivision: newTicket.targetDivision,
      targetDivision: newTicket.targetDivision,
      oldStatus: "baru",
      newStatus: "baru",
      actionType: "new_report",
      summary: `🚀 Kasus Baru Diterbitkan: ${newTicket.customer} [${newTicket.id}] (Case #${caseIdVal})`,
      details: newTicket.desc,
      urgent: newTicket.urgent,
    });

    // Refresh list
    await loadComplaints();

    // Show popup
    // @ts-ignore
    if (window.Swal) {
      const rawPhone = (item.phone || "").replace(/\D/g, "");
      const phone = rawPhone.startsWith("0") ? "62" + rawPhone.slice(1) : rawPhone || "6281234567890";
      const trackingUrl = `${window.location.origin}/lapor.html`;
      const waMsg = `Yth. Bapak/Ibu ${item.customerName}, pengaduan Anda (${item.id}) telah diverifikasi oleh Customer Service Aetra Air Tangerang dan resmi diterbitkan dengan Case ID: #${caseIdVal} serta No. Work Order: ${newWoId}. Tim ${DIVISIONS[targetDivision].name} segera menindaklanjuti. Lacak tiket di: ${trackingUrl}`;
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`;

      // @ts-ignore
      window.Swal.fire({
        icon: "success",
        title: "Kasus Berhasil Dibuat! 🚀",
        html: `
          <div style="font-size:12.5px; line-height:1.6; color:#334155; text-align:left; background:#F8FAFC; padding:14px; border-radius:10px; border:1px solid #E2E8F0;">
            <div><b>ID Laporan:</b> <span style="font-family:monospace; color:#64748B;">${item.id}</span></div>
            <div><b>Case ID Resmi:</b> <span style="font-family:monospace; color:#4F46E5; font-weight:800; font-size:14px;">#${caseIdVal}</span></div>
            <div><b>No. Work Order:</b> <span style="font-family:monospace; color:#0284C7; font-weight:800; font-size:14px;">${newWoId}</span></div>
            <div><b>Pelapor:</b> ${item.customerName} (${item.phone})</div>
            <div><b>Divisi Ditugaskan:</b> <b style="color:${DIVISIONS[targetDivision].badgeColor};">${DIVISIONS[targetDivision].name}</b></div>
          </div>
          <div style="margin-top:14px;">
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" style="background:#25D366; color:#FFFFFF; text-decoration:none; padding:10px 14px; border-radius:8px; font-weight:800; font-size:12px; display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; box-sizing:border-box;">
              <span>💬</span> <span>Kirim No. Kasus ke WhatsApp Pelanggan</span>
            </a>
          </div>
        `,
        confirmButtonColor: "#0284C7",
        confirmButtonText: "Tutup & Lanjutkan",
      });
    }
  };

  // Reject complaint handler
  const handleReject = (item: SupabaseCustomerComplaint) => {
    // @ts-ignore
    if (window.Swal) {
      // @ts-ignore
      window.Swal.fire({
        title: `Tolak Komplain ${item.id}`,
        input: "text",
        inputPlaceholder: "Tuliskan alasan penolakan...",
        showCancelButton: true,
        confirmButtonText: "✕ Konfirmasi Tolak",
        cancelButtonText: "Batal",
        confirmButtonColor: "#DC2626",
      }).then((res: any) => {
        if (res.isConfirmed && res.value) {
          rejectSubmission(item.id, res.value, "Putri Delia (Customer Service)");
          loadComplaints();
        }
      });
    }
  };

  // Filtered complaints list
  const filteredList = useMemo(() => {
    return complaints.filter((c) => {
      if (filterStatus !== "all" && c.status !== filterStatus) {
        return false;
      }
      if (filterUrgentOnly && !c.isUrgent) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          c.id.toLowerCase().includes(q) ||
          c.customerName.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.meterId.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.area.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.desc.toLowerCase().includes(q) ||
          (c.createdCaseId && c.createdCaseId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [complaints, filterStatus, filterUrgentOnly, searchQuery]);

  const pendingCount = complaints.filter((c) => c.status === "menunggu_verifikasi" || c.status === "baru").length;
  const convertedCount = complaints.filter((c) => c.status === "dibuatkan_kasus").length;
  const rejectedCount = complaints.filter((c) => c.status === "ditolak").length;

  return (
    <div className="max-w-[1520px] mx-auto p-4 flex flex-col gap-4 font-sans text-slate-800">
      
      {/* Top Navigation Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("supabase_complaints")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "supabase_complaints"
                ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <span>📥</span>
            <span>Komplain Supabase</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                pendingCount > 0 ? "bg-red-500 text-white animate-pulse" : "bg-white/30 text-white"
              }`}
            >
              {pendingCount > 0 ? `${pendingCount} Belum Diproses` : `${complaints.length}`}
            </span>
          </button>

          <a
            href="/lapor.html"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>🌐</span>
            <span>Portal Lapor Pelanggan</span>
            <span>↗</span>
          </a>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>{supabaseConnected ? "Supabase Cloud: Terhubung" : "Mode Standalone Storage"}</span>
          </span>
          <button
            type="button"
            onClick={loadComplaints}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
          >
            <span>🔄</span> <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-amber-200 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-2xl shrink-0">
            ⏳
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">Belum Diproses (Pending)</div>
            <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
            <div className="text-[10px] text-amber-700 font-semibold mt-0.5">Siap Dibuatkan Case ID</div>
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-2xl shrink-0">
            🚀
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">Sudah Dibuatkan Kasus</div>
            <div className="text-2xl font-black text-emerald-600">{convertedCount}</div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Dialirkan ke Divisi Teknis</div>
          </div>
        </div>

        <div className="bg-white border border-red-200 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center text-2xl shrink-0">
            ✕
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">Ditolak / Duplikat</div>
            <div className="text-2xl font-black text-red-600">{rejectedCount}</div>
            <div className="text-[10px] text-red-700 font-semibold mt-0.5">Laporan Tidak Valid</div>
          </div>
        </div>

        <div className="bg-white border border-blue-200 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-2xl shrink-0">
            📬
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">Total Komplain Masuk</div>
            <div className="text-2xl font-black text-blue-600">{complaints.length}</div>
            <div className="text-[10px] text-blue-700 font-semibold mt-0.5">Database Supabase</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterStatus("menunggu_verifikasi")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterStatus === "menunggu_verifikasi"
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              ⏳ Belum Diproses ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("dibuatkan_kasus")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterStatus === "dibuatkan_kasus"
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              ✅ Sudah Jadi Kasus ({convertedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("ditolak")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterStatus === "ditolak"
                  ? "bg-red-600 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              ✕ Ditolak ({rejectedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterStatus === "all"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              Semua ({complaints.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterUrgentOnly(!filterUrgentOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                filterUrgentOnly
                  ? "bg-red-600 text-white border-red-600"
                  : "bg-white text-red-600 border-red-200 hover:bg-red-50"
              }`}
            >
              🚨 Hanya Mendesak / Urgent
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cari nama, meter, HP, alamat, masalah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Complaints List Cards */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-xl text-slate-500 font-bold text-xs">
            Memuat data komplain dari Supabase...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center bg-white border border-slate-200 rounded-xl text-slate-500">
            <div className="text-3xl mb-2">📭</div>
            <div className="font-bold text-sm text-slate-700">Tidak Ada Komplain yang Sesuai Filter</div>
            <div className="text-xs text-slate-400 mt-1">Silakan sesuaikan pilihan status atau kata kunci pencarian.</div>
          </div>
        ) : (
          filteredList.map((item) => {
            const isPending = item.status === "menunggu_verifikasi" || item.status === "baru";
            const isConverted = item.status === "dibuatkan_kasus";
            const targetDiv = getRecommendedDivision(item.category || "KBSM");
            const divMeta = DIVISIONS[targetDiv];

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl p-4 md:p-5 border transition shadow-xs flex flex-col gap-3 ${
                  isPending ? "border-amber-300 ring-1 ring-amber-200" : isConverted ? "border-emerald-300" : "border-slate-200"
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                      {item.id}
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      🌐 {item.source}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      🕒 {new Date(item.submittedAt).toLocaleString("id-ID")}
                    </span>
                    {item.isUrgent && (
                      <span className="bg-red-100 text-red-700 font-black text-[10px] px-2 py-0.5 rounded border border-red-200 flex items-center gap-1">
                        🚨 DARURAT / PRIORITAS
                      </span>
                    )}
                  </div>

                  <div>
                    {isPending ? (
                      <span className="bg-amber-50 text-amber-800 border border-amber-300 font-black text-[11px] px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <span>BELUM DIPROSES (MENUNGGU CS)</span>
                      </span>
                    ) : isConverted ? (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-black text-[11px] px-3 py-1 rounded-full inline-flex items-center gap-1">
                        <span>✓</span>
                        <span>SUDAH DIBUATKAN KASUS</span>
                      </span>
                    ) : (
                      <span className="bg-red-50 text-red-700 border border-red-300 font-black text-[11px] px-3 py-1 rounded-full">
                        ✕ DITOLAK
                      </span>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Left: Customer Data */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col gap-1.5">
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase">👤 Data Pelanggan</div>
                    <div className="text-sm font-black text-slate-900">{item.customerName}</div>
                    <div className="text-slate-600 flex items-center gap-2">
                      <span className="font-bold text-blue-700">📞 {item.phone}</span>
                      <a
                        href={`https://wa.me/${(item.phone || "").replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold inline-flex items-center gap-1 no-underline"
                      >
                        <span>💬 Chat WA</span>
                      </a>
                    </div>
                    <div className="text-slate-600">
                      <b>No. Sambungan / Meter:</b> <span className="font-mono font-bold text-slate-800">{item.meterId}</span>
                    </div>
                    <div className="text-slate-600">
                      <b>Alamat:</b> {item.address} (<b>Wilayah {item.area}</b>)
                    </div>
                    {item.coords && (
                      <a
                        href={`https://www.google.com/maps?q=${encodeURIComponent(item.coords)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        <span>📍 GPS: {item.coords}</span>
                      </a>
                    )}
                  </div>

                  {/* Right: Complaint Details */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col gap-1.5">
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase">⚠️ Keluhan Masalah</div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-black">[{item.category}]</span>
                      <span>{AETRA_CASE_CATEGORIES.find((c) => c.key === item.category)?.name || item.category}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded border border-slate-200 text-slate-700 text-xs leading-relaxed italic">
                      "{item.desc}"
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-slate-500 text-[11px]">Rekomendasi Divisi:</span>
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-black"
                        style={{ background: divMeta.badgeBg, color: divMeta.badgeColor, border: `1px solid ${divMeta.badgeBorder}` }}
                      >
                        {divMeta.name}
                      </span>
                    </div>
                    {item.photo && (
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPhoto(item.photo || null)}
                          className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded text-[11px] cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>📷</span> <span>Lihat Foto Bukti</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Bar with 'Create Case' Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    {isConverted && (
                      <div className="text-xs font-bold text-emerald-800 flex items-center gap-2">
                        <span>🚀 Case ID: <b className="font-mono text-emerald-900">#{item.createdCaseId}</b></span>
                        <span>•</span>
                        <span>WO: <b className="font-mono text-emerald-900">{item.createdTicketId}</b></span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleCreateCase(item)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-black text-xs rounded-lg shadow-sm cursor-pointer inline-flex items-center gap-2 transition"
                        >
                          <span>⚡</span>
                          <span>Create Case (1-Klik)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(item)}
                          className="px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold text-xs rounded-lg cursor-pointer transition"
                        >
                          ✕ Tolak
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="p-3 border-b border-slate-700 flex items-center justify-between text-white font-bold text-xs">
              <span>📷 Foto Bukti Pengaduan Pelanggan</span>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex justify-center bg-black max-h-[70vh] overflow-auto">
              <img src={selectedPhoto} alt="Bukti Komplain" className="max-h-[65vh] object-contain rounded" />
            </div>
            <div className="p-3 border-t border-slate-700 text-right">
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerServiceDashboardComponent;
export { renderCustomerServiceDashboard } from "./customerServiceDashboard";
