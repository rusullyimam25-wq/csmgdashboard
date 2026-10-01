/**
 * AETRA CUSTOMER MASTER DATA ENGINE & CCnB REPLACEMENT SERVICE
 * 
 * Centralized customer master database and fast lookup engine that eliminates
 * the need for Oracle CC&B. Stores customer accounts, connection numbers, meter IDs,
 * tariff classes, GPS coordinates, and historical case logs.
 */

export interface AetraCustomerRecord {
  id: string; // e.g. "CUST-100291"
  connectionNo: string; // No. Sambungan / ID Pelanggan (9-10 digit)
  meterId: string; // No. Meter Seri Fisik
  name: string; // Nama Lengkap Pelanggan
  phone: string; // No. Telepon / WhatsApp
  address: string; // Alamat Lengkap
  area: string; // Wilayah / Zona Distribusi
  rtRw?: string;
  tariffGroup: string; // e.g. "2A2 (Rumah Tangga Menengah)", "3A (Niaga Kecil)"
  meterSize: string; // e.g. '1/2"', '3/4"', '1"', '2"'
  meterBrand?: string; // e.g. "Actaris / Itron", "Linflow"
  coords: string; // GPS Latitude, Longitude
  status: "Aktif" | "Segel Sementara" | "Cabut Meter" | "Non-Aktif";
  lastBilledMonth?: string;
  lastBilledUsageM3?: number;
  totalUnpaidBills?: number;
  registeredDate?: string;
  notes?: string;
}

const STORAGE_KEY = "aetra_customer_master_db";

