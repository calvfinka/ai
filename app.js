(function () {
  var TEMPLATES = [
    { t: 'Pendakian 2 hari 1 malam', p: 'Susun rencana pendakian 2 hari 1 malam, lengkap dengan jadwal, estimasi biaya, dan perlengkapan.', k: 'gunung' },
    { t: 'Checklist perlengkapan naik gunung', p: 'Buat checklist perlengkapan pendakian untuk pemula, dikelompokkan per kategori.', k: 'gunung' },
    { t: 'Nonton konser luar kota', p: 'Rencanakan perjalanan nonton konser di luar kota: transportasi, penginapan, dan jadwal hari H.', k: 'konser' },
    { t: 'Patungan trip bareng teman', p: 'Hitung patungan biaya trip untuk rombongan, termasuk pembagian tugas.', k: 'trip' }
  ];
  var $ = function (id) { return document.getElementById(id); };
  var layout = $('layout'), mobile = window.matchMedia('(max-width:720px)');
  var tab = 'recent';

  /* Rencana = riwayat chat dari chat.html */
  function getPlans() {
    try { return (JSON.parse(localStorage.getItem('dme_chats')) || []).map(function (c) { return { id: c.id, text: c.title, ts: c.ts }; }); }
    catch (e) { return []; }
  }
  function short(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function fmt(ts) { return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }

  /* Menu: drawer di HP, bisa dilipat di desktop */
  function openMenu() { document.body.classList.add('open'); }
  function closeMenu() { document.body.classList.remove('open'); }
  function toggleMenu() {
    if (mobile.matches) { document.body.classList.toggle('open'); }
    else { layout.classList.toggle('collapsed'); }
  }
  $('menuBtn').addEventListener('click', function () { if (mobile.matches) openMenu(); else layout.classList.remove('collapsed'); });
  $('closeBtn').addEventListener('click', function () { if (mobile.matches) closeMenu(); else layout.classList.add('collapsed'); });
  $('scrim').addEventListener('click', closeMenu);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('dme:menu', openMenu);

  /* Greeting */
  function greet() {
    var u = window.dmeAuth.getUser(), h = $('greet');
    h.textContent = '';
    h.appendChild(document.createTextNode(u ? 'Halo, ' + u.split('@')[0] + '.' : 'Selamat datang.'));
    h.appendChild(document.createElement('br'));
    var s = document.createElement('span'); s.textContent = 'Mau rencanain apa hari ini?'; h.appendChild(s);
  }
  document.addEventListener('dme:auth', greet);

  /* Daftar rencana (sidebar + tab Terbaru) */
  function renderPlans() {
    var plans = getPlans(), list = $('plansList');
    $('planCount').textContent = plans.length;
    list.textContent = '';
    if (!plans.length) { var n = document.createElement('div'); n.className = 'empty-note'; n.textContent = 'Belum ada rencana'; list.appendChild(n); }
    plans.slice(0, 5).forEach(function (p) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'nav-item';
      b.textContent = short(p.text, 28);
      b.addEventListener('click', function () { openPlan(p); });
      list.appendChild(b);
    });
    renderCards();
  }
  function openPlan(p) { location.href = 'chat.html?id=' + encodeURIComponent(p.id); }
  function renderCards() {
    var box = $('cards'); box.textContent = '';
    $('tabRecent').setAttribute('aria-selected', tab === 'recent');
    $('tabTpl').setAttribute('aria-selected', tab === 'tpl');
    if (tab === 'tpl') {
      TEMPLATES.forEach(function (t) {
        var c = document.createElement('button'); c.type = 'button'; c.className = 'card';
        c.textContent = t.t; var s = document.createElement('small'); s.textContent = t.k === 'gunung' ? 'Pendakian' : t.k === 'konser' ? 'Konser' : 'Trip Santai'; c.appendChild(s);
        c.addEventListener('click', function () { $('promptInput').value = t.p; $('kind').value = t.k; $('promptInput').focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        box.appendChild(c);
      });
      return;
    }
    var plans = getPlans();
    if (!plans.length) { var e = document.createElement('p'); e.className = 'empty'; e.style.gridColumn = '1/-1'; e.textContent = 'Belum ada rencana. Tulis rencana pertamamu di kolom atas.'; box.appendChild(e); return; }
    plans.forEach(function (p) {
      var c = document.createElement('button'); c.type = 'button'; c.className = 'card';
      c.textContent = short(p.text, 90); var s = document.createElement('small'); s.textContent = fmt(p.ts); c.appendChild(s);
      c.addEventListener('click', function () { openPlan(p); });
      box.appendChild(c);
    });
  }
  function setTab(t) { tab = t; renderCards(); }
  $('tabRecent').addEventListener('click', function () { setTab('recent'); });
  $('tabTpl').addEventListener('click', function () { setTab('tpl'); });
  $('tplLink').addEventListener('click', function () { closeMenu(); setTab('tpl'); $('tabsSection').scrollIntoView({ behavior: 'smooth' }); });

  /* Sidebar actions */
  $('plansToggle').addEventListener('click', function () {
    var open = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', !open); $('plansList').hidden = open;
    $('plansChev').classList.toggle('rot', open);
  });
  $('newBtn').addEventListener('click', function () {
    closeMenu(); $('promptInput').value = ''; $('preview').textContent = ''; $('promptInput').focus(); window.scrollTo({ top: 0 });
  });
  $('searchBtn').addEventListener('click', function () { closeMenu(); setTab('recent'); $('tabsSection').scrollIntoView({ behavior: 'smooth' }); });

  /* Kirim ke chat DME */
  $('buildBtn').addEventListener('click', function () {
    var prompt = $('promptInput').value.trim();
    if (!prompt) return alert('Tulis dulu rencana yang ingin dibuat, misalnya pendakian atau konser.');
    try { sessionStorage.setItem('dme_pending', JSON.stringify({ text: prompt, kind: $('kind').value })); } catch (e) {}
    location.href = 'chat.html';
  });

  greet(); renderPlans();
})();
