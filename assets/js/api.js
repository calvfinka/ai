/* Mesin chat: Groq (model utama) -> Groq (cadangan) -> Gemini */
(function () {
  var PERSONA =
    'Kamu adalah DME, "Teman Jalan GoWithDME": asisten perencana perjalanan untuk pendaki, penonton konser, dan traveler di Indonesia.\n' +
    'Gaya bicara: bahasa Indonesia santai seperti teman (pakai "aku" dan "kamu"), singkat, langsung ke inti, hangat tapi tetap profesional. Hindari bahasa kaku dan jargon.\n' +
    'Batasan: jangan genit, jangan merayu, jangan pakai panggilan sayang, jangan berperan sebagai pacar atau pasangan, jangan bahas hal seksual. Jika diminta, tolak dengan ramah dalam satu kalimat lalu arahkan kembali ke rencana perjalanan. Tetap di topik gunung, konser, dan trip; untuk topik lain jawab singkat lalu arahkan kembali.\n' +
    'Aturan isi: jangan mengarang harga tiket, jadwal event, kuota, atau aturan terbaru. Sebut sebagai perkiraan dan sarankan cek sumber resmi (pengelola basecamp, situs resmi, penyelenggara). ' +
    'Itinerary disusun per hari atau per jam, lengkap dengan estimasi biaya kasar, perlengkapan, dan titik kumpul. ' +
    'Format: Markdown ringan (judul pendek, bullet, tabel kecil bila perlu). Jika info penting belum ada (tanggal, jumlah orang, budget, titik berangkat), tanyakan maksimal dua hal di akhir jawaban.';

  var MODES = {
    gunung: 'Mode: Gunung. Fokus pendakian di Indonesia. Selalu sertakan estimasi waktu jalur, perizinan atau booking lewat pengelola resmi, cek cuaca dan status gunung (BMKG/PVMBG), perlengkapan, dan keselamatan (jangan naik sendirian, kondisi fisik, batas jam turun). Untuk pemula, sarankan gunung sesuai level.',
    konser: 'Mode: Konser. Fokus nonton konser atau festival: transportasi pulang-pergi, penginapan dekat venue, jadwal hari H (buka gerbang, antre, pulang), budget, barang yang boleh dibawa (cek aturan penyelenggara), dan beli tiket hanya lewat penjual resmi.',
    trip: 'Mode: Trip Santai. Fokus trip ringan: itinerary tidak padat, tempat makan dan istirahat, transportasi, budget, dan rencana cadangan kalau hujan.'
  };

  var ERR = {
    nokey: 'API key belum diisi. Buka file config.js di root folder, isi GROQ_API_KEY atau GEMINI_API_KEY, lalu muat ulang halaman.',
    badkey: 'API key ditolak. Periksa lagi key di config.js.',
    busy: 'Lagi ramai, coba lagi sebentar ya.'
  };

  var cfg = function () { return window.DME_CONFIG || {}; };
  var clean = function (v) { return String(v || '').trim(); };

  function systemPrompt(mode) { return PERSONA + '\n\n' + (MODES[mode] || MODES.trip); }

  async function post(url, headers, body) {
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, cfg().TIMEOUT_MS || 20000);
    try {
      var r = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body), signal: ctl.signal });
      if (!r.ok) { var e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
      return await r.json();
    } finally { clearTimeout(timer); }
  }

  async function callGroq(model, history, mode, key) {
    var body = {
      model: model,
      messages: [{ role: 'system', content: systemPrompt(mode) }].concat(history),
      temperature: 0.7,
      max_tokens: 1800
    };
    if (model.indexOf('gpt-oss') !== -1) body.reasoning_effort = 'low';
    var j = await post('https://api.groq.com/openai/v1/chat/completions',
      { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key }, body);
    var t = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!t) { var e = new Error('empty'); e.status = 0; throw e; }
    return t;
  }

  async function callGemini(model, history, mode, key) {
    var body = {
      systemInstruction: { parts: [{ text: systemPrompt(mode) }] },
      contents: history.map(function (m) {
        return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
      }),
      generationConfig: { temperature: 0.7, maxOutputTokens: 1800, thinkingConfig: { thinkingBudget: 0 } }
    };
    var j = await post('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
      { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body);
    var parts = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
    var t = parts && parts.map(function (x) { return x.text || ''; }).join('');
    if (!t) { var e = new Error('empty'); e.status = 0; throw e; }
    return t;
  }

  /* history: [{role:'user'|'assistant', content}] -> {text, via}. Gagal -> {code, message} */
  async function sendChat(history, mode) {
    var c = cfg(), groq = clean(c.GROQ_API_KEY), gemini = clean(c.GEMINI_API_KEY), steps = [];

    if (groq) {
      var m1 = c.GROQ_MODEL || 'openai/gpt-oss-120b';
      var m2 = c.GROQ_BACKUP_MODEL || 'llama-3.3-70b-versatile';
      steps.push(function () { return callGroq(m1, history, mode, groq); });
      steps.push(function () { return callGroq(m2, history, mode, groq); });
    }
    if (gemini) {
      var m3 = c.GEMINI_MODEL || 'gemini-2.5-flash';
      steps.push(function () { return callGemini(m3, history, mode, gemini); });
    }
    if (!steps.length) throw { code: 'nokey', message: ERR.nokey };

    var statuses = [];
    for (var i = 0; i < steps.length; i++) {
      try { return { text: await steps[i]() }; }
      catch (e) { statuses.push(e && e.status); }
    }
    var allAuth = statuses.every(function (s) { return s === 401 || s === 403; });
    throw allAuth ? { code: 'badkey', message: ERR.badkey } : { code: 'busy', message: ERR.busy };
  }

  window.DME = { sendChat: sendChat };
})();
