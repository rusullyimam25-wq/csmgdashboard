/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Multi-Divisional Authentication & Access Control Service - PT Aetra Air Tangerang
 */

import { DivisionId, DIVISIONS, DivisionUserSession } from "../types/division";

export interface DivisionAccount {
  divisionId: DivisionId;
  displayUsername: string;
  allowedUsernames: string[];
  password: string;
  officerName: string;
  email: string;
  role: "admin" | "supervisor" | "officer";
  description: string;
}

export const DIVISION_ACCOUNTS: Record<DivisionId, DivisionAccount> = {
  customer_service: {
    divisionId: "customer_service",
    displayUsername: "customer service",
    allowedUsernames: [
      "customer service",
      "customer_service",
      "customerservice",
      "cs",
      "cs.admin",
      "cs.admin@aetra.co.id",
      "putri delia",
    ],
    password: "123456",
    officerName: "Putri Delia (Supervisor CS & Dispatcher)",
    email: "cs.admin@aetra.co.id",
    role: "admin",
    description: "Akses gerbang penerimaan keluhan 24/7 & distribusi tiket ke divisi teknis.",
  },
  minor_repair: {
    divisionId: "minor_repair",
    displayUsername: "minor repair",
    allowedUsernames: [
      "minor repair",
      "minor_repair",
      "minorrepair",
      "minor.repair",
      "minor.repair@aetra.co.id",
      "bambang trihatmojo",
      "bambang",
    ],
    password: "123456",
    officerName: "Ir. Bambang Trihatmojo (Koordinator Lapangan)",
    email: "minor.repair@aetra.co.id",
    role: "admin",
    description: "Akses papan kerja teknisi perbaikan pipa bocor, meter air & BAST lapangan.",
  },
  sales_support: {
    divisionId: "sales_support",
    displayUsername: "sales support",
    allowedUsernames: [
      "sales support",
      "sales_support",
      "salessupport",
      "sales.support",
      "sales.support@aetra.co.id",
      "oss",
      "dewi lestari",
    ],
    password: "123456",
    officerName: "Dewi Lestari, S.E. (Head of Sales Support)",
    email: "sales.support@aetra.co.id",
    role: "admin",
    description: "Akses administrasi billing, keringanan rekening KRPT, sambungan baru & denda.",
  },
  key_account: {
    divisionId: "key_account",
    displayUsername: "key account",
    allowedUsernames: [
      "key account",
      "key_account",
      "keyaccount",
      "key.account",
      "key.account@aetra.co.id",
      "tka",
      "rudi hartono",
    ],
    password: "123456",
    officerName: "H. Rudi Hartono, S.T. (Senior Key Account Specialist)",
    email: "key.account@aetra.co.id",
    role: "admin",
    description: "Akses prioritas kawasan industri, pabrik besar & monitoring debit SLA tinggi.",
  },
  technical_support: {
    divisionId: "technical_support",
    displayUsername: "technical support",
    allowedUsernames: [
      "technical support",
      "technical_support",
      "technicalsupport",
      "tech support",
      "tech_support",
      "tech.support",
      "tech.support@aetra.co.id",
      "agus sutrisno",
    ],
    password: "123456",
    officerName: "Dr. Agus Sutrisno (Manager Technical Support & Lab)",
    email: "tech.support@aetra.co.id",
    role: "admin",
    description: "Akses uji laboratorium kekeruhan klorin, bangku tera meter & penertiban ilegal.",
  },
};

export interface AuthResult {
  success: boolean;
  message: string;
  session?: DivisionUserSession;
  account?: DivisionAccount;
  actualDivision?: DivisionId;
}

/**
 * Find account matching the username across all registered divisions
 */
export function findAccountByUsername(username: string): DivisionAccount | null {
  const clean = username.trim().toLowerCase();
  if (!clean) return null;

  for (const divId of Object.keys(DIVISION_ACCOUNTS) as DivisionId[]) {
    const acc = DIVISION_ACCOUNTS[divId];
    if (acc.allowedUsernames.some((u) => u.toLowerCase() === clean)) {
      return acc;
    }
  }
  return null;
}

/**
 * Authenticate login strictly for a specific division
 * Enforces that user cannot login to other divisions with an unauthorized username
 */
export function authenticateDivisionLogin(
  targetDivision: DivisionId,
  usernameInput: string,
  passwordInput: string
): AuthResult {
  const cleanUser = usernameInput.trim();
  const cleanPass = passwordInput.trim();

  if (!cleanUser) {
    return { success: false, message: "Silakan masukkan username divisi." };
  }
  if (!cleanPass) {
    return { success: false, message: "Silakan masukkan password akun." };
  }

  const matchedAccount = findAccountByUsername(cleanUser);

  if (!matchedAccount) {
    return {
      success: false,
      message: `Username "${cleanUser}" tidak terdaftar. Gunakan username resmi divisi (contoh: minor repair, customer service, sales support).`,
    };
  }

  // Cross-division security restriction: user cannot log into another division
  if (matchedAccount.divisionId !== targetDivision) {
    const targetMeta = DIVISIONS[targetDivision];
    const actualMeta = DIVISIONS[matchedAccount.divisionId];
    return {
      success: false,
      actualDivision: matchedAccount.divisionId,
      message: `Akses Ditolak! Akun "${cleanUser}" adalah akun terdaftar untuk ${actualMeta.name}. Anda tidak memiliki izin login ke ${targetMeta.name}.`,
    };
  }

  // Password verification
  if (matchedAccount.password !== cleanPass) {
    return {
      success: false,
      message: "Password salah. Pastikan password yang Anda masukkan benar (default: 123456).",
    };
  }

  const session: DivisionUserSession = {
    divisionId: targetDivision,
    name: matchedAccount.officerName,
    email: matchedAccount.email,
    role: matchedAccount.role,
    loginAt: new Date().toISOString(),
    username: matchedAccount.displayUsername,
  };

  return {
    success: true,
    message: `Login berhasil sebagai ${matchedAccount.officerName} (${DIVISIONS[targetDivision].shortName}).`,
    session,
    account: matchedAccount,
  };
}

/**
 * Universal login by username & password (auto-routes to the user's registered division)
 */
export function authenticateUniversal(
  usernameInput: string,
  passwordInput: string
): AuthResult {
  const cleanUser = usernameInput.trim();
  const cleanPass = passwordInput.trim();

  if (!cleanUser) {
    return { success: false, message: "Silakan masukkan username divisi." };
  }
  if (!cleanPass) {
    return { success: false, message: "Silakan masukkan password akun." };
  }

  const matchedAccount = findAccountByUsername(cleanUser);
  if (!matchedAccount) {
    return {
      success: false,
      message: `Username "${cleanUser}" tidak terdaftar dalam sistem. Gunakan contoh: minor repair, customer service, sales support.`,
    };
  }

  if (matchedAccount.password !== cleanPass) {
    return {
      success: false,
      message: "Password salah. Silakan periksa kembali password akun (default: 123456).",
    };
  }

  const session: DivisionUserSession = {
    divisionId: matchedAccount.divisionId,
    name: matchedAccount.officerName,
    email: matchedAccount.email,
    role: matchedAccount.role,
    loginAt: new Date().toISOString(),
    username: matchedAccount.displayUsername,
  };

  return {
    success: true,
    message: `Login berhasil ke ${DIVISIONS[matchedAccount.divisionId].name}.`,
    session,
    account: matchedAccount,
    actualDivision: matchedAccount.divisionId,
  };
}
