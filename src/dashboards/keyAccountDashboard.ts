/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Technical Key Account (TKA) Dashboard - Aetra Air Tangerang
 */

import {
  UnifiedTicket,
  loadAllUnifiedTickets,
  saveSingleTicket,
} from "../services/divisionTicketService";
import { openReportPreviewModal } from "../reportPreviewModal";
import { isViewItemVisible } from "../services/dashboardVisibilityService";
import { promptAutomaticCustomerCompletionWhatsApp } from "../services/customerWhatsAppNotificationService";

export function renderKeyAccountDashboard(container: HTMLElement): () => void {
  let tickets: UnifiedTicket[] = loadAllUnifiedTickets().filter(
    (t) => t.targetDivision === "key_account"
  );
  let filterStatus: "all" | "baru" | "proses" | "selesai" = "all";
  let searchQuery = "";

  function refresh() {
    tickets = loadAllUnifiedTickets().filter((t) => t.targetDivision === "key_account");
    render();
  }

  function handleProcessTicket(ticket: UnifiedTicket) {
    // @ts-ignore
    if (!window.Swal) return;

    // @ts-ignore
    window.Swal.fire({
      title: `🏢 Tindakan Key Account Industri: ${ticket.id}`,
      html: `
        <div style="text-align:left; font-size:12px; color:#334155; display:flex; flex-direction:column; gap:10px;">
          <div><b>Pelanggan Industri:</b> ${ticket.customer}</div>
          <div><b>No. Meter / Pipa:</b> ${ticket.meterId} (${ticket.address})</div>
          <div><b>Keluhan:</b> [${ticket.category}] ${ticket.desc || ""}</div>
          <div>
            <label style="font-weight:700; display:block; margin-bottom:4px;">Status Penanganan Lapangan Industri:</label>
            <select id="tka-status" style="width:100%; padding:8px; border-radius:6px; border:1px solid #CBD5E1; font-weight:700; font-size:12px;">
              <option value="proses" ${ticket.status === "proses" ? "selected" : ""}>⚙️ Dalam Penanganan Tim Teknis Industri</option>
              <option value="selesai" ${ticket.status === "selesai" ? "selected" : ""}>✅ Selesai (Tekanan & Suplai Normal Kembali)</option>
              <option value="baru" ${ticket.status === "baru" ? "selected" : ""}>⏳ Baru Diterima</option>
            </select>
          </div>
          <div>
            <label style="font-weight:700; display:block; margin-bottom:4px;">Lead Engineer / PIC Penugasan:</label>
            <input id="tka-pic" type="text" value="${ticket.divisionAssignee || "H. Rudi Hartono (Senior TKA)"}" style="width:100%; box-sizing:border-box; padding:8px; border-radius:6px; border:1px solid #CBD5E1; font-size:12px;" />
          </div>
          <div>
            <label style="font-weight:700; display:block; margin-bottom:4px;">Catatan Penanganan Teknis Industri & Tekanan Bar:</label>
            <textarea id="tka-notes" placeholder="Contoh: Pipa transmisi 4 inch telah dibersihkan dari kerak sedimentasi. Tekanan outlet stabil pada 3.2 bar. Pengisian boiler pabrik kembali normal." style="width:100%; box-sizing:border-box; padding:8px; border-radius:6px; border:1px solid #CBD5E1; min-height:60px; font-size:12px;">${ticket.divisionActionNotes || ""}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "💾 Simpan Hasil Penanganan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#7C3AED",
      preConfirm: () => {
        const statEl = document.getElementById("tka-status") as HTMLSelectElement;
        const picEl = document.getElementById("tka-pic") as HTMLInputElement;
        const notesEl = document.getElementById("tka-notes") as HTMLTextAreaElement;
        return {
          newStatus: statEl.value as any,
          newPic: picEl.value,
          newNotes: notesEl.value,
        };
      },
    }).then(async (res: any) => {
      if (res.isConfirmed && res.value) {
        ticket.status = res.value.newStatus;
        ticket.divisionAssignee = res.value.newPic;
        ticket.divisionActionNotes = res.value.newNotes;
        if (res.value.newNotes && res.value.newNotes.trim()) {
          if (!ticket.comments) ticket.comments = [];
          ticket.comments.push({
            id: `cmt-${Date.now().toString().slice(-6)}`,
            authorName: res.value.newPic || "H. Rudi Hartono (Senior TKA)",
            authorDivision: "key_account",
            authorRole: "Technical Key Account",
            targetDepartment: "Semua Divisi",
            content: res.value.newNotes.trim(),
            createdAt: new Date().toISOString(),
          });
        }
        if (res.value.newStatus === "selesai") {
          ticket.completedAt = new Date().toISOString();
          ticket.completionNotes = res.value.newNotes || "Penanganan teknis suplai air industri telah diselesaikan dan tekanan normal.";
        }
        await saveSingleTicket(ticket);
        refresh();

        if (res.value.newStatus === "selesai") {
          promptAutomaticCustomerCompletionWhatsApp(ticket as any);
        } else {
          // @ts-ignore
          window.Swal.fire({
            icon: "success",
            title: "Laporan Key Account Disimpan",
            text: `Update status WO ${ticket.id} telah disinkronkan ke Customer Service.`,
            timer: 1600,
            showConfirmButton: false,
          });
        }
      }
    });
  }

  function render() {
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "max-width: 1520px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 16px;";

    if (isViewItemVisible("key_account", "tka_header_banner")) {
      const banner = document.createElement("div");
      banner.style.cssText = "background: linear-gradient(135deg, #F5F3FF 0%, #FFFFFF 100%); border: 1.5px solid #DDD6FE; border-radius: 14px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;";
      banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: #7C3AED; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 22px;">
            🏢
          </div>
          <div>
            <div style="font-size: 15px; font-weight: 800; color: #4C1D95;">Portal Technical Key Account (TKA Industri)</div>
            <div style="font-size: 11.5px; color: #6D28D9; font-weight: 500;">
              Penanganan debit besar, tekanan bar suplai industri, dan pipa transmisi kawasan komersial.
            </div>
          </div>
        </div>
      `;
      wrapper.appendChild(banner);
    }

    const total = tickets.length;
    const baruCount = tickets.filter((t) => t.status === "baru").length;
    const prosesCount = tickets.filter((t) => t.status === "proses").length;
    const selesaiCount = tickets.filter((t) => t.status === "selesai").length;

    // Stats
    if (isViewItemVisible("key_account", "tka_stats_cards")) {
      const statsRow = document.createElement("div");
      statsRow.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;";

      const stats = [
        { label: "Total Pelanggan Industri", count: total, icon: "🏢", color: "#7C3AED", bg: "#F5F3FF" },
        { label: "Kritis / Menunggu Respons", count: baruCount, icon: "🚨", color: "#DC2626", bg: "#FEF2F2" },
        { label: "Investigasi & Pengerjaan TKA", count: prosesCount, icon: "⚙️", color: "#2563EB", bg: "#EFF6FF" },
        { label: "Suplai Pulih (Selesai)", count: selesaiCount, icon: "✅", color: "#10B981", bg: "#ECFDF5" },
      ];

      stats.forEach((s) => {
        const card = document.createElement("div");
        card.style.cssText = "background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; display: flex; align-items: center; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);";
        card.innerHTML = `
          <div style="width: 42px; height: 42px; border-radius: 10px; background: ${s.bg}; color: ${s.color}; display: flex; align-items: center; justify-content: center; font-size: 20px;">
            ${s.icon}
          </div>
          <div>
            <div style="font-size: 11px; font-weight: 700; color: #64748B;">${s.label}</div>
            <div style="font-size: 20px; font-weight: 900; color: #0F172A;">${s.count}</div>
          </div>
        `;
        statsRow.appendChild(card);
      });
      wrapper.appendChild(statsRow);
    }

    // Filter Bar
    if (isViewItemVisible("key_account", "tka_filter_tabs")) {
      const filterRow = document.createElement("div");
      filterRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;";

      const filterTabs = document.createElement("div");
      filterTabs.style.cssText = "display: flex; gap: 4px; background: #FFFFFF; padding: 4px; border-radius: 10px; border: 1px solid #E2E8F0;";

      const tabs: { id: typeof filterStatus; label: string; count: number }[] = [
        { id: "all", label: "Semua Kawasan Industri", count: total },
        { id: "baru", label: "🚨 Kritis / Baru", count: baruCount },
        { id: "proses", label: "⚙️ Sedang Dikerjakan", count: prosesCount },
        { id: "selesai", label: "✅ Selesai", count: selesaiCount },
      ];

      tabs.forEach((tb) => {
        const btn = document.createElement("button");
        btn.type = "button";
        const isActive = filterStatus === tb.id;
        btn.style.cssText = `
          padding: 6px 14px;
          font-size: 11.5px;
          font-weight: 700;
          border-radius: 8px;
          border: none;
          background: ${isActive ? "#7C3AED" : "transparent"};
          color: ${isActive ? "#FFFFFF" : "#64748B"};
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        `;
        btn.innerHTML = `<span>${tb.label}</span> <span style="background: ${isActive ? "rgba(255,255,255,0.25)" : "#F1F5F9"}; padding: 1px 6px; border-radius: 10px; font-size: 10px;">${tb.count}</span>`;
        btn.onclick = () => {
          filterStatus = tb.id;
          render();
        };
        filterTabs.appendChild(btn);
      });

      const search = document.createElement("input");
      search.type = "text";
      search.placeholder = "🔍 Cari pabrik, industri, meteran...";
      search.value = searchQuery;
      search.style.cssText = "padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; width: 280px;";
      search.oninput = (e: any) => {
        searchQuery = e.target.value;
        render();
      };

      filterRow.appendChild(filterTabs);
      filterRow.appendChild(search);
      wrapper.appendChild(filterRow);
    }

    // List
    let filtered = tickets;
    if (filterStatus !== "all") {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.customer.toLowerCase().includes(q) ||
          t.meterId.toLowerCase().includes(q) ||
          t.desc.toLowerCase().includes(q)
      );
    }

    const tableCard = document.createElement("div");
    tableCard.style.cssText = "background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.03);";

    if (filtered.length === 0) {
      tableCard.innerHTML = `<div style="text-align: center; padding: 40px; color: #94A3B8;">Tidak ada tiket industri pada kategori ini.</div>`;
    } else {
      const table = document.createElement("table");
      table.style.cssText = "width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;";
      table.innerHTML = `
        <thead>
          <tr style="background: #F8FAFC; border-bottom: 1.5px solid #E2E8F0; color: #475569; font-size: 11px; text-transform: uppercase;">
            <th style="padding: 10px 14px;">No. WO / Prioritas</th>
            <th style="padding: 10px 14px;">Perusahaan / Pabrik</th>
            <th style="padding: 10px 14px;">Gangguan Suplai Industri</th>
            <th style="padding: 10px 14px;">Instruksi CS</th>
            <th style="padding: 10px 14px;">Tindakan Engineer TKA</th>
            <th style="padding: 10px 14px; text-align: right;">Aksi Key Account</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector("tbody")!;
      filtered.forEach((t) => {
        const tr = document.createElement("tr");
        tr.style.cssText = "border-bottom: 1px solid #F1F5F9;";
        const isDone = t.status === "selesai";

        tr.innerHTML = `
          <td style="padding: 12px 14px; vertical-align: top;">
            <div style="font-weight: 800; color: #7C3AED; font-family: monospace;">${t.id}</div>
            <span style="font-size: 9.5px; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 1px 6px; border-radius: 4px; display: inline-block; margin-top: 3px; font-weight: 800;">
              SLA < 24 JAM
            </span>
          </td>
          <td style="padding: 12px 14px; vertical-align: top;">
            <div style="font-weight: 800; color: #0F172A; font-size: 13px;">${t.customer}</div>
            <div style="font-size: 11px; color: #64748B; font-family: monospace;">MTR-IND: ${t.meterId}</div>
            <div style="font-size: 11px; color: #475569;">📍 ${t.address} (${t.area})</div>
          </td>
          <td style="padding: 12px 14px; vertical-align: top; max-width: 240px;">
            <span style="background: #F5F3FF; border: 1px solid #DDD6FE; color: #7C3AED; font-weight: 800; font-size: 10.5px; padding: 2px 6px; border-radius: 6px;">
              ${t.category}
            </span>
            <div style="font-size: 11px; color: #475569; margin-top: 3px; line-height: 1.35;">
              "${t.desc}"
            </div>
          </td>
          <td style="padding: 12px 14px; vertical-align: top; font-size: 11px; color: #64748B; max-width: 180px;">
            ${t.distributionNotes ? `"${t.distributionNotes}"` : "-"}
          </td>
          <td style="padding: 12px 14px; vertical-align: top;">
            <span style="font-size: 10.5px; font-weight: 800; padding: 3px 8px; border-radius: 12px; display: inline-block; ${
              isDone
                ? "background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0;"
                : "background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;"
            }">
              ${isDone ? "✅ SUPLAI NORMAL" : "⚙️ TIM DI LOKASI"}
            </span>
            <div style="font-size: 11px; color: #0F172A; margin-top: 4px; font-weight: 600;">
              ${t.divisionActionNotes || "Sedang investigasi debit & tekanan"}
            </div>
            <div style="font-size: 10.5px; color: #64748B; margin-top: 2px;">
              PIC: ${t.divisionAssignee || "H. Rudi Hartono (TKA)"}
            </div>
          </td>
          <td style="padding: 12px 14px; vertical-align: top; text-align: right;">
            <div style="display: flex; justify-content: flex-end; gap: 6px; flex-wrap: wrap;">
              <button class="btn-tka-proc" style="padding: 5px 10px; font-size: 11px; font-weight: 800; background: #7C3AED; color: #FFF; border: none; border-radius: 6px; cursor: pointer;">
                🔧 Update Teknis
              </button>
              ${
                isDone
                  ? `<button class="btn-tka-pdf" style="padding: 5px 10px; font-size: 11px; font-weight: 800; background: #0284C7; color: #FFF; border: none; border-radius: 6px; cursor: pointer;">
                      📄 BAST Industri
                    </button>`
                  : ""
              }
            </div>
          </td>
        `;

        const procBtn = tr.querySelector(".btn-tka-proc") as HTMLButtonElement;
        if (procBtn) procBtn.onclick = () => handleProcessTicket(t);

        const pdfBtn = tr.querySelector(".btn-tka-pdf") as HTMLButtonElement;
        if (pdfBtn) {
          pdfBtn.onclick = () => {
            openReportPreviewModal({
              item: t as any,
              onUpdateItem: (upd) => {
                saveSingleTicket(upd as any);
                refresh();
              },
            });
          };
        }

        tbody.appendChild(tr);
      });
      tableCard.appendChild(table);
    }

    if (isViewItemVisible("key_account", "tka_table_tickets")) {
      wrapper.appendChild(tableCard);
    }
    container.appendChild(wrapper);
  }

  const onViewPrefChange = (e: any) => {
    if (!e.detail?.division || e.detail.division === "key_account") {
      render();
    }
  };
  window.addEventListener("aetra:dashboard_view_preference_changed", onViewPrefChange);
  window.addEventListener("aetra:tickets_changed", refresh);
  window.addEventListener("aetra:dashboard_refresh_needed", refresh);
  const onStorageChange = (e: StorageEvent) => {
    if (e.key === "aetra_work_orders_backup" || e.key === "aetra_latest_wo_notification_event") {
      refresh();
    }
  };
  window.addEventListener("storage", onStorageChange);

  render();
  return () => {
    window.removeEventListener("aetra:dashboard_view_preference_changed", onViewPrefChange);
    window.removeEventListener("aetra:tickets_changed", refresh);
    window.removeEventListener("aetra:dashboard_refresh_needed", refresh);
    window.removeEventListener("storage", onStorageChange);
    container.innerHTML = "";
  };
}
