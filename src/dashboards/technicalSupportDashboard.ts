/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Technical Support & Laboratorium Dashboard - Aetra Air Tangerang
 */

import {
  UnifiedTicket,
  loadAllUnifiedTickets,
  saveSingleTicket,
} from "../services/divisionTicketService";
import { openReportPreviewModal } from "../reportPreviewModal";
import { isViewItemVisible } from "../services/dashboardVisibilityService";
import { promptAutomaticCustomerCompletionWhatsApp } from "../services/customerWhatsAppNotificationService";
import { openSlaBreachEmailModal } from "../components/slaBreachEmailModal";
import { analyzeAllSlaBreaches, loadEmailSchedulerConfig, executeSlaEmailDispatch, DEPARTMENT_LEADS } from "../services/slaBreachEmailService";

export function renderTechnicalSupportDashboard(container: HTMLElement): () => void {
  let tickets: UnifiedTicket[] = loadAllUnifiedTickets().filter(
    (t) => t.targetDivision === "technical_support"
  );
  let filterStatus: "all" | "baru" | "proses" | "selesai" = "all";
  let searchQuery = "";

  function refresh() {
    tickets = loadAllUnifiedTickets().filter((t) => t.targetDivision === "technical_support");
    render();
  }

  function handleProcessTicket(ticket: UnifiedTicket) {
    // @ts-ignore
    if (!window.Swal) return;

    // @ts-ignore
    window.Swal.fire({
      title: `🔬 Tindakan Laboratorium & Uji Teknis: ${ticket.id}`,
      html: `
        <div style="text-align:left; font-size:12px; color:#334155; display:flex; flex-direction:column; gap:10px;">
          <div><b>Pelanggan:</b> ${ticket.customer} (${ticket.area})</div>
          <div><b>Kasus:</b> [${ticket.category}] ${ticket.desc || ""}</div>
          <div>
            <label style="font-weight:700; display:block; margin-bottom:4px;">Status Uji / Investigasi Lapangan:</label>
            <select id="ts-status" style="width:100%; padding:8px; border-radius:6px; border:1px solid #CBD5E1; font-weight:700; font-size:12px;">
              <option value="proses" ${ticket.status === "proses" ? "selected" : ""}>⚙️ Sedang Pengambilan Sampel / Flushing / Tera</option>
              <option value="selesai" ${ticket.status === "selesai" ? "selected" : ""}>✅ Selesai (Kualitas Air Sesuai Standar Permenkes / Tera Sah)</option>
              <option value="baru" ${ticket.status === "baru" ? "selected" : ""}>⏳ Baru Diterima</option>
            </select>
          </div>
          <div>
            <label style="font-weight:700; display:block; margin-bottom:4px;">Hasil Parameter Uji / Catatan Teknis:</label>
            <textarea id="ts-notes" placeholder="Contoh: Kekeruhan: 0.8 NTU (Standar < 5 NTU), pH: 7.2, Sisa Klorin: 0.3 mg/L. Telah dilakukan flushing hydrant selama 30 menit. Air jernih kembali." style="width:100%; box-sizing:border-box; padding:8px; border-radius:6px; border:1px solid #CBD5E1; min-height:70px; font-size:12px;">${ticket.divisionActionNotes || ""}</textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "💾 Simpan Hasil Lab",
      cancelButtonText: "Batal",
      confirmButtonColor: "#DC2626",
      preConfirm: () => {
        const statEl = document.getElementById("ts-status") as HTMLSelectElement;
        const notesEl = document.getElementById("ts-notes") as HTMLTextAreaElement;
        return {
          newStatus: statEl.value as any,
          newNotes: notesEl.value,
        };
      },
    }).then(async (res: any) => {
      if (res.isConfirmed && res.value) {
        ticket.status = res.value.newStatus;
        ticket.divisionActionNotes = res.value.newNotes;
        if (res.value.newNotes && res.value.newNotes.trim()) {
          if (!ticket.comments) ticket.comments = [];
          ticket.comments.push({
            id: `cmt-${Date.now().toString().slice(-6)}`,
            authorName: "Dr. Agus Sutrisno (Tech Support & Lab)",
            authorDivision: "technical_support",
            authorRole: "Manager Technical Support & Lab",
            targetDepartment: "Semua Divisi",
            content: res.value.newNotes.trim(),
            createdAt: new Date().toISOString(),
          });
        }
        if (res.value.newStatus === "selesai") {
          ticket.completedAt = new Date().toISOString();
          ticket.completionNotes = res.value.newNotes || "Hasil pengujian teknis laboratorium telah selesai dan memenuhi standar kualitas air minum.";
        }
        await saveSingleTicket(ticket);
        refresh();

        if (res.value.newStatus === "selesai") {
          promptAutomaticCustomerCompletionWhatsApp(ticket as any);
        } else {
          // @ts-ignore
          window.Swal.fire({
            icon: "success",
            title: "Hasil Teknis Tersimpan",
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

    const slaReport = analyzeAllSlaBreaches();
    const schedulerConfig = loadEmailSchedulerConfig();

    if (isViewItemVisible("technical_support", "ts_header_banner")) {
      const banner = document.createElement("div");
      banner.style.cssText = "background: linear-gradient(135deg, #FEF2F2 0%, #FFFFFF 100%); border: 1.5px solid #FECACA; border-radius: 14px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;";
      banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: #DC2626; color: #FFF; display: flex; align-items: center; justify-content: center; font-size: 22px;">
            🔬
          </div>
          <div>
            <div style="font-size: 15px; font-weight: 800; color: #991B1B;">Portal Technical Support & Laboratorium Kualitas Air</div>
            <div style="font-size: 11.5px; color: #B91C1C; font-weight: 500;">
              Uji sampel kekeruhan/kimia, tera akurasi meter, investigasi sambungan ilegal, dan flushing pipa.
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="btn-open-sla-email-tool" type="button" style="padding: 8px 14px; font-size: 12px; font-weight: 800; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); color: #FFFFFF; border: 1px solid #334155; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);">
            <span>📧</span>
            <span>Email SLA Leads Dispatcher</span>
            <span style="background: ${slaReport.totalBreached > 0 ? "#EF4444" : "#10B981"}; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 1px 7px; border-radius: 8px;">
              ${slaReport.totalBreached > 0 ? `🚨 ${slaReport.totalBreached} Overdue` : "✓ Terkendali"}
            </span>
          </button>
        </div>
      `;

      const btnOpenEmail = banner.querySelector("#btn-open-sla-email-tool") as HTMLButtonElement;
      if (btnOpenEmail) {
        btnOpenEmail.onclick = () => openSlaBreachEmailModal({ onDispatched: () => refresh() });
      }

      wrapper.appendChild(banner);
    }

    const total = tickets.length;
    const baruCount = tickets.filter((t) => t.status === "baru").length;
    const prosesCount = tickets.filter((t) => t.status === "proses").length;
    const selesaiCount = tickets.filter((t) => t.status === "selesai").length;

    // SLA Email & Automation Control Panel
    const slaEmailCard = document.createElement("div");
    slaEmailCard.style.cssText = "background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border-radius: 16px; padding: 16px 20px; color: #FFFFFF; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.15); border: 1px solid #334155;";
    slaEmailCard.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="width: 46px; height: 46px; border-radius: 12px; background: rgba(220, 38, 38, 0.2); border: 1.5px solid #EF4444; display: flex; align-items: center; justify-content: center; font-size: 22px;">
          📬
        </div>
        <div>
          <div style="font-size: 14px; font-weight: 900; color: #FFFFFF; display: flex; align-items: center; gap: 8px;">
            <span>Periodic Status Email SLA Breach Summary Generator</span>
            <span style="font-size: 10px; font-weight: 800; background: ${
              schedulerConfig.enabled ? "#10B981" : "#64748B"
            }; color: #FFFFFF; padding: 2px 7px; border-radius: 6px;">
              ${schedulerConfig.enabled ? `🟢 CRON AKTIF (${schedulerConfig.sendTime} WIB)` : "⚪ NONAKTIF"}
            </span>
          </div>
          <div style="font-size: 11.5px; color: #94A3B8; margin-top: 3px;">
            Otomatis menganalisis kasus melewati batas SLA dari seluruh divisi dan menyusun email laporan harian untuk seluruh Department Leads.
          </div>
          <div style="display: flex; gap: 14px; margin-top: 6px; font-size: 11px;">
            <span style="color: #F87171;">🚨 <strong>${slaReport.totalBreached}</strong> Kasus Lewat SLA</span>
            <span style="color: #FBBF24;">⚠️ <strong>${slaReport.totalCriticalRisk}</strong> Kritis &lt; 24 Jam</span>
            <span style="color: #34D399;">📊 Kepatuhan: <strong>${slaReport.overallComplianceRate}%</strong></span>
            <span style="color: #38BDF8;">👥 <strong>${DEPARTMENT_LEADS.length} Leads Terdaftar</strong></span>
          </div>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <button id="btn-quick-sla-tool" type="button" style="padding: 9px 16px; font-size: 12px; font-weight: 800; background: #DC2626; color: #FFFFFF; border: none; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);">
          <span>📧</span>
          <span>Buka Tool & Pratinjau Email</span>
        </button>
        <button id="btn-quick-dispatch-now" type="button" style="padding: 9px 16px; font-size: 12px; font-weight: 800; background: #10B981; color: #FFFFFF; border: none; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);">
          <span>🚀</span>
          <span>Kirim Cepat Harian</span>
        </button>
      </div>
    `;

    const btnQuickTool = slaEmailCard.querySelector("#btn-quick-sla-tool") as HTMLButtonElement;
    if (btnQuickTool) {
      btnQuickTool.onclick = () => openSlaBreachEmailModal({ onDispatched: () => refresh() });
    }

    const btnQuickDispatch = slaEmailCard.querySelector("#btn-quick-dispatch-now") as HTMLButtonElement;
    if (btnQuickDispatch) {
      btnQuickDispatch.onclick = async () => {
        // @ts-ignore
        const swal = (window as any).Swal;
        const selectedLeads = DEPARTMENT_LEADS.filter((l) => schedulerConfig.selectedLeadIds.includes(l.id));

        if (swal) {
          const confirmRes = await swal.fire({
            title: "Kirim Ringkasan SLA ke Department Leads?",
            html: `
              <div style="text-align:left; font-size:12px; color:#334155;">
                <div>Laporan ringkasan status SLA harian akan didistribusikan ke:</div>
                <div style="margin:6px 0; background:#F8FAFC; border:1px solid #E2E8F0; padding:6px 10px; border-radius:6px; font-weight:700; color:#0284C7; font-size:11px;">
                  ${selectedLeads.map((l) => `• ${l.name} (${l.email})`).join("<br/>")}
                </div>
                <div>Status Kepatuhan: <b>${slaReport.overallComplianceRate}%</b> (${slaReport.totalBreached} Kasus Overdue).</div>
              </div>
            `,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "🚀 Kirim Sekarang",
            cancelButtonText: "Batal",
            confirmButtonColor: "#10B981",
          });

          if (confirmRes.isConfirmed) {
            swal.fire({
              title: "Mengirimkan Email...",
              html: "Mendistribusikan laporan SLA ke seluruh Department Leads...",
              allowOutsideClick: false,
              didOpen: () => swal.showLoading(),
            });

            const log = await executeSlaEmailDispatch(slaReport, selectedLeads, schedulerConfig.ccEmails, "manual");
            setTimeout(() => {
              swal.fire({
                icon: "success",
                title: "Email Berhasil Terkirim! 🎉",
                text: `Laporan #${log.id} telah didistribusikan ke ${log.recipients.length} Department Leads.`,
                timer: 2000,
                showConfirmButton: false,
              });
              refresh();
            }, 500);
          }
        }
      };
    }

    wrapper.appendChild(slaEmailCard);

    // Stats
    if (isViewItemVisible("technical_support", "ts_stats_cards")) {
      const statsRow = document.createElement("div");
      statsRow.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;";

      const stats = [
        { label: "Total Permohonan Teknis", count: total, icon: "🔬", color: "#DC2626", bg: "#FEF2F2" },
        { label: "Sampel Baru Masuk", count: baruCount, icon: "⏳", color: "#EF4444", bg: "#FEF2F2" },
        { label: "Sedang Uji Lab / Flushing", count: prosesCount, icon: "🧪", color: "#2563EB", bg: "#EFF6FF" },
        { label: "Uji Selesai & Memenuhi Syarat", count: selesaiCount, icon: "✅", color: "#10B981", bg: "#ECFDF5" },
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
    if (isViewItemVisible("technical_support", "ts_filter_tabs")) {
      const filterRow = document.createElement("div");
      filterRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;";

      const filterTabs = document.createElement("div");
      filterTabs.style.cssText = "display: flex; gap: 4px; background: #FFFFFF; padding: 4px; border-radius: 10px; border: 1px solid #E2E8F0;";

      const tabs: { id: typeof filterStatus; label: string; count: number }[] = [
        { id: "all", label: "Semua Pengujian", count: total },
        { id: "baru", label: "⏳ Menunggu", count: baruCount },
        { id: "proses", label: "🧪 Proses Uji", count: prosesCount },
        { id: "selesai", label: "✅ Selesai Sah", count: selesaiCount },
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
          background: ${isActive ? "#DC2626" : "transparent"};
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
      search.placeholder = "🔍 Cari parameter uji, pelanggan, lokasi...";
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
      tableCard.innerHTML = `<div style="text-align: center; padding: 40px; color: #94A3B8;">Tidak ada pengujian pada kategori ini.</div>`;
    } else {
      const table = document.createElement("table");
      table.style.cssText = "width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;";
      table.innerHTML = `
        <thead>
          <tr style="background: #F8FAFC; border-bottom: 1.5px solid #E2E8F0; color: #475569; font-size: 11px; text-transform: uppercase;">
            <th style="padding: 10px 14px;">No. WO / Uji Lab</th>
            <th style="padding: 10px 14px;">Pelanggan & Lokasi Sampel</th>
            <th style="padding: 10px 14px;">Parameter Keluhan</th>
            <th style="padding: 10px 14px;">Arahan dari CS</th>
            <th style="padding: 10px 14px;">Hasil Analisa Laboratorium</th>
            <th style="padding: 10px 14px; text-align: right;">Aksi Tech Support</th>
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
            <div style="font-weight: 800; color: #DC2626; font-family: monospace;">${t.id}</div>
            <span style="font-size: 9.5px; background: #FEF2F2; color: #DC2626; padding: 1px 6px; border-radius: 4px; display: inline-block; margin-top: 3px;">
              Uji Teknis
            </span>
          </td>
          <td style="padding: 12px 14px; vertical-align: top;">
            <div style="font-weight: 800; color: #0F172A;">${t.customer}</div>
            <div style="font-size: 11px; color: #64748B; font-family: monospace;">MTR: ${t.meterId}</div>
            <div style="font-size: 11px; color: #475569;">📍 ${t.address} (${t.area})</div>
          </td>
          <td style="padding: 12px 14px; vertical-align: top; max-width: 240px;">
            <span style="background: #F1F5F9; border: 1px solid #CBD5E1; color: #0F172A; font-weight: 800; font-size: 10.5px; padding: 2px 6px; border-radius: 6px;">
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
              ${isDone ? "✅ MEMENUHI STANDAR" : "🧪 PROSES UJI LAB"}
            </span>
            <div style="font-size: 11px; color: #0F172A; margin-top: 4px; font-weight: 600;">
              ${t.divisionActionNotes || "Sampel air sedang dalam uji laboratorium"}
            </div>
          </td>
          <td style="padding: 12px 14px; vertical-align: top; text-align: right;">
            <div style="display: flex; justify-content: flex-end; gap: 6px; flex-wrap: wrap;">
              <button class="btn-ts-proc" style="padding: 5px 10px; font-size: 11px; font-weight: 800; background: #DC2626; color: #FFF; border: none; border-radius: 6px; cursor: pointer;">
                🧪 Input Hasil Lab
              </button>
              ${
                isDone
                  ? `<button class="btn-ts-pdf" style="padding: 5px 10px; font-size: 11px; font-weight: 800; background: #0284C7; color: #FFF; border: none; border-radius: 6px; cursor: pointer;">
                      📄 BAST & Drive
                    </button>`
                  : ""
              }
            </div>
          </td>
        `;

        const procBtn = tr.querySelector(".btn-ts-proc") as HTMLButtonElement;
        if (procBtn) procBtn.onclick = () => handleProcessTicket(t);

        const pdfBtn = tr.querySelector(".btn-ts-pdf") as HTMLButtonElement;
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

    if (isViewItemVisible("technical_support", "ts_table_tickets")) {
      wrapper.appendChild(tableCard);
    }
    container.appendChild(wrapper);
  }

  const onViewPrefChange = (e: any) => {
    if (!e.detail?.division || e.detail.division === "technical_support") {
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
