/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Customer WhatsApp Notification Service - PT Aetra Air Tangerang
 * Handles:
 * 1. En-route & Live Tracking + Customer Home Presence Confirmation
 * 2. Work Order Completion + Customer Rating & Review Link + BAST Summary
 */

import { formatDateId } from "../reportPdfGenerator";

export interface CustomerRatingData {
  rating: number; // 1 to 5
  aspects?: {
    speed?: number;
    friendliness?: number;
    quality?: number;
  };
  feedback?: string;
  ratedAt: string;
}

export interface TicketForWhatsApp {
  id: string;
  caseId?: string;
  customer: string;
  phone?: string;
  meterId?: string;
  address: string;
  area: string;
  category: string;
  desc?: string;
  status: string;
  officer?: string;
  completedAt?: string;
  completionNotes?: string;
  usedMaterials?: string[];
  photoBefore?: string | null;
  photoAfter?: string | null;
  customerSignerName?: string;
  coords?: string;
  customerPresenceStatus?: "confirmed_at_home" | "not_at_home" | "reschedule_requested" | "waiting";
  customerPresenceNotes?: string;
  customerPresenceConfirmedAt?: string;
  customerRating?: CustomerRatingData;
}

/**
 * Format raw phone number into WhatsApp international format (e.g. 62812xxxx)
 */
export function cleanPhoneNumber(rawPhone?: string): string {
  if (!rawPhone) return "6281234567890";
  const cleaned = rawPhone.replace(/\D/g, "");
  if (!cleaned) return "6281234567890";
  if (cleaned.startsWith("0")) {
    return "62" + cleaned.slice(1);
  }
  if (cleaned.startsWith("62")) {
    return cleaned;
  }
  return "62" + cleaned;
}

/**
 * Generate public URL to view the customer live tracking & presence confirmation page
 */
export function generateCustomerLiveTrackingUrl(ticketId: string): string {
  if (typeof window === "undefined") return `https://aetra-tangerang.co.id/?wo=${ticketId}&view=track`;
  const origin = window.location.origin;
  return `${origin}/?wo=${encodeURIComponent(ticketId)}&view=track`;
}

/**
 * Generate public URL to view the customer work order summary & BAST verification
 */
export function generateCustomerWorkSummaryUrl(ticketId: string): string {
  if (typeof window === "undefined") return `https://aetra-tangerang.co.id/?wo=${ticketId}&view=summary`;
  const origin = window.location.origin;
  return `${origin}/?wo=${encodeURIComponent(ticketId)}&view=summary`;
}

/**
 * Generate public URL for customer officer rating and feedback
 */
export function generateCustomerRatingUrl(ticketId: string): string {
  if (typeof window === "undefined") return `https://aetra-tangerang.co.id/?wo=${ticketId}&view=rating`;
  const origin = window.location.origin;
  return `${origin}/?wo=${encodeURIComponent(ticketId)}&view=rating`;
}

/**
 * 1. EN ROUTE: Build WhatsApp message combining officer visit confirmation & real-time live tracking link
 */
export function buildCustomerEnRouteWhatsAppMessage(
  ticket: TicketForWhatsApp,
  etaMinutes: number = 15
): string {
  const trackUrl = generateCustomerLiveTrackingUrl(ticket.id);
  const caseIdDisplay = ticket.caseId ? `#${ticket.caseId}` : `#${ticket.id}`;
  const officerName = ticket.officer || "Tim Teknisi Lapangan";

  return `*PT AETRA AIR TANGERANG*
_Konfirmasi Kunjungan Petugas & Live Tracking_

Halo Bapak/Ibu *${ticket.customer}*,
Petugas teknisi lapangan kami (*${officerName}*) saat ini sedang *dalam perjalanan menuju rumah Anda* untuk memeriksa dan menyelesaikan laporan pengaduan air bersih.

📋 *Rincian Laporan Komplain:*
• No. Work Order: *${ticket.id}* (${caseIdDisplay})
• Keluhan: ${ticket.category}
• Alamat Tujuan: ${ticket.address} (${ticket.area})
• Estimasi Kedatangan: ±${etaMinutes} Menit

🚗 *Live Tracking & Konfirmasi Penghuni di Rumah:*
Bapak/Ibu dapat memantau posisi perjalanan petugas secara langsung di peta dan mengonfirmasi apakah ada orang di rumah melalui tautan resmi berikut:

🔗 *Link Pantau Lokasi Petugas (Live Track):*
${trackUrl}

💬 _Bapak/Ibu juga dapat langsung membalas pesan WhatsApp ini jika ada petunjuk patokan jalan atau posisi pagar rumah._

Terima kasih atas perhatian dan kerja samanya.
*PT Aetra Air Tangerang*
_Pusat Bantuan 24 Jam: (021) 598-1122 | WhatsApp CS: 0812-8899-0011_`;
}

