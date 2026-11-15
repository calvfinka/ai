# Djurnal.id (Indonesia + English)

Situs statis dua bahasa tanpa build tool / Bilingual static site, no build tools.

## Struktur / Structure
- Indonesia di root: `index.html`, `artikel/`, `alat/`, `tentang/`, `kontak/`, `kebijakan-privasi/`, `disclaimer/`
- English in `en/`: `en/index.html`, `en/articles/`, `en/tools/`, `en/about/`, `en/contact/`, `en/privacy-policy/`, `en/disclaimer/`
- `assets/` dipakai bersama / shared: `css/style.css`, `js/main.js`, `js/tools.js` (teks alat dari `window.T` di tiap halaman)
- `404.html` (dua bahasa), `sitemap.xml` (dengan hreflang), `robots.txt`, `CNAME`

## Deploy (GitHub Pages)
1. Buat repo dan unggah semua isi folder. / Create a repo and upload everything.
2. Settings > Pages > Deploy from branch > `main` / root.
3. DNS: A record ke 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153, lalu isi custom domain `djurnal.id` (cek dokumentasi GitHub untuk nilai terbaru).

## Menambah artikel / Adding an article
1. Salin folder artikel Indonesia dan Inggris, ganti nama folder, edit isi, `<title>`, deskripsi, JSON-LD.
2. Pastikan tag `hreflang` saling menunjuk. Jika artikel hanya satu bahasa, hapus tag `alternate` dan tombol bahasa di halaman itu.
3. Tambahkan kartu di halaman daftar dan URL di `sitemap.xml`.

## Ganti sebelum publikasi / Change before publishing
- Email `halo@djurnal.id` (kontak / contact)
- Kebijakan privasi dan disclaimer: templat dasar, konsultasikan ke ahli hukum