const DEFAULT_MASTER_CUSTOMERS: AetraCustomerRecord[] = [
  {
    id: "CUST-1001",
    connectionNo: "001482910",
    meterId: "MTR-88291",
    name: "Bpk. Bambang Wijaya, S.T.",
    phone: "081298765432",
    address: "Jl. Raya Serang Km 14 No. 42, RT 03/RW 01, Kel. Sukamulya",
    area: "Cikupa",
    tariffGroup: "2A2 - Rumah Tangga Menengah",
    meterSize: "1/2 inch",
    meterBrand: "Itron Flostar",
    coords: "-6.2341, 106.5182",
    status: "Aktif",
    lastBilledMonth: "September 2026",
    lastBilledUsageM3: 24,
    totalUnpaidBills: 0,
    registeredDate: "2021-04-15",
    notes: "Dekat pertigaan pasar Cikupa",
  },
  {
    id: "CUST-1002",
    connectionNo: "001482911",
    meterId: "MTR-44912",
    name: "Ibu Hj. Siti Aminah",
    phone: "085712349988",
    address: "Perumahan Citra Raya Blok E2 No. 18, Desa Cikupa",
    area: "Cikupa",
    tariffGroup: "2A1 - Rumah Tangga Sederhana",
    meterSize: "1/2 inch",
    meterBrand: "Linflow Brass",
    coords: "-6.2412, 106.5298",
    status: "Aktif",
    lastBilledMonth: "September 2026",
    lastBilledUsageM3: 18,
    totalUnpaidBills: 0,
    registeredDate: "2019-11-20",
  },
  {
    id: "CUST-1003",
    connectionNo: "001482912",
    meterId: "MTR-19820",
    name: "PT Mitra Logistik Nusantara (Bpk. Joko)",
    phone: "081198234510",
    address: "Kawasan Industri Balaraja Barat Blok F-8",
    area: "Balaraja",
    tariffGroup: "4A - Industri Sedang / Pergudangan",
    meterSize: "2 inch",
    meterBrand: "Woltman Turbo",
    coords: "-6.1984, 106.4521",
    status: "Aktif",
    lastBilledMonth: "September 2026",
    lastBilledUsageM3: 380,
    totalUnpaidBills: 0,
    registeredDate: "2018-02-10",
    notes: "Key Account Pelanggan Industri",
  },
  {
    id: "CUST-1004",
    connectionNo: "001482913",
    meterId: "MTR-66381",
    name: "Bpk. Dedi Supriyadi",
    phone: "081388776655",
    address: "Kp. Telaga RT 02/04 No. 15, Kec. Balaraja",
    area: "Balaraja",
    tariffGroup: "2A2 - Rumah Tangga Menengah",
    meterSize: "1/2 inch",
    meterBrand: "Itron Flostar",
    coords: "-6.2055, 106.4682",
    status: "Aktif",
    lastBilledMonth: "September 2026",
    lastBilledUsageM3: 21,
    totalUnpaidBills: 0,
    registeredDate: "2022-07-01",
  },
  {
    id: "CUST-1005",
    connectionNo: "001482914",
    meterId: "MTR-77299",
    name: "Rumah Makan Padang Sederhana (Bpk. Rizal)",
    phone: "081233445566",
    address: "Jl. Raya Pasar Kemis No. 88, Samping SPBU",
    area: "Pasar Kemis",
    tariffGroup: "3A - Niaga Kecil",
    meterSize: "3/4 inch",
    meterBrand: "Linflow Multi-jet",
    coords: "-6.1723, 106.5412",
    status: "Aktif",
    lastBilledMonth: "September 2026",
    lastBilledUsageM3: 65,
    totalUnpaidBills: 0,
    registeredDate: "2020-09-14",
  },
  {
    id: "CUST-1006",
    connectionNo: "001482915",
    meterId: "MTR-33921",
    name: "Ibu Ratna Juwita",
    phone: "081909876543",
    address: "Perumahan Bumi Asri Blok C4 No. 12, Pasar Kemis",
    area: "Pasar Kemis",
    tariffGroup: "2A2 - Rumah Tangga Menengah",
    meterSize: "1/2 inch",
    meterBrand: "Itron Flostar",
    coords: "-6.1689, 106.5510",
    status: "Aktif",
    lastBilledMonth: "September 2026",
    lastBilledUsageM3: 26,
    totalUnpaidBills: 0,
    registeredDate: "2023-01-18",
  },
  {
    id: "CUST-1007",
    connectionNo: "001482916",
    meterId: "MTR-99014",
    name: "Bpk. H. Hendra Kurniawan",
    phone: "085211223344",
    address: "Jl. Raya Sepatan KM 3 No. 55, RT 01/02",
    area: "Sepatan",
    tariffGroup: "2A2 - Rumah Tangga Menengah",
    meterSize: "1/2 inch",
    meterBrand: "Itron Flostar",
    coords: "-6.1284, 106.5742",
    status: "Aktif",
    lastBilledMonth: "September 2026",
    lastBilledUsageM3: 22,
    totalUnpaidBills: 0,
    registeredDate: "2021-08-19",
  },
  {
    id: "CUST-1008",
    connectionNo: "001482917",
    meterId: "MTR-55410",
    name: "Klinik Pratama Sehat Medika",
    phone: "082199887711",
    address: "Jl. Aria Santika No. 102, Tigaraksa",
    area: "Tigaraksa",
    tariffGroup: "3B - Niaga Menengah / Sosial",
    meterSize: "1 inch",
    meterBrand: "Woltman Turbo",
    coords: "-6.2621, 106.4812",
    status: "Aktif",
    lastBilledMonth: "September 2026",
    lastBilledUsageM3: 88,
    totalUnpaidBills: 0,
    registeredDate: "2019-05-12",
  },
  {
    id: "CUST-1009",
    connectionNo: "001482918",
    meterId: "MTR-88129",
    name: "Bpk. Agung Prasetyo",
    phone: "081312345678",
    address: "Perumahan Griya Panongan Asri Blok D1 No. 5",
    area: "Panongan",
    tariffGroup: "2A1 - Rumah Tangga Sederhana",
    meterSize: "1/2 inch",
    meterBrand: "Linflow Brass",
    coords: "-6.2891, 106.5290",
    status: "Aktif",
    lastBilledMonth: "September 2026",
    lastBilledUsageM3: 16,
    totalUnpaidBills: 0,
    registeredDate: "2024-03-10",
  },
  {
    id: "CUST-1010",
    connectionNo: "001482919",
    meterId: "MTR-22019",
    name: "Laundry Bersih Kilat (Ibu Maya)",
    phone: "087812908877",
    address: "Jl. Raya Curug No. 29, Dekat Pasar Curug",
    area: "Curug",
    tariffGroup: "3A - Niaga Kecil",
    meterSize: "3/4 inch",
    meterBrand: "Linflow Multi-jet",
    coords: "-6.2712, 106.5982",
    status: "Aktif",
    lastBilledMonth: "September 2026",
    lastBilledUsageM3: 92,
    totalUnpaidBills: 0,
    registeredDate: "2022-10-05",
  },
  {
    id: "CUST-1011",
    connectionNo: "001482920",
    meterId: "MTR-90412",
    name: "Bpk. Syaiful Anwar",
    phone: "081277665544",
    address: "Desa Rajeg Mulya RT 04/RW 02 No. 19",
    area: "Rajeg",
    tariffGroup: "2A1 - Rumah Tangga Sederhana",
    meterSize: "1/2 inch",
    meterBrand: "Itron Flostar",
    coords: "-6.1412, 106.5120",
    status: "Aktif",
    lastBilledMonth: "September 2026",
    lastBilledUsageM3: 19,
    totalUnpaidBills: 0,
    registeredDate: "2023-08-22",
  },
  {
    id: "CUST-1012",
    connectionNo: "001482921",
    meterId: "MTR-71190",
    name: "PT Indah Plastik Mandiri",
    phone: "081188229900",
    address: "Jl. Raya Legok KM 5, Kawasan Pergudangan Legok Blok B-12",
    area: "Legok",
    tariffGroup: "4A - Industri Sedang / Pergudangan",
    meterSize: "2 inch",
    meterBrand: "Woltman Turbo",
    coords: "-6.2910, 106.5812",
    status: "Aktif",
    lastBilledMonth: "September 2026",
    lastBilledUsageM3: 420,
    totalUnpaidBills: 0,
    registeredDate: "2017-06-15",
  },
];

