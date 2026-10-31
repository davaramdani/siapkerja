# Panduan pengumpulan SiapKerja

Dokumen ini menyiapkan isi form final project. URL GitHub dan screenshot harus diisi dengan hasil project yang benar-benar sudah dipublikasikan dan dijalankan.

## Jawaban untuk form

### Nama project

SiapKerja - Chatbot Latihan Interview Berbasis AI

### Siapa target pengguna chatbot Anda?

Mahasiswa, fresh graduate, dan pencari kerja yang ingin berlatih interview HR maupun teknis sebelum melamar pekerjaan.

### Bagaimana chatbot Anda dapat membantu pengguna?

SiapKerja menyediakan simulasi interview sesuai posisi yang dilamar, tingkat pengalaman, dan bahasa pilihan pengguna. Chatbot mengajukan pertanyaan satu per satu, memberi umpan balik tentang struktur, relevansi, serta kejelasan jawaban, lalu menyusun rangkuman saran perbaikan. Pengguna juga dapat mempelajari metode STAR, membuka kembali riwayat latihan, dan mengunduh transkrip untuk mengevaluasi perkembangan mereka.

### Link GitHub

Repository tujuan project: [davaramdani/siapkerja](https://github.com/davaramdani/siapkerja).

Salin URL repository tersebut ke kolom Link GitHub pada form pengumpulan.

### UI (User Interface) chatbot

Unggah screenshot aplikasi yang sedang berjalan. Berdasarkan form yang diberikan, file dapat berupa gambar atau PDF dengan ukuran maksimal **1 MB**. Pilih satu screenshot yang menunjukkan nama SiapKerja, pengaturan latihan, dan percakapan.

Kedua screenshot sudah tersedia dan berukuran di bawah batas 1 MB. Form meminta satu lampiran; gunakan versi desktop sebagai lampiran utama.

- [Screenshot desktop](screenshots/siapkerja-desktop.jpg), sekitar **107 KB**. Tampilan menunjukkan umpan balik Gemini dan pertanyaan lanjutan dari sesi latihan.
- [Screenshot mobile](screenshots/siapkerja-mobile.jpg), sekitar **70 KB**, untuk dokumentasi tambahan.

Gunakan screenshot mode Gemini untuk memperlihatkan hasil AI sungguhan. Jika yang ditampilkan mode demo, pastikan label demo terlihat; responsnya merupakan contoh alur latihan.

## Memublikasikan salinan project ke GitHub

1. Buat repository baru yang kosong di akun GitHub Anda, misalnya `siapkerja`.
2. Pastikan `.gitignore` mengecualikan `.env` dan `node_modules/`.
3. Di terminal dalam folder project, jalankan perintah berikut. Ganti `USERNAME_GITHUB` dengan username GitHub Anda sebelum menjalankan perintah `git remote add`.

```powershell
git init
git status
git add .
git diff --cached --stat
git commit -m "Build SiapKerja AI interview chatbot"
git branch -M main
git remote add origin https://github.com/USERNAME_GITHUB/siapkerja.git
git push -u origin main
```

Sebelum `git commit`, periksa daftar file yang disiapkan dan pastikan `.env` tidak tercantum. Jika Git meminta identitas atau login GitHub, lengkapi sesuai akun Anda. Langkah ini adalah panduan; repository belum dianggap terpublikasi sampai `git push` berhasil.

Jika folder sudah memiliki repository dan remote `origin`, periksa dengan `git remote -v` dan gunakan remote yang sesuai, tanpa mengulang `git remote add origin`.

Setelah berhasil, buka repository melalui browser. Pastikan README, kode backend, folder `public/`, `.env.example`, dan `package.json` dapat dilihat. Salin URL repository dari browser ke form.

## Contoh alur demonstrasi

1. Jalankan `npm start` dan buka `http://127.0.0.1:3000`.
2. Periksa label mode pada aplikasi. Mode Gemini aktif otomatis jika API key sudah dikonfigurasi; tanpa key, aplikasi menggunakan mode demo.
3. Buat sesi `Frontend Developer`, pengalaman `Fresh graduate`, interview `HR`, bahasa `Indonesia`, dan `3 pertanyaan`.
4. Jawab satu pertanyaan dengan contoh pengalaman kuliah atau proyek pribadi, lalu tunjukkan umpan balik.
5. Selesaikan sesi untuk memperlihatkan laporan, unduh transkrip TXT, lalu tunjukkan riwayat sesi.
6. Ambil screenshot yang jelas dan pastikan ukuran lampiran tidak melebihi 1 MB.

## Kaitan dengan materi

- Materi sesi 2: inisialisasi Gemini API dan menghasilkan teks dari input.
- Materi sesi 3: backend Node.js + Express, frontend HTML/CSS/JavaScript, komunikasi melalui `fetch`, riwayat percakapan, system instruction, serta konfigurasi parameter.
- Personalisasi project: domain latihan interview, pilihan posisi/pengalaman/bahasa, umpan balik bertahap, laporan, panduan STAR, riwayat browser, dan ekspor transkrip.

Project menggunakan `systemInstruction` untuk menetapkan peran pelatih interview dan konfigurasi `temperature: 0.7`, `topP: 0.9`. Mode Gemini menghasilkan respons melalui API; mode demo menyajikan contoh tanpa evaluasi AI. Saran latihan tidak menjamin hasil seleksi kerja.

Handout Final Project menyebut batas pengumpulan **H+2 Sesi 5 pukul 23.59 WIB**. Gunakan tanggal pelaksanaan Sesi 5 dari kelas Anda untuk menentukan tanggal kalender yang tepat.
