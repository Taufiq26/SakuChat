# Specification: SakuChat UI/UX Overhaul v2 (Ultra-Sleek Modern Fintech Edition)

## 1. Objective
- **Problem Statement**: Antarmuka SakuChat versi awal mengalami masalah visual serius berupa kebocoran karakter markdown mentah (*raw markdown artifacts* seperti `**Dicatat:**` atau `'localStorage'`) di layar antarmuka pengguna, area footer obrolan yang sesak karena penumpukan *Suggestion Chips* dan *Floating Input Bar*, *Donut Chart* yang terlalu tebal dan kaku pada tab Laporan, serta form input dan tombol pada tab Pengaturan yang terpotong di tepi kontainer.
- **Target Audience / Users**: Pengguna individu harian yang menginginkan aplikasi pencatatan keuangan pribadi berantarmuka sekelas aplikasi *Fintech* modern (seperti Linear, Revolut, atau Apple Wallet) yang super bersih, proporsional, dan nyaman digunakan di ponsel maupun desktop.
- **Value Proposition**:
  1. **Zero Raw Markdown & Rich Component Standard**: Seluruh interaksi, balasan asisten, dan informasi sistem dirender menggunakan komponen UI murni (*Rich Cards*, *Pill Badges*, tipografi proporsional) tanpa ada teks markdown mentah yang bocor ke layar.
  2. **Spacious & Ergonomic Chat Flow**: Area obrolan yang bernafas lega dengan menyembunyikan *Suggestion Chips* saat percakapan aktif (hanya tampil pada *Empty State*), serta balasan konfirmasi transaksi berupa *Rich Embedded Transaction Card*.
  3. **Sleek Ring Dashboard & Stacked Forms**: Dasbor analisis laporan dengan grafik cincin (*Sleek Ring Chart*) proporsional dan kartu-kartu pengaturan yang ergonomis (*Stacked Responsive Form*) tanpa elemen yang terpotong.

## 2. Must-Have Requirements

