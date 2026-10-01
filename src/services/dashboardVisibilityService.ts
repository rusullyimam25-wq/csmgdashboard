/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dashboard View Customizer & Visibility Manager - PT Aetra Air Tangerang
 * Manages modular toggleable widget & view visibility per dashboard division
 */

import { DivisionId } from "../types/division";

export type DashboardViewId =
  // Minor Repair
  | "mr_sla_banner"
  | "mr_weekly_sla_widget"
  | "mr_fleet_map"
  | "mr_summary_stats"
  | "mr_case_chart"
  | "mr_donut_chart"
  | "mr_mini_calendar"
  | "mr_kanban_board"
  | "mr_search_filter"
  // Customer Service
  | "cs_stats_cards"
  | "cs_gateway_banner"
  | "cs_intake_form"
  | "cs_filter_tabs"
  | "cs_table_tickets"
  // Sales Support
  | "oss_stats_cards"
  | "oss_header_banner"
  | "oss_filter_tabs"
  | "oss_table_tickets"
  // Key Account
  | "tka_stats_cards"
  | "tka_header_banner"
  | "tka_filter_tabs"
  | "tka_table_tickets"
  // Technical Support
  | "ts_stats_cards"
  | "ts_header_banner"
  | "ts_filter_tabs"
  | "ts_table_tickets";

export interface DashboardViewItemConfig {
  id: DashboardViewId;
  label: string;
  icon: string;
  description: string;
  category: "kpi" | "map_chart" | "workspace" | "form";
  defaultVisible: boolean;
}

export const DASHBOARD_VIEWS_CONFIG: Record<DivisionId, DashboardViewItemConfig[]> = {
  minor_repair: [
    {
      id: "mr_weekly_sla_widget",
      label: "Widget SLA Mingguan (Recharts)",
      icon: "⏱️",
      description: "Visualisasi perbandingan waktu selesai vs target SLA minggu ini.",
      category: "kpi",
      defaultVisible: true,
    },
    {
      id: "mr_sla_banner",
      label: "Banner Peringatan SLA Breaches",
      icon: "🚨",
      description: "Peringatan mendesak tiket yang melewati batas SLA standar.",
      category: "kpi",
      defaultVisible: true,
    },
    {
      id: "mr_summary_stats",
      label: "Kartu Rekapitulasi Kasus",
      icon: "🔢",
      description: "Ringkasan total Unassigned, Urgent, Aktif, dan Selesai.",
      category: "kpi",
      defaultVisible: true,
    },
    {
      id: "mr_fleet_map",
      label: "Fleet Map Sebaran Kasus Lapangan",
      icon: "🗺️",
      description: "Peta interaktif Leaflet posisi sebaran kasus dan teknisi.",
      category: "map_chart",
      defaultVisible: true,
    },
    {
      id: "mr_case_chart",
      label: "Grafik Batang Kategori Kasus",
      icon: "📊",
      description: "Distribusi kasus KBSM, KP, KKMR, KPMR per jenis kerusakan.",
      category: "map_chart",
      defaultVisible: true,
    },
    {
      id: "mr_donut_chart",
      label: "Grafik Donat Komposisi Status",
      icon: "🍩",
      description: "Persentase status tiket: Belum, Sedang Proses, dan Selesai.",
      category: "map_chart",
      defaultVisible: false,
    },
    {
      id: "mr_mini_calendar",
      label: "Mini Kalender Penjadwalan & Kuota",
      icon: "📅",
      description: "Kalender kuota harian batas 10 tiket per teknisi di sidebar.",
      category: "map_chart",
      defaultVisible: true,
    },
    {
      id: "mr_search_filter",
      label: "Bilah Pencarian & Filter Cepat",
      icon: "🔍",
      description: "Input pencarian cerdas, filter petugas, kategori, dan sorting.",
      category: "workspace",
      defaultVisible: true,
    },
    {
      id: "mr_kanban_board",
      label: "Papan Kolom Kanban Work Order",
      icon: "📋",
      description: "Tampilan antrean Belum Dikerjakan, Sedang, dan Selesai.",
      category: "workspace",
      defaultVisible: true,
    },
  ],

  customer_service: [
    {
      id: "cs_stats_cards",
      label: "Kartu Statistik Aliran Pengaduan",
      icon: "📊",
      description: "Metrik total komplain masuk dan distribusi ke tiap divisi teknis.",
      category: "kpi",
      defaultVisible: true,
    },
    {
      id: "cs_gateway_banner",
      label: "Banner Gerbang Awal Penerimaan",
      icon: "🌟",
      description: "Informasi portal CS dan tombol cepat buka form komplain.",
      category: "workspace",
      defaultVisible: true,
    },
    {
      id: "cs_intake_form",
      label: "Form Input Pengaduan Cerdas",
      icon: "📝",
      description: "Formulir penerimaan keluhan pelanggan dan rekomendasi routing.",
      category: "form",
      defaultVisible: true,
    },
    {
      id: "cs_filter_tabs",
      label: "Tab Filter Divisi & Pencarian",
      icon: "🔍",
      description: "Filter cepat divisi tujuan dan input live search.",
      category: "workspace",
      defaultVisible: true,
    },
    {
      id: "cs_table_tickets",
      label: "Tabel Data Pengaduan Masuk",
      icon: "📋",
      description: "Daftar lengkap tiket pengaduan, status routing, dan aksi disposisi.",
      category: "workspace",
      defaultVisible: true,
    },
  ],

  sales_support: [
    {
      id: "oss_stats_cards",
      label: "Kartu Statistik Administrasi OSS",
      icon: "💼",
      description: "Ringkasan berkas rekening tinggi, balik nama, dan pasang baru.",
      category: "kpi",
      defaultVisible: true,
    },
    {
      id: "oss_header_banner",
      label: "Banner Portal Operasional OSS",
      icon: "🏛️",
      description: "Deskripsi ruang lingkup pelayanan administrasi dan tagihan pelanggan.",
      category: "workspace",
      defaultVisible: true,
    },
    {
      id: "oss_filter_tabs",
      label: "Filter Status & Pencarian Berkas",
      icon: "🔍",
      description: "Filter status Baru, Diproses, Selesai dan pencarian ID Meter.",
      category: "workspace",
      defaultVisible: true,
    },
    {
      id: "oss_table_tickets",
      label: "Tabel Pengajuan Administrasi & Tagihan",
      icon: "📋",
      description: "Tabel berkas yang didisposisikan untuk penyesuaian rekening / berkas.",
      category: "workspace",
      defaultVisible: true,
    },
  ],

  key_account: [
    {
      id: "tka_stats_cards",
      label: "Kartu Statistik Pelanggan Industri",
      icon: "🏢",
      description: "Ringkasan debit besar, zona kawasan industri, dan penanganan.",
      category: "kpi",
      defaultVisible: true,
    },
    {
      id: "tka_header_banner",
      label: "Banner Portal Key Account Industri",
      icon: "🏭",
      description: "Dashboard khusus pelanggan industri & komersial pipa transmisi > 2 inch.",
      category: "workspace",
      defaultVisible: true,
    },
    {
      id: "tka_filter_tabs",
      label: "Filter Status & Live Search Industri",
      icon: "🔍",
      description: "Filter status penanganan industri dan pencarian pabrik.",
      category: "workspace",
      defaultVisible: true,
    },
    {
      id: "tka_table_tickets",
      label: "Tabel Kasus Teknis Industri & Bar Tekanan",
      icon: "📋",
      description: "Daftar penanganan keluhan debit, tekanan air, dan pipa boiler pabrik.",
      category: "workspace",
      defaultVisible: true,
    },
  ],

  technical_support: [
    {
      id: "ts_stats_cards",
      label: "Kartu Statistik Laboratorium & Uji Tera",
      icon: "🔬",
      description: "Ringkasan uji sampel kualitas air (NTU/pH), investigasi ilegal, dan tera meter.",
      category: "kpi",
      defaultVisible: true,
    },
    {
      id: "ts_header_banner",
      label: "Banner Portal Technical Support & Lab",
      icon: "⚗️",
      description: "Laboratorium uji kimia/fisika air dan penertiban pemakaian air ilegal.",
      category: "workspace",
      defaultVisible: true,
    },
    {
      id: "ts_filter_tabs",
      label: "Filter Status & Pencarian Sampel Uji",
      icon: "🔍",
      description: "Filter status pengujian lab dan live search pelanggan.",
      category: "workspace",
      defaultVisible: true,
    },
    {
      id: "ts_table_tickets",
      label: "Tabel Kasus Lab, Flushing & Investigasi",
      icon: "📋",
      description: "Daftar pengujian sampel air minum dan berita acara tera akurasi meter.",
      category: "workspace",
      defaultVisible: true,
    },
  ],
};

