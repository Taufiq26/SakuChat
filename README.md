# SakuChat 💰✨  
**Asisten Pengatur Keuangan Pribadi Berbasis Obrolan AI & Cloud**

![Next.js](https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS%20v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

---

## 📖 Tentang SakuChat & Kegunaannya

**SakuChat** adalah aplikasi pencatatan dan analisis keuangan pribadi modern yang dirancang untuk menghilangkan keribetan formulir akuntansi tradisional. Menggunakan pendekatan **Chat-First** dengan NLP (*Natural Language Processing*) berbahasa Indonesia, Anda cukup mengetik pengeluaran sehari-hari layaknya mengobrol dengan asisten pribadi.

### ✨ Fitur Unggulan SakuChat:
1. **🤖 Pencatatan Alami Berbasis Obrolan (NLP Bahasa Indonesia)**  
   Cukup ketik pengeluaran Anda seperti obrolan biasa:
   - *"Makan siang di warteg 35rb"*  
   - *"Beli bensin kemarin sore 50.000"*  
   - *"Bayar listrik lusa lalu 450 ribu"*  
   Sistem otomatis mengenali **Nominal**, **Kategori Pengeluaran**, hingga **Tanggal Transaksi** (*hari ini, kemarin, lusa, atau tanggal spesifik*).

2. **⚡ Offline-First & Real-time Cloud Sync**  
   Aplikasi dapat digunakan langsung tanpa internet atau tanpa login (*Offline-First*) dengan penyimpanan di peranti (*LocalStorage*). Ketika Anda masuk (*login*) menggunakan Google Akun, seluruh catatan akan otomatis tersinkronisasi dengan database cloud **Supabase** secara real-time.

3. **📊 Laporan & Analisa Komparasi 12 Bulan Eksekutif**  
   - **Mode Ringkasan & Anomali**: Grafik cincin (*Ring Chart*) informatif dengan rincian total dan persentase setiap kategori, disertai sorotan lonjakan pengeluaran (*Spike Alerts*).
   - **Mode Tren 12 Bulan (Jan - Des)**: Grafik perbandingan bulanan yang dapat difilter per tahun dan per kategori spesifik.
   - **Kesimpulan AI Otomatis**: Menganalisis bulan puncak pengeluaran, bulan terhemat, selisih pengeluaran, dan memberikan rekomendasi batas aman kas.

4. **🔒 Keamanan Nyata Tanpa Spam (Eksklusif Google OAuth)**  
   Sistem login sengaja dirancang **100% Eksklusif Google Login 1-Klik** (*Tanpa input email manual & tanpa kode OTP*) agar akun yang terdaftar terjamin autentik dan bebas dari penipuan atau spam akun fiktif.

5. **📅 Fleksibilitas Koreksi Cepat**  
   Setiap kartu transaksi yang tercatat di obrolan dilengkapi tombol lencana **Kategori** dan **Tanggal**. Anda dapat mengganti kategori atau mengubah tanggal pengeluaran kapan saja hanya dengan 1 kali klik.

---

## 🛠️ Teknologi yang Dipakai

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Core Framework** | [Next.js 16 (App Router)](https://nextjs.org/) | Rendering super cepat dengan Turbopack & arsitektur modern |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Keamanan tipe data end-to-end |
| **UI Library** | [React 19](https://react.dev/) | State management interaktif dan responsif |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Desain *Glassmorphism*, gradien premium, dan animasi mulus |
| **Icons** | [Lucide React](https://lucide.dev/) | Set ikon modern beresolusi tinggi |
| **Backend & Auth** | [Supabase](https://supabase.com/) | PostgreSQL Cloud, Row Level Security (RLS), & Google OAuth |
| **Cloud Provider** | [Google Cloud Platform (GCP)](https://console.cloud.google.com/) | OAuth 2.0 API untuk autentikasi aman Google Login |

---

## 🚀 Cara Instalasi dari Awal

Ikuti langkah-langkah di bawah ini untuk menjalankan proyek SakuChat di komputer lokal Anda mulai dari konfigurasi cloud hingga siap pakai.

### Prasyarat Sistem
Pastikan Anda telah menginstal:
- **Node.js** (versi 20.x atau terbaru)
- **npm** (atau `pnpm` / `yarn`)

---

### Langkah 1: Kloning Proyek & Instal Dependensi

Buka terminal (*Command Prompt / Terminal*) dan jalankan perintah berikut:

```bash
# 1. Masuk ke folder proyek
cd sakuchat

# 2. Instal seluruh dependensi
npm install
```

---

### Langkah 2: Konfigurasi Google Cloud Platform (GCP)

Karena SakuChat menggunakan autentikasi eksklusif Google, Anda perlu membuat OAuth Client ID di Google Cloud Console:

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat proyek baru (*Create Project*) atau pilih proyek yang sudah ada.
3. Buka menu **APIs & Services** > **OAuth consent screen** (*Layar Persetujuan OAuth*):
   - Pilih *User Type*: **External** (Eksternal), lalu klik **Create**.
   - Isi **App name** (misal: `SakuChat`), **User support email**, dan **Developer contact information**. Simpan & Lanjutkan.
   - Pada bagian *Scopes*, Anda bisa langsung klik *Save and Continue* (karena email dan profil termasuk *default scope*).
   - Di bagian *Test users*, Anda bisa menambahkan email Anda sendiri saat masa pengembangan atau langsung *Publish App*.
4. Buka menu **APIs & Services** > **Credentials** (*Kredensial*):
   - Klik **+ CREATE CREDENTIALS** > Pilih **OAuth client ID**.
   - Pilih *Application type*: **Web application**.
   - Beri nama klien (misal: `SakuChat Web Auth`).
   - Pada bagian **Authorized redirect URIs** (*URI Pengalihan Resmi*), tambahkan URL callback dari Supabase proyek Anda dengan format:
     ```text
     https://<ID-PROYEK-SUPABASE-ANDA>.supabase.co/auth/v1/callback
     ```
     *(Catatan: Anda akan mendapatkan URL persisnya di Langkah 3 saat membuat proyek Supabase).*
5. Klik **Create**. Anda akan mendapatkan **Client ID** dan **Client Secret**. Simpan kedua kode rahasia ini.

---

### Langkah 3: Konfigurasi Supabase (Auth & Database)

1. Buka dasbor [Supabase](https://supabase.com/dashboard) dan buat proyek baru (*New Project*).
2. **Setup Autentikasi Google Login**:
   - Di menu samping kiri proyek Supabase Anda, pilih **Authentication** > **Providers**.
   - Cari provider **Google** dan aktifkan (*Enable*).
   - Masukkan **Client ID** dan **Client Secret** yang didapatkan dari Google Cloud Platform pada Langkah 2.
   - Klik **Save**.
3. **Setup Pengalihan URL (Redirect URL)**:
   - Masuk ke menu **Authentication** > **URL Configuration**.
   - Tambahkan URL pengembangan lokal Anda (`http://localhost:3000`) serta domain produksi Anda ke dalam **Site URL** dan **Redirect URLs**.
4. **Setup Database & Keamanan RLS**:
   - Di menu samping kiri, pilih **SQL Editor** > **New Query**.
   - Salin seluruh perintah SQL di bawah ini (atau buka dari file `supabase_schema.sql` di root proyek) dan jalankan (*Run*):

```sql
-- 1. Buat tabel transaksi pengeluaran
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  raw_text TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Buat indeks untuk mempercepat pencarian & filter laporan
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, date);

-- 3. Aktifkan Row Level Security (RLS) agar keamanan data antar pengguna terjaga 100%
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 4. Buat kebijakan RLS: Pengguna HANYA BISA melihat dan mengelola datanya sendiri
CREATE POLICY "Users can view own expenses" 
ON public.expenses FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" 
ON public.expenses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" 
ON public.expenses FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" 
ON public.expenses FOR DELETE 
USING (auth.uid() = user_id);
```

---

### Langkah 4: Atur Environment Variables

Di dalam root folder proyek SakuChat, buat salinan atau file baru bernama `.env.local` dan masukkan kunci rahasia dari Supabase Anda:

```env
# Ambil dari dasbor Supabase > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://<ID-PROYEK-SUPABASE-ANDA>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Langkah 5: Jalankan Server Pengembangan

Setelah seluruh dependensi terinstal dan konfigurasi environment terisi, jalankan aplikasi:

```bash
npm run dev
```

Buka peramban (*browser*) Anda dan akses **`http://localhost:3000`**. SakuChat kini siap membantu mengatur pengeluaran harian Anda dengan lancar dan aman! 🎉

---

## 📂 Struktur Direktori Proyek

```text
sakuchat/
├── public/                 # Aset statis (ikon, ilustrasi)
├── src/
│   ├── app/                # Next.js App Router (layout, halaman utama, CSS global)
│   ├── components/         # Komponen antarmuka (Navbar, ChatView, ReportsView, SettingsView)
│   ├── lib/                # Logika bisnis (Koneksi Supabase, NLP Parser, LocalStorage Manager)
│   └── types/              # Definisi tipe data TypeScript
├── supabase_schema.sql     # Skema database & konfigurasi kebijakan keamanan (RLS)
├── package.json            # Daftar dependensi & skrip NPM
└── README.md               # Dokumentasi utama proyek
```

---
*Dibuat dengan ❤️ untuk kemudahan literasi finansial masyarakat Indonesia.*
