# Catatan validasi SiapKerja

Validasi dilakukan pada 1 November 2026 dengan Node.js 22.14.0.

## Pemeriksaan otomatis

- `npm run check`: lulus untuk sintaks server dan JavaScript frontend.
- `npm test`: 22 pengujian lulus, tanpa kegagalan. Termasuk 15 skenario utama dan 7 subkasus error provider.
- Pengujian mencakup alur demo 7 pertanyaan dalam bahasa Indonesia dan Inggris, validasi input, format keluaran AI, batas ukuran request, pembatasan request, serta error autentikasi, kuota, model, dan timeout.
- Respons error tidak membocorkan API key atau pesan mentah provider. File `.env` tidak disajikan sebagai aset publik.

## Pengujian aplikasi

- Mode Gemini diuji dengan respons API sungguhan melalui satu sesi lengkap berisi 3 pertanyaan menggunakan jawaban contoh untuk posisi Frontend Developer.
- Pertanyaan lanjutan dan feedback mengikuti konteks jawaban sebelumnya.
- Rangkuman akhir berhasil dihasilkan setelah semua pertanyaan dijawab.
- Ekspor transkrip TXT berhasil diunduh; berkas hasil pengujian berukuran 6.194 byte.
- Riwayat latihan dapat dibuka kembali setelah halaman dimuat ulang.
- Pemeriksaan tambahan frontend memastikan riwayat rusak tidak menghapus sesi valid dan sesi contoh tidak bercampur dengan respons AI ketika mode server berubah.
- Tampilan mobile pada lebar 390 px tidak memiliki overflow horizontal. Panduan STAR dan fokus keyboard pada drawer navigasi diperiksa.

Screenshot desktop berukuran 106.602 byte dan screenshot mobile 70.058 byte; keduanya di bawah batas lampiran 1 MB. Berkas tersedia pada [dokumentasi pengumpulan](PENGUMPULAN.md).

Pengujian otomatis menggunakan generator terinjeksi untuk kasus live/error agar tidak memerlukan API key atau menghabiskan kuota. Uji Gemini sungguhan dilakukan secara terpisah melalui antarmuka aplikasi. Tidak ada API key atau data pengguna pribadi dalam test maupun dokumentasi.
