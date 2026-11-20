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

  var ICON_SPARK = '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></svg>';
  var ICON_COPY = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>';
  var ICON_ALERT = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 16h.01"/></svg>';
  var ICON_RETRY = '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></svg>';

  /* Centang: sent = 1 centang abu, read = 2 centang beraksen, failed = tanda seru */
  function tickHtml() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path class="t1" pathLength="1" d="M3.5 12.8l4.4 4.4L16 8.6"/>' +
      '<path class="t2" pathLength="1" d="M10.6 16.4l.8.8L20.5 8.6"/></svg>';
  }
  var STATE_LABEL = { sent: 'Terkirim', read: 'Sudah dibalas', failed: 'Gagal terkirim' };
  function setTicks(el, state) {
    if (!el) return;
    el.className = 'ticks ' + state;
    el.title = STATE_LABEL[state] || '';
    el.setAttribute('aria-label', STATE_LABEL[state] || '');
  }
  function fmtTime(ts) {
    return ts ? new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.') : '';
  }

  function addMsg(role, text, opts) {
    opts = opts || {};
    var row = document.createElement('div');
    row.className = 'row ' + role + (opts.error ? ' err' : '');
    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    var meta = document.createElement('div');
    meta.className = 'meta';
    var out = { row: row, bubble: bubble };

    if (role === 'user') {
      bubble.textContent = text;
      var time = document.createElement('span');
      time.className = 'time';
      time.textContent = fmtTime(opts.ts);
      var ticks = document.createElement('span');
      ticks.innerHTML = tickHtml();
      setTicks(ticks, opts.state || 'sent');
      meta.appendChild(time);
      meta.appendChild(ticks);
      row.appendChild(bubble);
      row.appendChild(meta);
      out.ticks = ticks;
    } else {
      var av = document.createElement('div');
      av.className = 'avatar';
      av.innerHTML = ICON_SPARK;
      var col = document.createElement('div');
      col.className = 'col';
      if (opts.error) bubble.textContent = text;
      else { bubble.classList.add('md'); bubble.innerHTML = md(text); }
      col.appendChild(bubble);
      if (!opts.error) {
        var copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'meta-btn';
        copy.innerHTML = ICON_COPY + '<span>Salin</span>';
        copy.addEventListener('click', function () {
          var done = function () {
            copy.querySelector('span').textContent = 'Tersalin';
            setTimeout(function () { copy.querySelector('span').textContent = 'Salin'; }, 1500);
          };
          if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
        });
        if (opts.ts) {
          var t = document.createElement('span');
          t.className = 'time';
          t.textContent = fmtTime(opts.ts);
          meta.appendChild(t);
        }
        meta.appendChild(copy);
        col.appendChild(meta);
      }
      row.appendChild(av);
      row.appendChild(col);
    }
    $('msgs').appendChild(row);
    scrollDown();
    return out;
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
    var modes = ['gunung', 'konser', 'trip'];
    $('modes').dataset.i = Math.max(0, modes.indexOf(cur.mode));
    document.querySelectorAll('#modes button').forEach(function (b) {
      b.setAttribute('aria-selected', b.dataset.mode === cur.mode);
    });
    if (!cur.msgs.length) return renderEmpty();
    cur.msgs.forEach(function (m, i) {
      if (m.r === 'user') {
        var next = cur.msgs[i + 1];
        addMsg('user', m.t, { ts: m.ts, state: next && next.r === 'ai' ? 'read' : 'sent' });
      } else addMsg('ai', m.t, { ts: m.ts });
    });
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
    var now = Date.now();
    cur.msgs.push({ r: 'user', t: text, ts: now });
    var u = addMsg('user', text, { ts: now, state: 'sent' });
    persist();
    $('input').value = '';
    grow();

    var typing = document.createElement('div');
    typing.className = 'row ai typing-row';
    typing.innerHTML = '<div class="avatar">' + ICON_SPARK + '</div><div class="typing"><span></span><span></span><span></span></div>';
    $('msgs').appendChild(typing);
    scrollDown();

    var history = cur.msgs.slice(-12).map(function (m) {
      return { role: m.r === 'user' ? 'user' : 'assistant', content: m.t };
    });

    try {
      var res = await DME.sendChat(history, cur.mode);
      typing.remove();
      setTicks(u.ticks, 'read');
      var at = Date.now();
      addMsg('ai', res.text, { ts: at });
      cur.msgs.push({ r: 'ai', t: res.text, ts: at });
      persist();
    } catch (e) {
      typing.remove();
      setTicks(u.ticks, 'failed');
      var er = addMsg('ai', (e && e.message) || 'Terjadi kesalahan. Coba lagi.', { error: true });
      var retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'meta-btn retry';
      retry.innerHTML = ICON_RETRY + '<span>Coba lagi</span>';
      retry.addEventListener('click', function () {
        if (busy) return;
        cur.msgs.pop();
        persist();
        u.row.remove();
        er.row.remove();
        send(text);
      });
      er.row.querySelector('.col').appendChild(retry);
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
