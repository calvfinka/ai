/* GoWithDME AI - autentikasi sementara (localStorage).
   Belum aman untuk produksi: ganti dengan Supabase Auth saat backend siap. */
(function () {
  var KEY = 'dme_user';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function getUser() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setUser(v) { try { localStorage.setItem(KEY, v); return true; } catch (e) { return false; } }
  function clearUser() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function $(id) { return document.getElementById(id); }

  function showMsg(text, isError) {
    var box = $('authMsg');
    if (!box) return;
    box.textContent = text;
    box.className = 'auth-msg' + (isError ? ' error' : '');
    box.hidden = false;
  }
  function clearMsg() { var b = $('authMsg'); if (b) b.hidden = true; }
  function mark(input, bad) { if (input) input.setAttribute('aria-invalid', bad ? 'true' : 'false'); }

  function bindPasswordToggle(btnId, inputIds) {
    var btn = $(btnId);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var show = btn.getAttribute('aria-pressed') !== 'true';
      inputIds.forEach(function (id) { if ($(id)) $(id).type = show ? 'text' : 'password'; });
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      btn.textContent = show ? 'Sembunyikan' : 'Lihat Password';
    });
  }

  function finish(email) {
    if (!setUser(email)) {
      showMsg('Browser memblokir penyimpanan lokal. Nonaktifkan mode privat lalu coba lagi.', true);
      return;
    }
    window.location.href = 'index.html';
  }

  /* Halaman login */
  function initLogin() {
    var form = $('loginForm');
    if (!form) return;
    if (getUser()) { window.location.replace('index.html'); return; }
    bindPasswordToggle('pwToggle', ['password']);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearMsg();
      var email = $('email'), pw = $('password');
      var em = email.value.trim();
      mark(email, false); mark(pw, false);

      if (!em) { mark(email, true); showMsg('Email wajib diisi.', true); email.focus(); return; }
      if (!EMAIL_RE.test(em)) { mark(email, true); showMsg('Format email belum benar. Contoh: nama@email.com', true); email.focus(); return; }
      if (!pw.value) { mark(pw, true); showMsg('Password wajib diisi.', true); pw.focus(); return; }
      finish(em);
    });

    var g = $('googleBtn');
    if (g) g.addEventListener('click', function () {
      showMsg('Masuk dengan Google belum tersedia. Gunakan email dan password untuk saat ini.', false);
    });
    var f = $('forgotLink');
    if (f) f.addEventListener('click', function (e) {
      e.preventDefault();
      showMsg('Reset password akan tersedia setelah sistem akun tersambung ke server.', false);
    });
  }

  /* Halaman daftar */
  function initRegister() {
    var form = $('registerForm');
    if (!form) return;
    if (getUser()) { window.location.replace('index.html'); return; }
    bindPasswordToggle('pwToggle', ['password', 'password2']);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearMsg();
      var email = $('email'), pw = $('password'), pw2 = $('password2');
      var em = email.value.trim();
      mark(email, false); mark(pw, false); mark(pw2, false);

      if (!em || !EMAIL_RE.test(em)) { mark(email, true); showMsg('Masukkan email yang valid. Contoh: nama@email.com', true); email.focus(); return; }
      if (pw.value.length < 8) { mark(pw, true); showMsg('Password minimal 8 karakter.', true); pw.focus(); return; }
      if (pw.value !== pw2.value) { mark(pw2, true); showMsg('Konfirmasi password tidak sama.', true); pw2.focus(); return; }
      finish(em);
    });
  }

  /* Bar akun: sidebar + avatar di top bar (HP) */
  function initAuthBar() {
    var bar = $('authBar'), top = $('topAvatar'), user = getUser();
    if (top) {
      top.textContent = user ? user.charAt(0).toUpperCase() : 'Masuk';
      top.href = user ? '#' : 'login.html';
      top.onclick = function (e) { if (getUser()) { e.preventDefault(); document.dispatchEvent(new Event('dme:menu')); } };
    }
    if (!bar) return;
    bar.textContent = '';
    if (user) {
      var av = document.createElement('span'); av.className = 'avatar'; av.textContent = user.charAt(0).toUpperCase();
      var span = document.createElement('span'); span.className = 'auth-email'; span.textContent = user; span.title = user;
      var out = document.createElement('button'); out.type = 'button'; out.className = 'btn-sm'; out.textContent = 'Keluar';
      out.addEventListener('click', function () { clearUser(); initAuthBar(); document.dispatchEvent(new Event('dme:auth')); });
      bar.appendChild(av); bar.appendChild(span); bar.appendChild(out);
    } else {
      var a = document.createElement('a'); a.href = 'login.html'; a.className = 'btn-sm solid block'; a.textContent = 'Masuk';
      bar.appendChild(a);
    }
  }

  window.dmeAuth = { getUser: getUser };
  document.addEventListener('DOMContentLoaded', function () {
    initLogin(); initRegister(); initAuthBar();
  });
})();
