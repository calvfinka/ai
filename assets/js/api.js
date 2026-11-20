/* Klien chat: mengirim riwayat ke Worker. API key & prompt sistem ada di server. */
(function () {
  var ERR = {
    noserver: 'Server AI belum disambungkan. Isi API_URL di config.js dengan alamat Worker kamu.',
    busy: 'Lagi ramai, coba lagi sebentar ya.',
    offline: 'Tidak bisa terhubung ke server. Periksa koneksi internetmu.'
  };

  async function sendChat(history, mode) {
    var url = String((window.DME_CONFIG || {}).API_URL || '').trim();
    if (!url) throw { code: 'noserver', message: ERR.noserver };

    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 45000);
    var res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: history, mode: mode }),
        signal: ctl.signal
      });
    } catch (e) {
      throw { code: 'offline', message: e && e.name === 'AbortError' ? ERR.busy : ERR.offline };
    } finally { clearTimeout(timer); }

    var data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok || !data || !data.text) {
      throw { code: (data && data.code) || 'busy', message: (data && data.message) || ERR.busy };
    }
    return { text: data.text };
  }

  window.DME = { sendChat: sendChat };
})();
