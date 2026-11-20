/* Mesin chat DME: Groq (gpt-oss-120b) -> Groq (llama-3.3-70b) -> Gemini 2.5 Flash */
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

  var MSG = {
    busy: 'Lagi rame banget, coba lagi 1 menit ya',
    nokey: 'API key belum diisi. Buka Setelan, lalu isi key Groq atau Gemini.',
    badkey: 'API key ditolak. Periksa lagi key-nya di Setelan.'
  };

  function cfg() { return window.DME_CONFIG || {}; }
  function keys() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem('dme_keys')) || {}; } catch (e) {}
    var c = cfg();
    return { groq: String(c.GROQ_API_KEY || s.groq || '').trim(), gemini: String(c.GEMINI_API_KEY || s.gemini || '').trim() };
  }
  function system(mode) { return PERSONA + '\n\n' + (MODES[mode] || MODES.trip); }

  function post(url, headers, body) {
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, cfg().TIMEOUT_MS || 20000);
    return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body), signal: ctl.signal })
      .then(function (r) {
        if (!r.ok) { var e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
        return r.json();
      })
      .finally(function () { clearTimeout(t); });
  }

  function callGroq(model, history, mode, key) {
    var c = cfg();
    var body = {
      model: model,
      messages: [{ role: 'system', content: system(mode) }].concat(history),
      temperature: 0.7,
      max_tokens: 1800
    };
    if (model.indexOf('gpt-oss') !== -1) body.reasoning_effort = 'low';
    return post((c.GROQ_BASE_URL || 'https://api.groq.com/openai/v1') + '/chat/completions',
      { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key }, body)
      .then(function (j) {
        var t = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        if (!t) { var e = new Error('empty'); e.status = 0; throw e; }
        return t;
      });
  }

  function callGemini(history, mode, key) {
    var model = cfg().GEMINI_MODEL || 'gemini-2.5-flash';
    var body = {
      systemInstruction: { parts: [{ text: system(mode) }] },
      contents: history.map(function (m) { return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }; }),
      generationConfig: { temperature: 0.7, maxOutputTokens: 1800, thinkingConfig: { thinkingBudget: 0 } }
    };
    return post('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
      { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body)
      .then(function (j) {
        var p = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
        var t = p && p.map(function (x) { return x.text || ''; }).join('');
        if (!t) { var e = new Error('empty'); e.status = 0; throw e; }
        return t;
      });
  }

  /* history: [{role:'user'|'assistant', content}] -> Promise<{text, via}> ; reject: {code, message} */
  function sendChat(history, mode) {
    var k = keys(), c = cfg(), steps = [];
    if (k.groq) {
      steps.push({ via: c.GROQ_MODEL || 'openai/gpt-oss-120b', run: function () { return callGroq(c.GROQ_MODEL || 'openai/gpt-oss-120b', history, mode, k.groq); } });
      steps.push({ via: c.GROQ_BACKUP_MODEL || 'llama-3.3-70b-versatile', run: function () { return callGroq(c.GROQ_BACKUP_MODEL || 'llama-3.3-70b-versatile', history, mode, k.groq); } });
    }
    if (k.gemini) steps.push({ via: c.GEMINI_MODEL || 'gemini-2.5-flash', run: function () { return callGemini(history, mode, k.gemini); } });
    if (!steps.length) return Promise.reject({ code: 'nokey', message: MSG.nokey });

    var errors = [];
    return steps.reduce(function (p, step) {
      return p.catch(function (prev) {
        if (prev && prev.text) return prev;   // sudah berhasil
        return step.run().then(function (t) { return { text: t, via: step.via }; })
          .catch(function (e) { errors.push(e && e.status); throw null; });
      });
    }, Promise.reject(null)).catch(function (res) {
      if (res && res.text) return res;
      var allAuth = errors.length && errors.every(function (s) { return s === 401 || s === 403; });
      throw allAuth ? { code: 'badkey', message: MSG.badkey } : { code: 'busy', message: MSG.busy };
    });
  }

  window.DME = { sendChat: sendChat, hasKeys: function () { var k = keys(); return !!(k.groq || k.gemini); } };
})();
