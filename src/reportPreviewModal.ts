/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Comprehensive Report Preview, PDF Download, and Google Drive Save Modal
 */

import {
  ReportItemData,
  downloadReportPdf,
  getReportPdfBlob,
  formatDateId,
} from "./reportPdfGenerator";
import {
  signInWithGoogle,
  uploadPdfToDrive,
  getCachedAccessToken,
} from "./googleDriveService";
import { openSignaturePadModal } from "./signaturePadModal";
import { promptAutomaticCustomerCompletionWhatsApp } from "./services/customerWhatsAppNotificationService";

export interface ReportModalProps {
  item: ReportItemData;
  onUpdateItem?: (updated: ReportItemData) => void;
  onClose?: () => void;
}

export function openReportPreviewModal(props: ReportModalProps): HTMLElement {
  const currentItem = { ...props.item };

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.cssText =
    "position:fixed; inset:0; z-index:99990; background:rgba(15,23,42,0.7); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:12px; font-family:'Plus Jakarta Sans', system-ui, sans-serif;";

  const card = document.createElement("div");
  card.className = "modal-card";
  card.style.cssText =
    "background:#FFFFFF; width:100%; max-width:680px; max-height:92vh; border-radius:20px; box-shadow:0 24px 48px rgba(0,0,0,0.3); border:1px solid #CBD5E1; overflow:hidden; display:flex; flex-direction:column; animation:modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);";

  // Header
  const header = document.createElement("div");
  header.style.cssText =
    "padding:16px 20px; background:linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color:#FFFFFF; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;";

  const headerLeft = document.createElement("div");
  const headerTitle = document.createElement("h3");
  headerTitle.style.cssText = "margin:0; font-size:16px; font-weight:800; display:flex; align-items:center; gap:8px;";
  headerTitle.innerHTML = `<span>📋 Laporan Berita Acara (BAST):</span> <span style="background:rgba(255,255,255,0.25); padding:2px 8px; border-radius:6px; font-family:monospace; font-size:13px;">${currentItem.id}</span>`;

  const headerSub = document.createElement("div");
  headerSub.style.cssText = "font-size:11.5px; color:#E0F2FE; margin-top:3px;";
  headerSub.innerText = "PT Aetra Air Tangerang • Unduh format PDF & Simpan ke Google Drive";
  headerLeft.appendChild(headerTitle);
  headerLeft.appendChild(headerSub);

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✕";
  closeBtn.style.cssText =
    "background:rgba(255,255,255,0.2); border:none; color:#FFFFFF; width:30px; height:30px; border-radius:50%; font-size:15px; cursor:pointer; display:flex; align-items:center; justify-content:center;";
  closeBtn.onclick = () => {
    overlay.remove();
    if (props.onClose) props.onClose();
  };

  header.appendChild(headerLeft);
  header.appendChild(closeBtn);

  // Scrollable Body
  const body = document.createElement("div");
  body.style.cssText =
    "padding:18px 20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:16px; background:#F8FAFC;";

  function renderContent() {
    body.innerHTML = "";

    // Drive status banner if already uploaded
    if (currentItem.driveFileUrl) {
      const driveBanner = document.createElement("div");
      driveBanner.style.cssText =
        "background:#EFF6FF; border:1px solid #BFDBFE; border-radius:12px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:10px;";
      driveBanner.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:20px;">☁️</span>
          <div>
            <div style="font-size:12px; font-weight:800; color:#1E40AF;">Tersimpan di Google Drive</div>
            <div style="font-size:11px; color:#3B82F6;">File PDF laporan ini dapat diakses langsung secara online.</div>
          </div>
        </div>
        <a href="${currentItem.driveFileUrl}" target="_blank" rel="noopener noreferrer" style="background:#0284C7; color:#FFF; font-size:11.5px; font-weight:700; text-decoration:none; padding:6px 12px; border-radius:8px; display:inline-flex; align-items:center; gap:5px; white-space:nowrap;">
          📂 Buka di Google Drive ↗
        </a>
      `;
      body.appendChild(driveBanner);
    }

    // 1. Data Pelanggan Card
    const custCard = document.createElement("div");
    custCard.style.cssText =
      "background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04);";
    custCard.innerHTML = `
      <div style="font-size:12px; font-weight:800; color:#0369A1; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
        <span>👤</span> 1. DATA PELANGGAN & LOKASI
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px;">
        <div><span style="color:#64748B;">Nama Pelanggan:</span> <strong style="color:#0F172A; display:block;">${currentItem.customer || "-"}</strong></div>
        <div><span style="color:#64748B;">No. Meter / Sambungan:</span> <strong style="color:#0F172A; display:block; font-family:monospace;">${currentItem.meterId || "-"}</strong></div>
        <div><span style="color:#64748B;">No. Telepon / WA:</span> <strong style="color:#0F172A; display:block;">${currentItem.phone || "-"}</strong></div>
        <div><span style="color:#64748B;">Wilayah / Area:</span> <strong style="color:#0F172A; display:block;">${currentItem.area || "-"}</strong></div>
        <div style="grid-column:1 / -1;"><span style="color:#64748B;">Alamat Lengkap:</span> <div style="color:#0F172A; font-weight:600; margin-top:2px;">${currentItem.address || "-"}</div></div>
        <div style="grid-column:1 / -1; background:#F1F5F9; padding:8px 10px; border-radius:8px; border:1px solid #E2E8F0; font-size:11.5px;">
          <span style="font-weight:700; color:#0369A1;">[${currentItem.category}] ${currentItem.categoryLabel || "Keluhan Pelanggan"}</span>
          <div style="color:#475569; margin-top:2px;">"${currentItem.desc || "Tidak ada rincian awal"}"</div>
        </div>
      </div>
    `;
    body.appendChild(custCard);

    // 2. Laporan Penanganan Petugas Card
    const workCard = document.createElement("div");
    workCard.style.cssText =
      "background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04);";
    workCard.innerHTML = `
      <div style="font-size:12px; font-weight:800; color:#0369A1; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
        <span>🔧</span> 2. LAPORAN PENGERJAAN PETUGAS LAPANGAN
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px; margin-bottom:8px;">
        <div><span style="color:#64748B;">Petugas Pelaksana:</span> <strong style="color:#0F172A; display:block;">${currentItem.officer || "Petugas Minor Repair"}</strong></div>
        <div><span style="color:#64748B;">Waktu Penyelesaian:</span> <strong style="color:#10B981; display:block;">${formatDateId(currentItem.completedAt || new Date().toISOString())}</strong></div>
      </div>
      <div style="font-size:12px; color:#64748B; margin-bottom:4px;">Tindakan Teknis yang Dilakukan:</div>
      <div style="background:#ECFDF5; border:1px solid #A7F3D0; padding:10px 12px; border-radius:8px; font-size:12px; color:#065F46; font-weight:600; line-height:1.45;">
        ${currentItem.completionNotes || "Perbaikan kebocoran pipa, penggantian fitting, pembersihan kotoran filter, dan pengujian aliran air telah selesai dilaksanakan."}
      </div>
    `;
    body.appendChild(workCard);

    // 3. Bahan yang Digunakan Card
    const matCard = document.createElement("div");
    matCard.style.cssText =
      "background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04);";
    const mats = currentItem.usedMaterials && currentItem.usedMaterials.length > 0
      ? currentItem.usedMaterials
      : ["Lockable Straight Valve 15 mm (1 pcs)", "Seal Tape (1 pcs)"];
    matCard.innerHTML = `
      <div style="font-size:12px; font-weight:800; color:#0369A1; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
        <span>🔩</span> 3. BAHAN & MATERIAL YANG DIGUNAKAN
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:6px;">
        ${mats
          .map(
            (m) =>
              `<span style="background:#EFF6FF; border:1px solid #BFDBFE; color:#1E40AF; font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:14px; display:inline-flex; align-items:center; gap:5px;">
                <span>✓</span> ${m}
              </span>`
          )
          .join("")}
      </div>
    `;
    body.appendChild(matCard);

    // 4. Photo Before & After Card
    const photoCard = document.createElement("div");
    photoCard.style.cssText =
      "background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04);";
    const coordsDisplay = (currentItem.coords || "-6.2235, 106.5184").trim();

    photoCard.innerHTML = `
      <div style="font-size:12px; font-weight:800; color:#0369A1; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
        <span style="display:flex; align-items:center; gap:6px;"><span>📸</span> 4. DOKUMENTASI FOTO PEKERJAAN (BEFORE & AFTER)</span>
        <span style="font-size:10.5px; color:#64748B; font-weight:700;">📍 GPS: ${coordsDisplay}</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; overflow:hidden; display:flex; flex-direction:column;">
          <div style="background:#FEF2F2; color:#DC2626; font-size:11px; font-weight:800; padding:6px 10px; border-bottom:1px solid #FECACA; display:flex; justify-content:space-between;">
            <span>FOTO SEBELUM (BEFORE)</span>
            <span>🚨</span>
          </div>
          <div style="position:relative; height:140px; display:flex; align-items:center; justify-content:center; background:#0F172A08; overflow:hidden;">
            ${
              currentItem.photoBefore
                ? `<img src="${currentItem.photoBefore}" style="width:100%; height:140px; object-fit:cover;" alt="Foto Sebelum" />`
                : `<div style="font-size:11px; color:#94A3B8; text-align:center; padding:10px;">[ Foto Sebelum Belum Diunggah ]</div>`
            }
            <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(15,23,42,0.85); backdrop-filter:blur(2px); color:#FFFFFF; padding:4px 8px; font-size:10px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700; color:#FDE047;">📍 ${coordsDisplay}</span>
              <span style="font-size:9px; opacity:0.85; text-transform:uppercase;">SEBELUM</span>
            </div>
          </div>
        </div>
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; overflow:hidden; display:flex; flex-direction:column;">
          <div style="background:#ECFDF5; color:#059669; font-size:11px; font-weight:800; padding:6px 10px; border-bottom:1px solid #A7F3D0; display:flex; justify-content:space-between;">
            <span>FOTO SESUDAH (AFTER)</span>
            <span>✅</span>
          </div>
          <div style="position:relative; height:140px; display:flex; align-items:center; justify-content:center; background:#0F172A08; overflow:hidden;">
            ${
              currentItem.photoAfter
                ? `<img src="${currentItem.photoAfter}" style="width:100%; height:140px; object-fit:cover;" alt="Foto Sesudah" />`
                : `<div style="font-size:11px; color:#94A3B8; text-align:center; padding:10px;">[ Foto Sesudah Belum Diunggah ]</div>`
            }
            <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(15,23,42,0.85); backdrop-filter:blur(2px); color:#FFFFFF; padding:4px 8px; font-size:10px; display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:700; color:#86EFAC;">📍 ${coordsDisplay}</span>
              <span style="font-size:9px; opacity:0.85; text-transform:uppercase;">SESUDAH</span>
            </div>
          </div>
        </div>
      </div>
      <div style="margin-top:8px; font-size:11px; color:#475569; display:flex; align-items:center; justify-content:space-between; background:#F1F5F9; padding:6px 10px; border-radius:6px; border:1px solid #E2E8F0;">
        <span>📍 <b>Titik Koordinat Lapangan:</b> ${coordsDisplay} (${currentItem.area || "Tangerang"})</span>
        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordsDisplay)}" target="_blank" rel="noopener noreferrer" style="color:#0284C7; font-weight:700; text-decoration:none;">
          Buka Peta ↗
        </a>
      </div>
    `;
    body.appendChild(photoCard);

    // 5. E-Sign Pelanggan & Petugas Card
    const signCard = document.createElement("div");
    signCard.style.cssText =
      "background:#FFFFFF; border:1px solid #E2E8F0; border-radius:12px; padding:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04);";

    const signHeader = document.createElement("div");
    signHeader.style.cssText =
      "font-size:12px; font-weight:800; color:#0369A1; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;";
    signHeader.innerHTML = `<span>✍️ 5. TANDA TANGAN DIGITAL (E-SIGN)</span>`;

    const signGrid = document.createElement("div");
    signGrid.style.cssText = "display:grid; grid-template-columns:1fr 1fr; gap:12px;";

    // Customer Signature Box
    const custSignBox = document.createElement("div");
    custSignBox.style.cssText =
      "border:1.5px dashed #CBD5E1; border-radius:10px; padding:10px; text-align:center; background:#FAFAFA; display:flex; flex-direction:column; justify-content:space-between; min-height:140px;";

    const custSignTitle = document.createElement("div");
    custSignTitle.style.cssText = "font-size:11px; font-weight:800; color:#1E293B; margin-bottom:6px;";
    custSignTitle.innerText = "Tanda Tangan Pelanggan:";

    const custSignContent = document.createElement("div");
    custSignContent.style.cssText = "flex:1; display:flex; align-items:center; justify-content:center;";

    if (currentItem.customerSignature) {
      const img = document.createElement("img");
      img.src = currentItem.customerSignature;
      img.style.cssText = "max-width:100%; max-height:80px; object-fit:contain;";
      custSignContent.appendChild(img);
    } else {
      const emptyNote = document.createElement("div");
      emptyNote.style.cssText = "font-size:11px; color:#94A3B8; font-style:italic;";
      emptyNote.innerText = "Belum ada tanda tangan pelanggan";
      custSignContent.appendChild(emptyNote);
    }

    const custSignerName = document.createElement("div");
    custSignerName.style.cssText = "font-size:11.5px; font-weight:700; color:#0F172A; margin:6px 0;";
    custSignerName.innerText = `( ${currentItem.customerSignerName || currentItem.customer || "Nama Pelanggan"} )`;

    const signBtn = document.createElement("button");
    signBtn.type = "button";
    signBtn.innerText = currentItem.customerSignature ? "✏️ Ubah Tanda Tangan" : "✍️ Buat Tanda Tangan Pelanggan";
    signBtn.style.cssText =
      "padding:6px 12px; background:#EFF6FF; border:1px solid #BFDBFE; color:#1D4ED8; font-size:11px; font-weight:700; border-radius:6px; cursor:pointer;";
    signBtn.onclick = () => {
      openSignaturePadModal({
        title: "✍️ E-Sign Pelanggan - " + currentItem.customer,
        defaultSignerName: currentItem.customerSignerName || currentItem.customer,
        roleLabel: "Nama Pelanggan / Penerima Pekerjaan:",
        onSave: (sigUrl, signerName) => {
          currentItem.customerSignature = sigUrl;
          currentItem.customerSignerName = signerName;
          if (props.onUpdateItem) props.onUpdateItem(currentItem);
          renderContent();
        },
        onCancel: () => {},
      });
    };

    custSignBox.appendChild(custSignTitle);
    custSignBox.appendChild(custSignContent);
    custSignBox.appendChild(custSignerName);
    custSignBox.appendChild(signBtn);

    // Officer Signature Box
    const offSignBox = document.createElement("div");
    offSignBox.style.cssText =
      "border:1.5px solid #E2E8F0; border-radius:10px; padding:10px; text-align:center; background:#FAFAFA; display:flex; flex-direction:column; justify-content:space-between; min-height:140px;";

    offSignBox.innerHTML = `
      <div style="font-size:11px; font-weight:800; color:#1E293B; margin-bottom:6px;">Petugas Lapangan Aetra:</div>
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;">
        <div style="border:1.5px solid #0284C7; color:#0284C7; padding:4px 10px; border-radius:6px; font-size:10px; font-weight:800;">
          PT AETRA AIR TANGERANG<br/>
          <span style="font-size:9px; color:#059669;">✓ VERIFIED & COMPLETED</span>
        </div>
      </div>
      <div style="font-size:11.5px; font-weight:700; color:#0F172A; margin:6px 0;">( ${currentItem.officer || "Petugas Minor Repair"} )</div>
      <div style="font-size:10px; color:#10B981; font-weight:700;">🟢 Tersertifikasi Sistem</div>
    `;

    signGrid.appendChild(custSignBox);
    signGrid.appendChild(offSignBox);
    signCard.appendChild(signHeader);
    signCard.appendChild(signGrid);
    body.appendChild(signCard);

    // 6. Rating & Testimoni Pelanggan (if available)
    if ((currentItem as any).customerRating) {
      const cr = (currentItem as any).customerRating;
      const ratingCard = document.createElement("div");
      ratingCard.style.cssText =
        "background:#FFFBEB; border:1.5px solid #FDE68A; border-radius:12px; padding:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04);";

      ratingCard.innerHTML = `
        <div style="font-size:12px; font-weight:800; color:#B45309; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <span>⭐ 6. PENILAIAN & ULASAN PELANGGAN</span>
          <span style="font-size:13px; color:#D97706; font-weight:900;">${cr.rating}.0 / 5.0 ★</span>
        </div>
        <div style="background:#FFFFFF; border:1px solid #FEF3C7; border-radius:8px; padding:10px 12px; display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
            <div style="font-size:12px; font-weight:800; color:#0F172A;">
              Pelapor: ${currentItem.customer}
            </div>
            ${
              cr.awardedBadge
                ? `<span style="background:#FEF3C7; color:#92400E; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:10px; border:1px solid #FCD34D;">
                    🎖️ ${cr.awardedBadge}
                  </span>`
                : ""
            }
          </div>
          ${
            cr.feedback || cr.comments
              ? `<div style="font-size:11.5px; color:#78350F; font-style:italic; background:#FFFDF5; padding:8px 10px; border-radius:6px; border-left:3px solid #F59E0B; line-height:1.45; margin-top:2px;">
                  "${cr.feedback || cr.comments}"
                </div>`
              : `<div style="font-size:11px; color:#94A3B8; font-style:italic;">(Pelanggan tidak mengisi komentar tambahan)</div>`
          }
        </div>
      `;
      body.appendChild(ratingCard);
    }
  }

  renderContent();

  // Footer Actions
  const footer = document.createElement("div");
  footer.style.cssText =
    "padding:14px 20px; background:#FFFFFF; border-top:1px solid #E2E8F0; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; flex-shrink:0;";

  const footerLeft = document.createElement("div");
  footerLeft.style.cssText = "display:flex; align-items:center; gap:8px;";

  const closeFooterBtn = document.createElement("button");
  closeFooterBtn.type = "button";
  closeFooterBtn.innerText = "Tutup";
  closeFooterBtn.style.cssText =
    "padding:8px 14px; background:#F1F5F9; border:1px solid #CBD5E1; border-radius:8px; font-size:12px; font-weight:700; color:#475569; cursor:pointer;";
  closeFooterBtn.onclick = () => {
    overlay.remove();
    if (props.onClose) props.onClose();
  };
  footerLeft.appendChild(closeFooterBtn);

  const footerRight = document.createElement("div");
  footerRight.style.cssText = "display:flex; align-items:center; gap:8px;";

  // Download PDF Button
  const downloadBtn = document.createElement("button");
  downloadBtn.type = "button";
  downloadBtn.innerHTML = `<span>⬇️</span> <span>Unduh PDF (BAST)</span>`;
  downloadBtn.style.cssText =
    "padding:9px 16px; background:#0284C7; border:none; border-radius:8px; font-size:12.5px; font-weight:800; color:#FFFFFF; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 6px rgba(2,132,199,0.3); transition:all 0.15s ease;";
  downloadBtn.onclick = () => {
    try {
      const filename = downloadReportPdf(currentItem);
      // @ts-ignore
      if (window.Swal) {
        // @ts-ignore
        window.Swal.fire({
          icon: "success",
          title: "PDF Berhasil Diunduh!",
          html: `<div style="font-size:13px;">File dokumen <b>${filename}</b> telah tersimpan di perangkat Anda.</div>`,
          timer: 2400,
          showConfirmButton: false,
        });
      }
    } catch (e: any) {
      alert(`Gagal membuat PDF: ${e.message}`);
    }
  };

  // Save to Google Drive Button
  const driveBtn = document.createElement("button");
  driveBtn.type = "button";
  driveBtn.innerHTML = `<span>☁️</span> <span>Simpan ke Google Drive</span>`;
  driveBtn.style.cssText =
    "padding:9px 16px; background:linear-gradient(135deg, #10B981 0%, #059669 100%); border:none; border-radius:8px; font-size:12.5px; font-weight:800; color:#FFFFFF; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 6px rgba(16,185,129,0.35); transition:all 0.15s ease;";

  driveBtn.onclick = async () => {
    driveBtn.disabled = true;
    driveBtn.innerHTML = `<span>⏳</span> <span>Menyiapkan Google Drive...</span>`;

    try {
      let token = getCachedAccessToken();
      if (!token) {
        // Trigger Google Auth popup
        const authResult = await signInWithGoogle();
        if (!authResult || !authResult.accessToken) {
          throw new Error("Otorisasi Google Drive dibatalkan.");
        }
        token = authResult.accessToken;
      }

      driveBtn.innerHTML = `<span>📤</span> <span>Mengunggah PDF ke Drive...</span>`;

      // Generate PDF Blob
      const pdfBlob = getReportPdfBlob(currentItem);
      const safeCustomer = (currentItem.customer || "Pelanggan").replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `BAST_${currentItem.id}_${safeCustomer}.pdf`;

      // Upload to Drive
      const uploadResult = await uploadPdfToDrive(pdfBlob, filename, token);

      currentItem.driveFileUrl = uploadResult.webViewLink;
      if (props.onUpdateItem) {
        props.onUpdateItem(currentItem);
      }

      renderContent();

      // Show success popup with link to open in Google Drive
      // @ts-ignore
      if (window.Swal) {
        // @ts-ignore
        window.Swal.fire({
          icon: "success",
          title: "Tersimpan di Google Drive! ☁️",
          html: `
            <div style="font-size:13px; line-height:1.5; color:#334155; margin-bottom:12px;">
              Dokumen PDF <b>${filename}</b> berhasil di-upload ke folder <b>"Laporan Minor Repair - Aetra Air Tangerang"</b> di Google Drive Anda.
            </div>
            <a href="${uploadResult.webViewLink}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:6px; background:#0284C7; color:#FFFFFF; padding:9px 16px; border-radius:8px; text-decoration:none; font-weight:800; font-size:13px; box-shadow:0 2px 8px rgba(2,132,199,0.35);">
              📂 Buka di Google Drive ↗
            </a>
          `,
          showConfirmButton: false,
          showCloseButton: true,
        });
      } else {
        window.open(uploadResult.webViewLink, "_blank");
      }
    } catch (err: any) {
      console.error("Drive upload failed", err);
      // @ts-ignore
      if (window.Swal) {
        // @ts-ignore
        window.Swal.fire({
          icon: "error",
          title: "Gagal Menyimpan ke Google Drive",
          text: err.message || "Terjadi kesalahan saat menghubungkan ke Google Drive.",
        });
      } else {
        alert(err.message || "Gagal menyimpan ke Google Drive");
      }
    } finally {
      driveBtn.disabled = false;
      driveBtn.innerHTML = `<span>☁️</span> <span>Simpan ke Google Drive</span>`;
    }
  };

  // Send WhatsApp Notification to Customer
  const waBtn = document.createElement("button");
  waBtn.type = "button";
  waBtn.innerHTML = `<span>💬</span> <span>Kirim WA Pelanggan</span>`;
  waBtn.style.cssText =
    "padding:9px 16px; background:linear-gradient(135deg, #25D366 0%, #128C7E 100%); border:none; border-radius:8px; font-size:12.5px; font-weight:800; color:#FFFFFF; cursor:pointer; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 6px rgba(37,211,102,0.35); transition:all 0.15s ease;";
  waBtn.onclick = () => {
    promptAutomaticCustomerCompletionWhatsApp(currentItem as any);
  };

  footerRight.appendChild(waBtn);
  footerRight.appendChild(downloadBtn);
  footerRight.appendChild(driveBtn);

  footer.appendChild(footerLeft);
  footer.appendChild(footerRight);

  card.appendChild(header);
  card.appendChild(body);
  card.appendChild(footer);
  overlay.appendChild(card);

  document.body.appendChild(overlay);
  return overlay;
}