### Functional Requirements
- **FR-1 (Zero Raw Markdown UI Rendering)**: Seluruh komponen presentasi (`ChatView.tsx`, `SettingsView.tsx`, `ReportsView.tsx`) harus membersihkan atau mengganti format string ber-asterisk (`**`, `*`) atau backtick (``` ` ```) menjadi elemen JSX/HTML berstruktur dengan kelas tipografi yang jelas (misal `<span className="font-bold">`). Asisten chat dilarang mengirimkan string teks bertanda asteris mentah sebagai balasan konfirmasi.
- **FR-2 (Rich Embedded Transaction Card Only)**: Pada tab *Chat*, ketika transaksi berhasil dicatat dari input pengetikan, sistem tidak membalas dengan paragraf teks, melainkan langsung memunculkan **Rich Embedded Transaction Card** di dalam *chat stream*. Kartu ini harus memiliki kotak ikon kategori dengan warna *vibrant* yang senada, nominal transaksi berukuran besar (`text-base font-extrabold text-emerald-400`), nama kategori sebagai *pill badge*, dan tombol hapus yang bersih.
- **FR-3 (Empty State Suggestion Chips & Clean Footer)**: Pada `ChatView.tsx`, *Suggestion Chips* (tombol saran pengetikan cepat seperti *"Makan siang di warteg 25rb"*) **hanya boleh dirender ketika jumlah pesan obrolan kosong (`messages.length === 0`)**. Ketika obrolan sudah berisi pesan, area *Suggestion Chips* harus otomatis sembunyi (*hidden*), sehingga *Floating Pill Input Bar* memiliki ruang yang lega di atas *Bottom Navigation*.
- **FR-4 (Sleek Ring Dashboard & Fintech Insight Cards)**: Pada `ReportsView.tsx`, visualisasi grafik distribusi harus menggunakan **Sleek Ring Chart** (ketebalan stroke SVG proporsional maksimal ~14px–16px) dengan label angka total pengeluaran di pusat cincin. Kartu *Actionable Insights & Anomali* harus dikemas dalam kontainer *glassmorphism* berseri dengan hierarki teks yang jelas dan *padding* lega (`p-5 sm:p-6`).
- **FR-5 (Stacked Responsive Form di Settings View)**: Pada `SettingsView.tsx`, form input email sinkronisasi cloud dan tombol **Login & Sync** harus ditata menggunakan tata letak bertumpuk (*stacked vertical layout* `flex flex-col gap-2` atau *responsive layout*) dan tombol menggunakan `w-full` atau proporsi yang aman agar teks dan ikon tombol tidak terpotong di tepi kontainer. Seluruh penjelasan info di kartu *Privasi & Penyimpanan Lokal* serta *Zona Bahaya* wajib dirender tanpa markdown mentah.

### User Experience & User Flows
- **Happy Path Flow**:
  1. Pengguna membuka SakuChat. Di tab **Catat**, layar *Empty State* menyambut dengan kartu ilustrasi ramah dan daftar *Suggestion Chips*.
  2. Pengguna mengklik atau mengetik *"Beli kopi 25rb"*. Segera setelah pesan terkirim, *Suggestion Chips* menghilang, ruang chat menjadi lega, dan *Rich Embedded Transaction Card* muncul dengan animasi *pop-in*.
  3. Pengguna beralih ke tab **Laporan**. Dasbor menyajikan *Sleek Ring Chart* berketebalan presisi dengan total pengeluaran di tengah cincin, disusul kartu *Top Spending* dan saran hemat yang bersih.
  4. Pengguna beralih ke tab **Akun & Sync**. Form login cloud tampil bertumpuk (*stacked*) dengan tombol biru yang utuh dan mudah ditekan tanpa elemen yang terpotong.
- **UI/UX States**:
  - **Empty State**: Menampilkan pesan sambutan terpusat dan tombol saran *chips* pengetikan.
  - **Active Stream State**: Area footer hanya berisi *Floating Pill Input Bar* dan tombol kirim.

### Data & API Models (if applicable)
- *Tidak ada perubahan pada skema database Supabase atau entitas transaksi core (`Transaction`). Seluruh peningkatan UI/UX murni beroperasi di lapisan presentasi (*client-side components & CSS*).*

## 3. Constraints & Technical Considerations
- **Tech Stack**:
  - **Framework**: Next.js App Router dengan TypeScript (`src/app/`, `src/components/`).
  - **Styling**: Vanilla CSS (`src/app/globals.css`) dipadukan dengan utility kelas Tailwind CSS standar Next.js.
- **Performance & Scalability**:
  - Grafik *Sleek Ring Chart* harus dirender secara ringan menggunakan elemen native `<svg>` tanpa library pembengkak *bundle size* eksternal.

## 4. Edge Cases & Error Handling
- **EC-1 (Pesan Asisten Error/Non-Transaksi)** → **Handling**: Jika pengguna memasukkan teks ambigu sehingga asisten meminta klarifikasi nominal (aliran EC-1), balasan asisten dirender di dalam gelembung obrolan yang bersih tanpa tanda asterisk mentah.
- **EC-2 (Layar Ponsel Lebar Sempit < 360px)** → **Handling**: Pada perangkat seluler berlayar sangat sempit, form *stacked layout* pada tab Pengaturan memastikan tombol tidak pernah menabrak batas layar.

## 5. Concrete Definition of Done (Acceptance Criteria)
- [ ] **AC-1**: Given pengguna berada di tab *Chat* dan berhasil mencatat transaksi baru, when balasan asisten muncul, then balasan tersebut dirender dalam bentuk *Rich Embedded Transaction Card* tanpa ada satu pun karakter teks `**` atau `*` mentah di layar.
- [ ] **AC-2**: Given riwayat percakapan di tab *Chat* sudah berisi minimal 1 pesan, when pengguna melihat area bawah layar, then *Suggestion Chips* tidak lagi ditampilkan sehingga *Floating Pill Input Bar* terlihat lega dan tidak berdesakan dengan *Bottom Navigation*.
- [ ] **AC-3**: Given pengguna membuka tab *Laporan*, when grafik distribusi dimuat, then grafik dirender sebagai *Sleek Ring Chart* berketebalan proporsional (~14px–16px) dengan label nominal total pengeluaran tepat di tengah cincin.
- [ ] **AC-4**: Given pengguna membuka tab *Akun & Sync*, when form login cloud ditampilkan, then kotak input email dan tombol *Login & Sync* tertata secara proporsional (*stacked/full-width*) tanpa ada teks atau tombol yang terpotong di tepi kontainer, dan semua deskripsi bebas dari karakter markdown mentah.
- [ ] **AC-5**: All edge cases explicitly defined above degrade gracefully without unhandled crashes.
