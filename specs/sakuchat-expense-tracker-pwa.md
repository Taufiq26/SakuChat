# Specification: SakuChat - Chat-Driven Personal Expense Tracker PWA

## 1. Objective
- **Problem Statement**: Pencatatan pengeluaran pribadi konvensional sering kali terasa rumit, membutuhkan banyak klik, pengisian formulir yang panjang, serta minim analisis yang memberikan panduan tindakan nyata. Akibatnya, pengguna mudah bosan dan berhenti mencatat pengeluaran mereka sehari-hari.
- **Target Audience / Users**: Individu modern, mahasiswa, pekerja kantoran, maupun pekerja lepas yang menginginkan cara pencatatan keuangan pribadi yang secepat mengirim pesan obrolan (*chatting*) dan membutuhkan pengawasan anggaran tanpa ribet.
- **Value Proposition**: 
  1. **Input Secepat Chat**: Mencatat pengeluaran menggunakan bahasa alami (*Natural Language*) dalam antarmuka berbasis chat yang interaktif (misal: *"Makan siang di warteg 25rb"*).
  2. **Privasi Maksimal (Offline-First)**: Data tersimpan 100% lokal di perangkat secara default tanpa biaya server, dengan opsi sinkronisasi cloud serverless saat pengguna login.
  3. **Actionable Insights & Anomaly Detection**: Laporan distribusi persentase per kategori disertai detektor pengeluaran terbesar (*top spending*) dan peringatan lonjakan transaksi tak wajar secara otomatis.

## 2. Must-Have Requirements

### Functional Requirements
- **FR-1 (Natural Language Chat Input)**: Sistem harus menyediakan antarmuka bergaya obrolan (*chat UI*) di mana pengguna dapat mengetik kalimat pengeluaran. Parser lokal (*client-side rule/regex-based*) harus mengekstrak nominal angka (termasuk format `25rb`, `25k`, `25.000`) dan mencocokkan kata kunci ke dalam kategori yang sesuai (misal: Makanan, Transportasi, Belanja, Tagihan, Hiburan, Lainnya).
- **FR-2 (Interactive Conversational Feedback)**: Setiap input yang berhasil harus memunculkan gelembung respons (*chat bubble/card*) berisi konfirmasi nominal, kategori, dan opsi edit cepat. Jika nominal tidak ditemukan dalam teks, asisten chat harus membalas meminta keterangan angka.
- **FR-3 (Top Spending & Anomaly Detector)**: Sistem harus menganalisis data pengeluaran secara lokal untuk menyoroti 3 kategori pengeluaran terbesar (*Top Spending*) pada bulan berjalan dan mendeteksi anomali (misal transaksi tunggal atau akumulasi harian yang melebihi 2x rata-rata harian normal), lalu memberikan pesan saran tindakan konkrit (*actionable insight*).
- **FR-4 (Category Percentage Distribution Report)**: Sistem harus menghasilkan laporan visual (grafik lingkaran/persentase bar) yang menunjukkan persentase (%) dan total nominal untuk setiap kategori pengeluaran dalam rentang waktu yang dipilih (mingguan/bulanan).
- **FR-5 (Offline-First & Local Storage)**: Semua transaksi, kategori, dan riwayat chat harus disimpan secara lokal di browser menggunakan `IndexedDB` / `localStorage` sehingga aplikasi berfungsi penuh 100% tanpa koneksi internet.
- **FR-6 (Cloud Sync & Auto-Merge via Supabase)**: Sistem menyediakan fitur pendaftaran/login akun (opsional). Ketika pengguna anonim mendaftar atau login, sistem harus otomatis menggabungkan (*auto-merge*) data lokal yang ada ke database cloud di Supabase tanpa menghasilkan duplikasi transaksi.

### User Experience & User Flows
- **Happy Path Flow**:
  1. Pengguna membuka aplikasi PWA **SakuChat** (langsung aktif secara lokal tanpa perlu login).
  2. Di tab obrolan utama (**Catat**), pengguna mengetik: *"Grab ke kantor 35000"*.
  3. Sistem membalas dengan gelembung konfirmasi: *"✅ Dicatat: Rp 35.000 (Transportasi)."*
  4. Pengguna beralih ke tab **Laporan & Insight** untuk melihat persentase pengeluaran bulan ini dan membaca rekomendasi dari detektor anomali.