/**
 * 2. COMPLETION: Build WhatsApp message for finished work order + rating & review link
 */
export function buildCustomerCompletionWhatsAppMessage(ticket: TicketForWhatsApp): string {
  const ratingUrl = generateCustomerRatingUrl(ticket.id);
  const finishDate = formatDateId(ticket.completedAt || new Date().toISOString());
  const caseIdDisplay = ticket.caseId ? `#${ticket.caseId}` : `#${ticket.id}`;
  const officerName = ticket.officer || "Tim Teknisi Lapangan";
  const actionNotes =
    ticket.completionNotes?.trim() ||
    "Perbaikan kebocoran pipa, penggantian aksesoris pipa dinas, dan pengujian kelancaran debit air persil telah selesai dilaksanakan.";
  const materialsList =
    ticket.usedMaterials && ticket.usedMaterials.length > 0
      ? ticket.usedMaterials.join(", ")
      : "Suku cadang standar sambungan dinas AETRA";

  return `*PT AETRA AIR TANGERANG*
_Notifikasi Resmi: Pekerjaan Work Order Selesai_

Yth. Bapak/Ibu *${ticket.customer}*,
Laporan pengaduan air bersih Anda (*No. WO: ${ticket.id}* / ${caseIdDisplay}) telah *SELESAI DITANGANI* oleh teknisi kami: *${officerName}*.

🛠️ *Ringkasan Pengerjaan Teknis:*
• Kategori: ${ticket.category}
• Tindakan: ${actionNotes}
• Material: ${materialsList}
• Waktu Selesai: ${finishDate} WIB

⭐ *Penilaian Kinerja Petugas Lapangan:*
Kepuasan Anda adalah prioritas kami. Mohon luangkan waktu 30 detik untuk memberikan penilaian rating (1-5 bintang) & ulasan kepada petugas kami melalui tautan berikut:

🔗 *Link Penilaian Petugas Lapangan:*
${ratingUrl}

Terima kasih atas kerja sama dan kepercayaan Bapak/Ibu kepada PT Aetra Air Tangerang.
_Pusat Bantuan 24 Jam: (021) 598-1122 | WhatsApp CS: 0812-8899-0011_`;
}

/**
 * Open WhatsApp directly with formatted message
 */
export function sendWhatsAppDirect(phone: string, text: string): void {
  const cleaned = cleanPhoneNumber(phone);
  const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
  if (typeof window !== "undefined") {
    window.open(url, "_blank");
  }
}

/**
 * Copy text to clipboard
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const tempInput = document.createElement("textarea");
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    return true;
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    return false;
  }
}

/**
 * Prompt automated modal for sending En-Route / Live Tracking WhatsApp message
 */
