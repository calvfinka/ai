/* Pengaturan AI GoWithDME.
   PENTING: GitHub Pages itu situs statis. Key apa pun yang kamu tulis di file ini
   bisa dilihat semua orang. Jangan commit key asli.
   Cara aman untuk saat ini: biarkan kosong, lalu isi key lewat tombol "Setelan" di chat.html
   (disimpan hanya di browser kamu). Untuk dipakai publik, pakai proxy server (Supabase Edge Function). */
window.DME_CONFIG = {
  GROQ_API_KEY: '',     // contoh: 'gsk_...' (jangan commit)
  GEMINI_API_KEY: '',   // contoh: 'AIza...' (jangan commit)

  GROQ_BASE_URL: 'https://api.groq.com/openai/v1',
  GROQ_MODEL: 'openai/gpt-oss-120b',
  GROQ_BACKUP_MODEL: 'llama-3.3-70b-versatile',
  GEMINI_MODEL: 'gemini-2.5-flash',

  TIMEOUT_MS: 20000     // dianggap lambat -> pindah ke model cadangan
};
