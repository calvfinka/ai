(function () {
  var KEY = 'dme_chats';
  var STARTERS = {
    gunung: ['Itinerary Gunung Prau 2 hari 1 malam', 'Gunung apa yang cocok buat pemula?', 'Checklist perlengkapan naik gunung'],
    konser: ['Rencana nonton konser di Jakarta dari Bandung', 'Tips hari H festival musik', 'Hitung budget nonton konser + penginapan'],
    trip: ['Trip 3 hari di Yogyakarta budget 2 juta', 'Itinerary santai akhir pekan di Bandung', 'Patungan trip 5 orang, gimana bagi tugasnya?']
  };
  var $ = function (id) { return document.getElementById(id); };
  var chats = load(), cur = null, busy = false;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(chats.slice(0, 30))); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>'); }

  /* Markdown ringan, semua teks di-escape dulu */
  function md(t) {
    var out = [], list = null, tbl = false;
    function close() { if (list) { out.push('</' + list + '>'); list = null; } if (tbl) { out.push('</table></div>'); tbl = false; } }
    t.split('\n').forEach(function (l) {
      var m;
      if (/^\s*\|.*\|\s*$/.test(l)) {
        var cells = l.trim().replace(/^\||\|$/g, '').split('|').map(function (s) { return s.trim(); });
        if (cells.every(function (c) { return /^:?-{2,}:?$/.test(c); })) return;
        if (list) close();
        var first = !tbl;
        if (first) out.push('<div class="tbl"><table>'), tbl = true;
        var tag = first ? 'th' : 'td';
        out.push('<tr>' + cells.map(function (c) { return '<' + tag + '>' + inline(c) + '</' + tag + '>'; }).join('') + '</tr>');
        return;
      }
      if (tbl) close();
      if ((m = l.match(/^\s*#{1,4}\s+(.*)/))) { close(); out.push('<h4>' + inline(m[1]) + '</h4>'); }
      else if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push('<li>' + inline(m[1]) + '</li>'); }
      else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push('<li>' + inline(m[1]) + '</li>'); }
      else if (!l.trim()) { close(); }
      else { close(); out.push('<p>' + inline(l) + '</p>'); }
    });
    close();
    return out.join('');
  }

  function bubble(role, text, err) {
    var d = document.createElement('div');
    d.className = 'msg ' + (role === 'user' ? 'me' : 'ai') + (err ? ' err' : '');
    if (role === 'user') d.textContent = text; else d.innerHTML = md(text);
    $('msgs').appendChild(d);
    $('msgs').scrollTop = $('msgs').scrollHeight;
    return d;
  }

  function renderChat() {
    var box = $('msgs'); box.textContent = '';
    $('mode').value = cur.mode;
    if (!cur.msgs.length) {
      var w = document.createElement('div'); w.className = 'welcome';
      var h = document.createElement('h2'); h.textContent = 'Halo, aku DME.'; w.appendChild(h);
      var p = document.createElement('p'); p.textContent = 'Teman jalan buat rencanain pendakian, konser, dan trip. Mau mulai dari mana?'; w.appendChild(p);
      var row = document.createElement('div'); row.className = 'chips';
      STARTERS[cur.mode].forEach(function (s) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'card'; b.textContent = s;
        b.addEventListener('click', function () { send(s); });
        row.appendChild(b);
      });
      w.appendChild(row); box.appendChild(w);
      return;
    }
    cur.msgs.forEach(function (m) { bubble(m.r, m.t); });
  }

  function newChat(mode) {
    cur = { id: String(Date.now()), title: 'Chat baru', mode: mode || ($('mode').value || 'gunung'), msgs: [], ts: Date.now() };
    renderChat();
  }
  function persist() {
    if (!cur.msgs.length) return;
    chats = chats.filter(function (c) { return c.id !== cur.id; });
    cur.ts = Date.now();
    chats.unshift(cur); save();
  }

  async function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    busy = true; $('sendBtn').disabled = true;
    if (!cur.msgs.length) { $('msgs').textContent = ''; cur.title = text.length > 40 ? text.slice(0, 39) + '…' : text; }
    cur.msgs.push({ r: 'user', t: text }); bubble('user', text); persist();
    $('input').value = ''; autoGrow();

    var typing = document.createElement('div'); typing.className = 'msg ai typing'; typing.setAttribute('aria-label', 'DME sedang mengetik');
    typing.innerHTML = '<span></span><span></span><span></span>';
    $('msgs').appendChild(typing); $('msgs').scrollTop = $('msgs').scrollHeight;

    var history = cur.msgs.slice(-12).map(function (m) { return { role: m.r === 'user' ? 'user' : 'assistant', content: m.t }; });
    try {
      var res = await DME.sendChat(history, cur.mode);
      typing.remove();
      cur.msgs.push({ r: 'ai', t: res.text }); bubble('ai', res.text); persist();
    } catch (e) {
      typing.remove();
      bubble('ai', (e && e.message) || 'Lagi rame banget, coba lagi 1 menit ya', true);
      if (e && (e.code === 'nokey' || e.code === 'badkey')) openPanel('setPanel');
    }
    busy = false; $('sendBtn').disabled = false; $('input').focus();
  }

  function autoGrow() { var t = $('input'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; }
  $('input').addEventListener('input', autoGrow);
  $('input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(pointer:coarse)').matches) { e.preventDefault(); send(this.value); }
  });
  $('sendBtn').addEventListener('click', function () { send($('input').value); });
  $('mode').addEventListener('change', function () { cur.mode = this.value; if (cur.msgs.length) persist(); else renderChat(); });
  $('newChat').addEventListener('click', function () { newChat(); $('input').focus(); });

  /* Panel riwayat & setelan */
  function openPanel(id) { $(id).hidden = false; if (id === 'histPanel') renderHist(); if (id === 'setPanel') fillKeys(); }
  function closePanels() { $('histPanel').hidden = true; $('setPanel').hidden = true; }
  document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', closePanels); });
  document.querySelectorAll('.panel').forEach(function (p) { p.addEventListener('click', function (e) { if (e.target === p) closePanels(); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePanels(); });
  $('histBtn').addEventListener('click', function () { openPanel('histPanel'); });
  $('setBtn').addEventListener('click', function () { openPanel('setPanel'); });

  function renderHist() {
    var box = $('histList'); box.textContent = '';
    if (!chats.length) { var p = document.createElement('p'); p.className = 'empty'; p.textContent = 'Belum ada riwayat chat.'; box.appendChild(p); return; }
    chats.forEach(function (c) {
      var row = document.createElement('div'); row.className = 'hist-row';
      var b = document.createElement('button'); b.type = 'button'; b.className = 'nav-item';
      b.textContent = c.title; var s = document.createElement('small'); s.textContent = new Date(c.ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }); s.style.marginLeft = 'auto'; s.style.color = '#888'; b.appendChild(s);
      b.addEventListener('click', function () { cur = c; closePanels(); renderChat(); });
      var d = document.createElement('button'); d.type = 'button'; d.className = 'icon-btn plain'; d.setAttribute('aria-label', 'Hapus chat'); d.textContent = '✕';
      d.addEventListener('click', function () {
        chats = chats.filter(function (x) { return x.id !== c.id; }); save();
        if (cur.id === c.id) newChat(); renderHist();
      });
      row.appendChild(b); row.appendChild(d); box.appendChild(row);
    });
  }

  function fillKeys() {
    var s = {}; try { s = JSON.parse(localStorage.getItem('dme_keys')) || {}; } catch (e) {}
    $('kGroq').value = s.groq || ''; $('kGemini').value = s.gemini || ''; $('setMsg').hidden = true;
  }
  $('saveKeys').addEventListener('click', function () {
    var m = $('setMsg');
    try { localStorage.setItem('dme_keys', JSON.stringify({ groq: $('kGroq').value.trim(), gemini: $('kGemini').value.trim() })); m.textContent = 'Tersimpan.'; m.className = 'auth-msg'; }
    catch (e) { m.textContent = 'Gagal menyimpan. Nonaktifkan mode privat lalu coba lagi.'; m.className = 'auth-msg error'; }
    m.hidden = false;
  });

  /* Mulai: dari ?id=, dari beranda (pending), atau chat baru */
  var params = new URLSearchParams(location.search), id = params.get('id'), pending = null;
  try { pending = JSON.parse(sessionStorage.getItem('dme_pending')); sessionStorage.removeItem('dme_pending'); } catch (e) {}
  var found = id && chats.filter(function (c) { return c.id === id; })[0];
  if (found) { cur = found; renderChat(); }
  else if (pending && pending.text) { newChat(['gunung', 'konser', 'trip'].indexOf(pending.kind) > -1 ? pending.kind : 'trip'); send(pending.text); }
  else newChat('gunung');
})();
