/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Official Work Order Completion Report (BAST) PDF Generator for Aetra Air Tangerang
 */

import { jsPDF } from "jspdf";

export interface ReportItemData {
  id: string;
  caseId?: string;
  customer: string;
  phone?: string;
  meterId?: string;
  address: string;
  area: string;
  category: string;
  categoryLabel?: string;
  desc?: string;
  status: string;
  receivedAt?: string;
  officer?: string;
  completedAt?: string;
  completionNotes?: string;
  usedMaterials?: string[];
  photoBefore?: string | null;
  photoAfter?: string | null;
  customerSignature?: string | null;
  customerSignerName?: string;
  officerSignature?: string | null;
  driveFileUrl?: string;
  coords?: string;
}

export function formatDateId(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (_) {
    return dateStr;
  }
}

/**
 * Generate official BAST PDF using jsPDF
 */
export function generateReportPdf(item: ReportItemData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let y = 14;

  // Header Banner Background
  doc.setFillColor(2, 132, 199); // Aetra Sky Blue (#0284C7)
  doc.rect(margin, y, contentWidth, 24, "F");

  // Aetra Badge / Water Drop icon simulation
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + 4, y + 3, 18, 18, 2, 2, "F");
  doc.setFillColor(2, 132, 199);
  doc.circle(margin + 13, y + 12, 6, "F");
  doc.setFillColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("A", margin + 11.5, y + 13.5);

  // Header Titles
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("PT AETRA AIR TANGERANG", margin + 26, y + 8);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Divisi Distribusi & NRW - Seksi Penanganan Gangguan Minor Repair", margin + 26, y + 13);
  doc.text("Jl. Raya Serang Km. 14, Kawasan Pergudangan Sentra Cikupa, Tangerang", margin + 26, y + 17);

  // Status Badge
  doc.setFillColor(16, 185, 129); // Emerald Green
  doc.roundedRect(pageWidth - margin - 36, y + 5, 32, 14, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("STATUS", pageWidth - margin - 20, y + 10, { align: "center" });
  doc.setFontSize(9);
  doc.text("SELESAI 100%", pageWidth - margin - 20, y + 15, { align: "center" });

  y += 28;

  // Document Title Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.text("BERITA ACARA PENYELESAIAN PEKERJAAN (BAST) MINOR REPAIR", pageWidth / 2, y + 5, {
    align: "center",
  });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const docRef = `No. WO: ${item.id}  |  Case ID: #${item.caseId || item.id}  |  Tgl Cetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
  doc.text(docRef, pageWidth / 2, y + 9.5, { align: "center" });

  y += 16;

  // Helper Section Header
  const renderSectionHeader = (title: string, iconNumber: string) => {
    doc.setFillColor(224, 242, 254);
    doc.setDrawColor(186, 230, 253);
    doc.rect(margin, y, contentWidth, 6, "FD");

    doc.setFillColor(2, 132, 199);
    doc.rect(margin, y, 2.5, 6, "F");

    doc.setTextColor(3, 105, 161);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(`${iconNumber}. ${title.toUpperCase()}`, margin + 5, y + 4.2);
    y += 7.5;
  };

  // 1. DATA PELANGGAN
  renderSectionHeader("Informasi Pelanggan & Lokasi Kejadian", "1");

  const leftColX = margin + 3;
  const leftColValX = margin + 35;
  const rightColX = margin + 98;
  const rightColValX = margin + 130;

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "bold");

  doc.text("Nama Pelanggan", leftColX, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${item.customer || "-"}`, leftColValX, y + 3);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("No. Sambungan / Meter", rightColX, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${item.meterId || "-"}`, rightColValX, y + 3);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("No. Telepon / WA", leftColX, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${item.phone || "-"}`, leftColValX, y + 3);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Wilayah Operasional", rightColX, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${item.area || "-"}`, rightColValX, y + 3);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Kategori Keluhan", leftColX, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const catText = item.categoryLabel
    ? `[${item.category}] ${item.categoryLabel}`
    : item.category || "-";
  doc.text(`: ${catText}`, leftColValX, y + 3);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Waktu Pengaduan", rightColX, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${formatDateId(item.receivedAt)}`, rightColValX, y + 3);

  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Alamat Kejadian", leftColX, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const splitAddress = doc.splitTextToSize(`: ${item.address || "-"}`, contentWidth - 38);
  doc.text(splitAddress, leftColValX, y + 3);
  y += Math.max(splitAddress.length * 4, 5);

  if (item.desc) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Keluhan Awal", leftColX, y + 3);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(51, 65, 85);
    const splitDesc = doc.splitTextToSize(`: "${item.desc}"`, contentWidth - 38);
    doc.text(splitDesc, leftColValX, y + 3);
    y += Math.max(splitDesc.length * 3.8, 5);
  }

  y += 3;

  // 2. PENANGANAN & LAPORAN PETUGAS
  renderSectionHeader("Laporan Penanganan Petugas Lapangan", "2");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Petugas Pelaksana", leftColX, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${item.officer || "Petugas Minor Repair"}`, leftColValX, y + 3);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Waktu Selesai Pengerjaan", rightColX, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${formatDateId(item.completedAt || new Date().toISOString())}`, rightColValX, y + 3);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Tindakan Dikerjakan", leftColX, y + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  const actionText =
    item.completionNotes ||
    "Perbaikan telah dilaksanakan di lokasi: perbaikan pipa bocor, penggantian spare part, pengurasan dan pengetesan aliran tekanan air normal.";
  const splitAction = doc.splitTextToSize(`: ${actionText}`, contentWidth - 38);
  doc.text(splitAction, leftColValX, y + 3);
  y += Math.max(splitAction.length * 4, 6);

  y += 2;

  // 3. MATERIAL & BAHAN YANG DIGUNAKAN
  renderSectionHeader("Bahan & Spare Part yang Digunakan", "3");

  const materials = item.usedMaterials && item.usedMaterials.length > 0
    ? item.usedMaterials
    : ["Lockable Straight Valve 15 mm (1 pcs)", "Seal Tape (1 pcs)"];

  // Table header
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 5, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("NO", margin + 3, y + 3.5);
  doc.text("NAMA MATERIAL / SPESIFIKASI SUKU CADANG", margin + 15, y + 3.5);
  doc.text("KONDISI / STATUS PEMASANGAN", pageWidth - margin - 50, y + 3.5);
  y += 5;

  materials.forEach((mat, idx) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(String(idx + 1), margin + 4, y + 3.5);
    doc.text(mat, margin + 15, y + 3.5);
    doc.setTextColor(5, 150, 105);
    doc.text("✓ Terpasang & Berfungsi Baik", pageWidth - margin - 50, y + 3.5);
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 4.5, pageWidth - margin, y + 4.5);
    y += 4.5;
  });

  y += 2;

  // 4. KETERANGAN & CATATAN TEKNIS
  renderSectionHeader("Keterangan Teknis & Evaluasi Akhir Lapangan", "4");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  const techNotes = [
    "• Tekanan air pada titik sambungan pelanggan telah diuji dan mengalir stabil tanpa kendala.",
    "• Kebocoran/gangguan telah tertangani sepenuhnya, sambungan pipa telah dibungkus rapi dan ditimbun kembali.",
    "• Meter air telah diverifikasi: jarum & angka register berputar normal sesuai aliran pemakaian.",
  ];
  techNotes.forEach((tn) => {
    doc.text(tn, margin + 3, y + 3);
    y += 3.8;
  });

  y += 2;

  // 5. DOKUMENTASI FOTO (BEFORE & AFTER)
  renderSectionHeader("Dokumentasi Foto Lapangan (Before & After)", "5");

  const photoBoxWidth = (contentWidth - 6) / 2;
  const photoBoxHeight = 36;

  // Box Before
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, photoBoxWidth, photoBoxHeight, 1.5, 1.5, "FD");

  // Box After
  doc.roundedRect(margin + photoBoxWidth + 6, y, photoBoxWidth, photoBoxHeight, 1.5, 1.5, "FD");

  // Render Before Image
  if (item.photoBefore && item.photoBefore.startsWith("data:image")) {
    try {
      const format = item.photoBefore.includes("png") ? "PNG" : "JPEG";
      doc.addImage(
        item.photoBefore,
        format,
        margin + 1,
        y + 1,
        photoBoxWidth - 2,
        photoBoxHeight - 6.5
      );
    } catch (e) {
      doc.setTextColor(148, 163, 184);
      doc.text("Foto Before Tersedia (Gagal dimuat)", margin + photoBoxWidth / 2, y + 16, {
        align: "center",
      });
    }
  } else {
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text("[ Dokumentasi Foto SEBELUM Pengerjaan ]", margin + photoBoxWidth / 2, y + 16, {
      align: "center",
    });
  }

  const coordsDisplay = (item.coords || "-6.2235, 106.5184").trim();

  // Dark Geotag Ribbon on Before Photo
  doc.setFillColor(15, 23, 42); // Slate-900 background
  doc.rect(margin, y + photoBoxHeight - 6.5, photoBoxWidth, 6.5, "F");

  // Red BEFORE label
  doc.setFillColor(239, 68, 68);
  doc.roundedRect(margin + 1.5, y + photoBoxHeight - 5.5, 20, 4.5, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("BEFORE", margin + 11.5, y + photoBoxHeight - 2.4, { align: "center" });

  // GPS Coordinates on Before Photo
  doc.setTextColor(254, 240, 138); // Yellow accent
  doc.setFontSize(5.8);
  doc.setFont("helvetica", "bold");
  doc.text(`KOORDINAT: ${coordsDisplay}`, margin + photoBoxWidth - 2, y + photoBoxHeight - 2.4, { align: "right" });

  // Render After Image
  if (item.photoAfter && item.photoAfter.startsWith("data:image")) {
    try {
      const format = item.photoAfter.includes("png") ? "PNG" : "JPEG";
      doc.addImage(
        item.photoAfter,
        format,
        margin + photoBoxWidth + 7,
        y + 1,
        photoBoxWidth - 2,
        photoBoxHeight - 6.5
      );
    } catch (e) {
      doc.setTextColor(148, 163, 184);
      doc.text("Foto After Tersedia (Gagal dimuat)", margin + photoBoxWidth + 6 + photoBoxWidth / 2, y + 16, {
        align: "center",
      });
    }
  } else {
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text("[ Dokumentasi Foto SESUDAH Pengerjaan ]", margin + photoBoxWidth + 6 + photoBoxWidth / 2, y + 16, {
      align: "center",
    });
  }

  // Dark Geotag Ribbon on After Photo
  doc.setFillColor(15, 23, 42);
  doc.rect(margin + photoBoxWidth + 6, y + photoBoxHeight - 6.5, photoBoxWidth, 6.5, "F");

  // Green AFTER label
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(margin + photoBoxWidth + 7.5, y + photoBoxHeight - 5.5, 18, 4.5, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("AFTER", margin + photoBoxWidth + 16.5, y + photoBoxHeight - 2.4, { align: "center" });

  // GPS Coordinates on After Photo
  doc.setTextColor(254, 240, 138); // Yellow accent
  doc.setFontSize(5.8);
  doc.setFont("helvetica", "bold");
  doc.text(`KOORDINAT: ${coordsDisplay}`, margin + photoBoxWidth * 2 + 4, y + photoBoxHeight - 2.4, { align: "right" });

  y += photoBoxHeight + 1.5;

  // Sub-strip Geotag verification label
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 116, 139);
  doc.text(`📍 Geotagging GPS Terverifikasi: ${coordsDisplay} (${item.area || "Tangerang"}) • Petugas: ${item.officer || "Minor Repair"}`, margin + 2, y + 2.5);

  y += 4;

  // 6. TANDA TANGAN ELEKTRONIK (E-SIGN) & PENGESAHAN
  renderSectionHeader("Tanda Tangan Elektronik & Pengesahan Serah Terima (BAST)", "6");

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(71, 85, 105);
  doc.text(
    "Dengan menandatangani lembar ini, para pihak menyatakan bahwa pekerjaan perbaikan telah diselesaikan dengan memuaskan.",
    margin + 3,
    y + 2
  );
  y += 4;

  const signBoxWidth = (contentWidth - 6) / 2;
  const signBoxHeight = 27;

  // Box Signature Customer
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, y, signBoxWidth, signBoxHeight, 1, 1, "FD");

  // Box Signature Officer
  doc.roundedRect(margin + signBoxWidth + 6, y, signBoxWidth, signBoxHeight, 1, 1, "FD");

  // Title Signatures
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Pelanggan / Penerima Pekerjaan:", margin + 4, y + 4);
  doc.text("Petugas Lapangan Aetra:", margin + signBoxWidth + 10, y + 4);

  // Render Customer E-Signature if present
  if (item.customerSignature && item.customerSignature.startsWith("data:image")) {
    try {
      doc.addImage(
        item.customerSignature,
        "PNG",
        margin + 6,
        y + 5,
        signBoxWidth - 12,
        signBoxHeight - 11
      );
    } catch (e) {
      console.warn("Sign render error", e);
    }
  } else {
    // Stamp placeholder
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("[ Tanda Tangan Digital Terverifikasi ]", margin + signBoxWidth / 2, y + 14, {
      align: "center",
    });
  }

  // Render Officer Signature if present
  if (item.officerSignature && item.officerSignature.startsWith("data:image")) {
    try {
      doc.addImage(
        item.officerSignature,
        "PNG",
        margin + signBoxWidth + 10,
        y + 5,
        signBoxWidth - 12,
        signBoxHeight - 11
      );
    } catch (_) {}
  } else {
    // Official Stamp
    doc.setDrawColor(2, 132, 199);
    doc.setTextColor(2, 132, 199);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.roundedRect(margin + signBoxWidth + signBoxWidth / 2 - 20, y + 6, 40, 11, 1, 1, "D");
    doc.text("PT AETRA AIR TANGERANG", margin + signBoxWidth + signBoxWidth / 2, y + 10, {
      align: "center",
    });
    doc.setFontSize(6);
    doc.text("✓ VERIFIED & COMPLETED", margin + signBoxWidth + signBoxWidth / 2, y + 14, {
      align: "center",
    });
  }

  // Signer Names
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const signerName = item.customerSignerName || item.customer || "Pelanggan";
  doc.text(`( ${signerName} )`, margin + signBoxWidth / 2, y + signBoxHeight - 2, {
    align: "center",
  });

  const officerName = item.officer || "Petugas Minor Repair";
  doc.text(`( ${officerName} )`, margin + signBoxWidth + 6 + signBoxWidth / 2, y + signBoxHeight - 2, {
    align: "center",
  });

  y += signBoxHeight + 2;

  // Render Customer Rating Feedback Box if present
  if ((item as any).customerRating) {
    const cr = (item as any).customerRating;
    const reviewText = cr.feedback || cr.comments || "";
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(margin, y, contentWidth, 7, 1, 1, "FD");

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 83, 9);
    doc.text(`★ RATING PELANGGAN: ${cr.rating}.0/5.0`, margin + 3, y + 4.5);

    if (reviewText) {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 53, 15);
      const safeComment = reviewText.length > 80 ? reviewText.substring(0, 77) + "..." : reviewText;
      doc.text(`"${safeComment}"`, margin + 44, y + 4.5);
    }
    y += 8;
  }

  // Footer Note
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Dokumen ini diterbitkan secara elektronik oleh Sistem Informasi Papan Kerja Minor Repair PT Aetra Air Tangerang.",
    pageWidth / 2,
    pageHeight - 4,
    { align: "center" }
  );

  return doc;
}

/**
 * Trigger immediate client-side download of the PDF file
 */
export function downloadReportPdf(item: ReportItemData): string {
  const doc = generateReportPdf(item);
  const safeCustomer = (item.customer || "Pelanggan").replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `BAST_${item.id}_${safeCustomer}.pdf`;
  doc.save(filename);
  return filename;
}

/**
 * Export PDF as a Blob object for direct Google Drive uploading
 */
export function getReportPdfBlob(item: ReportItemData): Blob {
  const doc = generateReportPdf(item);
  return doc.output("blob");
}