const STORAGE_PREFIX = "aetra_view_prefs_";

export function getDashboardViewPreferences(division: DivisionId): Record<string, boolean> {
  const configs = DASHBOARD_VIEWS_CONFIG[division] || [];
  const defaults: Record<string, boolean> = {};
  configs.forEach((item) => {
    defaults[item.id] = item.defaultVisible;
  });

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${division}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.warn("Failed to load view preferences:", e);
  }

  return defaults;
}

export function isViewItemVisible(division: DivisionId, viewId: DashboardViewId): boolean {
  const prefs = getDashboardViewPreferences(division);
  if (prefs[viewId] !== undefined) {
    return Boolean(prefs[viewId]);
  }
  const config = (DASHBOARD_VIEWS_CONFIG[division] || []).find((c) => c.id === viewId);
  return config ? config.defaultVisible : true;
}

export function setViewItemVisible(division: DivisionId, viewId: DashboardViewId, visible: boolean): void {
  const prefs = getDashboardViewPreferences(division);
  prefs[viewId] = visible;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${division}`, JSON.stringify(prefs));
  } catch (e) {
    console.warn("Failed to save view preferences:", e);
  }
  // Dispatch custom event to notify all active views to re-render without reload
  window.dispatchEvent(
    new CustomEvent("aetra:dashboard_view_preference_changed", {
      detail: { division, viewId, visible, allPrefs: prefs },
    })
  );
}

export function resetDashboardViewPreferences(division: DivisionId): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${division}`);
  } catch (e) {}
  window.dispatchEvent(
    new CustomEvent("aetra:dashboard_view_preference_changed", {
      detail: { division, reset: true },
    })
  );
}

export function setAllViewsVisible(division: DivisionId, visible: boolean): void {
  const configs = DASHBOARD_VIEWS_CONFIG[division] || [];
  const prefs: Record<string, boolean> = {};
  configs.forEach((item) => {
    prefs[item.id] = visible;
  });
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${division}`, JSON.stringify(prefs));
  } catch (e) {}
  window.dispatchEvent(
    new CustomEvent("aetra:dashboard_view_preference_changed", {
      detail: { division, allPrefs: prefs },
    })
  );
}
