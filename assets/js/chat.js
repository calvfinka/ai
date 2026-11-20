(function () {
  var KEY = 'dme_chats';
  var ONBOARD_KEY = 'dme_onboarded';
  var PREFS_KEY = 'dme_prefs';

  var STARTERS = {
    gunung: ['Itinerary Gunung Prau 2 hari 1 malam', 'Gunung apa yang cocok buat pemula?', 'Checklist perlengkapan naik gunung'],
    konser: ['Rencana nonton konser di Jakarta dari Bandung', 'Tips hari H festival musik', 'Hitung budget nonton konser + penginapan'],
    trip: ['Trip 3 hari di Yogyakarta budget 2 juta', 'Itinerary santai akhir pekan di Bandung', 'Patungan trip 5 orang, gimana bagi tugasnya?']
  };

  /* Kartu gunung populer untuk section Jelajahi */
  var MOUNTAINS = [
    { name: 'Gunung Prau', region: 'Jawa Tengah', elev: 2565, level: 'Pemula', levelClass: '' },
    { name: 'Gunung Papandayan', region: 'Jawa Barat', elev: 2665, level: 'Pemula', levelClass: '' },
    { name: 'Gunung Andong', region: 'Jawa Tengah', elev: 1726, level: 'Pemula', levelClass: '' },
    { name: 'Gunung Gede', region: 'Jawa Barat', elev: 2958, level: 'Menengah', levelClass: 'med' },
    { name: 'Gunung Merbabu', region: 'Jawa Tengah', elev: 3145, level: 'Menengah', levelClass: 'med' },
    { name: 'Gunung Bromo', region: 'Jawa Timur', elev: 2329, level: 'Pemula', levelClass: '' },
    { name: 'Gunung Semeru', region: 'Jawa Timur', elev: 3676, level: 'Pro', levelClass: 'hard' },
    { name: 'Gunung Rinjani', region: 'Nusa Tenggara Barat', elev: 3726, level: 'Pro', levelClass: 'hard' }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var chats = load(), cur = null, busy = false;
  var mobile = window.matchMedia('(max-width:860px)');

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(chats.slice(0, 30))); } catch (e) {} }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function md(t) {
    var out = [], list = null, tbl = false;
    function close() {
      if (list) { out.push('</' + list + '>'); list = null; }
      if (tbl) { out.push('</table></div>'); tbl = false; }
    }
    String(t || '').split('\n').forEach(function (l) {
      var m;
      if (/^\s*\|.*\|\s*$/.test(l)) {
        var cells = l.trim().replace(/^\||\|$/g, '').split('|').map(function (s) { return s.trim(); });
        if (cells.every(function (c) { return /^:?-{2,}:?$/.test(c); })) return;
        if (list) close();
        var first = !tbl;
        if (first) { out.push('<div class="tbl"><table>'); tbl = true; }
        var tag = first ? 'th' : 'td';
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

  /* ---- Ticks SVG ---- */
  function tickSvg(num) {
    if (num === 1) {
      return '<svg class="tick1" viewBox="0 0 16 14"><path class="tick-path" d="M2 7l4 4 8-8"/></svg>';
    }
    return '<svg class="tick1" viewBox="0 0 16 14"><path class="tick-path" d="M1 7l3.5 3.5 7-7"/></svg>' +
           '<svg class="tick2" viewBox="0 0 16 14"><path class="tick-path" d="M4 7l3.5 3.5 7-7"/></svg>';
  }

  function setTicks(el, state) {
    if (!el) return;
    el.className = 'ticks ' + state;
    el.innerHTML = state === 'sent' ? tickSvg(1) : tickSvg(2);
  }

  /* ---- Progress bar ---- */
  function showProgress(on) {
    var bar = $('progressBar');
    if (!bar) return;
    bar.hidden = !on;
  }

  /* ---- Bubbles ---- */
  function bubbleUser(text) {
    var wrap = document.createElement('div');
    wrap.className = 'msg me';
    var body = document.createElement('div');
    body.textContent = text;
    wrap.appendChild(body);
    var meta = document.createElement('div');
    meta.className = 'msg-meta';
    var ticks = document.createElement('span');
    ticks.className = 'ticks';
    meta.appendChild(ticks);
    wrap.appendChild(meta);
    $('msgs').appendChild(wrap);
    $('msgs').scrollTop = $('msgs').scrollHeight;
    setTicks(ticks, 'sent');
    return { wrap: wrap, ticks: ticks };
  }

  function bubbleAi(text, err) {
    var wrap = document.createElement('div');
    wrap.className = 'msg ai' + (err ? ' err' : '');
    var body = document.createElement('div');
    body.className = 'ai-body';
    if (err) body.textContent = text;
    else body.innerHTML = md(text);
    wrap.appendChild(body);
    $('msgs').appendChild(wrap);
    $('msgs').scrollTop = $('msgs').scrollHeight;
    return wrap;
  }

  /* Streaming optimasi: time-based + rAF, chunk adaptif, scroll throttled */
  var _streamRaf = 0;
  function streamText(el, fullText) {
    return new Promise(function (resolve) {
      var text = String(fullText || '');
      if (!text) {
        el.innerHTML = '';
        resolve();
        return;
      }

      /* Tokenize: kata + whitespace, pertahankan struktur */
      var tokens = text.split(/(\s+)/);
      var n = tokens.length;
      var len = text.length;

      /* Target durasi: ~28–45 cps, clamp 0.6s–6s */
      var cps = len > 1200 ? 48 : len > 500 ? 38 : 30;
      var duration = Math.min(6000, Math.max(600, (len / cps) * 1000));
      var start = 0;
      var lastPaint = 0;
      var pauseUntil = 0; /* timestamp: tahan reveal sebentar di akhir kalimat */
      var msgs = $('msgs');
      var acc = '';
      var tokenPos = 0;
      var revealed = 0;

      el.classList.add('stream-cursor');
      el.textContent = '';

      if (_streamRaf) cancelAnimationFrame(_streamRaf);

      function paint(now) {
        if (!start) start = now;

        /* Saat jeda akhir kalimat, jangan majukan progress */
        var effectiveNow = now < pauseUntil ? pauseUntil : now;
        if (now < pauseUntil) {
          /* tetap paint cursor, tapi jangan tambah token */
          _streamRaf = requestAnimationFrame(paint);
          return;
        }

        var elapsed = effectiveNow - start;
        /* kompensasi total jeda supaya durasi tetap konsisten */
        var progress = Math.min(1, elapsed / duration);
        var eased = 1 - Math.pow(1 - progress, 1.35);
        var targetChars = Math.floor(eased * len);

        var addedSentenceEnd = false;
        while (tokenPos < n && revealed < targetChars) {
          var tok = tokens[tokenPos++];
          acc += tok;
          revealed += tok.length;
          if (/[.!?]\s*$/.test(tok) || tok.indexOf('\n') !== -1) {
            addedSentenceEnd = true;
            break; /* satu token akhir-kalimat per frame, lalu jeda */
          }
        }
        if (addedSentenceEnd && progress < 1) {
          pauseUntil = now + 90; /* ~90ms napas di akhir kalimat */
        }

        /* Throttle DOM ~30fps; selalu paint di frame terakhir */
        if (progress >= 1 || now - lastPaint >= 32) {
          el.textContent = acc;
          lastPaint = now;
          if (msgs) msgs.scrollTop = msgs.scrollHeight;
        }

        if (progress < 1 || tokenPos < n) {
          if (progress >= 1 && tokenPos < n) {
            /* flush sisa token cepat */
            while (tokenPos < n) { acc += tokens[tokenPos++]; }
            el.classList.remove('stream-cursor');
            el.innerHTML = md(text);
            if (msgs) msgs.scrollTop = msgs.scrollHeight;
            _streamRaf = 0;
            resolve();
            return;
          }
          _streamRaf = requestAnimationFrame(paint);
        } else {
          el.classList.remove('stream-cursor');
          el.innerHTML = md(text);
          if (msgs) msgs.scrollTop = msgs.scrollHeight;
          _streamRaf = 0;
          resolve();
        }
      }

      _streamRaf = requestAnimationFrame(paint);
    });
  }

  /* ---- Welcome + Explore ---- */
  function renderWelcome() {
    var box = $('msgs');
    box.textContent = '';
    var w = document.createElement('div');
    w.className = 'welcome';

    var h = document.createElement('h2');
    h.textContent = "What's on the agenda today?";
    w.appendChild(h);

    var p = document.createElement('p');
    p.textContent = 'Teman jalan buat rencanain pendakian, konser, dan trip. Mau mulai dari mana?';
    w.appendChild(p);

    var row = document.createElement('div');
    row.className = 'chips';
    row.style.display = 'grid';
    row.style.gap = '10px';
    row.style.maxWidth = '520px';
    row.style.margin = '0 auto 28px';
    (STARTERS[cur.mode] || STARTERS.gunung).forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.style.width = '100%';
      b.textContent = s;
      b.addEventListener('click', function () { send(s); });
      row.appendChild(b);
    });
    w.appendChild(row);

    /* Explore mountain cards */
    var explore = document.createElement('div');
    explore.className = 'explore-section';
    var eh = document.createElement('h3');
    eh.textContent = 'Jelajahi Gunung';
    explore.appendChild(eh);
    var grid = document.createElement('div');
    grid.className = 'explore-grid';
    MOUNTAINS.forEach(function (m) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'mtn-card';
      card.innerHTML =
        '<span class="mtn-name">' + esc(m.name) + '</span>' +
        '<span class="mtn-meta">' + esc(m.region) + ' · ' + m.elev + ' mdpl</span>' +
        '<span class="mtn-level ' + m.levelClass + '">' + esc(m.level) + '</span>';
      card.addEventListener('click', function () {
        send('Ceritakan tentang ' + m.name + ' (' + m.elev + ' mdpl, ' + m.region + '). Beri info jalur, estimasi waktu, tingkat kesulitan, dan tips pendakian.');
      });
      grid.appendChild(card);
    });
    explore.appendChild(grid);
    w.appendChild(explore);

    box.appendChild(w);
  }

  function renderChat() {
    var box = $('msgs');
    box.textContent = '';
    if ($('mode')) $('mode').value = cur.mode;
    if (!cur.msgs.length) {
      renderWelcome();
      return;
    }
    cur.msgs.forEach(function (m) {
      if (m.r === 'user') bubbleUser(m.t);
      else bubbleAi(m.t);
    });
  }

  function newChat(mode) {
    cur = {
      id: String(Date.now()),
      title: 'Chat baru',
      mode: mode || ($('mode') && $('mode').value) || 'gunung',
      msgs: [],
      ts: Date.now()
    };
    renderChat();
  }

  function persist() {
    if (!cur.msgs.length) return;
    chats = chats.filter(function (c) { return c.id !== cur.id; });
    cur.ts = Date.now();
    chats.unshift(cur);
    save();
    if (window.DME_renderPlans) window.DME_renderPlans();
  }

  /* ---- Send ---- */
  async function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    busy = true;
    if ($('sendBtn')) $('sendBtn').disabled = true;
    if (typeof _streamRaf !== 'undefined' && _streamRaf) { cancelAnimationFrame(_streamRaf); _streamRaf = 0; }

    if (!cur.msgs.length) {
      $('msgs').textContent = '';
      cur.title = text.length > 40 ? text.slice(0, 39) + '…' : text;
    }

    cur.msgs.push({ r: 'user', t: text });
    var userBubble = bubbleUser(text);
    persist();
    if ($('input')) { $('input').value = ''; autoGrow(); }

    /* Typing indicator */
    var typing = document.createElement('div');
    typing.className = 'typing';
    typing.setAttribute('aria-label', 'DME sedang mengetik');
    typing.innerHTML = '<span></span><span></span><span></span>';
    $('msgs').appendChild(typing);
    $('msgs').scrollTop = $('msgs').scrollHeight;

    showProgress(true);

    /* Setelah sedikit delay, centang jadi "dibaca" */
    setTimeout(function () {
      setTicks(userBubble.ticks, 'read');
    }, 400);

    var history = cur.msgs.slice(-12).map(function (m) {
      return { role: m.r === 'user' ? 'user' : 'assistant', content: m.t };
    });

    try {
      if (typeof DME === 'undefined' || !DME.sendChat) {
        throw { code: 'busy', message: 'Modul chat belum siap. Refresh halaman.' };
      }
      var res = await DME.sendChat(history, cur.mode);
      typing.remove();
      showProgress(false);

      var aiWrap = document.createElement('div');
      aiWrap.className = 'msg ai';
      var aiBody = document.createElement('div');
      aiBody.className = 'ai-body';
      aiWrap.appendChild(aiBody);
      $('msgs').appendChild(aiWrap);

      await streamText(aiBody, res.text);

      cur.msgs.push({ r: 'ai', t: res.text });
      persist();
    } catch (e) {
      typing.remove();
      showProgress(false);
      bubbleAi((e && e.message) || 'Lagi rame banget, coba lagi 1 menit ya', true);
      if (e && (e.code === 'nokey' || e.code === 'badkey')) openPanel('setPanel');
    }

    busy = false;
    if ($('sendBtn')) $('sendBtn').disabled = false;
    if ($('input')) $('input').focus();
  }

  function autoGrow() {
    var t = $('input');
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 140) + 'px';
  }

  /* ---- Events ---- */
  if ($('input')) {
    $('input').addEventListener('input', autoGrow);
    $('input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(pointer:coarse)').matches) {
        e.preventDefault();
        send(this.value);
      }
    });
  }
  if ($('sendBtn')) $('sendBtn').addEventListener('click', function () { send($('input').value); });
  if ($('mode')) {
    $('mode').addEventListener('change', function () {
      cur.mode = this.value;
      if (cur.msgs.length) persist();
      else renderChat();
    });
  }
  if ($('newChat')) {
    $('newChat').addEventListener('click', function () {
      newChat();
      if (mobile.matches) document.body.classList.remove('open');
      if ($('input')) $('input').focus();
    });
  }

  /* Quick chips */
  document.querySelectorAll('#quickChips .chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var p = this.getAttribute('data-prompt');
      if (p) send(p);
    });
  });

  /* Panels */
  function openPanel(id) {
    var el = $(id);
    if (!el) return;
    el.hidden = false;
    if (id === 'histPanel') renderHist();
    if (id === 'setPanel') fillKeys();
  }
  function closePanels() {
    if ($('histPanel')) $('histPanel').hidden = true;
    if ($('setPanel')) $('setPanel').hidden = true;
  }
  document.querySelectorAll('[data-close]').forEach(function (b) {
    b.addEventListener('click', closePanels);
  });
  document.querySelectorAll('.panel').forEach(function (p) {
    p.addEventListener('click', function (e) { if (e.target === p) closePanels(); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closePanels(); closeOnboard(); }
  });
  if ($('histBtn')) $('histBtn').addEventListener('click', function () {
    openPanel('histPanel');
    if (mobile.matches) document.body.classList.remove('open');
  });
  if ($('setBtn')) $('setBtn').addEventListener('click', function () {
    openPanel('setPanel');
    if (mobile.matches) document.body.classList.remove('open');
  });
  if ($('libraryBtn')) {
    $('libraryBtn').addEventListener('click', function () {
      openPanel('histPanel');
    });
  }

  function renderHist() {
    var box = $('histList');
    if (!box) return;
    box.textContent = '';
    if (!chats.length) {
      var p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'Belum ada riwayat chat.';
      box.appendChild(p);
      return;
    }
    chats.forEach(function (c) {
      var row = document.createElement('div');
      row.className = 'hist-row';
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nav-item';
      b.textContent = c.title;
      var s = document.createElement('small');
      s.textContent = new Date(c.ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      s.style.marginLeft = 'auto';
      s.style.color = 'var(--text-dim)';
      b.appendChild(s);
      b.addEventListener('click', function () {
        cur = c;
        closePanels();
        renderChat();
      });
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'icon-btn plain';
      d.setAttribute('aria-label', 'Hapus chat');
      d.innerHTML = '<svg class="ic"><use href="#i-x"/></svg>';
      d.addEventListener('click', function () {
        chats = chats.filter(function (x) { return x.id !== c.id; });
        save();
        if (cur && cur.id === c.id) newChat();
        renderHist();
        if (window.DME_renderPlans) window.DME_renderPlans();
      });
      row.appendChild(b);
      row.appendChild(d);
      box.appendChild(row);
    });
  }

  function fillKeys() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem('dme_keys')) || {}; } catch (e) {}
    if ($('kGroq')) $('kGroq').value = s.groq || '';
    if ($('kGemini')) $('kGemini').value = s.gemini || '';
    if ($('setMsg')) $('setMsg').hidden = true;
  }
  if ($('saveKeys')) {
    $('saveKeys').addEventListener('click', function () {
      var m = $('setMsg');
      try {
        localStorage.setItem('dme_keys', JSON.stringify({
          groq: ($('kGroq') && $('kGroq').value.trim()) || '',
          gemini: ($('kGemini') && $('kGemini').value.trim()) || ''
        }));
        if (m) { m.textContent = 'Tersimpan.'; m.className = 'auth-msg'; m.hidden = false; }
      } catch (e) {
        if (m) { m.textContent = 'Gagal menyimpan. Nonaktifkan mode privat lalu coba lagi.'; m.className = 'auth-msg error'; m.hidden = false; }
      }
    });
  }

  /* ---- Onboarding ---- */
  var onboardState = { step: 1, level: null, regions: [], style: null };

  function isOnboarded() {
    try { return localStorage.getItem(ONBOARD_KEY) === '1'; } catch (e) { return false; }
  }
  function markOnboarded() {
    try { localStorage.setItem(ONBOARD_KEY, '1'); } catch (e) {}
  }
  function savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({
        level: onboardState.level,
        regions: onboardState.regions.slice(0, 3),
        style: onboardState.style
      }));
    } catch (e) {}
  }

  function showOnboard() {
    var el = $('onboard');
    if (!el) return;
    el.hidden = false;
    onboardState = { step: 1, level: null, regions: [], style: null };
    goStep(1);
  }
  function closeOnboard() {
    var el = $('onboard');
    if (el) el.hidden = true;
  }

  function goStep(n) {
    onboardState.step = n;
    document.querySelectorAll('.onboard-step').forEach(function (s) {
      s.hidden = parseInt(s.getAttribute('data-step'), 10) !== n;
    });
    document.querySelectorAll('.onboard-progress .dot').forEach(function (d) {
      d.classList.toggle('active', parseInt(d.getAttribute('data-step'), 10) <= n);
    });
    var nextBtn = $('nextOnboard');
    var startBtn = $('startExplore');
    if (nextBtn) nextBtn.hidden = n === 3;
    if (n === 1) {
      /* level select via cards */
    } else if (n === 2) {
      if (nextBtn) {
        nextBtn.hidden = false;
        nextBtn.disabled = onboardState.regions.length === 0;
      }
    } else if (n === 3) {
      if (startBtn) startBtn.disabled = !onboardState.style;
    }
  }

  /* Step 1: level */
  document.querySelectorAll('.option-card[data-level]').forEach(function (card) {
    card.addEventListener('click', function () {
      document.querySelectorAll('.option-card[data-level]').forEach(function (c) { c.classList.remove('selected'); });
      card.classList.add('selected');
      onboardState.level = card.getAttribute('data-level');
      setTimeout(function () { goStep(2); }, 250);
    });
  });

  /* Step 2: regions (multi) */
  document.querySelectorAll('.option-card[data-region]').forEach(function (card) {
    card.addEventListener('click', function () {
      var r = card.getAttribute('data-region');
      var idx = onboardState.regions.indexOf(r);
      if (idx >= 0) {
        onboardState.regions.splice(idx, 1);
        card.classList.remove('selected');
      } else {
        if (onboardState.regions.length >= 3) return;
        onboardState.regions.push(r);
        card.classList.add('selected');
      }
      var nextBtn = $('nextOnboard');
      if (nextBtn) nextBtn.disabled = onboardState.regions.length === 0;
    });
  });
  if ($('nextOnboard')) {
    $('nextOnboard').addEventListener('click', function () {
      if (onboardState.step === 2 && onboardState.regions.length) goStep(3);
    });
  }

  /* Step 3: style */
  document.querySelectorAll('.option-card[data-style]').forEach(function (card) {
    card.addEventListener('click', function () {
      document.querySelectorAll('.option-card[data-style]').forEach(function (c) { c.classList.remove('selected'); });
      card.classList.add('selected');
      onboardState.style = card.getAttribute('data-style');
      if ($('startExplore')) $('startExplore').disabled = false;
    });
  });

  if ($('startExplore')) {
    $('startExplore').addEventListener('click', function () {
      savePrefs();
      markOnboarded();
      closeOnboard();
      if ($('input')) $('input').focus();
    });
  }
  if ($('skipOnboard')) {
    $('skipOnboard').addEventListener('click', function () {
      markOnboarded();
      closeOnboard();
    });
  }
  if ($('redoOnboard')) {
    $('redoOnboard').addEventListener('click', function () {
      closePanels();
      try { localStorage.removeItem(ONBOARD_KEY); } catch (e) {}
      showOnboard();
    });
  }

  /* ---- Boot ---- */
  var params = new URLSearchParams(location.search);
  var id = params.get('id');
  var pending = null;
  try {
    pending = JSON.parse(sessionStorage.getItem('dme_pending'));
    sessionStorage.removeItem('dme_pending');
  } catch (e) {}

  var found = id && chats.filter(function (c) { return c.id === id; })[0];
  if (found) {
    cur = found;
    renderChat();
  } else if (pending && pending.text) {
    newChat(['gunung', 'konser', 'trip'].indexOf(pending.kind) > -1 ? pending.kind : 'trip');
    send(pending.text);
  } else {
    newChat('gunung');
  }

  if (!isOnboarded()) {
    setTimeout(showOnboard, 400);
  }
})();