- **UI/UX States**:
  - **Loading State**: Animasi mengetik (*typing indicator*) singkat saat sistem memproses input chat atau menyinkronkan data.
  - **Empty State**: Tampilan awal tab chat berisi pesan sambutan hangat dan contoh-contoh kalimat yang bisa diketik (misal: *"Coba ketik: Beli kopi 20rb"*).
  - **Offline/Online Badge**: Indikator status koneksi yang elegan di pojok atas bagi pengguna yang sudah mengaktifkan fitur sinkronisasi cloud.

### Data & API Models
- **Transaction Entity**:
  ```typescript
  interface Transaction {
    id: string; // UUID v4
    userId?: string; // Null jika anonim/lokal
    rawText: string; // Teks asli input pengguna
    amount: number; // Nominal pengeluaran (IDR)
    category: string; // Kategori pengeluaran
    date: string; // ISO 8601 Timestamp
    isSynced: boolean; // Status sinkronisasi ke cloud
  }
  ```

## 3. Constraints & Technical Considerations
- **Tech Stack**:
  - **Framework**: Next.js (App Router, TypeScript) dengan konfigurasi PWA (*Progressive Web App*) agar dapat di-install di layar utama HP/Desktop.
  - **Styling**: Vanilla CSS bergaya modern (*Glassmorphism*, gradien halus, animasi interaktif) atau CSS Modules sesuai panduan web modern.
  - **Database & Auth (Serverless)**: Supabase (PostgreSQL + Supabase Auth) dengan pemanfaatan *Free Tier* untuk meminimalkan atau menihilkan biaya server.
  - **Hosting**: Vercel (Optimized for Next.js Serverless Functions).
- **Performance & Scalability**:
  - Ekstraksi *Natural Language* dijalankan sepenuhnya di *client-side* menggunakan *regex/rule matching* sehingga waktu respons < 50ms tanpa ketergantungan latensi server AI.
- **Security & Permissions**:
  - Pengapan kebijakan *Row Level Security (RLS)* di Supabase PostgreSQL untuk memastikan pengguna yang login hanya dapat mengakses dan menyinkronkan data milik mereka sendiri (`user_id = auth.uid()`).

## 4. Edge Cases & Error Handling
- **EC-1 (Input Tanpa Angka / Ambigu)** → **Handling**: Sistem memproses teks, menetapkan kategori ke "Lainnya" (atau hasil tebakan), dan membalas di chat: *"Catatan diterima! Berapa nominal pengeluaran untuk transaksi ini?"* sambil mengaktifkan fokus pada input angka.
- **EC-2 (Konflik Sinkronisasi / Duplikasi Saat Login)** → **Handling**: Saat proses *auto-merge*, sistem memeriksa ID transaksi lokal atau sidik jari transaksi (`date` + `amount` + `rawText`). Jika sudah ada di server, transaksi dilewati (*skip*); jika belum, ditambahkan sebagai *insert* baru.
- **EC-3 (Koneksi Terputus Saat Sinkronisasi Cloud)** → **Handling**: Transaksi tetap tersimpan aman di `IndexedDB` dengan status `isSynced: false`. Sistem akan secara otomatis mencoba sinkronisasi ulang (*background retry*) saat peramban mendeteksi status kembali *online*.

## 5. Concrete Definition of Done (Acceptance Criteria)
- [ ] **AC-1**: Given pengguna berada di tab Chat, saat mengetik *"Beli bensin 40rb"* dan menekan enter, maka sistem langsung menampilkan *chat bubble* balasan yang mencatat nominal Rp 40.000 dengan kategori "Transportasi" dalam waktu < 100ms secara offline.
- [ ] **AC-2**: Given pengguna mengetik *"Belanja bulanan"* tanpa angka, saat dikirim, maka sistem merespons meminta input angka nominal tanpa mengalami *crash* atau *error*.
- [ ] **AC-3**: Given terdapat 10 transaksi dengan berbagai kategori, saat pengguna membuka tab Laporan, maka sistem menampilkan persentase tiap kategori secara akurat (total 100%) beserta sorotan 3 kategori pengeluaran terbesar.
- [ ] **AC-4**: Given total pengeluaran kategori tertentu melonjak drastis melepati batas wajar rata-rata harian, saat membuka tab Laporan, maka kartu *Actionable Insight / Anomaly Alert* muncul memberikan peringatan dan saran pengurangan pengeluaran.
- [ ] **AC-5**: Given pengguna memiliki 5 transaksi lokal di perangkat tanpa login, saat pengguna melakukan registrasi/login akun Supabase, maka ke-5 transaksi tersebut berhasil digabungkan ke database cloud dan status `isSynced` berubah menjadi `true`.
