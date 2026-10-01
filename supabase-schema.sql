-- ====================================================================
-- SKEMA DATABASE ONLINE SUPABASE (POSTGRESQL)
-- PT AETRA AIR TANGERANG - SISTEM TIKET & MONITORING SLA
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL PENGADUAN & WORK ORDER (COMPLAINTS)
CREATE TABLE IF NOT EXISTS public.complaints (
    id VARCHAR(64) PRIMARY KEY,                         -- No. WO (misal: WO-2026-001)
    case_id VARCHAR(64),                                -- Case ID Pelanggan (misal: 1004829101)
    customer VARCHAR(255) NOT NULL,                     -- Nama Pelanggan
    phone VARCHAR(50),                                  -- Nomor Telepon / WhatsApp
    meter_id VARCHAR(50),                               -- No. Meter Air (misal: MTR-88291)
    address TEXT,                                       -- Alamat Lengkap
    area VARCHAR(100),                                  -- Area / Wilayah (Cikupa, Panongan, Tigaraksa, dll)
    category VARCHAR(50) NOT NULL,                      -- Kasus (KBSM, KKMR, KPMR, KRPT, dll)
    description TEXT,                                   -- Uraian Pengaduan
    status VARCHAR(20) DEFAULT 'baru',                  -- Status: 'baru' | 'proses' | 'selesai'
    urgent BOOLEAN DEFAULT false,                       -- Prioritas Mendesak / Urgent
    coords VARCHAR(100),                                -- Koordinat GPS (latitude, longitude)
    received_at TIMESTAMPTZ DEFAULT NOW(),              -- Waktu Diterima
    completed_at TIMESTAMPTZ,                           -- Waktu Diselesaikan
    officer VARCHAR(255),                               -- Petugas Lapangan / Penanggung Jawab
    target_division VARCHAR(50) DEFAULT 'minor_repair', -- Divisi Tujuan (minor_repair, sales_support, key_account, technical_support, customer_service)
    distribution_status VARCHAR(50) DEFAULT 'received', -- draft, distributed, received, in_progress, resolved
    distributed_at TIMESTAMPTZ,                         -- Waktu Pendistribusian
    distributed_by VARCHAR(255),                        -- Petugas yang mendistribusikan
    distribution_notes TEXT,                            -- Catatan Disposisi
    intake_channel VARCHAR(50) DEFAULT 'WhatsApp CS',   -- Call Center 24 Jam, WhatsApp CS, Loket Kantor, dll
    division_assignee VARCHAR(255),                     -- Teknisi/Staf Penanganan Divisi
    division_action_notes TEXT,                         -- Catatan Tindak Lanjut Divisi
    resolution_summary TEXT,                            -- Ringkasan Solusi
    photo_before TEXT,                                  -- URL Foto Sebelum Perbaikan
    photo_after TEXT,                                   -- URL Foto Sesudah Perbaikan
    completion_notes TEXT,                              -- Berita Acara Penyelesaian
    used_materials JSONB DEFAULT '[]'::jsonb,           -- Material yang digunakan
    customer_signature TEXT,                            -- Tanda tangan digital pelanggan (Base64/URL)
    customer_signer_name VARCHAR(255),                  -- Nama penandatangan pelanggan
    officer_signature TEXT,                             -- Tanda tangan digital petugas (Base64/URL)
    drive_file_url TEXT,                                -- URL Dokumen Terkait
    created_at TIMESTAMPTZ DEFAULT NOW(),               -- Timestamp Pembuatan Baris
    updated_at TIMESTAMPTZ DEFAULT NOW()                -- Timestamp Terakhir Diperbarui
);

-- 3. TABEL KOMENTAR & DISKUSI LINTAS DIVISI (TICKET_COMMENTS)
CREATE TABLE IF NOT EXISTS public.ticket_comments (
    id VARCHAR(64) PRIMARY KEY,
    ticket_id VARCHAR(64) REFERENCES public.complaints(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    author_division VARCHAR(50) NOT NULL,
    author_role VARCHAR(100),
    target_department VARCHAR(100),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INDEX UNTUK PERFORMA TINGGI (30-DAY MOVING AVERAGE, SLA & ANALYTICS)
CREATE INDEX IF NOT EXISTS idx_complaints_received_at ON public.complaints(received_at);
CREATE INDEX IF NOT EXISTS idx_complaints_completed_at ON public.complaints(completed_at);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_target_division ON public.complaints(target_division);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON public.complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_area ON public.complaints(area);
CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON public.ticket_comments(ticket_id);

-- 5. TRIGGER OTOMATIS UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_complaints_updated_at ON public.complaints;
CREATE TRIGGER trigger_update_complaints_updated_at
    BEFORE UPDATE ON public.complaints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. SETUP ROW LEVEL SECURITY (RLS) & IZIN AKSES
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses: Izinkan Baca (SELECT) untuk Publik / Anon Key
CREATE POLICY "Allow public read access to complaints"
    ON public.complaints FOR SELECT
    USING (true);

-- Kebijakan Akses: Izinkan Tambah Data (INSERT) untuk Publik / Anon Key
CREATE POLICY "Allow public insert to complaints"
    ON public.complaints FOR INSERT
    WITH CHECK (true);

-- Kebijakan Akses: Izinkan Perbarui Data (UPDATE) untuk Publik / Anon Key
CREATE POLICY "Allow public update to complaints"
    ON public.complaints FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Kebijakan Akses untuk Komentar
CREATE POLICY "Allow public read access to comments"
    ON public.ticket_comments FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert to comments"
    ON public.ticket_comments FOR INSERT
    WITH CHECK (true);

-- 7. ENABLE REALTIME SUPABASE UNTUK SINKRONISASI INSTAN ANTAR DIVISI
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_comments;

-- Selesai! Tabel siap digunakan langsung oleh aplikasi frontend.