/**
 * Load all customer master data from localStorage or seed
 */
export function getAllCustomers(): AetraCustomerRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Gagal memuat master data pelanggan, fallback default:", e);
  }
  // Default seed
  saveAllCustomers(DEFAULT_MASTER_CUSTOMERS);
  return DEFAULT_MASTER_CUSTOMERS;
}

/**
 * Save customer master array to localStorage
 */
export function saveAllCustomers(customers: AetraCustomerRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
    window.dispatchEvent(new CustomEvent("aetra:customers_updated"));
  } catch (e) {
    console.error("Gagal menyimpan customer master ke localStorage:", e);
  }
}

/**
 * Quick search across customer records by ID, Connection No, Meter ID, Name, Phone, or Address
 */
export function searchCustomers(query: string): AetraCustomerRecord[] {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase().trim();
  const all = getAllCustomers();
  return all.filter((c) => {
    return (
      c.connectionNo.toLowerCase().includes(q) ||
      c.meterId.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      c.area.toLowerCase().includes(q) ||
      c.tariffGroup.toLowerCase().includes(q)
    );
  }).slice(0, 10);
}

/**
 * Find exact customer by Connection No or Meter ID
 */
export function findCustomerByExactNo(no: string): AetraCustomerRecord | null {
  if (!no) return null;
  const clean = no.trim().toLowerCase();
  const all = getAllCustomers();
  return all.find((c) => c.connectionNo.toLowerCase() === clean || c.meterId.toLowerCase() === clean) || null;
}

/**
 * Upsert single customer record
 */
export function saveCustomerRecord(customer: AetraCustomerRecord): AetraCustomerRecord {
  const all = getAllCustomers();
  const idx = all.findIndex((c) => c.id === customer.id || c.connectionNo === customer.connectionNo);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...customer };
  } else {
    all.unshift(customer);
  }
  saveAllCustomers(all);
  return customer;
}

/**
 * Auto-generate 10-Digit Standard Case ID (CCnB Compliant)
 */
export function generateCcnbStandardCaseId(): string {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2); // "26"
  const month = String(now.getMonth() + 1).padStart(2, "0"); // "10"
  const rand6 = String(Math.floor(100000 + Math.random() * 900000));
  return `${year}${month}${rand6}`; // 10 digit string e.g. "2610849201"
}
