/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Inter-Department Ticket Comment & Update Feed Component - Aetra Air Tangerang
 */

import { DivisionId, DIVISIONS, TicketComment } from "../types/division";
import {
  addTicketComment,
  getActiveDivisionSession,
} from "../services/divisionTicketService";

export interface TicketCommentFeedOptions {
  ticketId: string;
  ticketCustomer?: string;
  initialComments?: TicketComment[];
  currentDivision?: DivisionId;
  authorName?: string;
  onCommentAdded?: (comment: TicketComment, allComments: TicketComment[]) => void;
}

export function createTicketCommentFeed(options: TicketCommentFeedOptions): HTMLElement {
  const container = document.createElement("div");
  container.className = "ticket-comment-feed-widget";
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 12px;
    padding: 14px;
    margin-top: 10px;
    box-sizing: border-box;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  `;

  let comments: TicketComment[] = options.initialComments ? [...options.initialComments] : [];

  const session = getActiveDivisionSession();
  const currentDivId: DivisionId = options.currentDivision || session?.divisionId || "minor_repair";
  const currentAuthorName: string =
    options.authorName ||
    session?.name ||
    (currentDivId === "minor_repair"
      ? "Ir. Bambang Trihatmojo (Minor Repair)"
      : "Staf Operasional Aetra");

  function formatTime(isoString: string): string {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 2) return "Baru saja";
      if (diffMins < 60) return `${diffMins} menit lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      if (diffDays < 7) return `${diffDays} hari lalu`;

      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {
      return isoString;
    }
  }

  // Header
  const header = document.createElement("div");
  header.style.cssText = "display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;";
  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">💬</span>
      <strong style="font-size: 12px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.3px;">
        Catatan & Update Lintas Divisi
      </strong>
      <span id="comment-count-badge" style="background: #0284C7; color: #FFF; font-size: 10px; font-weight: 800; padding: 1px 7px; border-radius: 10px;">
        ${comments.length}
      </span>
    </div>
    <span style="font-size: 10.5px; color: #64748B; font-weight: 600;">
      Komunikasi Antar Staf & Departemen
    </span>
  `;
  container.appendChild(header);

  // Comments List Container
  const listContainer = document.createElement("div");
  listContainer.className = "comments-list-stream";
  listContainer.style.cssText = `
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 280px;
    overflow-y: auto;
    padding-right: 4px;
  `;
  container.appendChild(listContainer);

  function renderList() {
    listContainer.innerHTML = "";
    const badgeEl = container.querySelector("#comment-count-badge");
    if (badgeEl) badgeEl.textContent = String(comments.length);

    if (comments.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.style.cssText = `
        text-align: center;
        padding: 16px 12px;
        background: #FFFFFF;
        border: 1px dashed #CBD5E1;
        border-radius: 10px;
        color: #94A3B8;
        font-size: 11.5px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      `;
      emptyState.innerHTML = `
        <span style="font-size: 20px;">📝</span>
        <span style="font-weight: 700; color: #64748B;">Belum Ada Catatan Lintas Divisi</span>
        <span style="font-size: 10.5px;">Tulis catatan atau arahan pertama di bawah untuk koordinasi dengan Customer Service, Sales Support, atau Laboratorium.</span>
      `;
      listContainer.appendChild(emptyState);
      return;
    }

    comments.forEach((c) => {
      const divMeta = DIVISIONS[c.authorDivision] || {
        name: c.authorDivision,
        icon: "🏢",
        badgeBg: "#F1F5F9",
        badgeColor: "#334155",
        borderColor: "#E2E8F0",
      };

      const card = document.createElement("div");
      card.style.cssText = `
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-left: 3.5px solid ${divMeta.badgeColor};
        border-radius: 8px;
        padding: 9px 12px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        display: flex;
        flex-direction: column;
        gap: 5px;
      `;

      // Header row
      const headRow = document.createElement("div");
      headRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;";

      const authorBadge = document.createElement("div");
      authorBadge.style.cssText = "display: flex; align-items: center; gap: 6px;";
      authorBadge.innerHTML = `
        <span style="font-size: 12px;">${divMeta.icon}</span>
        <span style="font-size: 11.5px; font-weight: 800; color: #0F172A;">${c.authorName}</span>
        <span style="font-size: 9.5px; font-weight: 700; background: ${divMeta.badgeBg}; color: ${divMeta.badgeColor}; border: 1px solid ${divMeta.borderColor}; padding: 1px 6px; border-radius: 8px;">
          ${divMeta.name.split(" ")[0]}
        </span>
      `;

      const rightMeta = document.createElement("div");
      rightMeta.style.cssText = "display: flex; align-items: center; gap: 6px;";
      rightMeta.innerHTML = `
        ${
          c.targetDepartment
            ? `<span style="font-size: 9.5px; font-weight: 700; background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; padding: 1px 6px; border-radius: 8px;">
                👉 Untuk: ${c.targetDepartment}
              </span>`
            : ""
        }
        <span style="font-size: 10px; color: #94A3B8; font-weight: 600;">${formatTime(c.createdAt)}</span>
      `;

      headRow.appendChild(authorBadge);
      headRow.appendChild(rightMeta);
      card.appendChild(headRow);

      // Comment Content
      const textBody = document.createElement("div");
      textBody.style.cssText = `
        font-size: 12px;
        color: #334155;
        line-height: 1.45;
        white-space: pre-wrap;
        word-break: break-word;
        padding-top: 2px;
      `;
      textBody.textContent = c.content;
      card.appendChild(textBody);

      listContainer.appendChild(card);
    });

    listContainer.scrollTop = listContainer.scrollHeight;
  }

  renderList();

  // Input & Form Area
  const formBox = document.createElement("div");
  formBox.style.cssText = `
    background: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 10px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  `;

  // Quick Chips
  const chipsRow = document.createElement("div");
  chipsRow.style.cssText = "display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px;";

  const QUICK_PRESETS = [
    { label: "📞 Butuh Hubungi Pelanggan", text: "Mohon tim Customer Service menghubungi pelanggan kembali untuk konfirmasi waktu kehadiran di rumah.", target: "Customer Service" },
    { label: "📦 Menunggu Bahan Pipa", text: "Pekerjaan lapangan tertunda sementara karena menunggu pengiriman stop kran & pipa PE dari gudang logistik.", target: "Customer Service" },
    { label: "💰 Rekomendasi Koreksi Billing", text: "Hasil inspeksi pipa persil tidak ada kebocoran internal, mohon Operasional Sales Support lakukan evaluasi tarif/kubikasi meter.", target: "Operasional Sales Support" },
    { label: "🔬 Rekomendasi Cek Kualitas Air", text: "Terdapat keluhan air keruh berulang di titik pelanggan, mohon tim Technical Support & Lab mengambil sampel air.", target: "Technical Support" },
    { label: "✅ Perbaikan Selesai Normal", text: "Perbaikan minor repair telah selesai dilakukan oleh tim lapangan, tekanan air kembali normal 1.8 bar.", target: "Customer Service" },
  ];

  QUICK_PRESETS.forEach((preset) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.innerText = preset.label;
    chip.style.cssText = `
      white-space: nowrap;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 12px;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    `;
    chip.onmouseenter = () => {
      chip.style.background = "#E0F2FE";
      chip.style.borderColor = "#7DD3FC";
      chip.style.color = "#0369A1";
    };
    chip.onmouseleave = () => {
      chip.style.background = "#F1F5F9";
      chip.style.borderColor = "#CBD5E1";
      chip.style.color = "#475569";
    };
    chip.onclick = () => {
      textarea.value = preset.text;
      targetSelect.value = preset.target;
      textarea.focus();
    };
    chipsRow.appendChild(chip);
  });
  formBox.appendChild(chipsRow);

  // Textarea
  const textarea = document.createElement("textarea");
  textarea.placeholder = "Tulis catatan atau arahan untuk divisi lain (CS, Sales Support, Lab)...";
  textarea.style.cssText = `
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #CBD5E1;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 12px;
    font-family: inherit;
    min-height: 54px;
    resize: vertical;
    outline: none;
    transition: border-color 0.2s ease;
  `;
  textarea.onfocus = () => {
    textarea.style.borderColor = "#0284C7";
  };
  textarea.onblur = () => {
    textarea.style.borderColor = "#CBD5E1";
  };

  formBox.appendChild(textarea);

  // Bottom action row: Target Department dropdown + Send Button
  const actionRow = document.createElement("div");
  actionRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;";

  const selectGroup = document.createElement("div");
  selectGroup.style.cssText = "display: flex; align-items: center; gap: 6px;";

  const selectLabel = document.createElement("span");
  selectLabel.innerText = "Ditujukan ke:";
  selectLabel.style.cssText = "font-size: 11px; font-weight: 700; color: #475569;";

  const targetSelect = document.createElement("select");
  targetSelect.style.cssText = `
    padding: 5px 8px;
    border-radius: 6px;
    border: 1px solid #CBD5E1;
    font-size: 11px;
    font-weight: 700;
    color: #1E293B;
    background: #FFFFFF;
    outline: none;
  `;
  targetSelect.innerHTML = `
    <option value="Customer Service">🎧 Customer Service</option>
    <option value="Operasional Sales Support">💼 Operasional Sales Support</option>
    <option value="Technical Key Account">🏢 Technical Key Account</option>
    <option value="Technical Support">🔬 Technical Support & Lab</option>
    <option value="Semua Divisi" selected>🌐 Semua Divisi (Umum)</option>
  `;

  selectGroup.appendChild(selectLabel);
  selectGroup.appendChild(targetSelect);
  actionRow.appendChild(selectGroup);

  // Post Button
  const submitBtn = document.createElement("button");
  submitBtn.type = "button";
  submitBtn.style.cssText = `
    background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%);
    color: #FFFFFF;
    border: none;
    border-radius: 8px;
    padding: 7px 14px;
    font-size: 11.5px;
    font-weight: 800;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 2px 6px rgba(2,132,199,0.25);
    transition: all 0.15s ease;
  `;
  submitBtn.innerHTML = `<span>Kirim Catatan</span> <span>➔</span>`;

  async function handleSend() {
    const text = textarea.value.trim();
    if (!text) {
      textarea.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Mengirim...</span>`;

    try {
      const newComment = await addTicketComment(options.ticketId, {
        authorName: currentAuthorName,
        authorDivision: currentDivId,
        authorRole: "Minor Repair Staf",
        content: text,
        targetDepartment: targetSelect.value,
      });

      comments.push(newComment);
      renderList();
      textarea.value = "";

      if (options.onCommentAdded) {
        options.onCommentAdded(newComment, comments);
      }

      // @ts-ignore
      if (window.Swal) {
        // @ts-ignore
        window.Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Catatan terkirim & tersinkron!",
          text: `Ditujukan ke: ${targetSelect.value}`,
          showConfirmButton: false,
          timer: 2000,
        });
      }
    } catch (err: any) {
      console.error("Error adding comment:", err);
      // @ts-ignore
      if (window.Swal) {
        // @ts-ignore
        window.Swal.fire({
          icon: "error",
          title: "Gagal Mengirim",
          text: err?.message || "Terjadi kesalahan saat menyimpan catatan.",
        });
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Kirim Catatan</span> <span>➔</span>`;
    }
  }

  submitBtn.onclick = handleSend;

  textarea.onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  actionRow.appendChild(submitBtn);
  formBox.appendChild(actionRow);
  container.appendChild(formBox);

  return container;
}
