/* GoWithDME AI — Cloudflare Worker (proxy aman untuk API key)
   Secret yang harus diisi di Cloudflare:  GROQ_API_KEY  dan/atau  GEMINI_API_KEY
   Variabel opsional (teks biasa): ALLOWED_ORIGINS (pisahkan dengan koma)  */

const DEFAULT_ORIGINS = ['https://ai.gowithdme.com'];

const PERSONA =
  'Kamu adalah DME, "Teman Jalan GoWithDME": asisten perencana perjalanan untuk pendaki, penonton konser, dan traveler di Indonesia.\n' +
  'Gaya bicara: bahasa Indonesia santai seperti teman (pakai "aku" dan "kamu"), singkat, langsung ke inti, hangat tapi tetap profesional. Hindari bahasa kaku dan jargon.\n' +
  'Batasan: jangan genit, jangan merayu, jangan pakai panggilan sayang, jangan berperan sebagai pacar atau pasangan, jangan bahas hal seksual. Jika diminta, tolak dengan ramah dalam satu kalimat lalu arahkan kembali ke rencana perjalanan. Tetap di topik gunung, konser, dan trip; untuk topik lain jawab singkat lalu arahkan kembali.\n' +
  'Aturan isi: jangan mengarang harga tiket, jadwal event, kuota, atau aturan terbaru. Sebut sebagai perkiraan dan sarankan cek sumber resmi (pengelola basecamp, situs resmi, penyelenggara). ' +
  'Itinerary disusun per hari atau per jam, lengkap dengan estimasi biaya kasar, perlengkapan, dan titik kumpul. ' +
  'Format: Markdown ringan (judul pendek, bullet, tabel kecil bila perlu). Jika info penting belum ada (tanggal, jumlah orang, budget, titik berangkat), tanyakan maksimal dua hal di akhir jawaban.';

const MODES = {
  gunung: 'Mode: Gunung. Fokus pendakian di Indonesia. Selalu sertakan estimasi waktu jalur, perizinan atau booking lewat pengelola resmi, cek cuaca dan status gunung (BMKG/PVMBG), perlengkapan, dan keselamatan (jangan naik sendirian, kondisi fisik, batas jam turun). Untuk pemula, sarankan gunung sesuai level.',
  konser: 'Mode: Konser. Fokus nonton konser atau festival: transportasi pulang-pergi, penginapan dekat venue, jadwal hari H (buka gerbang, antre, pulang), budget, barang yang boleh dibawa (cek aturan penyelenggara), dan beli tiket hanya lewat penjual resmi.',
  trip: 'Mode: Trip Santai. Fokus trip ringan: itinerary tidak padat, tempat makan dan istirahat, transportasi, budget, dan rencana cadangan kalau hujan.'
};

const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_BACKUP = 'llama-3.3-70b-versatile';
const GEMINI_MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 20000;
const MAX_MSGS = 12;
const MAX_CHARS = 4000;
const RATE_LIMIT = 20;          // permintaan per menit per IP (per instance Worker)

const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > RATE_LIMIT;
}

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}
function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, origin ? cors(origin) : {})
  });
}

async function post(url, headers, body) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctl.signal });
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
    return await r.json();
  } finally { clearTimeout(timer); }
}

async function callGroq(model, history, system, key) {
  const body = {
    model,
    messages: [{ role: 'system', content: system }, ...history],
    temperature: 0.7,
    max_tokens: 1800
  };
  if (model.includes('gpt-oss')) body.reasoning_effort = 'low';
  const j = await post('https://api.groq.com/openai/v1/chat/completions',
    { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key }, body);
  const t = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  if (!t) { const e = new Error('empty'); e.status = 0; throw e; }
  return t;
}

async function callGemini(history, system, key) {
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    generationConfig: { temperature: 0.7, maxOutputTokens: 1800, thinkingConfig: { thinkingBudget: 0 } }
  };
  const j = await post('https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent',
    { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body);
  const parts = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
  const t = parts && parts.map(x => x.text || '').join('');
  if (!t) { const e = new Error('empty'); e.status = 0; throw e; }
  return t;
}

function cleanHistory(h) {
  if (!Array.isArray(h)) return null;
  const out = h.slice(-MAX_MSGS)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (out.length && out[0].role !== 'user') out.shift();
  return out.length && out[out.length - 1].role === 'user' ? out : null;
}

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS ? env.ALLOWED_ORIGINS.split(',') : DEFAULT_ORIGINS).map(s => s.trim());
    const origin = request.headers.get('Origin') || '';
    const okOrigin = allowed.includes(origin);

    if (request.method === 'OPTIONS') {
      return okOrigin ? new Response(null, { status: 204, headers: cors(origin) }) : new Response(null, { status: 403 });
    }
    if (request.method !== 'POST') return json({ code: 'method', message: 'Gunakan POST.' }, 405, okOrigin ? origin : null);
    if (!okOrigin) return json({ code: 'origin', message: 'Origin tidak diizinkan.' }, 403, null);

    const ip = request.headers.get('CF-Connecting-IP') || 'x';
    if (limited(ip)) return json({ code: 'rate', message: 'Terlalu banyak permintaan. Tunggu sebentar ya.' }, 429, origin);

    let data;
    try { data = await request.json(); } catch (e) { return json({ code: 'bad', message: 'Permintaan tidak valid.' }, 400, origin); }
    const history = cleanHistory(data && data.history);
    if (!history) return json({ code: 'bad', message: 'Pesan tidak valid.' }, 400, origin);
    const system = PERSONA + '\n\n' + (MODES[data.mode] || MODES.trip);

    const steps = [];
    if (env.GROQ_API_KEY) {
      steps.push(() => callGroq(GROQ_MODEL, history, system, env.GROQ_API_KEY));
      steps.push(() => callGroq(GROQ_BACKUP, history, system, env.GROQ_API_KEY));
    }
    if (env.GEMINI_API_KEY) steps.push(() => callGemini(history, system, env.GEMINI_API_KEY));
    if (!steps.length) return json({ code: 'server', message: 'Server AI belum dikonfigurasi.' }, 500, origin);

    const statuses = [];
    for (const run of steps) {
      try { return json({ text: await run() }, 200, origin); }
      catch (e) { statuses.push(e && e.status); }
    }
    const allAuth = statuses.every(s => s === 401 || s === 403);
    return allAuth
      ? json({ code: 'server', message: 'Server AI bermasalah. Hubungi pemilik situs.' }, 502, origin)
      : json({ code: 'busy', message: 'Lagi ramai, coba lagi sebentar ya.' }, 503, origin);
  }
};
