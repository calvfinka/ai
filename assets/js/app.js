(function () {
  var STORE = 'dme_chats';
  var MODE_NAMES = { gunung: 'Gunung', konser: 'Konser', trip: 'Trip' };
  var STARTERS = {
    gunung: ['Itinerary Gunung Prau 2 hari 1 malam', 'Gunung apa yang cocok untuk pemula?', 'Checklist perlengkapan naik gunung'],
    konser: ['Rencana nonton konser di Jakarta dari Bandung', 'Tips hari H festival musik', 'Hitung budget konser + penginapan'],
    trip:   ['Trip 3 hari di Yogyakarta budget 2 juta', 'Itinerary santai akhir pekan di Bandung', 'Patungan trip 5 orang, bagi tugasnya gimana?']
  };

  var $ = function (id) { return document.getElementById(id); };
  var chats = load(), cur = null, busy = false;

  /* ---------- Penyimpanan ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; } }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(chats.slice(0, 30))); } catch (e) {} }
  function persist() {
    if (!cur.msgs.length) return;
    chats = chats.filter(function (c) { return c.id !== cur.id; });
    cur.ts = Date.now();
    chats.unshift(cur);
    save();
  }

  /* ---------- Markdown ringan ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  }
  function md(text) {
    var out = [], list = null, tbl = false;
    function close() {
      if (list) { out.push('</' + list + '>'); list = null; }
      if (tbl) { out.push('</table></div>'); tbl = false; }
    }
    String(text || '').split('\n').forEach(function (l) {
      var m;
      if (/^\s*\|.*\|\s*$/.test(l)) {
        var cells = l.trim().replace(/^\||\|$/g, '').split('|').map(function (s) { return s.trim(); });
        if (cells.every(function (c) { return /^:?-{2,}:?$/.test(c); })) return;
        if (list) close();
        var head = !tbl;
        if (head) { out.push('<div class="tbl"><table>'); tbl = true; }
        var tag = head ? 'th' : 'td';
        out.push('<tr>' + cells.map(function (c) { return '<' + tag + '>' + inline(c) + '</' + tag + '>'; }).join('') + '</tr>');
        return;
      }
      if (tbl) close();
      if ((m = l.match(/^\s*#{1,4}\s+(.*)/))) { close(); out.push('<h4>' + inline(m[1]) + '</h4>'); }
      else if ((m = l.match(/^\s*[-*•]\s+(.*)/))) {
        if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; }
        out.push('<li>' + inline(m[1]) + '</li>');
      } else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) {
        if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; }
        out.push('<li>' + inline(m[1]) + '</li>');
      } else if (!l.trim()) { close(); }
      else { close(); out.push('<p>' + inline(l) + '</p>'); }
    });
    close();
    return out.join('');
  }

  /* ---------- Tampilan ---------- */
  function scrollDown() { var m = $('msgs'); m.scrollTop = m.scrollHeight; }

  function addMsg(role, text, isError) {
    var el = document.createElement('div');
    el.className = 'msg ' + role + (isError ? ' err' : '');
    if (role === 'ai' && !isError) el.innerHTML = md(text);
    else el.textContent = text;
    $('msgs').appendChild(el);
    scrollDown();
    return el;
  }

  function renderEmpty() {
    var box = $('msgs');
    box.textContent = '';
    var w = document.createElement('div');
    w.className = 'empty';
    var h = document.createElement('h1');
    h.textContent = 'Mau rencanain apa hari ini?';
    var p = document.createElement('p');
    p.textContent = 'Pilih mode di atas, lalu tulis rencanamu atau mulai dari saran berikut.';
    w.appendChild(h);
    w.appendChild(p);
    var list = document.createElement('div');
    list.className = 'starters';
    (STARTERS[cur.mode] || STARTERS.gunung).forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = s;
      b.addEventListener('click', function () { send(s); });
      list.appendChild(b);
    });
    w.appendChild(list);
    box.appendChild(w);
  }

  function render() {
    var box = $('msgs');
    box.textContent = '';
    document.querySelectorAll('#modes button').forEach(function (b) {
      b.setAttribute('aria-selected', b.dataset.mode === cur.mode);
    });
    if (!cur.msgs.length) return renderEmpty();
    cur.msgs.forEach(function (m) { addMsg(m.r, m.t); });
  }

  function newChat(mode) {
    cur = { id: String(Date.now()), title: 'Chat baru', mode: mode || (cur && cur.mode) || 'gunung', msgs: [], ts: Date.now() };
    render();
  }

  /* ---------- Kirim pesan ---------- */
  async function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    busy = true;
    $('sendBtn').disabled = true;

    if (!cur.msgs.length) {
      $('msgs').textContent = '';
      cur.title = text.length > 40 ? text.slice(0, 39) + '…' : text;
    }
    cur.msgs.push({ r: 'user', t: text });
    addMsg('user', text);
    persist();
    $('input').value = '';
    grow();

    var typing = document.createElement('div');
    typing.className = 'typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    $('msgs').appendChild(typing);
    scrollDown();

    var history = cur.msgs.slice(-12).map(function (m) {
      return { role: m.r === 'user' ? 'user' : 'assistant', content: m.t };
    });

    try {
      var res = await DME.sendChat(history, cur.mode);
      typing.remove();
      addMsg('ai', res.text);
      cur.msgs.push({ r: 'ai', t: res.text });
      persist();
    } catch (e) {
      typing.remove();
      addMsg('ai', (e && e.message) || 'Terjadi kesalahan. Coba lagi.', true);
    }

    busy = false;
    $('sendBtn').disabled = false;
    $('input').focus();
  }

  function grow() {
    var t = $('input');
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 160) + 'px';
  }

  /* ---------- Riwayat ---------- */
  function renderHistory() {
    var box = $('histList');
    box.textContent = '';
    if (!chats.length) {
      var p = document.createElement('p');
      p.className = 'note';
      p.textContent = 'Belum ada riwayat.';
      box.appendChild(p);
      return;
    }
    chats.forEach(function (c) {
      var row = document.createElement('div');
      row.className = 'hist-row';
      var open = document.createElement('button');
      open.type = 'button';
      open.className = 'hist-open';
      var t = document.createElement('span');
      t.textContent = c.title;
      var s = document.createElement('small');
      s.textContent = MODE_NAMES[c.mode] + ' · ' + new Date(c.ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      open.appendChild(t);
      open.appendChild(s);
      open.addEventListener('click', function () { cur = c; closeDrawer(); render(); });

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn-icon';
      del.setAttribute('aria-label', 'Hapus chat');
      del.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      del.addEventListener('click', function () {
        chats = chats.filter(function (x) { return x.id !== c.id; });
        save();
        if (cur.id === c.id) newChat();
        renderHistory();
      });
      row.appendChild(open);
      row.appendChild(del);
      box.appendChild(row);
    });
  }
  function openDrawer() { renderHistory(); $('drawer').hidden = false; }
  function closeDrawer() { $('drawer').hidden = true; }

  /* ---------- Event ---------- */
  $('form').addEventListener('submit', function (e) { e.preventDefault(); send($('input').value); });
  $('input').addEventListener('input', grow);
  $('input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(pointer:coarse)').matches) {
      e.preventDefault();
      send(this.value);
    }
  });
  $('newBtn').addEventListener('click', function () { newChat(); $('input').focus(); });
  $('historyBtn').addEventListener('click', openDrawer);
  $('closeDrawer').addEventListener('click', closeDrawer);
  $('drawer').addEventListener('click', function (e) { if (e.target === this) closeDrawer(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  $('modes').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-mode]');
    if (!b) return;
    cur.mode = b.dataset.mode;
    if (cur.msgs.length) persist();
    render();
  });

  newChat('gunung');
})();
