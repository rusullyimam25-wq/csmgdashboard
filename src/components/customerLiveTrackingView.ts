/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Customer Live Officer Tracking & Home Presence Confirmation View - PT Aetra Air Tangerang
 * Designed to match courier-style tracking timeline (Shopee/SiCepat style) with separated rating link.
 */

import {
  UnifiedTicket,
  loadAllUnifiedTickets,
  saveSingleTicket,
} from "../services/divisionTicketService";
import { publishWorkOrderNotification } from "../services/workOrderNotificationService";
import {
  generateCustomerLiveTrackingUrl,
  generateCustomerRatingUrl,
  copyTextToClipboard,
} from "../services/customerWhatsAppNotificationService";

// Approximate coordinates for Tangerang operational zones if ticket coords are empty
const AREA_COORDINATES: Record<string, [number, number]> = {
  "Tangerang Kota": [-6.1783, 106.6319],
  "Cipondoh": [-6.1865, 106.6712],
  "Ciledug": [-6.2241, 106.7082],
  "Karawaci": [-6.1956, 106.6122],
  "Periuk": [-6.1478, 106.5982],
  "Jatiuwung": [-6.2089, 106.5678],
  "Batuceper": [-6.1601, 106.6698],
  "Benda": [-6.1287, 106.6912],
  "Pinang": [-6.2167, 106.6742],
  "Larangan": [-6.2392, 106.7321],
  "Neglasari": [-6.1523, 106.6412],
  "Cibodas": [-6.1978, 106.5891],
  "Pasar Kemis": [-6.1612, 106.5387],
  "Cikupa": [-6.2341, 106.5189],
  "Balaraja": [-6.1989, 106.4523],
};

const AETRA_HQ_COORDS: [number, number] = [-6.1725, 106.6385]; // AETRA Air Tangerang Hub

/**
 * Format timestamp matching the reference screenshot: "30 Sep 2026 • 11:06 WIB"
 */
