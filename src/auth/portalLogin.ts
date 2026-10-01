/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unified Multi-Division Portal Login Screen - PT Aetra Air Tangerang
 * Enforces per-division credentials and strict cross-division isolation
 */

import { DivisionId, DIVISIONS, DivisionUserSession } from "../types/division";
import {
  authenticateDivisionLogin,
  DIVISION_ACCOUNTS,
  findAccountByUsername,
} from "./divisionAuthService";
import { setActiveDivisionSession } from "../services/divisionTicketService";

export interface PortalLoginProps {
  onLoginSuccess: (session: DivisionUserSession) => void;
}

export function renderPortalLogin(props: PortalLoginProps): HTMLElement {
  const container = document.createElement("div");
  container.className = "portal-login-screen";
  container.style.cssText = `
    min-height: 100vh;
    min-height: 100dvh;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 24px 16px 40px;
    background: radial-gradient(circle at 50% 0%, #E0F2FE 0%, #F0F9FF 35%, #F8FAFC 100%);
    box-sizing: border-box;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  `;

  // Main Card
  const card = document.createElement("div");
  card.style.cssText = `
    width: 100%;
    max-width: 960px;
    background: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 20px;
    box-shadow: 0 16px 40px rgba(2, 132, 199, 0.08), 0 2px 8px rgba(0,0,0,0.02);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;

  // Top Hero Banner
  const hero = document.createElement("div");
  hero.style.cssText = `
    background: linear-gradient(135deg, #0284C7 0%, #0369A1 60%, #075985 100%);
    padding: 24px 24px 20px;
    color: #FFFFFF;
    text-align: center;
    position: relative;
  `;
  hero.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-bottom: 10px;">
      <div style="background: #FFFFFF; padding: 5px 12px; border-radius: 10px; display: inline-flex; align-items: center; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
        <img src="/aetra-logo.svg" alt="Aetra" style="height: 32px; width: auto; object-fit: contain;" />
      </div>
    </div>
    <h1 style="margin: 0 0 6px 0; font-size: 21px; font-weight: 900; letter-spacing: -0.3px;">
      PORTAL LOGIN MULTI-DIVISI TERPADU
    </h1>
    <div style="font-size: 13px; color: #E0F2FE; font-weight: 600; max-width: 680px; margin: 0 auto; line-height: 1.4;">
      PT AETRA AIR TANGERANG • Otentikasi Akses Khusus & Pembatasan Lintas Divisi
    </div>
    <div style="display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; background: rgba(255,255,255,0.16); backdrop-filter: blur(4px); padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700;">
      <span>🔒</span> Setiap divisi memiliki akun terpisah dan tidak dapat mengakses divisi lain
    </div>
  `;
  card.appendChild(hero);

  // Content Area
  const content = document.createElement("div");
  content.style.cssText = "padding: 24px 24px 28px; display: flex; flex-direction: column; gap: 20px;";

  // State: currently selected division tab
  let activeDivision: DivisionId = "minor_repair";

  // Section Bar Division Selector
  const selectorContainer = document.createElement("div");
  selectorContainer.innerHTML = `
    <div style="font-size: 11px; font-weight: 800; color: #0284C7; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
      1. PILIH DIVISI TUJUAN LOGIN
    </div>
  `;

  const tabsBar = document.createElement("div");
  tabsBar.style.cssText = `
    display: flex;
    gap: 6px;
    background: #F1F5F9;
    padding: 5px;
    border-radius: 12px;
    border: 1px solid #E2E8F0;
    overflow-x: auto;
    scrollbar-width: none;
  `;

  const divisionOrder: DivisionId[] = [
    "minor_repair",
    "customer_service",
    "sales_support",
    "key_account",
    "technical_support",
  ];

  // Login Form Container
  const formBox = document.createElement("div");
  formBox.style.cssText = `
    background: #FFFFFF;
    border: 1.5px solid #E2E8F0;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.03);
    transition: all 0.2s ease;
  `;

  function renderTabs() {
    tabsBar.innerHTML = "";
    divisionOrder.forEach((divId) => {
      const meta = DIVISIONS[divId];
      const isSelected = divId === activeDivision;

      const tabBtn = document.createElement("button");
      tabBtn.type = "button";
      tabBtn.style.cssText = `
        flex: 1;
        min-width: 140px;
        padding: 9px 12px;
        border-radius: 9px;
        border: ${isSelected ? `1.5px solid ${meta.badgeColor}` : "1.5px solid transparent"};
        background: ${isSelected ? "#FFFFFF" : "transparent"};
        color: ${isSelected ? meta.badgeColor : "#475569"};
        font-weight: ${isSelected ? "800" : "700"};
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        box-shadow: ${isSelected ? "0 2px 8px rgba(0,0,0,0.06)" : "none"};
        transition: all 0.15s ease;
        white-space: nowrap;
      `;
      tabBtn.innerHTML = `<span>${meta.icon}</span> <span>${meta.shortName}</span>`;

      tabBtn.onclick = () => {
        activeDivision = divId;
        renderTabs();
        renderForm();
      };

      tabsBar.appendChild(tabBtn);
    });
  }

  function renderForm() {
    const meta = DIVISIONS[activeDivision];
    const acc = DIVISION_ACCOUNTS[activeDivision];

    formBox.style.borderColor = meta.borderColor;

    formBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: ${meta.badgeBg}; border: 1.5px solid ${meta.borderColor}; display: flex; align-items: center; justify-content: center; font-size: 22px;">
            ${meta.icon}
          </div>
          <div>
            <div style="font-size: 11px; font-weight: 800; color: ${meta.badgeColor}; text-transform: uppercase;">
              PORTAL LOGIN DIVISI
            </div>
            <h2 style="margin: 0; font-size: 17px; font-weight: 800; color: #0F172A;">
              ${meta.name}
            </h2>
          </div>
        </div>
        <div style="background: ${meta.badgeBg}; border: 1px solid ${meta.borderColor}; color: ${meta.badgeColor}; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;">
          <span>🔒</span> Hak Akses Terisolasi
        </div>
      </div>

      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 10px 14px; margin-bottom: 20px; font-size: 12px; color: #475569; line-height: 1.45;">
        ${meta.description}
      </div>

      <!-- Alert Notification Banner -->
      <div id="login-alert-box" style="display: none; padding: 12px 14px; border-radius: 10px; margin-bottom: 16px; font-size: 12.5px; font-weight: 600; line-height: 1.45;"></div>

      <form id="portal-login-form" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="display: block; font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 6px;">
            Username Divisi <span style="color: #DC2626;">*</span>
          </label>
          <div style="position: relative;">
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 15px; color: #94A3B8;">👤</span>
            <input
              type="text"
              id="input-login-username"
              placeholder="Contoh: ${acc.displayUsername}"
              value="${acc.displayUsername}"
              autocomplete="username"
              style="width: 100%; box-sizing: border-box; padding: 10px 12px 10px 38px; border: 1.5px solid #CBD5E1; border-radius: 9px; font-size: 13.5px; font-family: inherit; font-weight: 600; color: #0F172A; outline: none; transition: border-color 0.15s ease;"
            />
          </div>
          <div style="font-size: 11px; color: #64748B; margin-top: 4px;">
            Gunakan username resmi divisi ini: <strong>${acc.displayUsername}</strong>
          </div>
        </div>

        <div>
          <label style="display: block; font-size: 12px; font-weight: 800; color: #334155; margin-bottom: 6px;">
            Password <span style="color: #DC2626;">*</span>
          </label>
          <div style="position: relative;">
            <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 15px; color: #94A3B8;">🔑</span>
            <input
              type="password"
              id="input-login-password"
              placeholder="Masukkan password"
              value="123456"
              autocomplete="current-password"
              style="width: 100%; box-sizing: border-box; padding: 10px 42px 10px 38px; border: 1.5px solid #CBD5E1; border-radius: 9px; font-size: 13.5px; font-family: inherit; font-weight: 600; color: #0F172A; outline: none; transition: border-color 0.15s ease;"
            />
            <button
              type="button"
              id="btn-toggle-password"
              title="Tampilkan / Sembunyikan Password"
              style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 16px; cursor: pointer; color: #64748B; padding: 4px;"
            >
              👁️
            </button>
          </div>
          <div style="font-size: 11px; color: #64748B; margin-top: 4px;">
            Password default untuk semua divisi: <strong>123456</strong>
          </div>
        </div>

        <button
          type="submit"
          id="btn-submit-login"
          style="
            margin-top: 6px;
            padding: 12px 16px;
            border: none;
            border-radius: 10px;
            background: ${meta.gradient};
            color: #FFFFFF;
            font-size: 13.5px;
            font-weight: 800;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.12);
            transition: all 0.15s ease;
          "
        >
          <span>🚀 Masuk ke Dashboard ${meta.shortName}</span>
          <span>➔</span>
        </button>
      </form>
    `;

    // Hook Form Events
    const form = formBox.querySelector("#portal-login-form") as HTMLFormElement;
    const userInput = formBox.querySelector("#input-login-username") as HTMLInputElement;
    const passInput = formBox.querySelector("#input-login-password") as HTMLInputElement;
    const toggleBtn = formBox.querySelector("#btn-toggle-password") as HTMLButtonElement;
    const alertBox = formBox.querySelector("#login-alert-box") as HTMLDivElement;

    userInput.onfocus = () => (userInput.style.borderColor = meta.badgeColor);
    userInput.onblur = () => (userInput.style.borderColor = "#CBD5E1");
    passInput.onfocus = () => (passInput.style.borderColor = meta.badgeColor);
    passInput.onblur = () => (passInput.style.borderColor = "#CBD5E1");

    toggleBtn.onclick = () => {
      if (passInput.type === "password") {
        passInput.type = "text";
        toggleBtn.textContent = "🙈";
      } else {
        passInput.type = "password";
        toggleBtn.textContent = "👁️";
      }
    };

    form.onsubmit = (e) => {
      e.preventDefault();
      const userVal = userInput.value.trim();
      const passVal = passInput.value.trim();

      alertBox.style.display = "none";
      alertBox.className = "";

      const authRes = authenticateDivisionLogin(activeDivision, userVal, passVal);

      if (!authRes.success) {
        alertBox.style.display = "block";
        alertBox.style.background = "#FEF2F2";
        alertBox.style.border = "1.5px solid #FECACA";
        alertBox.style.color = "#991B1B";
        alertBox.innerHTML = `
          <div style="display: flex; gap: 8px; align-items: flex-start;">
            <span style="font-size: 16px;">🚫</span>
            <div>
              <strong>Gagal Masuk:</strong>
              <div>${authRes.message}</div>
            </div>
          </div>
        `;
        return;
      }

      // Login Success!
      alertBox.style.display = "block";
      alertBox.style.background = "#F0FDF4";
      alertBox.style.border = "1.5px solid #BBF7D0";
      alertBox.style.color = "#166534";
      alertBox.innerHTML = `
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="font-size: 16px;">✅</span>
          <div>
            <strong>Otorisasi Berhasil!</strong> Mengalihkan ke dashboard ${meta.shortName}...
          </div>
        </div>
      `;

      if (authRes.session) {
        setActiveDivisionSession(authRes.session);
        setTimeout(() => {
          props.onLoginSuccess(authRes.session!);
        }, 350);
      }
    };
  }

  selectorContainer.appendChild(tabsBar);
  content.appendChild(selectorContainer);
  content.appendChild(formBox);

  // Quick Reference & Testing Helper Card
  const quickRefCard = document.createElement("div");
  quickRefCard.style.cssText = `
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 14px;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  `;
  quickRefCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
      <div style="font-size: 11.5px; font-weight: 800; color: #1E293B; display: inline-flex; align-items: center; gap: 6px;">
        <span>💡</span> DAFTAR AKUN RESMI PER DIVISI (HAK AKSES TERPISAH)
      </div>
      <div style="font-size: 10.5px; color: #64748B; font-weight: 600;">
        Klik salah satu akun untuk uji coba cepat
      </div>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px;" id="quick-account-chips">
    </div>
    <div style="font-size: 11px; color: #475569; border-top: 1px dashed #CBD5E1; padding-top: 8px; display: flex; align-items: center; gap: 6px;">
      <span>ℹ️</span> <em>Uji Keamanan: Bila Anda memilih Divisi Customer Service namun memasukkan username <strong>minor repair</strong>, sistem akan otomatis menolak akses.</em>
    </div>
  `;

  const chipsContainer = quickRefCard.querySelector("#quick-account-chips") as HTMLDivElement;
  divisionOrder.forEach((divId) => {
    const meta = DIVISIONS[divId];
    const acc = DIVISION_ACCOUNTS[divId];

    const chip = document.createElement("button");
    chip.type = "button";
    chip.style.cssText = `
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 8px 10px;
      text-align: left;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 3px;
      transition: all 0.15s ease;
    `;
    chip.innerHTML = `
      <div style="font-size: 11px; font-weight: 800; color: ${meta.badgeColor}; display: flex; align-items: center; gap: 4px;">
        <span>${meta.icon}</span> <span>${meta.shortName}</span>
      </div>
      <div style="font-size: 11.5px; font-weight: 700; color: #0F172A;">
        User: <code style="background: #F1F5F9; padding: 1px 4px; border-radius: 4px;">${acc.displayUsername}</code>
      </div>
      <div style="font-size: 10px; color: #64748B;">
        Pass: <code style="background: #F1F5F9; padding: 1px 4px; border-radius: 4px;">${acc.password}</code>
      </div>
    `;

    chip.onmouseenter = () => {
      chip.style.borderColor = meta.badgeColor;
      chip.style.transform = "translateY(-1px)";
      chip.style.boxShadow = "0 3px 8px rgba(0,0,0,0.06)";
    };
    chip.onmouseleave = () => {
      chip.style.borderColor = "#CBD5E1";
      chip.style.transform = "translateY(0)";
      chip.style.boxShadow = "none";
    };

    chip.onclick = () => {
      activeDivision = divId;
      renderTabs();
      renderForm();

      const userInput = formBox.querySelector("#input-login-username") as HTMLInputElement;
      const passInput = formBox.querySelector("#input-login-password") as HTMLInputElement;
      if (userInput) userInput.value = acc.displayUsername;
      if (passInput) passInput.value = acc.password;
    };

    chipsContainer.appendChild(chip);
  });

  content.appendChild(quickRefCard);

  // Field Officer Standalone Banner
  const officerBanner = document.createElement("div");
  officerBanner.style.cssText = `
    background: linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%);
    border: 1.5px solid #BFDBFE;
    border-radius: 14px;
    padding: 14px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  `;
  officerBanner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="font-size: 24px;">📱</div>
      <div>
        <div style="font-size: 12.5px; font-weight: 800; color: #1E3A8A;">
          Aplikasi Khusus Petugas Lapangan (Mobile GPS & E-Sign)
        </div>
        <div style="font-size: 11px; color: #3B82F6;">
          Bagi petugas lapangan untuk foto sebelum/sesudah perbaikan dan tanda tangan digital pelanggan.
        </div>
      </div>
    </div>
    <a href="/mobile.html" target="_blank" rel="noopener noreferrer" style="background: #0284C7; color: #FFFFFF; font-size: 12px; font-weight: 800; text-decoration: none; padding: 10px 18px; border-radius: 10px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 3px 8px rgba(2,132,199,0.35);">
      <span>📱</span> <span>Buka di HP Petugas</span> <span>↗</span>
    </a>
  `;
  content.appendChild(officerBanner);

  // Customer Self-Service Complaint Banner
  const customerBanner = document.createElement("div");
  customerBanner.style.cssText = `
    background: linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%);
    border: 1.5px solid #86EFAC;
    border-radius: 14px;
    padding: 14px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  `;
  customerBanner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="font-size: 26px;">💧</div>
      <div>
        <div style="font-size: 13px; font-weight: 800; color: #166534;">
          Pelanggan Ingin Menyampaikan Pengaduan Gangguan Air?
        </div>
        <div style="font-size: 11px; color: #15803D;">
          Lapor mandiri 24 jam tanpa antre telepon • Langsung dapat nomor tiket & tautan Live Tracking.
        </div>
      </div>
    </div>
    <a href="/?view=lapor" style="background: #16A34A; color: #FFFFFF; font-size: 12px; font-weight: 800; text-decoration: none; padding: 9px 16px; border-radius: 8px; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 3px 8px rgba(22,163,74,0.3);">
      <span>📝</span> <span>Lapor Pengaduan Mandiri</span> <span>➔</span>
    </a>
  `;
  content.appendChild(customerBanner);

  // Footer
  const footer = document.createElement("div");
  footer.style.cssText = `
    border-top: 1px solid #E2E8F0;
    padding: 14px 24px;
    background: #F8FAFC;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #64748B;
  `;
  footer.innerHTML = `
    <div>© 2026 PT AETRA AIR TANGERANG. Hak Cipta Dilindungi Undang-Undang.</div>
    <div>Sistem Otentikasi Terpisah Multi-Divisi • Supabase Database Realtime</div>
  `;

  card.appendChild(content);
  card.appendChild(footer);
  container.appendChild(card);

  // Initial renders
  renderTabs();
  renderForm();

  return container;
}
