# Specification: Fitur Pengingat Pintar (Rutinitas & Deteksi Anomali AI)

## 1. Objective
- **Problem Statement**: Pengguna sering kali bukan sekadar lupa mencatat pengeluaran, melainkan **benar-benar lupa bahwa mereka seharusnya melakukan aktivitas rutin tersebut di minggu/bulan/tahun ini** (seperti lupa sudah waktunya servis motor berkala, ganti oli, potong rambut bulanan, atau bayar tagihan tahunan). Di sisi lain, pengguna juga sering tidak sadar ketika frekuensi pengeluaran tersier/kopi harian melonjak drastis dalam jangka waktu singkat sehingga anggaran bocor secara tidak terasa.
- **Target Audience / Users**: Seluruh pengguna aplikasi SakuChat yang mencatat pengeluaran harian dan membutuhkan asisten proaktif yang tidak hanya pasif menerima input, tetapi juga menganalisis kebiasaan finansial mereka.
- **Value Proposition**: 
  - **Zero-Config Automation**: Tanpa perlu repot mengatur alarm atau mengisi formulir jadwal manual, AI secara otomatis menganalisis pola dari riwayat transaksi lokal.
  - **1-Click Recording**: Mempercepat pencatatan pengeluaran rutin hanya dengan satu klik tombol dari kartu pengingat.
  - **Financial Guardrail**: Memberikan peringatan dini secara sopan dan solutif terhadap lonjakan frekuensi pengeluaran boros jangka pendek.

## 2. Must-Have Requirements
### Functional Requirements
- **FR-1 (AI Periodic Routine Detection)**: Sistem secara otomatis memindai riwayat transaksi lokal (`localStorage`) untuk mengenali pengeluaran dengan kata kunci serupa yang terjadi dengan interval waktu teratur (misalnya mingguan seperti "Sedekah Jum'at" atau bulanan seperti "Service Motor / Ganti Oli / Potong Rambut").
- **FR-2 (AI Anomaly & Frequency Detection)**: Sistem memonitor item pengeluaran yang frekuensinya melonjak tinggi dalam rentang waktu singkat (misalnya membeli kopi/camilan > 4 kali dalam rentang 7 hari terakhir) dan menghitung akumulasi nominal pengeluaran tersebut.
- **FR-3 (Dedicated Routine UI Tab)**: Menambahkan tab navigasi ke-4 pada menu bawah (`BottomNav`) bernama **"Rutinitas"** (dengan ikon kalender/lonceng) agar kartu pengingat memiliki halaman khusus yang rapi dan leluasa.
- **FR-4 (1-Click Action & Snooze)**: 
  - Pada kartu rutinitas berkala yang sudah jatuh tempo, tersedia tombol **"Catat Sekarang"** yang langsung mencatat transaksi berulang tersebut ke dalam database lokal dan menyinkronkannya dengan status terbaru.
  - Pada kartu peringatan anomali boros, tersedia tombol **"Mengerti / Abaikan"** untuk menyenyapkan peringatan tersebut selama rentang waktu tertentu (misal 7 hari ke depan).
- **FR-5 (Red Badge Indicator)**: Ikon tab "Rutinitas" di menu navigasi bawah menampilkan *badge* angka merah (misalnya `[2]`) jika terdapat pengingat rutin jatuh tempo atau peringatan anomali yang belum diproses.

### User Experience & User Flows
- **Happy Path Flow (Rutinitas Terjadwal)**:
  1. Pengguna membuka aplikasi SakuChat dan melihat *badge* merah angka `[1]` pada tab **Rutinitas**.
  2. Pengguna berpindah ke tab **Rutinitas** dan melihat kartu: *"Service Motor & Ganti Oli — Biasanya setiap 30 hari (Jatuh tempo hari ini)"*.
  3. Pengguna menekan tombol **"Catat Sekarang (Rp 85.000)"**.
  4. Transaksi otomatis tercatat ke riwayat pengeluaran hari ini, *badge* merah berkurang, dan pengingat diatur ulang untuk siklus bulan berikutnya.
