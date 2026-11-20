(function () {
  var TEMPLATES = [
    { t: 'Pendakian 2 hari 1 malam', p: 'Susun rencana pendakian 2 hari 1 malam, lengkap dengan jadwal, estimasi biaya, dan perlengkapan.', k: 'gunung' },
    { t: 'Checklist perlengkapan naik gunung', p: 'Buat checklist perlengkapan pendakian untuk pemula, dikelompokkan per kategori.', k: 'gunung' },
    { t: 'Nonton konser luar kota', p: 'Rencanakan perjalanan nonton konser di luar kota: transportasi, penginapan, dan jadwal hari H.', k: 'konser' },
    { t: 'Patungan trip bareng teman', p: 'Hitung patungan biaya trip untuk rombongan, termasuk pembagian tugas.', k: 'trip' }
  ];
  var $ = function (id) { return document.getElementById(id); };
  var layout = $('layout');
  var mobile = window.matchMedia('(max-width:860px)');
  var tab = 'recent';

  /* Rencana = riwayat chat dari chat.html — diekspor agar bisa dipakai di mana saja */
  function getPlans() {
    try {
      return (JSON.parse(localStorage.getItem('dme_chats')) || []).map(function (c) {
        return { id: c.id, text: c.title, ts: c.ts };
      });
    } catch (e) { return []; }
  }
  window.DME_getPlans = getPlans;

  function short(s, n) { return (s || '').length > n ? s.slice(0, n - 1) + '…' : (s || ''); }
  function fmt(ts) { return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }

  /* Menu: drawer di HP, bisa dilipat di desktop — aman jika elemen tidak ada */
  function openMenu() { document.body.classList.add('open'); }
  function closeMenu() { document.body.classList.remove('open'); }
  function toggleMenu() {
    if (mobile.matches) document.body.classList.toggle('open');
    else if (layout) layout.classList.toggle('collapsed');
  }

  if ($('menuBtn')) {
    $('menuBtn').addEventListener('click', function () {
      if (mobile.matches) openMenu();
      else if (layout) layout.classList.remove('collapsed');
    });
  }
  if ($('closeBtn')) {
    $('closeBtn').addEventListener('click', function () {
      if (mobile.matches) closeMenu();
      else if (layout) layout.classList.add('collapsed');
    });
  }
  if ($('scrim')) $('scrim').addEventListener('click', closeMenu);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('dme:menu', openMenu);

  /* Greeting (hanya di index) */
  function greet() {
    var h = $('greet');
    if (!h) return;
    var u = window.dmeAuth && window.dmeAuth.getUser ? window.dmeAuth.getUser() : null;
    h.textContent = '';
    h.appendChild(document.createTextNode(u ? 'Halo, ' + u.split('@')[0] + '.' : 'Selamat datang.'));
    h.appendChild(document.createElement('br'));
    var s = document.createElement('span');
    s.textContent = 'Mau rencanain apa hari ini?';
    h.appendChild(s);
  }
  document.addEventListener('dme:auth', greet);

  /* Daftar rencana (sidebar) */
  function renderPlans() {
    var list = $('plansList');
    if (!list) return;
    var plans = getPlans();
    var count = $('planCount');
    if (count) count.textContent = plans.length;
    list.textContent = '';
    if (!plans.length) {
      var n = document.createElement('div');
      n.className = 'empty-note';
      n.textContent = 'Belum ada rencana';
      list.appendChild(n);
    }
    plans.slice(0, 8).forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nav-item';
      b.textContent = short(p.text, 28);
      b.addEventListener('click', function () { openPlan(p); });
      list.appendChild(b);
    });
    renderCards();
  }
  window.DME_renderPlans = renderPlans;

  function openPlan(p) {
    var base = location.pathname.indexOf('chat.html') !== -1 ? '' : '';
    location.href = (location.pathname.indexOf('chat.html') !== -1 ? 'chat.html' : 'chat.html') + '?id=' + encodeURIComponent(p.id);
  }

  function renderCards() {
    var box = $('cards');
    if (!box) return;
    box.textContent = '';
    var tr = $('tabRecent'), tt = $('tabTpl');
    if (tr) tr.setAttribute('aria-selected', tab === 'recent');
    if (tt) tt.setAttribute('aria-selected', tab === 'tpl');
    if (tab === 'tpl') {
      TEMPLATES.forEach(function (t) {
        var c = document.createElement('button');
        c.type = 'button';
        c.className = 'card';
        c.textContent = t.t;
        var s = document.createElement('small');
        s.textContent = t.k === 'gunung' ? 'Pendakian' : t.k === 'konser' ? 'Konser' : 'Trip Santai';
        c.appendChild(s);
        c.addEventListener('click', function () {
          if ($('promptInput')) { $('promptInput').value = t.p; }
          if ($('kind')) { $('kind').value = t.k; }
          if ($('promptInput')) { $('promptInput').focus(); }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        box.appendChild(c);
      });
      return;
    }
    var plans = getPlans();
    if (!plans.length) {
      var e = document.createElement('p');
      e.className = 'empty';
      e.style.gridColumn = '1/-1';
      e.textContent = 'Belum ada rencana. Tulis rencana pertamamu di kolom atas.';
      box.appendChild(e);
      return;
    }
    plans.forEach(function (p) {
      var c = document.createElement('button');
      c.type = 'button';
      c.className = 'card';
      c.textContent = short(p.text, 90);
      var s = document.createElement('small');
      s.textContent = fmt(p.ts);
      c.appendChild(s);
      c.addEventListener('click', function () { openPlan(p); });
      box.appendChild(c);
    });
  }

  function setTab(t) { tab = t; renderCards(); }
  if ($('tabRecent')) $('tabRecent').addEventListener('click', function () { setTab('recent'); });
  if ($('tabTpl')) $('tabTpl').addEventListener('click', function () { setTab('tpl'); });
  if ($('tplLink')) {
    $('tplLink').addEventListener('click', function () {
      closeMenu();
      setTab('tpl');
      var sec = $('tabsSection');
      if (sec) sec.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if ($('plansToggle')) {
    $('plansToggle').addEventListener('click', function () {
      var open = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !open);
      if ($('plansList')) $('plansList').hidden = open;
      if ($('plansChev')) $('plansChev').classList.toggle('rot', open);
    });
  }
  if ($('newBtn')) {
    $('newBtn').addEventListener('click', function () {
      closeMenu();
      if ($('promptInput')) { $('promptInput').value = ''; $('promptInput').focus(); }
      if ($('preview')) $('preview').textContent = '';
      window.scrollTo({ top: 0 });
    });
  }
  if ($('searchBtn')) {
    $('searchBtn').addEventListener('click', function () {
      closeMenu();
      setTab('recent');
      var sec = $('tabsSection');
      if (sec) sec.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if ($('buildBtn')) {
    $('buildBtn').addEventListener('click', function () {
      var prompt = ($('promptInput') && $('promptInput').value.trim()) || '';
      if (!prompt) return alert('Tulis dulu rencana yang ingin dibuat, misalnya pendakian atau konser.');
      try {
        sessionStorage.setItem('dme_pending', JSON.stringify({
          text: prompt,
          kind: ($('kind') && $('kind').value) || 'trip'
        }));
      } catch (e) {}
      location.href = 'chat.html';
    });
  }

  /* Init hanya yang relevan */
  if ($('greet')) greet();
  renderPlans();
})();
