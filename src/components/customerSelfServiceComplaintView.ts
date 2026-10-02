/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Customer Self-Service Complaint Portal - PT Aetra Air Tangerang
 * Includes:
 * 1. AI-Powered Smart Diagnostics Chatbot to guide users through initial troubleshooting
 *    before submitting a repair request, preventing unnecessary work orders.
 * 2. Self-Service Work Order submission form with GPS and photo upload.
 * 3. Live Tracking instant launcher.
 */

import {
  UnifiedTicket,
  loadAllUnifiedTickets,
  saveSingleTicket,
  generateCaseId,
} from "../services/divisionTicketService";
import { publishWorkOrderNotification } from "../services/workOrderNotificationService";
import { DivisionId, getRecommendedDivision } from "../types/division";
import { saveSingleSubmission } from "../services/customerSubmissionService";

// Operational areas in Tangerang
const OPERATIONAL_AREAS = [
  "Sepatan",
  "Sepatan Timur",
  "Pasar Kemis",
  "Cikupa",
  "Balaraja",
  "Jayanti",
  "Sindang Jaya",
  "Sukamulya",
];

// Issue categories tailored for customer language
interface IssueCategoryOption {
  code: string;
  icon: string;
  title: string;
  desc: string;
  defaultDivision: DivisionId;
  defaultUrgent?: boolean;
}

const ISSUE_CATEGORIES: IssueCategoryOption[] = [
  {
    code: "KBSM",
    icon: "💧",
    title: "Pipa Sambungan Bocor / Pecah",
    desc: "Pipa persil depan rumah bocor, merembes, atau menyembur deras ke jalan.",
    defaultDivision: "minor_repair",
    defaultUrgent: true,
  },
  {
    code: "KATM",
    icon: "🛑",
    title: "Air Mati Total / Tidak Mengalir",
    desc: "Kran air di rumah tidak mengeluarkan air sama sekali sejak beberapa jam/hari.",
    defaultDivision: "minor_repair",
    defaultUrgent: true,
  },
  {
    code: "KKMR",
    icon: "🔧",
    title: "Kran Meteran / Stop Kran Rusak",
    desc: "Stop kran sebelum/sesudah meteran patah, bocor, atau dol tidak bisa ditutup.",
    defaultDivision: "minor_repair",
  },
  {
    code: "KPMR",
    icon: "⏱️",
    title: "Meteran Air Macet / Rusak / Kaca Buram",
    desc: "Jarum meteran tidak berputar saat kran dibuka, meteran bocor, atau kaca pecah.",
    defaultDivision: "minor_repair",
  },
  {
    code: "KMDT",
    icon: "🟤",
    title: "Air Keruh / Berwarna / Berbau",
    desc: "Kualitas air berubah cokelat, kuning, berpasir, atau memiliki aroma tidak wajar.",
    defaultDivision: "technical_support",
  },
  {
    code: "KTR",
    icon: "📉",
    title: "Tekanan Air Kecil / Debit Lemah",
    desc: "Air mengalir sangat kecil dan lambat, tidak mencukupi kebutuhan persil.",
    defaultDivision: "technical_support",
  },
  {
    code: "KRPT",
    icon: "📈",
    title: "Tagihan Melonjak Tidak Wajar",
    desc: "Jumlah tagihan rekening air bulan ini melonjak drastis tanpa perubahan pemakaian.",
    defaultDivision: "sales_support",
  },
  {
    code: "KPKT",
    icon: "🔄",
    title: "Permohonan Sambung Kembali",
    desc: "Sudah melakukan pelunasan tagihan dan mengajukan pembukaan segel meter.",
    defaultDivision: "sales_support",
    defaultUrgent: true,
  },
];

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  options?: string[];
  suggestedAction?: {
    type: "resolved_self_service" | "internal_plumbing" | "requires_work_order" | "diagnosing";
    categoryCode?: string;
    categoryTitle?: string;
    recommendedDivision?: string;
    summary?: string;
    urgency?: boolean;
  };
}

