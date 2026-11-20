async function buildApp(prompt){
  // Nanti ini nyambung ke Supabase Edge Function.
  // Untuk sekarang, kembalikan contoh dulu. Input dari user di-escape agar aman.
  const safe = String(prompt).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<h3>Rencana untuk: ${safe}</h3><p>Ini contoh hasil rencana. Versi lengkap akan tersedia setelah AI tersambung.</p>`;
}
