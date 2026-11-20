/* ============================================================
   PENGATURAN AI GoWithDME  —  isi API key kamu di file ini
   ------------------------------------------------------------
   Cukup isi salah satu (Groq atau Gemini). Kalau dua-duanya
   diisi, Groq dipakai dulu, Gemini jadi cadangan.

   Catatan: situs ini statis (GitHub Pages), jadi isi file ini
   bisa dilihat siapa saja yang membuka situsnya. Untuk dipakai
   publik, sebaiknya pakai proxy server agar key tidak terbuka.
   ============================================================ */
window.DME_CONFIG = {
  GROQ_API_KEY: '',      // contoh: 'gsk_xxxxxxxx'
  GEMINI_API_KEY: '',    // contoh: 'AIzaxxxxxxxx'

  GROQ_MODEL: 'openai/gpt-oss-120b',
  GROQ_BACKUP_MODEL: 'llama-3.3-70b-versatile',
  GEMINI_MODEL: 'gemini-2.5-flash',

  TIMEOUT_MS: 20000      // lewat batas ini -> pindah ke model cadangan
};