export function renderCustomerSelfServiceComplaintView(container: HTMLElement): () => void {
  const allTickets = loadAllUnifiedTickets();
  container.innerHTML = "";

  const pageWrapper = document.createElement("div");
  pageWrapper.className = "customer-self-service-page";
  pageWrapper.style.cssText = `
    min-height: 100vh;
    background: #0F172A;
    background-image: radial-gradient(at 0% 0%, rgba(2, 132, 199, 0.22) 0px, transparent 50%),
                      radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.15) 0px, transparent 50%);
    padding: 20px 16px 60px;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    color: #F8FAFC;
    box-sizing: border-box;
  `;

  // Form State
  let meterIdValue = "";
  let customerNameValue = "";
  let phoneValue = "";
  let areaValue = "Cikupa";
  let addressValue = "";
  let coordsValue = "";
  let selectedCategoryCode = "KBSM";
  let descValue = "";
  let isUrgent = false;
  let photoDataUrl: string | null = null;
  let videoDataUrl: string | null = null;
  let isSubmitting = false;
  let submittedTicket: UnifiedTicket | null = null;

  // AI Chatbot State
  let isChatbotExpanded = true;
  let isAiThinking = false;
  let chatInputText = "";
  let chatMessages: ChatMessage[] = [
    {
      id: "msg-welcome",
      role: "assistant",
      text: `Halo! Saya **Asisten Diagnostik Cerdas AETRA** 🤖💧

Sebelum membuat tiket perbaikan teknisi, mari kita lakukan pengecekan awal sederhana. Banyak kendala air (seperti kran depan meteran yang tertutup atau saringan kran tersumbat) dapat teratasi sendiri dalam 2 menit tanpa perlu menunggu antrean teknisi.

Apa yang sedang dialami di rumah Anda saat ini?`,
      options: [
        "💧 Air mati total di rumah",
        "📉 Aliran air sangat kecil",
        "🟤 Air keruh kecokelatan",
        "🔧 Pipa depan rumah bocor",
        "📈 Tagihan rekening melonjak",
      ],
    },
  ];

  // Auto-fill lookup helper from existing customer database
  function findExistingCustomerByMeter(meter: string) {
    const clean = meter.trim().toLowerCase();
    if (!clean) return null;
    return allTickets.find((t) => {
      if (t.meterId && t.meterId.toLowerCase() === clean) return true;
      if (t.meterId && t.meterId.toLowerCase().includes(clean)) return true;
      return false;
    });
  }

  // Send message to AI Diagnostic Server Endpoint
  async function sendAiMessage(messageText: string) {
    if (!messageText.trim() || isAiThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: messageText.trim(),
    };

    chatMessages.push(userMsg);
    chatInputText = "";
    isAiThinking = true;
    render();

    try {
      const historyPayload = chatMessages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: messageText.trim(),
          history: historyPayload,
          customerName: customerNameValue,
          meterId: meterIdValue,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const aiReplyMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: data.reply || "Terima kasih atas informasinya. Mari kita lanjutkan pengecekan.",
        options: data.options,
        suggestedAction: data.suggestedAction,
      };

      chatMessages.push(aiReplyMsg);
    } catch (err) {
      console.warn("AI diagnostic request failed, using intelligent offline fallback:", err);
      // Graceful offline fallback
      chatMessages.push({
        id: `ai-err-${Date.now()}`,
        role: "assistant",
        text: `Terima kasih atas informasinya. Jika Anda telah memeriksa bahwa stop kran meteran dalam posisi terbuka dan air tetap tidak mengalir atau pipa mengalami kebocoran di luar rumah, silakan lanjutkan dengan mengisi formulir di bawah ini agar teknisi lapangan Aetra segera ditugaskan ke lokasi.`,
        suggestedAction: {
          type: "requires_work_order",
          categoryCode: selectedCategoryCode,
          categoryTitle: "Pengaduan Teknis Lapangan",
          summary: messageText.trim(),
          urgency: isUrgent,
        },
      });
    } finally {
      isAiThinking = false;
      render();
      // Scroll chat to bottom
      setTimeout(() => {
        const chatFeed = pageWrapper.querySelector("#ai-chat-messages-container");
        if (chatFeed) {
          chatFeed.scrollTop = chatFeed.scrollHeight;
        }
      }, 50);
    }
  }

  // Apply AI diagnosis to the form
  function applyAiDiagnosisToForm(action: NonNullable<ChatMessage["suggestedAction"]>) {
    if (action.categoryCode) {
      selectedCategoryCode = action.categoryCode;
    }
    if (action.summary) {
      descValue = action.summary;
    }
    if (action.urgency !== undefined) {
      isUrgent = action.urgency;
    }

    render();

    // Smooth scroll down to the form
    setTimeout(() => {
      const formEl = pageWrapper.querySelector("#form-customer-complaint");
      if (formEl) {
        formEl.scrollIntoView({ behavior: "smooth" });
      }
      // @ts-ignore
      if ((window as any).Swal) {
        // @ts-ignore
        (window as any).Swal.fire({
          icon: "success",
          title: "Diagnosa AI Diterapkan! ✨",
          text: "Kategori dan deskripsi telah otomatis terisi. Silakan lengkapi nomor meter dan alamat untuk mengirim laporan.",
          timer: 2200,
          showConfirmButton: false,
        });
      }
    }, 100);
  }

  function render() {
    if (submittedTicket) {
      renderSuccessView();
      return;
    }

    pageWrapper.innerHTML = `
      <div style="max-width: 520px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; width: 100%;">
        
        <!-- Mobile Header Bar -->
        <header style="display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px 16px; background: rgba(30, 41, 59, 0.9); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; padding: 4px; box-sizing: border-box; box-shadow: 0 4px 14px rgba(0,0,0,0.3);">
              <img src="/aetra-logo.svg" alt="Aetra Air Tangerang" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
            <div>
              <div style="font-size: 13.5px; font-weight: 900; letter-spacing: 0.3px; color: #FFFFFF;">
                AETRA AIR TANGERANG
              </div>
              <div style="font-size: 10.5px; color: #38BDF8; font-weight: 700;">
                Portal Pengaduan Mandiri Pelanggan
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <a href="?wo=WO-2026-001&view=track" style="padding: 6px 10px; font-size: 11px; font-weight: 700; color: #38BDF8; background: rgba(2, 132, 199, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
              <span>🔍</span>
              <span>Lacak Tiket</span>
            </a>
          </div>
        </header>

        <!-- ======================================================== -->
        <!-- AI SMART DIAGNOSTIC CHATBOT (FEATURE INTEGRATION)        -->
        <!-- Guides users through initial troubleshooting before      -->
        <!-- submitting a work order to reduce unnecessary dispatch.  -->
        <!-- ======================================================== -->
        <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%); border: 1.5px solid ${
          isChatbotExpanded ? "#38BDF8" : "rgba(56, 189, 248, 0.3)"
        }; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 32px rgba(2, 132, 199, 0.2);">
          
          <!-- Chatbot Header / Banner Toggle -->
          <div
            id="btn-toggle-chatbot"
            style="padding: 14px 16px; background: linear-gradient(135deg, rgba(2, 132, 199, 0.35) 0%, rgba(30, 41, 59, 0.8) 100%); border-bottom: ${
              isChatbotExpanded ? "1px solid #334155" : "none"
            }; display: flex; justify-content: space-between; align-items: center; cursor: pointer;"
          >
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #38BDF8 0%, #0284C7 100%); display: flex; align-items: center; justify-content: center; font-size: 19px; box-shadow: 0 0 14px rgba(56, 189, 248, 0.5);">
                🤖
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-size: 13.5px; font-weight: 900; color: #FFFFFF;">
                    Asisten Diagnostik Cerdas AETRA
                  </span>
                  <span style="background: rgba(16, 185, 129, 0.2); color: #34D399; font-size: 9.5px; font-weight: 800; padding: 2px 6px; border-radius: 10px; border: 1px solid #10B981;">
                    AI Aktif
                  </span>
                </div>
                <div style="font-size: 11px; color: #BAE6FD; margin-top: 1px;">
                  Panduan cek mandiri cepat • Cegah antrean teknisi yang tidak perlu
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11.5px; color: #38BDF8; font-weight: 800;">
                ${isChatbotExpanded ? "Sembunyikan" : "Buka Diagnosa AI"}
              </span>
              <span style="font-size: 12px; color: #38BDF8;">
                ${isChatbotExpanded ? "▲" : "▼"}
              </span>
            </div>
          </div>

          <!-- Chatbot Interactive Body -->
          ${
            isChatbotExpanded
              ? `
            <div style="display: flex; flex-direction: column;">
              
              <!-- Message Feed Container -->
              <div
                id="ai-chat-messages-container"
                style="padding: 14px; max-height: 380px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background: rgba(15, 23, 42, 0.7); scroll-behavior: smooth;"
              >
                ${chatMessages
                  .map((msg) => {
                    const isUser = msg.role === "user";
                    return `
                    <div style="display: flex; flex-direction: column; align-items: ${
                      isUser ? "flex-end" : "flex-start"
                    }; gap: 6px;">
                      
                      <!-- Chat Bubble -->
                      <div style="max-width: 88%; padding: 12px 14px; border-radius: ${
                        isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px"
                      }; background: ${
                      isUser
                        ? "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)"
                        : "#1E293B"
                    }; border: 1px solid ${
                      isUser ? "#0284C7" : "#334155"
                    }; color: #F8FAFC; font-size: 12.5px; line-height: 1.5; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                        ${msg.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>")}
                      </div>

                      <!-- AI Diagnostic Outcome Banner (If Determined) -->
                      ${
                        msg.suggestedAction
                          ? `
                        <div style="max-width: 90%; background: ${
                          msg.suggestedAction.type === "resolved_self_service"
                            ? "rgba(16, 185, 129, 0.18)"
                            : msg.suggestedAction.type === "internal_plumbing"
                            ? "rgba(245, 158, 11, 0.18)"
                            : "rgba(2, 132, 199, 0.22)"
                        }; border: 1.5px solid ${
                              msg.suggestedAction.type === "resolved_self_service"
                                ? "#10B981"
                                : msg.suggestedAction.type === "internal_plumbing"
                                ? "#F59E0B"
                                : "#0284C7"
                            }; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                          
                          <div style="display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 12px; color: ${
                            msg.suggestedAction.type === "resolved_self_service"
                              ? "#34D399"
                              : msg.suggestedAction.type === "internal_plumbing"
                              ? "#FBBF24"
                              : "#38BDF8"
                          };">
                            <span>${
                              msg.suggestedAction.type === "resolved_self_service"
                                ? "🎉 KESIMPULAN: BERHASIL TERATASI MANDIRI"
                                : msg.suggestedAction.type === "internal_plumbing"
                                ? "🏠 KESIMPULAN: INSTALASI PIPA DALAM RUMAH"
                                : "🛠️ KESIMPULAN: MEMERLUKAN TEKNISI AETRA"
                            }</span>
                          </div>

                          <div style="font-size: 11.5px; color: #E2E8F0; line-height: 1.4;">
                            ${
                              msg.suggestedAction.type === "resolved_self_service"
                                ? "Masalah air dapat diselesaikan secara mandiri. Tidak ada pembuatan tiket Work Order yang diperlukan. Anda telah menghemat waktu tunggu!"
                                : msg.suggestedAction.type === "internal_plumbing"
                                ? "Kebocoran/gangguan berada di instalasi rumah setelah meter air. Hal ini merupakan wewenang pemilik persil (disarankan menggunakan jasa tukang ledeng swasta)."
                                : `Kendala terkonfirmasi pada sambungan persil dinas AETRA (${
                                    msg.suggestedAction.categoryTitle || "Perbaikan Teknis"
                                  }). Rekomendasi: Ajukan formulir laporan pengaduan teknisi.`
                            }
                          </div>

                          ${
                            msg.suggestedAction.type === "requires_work_order"
                              ? `
                            <button
                              class="btn-apply-ai-diagnosis"
                              type="button"
                              data-category="${msg.suggestedAction.categoryCode || "KBSM"}"
                              data-summary="${encodeURIComponent(msg.suggestedAction.summary || "")}"
                              data-urgent="${msg.suggestedAction.urgency ? "true" : "false"}"
                              style="padding: 9px 12px; font-size: 11.5px; font-weight: 800; background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color: #FFFFFF; border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);"
                            >
                              <span>🚀</span> <span>Terapkan Diagnosa AI ke Formulir Bawah ➔</span>
                            </button>
                          `
                              : ""
                          }

                        </div>
                      `
                          : ""
                      }

                      <!-- Quick Reply Options / Chips -->
                      ${
                        msg.options && msg.options.length > 0
                          ? `
                        <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px;">
                          ${msg.options
                            .map(
                              (opt) => `
                            <button
                              class="btn-ai-quick-reply"
                              type="button"
                              data-text="${encodeURIComponent(opt)}"
                              style="background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(56, 189, 248, 0.35); color: #BAE6FD; font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.15s ease;"
                            >
                              ${opt}
                            </button>
                          `
                            )
                            .join("")}
                        </div>
                      `
                          : ""
                      }

                    </div>
                  `;
                  })
                  .join("")}

                ${
                  isAiThinking
                    ? `
                  <div style="display: flex; align-items: center; gap: 8px; color: #38BDF8; font-size: 11.5px; padding: 6px 10px; background: rgba(30, 41, 59, 0.6); border-radius: 10px; width: fit-content;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: #38BDF8; animation: pulse 1s infinite;"></div>
                    <span>AI sedang menganalisis kendala Anda...</span>
                  </div>
                `
                    : ""
                }
              </div>

              <!-- Chat Input Bar -->
              <div style="padding: 10px 14px; background: #1E293B; border-top: 1px solid #334155; display: flex; gap: 8px; align-items: center;">
                <input
                  id="input-ai-chat"
                  type="text"
                  placeholder="Ketik pertanyaan atau respon hasil cek Anda..."
                  value="${chatInputText}"
                  style="flex: 1; background: #0F172A; border: 1px solid #334155; border-radius: 10px; padding: 9px 12px; font-size: 12px; color: #FFFFFF; outline: none; font-family: inherit;"
                />
                <button
                  id="btn-send-ai-chat"
                  type="button"
                  ${isAiThinking ? "disabled" : ""}
                  style="padding: 9px 14px; font-size: 12px; font-weight: 800; background: #0284C7; color: #FFFFFF; border: none; border-radius: 10px; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 4px;"
                >
                  <span>Kirim</span> <span>➔</span>
                </button>
              </div>

            </div>
          `
              : ""
          }

        </div>

        <!-- Section Title: Formulir Pengaduan Mandiri -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <div>
            <h2 style="font-size: 15px; font-weight: 900; color: #FFFFFF; margin: 0;">
              Formulir Laporan Pengaduan Resmi
            </h2>
            <div style="font-size: 11px; color: #94A3B8;">
              Isi data di bawah ini untuk menerbitkan Work Order penanganan teknisi:
            </div>
          </div>
        </div>

        <!-- Main Form Container -->
        <form id="form-customer-complaint" style="background: #1E293B; border: 1px solid #334155; border-radius: 20px; padding: 20px 16px; display: flex; flex-direction: column; gap: 18px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
          
          <!-- STEP 1: IDENTITAS PELANGGAN -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 12px; font-weight: 800; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.5px;">
                1. Data Pelanggan & Nomor Meter
              </span>
              <span style="font-size: 10px; color: #94A3B8; font-weight: 600;">Langkah 1 dari 4</span>
            </div>

            <!-- Meter ID Input with Quick Auto-fill -->
            <div>
              <label for="input-meter-id" style="display: block; font-size: 11.5px; font-weight: 700; color: #E2E8F0; margin-bottom: 4px;">
                Nomor Meter / ID Pelanggan <span style="color:#F87171;">*</span>
              </label>
              <div style="position: relative;">
                <input
                  id="input-meter-id"
                  type="text"
                  required
                  value="${meterIdValue}"
                  placeholder="Contoh: MTR-88291 atau 88291"
                  style="width: 100%; box-sizing: border-box; background: #0F172A; border: 1.5px solid #334155; border-radius: 10px; padding: 10px 12px; font-size: 13px; color: #FFFFFF; outline: none; font-family: inherit;"
                />
              </div>
              <div id="meter-hint-box" style="margin-top: 4px; font-size: 10.5px; color: #94A3B8;">
                💡 <em>Nomor meter tertera pada bagian atas meteran air atau lembar struk tagihan bulanan.</em>
              </div>
            </div>

            <!-- Customer Name -->
            <div>
              <label for="input-customer-name" style="display: block; font-size: 11.5px; font-weight: 700; color: #E2E8F0; margin-bottom: 4px;">
                Nama Lengkap Pelapor / Penghuni <span style="color:#F87171;">*</span>
              </label>
              <input
                id="input-customer-name"
                type="text"
                required
                value="${customerNameValue}"
                placeholder="Contoh: Bpk. Suherman"
                style="width: 100%; box-sizing: border-box; background: #0F172A; border: 1.5px solid #334155; border-radius: 10px; padding: 10px 12px; font-size: 13px; color: #FFFFFF; outline: none; font-family: inherit;"
              />
            </div>

            <!-- Phone WhatsApp (Critical for Live Tracking Link Delivery) -->
            <div>
              <label for="input-phone" style="display: block; font-size: 11.5px; font-weight: 700; color: #E2E8F0; margin-bottom: 4px;">
                Nomor WhatsApp Aktif <span style="color:#F87171;">*</span>
              </label>
              <div style="position: relative;">
                <input
                  id="input-phone"
                  type="tel"
                  required
                  value="${phoneValue}"
                  placeholder="Contoh: 081299887766"
                  style="width: 100%; box-sizing: border-box; background: #0F172A; border: 1.5px solid #334155; border-radius: 10px; padding: 10px 12px; font-size: 13px; color: #FFFFFF; outline: none; font-family: inherit;"
                />
              </div>
              <div style="margin-top: 4px; font-size: 10.5px; color: #34D399; display: flex; align-items: center; gap: 4px;">
                <span>💬</span> <span>Link Live Tracking akan dikirimkan otomatis ke nomor ini.</span>
              </div>
            </div>

          </div>

          <!-- STEP 2: LOKASI & ALAMAT -->
          <div style="display: flex; flex-direction: column; gap: 10px; padding-top: 14px; border-top: 1px solid #334155;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 12px; font-weight: 800; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.5px;">
                2. Alamat & Titik Lokasi Gangguan
              </span>
              <span style="font-size: 10px; color: #94A3B8; font-weight: 600;">Langkah 2 dari 4</span>
            </div>

            <!-- Area Selector -->
            <div>
              <label for="select-area" style="display: block; font-size: 11.5px; font-weight: 700; color: #E2E8F0; margin-bottom: 4px;">
                Wilayah / Kecamatan di Tangerang <span style="color:#F87171;">*</span>
              </label>
              <select
                id="select-area"
                style="width: 100%; box-sizing: border-box; background: #0F172A; border: 1.5px solid #334155; border-radius: 10px; padding: 10px 12px; font-size: 13px; color: #FFFFFF; outline: none; font-family: inherit;"
              >
                ${OPERATIONAL_AREAS.map(
                  (a) => `<option value="${a}" ${a === areaValue ? "selected" : ""}>📍 Wilayah ${a}</option>`
                ).join("")}
              </select>
            </div>

            <!-- Address Input -->
            <div>
              <label for="input-address" style="display: block; font-size: 11.5px; font-weight: 700; color: #E2E8F0; margin-bottom: 4px;">
                Alamat Lengkap & Patokan Rumah <span style="color:#F87171;">*</span>
              </label>
              <textarea
                id="input-address"
                rows="2"
                required
                placeholder="Contoh: Jl. Raya Serang Km 14 No. 42 (Pagar hitam samping warung kelontong)"
                style="width: 100%; box-sizing: border-box; background: #0F172A; border: 1.5px solid #334155; border-radius: 10px; padding: 10px 12px; font-size: 12.5px; color: #FFFFFF; outline: none; font-family: inherit; line-height: 1.45; resize: vertical;"
              >${addressValue}</textarea>
            </div>

            <!-- GPS Coordinates Button -->
            <div style="background: rgba(15, 23, 42, 0.6); border: 1px dashed #334155; border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <div>
                  <div style="font-size: 11px; font-weight: 800; color: #F8FAFC;">
                    Titik Presisi GPS Lokasi (Opsional)
                  </div>
                  <div id="gps-coords-display" style="font-size: 10.5px; color: ${coordsValue ? "#34D399" : "#94A3B8"}; font-family: monospace;">
                    ${coordsValue ? `📍 Koordinat: ${coordsValue}` : "Koordinat belum disematkan"}
                  </div>
                </div>

                <button
                  id="btn-get-gps"
                  type="button"
                  style="padding: 7px 12px; font-size: 11px; font-weight: 800; background: rgba(56, 189, 248, 0.15); color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;"
                >
                  <span>📍</span>
                  <span>Gunakan GPS Saya</span>
                </button>
              </div>
            </div>

          </div>

          <!-- STEP 3: KATEGORI KENDALA -->
          <div style="display: flex; flex-direction: column; gap: 10px; padding-top: 14px; border-top: 1px solid #334155;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 12px; font-weight: 800; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.5px;">
                3. Jenis Gangguan / Masalah Air
              </span>
              <span style="font-size: 10px; color: #94A3B8; font-weight: 600;">Langkah 3 dari 4</span>
            </div>

            <!-- Categories Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 8px;">
              ${ISSUE_CATEGORIES.map((cat) => {
                const isSelected = cat.code === selectedCategoryCode;
                return `
                  <div
                    class="cat-card-option"
                    data-code="${cat.code}"
                    style="background: ${isSelected ? "rgba(2, 132, 199, 0.22)" : "#0F172A"}; border: 1.5px solid ${
                  isSelected ? "#38BDF8" : "#334155"
                }; border-radius: 12px; padding: 10px 12px; cursor: pointer; transition: all 0.15s ease;"
                  >
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 18px;">${cat.icon}</span>
                        <strong style="font-size: 11.5px; color: ${isSelected ? "#38BDF8" : "#F8FAFC"};">${cat.title}</strong>
                      </div>
                      <span style="font-size: 12px; color: ${isSelected ? "#38BDF8" : "#475569"};">
                        ${isSelected ? "●" : "○"}
                      </span>
                    </div>
                    <div style="font-size: 10.5px; color: #94A3B8; line-height: 1.35;">
                      ${cat.desc}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>

            <!-- Detailed Explanation Textarea -->
            <div>
              <label for="input-desc" style="display: block; font-size: 11.5px; font-weight: 700; color: #E2E8F0; margin-bottom: 4px;">
                Penjelasan Tambahan Kendala
              </label>
              <textarea
                id="input-desc"
                rows="2"
                placeholder="Ceritakan detail kendala (Contoh: Pipa patah tersenggol motor, air menyembur dari pagi)"
                style="width: 100%; box-sizing: border-box; background: #0F172A; border: 1.5px solid #334155; border-radius: 10px; padding: 10px 12px; font-size: 12px; color: #FFFFFF; outline: none; font-family: inherit; line-height: 1.45; resize: vertical;"
              >${descValue}</textarea>
            </div>

          </div>

          <!-- STEP 4: FOTO BUKTI & URGENSI -->
          <div style="display: flex; flex-direction: column; gap: 10px; padding-top: 14px; border-top: 1px solid #334155;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 12px; font-weight: 800; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.5px;">
                4. Foto Bukti Kendala & Tingkat Urgensi
              </span>
              <span style="font-size: 10px; color: #94A3B8; font-weight: 600;">Langkah 4 dari 4</span>
            </div>

            <!-- Photo Upload with Preview -->
            <div>
              <label style="display: block; font-size: 11.5px; font-weight: 700; color: #E2E8F0; margin-bottom: 4px;">
                Lampirkan Foto Pipa / Meteran / Air (Opsional):
              </label>
              
              <div style="background: #0F172A; border: 1.5px dashed #334155; border-radius: 12px; padding: 12px; text-align: center;">
                ${
                  photoDataUrl
                    ? `
                  <div style="position: relative; display: inline-block;">
                    <img src="${photoDataUrl}" alt="Foto Bukti" style="max-height: 140px; border-radius: 8px; border: 1px solid #475569;" />
                    <button
                      id="btn-remove-photo"
                      type="button"
                      style="position: absolute; top: -6px; right: -6px; background: #EF4444; color: #FFFFFF; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; cursor: pointer; font-weight: 800;"
                    >✕</button>
                  </div>
                  <div style="font-size: 10px; color: #34D399; margin-top: 6px;">✓ Foto berhasil dilampirkan</div>
                `
                    : `
                  <div style="font-size: 26px; margin-bottom: 4px;">📷</div>
                  <div style="font-size: 11.5px; font-weight: 700; color: #F8FAFC; margin-bottom: 2px;">
                    Ambil Foto dari Kamera atau Pilih File
                  </div>
                  <div style="font-size: 10.5px; color: #94A3B8; margin-bottom: 8px;">
                    Format JPG/PNG maks. 5MB
                  </div>
                  <input
                    id="input-photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style="display: none;"
                  />
                  <button
                    id="btn-trigger-photo"
                    type="button"
                    style="padding: 6px 14px; font-size: 11.5px; font-weight: 800; background: #334155; color: #FFFFFF; border: 1px solid #475569; border-radius: 8px; cursor: pointer;"
                  >
                    Pilih Foto
                  </button>
                `
                }
              </div>
            </div>

            <!-- Video Upload with Preview -->
            <div>
              <label style="display: block; font-size: 11.5px; font-weight: 700; color: #E2E8F0; margin-bottom: 4px;">
                Lampirkan Video Bukti Kondisi Air/Pipa (Opsional):
              </label>
              
              <div style="background: #0F172A; border: 1.5px dashed #334155; border-radius: 12px; padding: 12px; text-align: center;">
                ${
                  videoDataUrl
                    ? `
                  <div style="position: relative; display: inline-block; width: 100%;">
                    <video src="${videoDataUrl}" controls style="max-height: 140px; width: 100%; border-radius: 8px; border: 1px solid #475569;"></video>
                    <button
                      id="btn-remove-video"
                      type="button"
                      style="position: absolute; top: 4px; right: 4px; background: #EF4444; color: #FFFFFF; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 11px; cursor: pointer; font-weight: 800;"
                    >✕</button>
                  </div>
                  <div style="font-size: 10px; color: #34D399; margin-top: 6px;">✓ Video berhasil dilampirkan</div>
                `
                    : `
                  <div style="font-size: 24px; margin-bottom: 4px;">📹</div>
                  <div style="font-size: 11.5px; font-weight: 700; color: #F8FAFC; margin-bottom: 2px;">
                    Rekam Video atau Pilih File Video
                  </div>
                  <div style="font-size: 10.5px; color: #94A3B8; margin-bottom: 8px;">
                    Format MP4/MOV maks. 25MB
                  </div>
                  <input
                    id="input-video"
                    type="file"
                    accept="video/*"
                    capture="environment"
                    style="display: none;"
                  />
                  <button
                    id="btn-trigger-video"
                    type="button"
                    style="padding: 6px 14px; font-size: 11.5px; font-weight: 800; background: #334155; color: #FFFFFF; border: 1px solid #475569; border-radius: 8px; cursor: pointer;"
                  >
                    Pilih Video
                  </button>
                `
                }
              </div>
            </div>
            <label style="display: flex; align-items: flex-start; gap: 10px; background: rgba(239, 68, 68, 0.1); border: 1.5px solid rgba(239, 68, 68, 0.35); border-radius: 12px; padding: 12px; cursor: pointer;">
              <input
                id="check-urgent"
                type="checkbox"
                ${isUrgent ? "checked" : ""}
                style="width: 18px; height: 18px; accent-color: #EF4444; margin-top: 2px;"
              />
              <div>
                <div style="font-size: 12px; font-weight: 800; color: #F87171;">
                  🚨 Ini Kondisi Darurat / Air Menyembur Sangat Kencang
                </div>
                <div style="font-size: 10.5px; color: #E2E8F0; margin-top: 2px;">
                  Centang opsi ini agar tiket diprioritaskan oleh Tim Reaksi Cepat 24 Jam.
                </div>
              </div>
            </label>

          </div>

          <!-- Submit Button -->
          <div style="padding-top: 6px;">
            <button
              id="btn-submit-complaint"
              type="submit"
              ${isSubmitting ? "disabled" : ""}
              style="width: 100%; padding: 14px; font-size: 14px; font-weight: 900; background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color: #FFFFFF; border: none; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 18px rgba(2, 132, 199, 0.45); transition: transform 0.15s ease;"
            >
              <span>🚀</span>
              <span>${isSubmitting ? "Mendaftarkan Pengaduan..." : "Kirim Pengaduan & Dapatkan No. Tiket"}</span>
            </button>
          </div>

        </form>

        <!-- Help Info Footer -->
        <footer style="text-align: center; font-size: 11px; color: #64748B; line-height: 1.5;">
          <div>PT AETRA AIR TANGERANG • Layanan Pengaduan 24 Jam</div>
          <div>Call Center: <strong>(021) 598-1122</strong> | WhatsApp CS: <strong>0812-8899-0011</strong></div>
        </footer>

      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    // 1. AI Chatbot Toggle
    const toggleBtn = pageWrapper.querySelector("#btn-toggle-chatbot");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        isChatbotExpanded = !isChatbotExpanded;
        render();
      });
    }

    // 2. Chat Input and Send
    const chatInput = pageWrapper.querySelector("#input-ai-chat") as HTMLInputElement | null;
    const sendBtn = pageWrapper.querySelector("#btn-send-ai-chat") as HTMLButtonElement | null;

    if (chatInput && sendBtn) {
      chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          sendAiMessage(chatInput.value);
        }
      });

      sendBtn.addEventListener("click", () => {
        sendAiMessage(chatInput.value);
      });
    }

    // 3. Quick Reply Chips
    const quickChips = pageWrapper.querySelectorAll(".btn-ai-quick-reply");
    quickChips.forEach((chip) => {
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        const raw = chip.getAttribute("data-text");
        if (raw) {
          sendAiMessage(decodeURIComponent(raw));
        }
      });
    });

    // 4. Apply AI Diagnosis Button
    const applyButtons = pageWrapper.querySelectorAll(".btn-apply-ai-diagnosis");
    applyButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const cat = btn.getAttribute("data-category") || "KBSM";
        const sumRaw = btn.getAttribute("data-summary") || "";
        const urgent = btn.getAttribute("data-urgent") === "true";
        applyAiDiagnosisToForm({
          type: "requires_work_order",
          categoryCode: cat,
          summary: decodeURIComponent(sumRaw),
          urgency: urgent,
        });
      });
    });

    // 5. Form inputs
    const form = pageWrapper.querySelector("#form-customer-complaint") as HTMLFormElement | null;
    if (!form) return;

    const meterInput = form.querySelector("#input-meter-id") as HTMLInputElement | null;
    const nameInput = form.querySelector("#input-customer-name") as HTMLInputElement | null;
    const addressInput = form.querySelector("#input-address") as HTMLTextAreaElement | null;
    const areaSelect = form.querySelector("#select-area") as HTMLSelectElement | null;
    const meterHintBox = form.querySelector("#meter-hint-box");

    if (meterInput) {
      meterInput.addEventListener("input", () => {
        meterIdValue = meterInput.value;
        const matched = findExistingCustomerByMeter(meterIdValue);
        if (matched) {
          if (nameInput && !nameInput.value) {
            nameInput.value = matched.customer;
            customerNameValue = matched.customer;
          }
          if (addressInput && !addressInput.value) {
            addressInput.value = matched.address;
            addressValue = matched.address;
          }
          if (areaSelect && matched.area) {
            areaSelect.value = matched.area;
            areaValue = matched.area;
          }
          if (meterHintBox) {
            meterHintBox.innerHTML = `✅ <span style="color:#34D399; font-weight:700;">Data Meter Dikenali: ${matched.customer} (${matched.area})</span>`;
          }
        }
      });
    }

    if (nameInput) {
      nameInput.addEventListener("input", () => { customerNameValue = nameInput.value; });
    }

    const phoneInput = form.querySelector("#input-phone") as HTMLInputElement | null;
    if (phoneInput) {
      phoneInput.addEventListener("input", () => { phoneValue = phoneInput.value; });
    }

    if (areaSelect) {
      areaSelect.addEventListener("change", () => { areaValue = areaSelect.value; });
    }

    if (addressInput) {
      addressInput.addEventListener("input", () => { addressValue = addressInput.value; });
    }

    const descInput = form.querySelector("#input-desc") as HTMLTextAreaElement | null;
    if (descInput) {
      descInput.addEventListener("input", () => { descValue = descInput.value; });
    }

    const urgentCheck = form.querySelector("#check-urgent") as HTMLInputElement | null;
    if (urgentCheck) {
      urgentCheck.addEventListener("change", () => { isUrgent = urgentCheck.checked; });
    }

    // Category Card Selection
    const catCards = form.querySelectorAll(".cat-card-option");
    catCards.forEach((card) => {
      card.addEventListener("click", () => {
        const code = card.getAttribute("data-code");
        if (code) {
          selectedCategoryCode = code;
          const found = ISSUE_CATEGORIES.find((c) => c.code === code);
          if (found && found.defaultUrgent) {
            isUrgent = true;
          }
          render();
        }
      });
    });

    // GPS Geolocation Trigger
    const gpsBtn = form.querySelector("#btn-get-gps");
    const gpsDisplay = form.querySelector("#gps-coords-display");
    if (gpsBtn) {
      gpsBtn.addEventListener("click", () => {
        if (!navigator.geolocation) {
          alert("Browser Anda tidak mendukung deteksi lokasi GPS.");
          return;
        }

        gpsBtn.textContent = "Mencari GPS...";
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude.toFixed(5);
            const lng = pos.coords.longitude.toFixed(5);
            coordsValue = `${lat}, ${lng}`;
            if (gpsDisplay) {
              gpsDisplay.textContent = `📍 Koordinat GPS: ${coordsValue}`;
              (gpsDisplay as HTMLElement).style.color = "#34D399";
            }
            gpsBtn.textContent = "✓ GPS Terpasang";
          },
          (err) => {
            console.warn("Geolocation error:", err);
            gpsBtn.textContent = "📍 Coba Lagi";
            alert("Tidak dapat mendeteksi lokasi GPS secara otomatis. Silakan tulis patokan di kolom alamat.");
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
    }

    // Photo Upload Trigger & Removal
    const triggerPhotoBtn = form.querySelector("#btn-trigger-photo");
    const photoFileInput = form.querySelector("#input-photo") as HTMLInputElement | null;
    if (triggerPhotoBtn && photoFileInput) {
      triggerPhotoBtn.addEventListener("click", () => photoFileInput.click());
      photoFileInput.addEventListener("change", (e: any) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            photoDataUrl = re.target?.result as string;
            render();
          };
          reader.readAsDataURL(file);
        }
      });
    }

    const removePhotoBtn = form.querySelector("#btn-remove-photo");
    if (removePhotoBtn) {
      removePhotoBtn.addEventListener("click", () => {
        photoDataUrl = null;
        render();
      });
    }

    // Video Upload Trigger & Removal
    const triggerVideoBtn = form.querySelector("#btn-trigger-video");
    const videoFileInput = form.querySelector("#input-video") as HTMLInputElement | null;
    if (triggerVideoBtn && videoFileInput) {
      triggerVideoBtn.addEventListener("click", () => videoFileInput.click());
      videoFileInput.addEventListener("change", (e: any) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          if (file.size > 25 * 1024 * 1024) {
            alert("Ukuran video terlalu besar. Maksimal 25MB.");
            return;
          }
          const reader = new FileReader();
          reader.onload = (re) => {
            videoDataUrl = re.target?.result as string;
            render();
          };
          reader.readAsDataURL(file);
        }
      });
    }

    const removeVideoBtn = form.querySelector("#btn-remove-video");
    if (removeVideoBtn) {
      removeVideoBtn.addEventListener("click", () => {
        videoDataUrl = null;
        render();
      });
    }

    // Form Submit Handler
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      const meterVal = meterInput ? meterInput.value.trim() : meterIdValue;
      const nameVal = nameInput ? nameInput.value.trim() : customerNameValue;
      const phoneVal = phoneInput ? phoneInput.value.trim() : phoneValue;
      const addressVal = addressInput ? addressInput.value.trim() : addressValue;
      const areaVal = areaSelect ? areaSelect.value : areaValue;
      const descVal = descInput ? descInput.value.trim() : descValue;

      if (!meterVal || !nameVal || !phoneVal || !addressVal) {
        alert("Mohon lengkapi No. Pelanggan/Meter, Nama Pelanggan, No. HP, dan Alamat Anda.");
        isSubmitting = false;
        const submitBtn = form.querySelector("#btn-submit-complaint") as HTMLButtonElement | null;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "🚀 Kirim Pengaduan & Dapatkan No. Tiket";
        }
        return;
      }

      const catInfo = ISSUE_CATEGORIES.find((c) => c.code === selectedCategoryCode) || ISSUE_CATEGORIES[0];
      const targetDiv: DivisionId = catInfo.defaultDivision || getRecommendedDivision(catInfo.code);

      // Generate New Work Order ID
      const year = new Date().getFullYear();
      let maxNum = 46;
      allTickets.forEach((t) => {
        const m = t.id.match(/WO-\d{4}-(\d+)/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
      });
      const newWoId = `WO-${year}-${String(maxNum + 1).padStart(3, "0")}`;
      const newCaseId = generateCaseId(newWoId);

      isSubmitting = true;
      const submitBtn = form.querySelector("#btn-submit-complaint") as HTMLButtonElement | null;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Menyimpan & Mendaftarkan Tiket...";
      }

      const newTicket: UnifiedTicket = {
        id: newWoId,
        caseId: newCaseId,
        customer: nameVal,
        meterId: meterVal,
        phone: phoneVal,
        address: addressVal,
        area: areaVal,
        category: catInfo.code,
        desc: descVal || `${catInfo.title} - ${catInfo.desc}`,
        status: "baru",
        urgent: isUrgent,
        coords: coordsValue || undefined,
        photoBefore: photoDataUrl || undefined,
        videoBefore: videoDataUrl || undefined,
        receivedAt: new Date().toISOString(),
        targetDivision: targetDiv,
        distributionStatus: "distributed",
        distributedAt: new Date().toISOString(),
        distributedBy: "Sistem Portal Mandiri Pelanggan (Diagnosa AI)",
        distributionNotes: `Laporan mandiri pelanggan via Web Portal. Masalah: ${catInfo.title}`,
        intakeChannel: "Mobile App",
        officer: "Agus Setiawan",
        comments: [
          {
            id: `cmt-init-${Date.now()}`,
            authorName: `${nameVal} (Pelapor Mandiri)`,
            authorDivision: "customer_service",
            authorRole: "Pelanggan",
            targetDepartment: "Semua Divisi Teknis",
            content: `Pengaduan mandiri berhasil dibuat melalui portal setelah panduan diagnosa AI. Kategori: [${catInfo.code}] ${catInfo.title}.`,
            createdAt: new Date().toISOString(),
          },
        ],
      };

      // Save to customer submissions inbox queue for CS verification
      saveSingleSubmission({
        id: `SUBM-2026-${String(Date.now()).slice(-4)}`,
        customerName: nameVal,
        phone: phoneVal,
        meterId: meterVal,
        address: addressVal,
        area: areaVal,
        category: catInfo.code,
        desc: descVal || `${catInfo.title} - ${catInfo.desc}`,
        photo: photoDataUrl || null,
        video: videoDataUrl || null,
        coords: coordsValue || undefined,
        submittedAt: new Date().toISOString(),
        status: "menunggu_verifikasi",
        isUrgent: isUrgent,
        source: "Web Portal Mandiri",
        createdCaseId: newTicket.caseId,
        createdTicketId: newTicket.id,
      });

      // Save to storage
      await saveSingleTicket(newTicket);

      // Broadcast real-time notification
      publishWorkOrderNotification({
        ticketId: newTicket.id,
        caseId: newTicket.caseId,
        customer: newTicket.customer,
        address: newTicket.address,
        officerName: newTicket.officer || "Petugas Lapangan",
        officerDivision: newTicket.targetDivision,
        targetDivision: newTicket.targetDivision,
        oldStatus: "baru",
        newStatus: "baru",
        actionType: "new_report",
        summary: `🔔 Pengaduan Mandiri Baru: ${newTicket.customer} [${newTicket.id}] - ${catInfo.title}`,
        details: newTicket.desc,
        urgent: newTicket.urgent,
      });

      isSubmitting = false;
      submittedTicket = newTicket;
      render();
    });
  }

  // Success view with Live Tracking button & WhatsApp quick launch
  function renderSuccessView() {
    if (!submittedTicket) return;
    const ticket = submittedTicket;
    const liveTrackUrl = `${window.location.origin}/?wo=${encodeURIComponent(ticket.id)}&view=track`;
    const catInfo = ISSUE_CATEGORIES.find((c) => c.code === ticket.category) || ISSUE_CATEGORIES[0];

    pageWrapper.innerHTML = `
      <div style="max-width: 480px; margin: 20px auto; display: flex; flex-direction: column; gap: 16px; width: 100%;">
        
        <!-- Success Certificate Card -->
        <div style="background: #1E293B; border: 1.5px solid #10B981; border-radius: 20px; padding: 26px 18px; text-align: center; box-shadow: 0 16px 40px rgba(16, 185, 129, 0.2); display: flex; flex-direction: column; align-items: center; gap: 14px;">
          
          <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(16, 185, 129, 0.2); border: 2.5px solid #10B981; display: flex; align-items: center; justify-content: center; font-size: 32px; box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);">
            ✓
          </div>

          <div>
            <span style="font-size: 11px; font-weight: 800; color: #34D399; text-transform: uppercase; letter-spacing: 0.8px;">
              PENGADUAN BERHASIL DITERBITKAN
            </span>
            <h2 style="font-size: 22px; font-weight: 900; color: #FFFFFF; margin: 4px 0 6px 0;">
              Laporan Anda Sedang Diproses
            </h2>
            <div style="font-size: 12.5px; color: #94A3B8; line-height: 1.45;">
              Terima kasih, <b>${ticket.customer}</b>. Laporan pengaduan air bersih telah resmi tercatat di sistem CRM PT Aetra Air Tangerang.
            </div>
          </div>

          <!-- Ticket Box Info -->
          <div style="background: #0F172A; border: 1px solid #334155; border-radius: 14px; padding: 14px 16px; width: 100%; box-sizing: border-box; text-align: left; display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 6px;">
              <span style="color: #94A3B8;">Nomor Work Order:</span>
              <strong style="color: #38BDF8; font-family: monospace; font-size: 13px;">${ticket.id}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94A3B8;">Case ID:</span>
              <strong style="color: #F8FAFC; font-family: monospace;">#${ticket.caseId}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94A3B8;">Jenis Kendala:</span>
              <strong style="color: #FCD34D;">${catInfo.icon} ${catInfo.title}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94A3B8;">Alamat Pelapor:</span>
              <span style="color: #E2E8F0; text-align: right; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ticket.address}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94A3B8;">Status Saat Ini:</span>
              <span style="color: #34D399; font-weight: 800;">● Baru (Masuk Antrean Petugas)</span>
            </div>
          </div>

          <!-- PRIMARY ACTION 1: LAUNCH LIVE TRACKING -->
          <div style="width: 100%; display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
            <a
              href="${liveTrackUrl}"
              style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-sizing: border-box; padding: 13px 18px; font-size: 13.5px; font-weight: 900; background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color: #FFFFFF; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.45);"
            >
              <span>🚗</span>
              <span>Buka Live Tracking Pengaduan</span>
              <span>➔</span>
            </a>

            <!-- SECONDARY ACTION 2: WHATSAPP NOTIFICATION -->
            <a
              href="https://wa.me/?text=${encodeURIComponent(
                `Halo, laporan gangguan air AETRA saya (${ticket.customer}) telah dibuat dengan No. WO: ${ticket.id}. Pantau perjalanan petugas di link live tracking: ${liveTrackUrl}`
              )}"
              target="_blank"
              rel="noopener noreferrer"
              style="display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; box-sizing: border-box; padding: 11px 16px; font-size: 12.5px; font-weight: 800; background: #25D366; color: #FFFFFF; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);"
            >
              <span>💬</span>
              <span>Simpan & Bagikan ke WhatsApp</span>
            </a>

            <!-- Action 3: Report Another Issue -->
            <button
              id="btn-report-another"
              type="button"
              style="padding: 10px; font-size: 11.5px; font-weight: 700; background: transparent; color: #94A3B8; border: 1px solid #334155; border-radius: 10px; cursor: pointer; margin-top: 4px;"
            >
              + Buat Laporan Pengaduan Lain
            </button>
          </div>

        </div>

      </div>
    `;

    const reportAnotherBtn = pageWrapper.querySelector("#btn-report-another");
    if (reportAnotherBtn) {
      reportAnotherBtn.addEventListener("click", () => {
        submittedTicket = null;
        meterIdValue = "";
        descValue = "";
        photoDataUrl = null;
        chatMessages = [
          {
            id: `msg-reset-${Date.now()}`,
            role: "assistant",
            text: `Halo! Saya **Asisten Diagnostik Cerdas AETRA** 🤖💧\n\nSilakan ceritakan kendala air bersih baru yang ingin Anda konsultasikan atau lapor.`,
            options: [
              "💧 Air mati total di rumah",
              "📉 Aliran air sangat kecil",
              "🟤 Air keruh kecokelatan",
              "🔧 Pipa depan rumah bocor",
            ],
          },
        ];
        render();
      });
    }
  }

  render();
  container.appendChild(pageWrapper);

  return () => {
    container.innerHTML = "";
  };
}