function formatTrackingTimestamp(dateInput?: string | Date | number): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return "30 Sep 2026 • 10:00 WIB";

  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Ags", "Sep", "Okt", "Nov", "Des"
  ];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${day} ${month} ${year} • ${hours}:${minutes} WIB`;
}

export function renderCustomerLiveTrackingView(
  container: HTMLElement,
  ticketId: string
): () => void {
  const allTickets = loadAllUnifiedTickets();
  let ticket = allTickets.find(
    (t) =>
      t.id.toLowerCase() === ticketId.toLowerCase() ||
      (t.caseId && t.caseId.toLowerCase() === ticketId.toLowerCase())
  );

  container.innerHTML = "";

  const pageWrapper = document.createElement("div");
  pageWrapper.className = "customer-live-tracking-page";
  pageWrapper.style.cssText = `
    min-height: 100vh;
    background: #0F172A;
    background-image: radial-gradient(at 0% 0%, rgba(2, 132, 199, 0.18) 0px, transparent 50%),
                      radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.12) 0px, transparent 50%);
    padding: 20px 16px 60px;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    color: #F8FAFC;
    box-sizing: border-box;
  `;

  if (!ticket) {
    pageWrapper.innerHTML = `
      <div style="max-width: 500px; margin: 60px auto; background: #FFFFFF; border-radius: 20px; padding: 36px 24px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3); color: #1E293B;">
        <div style="font-size: 52px; margin-bottom: 12px;">🔍</div>
        <h2 style="font-size: 20px; font-weight: 800; color: #0F172A; margin-bottom: 8px;">Work Order Tidak Ditemukan</h2>
        <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin-bottom: 24px;">
          Nomor Work Order / Case ID <b style="color:#0284C7; font-family:monospace;">${ticketId}</b> belum terdaftar dalam sistem pengaduan.
        </p>
        <a href="/" style="display:inline-block; padding: 12px 24px; background: #0284C7; color: #FFFFFF; font-weight: 800; font-size: 13px; border-radius: 12px; text-decoration: none;">
          Kembali ke Beranda
        </a>
      </div>
    `;
    container.appendChild(pageWrapper);
    return () => {};
  }

  // Determine Customer Destination Coordinates
  let destCoords: [number, number] = [-6.185, 106.635];
  if (ticket.coords) {
    const parts = ticket.coords.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      destCoords = [parts[0], parts[1]];
    }
  } else if (ticket.area && AREA_COORDINATES[ticket.area]) {
    destCoords = AREA_COORDINATES[ticket.area];
  }

  const isResolved = ticket.status === "selesai";
  const progressRatio = isResolved ? 1 : 0.65;
  const officerLat = AETRA_HQ_COORDS[0] + (destCoords[0] - AETRA_HQ_COORDS[0]) * progressRatio;
  const officerLng = AETRA_HQ_COORDS[1] + (destCoords[1] - AETRA_HQ_COORDS[1]) * progressRatio;

  let leafletMapInstance: any = null;
  let timelineSortOrder: "latest_first" | "chronological" = "latest_first";

  function renderUI() {
    if (!ticket) return;
    const currentTicket = ticket;
    const isDone = currentTicket.status === "selesai";
    const isProses = currentTicket.status === "proses";
    const isBaru = currentTicket.status === "baru";

    const presenceStatus = (currentTicket as any).customerPresenceStatus || "not_confirmed";
    const presenceNotes = (currentTicket as any).customerPresenceNotes || "";

    const liveTrackUrl = generateCustomerLiveTrackingUrl(currentTicket.id);
    const ratingUrl = generateCustomerRatingUrl(currentTicket.id);

    // Compute realistic stage timestamps
    const rawCreated = currentTicket.receivedAt ? new Date(currentTicket.receivedAt) : new Date(Date.now() - 4 * 3600000);
    const createdDate = isNaN(rawCreated.getTime()) ? new Date(Date.now() - 4 * 3600000) : rawCreated;

    let processedDate: Date | null = null;
    let enRouteDate: Date | null = null;
    let completedDate: Date | null = null;

    if (isDone) {
      completedDate = currentTicket.completedAt ? new Date(currentTicket.completedAt) : new Date();
      if (isNaN(completedDate.getTime())) completedDate = new Date();
      enRouteDate = new Date(completedDate.getTime() - 42 * 60000);
      processedDate = new Date(createdDate.getTime() + 20 * 60000);
    } else if (isProses) {
      const now = new Date();
      enRouteDate = new Date(now.getTime() - 12 * 60000);
      processedDate = new Date(now.getTime() - 45 * 60000);
    } else {
      // isBaru
    }

    // 4 Key Stages requested by user:
    // 1) Komplain dibuat
    // 2) Komplain diproses
    // 3) Petugas lapangan menuju lokasi komplain
    // 4) Pengerjaan selesai
    const stages = [
      {
        id: "created",
        title: "Komplain Dibuat",
        desc: `Laporan pengaduan air bersih (No. WO: ${currentTicket.id}) berhasil dibuat dan terdata di sistem CRM Aetra.`,
        dateStr: formatTrackingTimestamp(createdDate),
        isCurrent: isBaru,
        isCompleted: true,
      },
      {
        id: "processed",
        title: "Komplain Diproses",
        desc: `Laporan telah diverifikasi oleh Dispatcher Teknis dan Work Order diteruskan ke unit teknis terkait.`,
        dateStr: processedDate ? formatTrackingTimestamp(processedDate) : "Menunggu verifikasi dispatcher",
        isCurrent: isProses && !enRouteDate,
        isCompleted: isProses || isDone,
      },
      {
        id: "en_route",
        title: "Petugas Lapangan Menuju Lokasi Komplain",
        desc: `Petugas ${currentTicket.officer || "Agus Setiawan"} telah ditugaskan dan sedang dalam perjalanan menuju lokasi Anda (Estimasi tiba: ±10-15 Menit).`,
        dateStr: enRouteDate ? formatTrackingTimestamp(enRouteDate) : "Menunggu penugasan teknisi",
        isCurrent: isProses,
        isCompleted: isDone,
      },
      {
        id: "completed",
        title: "Pengerjaan Selesai",
        desc: currentTicket.completionNotes?.trim() || `Pekerjaan perbaikan teknis telah selesai dilaksanakan di lokasi. Aliran air telah kembali normal.`,
        dateStr: completedDate ? formatTrackingTimestamp(completedDate) : "Menunggu penyelesaian di lokasi",
        isCurrent: isDone,
        isCompleted: isDone,
      },
    ];

    // Order of display: Image shows latest on top (e.g. Dijemput -> Siap untuk dikirim -> Paket disiapkan)
    const displayStages = timelineSortOrder === "latest_first" ? [...stages].reverse() : stages;

    pageWrapper.innerHTML = `
      <div style="max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; width: 100%;">
        
        <!-- Header Bar -->
        <header style="display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px 14px; background: rgba(30, 41, 59, 0.9); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 3px 10px rgba(2, 132, 199, 0.4);">
              💧
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 900; letter-spacing: 0.3px; color: #FFFFFF;">
                AETRA AIR TANGERANG
              </div>
              <div style="font-size: 10.5px; color: #38BDF8; font-weight: 700;">
                Live Tracking Penanganan Komplain
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            ${
              isDone
                ? `<a href="${ratingUrl}" style="padding: 6px 12px; font-size: 11px; font-weight: 800; color: #FCD34D; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.45); border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.25);">
                    <span>⭐</span>
                    <span>Beri Rating</span>
                  </a>`
                : `<a href="https://wa.me/6281288990011" target="_blank" rel="noopener noreferrer" style="padding: 6px 10px; font-size: 10.5px; font-weight: 700; color: #38BDF8; background: rgba(2, 132, 199, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                    <span>💬</span>
                    <span>CS AETRA</span>
                  </a>`
            }
          </div>
        </header>

        <!-- Current Status Highlight Ribbon -->
        <div style="background: ${
          isDone
            ? "linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.12) 100%)"
            : "linear-gradient(135deg, rgba(2, 132, 199, 0.22) 0%, rgba(30, 41, 59, 0.7) 100%)"
        }; border: 1.5px solid ${isDone ? "#10B981" : "#0284C7"}; border-radius: 16px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; gap: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.2);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${isDone ? "#10B981" : "#38BDF8"}; box-shadow: 0 0 10px ${isDone ? "#10B981" : "#38BDF8"}; animation: pulse 1.5s infinite; flex-shrink: 0;"></div>
            <div>
              <div style="font-size: 13px; font-weight: 900; color: #FFFFFF; line-height: 1.3;">
                ${
                  isDone
                    ? "✅ KOMPLAIN TELAH SELESAI DITANGANI"
                    : isProses
                    ? "🚗 PETUGAS LAPANGAN MENUJU LOKASI"
                    : "📋 KOMPLAIN BERHASIL DIBUAT"
                }
              </div>
              <div style="font-size: 11px; color: ${isDone ? "#A7F3D0" : "#BAE6FD"}; margin-top: 2px;">
                ${
                  isDone
                    ? "Perbaikan tuntas • Berita Acara (BAST) telah diterbitkan."
                    : isProses
                    ? `Petugas: ${currentTicket.officer || "Agus Setiawan"} • Estimasi tiba: ±10-15 Menit.`
                    : "Menunggu verifikasi dispatcher untuk penugasan petugas."
                }
              </div>
            </div>
          </div>

          <div style="font-size: 11px; font-family: monospace; background: rgba(15, 23, 42, 0.7); padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); color: #38BDF8; font-weight: 700; flex-shrink: 0;">
            ${currentTicket.id}
          </div>
        </div>

        <!-- ============================================================= -->
        <!-- LIVE TRACKING TIMELINE CARD (EXACTLY MATCHING THE USER IMAGE) -->
        <!-- ============================================================= -->
        <div style="background: #FFFFFF; border-radius: 20px; padding: 22px 18px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12); color: #1E293B;">
          
          <!-- Card Header & Toggle -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #F1F5F9;">
            <div>
              <div style="font-size: 15px; font-weight: 800; color: #0F172A; display: flex; align-items: center; gap: 6px;">
                <span>📍</span> <span>Status Riwayat Penanganan</span>
              </div>
              <div style="font-size: 11.5px; color: #64748B; margin-top: 2px;">
                Pelacakan tahapan laporan komplain secara berkala
              </div>
            </div>

            <!-- Sort Toggle Button -->
            <button
              id="btn-toggle-sort"
              type="button"
              style="padding: 4px 9px; font-size: 11px; font-weight: 700; color: #0284C7; background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
              title="Ubah Urutan Waktu"
            >
              <span>${timelineSortOrder === "latest_first" ? "⬇️ Terbaru di Atas" : "⬆️ Kronologis"}</span>
            </button>
          </div>

          <!-- Vertical Courier Timeline Container -->
          <div style="position: relative; padding-left: 26px; display: flex; flex-direction: column;">
            
            <!-- Continuous Vertical Rail Line -->
            <div style="position: absolute; left: 8px; top: 12px; bottom: 20px; width: 2px; background: #E2E8F0;"></div>

            ${displayStages
              .map((stage, idx) => {
                const isLastItem = idx === displayStages.length - 1;
                // Green dot for current active stage (matching screenshot); Grey dot for past completed; Soft outline for pending
                const isGreenDot = stage.isCurrent;
                const isGreyDot = stage.isCompleted && !stage.isCurrent;

                return `
                <div style="position: relative; margin-bottom: ${isLastItem ? "0" : "28px"};">
                  
                  <!-- Timeline Dot Marker -->
                  <div style="position: absolute; left: -26px; top: 3px; display: flex; align-items: center; justify-content: center; width: 18px; height: 18px;">
                    ${
                      isGreenDot
                        ? `<div style="width: 13px; height: 13px; border-radius: 50%; background: #10B981; border: 2.5px solid #FFFFFF; box-shadow: 0 0 0 2px #10B981; animation: pulse 2s infinite;"></div>`
                        : isGreyDot
                        ? `<div style="width: 10px; height: 10px; border-radius: 50%; background: #94A3B8;"></div>`
                        : `<div style="width: 10px; height: 10px; border-radius: 50%; background: #FFFFFF; border: 2px solid #CBD5E1;"></div>`
                    }
                  </div>

                  <!-- Content Block (Title, Description, Timestamp) -->
                  <div>
                    <!-- Bold Stage Title -->
                    <div style="font-size: 15px; font-weight: 800; color: ${isGreenDot ? "#0F172A" : isGreyDot ? "#334155" : "#94A3B8"}; line-height: 1.35; margin-bottom: 3px;">
                      ${stage.title}
                    </div>

                    <!-- Description -->
                    <div style="font-size: 13px; color: ${stage.isCompleted ? "#475569" : "#94A3B8"}; line-height: 1.45; margin-bottom: 5px;">
                      ${stage.desc}
                    </div>

                    <!-- Timestamp (e.g. 30 Sep 2026 • 11:06 WIB) -->
                    <div style="font-size: 12px; color: #94A3B8; font-weight: 600;">
                      ${stage.dateStr}
                    </div>

                    <!-- SPECIAL: If this is the "Pengerjaan Selesai" stage AND ticket is resolved -> Show Direct Link to Rating! -->
                    ${
                      stage.id === "completed" && isDone
                        ? `
                      <div style="margin-top: 14px; background: #F0FDF4; border: 1.5px solid #22C55E; border-radius: 14px; padding: 14px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.12);">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                          <span style="font-size: 20px;">⭐</span>
                          <div style="font-size: 13.5px; font-weight: 900; color: #15803D;">
                            Beri Penilaian Kinerja Petugas Lapangan
                          </div>
                        </div>
                        <div style="font-size: 12px; color: #166534; line-height: 1.4; margin-bottom: 12px;">
                          Pengerjaan telah selesai dilaksanakan oleh teknisi <b>${currentTicket.officer || "Petugas AETRA"}</b>. Mohon berikan ulasan & rating bintang Anda.
                        </div>

                        <!-- Big Rating Button (Link Terpisah) -->
                        <a
                          href="${ratingUrl}"
                          style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-sizing: border-box; padding: 11px 16px; font-size: 13.5px; font-weight: 800; background: linear-gradient(135deg, #16A34A 0%, #15803D 100%); color: #FFFFFF; border-radius: 10px; text-decoration: none; box-shadow: 0 3px 10px rgba(22, 163, 74, 0.35); transition: transform 0.15s ease;"
                        >
                          <span>⭐</span>
                          <span>Buka Form Penilaian Petugas</span>
                          <span>➔</span>
                        </a>

                        <!-- Copy Link Option -->
                        <div style="display: flex; gap: 6px; margin-top: 8px;">
                          <button
                            id="btn-copy-rating-link"
                            type="button"
                            style="flex: 1; padding: 7px 10px; font-size: 11px; font-weight: 700; background: #FFFFFF; color: #15803D; border: 1px solid #86EFAC; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 4px;"
                          >
                            <span>📋</span> <span>Salin Link Penilaian</span>
                          </button>
                          <a
                            href="https://wa.me/?text=${encodeURIComponent(
                              `Halo Bapak/Ibu ${currentTicket.customer}, mohon kesediaan memberikan penilaian teknisi Aetra untuk WO ${currentTicket.id} di tautan resmi berikut: ${ratingUrl}`
                            )}"
                            target="_blank"
                            rel="noopener noreferrer"
                            style="padding: 7px 12px; font-size: 11px; font-weight: 700; background: #25D366; color: #FFFFFF; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;"
                            title="Bagikan ke WhatsApp"
                          >
                            <span>💬</span> <span>Share WA</span>
                          </a>
                        </div>
                      </div>
                    `
                        : ""
                    }

                  </div>
                </div>
              `;
              })
              .join("")}

          </div>

        </div>

        <!-- ============================================================= -->
        <!-- INTERACTIVE GPS ROUTE MAP CONTAINER (MOBILE FRIENDLY)         -->
        <!-- ============================================================= -->
        <div style="background: #1E293B; border: 1px solid #334155; border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
          <div style="padding: 10px 14px; background: rgba(15, 23, 42, 0.85); border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 11.5px; font-weight: 800; color: #F8FAFC; display: flex; align-items: center; gap: 6px;">
              <span>🗺️</span> PETA POSISI PETUGAS & RUTE
            </div>
            <div style="font-size: 10.5px; color: #38BDF8; font-weight: 700; background: rgba(56, 189, 248, 0.12); padding: 2px 8px; border-radius: 6px;">
              Hub AETRA ➔ ${currentTicket.area || "Tujuan"}
            </div>
          </div>
          
          <div id="customer-live-map" style="width: 100%; height: 260px; background: #0B1329;"></div>
        </div>

        <!-- Officer Profile & Contact Card -->
        <div style="background: #1E293B; border: 1px solid #334155; border-radius: 18px; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.2);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="position: relative; flex-shrink: 0;">
              <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); display: flex; align-items: center; justify-content: center; font-size: 26px; border: 2px solid #38BDF8; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);">
                👷
              </div>
              <span style="position: absolute; bottom: 0; right: 0; background: #10B981; border: 2px solid #1E293B; width: 14px; height: 14px; border-radius: 50%;" title="Online Aktif"></span>
            </div>

            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 10px; font-weight: 800; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.5px;">
                Teknisi Pelaksana:
              </div>
              <div style="font-size: 15.5px; font-weight: 900; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${currentTicket.officer || "Agus Setiawan"}
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px;">
                <span style="background: rgba(16, 185, 129, 0.15); color: #34D399; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
                  🏍️ B 4821 TWP
                </span>
                <span style="background: rgba(56, 189, 248, 0.15); color: #38BDF8; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">
                  Unit Reaksi Cepat
                </span>
              </div>
            </div>
          </div>

          <!-- Quick Action Buttons -->
          <div style="display: flex; gap: 8px;">
            <a
              href="https://wa.me/6281288990011?text=${encodeURIComponent(
                `Halo ${currentTicket.officer || "Petugas AETRA"}, saya pelanggan (${currentTicket.customer}) No. WO ${currentTicket.id} ingin konfirmasi posisi & rute kedatangan.`
              )}"
              target="_blank"
              rel="noopener noreferrer"
              style="flex: 1; padding: 8px 10px; font-size: 11.5px; font-weight: 800; background: #25D366; color: #FFFFFF; border-radius: 10px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 8px rgba(37,211,102,0.25);"
            >
              <span>💬</span> <span>Chat WA Petugas</span>
            </a>
            <a
              href="tel:0215981122"
              style="flex: 1; padding: 8px 10px; font-size: 11.5px; font-weight: 800; background: #334155; color: #F8FAFC; border-radius: 10px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid #475569;"
            >
              <span>📞</span> <span>Hubungi CS</span>
            </a>
          </div>
        </div>

        <!-- Section: Home Presence Confirmation (TOUCH OPTIMIZED) -->
        <div style="background: #1E293B; border: 1.5px solid ${
          presenceStatus === "confirmed_at_home" ? "#10B981" : "#F59E0B"
        }; border-radius: 18px; padding: 16px 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); display: flex; flex-direction: column; gap: 12px;">
          
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">🏠</span>
              <div>
                <h2 style="font-size: 13.5px; font-weight: 900; color: #FFFFFF; margin: 0;">
                  Konfirmasi Keberadaan di Rumah
                </h2>
                <div style="font-size: 11px; color: #94A3B8;">
                  Pilih status agar petugas siap memeriksa pipa:
                </div>
              </div>
            </div>

            <div>
              ${
                presenceStatus === "confirmed_at_home"
                  ? `<span style="padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 800; background: rgba(16, 185, 129, 0.2); color: #34D399; border: 1px solid #10B981;">
                      ✓ Ada di Rumah
                    </span>`
                  : presenceStatus === "waiting"
                  ? `<span style="padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 800; background: rgba(245, 158, 11, 0.2); color: #FBBF24; border: 1px solid #F59E0B;">
                      ⏳ Tunggu 10 Mnt
                    </span>`
                  : presenceStatus === "reschedule_requested"
                  ? `<span style="padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 800; background: rgba(239, 68, 68, 0.2); color: #F87171; border: 1px solid #EF4444;">
                      📅 Reschedule
                    </span>`
                  : `<span style="padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 800; background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.4);">
                      ⚠️ Belum Konfirmasi
                    </span>`
              }
            </div>
          </div>

          <!-- Presence Options Buttons -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button
              id="btn-confirm-home"
              type="button"
              style="padding: 10px 12px; border-radius: 12px; border: 1.5px solid ${
                presenceStatus === "confirmed_at_home" ? "#10B981" : "#334155"
              }; background: ${
                presenceStatus === "confirmed_at_home"
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.1) 100%)"
                  : "rgba(15, 23, 42, 0.6)"
              }; color: #FFFFFF; cursor: pointer; text-align: left; display: flex; align-items: center; justify-content: space-between; gap: 10px;"
            >
              <div>
                <div style="font-size: 12.5px; font-weight: 800; color: #34D399;">
                  ✅ Ya, Ada di Rumah
                </div>
                <div style="font-size: 10.5px; color: #94A3B8; margin-top: 1px;">
                  Penghuni siap menemui teknisi saat tiba di lokasi.
                </div>
              </div>
              <span style="font-size: 14px; color: ${presenceStatus === "confirmed_at_home" ? "#10B981" : "#475569"}; font-weight: 900;">
                ${presenceStatus === "confirmed_at_home" ? "●" : "○"}
              </span>
            </button>

            <button
              id="btn-confirm-waiting"
              type="button"
              style="padding: 10px 12px; border-radius: 12px; border: 1.5px solid ${
                presenceStatus === "waiting" ? "#F59E0B" : "#334155"
              }; background: ${
                presenceStatus === "waiting"
                  ? "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.1) 100%)"
                  : "rgba(15, 23, 42, 0.6)"
              }; color: #FFFFFF; cursor: pointer; text-align: left; display: flex; align-items: center; justify-content: space-between; gap: 10px;"
            >
              <div>
                <div style="font-size: 12.5px; font-weight: 800; color: #FBBF24;">
                  ⏳ Tunggu ±10 Menit
                </div>
                <div style="font-size: 10.5px; color: #94A3B8; margin-top: 1px;">
                  Sedang di perjalanan menuju rumah, mohon tunggu sebentar.
                </div>
              </div>
              <span style="font-size: 14px; color: ${presenceStatus === "waiting" ? "#F59E0B" : "#475569"}; font-weight: 900;">
                ${presenceStatus === "waiting" ? "●" : "○"}
              </span>
            </button>

            <button
              id="btn-confirm-reschedule"
              type="button"
              style="padding: 10px 12px; border-radius: 12px; border: 1.5px solid ${
                presenceStatus === "reschedule_requested" ? "#EF4444" : "#334155"
              }; background: ${
                presenceStatus === "reschedule_requested"
                  ? "linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(185, 28, 28, 0.1) 100%)"
                  : "rgba(15, 23, 42, 0.6)"
              }; color: #FFFFFF; cursor: pointer; text-align: left; display: flex; align-items: center; justify-content: space-between; gap: 10px;"
            >
              <div>
                <div style="font-size: 12.5px; font-weight: 800; color: #F87171;">
                  📅 Rumah Kosong / Reschedule
                </div>
                <div style="font-size: 10.5px; color: #94A3B8; margin-top: 1px;">
                  Tidak ada orang di rumah, jadwalkan ulang kunjungan teknisi.
                </div>
              </div>
              <span style="font-size: 14px; color: ${presenceStatus === "reschedule_requested" ? "#EF4444" : "#475569"}; font-weight: 900;">
                ${presenceStatus === "reschedule_requested" ? "●" : "○"}
              </span>
            </button>
          </div>

          <!-- Notes input -->
          <div style="display: flex; gap: 6px; align-items: center; background: rgba(15, 23, 42, 0.5); padding: 6px 10px; border-radius: 10px; border: 1px solid #334155;">
            <input
              id="input-presence-notes"
              type="text"
              value="${presenceNotes}"
              placeholder="Catatan patokan pagar / petunjuk jalan..."
              style="flex: 1; background: transparent; border: none; font-size: 11.5px; color: #F8FAFC; outline: none; font-family: inherit;"
            />
            <button id="btn-save-notes" type="button" style="padding: 6px 10px; font-size: 11px; font-weight: 800; background: #0284C7; color: #FFFFFF; border: none; border-radius: 8px; cursor: pointer; white-space: nowrap;">
              Simpan
            </button>
          </div>

        </div>

        <!-- Separate Link Management Box -->
        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid #334155; border-radius: 16px; padding: 14px; font-size: 11.5px; display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 11px; font-weight: 800; color: #38BDF8; text-transform: uppercase;">
            🔗 Tautan Terpisah Pelanggan:
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 8px;">
            <div>
              <div style="font-weight: 700; color: #FFFFFF;">1. Link Live Tracking Petugas:</div>
              <div style="font-size: 10px; color: #64748B; font-family: monospace; overflow: hidden; text-overflow: ellipsis; max-width: 240px; white-space: nowrap;">
                ${liveTrackUrl}
              </div>
            </div>
            <button id="btn-copy-track-link" type="button" style="padding: 4px 8px; font-size: 10px; font-weight: 700; background: #0284C7; color: #FFF; border: none; border-radius: 6px; cursor: pointer;">
              Salin
            </button>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 8px;">
            <div>
              <div style="font-weight: 700; color: #FFFFFF;">2. Link Penilaian & Rating:</div>
              <div style="font-size: 10px; color: #64748B; font-family: monospace; overflow: hidden; text-overflow: ellipsis; max-width: 240px; white-space: nowrap;">
                ${ratingUrl}
              </div>
            </div>
            <button id="btn-copy-rating-url" type="button" style="padding: 4px 8px; font-size: 10px; font-weight: 700; background: #F59E0B; color: #FFF; border: none; border-radius: 6px; cursor: pointer;">
              Salin
            </button>
          </div>
        </div>

        <!-- Customer & Ticket Summary Card -->
        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid #334155; border-radius: 16px; padding: 14px; font-size: 12px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10.5px; font-weight: 800; color: #64748B; text-transform: uppercase;">
              Data Pelapor:
            </span>
            <span style="font-size: 10.5px; color: #38BDF8; font-family: monospace; font-weight: 700;">
              ID: ${currentTicket.meterId || "-"}
            </span>
          </div>
          <div style="font-size: 13.5px; font-weight: 800; color: #FFFFFF;">
            ${currentTicket.customer}
          </div>
          <div style="color: #94A3B8; font-size: 11.5px; line-height: 1.4;">
            📍 ${currentTicket.address} (${currentTicket.area})
          </div>
          <div style="margin-top: 4px; padding-top: 6px; border-top: 1px solid #334155; font-size: 11px; color: #FCD34D;">
            🔧 Keluhan: <strong>${currentTicket.category}</strong>
          </div>
        </div>

        <!-- Footer Help -->
        <footer style="text-align: center; font-size: 10.5px; color: #64748B; line-height: 1.5; margin-top: 4px; display: flex; flex-direction: column; gap: 6px;">
          <div>
            <a href="/?view=lapor" style="color: #38BDF8; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; background: rgba(56, 189, 248, 0.1); padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.25);">
              <span>📝</span> <span>Punya kendala air lain? Buat Pengaduan Mandiri Baru</span> ➔
            </a>
          </div>
          <div>PT AETRA AIR TANGERANG • Layanan Pelanggan 24 Jam</div>
          <div>Call Center: <strong>(021) 598-1122</strong> | WA CS: <strong>0812-8899-0011</strong></div>
        </footer>

      </div>
    `;

    // Sort Toggle Listener
    const sortBtn = pageWrapper.querySelector("#btn-toggle-sort");
    if (sortBtn) {
      sortBtn.addEventListener("click", () => {
        timelineSortOrder = timelineSortOrder === "latest_first" ? "chronological" : "latest_first";
        renderUI();
      });
    }

    // Copy Rating Link Listener
    const copyRatingBtn = pageWrapper.querySelector("#btn-copy-rating-link");
    if (copyRatingBtn) {
      copyRatingBtn.addEventListener("click", async () => {
        await copyTextToClipboard(ratingUrl);
        // @ts-ignore
        if ((window as any).Swal) {
          // @ts-ignore
          (window as any).Swal.fire({
            icon: "success",
            title: "Tautan Penilaian Disalin! 📋",
            text: "Link rating petugas telah disalin ke clipboard Anda.",
            timer: 1600,
            showConfirmButton: false,
          });
        }
      });
    }

    const copyRatingUrlBtn = pageWrapper.querySelector("#btn-copy-rating-url");
    if (copyRatingUrlBtn) {
      copyRatingUrlBtn.addEventListener("click", async () => {
        await copyTextToClipboard(ratingUrl);
        // @ts-ignore
        if ((window as any).Swal) {
          // @ts-ignore
          (window as any).Swal.fire({
            icon: "success",
            title: "Tautan Penilaian Disalin! ⭐",
            timer: 1400,
            showConfirmButton: false,
          });
        }
      });
    }

    const copyTrackBtn = pageWrapper.querySelector("#btn-copy-track-link");
    if (copyTrackBtn) {
      copyTrackBtn.addEventListener("click", async () => {
        await copyTextToClipboard(liveTrackUrl);
        // @ts-ignore
        if ((window as any).Swal) {
          // @ts-ignore
          (window as any).Swal.fire({
            icon: "success",
            title: "Tautan Live Tracking Disalin! 🚗",
            timer: 1400,
            showConfirmButton: false,
          });
        }
      });
    }

    // Bind Presence Confirmation Handlers
    const confirmPresence = async (status: "confirmed_at_home" | "waiting" | "reschedule_requested") => {
      const notesInput = pageWrapper.querySelector("#input-presence-notes") as HTMLInputElement;
      const notes = notesInput ? notesInput.value.trim() : presenceNotes;

      (currentTicket as any).customerPresenceStatus = status;
      (currentTicket as any).customerPresenceConfirmedAt = new Date().toISOString();
      (currentTicket as any).customerPresenceNotes = notes;

      // Save to storage
      await saveSingleTicket(currentTicket);

      // Broadcast real-time event to officer & admin dashboard
      publishWorkOrderNotification({
        ticketId: currentTicket.id,
        caseId: currentTicket.caseId,
        customer: currentTicket.customer,
        address: currentTicket.address,
        officerName: currentTicket.officer || "Petugas Lapangan",
        officerDivision: "minor_repair",
        targetDivision: currentTicket.targetDivision || "minor_repair",
        oldStatus: currentTicket.status,
        newStatus: currentTicket.status,
        actionType: "work_completed",
        summary: `Pelanggan ${currentTicket.customer} mengonfirmasi keberadaan: ${
          status === "confirmed_at_home"
            ? "Ada di Rumah (Siap Ditemui)"
            : status === "waiting"
            ? "Sedang di Jalan (Tunggu 10 Menit)"
            : "Rumah Kosong (Minta Reschedule)"
        }`,
        details: notes || "Konfirmasi diterima melalui portal live tracking pelanggan.",
        urgent: currentTicket.urgent,
      });

      // @ts-ignore
      if ((window as any).Swal) {
        // @ts-ignore
        (window as any).Swal.fire({
          icon: status === "reschedule_requested" ? "info" : "success",
          title:
            status === "confirmed_at_home"
              ? "Kehadiran Berhasil Dikonfirmasi! ✅"
              : status === "waiting"
              ? "Permintaan Menunggu Diteruskan ⏳"
              : "Permintaan Reschedule Dicatat 📅",
          text:
            status === "confirmed_at_home"
              ? "Terima kasih! Petugas kami telah menerima konfirmasi bahwa Anda ada di rumah dan segera tiba di lokasi."
              : status === "waiting"
              ? "Petugas akan meluangkan waktu tunggu ±10 menit di sekitar lokasi Anda."
              : "Laporan jadwal ulang telah dikirim ke Customer Service AETRA untuk penyesuaian waktu.",
          timer: 2400,
          showConfirmButton: false,
        });
      }

      renderUI();
    };

    const btnHome = pageWrapper.querySelector("#btn-confirm-home");
    if (btnHome) btnHome.addEventListener("click", () => confirmPresence("confirmed_at_home"));

    const btnWaiting = pageWrapper.querySelector("#btn-confirm-waiting");
    if (btnWaiting) btnWaiting.addEventListener("click", () => confirmPresence("waiting"));

    const btnReschedule = pageWrapper.querySelector("#btn-confirm-reschedule");
    if (btnReschedule) btnReschedule.addEventListener("click", () => confirmPresence("reschedule_requested"));

    const btnSaveNotes = pageWrapper.querySelector("#btn-save-notes");
    if (btnSaveNotes) {
      btnSaveNotes.addEventListener("click", async () => {
        const notesInput = pageWrapper.querySelector("#input-presence-notes") as HTMLInputElement;
        if (notesInput) {
          (currentTicket as any).customerPresenceNotes = notesInput.value.trim();
          await saveSingleTicket(currentTicket);
          // @ts-ignore
          if ((window as any).Swal) {
            // @ts-ignore
            (window as any).Swal.fire({
              icon: "success",
              title: "Catatan Tersimpan",
              text: "Catatan Anda berhasil diteruskan ke petugas lapangan.",
              timer: 1500,
              showConfirmButton: false,
            });
          }
        }
      });
    }

    // Initialize Leaflet Map
    setTimeout(() => {
      initMap();
    }, 50);
  }

  function initMap() {
    const mapEl = document.getElementById("customer-live-map");
    if (!mapEl) return;

    // @ts-ignore
    const L = (window as any).L;
    if (!L) {
      mapEl.innerHTML = `<div style="padding:20px; color:#94A3B8; text-align:center;">Memuat peta...</div>`;
      return;
    }

    if (leafletMapInstance) {
      try {
        leafletMapInstance.stop?.();
        leafletMapInstance.off?.();
        leafletMapInstance.remove?.();
      } catch (_) {}
      leafletMapInstance = null;
    }
    if ((mapEl as any)._leaflet_id) {
      try {
        delete (mapEl as any)._leaflet_id;
      } catch (_) {}
    }

    try {
      const map = L.map(mapEl, {
        zoomControl: true,
        attributionControl: false,
        trackResize: false,
      }).setView([officerLat, officerLng], 14);
      leafletMapInstance = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Customer Home Marker
      const homeIcon = L.divIcon({
        className: "custom-home-marker",
        html: `
          <div style="background:#0284C7; color:#FFFFFF; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 4px 12px rgba(2,132,199,0.5); border:2px solid #FFFFFF;">
            🏠
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker(destCoords, { icon: homeIcon })
        .addTo(map)
        .bindPopup(
          `<b>Lokasi Pelanggan:</b><br/>${ticket?.customer || "Rumah Pelanggan"}<br/><small>${
            ticket?.address || ""
          }</small>`,
          { autoPan: false }
        );

      // Officer Marker (with pulse)
      const isDone = ticket?.status === "selesai";
      const officerIcon = L.divIcon({
        className: "custom-officer-marker",
        html: `
          <div style="position:relative; width:40px; height:40px;">
            <div style="position:absolute; inset:0; border-radius:50%; background:${isDone ? "rgba(16,185,129,0.4)" : "rgba(2,132,199,0.4)"}; animation:pulse 1.5s infinite;"></div>
            <div style="position:absolute; inset:3px; background:${isDone ? "#10B981" : "#0284C7"}; color:#FFFFFF; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; border:2px solid #FFFFFF; box-shadow:0 4px 12px rgba(0,0,0,0.3);">
              ${isDone ? "✅" : "🏍️"}
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const officerMarker = L.marker([officerLat, officerLng], { icon: officerIcon })
        .addTo(map)
        .bindPopup(
          `<b>Posisi Petugas Lapangan:</b><br/>${
            ticket?.officer || "Agus Setiawan"
          }<br/><span style="color:${isDone ? "#059669" : "#0284C7"}; font-weight:700;">${
            isDone ? "Pekerjaan Telah Selesai" : "Sedang Menuju Lokasi"
          }</span>`,
          { autoPan: false }
        );

      // Route Polyline
      L.polyline([AETRA_HQ_COORDS, [officerLat, officerLng], destCoords], {
        color: isDone ? "#10B981" : "#0284C7",
        weight: 4,
        opacity: 0.8,
        dashArray: "6, 8",
      }).addTo(map);

      const group = L.featureGroup([
        L.marker(destCoords),
        L.marker([officerLat, officerLng]),
      ]);
      map.fitBounds(group.getBounds().pad(0.3), { animate: false });
      setTimeout(() => {
        try {
          if (leafletMapInstance === map) {
            officerMarker.openPopup();
          }
        } catch (_) {}
      }, 200);
    } catch (err) {
      console.error("Leaflet map initialization failed:", err);
    }
  }

  renderUI();
  container.appendChild(pageWrapper);

  return () => {
    if (leafletMapInstance) {
      try {
        leafletMapInstance.stop?.();
        leafletMapInstance.off?.();
        leafletMapInstance.remove?.();
      } catch (_) {}
      leafletMapInstance = null;
    }
    container.innerHTML = "";
  };
}
