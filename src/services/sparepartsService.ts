/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Master Data & Service Material / Sparepart Lapangan - PT Aetra Air Tangerang
 * Berdasarkan Standar Operasional Divisi Domestic (Basic Maintenance)
 */

export type SparepartUnit = "pcs" | "meter";

export interface SparepartItem {
  no: number;
  divisi: string;
  category: string;
  itemCode: string;
  name: string;
  unit: SparepartUnit;
  defaultQty: number;
  step: number;
  minQty: number;
}

export interface UsedMaterialEntry {
  no: number;
  itemCode: string;
  name: string;
  qty: number;
  unit: SparepartUnit;
}

/**
 * 14 Daftar Resmi Material & Sparepart Operasional Lapangan (Domestic - Basic Maintenance)
 * Sesuai Standar Form BAST & Logistik Aetra Tangerang
 */
export const OFFICIAL_SPAREPARTS: SparepartItem[] = [
  {
    no: 1,
    divisi: "Domestic",
    category: "Basic Maintenance",
    itemCode: "10010408",
    name: "Lockable Straight Valve 15 mm",
    unit: "pcs",
    defaultQty: 1,
    step: 1,
    minQty: 1,
  },
  {
    no: 2,
    divisi: "Domestic",
    category: "Basic Maintenance",
    itemCode: "10010005",
    name: "Pipa HDPE d25 mm",
    unit: "meter",
    defaultQty: 1,
    step: 0.5,
    minQty: 0.5,
  },
  {
    no: 3,
    divisi: "Domestic",
    category: "Basic Maintenance",
    itemCode: "10010350",
    name: "Tapping Tee EF 63 x 25",
    unit: "pcs",
    defaultQty: 1,
    step: 1,
    minQty: 1,
  },
  {
    no: 4,
    divisi: "Domestic",
    category: "Basic Maintenance",
    itemCode: "10010353",
    name: "Tapping Tee EF 90 x 25",
    unit: "pcs",
    defaultQty: 1,
    step: 1,
    minQty: 1,
  },
  {
    no: 5,
    divisi: "Domestic",
    category: "Basic Maintenance",
    itemCode: "10010357",
    name: "Tapping Tee EF 110 x 25",
    unit: "pcs",
    defaultQty: 1,
    step: 1,
    minQty: 1,
  },
  {
    no: 6,
    divisi: "Domestic",
    category: "Basic Maintenance",
    itemCode: "10010531",
    name: "Seal Lockable DN 15mm",
    unit: "pcs",
    defaultQty: 1,
    step: 1,
    minQty: 1,
  },
  {
    no: 7,
    divisi: "Domestic",
    category: "Basic Maintenance",
    itemCode: "10010532",
    name: "O-Ring Lockable DN25 mm",
    unit: "pcs",
    defaultQty: 1,
    step: 1,
    minQty: 1,
  },
  {
    no: 8,
    divisi: "Domestic",
    category: "Basic Maintenance",
    itemCode: "10010492",
    name: "Seal Tape",
    unit: "pcs",
    defaultQty: 1,
    step: 1,
    minQty: 1,
  },
  {
    no: 9,
    divisi: "Domestic",
    category: "Basic Maintenance",
    itemCode: "10010595",
    name: "Double Nipple d15 mm",
    unit: "pcs",
    defaultQty: 1,
    step: 1,
    minQty: 1,
  },
  {
    no: 10,
    divisi: "Domestic",
    category: "Basic Maintenance",
    itemCode: "", // blank in official table
    name: "Seal Ball valve",
    unit: "pcs",
    defaultQty: 1,
    step: 1,
    minQty: 1,
  },
  {
    no: 11,
    divisi: "Domestic",
    category: "Basic Maintenance",
    itemCode: "10010099",
    name: "Coupler EF d25 mm",
    unit: "pcs",
    defaultQty: 1,
    step: 1,
    minQty: 1,
  },
  {
    no: 12,
    divisi: "Domestic",
    category: "Basic Maintenance",
    itemCode: "10010420",
    name: "Ball Valve For Water Mtr D15 mm",
    unit: "pcs",
    defaultQty: 1,
    step: 1,
    minQty: 1,
  },
  {
    no: 13,
    divisi: "Domestic",
    category: "Basic Maintenance",
    itemCode: "10010424",
    name: "Segel ( Blue )",
    unit: "pcs",
    defaultQty: 1,
    step: 1,
    minQty: 1,
  },
  {
    no: 14,
    divisi: "Domestic",
    category: "Basic Maintenance",
    itemCode: "10010",
    name: "Water meter class C d15 mm",
    unit: "pcs",
    defaultQty: 1,
    step: 1,
    minQty: 1,
  },
];

/**
 * Temukan spesifikasi sparepart berdasarkan nama atau kode item
 */
export function findSparepart(nameOrCode: string): SparepartItem | undefined {
  if (!nameOrCode) return undefined;
  const target = nameOrCode.trim().toLowerCase();
  return OFFICIAL_SPAREPARTS.find(
    (s) =>
      s.name.toLowerCase() === target ||
      (s.itemCode && s.itemCode.toLowerCase() === target) ||
      target.includes(s.name.toLowerCase())
  );
}

/**
 * Format string penyimpanan dan tampilan laporan (contoh: "Pipa HDPE d25 mm (2.5 meter)")
 */
export function formatMaterialString(entry: {
  name: string;
  qty: number;
  unit: SparepartUnit;
}): string {
  const cleanQty = Number.isInteger(entry.qty) ? entry.qty.toString() : entry.qty.toFixed(1).replace(/\.0$/, "");
  return `${entry.name} (${cleanQty} ${entry.unit})`;
}

/**
 * Mengurai string material tersimpan menjadi objek terstruktur
 */
export function parseMaterialString(raw: string): UsedMaterialEntry {
  const match = raw.match(/^(.+?)\s*\(\s*([\d\.,]+)\s*(meter|m|pcs|pc|bh|buah)?\s*\)$/i);
  if (match) {
    const rawName = match[1].trim();
    const qtyVal = parseFloat(match[2].replace(",", ".")) || 1;
    const rawUnit = (match[3] || "").toLowerCase();
    const unit: SparepartUnit = rawUnit.startsWith("m") ? "meter" : "pcs";
    const found = findSparepart(rawName);
    return {
      no: found ? found.no : 0,
      itemCode: found ? found.itemCode : "",
      name: found ? found.name : rawName,
      qty: qtyVal,
      unit: found ? found.unit : unit,
    };
  }

  // Fallback jika hanya nama teks biasa tanpa kuantitas
  const found = findSparepart(raw);
  return {
    no: found ? found.no : 0,
    itemCode: found ? found.itemCode : "",
    name: found ? found.name : raw.trim(),
    qty: 1,
    unit: found ? found.unit : "pcs",
  };
}

/**
 * Normalisasi daftar material ke format array string seragam untuk sinkronisasi database & log aktivitas
 */
export function serializeUsedMaterials(
  entries: { name: string; qty: number; unit?: SparepartUnit }[]
): string[] {
  return entries
    .filter((e) => e.qty > 0 && e.name.trim() !== "")
    .map((e) => {
      const sp = findSparepart(e.name);
      const unit = e.unit || (sp ? sp.unit : "pcs");
      return formatMaterialString({
        name: sp ? sp.name : e.name,
        qty: e.qty,
        unit,
      });
    });
}
