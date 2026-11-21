/* Pengaturan AI GoWithDME
   File ini AMAN di-commit: tidak berisi API key.
   Key Groq/Gemini disimpan sebagai secret di Cloudflare Worker (lihat folder worker/). */
window.DME_CONFIG = {
  // Alamat Worker (tanpa "/" di akhir)
  API_URL: 'https://dme-ai.calvfinka.workers.dev'
};
