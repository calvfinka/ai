# Upgrade: AI terhubung ke event nyata GWM (21 Nov 2026)

Sebelumnya AI hanya menjawab generik (dilarang mengarang jadwal/harga, tapi tidak punya datanya). Sekarang Worker mengambil
`https://gowithdme.com/data/events.json` (cache 10 menit di Worker + 1 jam di edge Cloudflare), memilih maksimal 6 event upcoming yang paling
relevan dengan pesan pengguna (kota, judul, gunung, artis, bulan; kata umum seperti "gunung/konser" hanya +1), lalu menyisipkannya ke prompt
sistem sebagai DATA. AI diminta merekomendasikan dari daftar itu dengan tautan `gowithdme.com/id/e/<slug>?utm_source=ai`.

| Berkas | Perubahan |
|---|---|
| `worker/worker.js` | `loadEvents`, `pickEvents`, `eventContext`, `wibToday`; konteks ditambahkan ke prompt; gagal ambil data = tetap menjawab seperti sebelumnya |
| `assets/js/app.js` | Tautan Markdown `[teks](https://gowithdme.com/...)` dirender sebagai tautan (hanya domain itu, karakter URL dibatasi, tab baru) |
| `assets/css/style.css` | Gaya `.md a` |
| `package.json`, `tests/` | 9 tes (ranking pakai data event asli, event lewat tidak masuk, bulan, input aneh, integrasi Worker dengan fetch tiruan) |

Deploy: `cd worker && bash deploy.sh` (secret sudah ada; kosongkan lalu Enter saat diminta GROQ/GEMINI), lalu commit dan push situs `ai`.
Ukur dampak: di analitik situs utama, lihat kunjungan dengan `utm_source=ai`.