export function promptAutomaticCustomerEnRouteWhatsApp(
  ticket: TicketForWhatsApp,
  options?: {
    etaMinutes?: number;
    title?: string;
    onClosed?: () => void;
  }
): void {
  const currentPhone = cleanPhoneNumber(ticket.phone);
  const eta = options?.etaMinutes || 15;
  const message = buildCustomerEnRouteWhatsAppMessage(ticket, eta);
  const trackUrl = generateCustomerLiveTrackingUrl(ticket.id);

  // @ts-ignore
  const swal = (typeof window !== "undefined" && (window as any).Swal) || null;

  if (swal) {
    const htmlContent = `
      <div style="text-align: left; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; font-size: 12.5px; color: #334155;">
        <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
          <div style="font-size: 26px;">💬</div>
          <div>
            <div style="font-weight: 800; color: #1E40AF; font-size: 13px;">Chat WhatsApp & Kirim Live Tracking</div>
            <div style="font-size: 11.5px; color: #3B82F6; margin-top: 1px;">Konfirmasi kedatangan menyelesaikan komplain + tautan pantau lokasi petugas.</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 120px; gap: 10px; margin-bottom: 10px;">
          <div>
            <label style="display: block; font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 4px;">
              Nomor WhatsApp Pelanggan:
            </label>
            <input
              id="swal-enroute-phone"
              type="text"
              value="${currentPhone}"
              placeholder="Contoh: 6281234567890"
              style="width: 100%; box-sizing: border-box; padding: 7px 10px; border-radius: 8px; border: 1.5px solid #CBD5E1; font-size: 12.5px; font-family: monospace; font-weight: 700; color: #0F172A;"
            />
          </div>
          <div>
            <label style="display: block; font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 4px;">
              Estimasi Tiba:
            </label>
            <select id="swal-enroute-eta" style="width: 100%; box-sizing: border-box; padding: 7px 8px; border-radius: 8px; border: 1.5px solid #CBD5E1; font-size: 12px; font-weight: 700; color: #0F172A;">
              <option value="10" ${eta === 10 ? "selected" : ""}>± 10 Menit</option>
              <option value="15" ${eta === 15 ? "selected" : ""}>± 15 Menit</option>
              <option value="20" ${eta === 20 ? "selected" : ""}>± 20 Menit</option>
              <option value="30" ${eta === 30 ? "selected" : ""}>± 30 Menit</option>
              <option value="45" ${eta === 45 ? "selected" : ""}>± 45 Menit</option>
            </select>
          </div>
        </div>

        <div style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label style="font-size: 11.5px; font-weight: 700; color: #475569;">
              Pratinjau Pesan WhatsApp Otomatis:
            </label>
            <span style="font-size: 10.5px; color: #0284C7; font-weight: 700;">Link Live Track Aktif</span>
          </div>
          <div id="swal-enroute-msg-box" style="background: #DCFCE7; border: 1px solid #86EFAC; border-radius: 10px; padding: 10px 12px; font-size: 11.5px; color: #14532D; white-space: pre-line; line-height: 1.45; max-height: 150px; overflow-y: auto; font-family: sans-serif;">
${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </div>
        </div>

        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 8px 10px; font-size: 11px; color: #166534; display: flex; align-items: center; gap: 6px;">
          <span>📍</span>
          <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace;">${trackUrl}</span>
          <a href="${trackUrl}" target="_blank" rel="noopener noreferrer" style="color: #15803D; font-weight: 800; text-decoration: underline;">Uji Live Tracking ↗</a>
        </div>
      </div>
    `;

    swal
      .fire({
        title: options?.title || "💬 Chat WhatsApp & Kirim Live Tracking",
        html: htmlContent,
        width: "600px",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "💬 Kirim Chat & Live Track ke WA",
        denyButtonText: "📋 Salin Pesan",
        cancelButtonText: "Tutup",
        confirmButtonColor: "#25D366",
        denyButtonColor: "#0284C7",
        cancelButtonColor: "#64748B",
        didOpen: () => {
          const etaSelect = document.getElementById("swal-enroute-eta") as HTMLSelectElement;
          const msgBox = document.getElementById("swal-enroute-msg-box");
          if (etaSelect && msgBox) {
            etaSelect.onchange = () => {
              const newEta = parseInt(etaSelect.value, 10) || 15;
              const newMsg = buildCustomerEnRouteWhatsAppMessage(ticket, newEta);
              msgBox.innerText = newMsg;
            };
          }
        },
      })
      .then(async (result: any) => {
        const phoneInput = document.getElementById("swal-enroute-phone") as HTMLInputElement;
        const etaSelect = document.getElementById("swal-enroute-eta") as HTMLSelectElement;
        const targetPhone = cleanPhoneNumber(phoneInput?.value || currentPhone);
        const finalEta = parseInt(etaSelect?.value, 10) || eta;
        const finalMsg = buildCustomerEnRouteWhatsAppMessage(ticket, finalEta);

        if (result.isConfirmed) {
          sendWhatsAppDirect(targetPhone, finalMsg);
          if (options?.onClosed) options.onClosed();
        } else if (result.isDenied) {
          await copyTextToClipboard(finalMsg);
          swal.fire({
            icon: "success",
            title: "Tersalin ke Clipboard! 📋",
            text: "Teks notifikasi dan tautan live tracking telah disalin.",
            timer: 1800,
            showConfirmButton: false,
          });
          if (options?.onClosed) options.onClosed();
        } else {
          if (options?.onClosed) options.onClosed();
        }
      });
  } else {
    const ok = window.confirm(
      `Kirim notifikasi live tracking & konfirmasi penghuni ke WhatsApp pelanggan (${ticket.customer})?`
    );
    if (ok) {
      sendWhatsAppDirect(currentPhone, message);
    }
    if (options?.onClosed) options.onClosed();
  }
}