- **Happy Path Flow (Peringatan Anomali Boros)**:
  1. Pengguna masuk ke tab **Rutinitas** dan melihat kartu peringatan berwarna kuning/amber: *"Anomali Kopi Kenangan — Terdeteksi 5x pembelian dalam 7 hari terakhir (Total Rp 125.000)"*.
  2. Pengguna menekan tombol **"Mengerti / Abaikan"**. Kartu peringatan disenyapkan dan disembunyikan dari daftar aktif.
- **UI/UX States**:
  - **Empty State**: Jika belum ada cukup riwayat transaksi atau tidak ada pengingat aktif, tampilkan ilustrasi rileks dengan pesan: *"Semua aman! Belum ada rutinitas jatuh tempo atau anomali pengeluaran terdeteksi saat ini."*

### Data & API Models
- **RoutineReminder Model (Local Storage Cache)**:
  ```typescript
  export interface RoutineReminder {
    id: string;
    type: 'periodic' | 'anomaly';
    title: string;
    description: string;
    suggestedAmount: number;
    category: CategoryName;
    frequencyLabel: string; // e.g., "Mingguan", "Bulanan", "Anomali 7 Hari"
    lastOccurredDate: string;
    nextDueDate?: string;
    isDismissedUntil?: string; // ISO date string for snooze
  }
  ```

## 3. Constraints & Technical Considerations
- **Tech Stack**: Next.js (App Router), TypeScript, Tailwind CSS, Lucide React Icons.
- **Performance & Scalability**: Analisis rutinitas dijalankan secara cepat di *client-side* menggunakan algoritma pengelompokan riwayat (*client-side frequency grouping*) tanpa membebani server atau memperlambat render awal aplikasi (< 50ms).
- **Security & Privacy**: Seluruh analisis kebiasaan finansial diproses 100% di dalam peramban lokal perangkat pengguna (*On-Device Privacy First*).

## 4. Edge Cases & Error Handling
- **EC-1 (Data Transaksi Masih Sedikit / Baru Install)** → **Handling**: Algoritma deteksi rutin membutuhkan minimal 2 atau 3 kali riwayat transaksi serupa sebelum memunculkan kartu pengingat otomatis. Pada kondisi data sedikit, tab Rutinitas menampilkan tips cara kerja fitur.
- **EC-2 (Pengguna Sudah Mencatat Secara Manual via Chat)** → **Handling**: Sebelum menampilkan *badge* jatuh tempo, sistem memeriksa apakah transaksi serupa sudah dicatat secara manual hari ini atau dalam 3 hari terakhir via menu Chat. Jika sudah dicatat, jadwal pengingat otomatis diperbarui agar tidak duplikat.
- **EC-3 (Pembersihan Data Lokal)** → **Handling**: Jika pengguna melakukan *reset/clear local storage*, cache pengingat rutin ikut direset dan akan dibangun ulang secara otomatis saat data transaksi disinkronkan kembali dari cloud.

## 5. Concrete Definition of Done (Acceptance Criteria)
- [ ] **AC-1**: Tab ke-4 ("Rutinitas") berhasil ditambahkan pada `BottomNav` dengan indikator *badge* angka merah yang akurat menghitung jumlah pengingat aktif.
- [ ] **AC-2**: Algoritma deteksi berhasil mengenali pola transaksi mingguan/bulanan dari riwayat lokal dan memunculkan kartu pengingat saat mendekati atau jatuh tempo.
- [ ] **AC-3**: Menekan tombol "Catat Sekarang" pada kartu rutinitas langsung berhasil menambahkan transaksi baru dengan nominal & kategori yang tepat tanpa harus berpindah ke layar chat.
- [ ] **AC-4**: Menekan tombol "Abaikan" pada peringatan anomali berhasil menyenyapkan kartu tersebut agar tidak muncul kembali selama rentang waktu *snooze*.
