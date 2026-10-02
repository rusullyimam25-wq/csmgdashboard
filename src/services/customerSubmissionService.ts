/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Customer Self-Service Submission Service - PT Aetra Air Tangerang
 * Manages customer self-service complaints, incoming inbox queue,
 * and 1-click conversion to official CS Case & Work Orders.
 */

export interface CustomerSubmission {
  id: string; // e.g. "SUBM-2026-001"
  customerName: string;
  phone: string;
  meterId: string;
  address: string;
  area: string;
  category: string;
  desc: string;
  photo?: string | null;
  video?: string | null;
  coords?: string;
  submittedAt: string;
  status: "menunggu_verifikasi" | "dibuatkan_kasus" | "ditolak";
  isUrgent: boolean;
  source: "Web Portal Mandiri" | "WhatsApp Chatbot" | "Mobile App";
  createdCaseId?: string; // 10-digit CCnB Case ID e.g. "2610849201"
  createdTicketId?: string; // e.g. "WO-2026-048"
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

const STORAGE_KEY = "aetra_customer_self_submissions";

const DEFAULT_SUBMISSIONS: CustomerSubmission[] = [
  {
    id: "SUBM-2026-001",
    customerName: "Ibu Hj. Nurhasanah",
    phone: "081288992211",
    meterId: "001482925 (MTR-33910)",
    address: "Perumahan Citra Raya Blok R12 No. 05, Cikupa",
    area: "Cikupa",
    category: "KBSM",
    desc: "Pipa sambungan sebelum meteran di depan pagar bocor deras sejak subuh tadi, air meluap ke jalan depan rumah.",
    photo: null,
    coords: "-6.2351, 106.5210",
    submittedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 mins ago
    status: "menunggu_verifikasi",
    isUrgent: true,
    source: "Web Portal Mandiri",
  },
  {
    id: "SUBM-2026-002",
    customerName: "Bpk. Rahmat Hidayat",
    phone: "085712349900",
    meterId: "001482926 (MTR-55412)",
    address: "Jl. Raya Pasar Kemis KM 2 No. 18, Dekat Indomaret",
    area: "Pasar Kemis",
    category: "KATM",
    desc: "Aliran air mati total sejak semalam, kran tidak mengeluarkan air sama sekali padahal tidak ada tunggakan tagihan.",
    photo: null,
    coords: "-6.1730, 106.5420",
    submittedAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(), // 55 mins ago
    status: "menunggu_verifikasi",
    isUrgent: true,
    source: "Web Portal Mandiri",
  },
  {
    id: "SUBM-2026-003",
    customerName: "Ibu Veronica Susanti",
    phone: "081908776655",
    meterId: "001482927 (MTR-77192)",
    address: "Komplek Taman Balaraja Asri Blok C4 No. 22",
    area: "Balaraja",
    category: "KATR",
    desc: "Kualitas air keluar keruh kecoklatan dan berpasir halus sejak siang tadi, tidak bisa digunakan untuk memasak dan mandi.",
    photo: null,
    coords: "-6.2012, 106.4635",
    submittedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago
    status: "menunggu_verifikasi",
    isUrgent: false,
    source: "Web Portal Mandiri",
  },
  {
    id: "SUBM-2026-004",
    customerName: "Bpk. Hendra Gunawan",
    phone: "081399881122",
    meterId: "001482928 (MTR-11029)",
    address: "Jl. Raya Sepatan KM 4 No. 80, RT 02/RW 03",
    area: "Sepatan",
    category: "KPMR",
    desc: "Jarum dan angka meteran air berhenti total tidak berputar meskipun kran air dibuka mengalir.",
    photo: null,
    coords: "-6.1290, 106.5710",
    submittedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), // 5 hours ago
    status: "dibuatkan_kasus",
    isUrgent: false,
    source: "Web Portal Mandiri",
    createdCaseId: "2610849105",
    createdTicketId: "WO-2026-005",
    verifiedBy: "Putri Delia (Customer Service)",
    verifiedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
];

/**
 * Load all customer submissions
 */
export function getAllSubmissions(): CustomerSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Gagal memuat customer submissions:", e);
  }
  saveAllSubmissions(DEFAULT_SUBMISSIONS);
  return DEFAULT_SUBMISSIONS;
}

/**
 * Save all submissions to localStorage
 */
export function saveAllSubmissions(submissions: CustomerSubmission[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
    window.dispatchEvent(new CustomEvent("aetra:customer_submissions_updated"));
  } catch (e) {
    console.error("Gagal simpan customer submissions:", e);
  }
}

/**
 * Save a single new customer submission
 */
export function saveSingleSubmission(subm: CustomerSubmission): CustomerSubmission {
  const all = getAllSubmissions();
  const idx = all.findIndex((s) => s.id === subm.id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...subm };
  } else {
    all.unshift(subm);
  }
  saveAllSubmissions(all);

  // Broadcast event for live CS notification
  window.dispatchEvent(
    new CustomEvent("aetra:new_customer_submission", {
      detail: { submission: subm },
    })
  );

  return subm;
}

/**
 * Get count of pending (unverified) submissions
 */
export function getPendingSubmissionsCount(): number {
  const all = getAllSubmissions();
  return all.filter((s) => s.status === "menunggu_verifikasi").length;
}

/**
 * Mark submission as converted to official Case & Work Order
 */
export function markSubmissionConverted(
  submissionId: string,
  caseId: string,
  ticketId: string,
  csOfficerName: string = "Putri Delia (Customer Service)"
): CustomerSubmission | null {
  const all = getAllSubmissions();
  const idx = all.findIndex((s) => s.id === submissionId);
  if (idx >= 0) {
    all[idx] = {
      ...all[idx],
      status: "dibuatkan_kasus",
      createdCaseId: caseId,
      createdTicketId: ticketId,
      verifiedBy: csOfficerName,
      verifiedAt: new Date().toISOString(),
    };
    saveAllSubmissions(all);
    return all[idx];
  }
  return null;
}

/**
 * Reject / mark submission as duplicate or invalid
 */
export function rejectSubmission(
  submissionId: string,
  reason: string,
  csOfficerName: string = "Putri Delia (Customer Service)"
): CustomerSubmission | null {
  const all = getAllSubmissions();
  const idx = all.findIndex((s) => s.id === submissionId);
  if (idx >= 0) {
    all[idx] = {
      ...all[idx],
      status: "ditolak",
      rejectionReason: reason,
      verifiedBy: csOfficerName,
      verifiedAt: new Date().toISOString(),
    };
    saveAllSubmissions(all);
    return all[idx];
  }
  return null;
}