/**
 * Prompt automated modal for sending Completion & Rating WhatsApp message
 */
export function promptAutomaticCustomerCompletionWhatsApp(
  ticket: TicketForWhatsApp,
  options?: {
    title?: string;
    subtitle?: string;
    onClosed?: () => void;
  }
): void {
  const currentPhone = cleanPhoneNumber(ticket.phone);
  const message = buildCustomerCompletionWhatsAppMessage(ticket);
  const ratingUrl = generateCustomerRatingUrl(ticket.id);

  // @ts-ignore
  const swal = (typeof window !== "undefined" && (window as any).Swal) || null;

  if (swal) {
    const htmlContent = `
      <div style="text-align: left; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; font-size: 12.5px; color: #334155;">
        <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
          <div style="font-size: 26px;">🎉</div>
          <div>
            <div style="font-weight: 800; color: #065F46; font-size: 13px;">Work Order Berhasil Diselesaikan!</div>
            <div style="font-size: 11.5px; color: #047857; margin-top: 1px;">Kirimkan ringkasan hasil kerja & link penilaian bintang ke pelanggan.</div>
          </div>
        </div>

        <div style="margin-bottom: 10px;">
          <label style="display: block; font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 4px;">
            Nomor WhatsApp Pelanggan:
          </label>
          <input
            id="swal-wa-phone"
            type="text"
            value="${currentPhone}"
            placeholder="Contoh: 6281234567890"
            style="width: 100%; box-sizing: border-box; padding: 7px 10px; border-radius: 8px; border: 1.5px solid #CBD5E1; font-size: 12.5px; font-family: monospace; font-weight: 700; color: #0F172A;"
          />
        </div>

        <div style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label style="font-size: 11.5px; font-weight: 700; color: #475569;">
              Pratinjau Pesan WhatsApp Otomatis:
            </label>
            <span style="font-size: 10.5px; color: #059669; font-weight: 800;">⭐ Termasuk Link Penilaian Petugas</span>
          </div>
          <div style="background: #DCFCE7; border: 1px solid #86EFAC; border-radius: 10px; padding: 10px 12px; font-size: 11.5px; color: #14532D; white-space: pre-line; line-height: 1.45; max-height: 160px; overflow-y: auto; font-family: sans-serif;">
${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </div>
        </div>

        <div style="background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 8px 10px; font-size: 11px; color: #92400E; display: flex; align-items: center; gap: 6px;">
          <span>⭐</span>
          <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace;">${ratingUrl}</span>
          <a href="${ratingUrl}" target="_blank" rel="noopener noreferrer" style="color: #D97706; font-weight: 800; text-decoration: underline;">Uji Form Rating ↗</a>
        </div>
      </div>
    `;

    swal
      .fire({
        title: options?.title || "💬 Kirim Notifikasi Selesai & Penilaian Petugas",
        html: htmlContent,
        width: "600px",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "💬 Kirim Sekarang ke WA",
        denyButtonText: "📋 Salin Pesan",
        cancelButtonText: "Tutup",
        confirmButtonColor: "#25D366",
        denyButtonColor: "#0284C7",
        cancelButtonColor: "#64748B",
        didOpen: () => {
          const phoneInput = document.getElementById("swal-wa-phone") as HTMLInputElement;
          if (phoneInput) phoneInput.focus();
        },
      })
      .then(async (result: any) => {
        const phoneInput = document.getElementById("swal-wa-phone") as HTMLInputElement;
        const targetPhone = cleanPhoneNumber(phoneInput?.value || currentPhone);

        if (result.isConfirmed) {
          sendWhatsAppDirect(targetPhone, message);
          if (options?.onClosed) options.onClosed();
        } else if (result.isDenied) {
          await copyTextToClipboard(message);
          swal.fire({
            icon: "success",
            title: "Tersalin ke Clipboard! 📋",
            text: "Teks notifikasi dan tautan penilaian pengerjaan telah disalin.",
            timer: 1800,
            showConfirmButton: false,
          });
          if (options?.onClosed) options.onClosed();
        } else {
          if (options?.onClosed) options.onClosed();
        }
      });
  } else {
    const ok = window.confirm(
      `Work Order ${ticket.id} Selesai!\nKirim notifikasi penyelesaian & link penilaian kinerja ke pelanggan (${ticket.customer} - ${currentPhone})?`
    );
    if (ok) {
      sendWhatsAppDirect(currentPhone, message);
    }
    if (options?.onClosed) options.onClosed();
  }
}
