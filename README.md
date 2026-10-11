# Aturlah Porsi Makanmu

Aplikasi web pemantau gizi dan kalori harian presisi berbasis analisis visual makanan piring menggunakan Gemini Vision API.

## Fitur Utama

1. **Autentikasi Akun Demo & Pendaftaran Baru**
   - Akun Admin bawaan:
     - Nama Akun: `Shukoh#Dev`
     - Kata Sandi: `FAFA17052007`
   - Tombol satu klik "Gunakan Akun Ini" untuk pengujian instan.
   - Pendaftaran akun baru dengan nama dan kata sandi.

2. **Formulir Profil Gizi & Perhitungan Metabolisme**
   - Menghitung Angka Metabolisme Basal (BMR) menggunakan formula Mifflin-St Jeor:
     - Laki-laki: (10 * BB) + (6.25 * TB) - (5 * Usia) + 5
     - Perempuan: (10 * BB) + (6.25 * TB) - (5 * Usia) - 161
   - Menghitung Total Daily Energy Expenditure (TDEE) berdasarkan faktor aktivitas fisik.
   - Pilihan tujuan:
     - Menurunkan berat badan (dengan target berat badan kg)
     - Menaikkan berat badan (dengan target berat badan kg)
     - Mempertahankan berat badan (menggunakan berat badan saat ini)
   - Penentuan kuota harian: Kalori, Protein (2.0g/kg), Lemak, Karbohidrat, Serat Pangan, dan batas aman Gula.

3. **Dashboard Pemantau Kuota & Riwayat Makanan**
   - Ringkasan sisa kuota kalori dan makronutrisi harian secara otomatis.
   - Pengelompokan riwayat makanan berdasarkan waktu makan:
     - Sarapan Pagi
     - Makan Siang
     - Makan Malam
     - Camilan dan Lainnya

4. **Kamera 1080p & Unggah Galeri**
   - Kamera langsung via WebRTC dengan resolusi proporsional maksimal 1080p (JPEG/WebP).
   - Opsi unggah foto langsung dari penyimpanan perangkat.

5. **Fase Konfirmasi Kualitas Foto**
   - Pratinjau gambar sebelum dianalisis untuk memastikan foto tidak blur, pencahayaan cukup, dan makanan tampak jelas.
   - Pemilihan kategori waktu makan.
   - Pilihan ambil ulang atau lanjut analisis.

6. **Analisis Gemini Vision API & Koreksi Manual**
   - Pemanggilan model Gemini Vision dengan skema JSON terstruktur ketat.
   - Kartu rincian komponen makanan di piring (nama, gramasi, kalori, protein, lemak, karbohidrat, gula, serat).
   - Pengguna bebas mengoreksi angka gramasi (nutrisi terhitung ulang secara proporsional).
   - Opsi tambah bahan manual (minyak, saus, bumbu tersembunyi).
   - Konfirmasi simpan yang otomatis mengurangi sisa kuota di dashboard.

7. **Kepatuhan Desain**
   - Tanpa warna gradasi (menggunakan palet warna solid bersih).
   - Tanpa informasi yang terlalu padat (ruang spasi lega dan teratur).
   - Bebas tanda baca emdash.
   - Bebas emoji.
   - Tampilan bersih, profesional, dan alami.

## Cara Menjalankan

1. Masuk ke direktori:
   ```bash
   cd "c:/projek vscode/aturlah porsi makanmu"
   ```

2. Jalankan server:
   ```bash
   npm start
   ```

3. Buka browser:
   ```
   http://localhost:3000
   ```

4. Konfigurasi Gemini API Key:
   - Masukkan kunci API di file `.env` (`GEMINI_API_KEY=kunci_anda`), atau
   - Klik tombol "Pengaturan" di bilah navigasi website untuk memasukkan langsung dari browser.
   - Jika belum memasukkan kunci API, sistem otomatis menjalankan mode simulasi cerdas agar seluruh alur aplikasi tetap dapat diuji.
