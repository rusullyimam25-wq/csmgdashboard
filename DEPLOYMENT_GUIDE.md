# Panduan Lengkap: Database Online Supabase & Deploy Vercel via GitHub
**PT Aetra Air Tangerang - Sistem Work Order & Executive Analytics Dashboard**

Dokumen ini memandu Anda langkah demi langkah untuk menyiapkan **Database Online di Supabase** dan melakukan **Deploy Otomatis ke Vercel via GitHub**.

---

## BAGIAN 1: Menyiapkan Database Online di Supabase

### 1. Buat Proyek Baru di Supabase
1. Buka [https://supabase.com](https://supabase.com) dan login/daftar (bisa langsung menggunakan akun GitHub Anda).
2. Di dashboard Supabase, klik **"New Project"**.
3. Isi informasi proyek:
   - **Name**: `aetra-work-order-db` (atau nama lain pilihan Anda).
   - **Database Password**: Buat password yang kuat dan simpan dengan aman.
   - **Region**: Pilih region terdekat, misalnya **Singapore (ap-southeast-1)**.
4. Klik **"Create new project"** dan tunggu sekitar 1-2 menit hingga database aktif.

### 2. Jalankan Skema Database (Tabel & Index)
1. Di sidebar kiri dashboard Supabase, klik menu **SQL Editor** (ikon terminal/dokumen SQL).
2. Klik tombol **"New query"**.
3. Salin seluruh isi file **`supabase-schema.sql`** yang sudah disediakan di root repositori proyek ini.
4. Tempel (*paste*) ke dalam SQL Editor Supabase, lalu klik tombol **"Run"** (atau tekan `Ctrl+Enter` / `Cmd+Enter`).
5. Akan muncul pesan `Success. No rows returned`.
   - Ini otomatis membuat tabel `complaints`, `ticket_comments`, index performa, trigger update waktu, kebijakan keamanan (RLS), serta mengaktifkan **Supabase Realtime**.

### 3. Dapatkan API Keys Supabase
1. Di sidebar kiri, klik menu **Project Settings** (ikon roda gigi) -> **API** (atau **Data API**).
2. Temukan dan salin 2 nilai penting ini:
   - **Project URL** (contoh: `https://abcdefghijklmnop.supabase.co`)
   - **anon / public key** (kunci panjang berformat JWT)

---

## BAGIAN 2: Upload Repositori ke GitHub

### 1. Buat Repositori Baru di GitHub
1. Buka [https://github.com](https://github.com) dan login.
2. Klik tombol **"New"** (atau tanda `+` di pojok kanan atas -> **New repository**).
3. Isi **Repository name**, misalnya: `aetra-work-order-app`.
4. Pilih **Public** atau **Private**.
5. **Jangan centang** "Initialize this repository with a README" (karena kode sudah ada).
6. Klik **"Create repository"**.

### 2. Push Kode dari Komputer/Terminal ke GitHub
Buka terminal di direktori proyek Anda dan jalankan perintah berikut:

```bash
# 1. Inisialisasi git (jika belum ada)
git init

# 2. Tambahkan semua file ke staging
git add .

# 3. Buat commit pertama
git commit -m "feat: Sistem Work Order Aetra lengkap dengan Recharts 30-Day Moving Average & Supabase"

# 4. Ganti nama branch utama menjadi main
git branch -M main

# 5. Hubungkan ke repositori GitHub Anda (ganti USERNAME dan REPO_NAME)
git remote add origin https://github.com/USERNAME/aetra-work-order-app.git

# 6. Push kode ke GitHub
git push -u origin main
```

---

## BAGIAN 3: Deploy di Vercel Menggunakan GitHub

### 1. Hubungkan Repositori GitHub ke Vercel
1. Buka [https://vercel.com](https://vercel.com) dan login menggunakan akun GitHub Anda.
2. Di dashboard Vercel, klik tombol **"Add New..."** -> **"Project"**.
3. Di bagian **"Import Git Repository"**, cari repositori `aetra-work-order-app` yang baru saja Anda push.
4. Klik tombol **"Import"** di samping nama repositori tersebut.

### 2. Konfigurasi Proyek di Vercel
1. **Project Name**: Biarkan default atau sesuaikan.
2. **Framework Preset**: Vercel akan otomatis mendeteksi **Vite**.
3. **Root Directory**: `./` (default).
4. **Build Command**: `npm run build` (default).
5. **Output Directory**: `dist` (default).

### 3. Tambahkan Environment Variables di Vercel
Buka accordion **"Environment Variables"** dan tambahkan 2 variabel dari Supabase yang Anda dapatkan di Bagian 1:

| Key | Value | Keterangan |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://your-project-id.supabase.co` | URL proyek Supabase Anda |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Public Anon Key Supabase |

*(Opsional: Jika Anda menggunakan integrasi Gemini AI, tambahkan juga `GEMINI_API_KEY`)*

### 4. Jalankan Deploy
1. Klik tombol **"Deploy"**.
2. Vercel akan mengunduh dependensi (`npm install`), melakukan build Vite (`npm run build`), dan menerbitkan aplikasi ke CDN global Vercel dalam waktu ~1 menit.
3. Setelah selesai, Anda akan melihat animasi kembang api dan tautan URL produksi publik Anda (misalnya: `https://aetra-work-order-app.vercel.app`).

### 5. Keuntungan CI/CD Otomatis:
Setiap kali Anda melakukan perubahan di kode dan melakukan `git push origin main`, **Vercel akan otomatis mendeteksi perubahan, menguji build, dan memperbarui website secara otomatis tanpa henti (*zero-downtime*)**.

---

## BAGIAN 4: Fitur Visual Baru: 30-Day Moving Average Card (Recharts)

Aplikasi Anda kini sudah dilengkapi dengan visual card interaktif berbasis **Recharts**:

1. **Komputasi Rolling 30 Hari**:
   - Menghitung rasio $\frac{\sum \text{Completed in 30 Days}}{\sum \text{Received in 30 Days}} \times 100\%$ secara dinamis dari data tiket operasional.
2. **Dual-Axis Visualization**:
   - Sumbu kiri: Persentase tingkat penyelesaian (`%`) dengan garis *moving average* halus dan garis referensi SLA 95% & 98%.
   - Sumbu kanan: Batang volume harian (`WO Selesai Harian` & `WO Masuk Harian`).
3. **Interaktivitas Lengkap**:
   - Pilihan rentang waktu: **30 Hari**, **60 Hari**, **90 Hari**, atau **YTD 2026**.
   - Filter divisi: **Semua Divisi**, **Minor Repair**, **Sales Support**, **Key Account**, **Technical Support**, atau **Customer Service**.
   - Pilihan mode tampilan: **Komposit (MA + Volume Bar)**, **Area Glow**, atau **MA vs Fluktuasi Harian**.
   - Tooltip hover kaca gelap berisi rincian tanggal, tingkat penyelesaian, volume jendela 30 hari, serta status kepatuhan SLA.
4. **Navigasi Cepat**:
   - Dapat diakses langsung di dalam **Executive BI Analytics Dashboard**.
   - Tersedia tab tersendiri **"📈 30-Day Moving Avg Trend"** di Customer Service Dashboard.
   - Tersedia tautan langsung di **Sidebar Navigasi** (`FITUR & ALAT KERJA`).
