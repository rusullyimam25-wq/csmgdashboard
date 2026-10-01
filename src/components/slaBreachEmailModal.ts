/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Periodic SLA Breach Email Generation & Scheduling Modal Component
 * Technical Support & Laboratory Dashboard - PT Aetra Air Tangerang
 */

import {
  analyzeAllSlaBreaches,
  buildSlaBreachHtmlEmail,
  buildSlaBreachPlainTextEmail,
  DEPARTMENT_LEADS,
  DepartmentLeadContact,
  executeSlaEmailDispatch,
  loadEmailDispatchLogs,
  loadEmailSchedulerConfig,
  openSlaBreachInEmailClient,
  saveEmailSchedulerConfig,
  SlaBreachAnalysisReport,
  generateSlaEmailSubject,
} from "../services/slaBreachEmailService";

export function openSlaBreachEmailModal(options?: { onDispatched?: () => void }): void {
  // Remove existing modal if any
  const existing = document.getElementById("sla-email-generator-modal");
  if (existing) existing.remove();

  let report: SlaBreachAnalysisReport = analyzeAllSlaBreaches();
  let schedulerConfig = loadEmailSchedulerConfig();
  let dispatchLogs = loadEmailDispatchLogs();

  let activeTab: "preview" | "recipients" | "matrix" | "scheduler" | "logs" = "preview";
  let previewFormat: "html_visual" | "html_code" | "plain_text" = "html_visual";

  let selectedLeadIds: Set<string> = new Set(schedulerConfig.selectedLeadIds);
  let ccInputValue: string = schedulerConfig.ccEmails;

  const modalOverlay = document.createElement("div");
  modalOverlay.id = "sla-email-generator-modal";
  modalOverlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(15, 23, 42, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    color: #1E293B;
  `;

  function getSelectedLeads(): DepartmentLeadContact[] {
    return DEPARTMENT_LEADS.filter((l) => selectedLeadIds.has(l.id));
  }

  function renderModal() {
    report = analyzeAllSlaBreaches();
    const selectedLeads = getSelectedLeads();
    const htmlEmailContent = buildSlaBreachHtmlEmail(report, selectedLeads);
    const plainTextContent = buildSlaBreachPlainTextEmail(report, selectedLeads);
    const subject = generateSlaEmailSubject(report);

    modalOverlay.innerHTML = `
      <div style="width: 100%; max-width: 1100px; max-height: 94vh; background: #FFFFFF; border-radius: 20px; box-shadow: 0 25px 60px rgba(0,0,0,0.4); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #E2E8F0;">
        
        <!-- Modal Top Header Bar -->
        <header style="padding: 16px 22px; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); color: #FFFFFF; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid #334155;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);">
              📧
            </div>
            <div>
              <div style="font-size: 16px; font-weight: 900; letter-spacing: -0.2px; color: #FFFFFF; display: flex; align-items: center; gap: 8px;">
                <span>Periodic Status & SLA Breach Email Dispatcher</span>
                <span style="font-size: 10.5px; font-weight: 800; background: ${
                  report.totalBreached > 0 ? "#EF4444" : "#10B981"
                }; color: #FFFFFF; padding: 2px 8px; border-radius: 10px;">
                  ${report.totalBreached > 0 ? `🚨 ${report.totalBreached} Kasus Terlambat` : "✅ SLA Terkendali"}
                </span>
              </div>
              <div style="font-size: 11.5px; color: #94A3B8; margin-top: 2px;">
                Divisi Technical Support & Laboratorium • Otomasi Ringkasan Kepatuhan SLA Harian ke Department Leads
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button id="btn-sla-send-now" type="button" style="padding: 8px 16px; font-size: 12px; font-weight: 800; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; border: none; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);">
              <span>🚀</span>
              <span>Kirim Sekarang ke Leads</span>
            </button>
            <button id="btn-sla-modal-close" type="button" style="width: 34px; height: 34px; border-radius: 10px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #F8FAFC; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
              ✕
            </button>
          </div>
        </header>

        <!-- KPI Quick Bar -->
        <div style="background: #F8FAFC; padding: 10px 22px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; font-size: 11.5px;">
          <div style="display: flex; align-items: center; gap: 18px; flex-wrap: wrap;">
            <div>
              <span style="color: #64748B;">Total Kasus Aktif:</span>
              <strong style="color: #0F172A; margin-left: 4px; font-size: 13px;">${report.totalActiveTickets}</strong>
            </div>
            <div>
              <span style="color: #64748B;">Lewat Batas SLA:</span>
              <strong style="color: #DC2626; margin-left: 4px; font-size: 13px;">${report.totalBreached}</strong>
            </div>
            <div>
              <span style="color: #64748B;">Kritis (&lt; 24 Jam):</span>
              <strong style="color: #D97706; margin-left: 4px; font-size: 13px;">${report.totalCriticalRisk}</strong>
            </div>
            <div>
              <span style="color: #64748B;">SLA Compliance:</span>
              <strong style="color: ${report.overallComplianceRate >= 90 ? "#059669" : "#DC2626"}; margin-left: 4px; font-size: 13px;">${report.overallComplianceRate}%</strong>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #64748B;">Jadwal Otomatis:</span>
            <span style="background: ${schedulerConfig.enabled ? "#DCFCE7" : "#F1F5F9"}; color: ${
              schedulerConfig.enabled ? "#166534" : "#64748B"
            }; font-weight: 800; padding: 2px 8px; border-radius: 6px; font-size: 11px;">
              ${schedulerConfig.enabled ? `🟢 Aktif (${schedulerConfig.sendTime} WIB)` : "⚪ Nonaktif"}
            </span>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div style="padding: 8px 22px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; gap: 6px;">
            <button class="sla-tab-btn" data-tab="preview" style="padding: 7px 14px; font-size: 12px; font-weight: 800; border-radius: 8px; border: none; cursor: pointer; background: ${
              activeTab === "preview" ? "#DC2626" : "#F1F5F9"
            }; color: ${activeTab === "preview" ? "#FFFFFF" : "#475569"};">
              🖼️ Pratinjau Email Live
            </button>
            <button class="sla-tab-btn" data-tab="recipients" style="padding: 7px 14px; font-size: 12px; font-weight: 800; border-radius: 8px; border: none; cursor: pointer; background: ${
              activeTab === "recipients" ? "#DC2626" : "#F1F5F9"
            }; color: ${activeTab === "recipients" ? "#FFFFFF" : "#475569"};">
              👥 Penerima (${selectedLeads.length} Leads)
            </button>
            <button class="sla-tab-btn" data-tab="matrix" style="padding: 7px 14px; font-size: 12px; font-weight: 800; border-radius: 8px; border: none; cursor: pointer; background: ${
              activeTab === "matrix" ? "#DC2626" : "#F1F5F9"
            }; color: ${activeTab === "matrix" ? "#FFFFFF" : "#475569"};">
              📊 Matriks Kasus Terlambat (${report.allBreachedItems.length})
            </button>
            <button class="sla-tab-btn" data-tab="scheduler" style="padding: 7px 14px; font-size: 12px; font-weight: 800; border-radius: 8px; border: none; cursor: pointer; background: ${
              activeTab === "scheduler" ? "#DC2626" : "#F1F5F9"
            }; color: ${activeTab === "scheduler" ? "#FFFFFF" : "#475569"};">
              ⏰ Jadwal Berkala (Periodic)
            </button>
            <button class="sla-tab-btn" data-tab="logs" style="padding: 7px 14px; font-size: 12px; font-weight: 800; border-radius: 8px; border: none; cursor: pointer; background: ${
              activeTab === "logs" ? "#DC2626" : "#F1F5F9"
            }; color: ${activeTab === "logs" ? "#FFFFFF" : "#475569"};">
              📜 Riwayat Pengiriman (${dispatchLogs.length})
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <button id="btn-open-gmail" type="button" style="padding: 6px 12px; font-size: 11.5px; font-weight: 700; background: #EA4335; color: #FFFFFF; border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
              <span>✉️</span> Buka di Gmail
            </button>
            <button id="btn-copy-html" type="button" style="padding: 6px 12px; font-size: 11.5px; font-weight: 700; background: #0284C7; color: #FFFFFF; border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
              <span>📋</span> Salin HTML
            </button>
            <button id="btn-download-html" type="button" style="padding: 6px 12px; font-size: 11.5px; font-weight: 700; background: #334155; color: #FFFFFF; border: none; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
              <span>📥</span> Unduh HTML
            </button>
          </div>
        </div>

        <!-- Main Content Body based on Active Tab -->
        <div style="flex: 1; overflow-y: auto; padding: 20px 22px; background: #F8FAFC;">
          ${renderTabContent(htmlEmailContent, plainTextContent, subject)}
        </div>

        <!-- Modal Footer -->
        <footer style="padding: 12px 22px; background: #FFFFFF; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: #64748B;">
          <div>
            Terakhir dikirim: <strong>${
              schedulerConfig.lastSentAt
                ? new Date(schedulerConfig.lastSentAt).toLocaleString("id-ID")
                : "Belum pernah dikirim"
            }</strong>
          </div>
          <div>
            PT Aetra Air Tangerang • Automated SLA Compliance Engine
          </div>
        </footer>

      </div>
    `;

    bindModalEvents(htmlEmailContent, plainTextContent, subject);
  }

  function renderTabContent(htmlEmail: string, plainText: string, subject: string): string {
    if (activeTab === "preview") {
      return `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Subject Line Display -->
          <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 12px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div style="flex: 1; font-size: 12px;">
              <span style="font-weight: 700; color: #64748B;">Subjek Email:</span>
              <span style="font-weight: 800; color: #0F172A; margin-left: 6px; font-family: monospace;">${subject}</span>
            </div>
            <div style="display: flex; gap: 4px;">
              <button class="preview-fmt-btn" data-fmt="html_visual" style="padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 6px; border: 1px solid #CBD5E1; background: ${
                previewFormat === "html_visual" ? "#0F172A" : "#FFFFFF"
              }; color: ${previewFormat === "html_visual" ? "#FFFFFF" : "#475569"}; cursor: pointer;">
                Visual Email
              </button>
              <button class="preview-fmt-btn" data-fmt="plain_text" style="padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 6px; border: 1px solid #CBD5E1; background: ${
                previewFormat === "plain_text" ? "#0F172A" : "#FFFFFF"
              }; color: ${previewFormat === "plain_text" ? "#FFFFFF" : "#475569"}; cursor: pointer;">
                Teks Polos
              </button>
              <button class="preview-fmt-btn" data-fmt="html_code" style="padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 6px; border: 1px solid #CBD5E1; background: ${
                previewFormat === "html_code" ? "#0F172A" : "#FFFFFF"
              }; color: ${previewFormat === "html_code" ? "#FFFFFF" : "#475569"}; cursor: pointer;">
                Source Code
              </button>
            </div>
          </div>

          <!-- Preview Area -->
          <div style="background: #FFFFFF; border: 1.5px solid #CBD5E1; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
            ${
              previewFormat === "html_visual"
                ? `<iframe id="sla-email-iframe-preview" style="width: 100%; height: 520px; border: none; display: block;" srcdoc="${htmlEmail.replace(
                    /"/g,
                    "&quot;"
                  )}"></iframe>`
                : previewFormat === "plain_text"
                ? `<pre style="padding: 18px; margin: 0; font-family: monospace; font-size: 12px; color: #0F172A; white-space: pre-wrap; line-height: 1.5; background: #FFFFFF; max-height: 520px; overflow-y: auto;">${plainText}</pre>`
                : `<textarea readonly style="width: 100%; height: 520px; box-sizing: border-box; padding: 14px; font-family: monospace; font-size: 11.5px; border: none; background: #0F172A; color: #38BDF8; line-height: 1.45; resize: none;">${htmlEmail}</textarea>`
            }
          </div>

        </div>
      `;
    }

    if (activeTab === "recipients") {
      return `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
            <div style="font-size: 14px; font-weight: 800; color: #0F172A; margin-bottom: 4px;">
              Daftar Department Leads Penerima Email Laporan:
            </div>
            <div style="font-size: 12px; color: #64748B; margin-bottom: 14px;">
              Pilih pimpinan divisi yang akan menerima notifikasi ringkasan SLA harian/berkala secara otomatis.
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px;">
              ${DEPARTMENT_LEADS.map((lead) => {
                const isChecked = selectedLeadIds.has(lead.id);
                return `
                  <label style="border: 1.5px solid ${isChecked ? "#0284C7" : "#E2E8F0"}; background: ${
                  isChecked ? "#F0F9FF" : "#FFFFFF"
                }; border-radius: 12px; padding: 12px 14px; display: flex; align-items: flex-start; gap: 12px; cursor: pointer; transition: all 0.15s ease;">
                    <input type="checkbox" class="chk-dept-lead" value="${lead.id}" ${
                  isChecked ? "checked" : ""
                } style="margin-top: 3px; width: 16px; height: 16px; accent-color: #0284C7;" />
                    <div style="flex: 1;">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 13px; font-weight: 800; color: #0F172A;">${lead.name}</span>
                        <span style="font-size: 10px; font-weight: 800; background: #E0F2FE; color: #0369A1; padding: 1px 6px; border-radius: 4px;">${
                          lead.divisionLabel
                        }</span>
                      </div>
                      <div style="font-size: 11px; color: #64748B; margin-top: 1px;">${lead.role}</div>
                      <div style="font-size: 11.5px; font-family: monospace; color: #0284C7; font-weight: 700; margin-top: 4px;">
                        ✉️ ${lead.email}
                      </div>
                    </div>
                  </label>
                `;
              }).join("")}
            </div>
          </div>

          <!-- CC Emails & Custom Recipients -->
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
            <label style="display: block; font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 4px;">
              Email Tembusan (Carbon Copy / CC):
            </label>
            <div style="font-size: 11.5px; color: #64748B; margin-bottom: 8px;">
              Pisahkan beberapa alamat email dengan tanda koma (contoh: <code>qa@aetra-tangerang.co.id, audit@aetra-tangerang.co.id</code>).
            </div>
            <input
              id="input-sla-cc-emails"
              type="text"
              value="${ccInputValue}"
              placeholder="Masukkan alamat email CC..."
              style="width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #CBD5E1; font-size: 12.5px; font-family: monospace; font-weight: 600; color: #0F172A;"
            />
            <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
              <button id="btn-save-recipients" type="button" style="padding: 7px 16px; font-size: 12px; font-weight: 800; background: #0284C7; color: #FFFFFF; border: none; border-radius: 8px; cursor: pointer;">
                💾 Simpan Konfigurasi Penerima
              </button>
            </div>
          </div>

        </div>
      `;
    }

    if (activeTab === "matrix") {
      return `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div>
                <h3 style="margin: 0; font-size: 14px; font-weight: 800; color: #991B1B;">
                  🚨 Rincian Tiket Kasus Melewati Batas SLA (${report.allBreachedItems.length} Kasus)
                </h3>
                <div style="font-size: 11.5px; color: #64748B; margin-top: 2px;">
                  Daftar seluruh pekerjaan yang memerlukan mitigasi cepat dan arahan pimpinan divisi.
                </div>
              </div>
              <span style="font-size: 12px; font-weight: 800; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 3px 10px; border-radius: 20px;">
                Perlu Eskalasi
              </span>
            </div>

            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
                <thead>
                  <tr style="background: #FEF2F2; color: #991B1B; font-size: 11px; text-transform: uppercase; border-bottom: 1.5px solid #FCA5A5;">
                    <th style="padding: 10px 12px;">No. WO / Kasus</th>
                    <th style="padding: 10px 12px;">Pelanggan & Lokasi</th>
                    <th style="padding: 10px 12px;">Divisi PJ</th>
                    <th style="padding: 10px 12px; text-align: center;">Target vs Realisasi</th>
                    <th style="padding: 10px 12px; text-align: center;">Keterlambatan</th>
                    <th style="padding: 10px 12px;">Indikasi Kendala & Rekomendasi</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    report.allBreachedItems.length === 0
                      ? `<tr><td colspan="6" style="padding: 30px; text-align: center; color: #166534; font-weight: 700; background: #F0FDF4;">✅ Tidak ada tiket yang melewati batas SLA saat ini. Kinerja operasional 100% prima!</td></tr>`
                      : report.allBreachedItems
                          .map((b) => {
                            const t = b.ticket;
                            return `
                              <tr style="border-bottom: 1px solid #F1F5F9;">
                                <td style="padding: 10px 12px; vertical-align: top;">
                                  <div style="font-weight: 800; font-family: monospace; color: #DC2626;">${t.id}</div>
                                  <div style="font-size: 10.5px; color: #64748B; font-family: monospace;">Case: #${t.caseId || t.id}</div>
                                  ${t.urgent ? `<span style="background: #EF4444; color: #FFF; font-size: 9px; font-weight: 800; padding: 1px 4px; border-radius: 3px;">URGENT</span>` : ""}
                                </td>
                                <td style="padding: 10px 12px; vertical-align: top;">
                                  <div style="font-weight: 700; color: #0F172A;">${t.customer}</div>
                                  <div style="font-size: 11px; color: #64748B;">📍 ${t.address || t.area || "-"}</div>
                                  <div style="font-size: 10.5px; color: #0284C7; font-weight: 600; margin-top: 2px;">[${t.category}] ${b.categoryName}</div>
                                </td>
                                <td style="padding: 10px 12px; vertical-align: top;">
                                  <span style="background: #EFF6FF; color: #1D4ED8; font-weight: 800; font-size: 10.5px; padding: 2px 6px; border-radius: 4px;">
                                    ${b.targetDivision.toUpperCase()}
                                  </span>
                                </td>
                                <td style="padding: 10px 12px; vertical-align: top; text-align: center;">
                                  <div style="font-size: 11px; color: #475569;">Target: <b>${b.slaLimitDays} Hari</b></div>
                                  <div style="font-size: 12px; font-weight: 800; color: #DC2626; margin-top: 2px;">Jalan: ${b.elapsedDays} Hari</div>
                                </td>
                                <td style="padding: 10px 12px; vertical-align: top; text-align: center;">
                                  <span style="background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; padding: 3px 8px; border-radius: 6px; font-weight: 800; font-size: 11px;">
                                    +${b.overdueDays} Hari
                                  </span>
                                </td>
                                <td style="padding: 10px 12px; vertical-align: top; max-width: 320px;">
                                  <div style="font-size: 11px; color: #9A3412; font-weight: 700;">🔍 ${b.rootCauseEstimation}</div>
                                  <div style="font-size: 11px; color: #047857; margin-top: 3px;">⚡ ${b.recommendedAction}</div>
                                </td>
                              </tr>
                            `;
                          })
                          .join("")
                  }
                </tbody>
              </table>
            </div>
          </div>

        </div>
      `;
    }

    if (activeTab === "scheduler") {
      return `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0F172A;">
                  ⏰ Konfigurasi Otomasi Jadwal Pengiriman (Periodic Cron Engine)
                </h3>
                <div style="font-size: 12px; color: #64748B; margin-top: 2px;">
                  Sistem secara otomatis mengeksekusi analisis kepatuhan SLA dan mendistribusikan email ke seluruh Department Leads.
                </div>
              </div>

              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; font-weight: 800; color: #0F172A;">
                <input id="chk-scheduler-enabled" type="checkbox" ${
                  schedulerConfig.enabled ? "checked" : ""
                } style="width: 20px; height: 20px; accent-color: #10B981;" />
                <span>Status Scheduler: ${schedulerConfig.enabled ? "AKTIF" : "NONAKTIF"}</span>
              </label>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 18px;">
              
              <!-- Frequency -->
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">
                  Frekuensi Pengiriman Berkala:
                </label>
                <select id="sel-scheduler-freq" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border-radius: 8px; border: 1.5px solid #CBD5E1; font-size: 12.5px; font-weight: 700; color: #0F172A;">
                  <option value="daily_morning" ${schedulerConfig.frequency === "daily_morning" ? "selected" : ""}>🌅 Setiap Pagi (Daily Morning Briefing - 07:30 WIB)</option>
                  <option value="daily_evening" ${schedulerConfig.frequency === "daily_evening" ? "selected" : ""}>🌆 Setiap Sore (Daily Shift Wrap - 17:00 WIB)</option>
                  <option value="twice_daily" ${schedulerConfig.frequency === "twice_daily" ? "selected" : ""}>⚡ 2x Sehari (Pagi 07:30 & Sore 17:00 WIB)</option>
                  <option value="weekly_monday" ${schedulerConfig.frequency === "weekly_monday" ? "selected" : ""}>📅 Setiap Hari Senin (Weekly Executive - 08:00 WIB)</option>
                </select>
              </div>

              <!-- Time of Day -->
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">
                  Waktu Pemicu Utama (WIB):
                </label>
                <input
                  id="inp-scheduler-time"
                  type="time"
                  value="${schedulerConfig.sendTime}"
                  style="width: 100%; box-sizing: border-box; padding: 8px 12px; border-radius: 8px; border: 1.5px solid #CBD5E1; font-size: 13px; font-weight: 800; font-family: monospace; color: #0F172A;"
                />
              </div>

              <!-- Auto Escalate Days -->
              <div>
                <label style="display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px;">
                  Ambang Eskalasi Direksi (Hari Overdue):
                </label>
                <select id="sel-scheduler-escalate" style="width: 100%; box-sizing: border-box; padding: 9px 12px; border-radius: 8px; border: 1.5px solid #CBD5E1; font-size: 12.5px; font-weight: 700; color: #0F172A;">
                  <option value="2" ${schedulerConfig.autoEscalateAfterDays === 2 ? "selected" : ""}>Eskalasi jika terlambat &gt; 2 Hari</option>
                  <option value="3" ${schedulerConfig.autoEscalateAfterDays === 3 ? "selected" : ""}>Eskalasi jika terlambat &gt; 3 Hari (Rekomendasi)</option>
                  <option value="5" ${schedulerConfig.autoEscalateAfterDays === 5 ? "selected" : ""}>Eskalasi jika terlambat &gt; 5 Hari</option>
                </select>
              </div>

            </div>

            <div style="border-top: 1px solid #E2E8F0; padding-top: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div style="font-size: 12px; color: #059669; font-weight: 700;">
                ✓ Engine background aktif dan tersinkronisasi dengan database pengaduan AETRA.
              </div>
              <button id="btn-save-scheduler" type="button" style="padding: 8px 20px; font-size: 12.5px; font-weight: 800; background: #0284C7; color: #FFFFFF; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);">
                💾 Simpan Konfigurasi Jadwal
              </button>
            </div>

          </div>

        </div>
      `;
    }

    if (activeTab === "logs") {
      return `
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <div>
              <h3 style="margin: 0; font-size: 14px; font-weight: 800; color: #0F172A;">
                📜 Riwayat Audit Trail Pengiriman Email Status SLA
              </h3>
              <div style="font-size: 11.5px; color: #64748B; margin-top: 2px;">
                Catatan bukti pengiriman otomatis kepada seluruh pimpinan divisi Aetra Air Tangerang.
              </div>
            </div>
            <button id="btn-clear-logs" type="button" style="padding: 5px 10px; font-size: 11px; font-weight: 700; background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; border-radius: 6px; cursor: pointer;">
              Bersihkan Log
            </button>
          </div>

          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
              <thead>
                <tr style="background: #F8FAFC; color: #475569; font-size: 10.5px; text-transform: uppercase; border-bottom: 1.5px solid #E2E8F0;">
                  <th style="padding: 8px 12px;">ID Dispatch</th>
                  <th style="padding: 8px 12px;">Waktu Eksekusi</th>
                  <th style="padding: 8px 12px;">Pemicu</th>
                  <th style="padding: 8px 12px;">Penerima (Leads)</th>
                  <th style="padding: 8px 12px; text-align: center;">Pelanggaran Terlampir</th>
                  <th style="padding: 8px 12px; text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${
                  dispatchLogs.length === 0
                    ? `<tr><td colspan="6" style="padding: 24px; text-align: center; color: #94A3B8;">Belum ada riwayat pengiriman email tercatat. Klik "Kirim Sekarang" untuk membuat pengiriman pertama.</td></tr>`
                    : dispatchLogs
                        .map((lg) => {
                          return `
                            <tr style="border-bottom: 1px solid #F1F5F9;">
                              <td style="padding: 10px 12px; font-family: monospace; font-weight: 800; color: #0284C7;">${lg.id}</td>
                              <td style="padding: 10px 12px; color: #0F172A; font-weight: 600;">${new Date(lg.timestamp).toLocaleString("id-ID")}</td>
                              <td style="padding: 10px 12px;">
                                <span style="background: ${lg.triggerType === "manual" ? "#EFF6FF" : "#ECFDF5"}; color: ${
                            lg.triggerType === "manual" ? "#1D4ED8" : "#047857"
                          }; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">
                                  ${lg.triggerType === "manual" ? "MANUAL ON-DEMAND" : "AUTOMATED CRON"}
                                </span>
                              </td>
                              <td style="padding: 10px 12px; font-size: 11px; color: #475569; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${lg.recipients.join(", ")}
                              </td>
                              <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: ${
                                lg.totalBreachedIncluded > 0 ? "#DC2626" : "#059669"
                              };">
                                ${lg.totalBreachedIncluded} Kasus
                              </td>
                              <td style="padding: 10px 12px; text-align: center;">
                                <span style="background: #DCFCE7; color: #166534; font-weight: 800; padding: 2px 8px; border-radius: 10px; font-size: 10.5px;">
                                  ✓ TERKIRIM
                                </span>
                              </td>
                            </tr>
                          `;
                        })
                        .join("")
                }
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    return "";
  }

  function bindModalEvents(htmlEmail: string, plainText: string, subject: string) {
    // Close button & overlay click
    const closeBtn = modalOverlay.querySelector("#btn-sla-modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modalOverlay.remove();
      });
    }

    // Tab buttons
    modalOverlay.querySelectorAll(".sla-tab-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        renderModal();
      });
    });

    // Preview format buttons
    modalOverlay.querySelectorAll(".preview-fmt-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        previewFormat = btn.dataset.fmt;
        renderModal();
      });
    });

    // Send Now Action Button
    const sendNowBtn = modalOverlay.querySelector("#btn-sla-send-now");
    if (sendNowBtn) {
      sendNowBtn.addEventListener("click", async () => {
        const selectedLeads = getSelectedLeads();
        if (selectedLeads.length === 0) {
          // @ts-ignore
          if ((window as any).Swal) {
            // @ts-ignore
            (window as any).Swal.fire({
              icon: "warning",
              title: "Pilih Minimal 1 Penerima",
              text: "Silakan pilih minimal satu Department Lead pada tab Penerima sebelum mengirimkan email.",
            });
          }
          return;
        }

        // @ts-ignore
        const swal = (window as any).Swal;
        if (swal) {
          const confirmRes = await swal.fire({
            title: "Konfirmasi Pengiriman Email SLA?",
            html: `
              <div style="text-align: left; font-size: 12.5px; color: #334155;">
                <div>Email ringkasan status SLA harian akan didistribusikan ke:</div>
                <div style="margin: 8px 0; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 8px 12px; border-radius: 8px; font-weight: 700; color: #0284C7; font-size: 11.5px;">
                  ${selectedLeads.map((l) => `• ${l.name} (${l.email})`).join("<br/>")}
                </div>
                <div style="color: #64748B; font-size: 11px;">
                  Termasuk <b>${report.totalBreached} kasus pelanggaran SLA</b> dan <b>${report.totalCriticalRisk} kasus berisiko kritis</b>.
                </div>
              </div>
            `,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "🚀 Kirim Sekarang",
            cancelButtonText: "Batal",
            confirmButtonColor: "#059669",
          });

          if (confirmRes.isConfirmed) {
            swal.fire({
              title: "Mengirimkan Email...",
              html: "Menyusun rekapitulasi SLA dan mendistribusikan ke Department Leads...",
              allowOutsideClick: false,
              didOpen: () => {
                swal.showLoading();
              },
            });

            const log = await executeSlaEmailDispatch(report, selectedLeads, ccInputValue, "manual");
            dispatchLogs = loadEmailDispatchLogs();
            schedulerConfig = loadEmailSchedulerConfig();

            setTimeout(() => {
              swal.fire({
                icon: "success",
                title: "Email SLA Berhasil Didistribusikan! 🎉",
                html: `
                  <div style="text-align: left; font-size: 12.5px; color: #334155;">
                    <div>Nomor Dispatch: <b style="color:#0284C7; font-family:monospace;">${log.id}</b></div>
                    <div style="margin-top:4px;">Berhasil dikirimkan ke <b>${log.recipients.length} Department Leads</b> beserta CC operasional.</div>
                    <div style="margin-top:8px; font-size:11px; color:#64748B;">Bukti pengiriman telah dicatat pada tab Riwayat Pengiriman.</div>
                  </div>
                `,
                confirmButtonColor: "#0284C7",
              });

              if (options?.onDispatched) options.onDispatched();
              renderModal();
            }, 600);
          }
        }
      });
    }

    // Gmail compose button
    const gmailBtn = modalOverlay.querySelector("#btn-open-gmail");
    if (gmailBtn) {
      gmailBtn.addEventListener("click", () => {
        const selectedLeads = getSelectedLeads();
        openSlaBreachInEmailClient(report, selectedLeads, ccInputValue, "gmail_web");
      });
    }

    // Copy HTML button
    const copyHtmlBtn = modalOverlay.querySelector("#btn-copy-html");
    if (copyHtmlBtn) {
      copyHtmlBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(htmlEmail);
          // @ts-ignore
          if ((window as any).Swal) {
            // @ts-ignore
            (window as any).Swal.fire({
              icon: "success",
              title: "Kode HTML Email Disalin! 📋",
              text: "Format HTML email dapat langsung ditempel (paste) ke Microsoft Outlook, Gmail, atau aplikasi corporate mailer.",
              timer: 1800,
              showConfirmButton: false,
            });
          }
        } catch (_) {}
      });
    }

    // Download HTML button
    const downloadHtmlBtn = modalOverlay.querySelector("#btn-download-html");
    if (downloadHtmlBtn) {
      downloadHtmlBtn.addEventListener("click", () => {
        const blob = new Blob([htmlEmail], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `AETRA_SLA_Breach_Summary_${new Date().toISOString().slice(0, 10)}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    // Checkboxes for department leads
    modalOverlay.querySelectorAll(".chk-dept-lead").forEach((chk: any) => {
      chk.addEventListener("change", () => {
        if (chk.checked) {
          selectedLeadIds.add(chk.value);
        } else {
          selectedLeadIds.delete(chk.value);
        }
      });
    });

    // Save Recipients button
    const saveRecipientsBtn = modalOverlay.querySelector("#btn-save-recipients");
    if (saveRecipientsBtn) {
      saveRecipientsBtn.addEventListener("click", () => {
        const ccInput = modalOverlay.querySelector("#input-sla-cc-emails") as HTMLInputElement;
        if (ccInput) ccInputValue = ccInput.value;

        schedulerConfig.selectedLeadIds = Array.from(selectedLeadIds);
        schedulerConfig.ccEmails = ccInputValue;
        saveEmailSchedulerConfig(schedulerConfig);

        // @ts-ignore
        if ((window as any).Swal) {
          // @ts-ignore
          (window as any).Swal.fire({
            icon: "success",
            title: "Penerima Tersimpan! 💾",
            text: "Daftar Department Leads & alamat CC berhasil diperbarui.",
            timer: 1500,
            showConfirmButton: false,
          });
        }
        renderModal();
      });
    }

    // Save Scheduler button
    const saveSchedulerBtn = modalOverlay.querySelector("#btn-save-scheduler");
    if (saveSchedulerBtn) {
      saveSchedulerBtn.addEventListener("click", () => {
        const chkEnabled = modalOverlay.querySelector("#chk-scheduler-enabled") as HTMLInputElement;
        const selFreq = modalOverlay.querySelector("#sel-scheduler-freq") as HTMLSelectElement;
        const inpTime = modalOverlay.querySelector("#inp-scheduler-time") as HTMLInputElement;
        const selEscalate = modalOverlay.querySelector("#sel-scheduler-escalate") as HTMLSelectElement;

        schedulerConfig.enabled = chkEnabled ? chkEnabled.checked : true;
        schedulerConfig.frequency = selFreq ? (selFreq.value as any) : "daily_morning";
        schedulerConfig.sendTime = inpTime ? inpTime.value : "07:30";
        schedulerConfig.autoEscalateAfterDays = selEscalate ? parseInt(selEscalate.value, 10) : 3;

        saveEmailSchedulerConfig(schedulerConfig);

        // @ts-ignore
        if ((window as any).Swal) {
          // @ts-ignore
          (window as any).Swal.fire({
            icon: "success",
            title: "Konfigurasi Jadwal Tersimpan! ⏰",
            text: `Pengiriman otomatis dijadwalkan setiap ${
              schedulerConfig.frequency === "daily_morning"
                ? "Pagi"
                : schedulerConfig.frequency === "daily_evening"
                ? "Sore"
                : "Mingguan"
            } pukul ${schedulerConfig.sendTime} WIB.`,
            timer: 2000,
            showConfirmButton: false,
          });
        }
        renderModal();
      });
    }

    // Clear logs button
    const clearLogsBtn = modalOverlay.querySelector("#btn-clear-logs");
    if (clearLogsBtn) {
      clearLogsBtn.addEventListener("click", () => {
        localStorage.removeItem("aetra_sla_email_dispatch_logs");
        dispatchLogs = [];
        renderModal();
      });
    }
  }

  renderModal();
  document.body.appendChild(modalOverlay);
}
